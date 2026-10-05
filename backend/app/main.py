"""JAL-DARPAAN backend — FastAPI implementing docs/PLAN.md §8.

Run:  uvicorn app.main:app --reload   (from backend/)
Docs: http://127.0.0.1:8000/docs
"""
from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import auth
from .config import CORS_ORIGINS
from .database import get_db
from .engine import VILLAGE_BY_ID, _alert_dict, engine_state, tick_loop
from .models import AlertRow, MqttPacketRow, TelemetryRow, UserRow
from .seed import run_seed, villages_live
from .seed_data import (BACKTESTS, CONFUSION, DATA_SOURCES, FEATURE_IMPORTANCE,
                        MODEL_METRICS, ROC_POINTS, SCENARIO_META)

# --------------------------------------------------------------------------- app

@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_seed()
    task = asyncio.create_task(tick_loop())
    yield
    task.cancel()

app = FastAPI(
    title="JAL-DARPAAN API",
    description="Village-level flash-flood early warning — backend service (PLAN.md §8 contract)",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------- helpers

def scoped_village_ids(user: dict) -> list[str] | None:
    """Village-scoped users see only their village; others see everything."""
    if user.get("role") == "village" and user.get("scopeVillageId"):
        return [user["scopeVillageId"]]
    return None


def _require_village(village_id: str) -> dict:
    v = VILLAGE_BY_ID.get(village_id)
    if v is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown village {village_id}")
    return v


def _db_alerts(db: Session, status_filter: str | None = None) -> list[AlertRow]:
    q = select(AlertRow).order_by(AlertRow.ts.desc())
    if status_filter:
        q = q.where(AlertRow.status == status_filter.upper())
    return list(db.scalars(q))


# ------------------------------------------------------------------ schemas

class LoginIn(BaseModel):
    email: str
    password: str


class ScenarioIn(BaseModel):
    scenario: str = Field(pattern="^(normal|monsoon|cloudburst)$")


class AlertIssueIn(BaseModel):
    villageId: str
    why: str | None = None


class TelemetryIn(BaseModel):
    node_id: str
    village_code: str
    timestamp: str | None = None
    rainfall_mm_hr: float = 0
    soil_moisture_pct: float = 0
    water_level_m: float = 0
    battery_pct: float = 0
    signal_dbm: float = 0


# ---------------------------------------------------------------------- routes

@app.get("/")
def root() -> dict:
    """Landing route — so the bare URL explains itself instead of 404-ing."""
    return {
        "service": "JAL-DARPAAN API",
        "status": "ok",
        "message": "Flash-flood early-warning backend (PLAN.md §8). Interactive docs at /docs",
        "docs": "/docs",
        "health": "/health",
        "quickStart": {
            "1_login": "POST /auth/login  {email, password} — demo: national@jaldarpaan.in / Demo@1234",
            "2_call": "GET /villages or GET /risk/live with 'Authorization: Bearer <token>'",
            "3_live": "WS /ws/live for real-time push",
        },
    }


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "jaldarpaan-api", "tick": engine_state.tick,
            "scenario": engine_state.scenario}


