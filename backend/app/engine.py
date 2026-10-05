"""Server-side tick engine — the src/store/live.tsx tick loop, moved to the server.

Every TICK_SECONDS: advance all 24 villages one tick, run the alert engine
(thresholds 45/62/78, ≥2-source rule, 90 s per-village cooldown, auto-resolve),
broadcast changes to WebSocket clients, and persist hourly rows + packets.
"""
from __future__ import annotations

import asyncio
import contextlib
import json
from datetime import datetime, timezone

from fastapi import WebSocket
from sqlalchemy import select

from .config import ALERT_COOLDOWN_S, ALERT_HISTORY_CAP, SHIFT_EVERY, TICK_SECONDS
from .database import SessionLocal
from .models import AlertRow, MqttPacketRow, TelemetryRow
from .seed import villages_live
from .seed_data import VILLAGES
from .simulation import ALERT_THRESHOLDS, SCENARIOS, tick_village

VILLAGE_BY_ID = {v["id"]: v for v in VILLAGES}
SEVERITY_RANK = {"WATCH": 0, "WARNING": 1, "CRITICAL": 2}


class Engine:
    def __init__(self) -> None:
        self.scenario = "monsoon"
        self.tick = 0
        self.cooldowns: dict[str, float] = {}
        self.alert_seq = 105  # seed data ends at AL-105
        self.clients: set[WebSocket] = set()

    # --- helpers ---------------------------------------------------------------

    def _next_alert_id(self) -> str:
        self.alert_seq += 1
        return f"AL-{self.alert_seq}"

    def _broadcast_sync(self, message: dict) -> None:
        """Queue a broadcast on the running loop (safe to call from any thread)."""
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return  # no loop (e.g. called during startup) — skip
        loop.create_task(self.broadcast(message))

    async def broadcast(self, message: dict) -> None:
        dead: list[WebSocket] = []
        data = json.dumps(message, default=str)
        for ws in list(self.clients):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.clients.discard(ws)

    # --- alert engine (port of runAlertEngine in store/live.tsx) ----------------

    def alert_engine(self, next_live: dict[str, dict], now_ms: int) -> list[dict]:
        fired: list[dict] = []
        db = SessionLocal()
        try:
            open_alerts = {
                a.villageId: a
                for a in db.scalars(
                    select(AlertRow).where(AlertRow.status != "RESOLVED", AlertRow.manual == False)  # noqa: E712
                )
            }
            for v in VILLAGES:
                live = next_live[v["id"]]
                severity = None
                if live["score"] >= ALERT_THRESHOLDS["CRITICAL"] and live["sourcesAgree"]:
                    severity = "CRITICAL"
                elif live["score"] >= ALERT_THRESHOLDS["WARNING"] and live["sourcesAgree"]:
                    severity = "WARNING"
                elif live["score"] >= ALERT_THRESHOLDS["WATCH"]:
                    severity = "WATCH"
                if severity is None:
                    continue

                existing = open_alerts.get(v["id"])
                if existing and SEVERITY_RANK[existing.severity] >= SEVERITY_RANK[severity]:
                    continue
                if self.cooldowns.get(v["id"], 0) > now_ms:
                    continue

                top = " + ".join(
                    f"{c['label']} {round(c['value'])} pts"
                    for c in live["contributions"] if c["value"] > 0.5
                ) or "fused inputs"
                why = (
                    f"Score {live['score']:.1f} ({severity}) — driven by {top}. "
                    f"Rain {live['rainMmHr']:.1f} mm/h · soil {round(live['soilPct'])}% · "
                    f"river {live['waterLevelM']:.1f} m of {v['dangerLevelM']} m danger."
                )
                alert = AlertRow(
                    id=self._next_alert_id(), villageId=v["id"], villageName=v["name"],
                    severity=severity, status="ACTIVE", ts=now_ms, why=why,
                    sourcesJson=json.dumps(live["sources"]), arrivalMin=live["arrivalMin"],
                    score=live["score"], manual=False,
                )
                if existing is not None:
                    db.delete(existing)  # severity escalation replaces the open alert
                db.add(alert)
                db.flush()
                self.cooldowns[v["id"]] = now_ms + ALERT_COOLDOWN_S * 1000
                fired.append(_alert_dict(alert))

            # Auto-resolve when risk recedes below WATCH
            for a in db.scalars(select(AlertRow).where(AlertRow.status != "RESOLVED", AlertRow.manual == False)):  # noqa: E712
                live = next_live.get(a.villageId)
                if live and live["score"] < 42:
                    a.status = "RESOLVED"
                    a.resolvedTs = now_ms

            db.commit()

            # Cap the in-feed alert history (same 60-cap as the frontend)
            ids = db.scalars(select(AlertRow.id).order_by(AlertRow.ts.desc())).all()
            for stale_id in ids[ALERT_HISTORY_CAP:]:
                row = db.get(AlertRow, stale_id)
                if row is not None:
                    db.delete(row)
            db.commit()
        finally:
            db.close()
        return fired

    # --- one tick ---------------------------------------------------------------

    def step(self) -> dict:
        self.tick += 1
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        shift = self.tick % SHIFT_EVERY == 0

        next_live = {
            v["id"]: tick_village(v, villages_live[v["id"]], self.scenario, shift, now_ms)
            for v in VILLAGES
        }
        villages_live.update(next_live)

        fired = self.alert_engine(next_live, now_ms)

        if shift:
            _persist_hourly(next_live, now_ms)

        payload = {
            "type": "tick",
            "tick": self.tick,
            "scenario": self.scenario,
            "ts": now_ms,
            "villagesLive": next_live,
            "alertsFired": fired,
        }
        self._broadcast_sync(payload)
        return payload

    def set_scenario(self, scenario: str) -> None:
        if scenario not in SCENARIOS:
            raise ValueError(f"unknown scenario: {scenario}")
        self.scenario = scenario
        self._broadcast_sync({"type": "scenario", "scenario": scenario})


def _persist_hourly(live_map: dict[str, dict], now_ms: int) -> None:
    """On each simulated-hour shift, append the rolled row + refresh MQTT packets."""
    db = SessionLocal()
    try:
        for v in VILLAGES:
            p = live_map[v["id"]]["history"][-1]
            db.add(TelemetryRow(villageId=v["id"], ts=now_ms, hour=p["hour"],
                                rain=p["rain"], soil=p["soil"], water=p["water"]))
            if v["nodeId"]:
                from .simulation import make_mqtt_packet
                row = db.get(MqttPacketRow, v["nodeId"])
                payload = json.dumps(make_mqtt_packet(v, live_map[v["id"]], now_ms))
                if row is None:
                    db.add(MqttPacketRow(nodeId=v["nodeId"], villageId=v["id"], ts=now_ms, payloadJson=payload))
                else:
                    row.ts, row.payloadJson = now_ms, payload
        db.commit()
    finally:
        db.close()


def _alert_dict(a: AlertRow) -> dict:
    return {
        "id": a.id, "villageId": a.villageId, "villageName": a.villageName,
        "severity": a.severity, "status": a.status, "ts": a.ts, "why": a.why,
        "sources": json.loads(a.sourcesJson), "arrivalMin": a.arrivalMin,
        "score": a.score, "manual": a.manual, "ackBy": a.ackBy, "ackTs": a.ackTs,
        "resolvedTs": a.resolvedTs,
    }


engine_state = Engine()


async def tick_loop() -> None:
    """Background task started in the FastAPI lifespan."""
    while True:
        engine_state.step()
        await asyncio.sleep(TICK_SECONDS)


async def run_migrations_and_seed() -> None:
    from .seed import run_seed
    run_seed()
