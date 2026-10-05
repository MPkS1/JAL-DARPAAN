"""DB seeding — create tables, load villages/users/sources, seed alerts.

Run directly (`python -m app.seed`) or via `main.py` lifespan (idempotent:
existing rows are updated, missing rows inserted; alerts seeded only once).
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import hash_password
from .database import Base, SessionLocal, engine
from .models import AlertRow, MqttPacketRow, TelemetryRow, UserRow, VillageRow
from .seed_data import DEMO_USERS, DIRECTORY_ONLY, VILLAGES
from .simulation import init_village_live, make_mqtt_packet

# In-memory store shared by the tick engine + API (VillageLive is live state,
# not relational — it lives in RAM exactly like the frontend store).
villages_live: dict[str, dict] = {}


def seed(db: Session) -> None:
    Base.metadata.create_all(bind=engine)

    # --- Villages (upsert) ----------------------------------------------------
    for v in VILLAGES:
        row = db.get(VillageRow, v["id"])
        payload = {k: v[k] for k in v if k != "events"}
        if row is None:
            db.add(VillageRow(eventsJson=json.dumps(v["events"]), **payload))
        else:
            for k, val in payload.items():
                setattr(row, k, val)
            row.eventsJson = json.dumps(v["events"])

    # --- Users (upsert; passwords re-hashed only when missing) -----------------
    for u in DEMO_USERS + DIRECTORY_ONLY:
        row = db.get(UserRow, u["email"])
        if row is None:
            salt, digest = hash_password(u.get("password", "disabled-no-login"))
            db.add(
                UserRow(
                    email=u["email"], name=u["name"], role=u["role"], org=u["org"],
                    posting=u["posting"], scopeState=u.get("scopeState"),
                    scopeDistrict=u.get("scopeDistrict"), scopeVillageId=u.get("scopeVillageId"),
                    passwordSalt=salt, passwordHash=digest, loginEnabled="password" in u,
                )
            )
        elif "password" in u:
            if not row.passwordHash or not row.loginEnabled:
                salt, digest = hash_password(u["password"])
                row.passwordSalt, row.passwordHash = salt, digest
                row.loginEnabled = True

    db.commit()

    # --- Live village state -----------------------------------------------------
    if not villages_live:
        for v in VILLAGES:
            villages_live[v["id"]] = init_village_live(v, "monsoon")

    # --- Seed alerts once (port of seedAlerts() in src/store/live.tsx) ----------
    if db.scalars(select(AlertRow)).first() is None:
        now = int(datetime.now(timezone.utc).timestamp() * 1000)
        _min = 60_000
        _hr = 3_600_000
        seed_alerts = [
            AlertRow(id="AL-101", villageId="VN-2212", villageName="Agastyamuni",
                     severity="WARNING", status="ACTIVE", ts=now - 31 * _min,
                     why="Soil 81% saturated + 22 mm/h rain over Mandakini → WARNING risk (66.2). River at 3.1 m of 4.7 m danger.",
                     sourcesJson=json.dumps(["ESP32-UK-008", "GPM IMERG"]), arrivalMin=96, score=66.2),
            AlertRow(id="AL-102", villageId="VN-2201", villageName="Kedarnath",
                     severity="WATCH", status="ACTIVE", ts=now - 17 * _min,
                     why="Antecedent 24 h rain 38 mm + steep slope (30°) → WATCH risk (47.5). Monitoring IMERG burst over upper watershed.",
                     sourcesJson=json.dumps(["ESP32-UK-001"]), arrivalMin=None, score=47.5),
            AlertRow(id="AL-103", villageId="VN-2214", villageName="Tilwara",
                     severity="WARNING", status="ACKNOWLEDGED", ts=now - int(2.4 * _hr),
                     why="River rose 0.9 m in 50 min + soil 84% → WARNING. SDRF QRT acknowledged; bridge watch activated.",
                     sourcesJson=json.dumps(["ESP32-UK-009", "India-WRIS"]), arrivalMin=120, score=63.8,
                     ackBy="Ramesh Negi", ackTs=now - int(2.1 * _hr)),
            AlertRow(id="AL-104", villageId="VN-2210", villageName="Chandrapuri",
                     severity="CRITICAL", status="RESOLVED", ts=now - 26 * _hr,
                     why="Madmaheshwar at 4.4 m of 4.6 m danger + 41 mm/h rain → CRITICAL (79.4). Villagers moved to CHC shelter; no casualties.",
                     sourcesJson=json.dumps(["ESP32-UK-007", "India-WRIS", "GPM IMERG"]), arrivalMin=48, score=79.4,
                     ackBy="Col. S. Bisht (Retd.)", ackTs=now - int(25.7 * _hr), resolvedTs=now - 22 * _hr),
            AlertRow(id="AL-105", villageId="VN-2221", villageName="Rudraprayag (Ward 4)",
                     severity="WATCH", status="RESOLVED", ts=now - 5 * _hr,
                     why="Sangam confluence elevated after upstream release → WATCH (44.1). Receded; ward patrol stood down.",
                     sourcesJson=json.dumps(["ESP32-UK-012", "CWC AFF"]), arrivalMin=None, score=44.1,
                     ackBy="Col. S. Bisht (Retd.)", ackTs=now - int(4.6 * _hr), resolvedTs=now - int(3.8 * _hr)),
        ]
        db.add_all(seed_alerts)
        db.commit()

    # --- Telemetry history (24 h per village) + latest MQTT packets -------------
    if db.scalars(select(TelemetryRow)).first() is None:
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        for v in VILLAGES:
            live = villages_live[v["id"]]
            for p in live["history"]:
                db.add(TelemetryRow(villageId=v["id"], ts=now_ms, hour=p["hour"],
                                    rain=p["rain"], soil=p["soil"], water=p["water"]))
            if v["nodeId"]:
                db.add(MqttPacketRow(nodeId=v["nodeId"], villageId=v["id"], ts=now_ms,
                                     payloadJson=json.dumps(make_mqtt_packet(v, live, now_ms))))
        db.commit()


def run_seed() -> None:
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
    print("Seeded:", engine.url)