@app.post("/auth/login")
def login(body: LoginIn, db: Session = Depends(get_db)) -> dict:
    row = db.get(UserRow, body.email.strip().lower())
    if row is None or not row.loginEnabled or not auth.verify_password(body.password, row.passwordSalt, row.passwordHash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    user = {
        "email": row.email, "name": row.name, "role": row.role, "org": row.org,
        "posting": row.posting, "scopeState": row.scopeState,
        "scopeDistrict": row.scopeDistrict, "scopeVillageId": row.scopeVillageId,
    }
    return {"token": auth.create_token(user), "user": {**user, "caps": [c for c, roles in auth.CAPS.items() if row.role in roles]}}


@app.get("/auth/me")
def me(user: dict = Depends(auth.current_user)) -> dict:
    return user


@app.get("/villages")
def list_villages(user: dict = Depends(auth.require_cap("view-villages")), db: Session = Depends(get_db)) -> list[dict]:
    ids = scoped_village_ids(user)
    return [
        {**VILLAGE_BY_ID[v_id], **{k: v for k, v in villages_live[v_id].items() if k != "history"}}
        for v_id in villages_live if ids is None or v_id in ids
    ]


@app.get("/villages/{village_id}")
def get_village(village_id: str, user: dict = Depends(auth.require_cap("view-villages"))) -> dict:
    _require_village(village_id)
    ids = scoped_village_ids(user)
    if ids is not None and village_id not in ids:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Village outside your scope")
    return {**VILLAGE_BY_ID[village_id], **villages_live[village_id]}


@app.get("/villages/{village_id}/history")
def village_history(village_id: str, h: int = 24, user: dict = Depends(auth.require_cap("view-villages")),
                    db: Session = Depends(get_db)) -> list[dict]:
    _require_village(village_id)
    ids = scoped_village_ids(user)
    if ids is not None and village_id not in ids:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Village outside your scope")
    rows = db.scalars(
        select(TelemetryRow).where(TelemetryRow.villageId == village_id)
        .order_by(TelemetryRow.id.desc()).limit(h)
    ).all()
    return [{"hour": r.hour, "rain": r.rain, "soil": r.soil, "water": r.water} for r in reversed(rows)]


@app.get("/villages/{village_id}/nowcast")
def village_nowcast(village_id: str, user: dict = Depends(auth.require_cap("view-villages"))) -> dict:
    _require_village(village_id)
    ids = scoped_village_ids(user)
    if ids is not None and village_id not in ids:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Village outside your scope")
    live = villages_live[village_id]
    return {"villageId": village_id, "nowcastMmHr": live["nowcast"], "hoursAhead": 6,
            "method": "persistence+scenario scaling (LSTM/GRU slot per AI_FUTURE_PLANS.md)"}


@app.get("/risk/live")
def risk_live(user: dict = Depends(auth.require_cap("view-dashboard"))) -> dict:
    ids = scoped_village_ids(user)
    villages = {
        v_id: {k: v for k, v in live.items() if k != "history"}
        for v_id, live in villages_live.items() if ids is None or v_id in ids
    }
    counts = {"SAFE": 0, "WATCH": 0, "WARNING": 0, "CRITICAL": 0}
    for live in villages.values():
        counts[live["band"]] += 1
    return {"ts": max((v["updatedAt"] for v in villages.values()), default=0),
            "scenario": engine_state.scenario, "counts": counts, "villages": villages}


@app.get("/alerts")
def list_alerts(status_filter: str | None = None, user: dict = Depends(auth.require_cap("view-alerts")),
                db: Session = Depends(get_db)) -> list[dict]:
    ids = scoped_village_ids(user)
    alerts = [_alert_dict(a) for a in _db_alerts(db, status_filter)]
    if ids is not None:
        alerts = [a for a in alerts if a["villageId"] in ids]
    return alerts


@app.post("/alerts/{alert_id}/ack")
def ack_alert(alert_id: str, user: dict = Depends(auth.require_cap("alert-ack")),
              db: Session = Depends(get_db)) -> dict:
    a = db.get(AlertRow, alert_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown alert {alert_id}")
    a.status, a.ackBy = "ACKNOWLEDGED", user["name"]
    a.ackTs = int(datetime.now(timezone.utc).timestamp() * 1000)
    db.commit()
    engine_state._broadcast_sync({"type": "alertUpdated", "alert": _alert_dict(a)})
    return _alert_dict(a)


@app.post("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: str, user: dict = Depends(auth.require_cap("alert-resolve")),
                  db: Session = Depends(get_db)) -> dict:
    a = db.get(AlertRow, alert_id)
    if a is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown alert {alert_id}")
    a.status = "RESOLVED"
    a.resolvedTs = int(datetime.now(timezone.utc).timestamp() * 1000)
    db.commit()
    engine_state._broadcast_sync({"type": "alertUpdated", "alert": _alert_dict(a)})
    return _alert_dict(a)


@app.post("/alerts", status_code=status.HTTP_201_CREATED)
def issue_alert(body: AlertIssueIn, user: dict = Depends(auth.require_cap("alert-issue")),
                db: Session = Depends(get_db)) -> dict:
    v = _require_village(body.villageId)
    live = villages_live[v["id"]]
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    a = AlertRow(
        id=engine_state._next_alert_id(), villageId=v["id"], villageName=v["name"],
        severity="CRITICAL", status="ACTIVE", ts=now_ms,
        why=body.why or (
            f"Evacuation advisory issued manually by {user['name']}. "
            f"Live inputs: rain {live['rainMmHr']:.1f} mm/h · soil {round(live['soilPct'])}% · "
            f"river {live['waterLevelM']:.1f} m. SMS/Telegram dispatched in Hindi + Garhwali."
        ),
        sourcesJson=json.dumps(live["sources"]), arrivalMin=live["arrivalMin"],
        score=live["score"], manual=True,
    )
    db.add(a)
    db.commit()
    engine_state._broadcast_sync({"type": "alertUpdated", "alert": _alert_dict(a)})
    return _alert_dict(a)


@app.post("/scenario")
def set_scenario(body: ScenarioIn, user: dict = Depends(auth.require_cap("scenario"))) -> dict:
    engine_state.set_scenario(body.scenario)
    return {"scenario": engine_state.scenario, "meta": SCENARIO_META[body.scenario]}


@app.get("/sensors")
def sensors(user: dict = Depends(auth.require_cap("view-sensors"))) -> list[dict]:
    out = []
    for v in VILLAGE_BY_ID.values():
        if not v["nodeId"]:
            continue
        live = villages_live[v["id"]]
        out.append({
            "nodeId": v["nodeId"], "villageId": v["id"], "villageName": v["name"],
            "status": live["nodeStatus"], "batteryPct": live["batteryPct"],
            "signalDbm": live["signalDbm"], "lastPacketTs": live["updatedAt"],
        })
    return out


@app.get("/sensors/mqtt/recent")
def mqtt_recent(user: dict = Depends(auth.require_cap("view-sensors")), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(MqttPacketRow).order_by(MqttPacketRow.ts.desc())).all()
    return [{"nodeId": r.nodeId, "villageId": r.villageId, "ts": r.ts,
             "payload": json.loads(r.payloadJson)} for r in rows]


@app.get("/analytics/model")
def analytics_model(user: dict = Depends(auth.require_cap("view-analytics"))) -> dict:
    return {"metrics": MODEL_METRICS, "roc": ROC_POINTS, "confusion": CONFUSION,
            "featureImportance": FEATURE_IMPORTANCE, "backtests": BACKTESTS}


@app.get("/sources/status")
def sources_status(user: dict = Depends(auth.require_cap("view-sources"))) -> list[dict]:
    return DATA_SOURCES


@app.post("/telemetry", status_code=status.HTTP_202_ACCEPTED)
def ingest_telemetry(body: TelemetryIn, db: Session = Depends(get_db)) -> dict:
    """ESP32 ingest — exact PLAN.md §7 payload contract (topic jaldarpaan/telemetry/{village_code})."""
    v = next((x for x in VILLAGE_BY_ID.values() if x["code"] == body.village_code), None)
    if v is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Unknown village_code {body.village_code}")
    now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    payload = body.model_dump(exclude_none=True)

    # Merge real node readings into the live state (engine continues from here).
    live = villages_live[v["id"]]
    live["rainMmHr"] = round(body.rainfall_mm_hr, 1)
    live["soilPct"] = round(body.soil_moisture_pct, 1)
    live["waterLevelM"] = round(body.water_level_m, 2)
    if v["nodeId"] == body.node_id:
        live["batteryPct"] = body.battery_pct or live["batteryPct"]
        live["signalDbm"] = body.signal_dbm or live["signalDbm"]
        if live["nodeStatus"] in ("offline", "no-node") and body.battery_pct > 0:
            live["nodeStatus"] = "online"
    live["updatedAt"] = now_ms

    row = db.get(MqttPacketRow, body.node_id)
    if row is None:
        db.add(MqttPacketRow(nodeId=body.node_id, villageId=v["id"], ts=now_ms, payloadJson=json.dumps(payload)))
    else:
        row.ts, row.payloadJson = now_ms, json.dumps(payload)
    db.commit()

    engine_state._broadcast_sync({"type": "telemetry", "villageId": v["id"], "nodeId": body.node_id,
                                  "ts": now_ms, "payload": payload})
    return {"accepted": True, "villageId": v["id"]}


@app.websocket("/ws/live")
async def ws_live(ws: WebSocket) -> None:
    await ws.accept()
    engine_state.clients.add(ws)
    try:
        await ws.send_text(json.dumps({
            "type": "hello", "tick": engine_state.tick, "scenario": engine_state.scenario,
            "villagesLive": {k: {kk: vv for kk, vv in v.items() if kk != "history"}
                             for k, v in villages_live.items()},
        }, default=str))
        while True:
            msg = await ws.receive_text()  # keepalive / client pings
            if msg == "ping":
                await ws.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        engine_state.clients.discard(ws)
