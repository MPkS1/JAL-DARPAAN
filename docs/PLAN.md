# JAL-DARPAAN — Build Plan & Architecture (v1.0)

PS 26192 · Flash Flood Prediction System for Hilly Regions using Multi-Source Data
Team **BhushaktiAI** · Team ID 184091

---

## 1. Objectives for this build (demo → production path)

1. **Deliver a complete, runnable operations platform** implementing every Expected-Solution bullet of PS 26192:
   - integrates rainfall + soil + slope stability + historical disaster data ✓
   - IoT/ESP32 real-time monitoring (simulated with the exact production payload) ✓
   - hyper-local **village/ward-level** early warnings ✓
   - actionable lead time (arrival countdown, shelter, route, helpline) ✓
2. **2D ops map + 3D satellite-terrain view** of the hills with per-village climate chips and click-through detail.
3. **Role-based access** for National / State / District / Field / Village users with demo one-click logins.
4. Keep a **swappable data layer**: the frontend talks to an internal store shaped exactly like the REST API. **The backend now exists** — `backend/` (FastAPI, Python 3.12) implements §8 and serves the same contract; the SPA still runs on its in-browser simulator until the store is wired to the API (planned next step).

## 2. Demo scope decisions

| Decision | Choice | Rationale |
|---|---|---|
| Pilot geography | Rudraprayag district, Uttarakhand (Mandakini valley), 24 villages incl. Kedarnath→Rudraprayag | Kedarnath 2013 epicentre; dense real village set with credible elevations/slopes |
| Live data | Deterministic simulation engine (seeded RNG, monsoon physics, failure cases) + scenario drill | Works offline, reproducible for judges; identical ESP32 JSON as production |
| Map | MapLibre GL — Esri World Imagery (2D + hillshade) ⇄ 3D terrain (Mapzen/AWS terrarium DEM) | Free, no API keys, real satellite + real elevation |
| Charts | Recharts | Proposal's stated frontend stack |
| Auth | JWT-shaped session in localStorage, role matrix | Mirrors production JWT+RBAC design — implemented server-side in `backend/app/auth.py` |

## 3. Implementation phases (mirrors SIH methodology)

| Phase | Deliverable in this repo | Production equivalent |
|---|---|---|
| P1 Research & foundation | 24-village geo dataset (elev, slope, river dist, watershed, shelters, 2013/21/23 history), docs, role matrix | PostGIS village tables + station audit |
| P2 Data core | Simulation engine (`src/lib/simulation.ts`), exact ESP32 MQTT JSON telemetry, 11-feature village vectors | Ingestion adapters: IMD/WRIS/IMERG/SMAP/Sentinel-1/DEM/Bhukosh + Mosquitto |
| P3 AI & alerts | Transparent risk engine (weighted fusion, 2-source rule, cooldowns), alert lifecycle (ACTIVE→ACK→RESOLVED), WHY boxes | LightGBM classifier + LSTM/GRU nowcasts + SHAP, Telegram/FCM/SMS dispatcher |
| P4 Test & harden | Typechecked build, failure cases seeded (node offline, low battery), scenario drills | Backtests (Kedarnath/Chamoli/Sikkim), load & security drills |
| P5 Pilot & scale | One-district demo, per-role UX | State MoU → ESP32 gap nodes → monthly retraining |

## 4. Role & permission matrix

| Capability | National | State | District | Field | Village |
|---|---|---|---|---|---|
| Command Center (map 2D/3D, KPIs, charts) | ✅ | ✅ | ✅ | ✅ | ✅ (own village focus) |
| Village drill-down / detail | ✅ | ✅ | ✅ | ✅ | ✅ own only |
| Alerts — view | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alerts — acknowledge | ✅ | ✅ | ✅ | ✅ | — |
| Alerts — issue evacuation advisory | ✅ | ✅ | ✅ | — | — |
| Alerts — resolve / close | ✅ | ✅ | — | — | — |
| Scenario drills (monsoon / cloudburst) | ✅ | ✅ | ✅ | — | — |
| Sensor Network page | ✅ | ✅ | ✅ | ✅ | — |
| AI & Analytics page | ✅ | ✅ | ✅ | — | — |
| Data Sources page | ✅ | ✅ | — | — | — |
| User Management page | ✅ | — | — | — | — |

## 5. Risk model spec (demo engine = production contract)

Features (11 in production; 5 fused here for the live score):

| # | Feature | Source | Weight |
|---|---|---|---|
| 1 | Rainfall intensity last 1 h (mm/h) | ESP32 node / IMD AWS / IMERG | 0.34 |
| 2 | Soil saturation (%) | ESP32 probe / SMAP L4 | 0.27 |
| 3 | River level vs danger level | CWC/WRIS gauge (Chandrapuri class) | 0.17 |
| 4 | Slope susceptibility (deg, static) | Copernicus 30 m DEM | 0.16 |
| 5 | Historical event count (2013/21/23) | GSI Bhukosh + district records | 0.06 |

