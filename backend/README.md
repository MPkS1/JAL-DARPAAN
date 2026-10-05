# JAL-DARPAAN — Backend

FastAPI service implementing the **PLAN.md §8 contract** — the first production
component of the JAL-DARPAAN flash-flood early-warning platform. The frontend
remains browser-simulated for now; the next integration step is pointing
`src/store/live.tsx` at this API (the response shapes already match).

## Quick start

```bash
# from repo root — Python 3.12, Node not required for the backend
pip install -r backend/requirements.txt

cd backend
python -m app.seed          # create + seed jaldarpaan.db (idempotent)
python -m uvicorn app.main:app --reload   # → http://127.0.0.1:8000
```

- Swagger UI: **http://127.0.0.1:8000/docs**
- Health: `GET /health` → `{"ok":true,"tick":n,"scenario":"monsoon"}`

On startup the app auto-seeds and launches the server-side tick engine
(4 s tick, 15 ticks = 1 simulated hour, 90 s per-village alert cooldown — the
same constants as the frontend demo).

## What is implemented

| Area | Details |
|---|---|
| **Auth** | `POST /auth/login` → JWT (HS256) with role + capability claims; PBKDF2-HMAC-SHA256 passwords; `GET /auth/me` |
| **RBAC** | Server-enforced `CAP_MATRIX` port — same matrix as `src/store/auth.tsx`; `403` with explanatory message; village-scoped roles see only their village |
| **Risk engine** | Bit-for-bit port of `src/lib/risk.ts` — weights 0.34/0.27/0.17/0.16/0.06, bands SAFE<40/WATCH/WARNING/CRITICAL≥75, SHAP-style contributions, arrival estimate |
| **Simulation engine** | Port of `src/lib/simulation.ts` — monsoon physics, scenario targets, seeded mulberry32 RNG (bit-exact JS emulation), ESP32-005/010 failure cases |
| **Tick engine** | Server-side loop replacing the browser interval; fires alerts at 45/62/78 with ≥2-source rule + cooldown; auto-resolve below 42; persists hourly telemetry + MQTT packets |
| **Alerts** | Lifecycle ACTIVE → ACKNOWLEDGED → RESOLVED with RBAC gating on every transition; manual evacuation advisories (`manual: true`) |
| **Scenarios** | `POST /scenario` (national/state/district) — normal / monsoon / cloudburst drill |
| **ESP32 ingest** | `POST /telemetry` accepting the exact PLAN.md §7 MQTT payload; readings merge into live state so real nodes plug in with zero code change |
| **WebSocket** | `WS /ws/live` — `hello` snapshot, then `tick` / `scenario` / `alertUpdated` / `telemetry` pushes; `ping`→`pong` keepalive |
| **Analytics** | Model metrics, ROC, confusion matrix, feature importance, backtests (Kedarnath 2013 / Chamoli 2021 / Sikkim 2023) |

## Endpoints (PLAN.md §8)

| Endpoint | Purpose |
|---|---|
| `GET /` | API landing route (service info + links; the bare URL never 404s) |
| `GET /health` | Liveness + tick/scenario state |
| `POST /auth/login` · `GET /auth/me` | JWT with role claims (national/state/district/field/village) |
| `GET /villages` · `GET /villages/{id}` | Village registry + current fused live state |
| `GET /villages/{id}/history?h=24` | Hourly telemetry series (DB-persisted) |
| `GET /villages/{id}/nowcast` | 6 h forecast (persistence model; LSTM/GRU slot) |
| `GET /risk/live` | All-village risk snapshot + band counts |
| `GET /alerts` · `POST /alerts/{id}/ack` · `/resolve` · `POST /alerts` | Alert lifecycle (RBAC-enforced) |
| `POST /scenario` | Scenario drill control |
| `GET /sensors` · `GET /sensors/mqtt/recent` | Node health + last ESP32 packets |
| `GET /analytics/model` | AUC/ROC/confusion/SHAP + backtests |
| `GET /sources/status` | Feed health + fallback states |
| `POST /telemetry` | ESP32 ingest (§7 contract, no auth for field nodes) |
| `WS /ws/live` | Push updates (replaces polling) |

## Configuration (env vars)

| Var | Default | Notes |
|---|---|---|
| `JD_SECRET_KEY` | dev value | **change in production** |
| `JD_DB_URL` | SQLite | e.g. `postgresql+psycopg://…` for Neon (then `pip install psycopg[binary]`) |
| `JD_TOKEN_EXPIRE_MINUTES` | 720 | JWT lifetime |
| `JD_TICK_SECONDS` | 4.0 | tick cadence |
| `JD_ALERT_COOLDOWN_S` | 90 | per-village alert cooldown |
| `JD_CORS_ORIGINS` | `*` | comma-separated origins for the SPA |

## Demo logins (same as the frontend)

| Role chip | E-mail | Password |
|---|---|---|
| 🏛 National Command | `national@jaldarpaan.in` | `Demo@1234` |
| 🏔 State Control | `state@jaldarpaan.in` | `Demo@1234` |
| 🏢 District EO | `district@jaldarpaan.in` | `Demo@1234` |
| 🎖 Field Officer | `field@jaldarpaan.in` | `Demo@1234` |
| 🏘 Village Pradhan | `village@jaldarpaan.in` | `Demo@1234` |

Directory-only accounts (Admin page) are seeded with `loginEnabled=false`.

## Smoke test

```bash
# server must be running (uvicorn app.main:app)
python smoke_test.py   # 36-check suite: logins, RBAC 401/403s, scoping, lifecycle, ingest
```

## Layout

```text
backend/
├── requirements.txt
├── README.md
├── smoke_test.py      # 36-check end-to-end verification suite
└── app/
    ├── main.py         # FastAPI: all §8 endpoints + WS + lifespan
    ├── auth.py         # JWT + RBAC (CAP_MATRIX port)
    ├── engine.py       # tick loop, alert engine, WS broadcast
    ├── simulation.py   # monsoon physics, telemetry, ESP32 packet contract
    ├── risk.py         # weighted fusion + contributions + arrival
    ├── rng.py          # bit-exact mulberry32 port
    ├── seed.py         # idempotent DB seeding + villages_live store
    ├── seed_data.py    # 24 villages · 10 users · 11 sources · analytics
    ├── models.py       # SQLAlchemy: villages/users/alerts/telemetry/mqtt
    ├── database.py     # engine/session (SQLite dev → Postgres deploy)
    └── config.py       # env-driven config
```