Bands: SAFE <40 · WATCH 40–59 · WARNING 60–74 · CRITICAL ≥75.
Alert thresholds trigger at 45/62/78 with per-village 90 s cooldowns; **WARNING/CRITICAL require ≥2 independent sources** (node + IMD/IMERG/SMAP). Arrival estimate: `max(15, 200 − 1.5·rain − 1.5·(soil−60) − 60·(level/danger))` minutes.

## 6. Data model (frontend contract = future API contract)

- `Village` — id, code, lat/lng, district/state, elevation, slope, population, households, river + distance, watershed, danger level, node id, shelter, evacuation route, historical events.
- `VillageLive` — rain 1h, rain 24h, soil %, water level, temp/humidity/wind/pressure (elevation-lapse climate), score, band, SHAP-style contributions, source confirmation, arrival minutes, 24-point hourly history, 6-point nowcast.
- `FloodAlert` — id, village, severity, status, timestamp, why-text, source list, arrival minutes, acknowledgement.
- `SensorNode` — node id, village, status (online/offline/low-battery), battery %, signal dBm, last packet.
- `SourceStatus` — provider feed health + latency + fallback mode.

## 7. ESP32 telemetry contract (simulator = production, zero code change)

Topic: `jaldarpaan/telemetry/{village_code}`

```json
{"node_id": "ESP32-UK-004", "village_code": "VN-2205", "timestamp": "2026-10-05T14:35:00+05:30",
 "rainfall_mm_hr": 45.2, "soil_moisture_pct": 88.4, "water_level_m": 1.42,
 "battery_pct": 92, "signal_dbm": -67}
```

## 8. Backend contract (FastAPI — **implemented in `backend/`**)

> Status: every endpoint below is live in `backend/` (FastAPI + SQLAlchemy, SQLite dev DB,
> in-process tick engine, `WS /ws/live` push) and verified by `backend/smoke_test.py`.
> Redis cache and PostGIS spatial joins are
> Phase-2 deployments concerns; the nowcast endpoint currently returns the persistence model
> with the LSTM/GRU slot reserved. Run: `pip install -r backend/requirements.txt`,
> `python -m app.seed`, `uvicorn app.main:app` — see `backend/README.md`.

| Endpoint | Purpose |
|---|---|
| `POST /auth/login` → JWT | Email+password → role claims (national/state/district/field/village) |
| `GET /villages` · `GET /villages/{id}` | Village registry + current fused state |
| `GET /villages/{id}/history?h=24` | Hourly telemetry series |
| `GET /villages/{id}/nowcast` | LSTM/GRU 6 h forecast |
| `GET /risk/live` | All-village live risk snapshot (15-min cadence, Redis-cached) |
| `GET /alerts` · `POST /alerts/{id}/ack` · `/resolve` · `POST /alerts` | Alert lifecycle (RBAC enforced) |
| `GET /sensors` · `GET /sensors/mqtt/recent` | Node health + last MQTT packets |
| `GET /analytics/model` | AUC/ROC/confusion/SHAP + backtests |
| `GET /sources/status` | Feed health + fallback states |
| `WS /ws/live` | Push updates (replaces 4 s polling in production) |

## 9. UI spec & design tokens

- Dark ops-centre theme: bg `#04070D`, panels `#0A1322`, borders `white/8`, text `#E8F0FA` / `#8CA3BF` (AA+ contrast everywhere — **no hidden/truncated critical text**).
- Risk palette: green `#22C55E` · yellow `#FACC15` · orange `#F97316` · red `#EF4444`; primary accent cyan `#22D3EE`.
- Fonts: Space Grotesk (display) + Inter (body) + tabular mono for telemetry.
- Components: KPI cards, 2D/3D map card with legend + live badge, village drill panel (RiskRing, climate grid, WHY bars, countdown), charts row, alert feed, MQTT inspector, role-gated nav sidebar.

## 10. Acceptance criteria (all verified)

- [x] `npm run build` passes `tsc --noEmit` + Vite production build with 0 errors
- [x] Login page: 5 demo chips autofill email+password; wrong creds rejected with visible error
- [x] 2D map: 24 village markers with name + live rain chip, risk-coloured; click → drill panel
- [x] 3D mode: satellite + terrain elevation + sky, camera pitch; same interactivity
- [x] Dashboard: KPIs, 24 h rainfall + 6 h nowcast, soil lines, river-vs-danger chart, live alert feed
- [x] Scenario drill changes risks live; alerts fire with 2-source confirmation + WHY
- [x] Sensors page shows exact ESP32 JSON payload stream; offline & low-battery nodes
- [x] Role gating hides/restricts pages and actions per matrix; UI always explains restrictions in visible text
- [x] All metrics graphs render from the live store; every village page has climate + sensors + evacuation card
