# JAL-DARPAAN — Software Design Document (SDD)

**PS 26192 · Flash Flood Prediction System for Hilly Regions using Multi-Source Data**
Team **BhushaktiAI** · Team ID 184091 · Theme: Disaster Management · Org: MHA / NDRF
Version 1.0 · October 2026

> This document is the single source of truth for *what the system is*, *how it is structured*
> (HLD + UML), and *how every module works internally* (LLD). Companion documents:
> [`docs/PLAN.md`](PLAN.md) (build plan & API contract) · [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) (GitHub + free hosting).

---

## Table of contents

1. [System overview & goals](#1-system-overview--goals)
2. [Technology stack — what we use and why](#2-technology-stack--what-we-use-and-why)
3. [High-Level Design (HLD)](#3-high-level-design-hld)
4. [UML design](#4-uml-design)
5. [Low-Level Design (LLD)](#5-low-level-design-lld)
6. [Data dictionary](#6-data-dictionary)
7. [Design decisions & trade-offs](#7-design-decisions--trade-offs)
8. [Production evolution path](#8-production-evolution-path)

---

## 1. System overview & goals

JAL-DARPAAN is a village-level flash-flood early-warning operations platform for the Indian
Himalaya. It fuses India's existing station network (IMD AWS/ARG, CWC, India-WRIS), free
satellite feeds (GPM IMERG, NASA SMAP, Sentinel-1), 30 m terrain (Copernicus DEM) and optional
₹1,500 ESP32 gap-filler nodes into a live risk map, explainable alerts, and role-based workflows
spanning **National Command → State Control → District EO → Field Officer → Village Pradhan**.

**Design goals**

| # | Goal | Realised by |
|---|---|---|
| G1 | Village-level (not district-level) risk | 30 m micro-watershed villages dataset + per-village risk engine |
| G2 | Explainable, trustworthy alerts | SHAP-style `contributions[]` attached to every score & alert ("WHY box") |
| G3 | False-alarm defence | ≥2 independent source confirmation rule + 90 s per-village cooldown |
| G4 | Actionable output | flood-arrival countdown, shelter, evacuation route, helpline in every alert |
| G5 | Realistic, reproducible demo without backend | seeded deterministic simulation engine (mulberry32 RNG) |
| G6 | Zero-rewrite path to production | frontend store shaped exactly like the REST API contract — **now served by the real backend (`backend/`)** |
| G7 | ₹0/month running cost | static hosting + free-tier backend (see `DEPLOYMENT.md`) |
| G8 | Security through role gating | capability matrix enforced in nav, routes, and every action |

**Non-goals (demo scope):** real data ingestion (IMD/CWC adapters), SMS/Telegram dispatch,
ML model training — these are specified (§8 / roadmap) but not yet wired. **The backend itself
is no longer a non-goal:** `backend/` implements the §8 API (JWT auth, RBAC, risk + simulation
engines, tick engine, alert lifecycle, ESP32 ingest, `WS /ws/live`) and was verified end-to-end
(36-check suite: logins, 401/403 gating, village scoping, lifecycle transitions, cloudburst
cascade firing CRITICAL with 2-source WHY).

---

## 2. Technology stack — what we use and why

### 2.1 Frontend (what is built in this repo)

| Technology | Version | Used for | Why this one |
|---|---|---|---|
| **React** | 18.3 | UI framework | Component model fits the dashboard's many small cards; largest ecosystem; SIH proposal stack |
| **TypeScript** | 5.6 | Type safety | Compile-time proof that data contracts (village, alert, telemetry) are consistent; `tsc --noEmit` gate in build |
| **Vite** | 6 | Build tool | <1 s dev HMR, static `dist/` output deployable to any free host, native ESM |
| **Tailwind CSS** | v4 | Styling | Utility classes keep the dark ops-centre theme consistent (`#04070D` bg, cyan accent) without CSS drift |
| **MapLibre GL** | 5 | 2D map + 3D terrain | Fully open-source fork of Mapbox GL — **no API key, no billing account**; supports Esri World Imagery tiles + AWS terrarium DEM for true 3-D elevation |
| **Recharts** | 2.15 | Charts | Proposal's stated chart lib; React-native API for the 24 h rainfall / soil / river charts |
| **React Router** | 7.1 | Routing | SPA routing incl. deep-link-gated routes (`/admin`, `/sources`) |
| **lucide-react** | 0.474 | Icons | Consistent stroke icon set, tree-shakeable |

### 2.2 Backend / production stack (§8 — **implemented in `backend/`**, Phase-2 items marked)

| Layer | Technology | Status |
|---|---|---|
| API | **Python 3.12 + FastAPI** (`backend/app/main.py`) | ✅ built — all §8 endpoints + Swagger at `/docs` |
| Auth | **JWT (HS256) + RBAC** (`backend/app/auth.py`) — claims mirror the demo `CAP_MATRIX` exactly; PBKDF2-HMAC-SHA256 passwords | ✅ built — server-enforced 403s |
| DB | **SQLAlchemy ORM** on SQLite (WAL) in dev, Postgres/Neon by config (`JD_DB_URL`); PostGIS spatial joins in Phase 2 | ✅ built (SQLite) — Postgres is a config/env swap |
| Cache | Redis (15-min snapshot cache, cooldown counters, pub/sub) | ⏳ Phase 2 — in-process engine covers demo scale |
| Tick/alert engine | `backend/app/engine.py` — 4 s tick, thresholds 45/62/78, ≥2-source rule, 90 s cooldown, auto-resolve, hourly persistence | ✅ built |
| ML | PyTorch (LSTM/GRU) + LightGBM + SHAP | ⏳ Phase 2 — `/villages/{id}/nowcast` returns persistence model, slot reserved |
| Ingest | `POST /telemetry` accepting the exact §7 ESP32/MQTT payload; Mosquitto broker in Phase 2 | ✅ endpoint built; broker Phase 2 |
| DevOps | Docker + GitHub Actions | ⏳ pending |
| Hosting | **Cloudflare Pages** (frontend) + **Render free tier** (backend) | recipe ready in `DEPLOYMENT.md` |

### 2.3 Why MapLibre instead of Google Maps / Mapbox

- Google Maps JS API requires a billing card — fails the ₹0 goal.
- Mapbox GL v2+ requires an access token + billable map loads.
- MapLibre GL + Esri World Imagery + Mapzen terrarium terrain = real satellite imagery **and**
  real 3-D elevation with zero keys, zero cost, permissive licences.

---

## 3. High-Level Design (HLD)

### 3.1 Conceptual architecture (demo build)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (SPA)                               │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────────┐    │
│  │ pages/*     │  │ components/* │  │ store/*  (React Context)  │    │
│  │ Dashboard   │←─│ MapPanel     │←─│ AuthProvider (RBAC)       │    │
│  │ Villages    │  │ VillagePanel │  │ LiveProvider (sim engine) │    │
│  │ Alerts      │  │ ChartsRow    │  └────────────┬──────────────┘    │
│  │ Sensors     │  │ AlertFeed    │               │ 4 s tick          │
│  │ Analytics   │  │ WhyBox …     │               ▼                   │
│  │ Sources     │  └──────────────┘  ┌───────────────────────────┐    │
│  │ Admin       │                    │ lib/simulation.ts         │    │
│  └─────────────┘                    │ lib/risk.ts  lib/rng.ts   │    │
│                                     │ data/villages.ts  …       │    │
│                                     └────────────┬──────────────┘    │
└──────────────────────────────────────────────────┼──────────────────┘
                                                   │ HTTP (tiles/terrain)
                                                   ▼
                       Esri World Imagery · AWS terrarium DEM (open, keyless)
```

### 3.2 Production architecture (target)

```
 DATA SOURCES                INGESTION                CORE                CONSUMERS
┌────────────┐   pull    ┌──────────────────┐       ┌─────────────┐     ┌─────────────┐
│ IMD AWS/ARG│←──────────│ Source adapters  │──────→│ PostgreSQL  │←────│ FastAPI     │
├────────────┤           │ (per-feed +      │       │ + PostGIS   │     │ REST + WS   │
│ CWC / WRIS │←──────────│  fallback logic) │       └─────────────┘     └──────┬──────┘
├────────────┤           └──────────────────┘                                  │
│ GPM IMERG  │           ┌──────────────────┐       ┌─────────────┐     ┌─────▼───────┐
│ NASA SMAP  │←──────────│ MQTT broker      │──────→│ Redis       │←───→│ React SPA   │
│ Sentinel-1 │           │ (ESP32 nodes)    │       │ cache/pubsub│     │ (this repo) │
├────────────┤           └──────────────────┘       └─────────────┘     └─────────────┘
│ Copernicus │                                   ┌──────────────────────────┐
│  DEM / GSI │                                   │ AI ENGINE (worker)       │
├────────────┤                                   │ LSTM rain → GRU soil →   │──→ Alert
│ ESP32/MQTT │──────────────────────────────────→│ LightGBM risk → SHAP why │    Dispatcher
└────────────┘                                   └──────────────────────────┘    (SMS/TG/FCM)
```

### 3.3 Layering rules

```
pages → components → store → lib → data
        (no component imports a page; no lib imports a store; data has zero imports)
```

- **data/** — pure typed constants (villages, users, sources, backtests). No logic.
- **lib/** — pure functions: risk maths, simulation step, RNG, formatting. No React, no side effects.
- **store/** — React Contexts: `auth` (session + RBAC), `live` (simulation loop, alerts, actions).
- **components/** — presentational units; receive data via props or context hooks.
- **pages/** — route-level composition + capability gating via `<Gated cap>`.

This keeps the swap-to-API path clean: in production only `store/live.tsx` changes its data
source (HTTP/WS instead of the tick loop); every layer above is untouched.

---

## 4. UML design

### 4.1 Use-case diagram

```
                         JAL-DARPAAN
      ┌──────────────────────────────────────────────────────┐
      │                                                      │
      │   (View live risk map 2D/3D)────┐                    │
      │   (Drill into a village)        │                    │
      │   (View alert feed)             │                    │
      │   (Acknowledge alert)◄─────── National ──┐           │
      │   (Run scenario drill)─────┐   │ State    │           │
      │   (Issue evacuation        │   │ District │           │
      │        advisory)───────────┼───┘   │      │           │
      │   (Resolve / close alert)──┼───────┘      │           │
      │   (View sensor network)────┼──────────────┼───────────┤
      │   (View AI analytics)──────┼──────────────┤           │
      │   (View data sources)──────┼──── National │           │
      │   (Manage users)───────────┘              │           │
      │                                           │           │
      │   Field Officer: map · alerts · ack only  │           │
      │   Village Pradhan: own village only       │           │
      └──────────────────────────────────────────────────────┘
```

Actor–capability mapping (enforced by `CAP_MATRIX` in `src/store/auth.tsx`):

| Capability | Nat | State | Dist | Field | Village |
|---|:-:|:-:|:-:|:-:|:-:|
| View map/villages/alerts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Acknowledge alert | ✅ | ✅ | ✅ | ✅ | — |
| Run scenario drill | ✅ | ✅ | ✅ | — | — |
| Issue evacuation advisory | ✅ | ✅ | ✅ | — | — |
| Resolve alert | ✅ | ✅ | — | — | — |
| Sensor network page | ✅ | ✅ | ✅ | ✅ | — |
| AI analytics page | ✅ | ✅ | ✅ | — | — |
| Data sources page | ✅ | ✅ | — | — | — |
| User management page | ✅ | — | — | — | — |

### 4.2 Class diagram (domain model)

```
┌──────────────┐        ┌────────────────────┐        ┌──────────────────┐
│ «entity»     │        │ «entity»           │ 1    * │ «value»          │
│ Village      │───────→│ VillageLive        │───────→│ Contribution     │
│──────────────│ 1    1 │────────────────────│        │──────────────────│
│ id: string   │        │ rainMmHr: number   │        │ label: string    │
│ code: string │        │ soilPct: number    │        │ value: number    │
│ lat/lng: num │        │ waterLevelM: number│        │ color: string    │
│ slopeDeg     │        │ score: number      │        └──────────────────┘
│ dangerLevelM │        │ band: Band         │
│ nodeId: str? │        │ sourcesAgree: bool │
│ shelter      │        │ arrivalMin: num?   │        ┌──────────────────┐
│ route        │        │ history: HourPt[]  │ 1    * │ HourPoint        │
│ events[]     │        │ nowcast: number[]  │───────→│ hour, rain, soil,│
└──────────────┘        └────────────────────┘        │ water            │
                                                      └──────────────────┘
┌──────────────┐        ┌────────────────────┐
│ «entity»     │        │ «entity»           │        ┌──────────────────┐
│ FloodAlert   │  *   1 │ User               │        │ «entity»         │
│──────────────│───────→│────────────────────│        │ SensorNode       │
│ severity     │ ackBy  │ email, name, role  │        │──────────────────│
│ status       │        │ org, posting       │        │ nodeId, village  │
│ why: string  │        │ scopeState?/Dist?  │        │ status: online | │
│ sources[]    │        │ scopeVillageId?    │        │  offline | low-b │
│ arrivalMin   │        └────────────────────┘        │ batteryPct       │
│ score        │                                      │ signalDbm        │
└──────────────┘                                      └──────────────────┘

Enumerations:
  Role      = national | state | district | field | village
  Band      = SAFE | WATCH | WARNING | CRITICAL
  AlertStatus = ACTIVE | ACKNOWLEDGED | RESOLVED
  Scenario  = normal | monsoon | cloudburst
```

### 4.3 State machine — alert lifecycle

```
                 score ≥ 62 & 2 sources agree
   ┌──────┐  ────────────────────────────────────►  ┌────────┐
   │ (no  │                                          │ ACTIVE │
   │alert)│  ─── score ≥ 78 & 2 sources ──► CRITICAL │        │
   └──────┘                                          └───┬────┘
                    score ≥ 45 (WATCH)                    │ Field/Dist/State/Nat
                                                          │ "Acknowledge"
                                                          ▼
                                                     ┌──────────────┐
                                                     │ ACKNOWLEDGED │
                                                     └───┬──────┘
                        score < 62 or river recedes      │ State/National only
                        (auto)  ──────┐                  │ "Resolve"
                                      ▼                  ▼
                                                 ┌──────────┐
                                                 │ RESOLVED │ (terminal)
                                                 └──────────┘
Guards: per-village 90 s cooldown on new ACTIVE alerts · severity can only escalate
        while ACTIVE (WATCH→WARNING→CRITICAL) · manual advisories carry manual:true
```

### 4.4 Sequence — cloudburst scenario drill (the 4-second tick loop)

```
Judge        UI(Shell)      AuthStore       LiveStore         risk.ts        simulation.ts
 │  click         │             │               │                │                │
 │ "Cloudburst"───┼────────────►│ can('scenario')?              │                │
 │                │             │── yes ───────►│                │                │
 │                │             │   setScenario('cloudburst')    │                │
 │                │             │               │  every 4 s:    │                │
 │                │             │               │── tick++ ─────►│                │
 │                │             │               │                │ scenarioTargets│
 │                │             │               │                │ computeRisk(v) │
 │                │             │               │◄── score/band ─│ arrivalEstimate│
 │                │             │               │  contributions │                │
 │                │             │               │ score ≥ threshold & ≥2 sources &  │
 │                │             │               │ cooldown ok → push FloodAlert    │
 │  KPI/map/charts/alert feed re-render (React re-render via context)              │
 │◄───────────────┼─────────────┴───────────────┴────────────────┴────────────────┘
```

### 4.5 Component diagram (React tree)

```
App
├── AuthProvider ── LiveProvider
│   └── BrowserRouter
│       ├── /login ── Login
│       └── Protected → Shell (sidebar + topbar)
│           ├── / ..................... Dashboard
│           │     ├── KpiRow ── Sparkline
│           │     ├── MapPanel ── RiskRing · VillagePanel ── RiskRing · WhyBox
│           │     ├── ChartsRow ── Sparkline
│           │     ├── AlertFeed ── WhyBox · ScenarioCard
│           │     └── MqttInspector
│           ├── /villages ............ Villages
│           ├── /villages/:id ........ VillageDetail ── WhyBox · RiskRing
│           ├── /alerts .............. Alerts ── WhyBox
│           ├── /sensors (Gated) ..... Sensors ── MqttInspector
│           ├── /analytics (Gated) ... Analytics
│           ├── /sources (Gated) ..... Sources
│           └── /admin (Gated) ....... Admin
```

### 4.6 Deployment diagram

```
┌─────────────── Cloud (free tier) ────────────────┐
│  Cloudflare Pages            Render / Koyeb      │
│  ┌─────────────────┐         ┌─────────────────┐ │      ┌────────────────────┐
│  │ static dist/    │  HTTPS  │ FastAPI + workers│ │      │ Esri tiles · DEM   │
│  │ (this repo)     │◄────────│ JWT · risk · WS  │ │      │ IMD · WRIS · IMERG │
│  └─────────────────┘         └────────┬────────┘ │      └────────────────────┘
│   SPA routing                ┌────────┴────────┐ │
│   global CDN                 │ Postgres/PostGIS│ │      ┌────────────────────┐
│                              │ Redis           │ │      │ ESP32 nodes (field)│
│                              └─────────────────┘ │      │ MQTT → broker      │
└──────────────────────────────────────────────────┘      └────────────────────┘
   Browser ◄── HTTPS/TLS ──► CDN/edge ◄── internal ──► services
```

---

## 5. Low-Level Design (LLD)

### 5.1 Module map

| Path | Responsibility | Key exports |
|---|---|---|
| `src/types.ts` | All shared domain types | `Village`, `VillageLive`, `FloodAlert`, `User`, `Role`, `Band`, … |
| `src/data/villages.ts` | 24-village geo dataset (Rudraprayag, Mandakini valley) | `VILLAGES: Village[]` |
| `src/data/users.ts` | 5 demo accounts, one per role | `DEMO_USERS: User[]` |
| `src/data/sources.ts` | 11 fused data-feed descriptors + health | `SOURCES: SourceStatus[]` |
| `src/data/backtest.ts` | Kedarnath 2013 / Chamoli 2021 / Sikkim 2023 records | `BACKTESTS` |
| `src/lib/rng.ts` | Deterministic seeded RNG | `hashSeed`, `mulberry32`, `noise` |
| `src/lib/format.ts` | Number/time formatting + clamps | `clamp`, `clamp01`, `pad2`, … |
| `src/lib/risk.ts` | Risk model — the "AI contract" | `WEIGHTS`, `BANDS`, `bandOf`, `computeRisk`, `arrivalEstimate` |
| `src/lib/simulation.ts` | Telemetry generation + alert triggers | `ALERT_THRESHOLDS`, `susceptibility`, `scenarioTargets`, `initVillageLive`, `tickVillage` |
| `src/store/auth.tsx` | Session + RBAC | `AuthProvider`, `useAuth`, `CAP_MATRIX`, `Cap` |
| `src/store/live.tsx` | Live state, tick loop, alert actions | `LiveProvider`, `useLive` |
| `src/components/*` | Presentational components (12) | see §5.6 |
| `src/pages/*` | Route pages (9) | see §5.7 |

### 5.2 `lib/risk.ts` — the risk engine

**Weighted fusion model** (transparent stand-in for the production LightGBM+SHAP stack —
same inputs, same ordering, same bands, so the UI never changes):

```
norm(rain)  = clamp01(rainMmHr / 60)          # 60 mm/h ≈ cloudburst
norm(soil)  = clamp01(soilPct / 100)
norm(river) = clamp01(waterLevelM / dangerLevelM)   # 1.0 = at danger line
norm(slope) = clamp01(slopeDeg / 60)
norm(hist)  = clamp01(|events 2013/21/23| / 3)

score = 100 × (0.34·rain + 0.27·soil + 0.17·river + 0.16·slope + 0.06·hist)
```

- `computeRisk(village, live) → { score, band, contributions[] }` — contributions are the
  per-feature point values, sorted descending: exactly what the WHY box renders.
- `bandOf(score)`: SAFE < 40 · WATCH 40–59 · WARNING 60–74 · CRITICAL ≥ 75.
- `arrivalEstimate(live, dangerLevelM)`: `max(12, 200 − 1.5·rain − 1.5·(soil−60)⁺ − 60·riverRatio)`
  minutes; returns `null` below WARNING. Clamped to [12, 240].

**Pseudocode:**

```
function computeRisk(village, live):
    n = [norm_rain, norm_soil, norm_river, norm_slope, norm_hist]
    score = 100 * (Σ WEIGHTS[i] * n[i])
    contributions = [(label_i, WEIGHTS[i]*n[i]*100, color_i) …].sort(desc)
    return { round1(score), bandOf(score), contributions }
```

### 5.3 `lib/simulation.ts` — telemetry engine

**Determinism contract:** `mulberry32(hashSeed(village.id + tick))` — same seed chain every run,
so judges see identical data on every demo.

1. `susceptibility(v)` — static 0–1 terrain index:
   `0.4·(slope/60) + 0.25·(1 − riverDist/3) + 0.35·(elev/3600)`.
2. `scenarioTargets(v, scenario)` — per-village targets for the active scenario:

   | Scenario | rain (mm/h) | soil (%) | water target |
   |---|---|---|---|
   | `normal` | 0.4 + 2·sus | 42 + 12·sus | 0.42·danger |
   | `monsoon` | 4 + 20·sus | 55 + 26·sus | 0.66·danger |
   | `cloudburst` | 58 + 34·sus (upper valley) / 16 + 20·sus | ≤ 97: 86 + 10·sus | 0.94·danger |

   `cloudburstZone = lat ≥ 30.4` — concentrates the disaster on the Kedarnath→Chandrapuri corridor.
3. `tickVillage(v, live, scenario, tick)` — every 4 s: walk `rain/soil/water` toward targets with
   seeded noise; append to 24-point history; shift every 15 ticks (= 1 simulated hour);
   recompute risk via `computeRisk`; evaluate alert thresholds **45 / 62 / 78** (edge-flicker
   guards above band edges); require `sourcesAgree` (node + IMD/IMERG/SMAP) for WARNING+;
   respect the 90 s per-village cooldown; update `arrivalMin` and node health.
4. Seeded failure cases: `ESP32-UK-010` offline (comms dropout), `ESP32-UK-005` low battery (31 %)
   — makes the sensor-health page demonstrate monitoring in every run.

**ESP32 payload emitted by the MQTT inspector (identical to production contract):**

```json
{"node_id": "ESP32-UK-004", "village_code": "VN-2205",
 "timestamp": "2026-10-05T14:35:00+05:30",
 "rainfall_mm_hr": 45.2, "soil_moisture_pct": 88.4, "water_level_m": 1.42,
 "battery_pct": 92, "signal_dbm": -67}
```

### 5.4 `store/auth.tsx` — RBAC

- `Cap` union type — every privileged verb (11 caps, incl. `alert-ack`, `scenario`, `view-admin`).
- `CAP_MATRIX: Record<Cap, Role[]>` — single source of truth; mirrors the production JWT claim
  design and `docs/PLAN.md` §4.
- `login(email, password)` checks `DEMO_USERS`, persists `jd_session_v1` in localStorage
  (JWT-shaped session in production), `can(cap)` gates nav items, routes (`<Gated>`), and buttons.
- Deep-link defence: even a hand-typed `/admin` renders a `Restricted` explanation page.

### 5.5 `store/live.tsx` — the live store (future API contract)

State: `scenario`, `tick`, `villagesLive: Record<id, VillageLive>`, `alerts: FloodAlert[]`,
`lastRefresh`. A `setInterval(TICK_MS = 4000)` drives `tickVillage` over all 24 villages.

Actions (these become the REST calls in §8 — same names, same shapes):
`ackAlert(id, byName)`, `resolveAlert(id)`, `issueEvacuation(villageId, byName)` (fires a manual
`manual: true` alert), `setScenario(s)`. Seeded history includes one of each alert status so the
Alerts page demonstrates the full lifecycle on first load.

### 5.6 Component specs (12 components)

| Component | Props (main) | Behaviour |
|---|---|---|
| `Shell.tsx` | — | Sidebar nav filtered by `can(cap)`, role badge, logout; outlet for pages |
| `MapPanel.tsx` | villages, live, onSelect | MapLibre map; Esri imagery; **3D toggle** adds terrain + sky + pitch; markers coloured by band with rain chips; click → select village |
| `VillagePanel.tsx` | village, live | Drill-down: climate grid, soil/river, `RiskRing`, `WhyBox`, arrival countdown, evacuation card |
| `RiskRing.tsx` | score, band | Animated SVG ring coloured by band, big score in centre |
| `WhyBox.tsx` | contributions, why | SHAP-style horizontal contribution bars + plain-language sentence |
| `ChartsRow.tsx` | villagesLive | 24 h rainfall + dashed 6 h nowcast, soil saturation lines, river-vs-danger chart |
| `Sparkline.tsx` | values, color | Tiny inline trend line for KPI cards |
| `KpiRow.tsx` | kpis | Villages monitored / active alerts / sensors online / peak rain |
| `AlertFeed.tsx` | alerts, actions | Live feed, severity chips, 2-source badge, ack/resolve buttons gated by `can()` |
| `ScenarioCard.tsx` | scenario, setScenario | The 3-button drill: Clear skies / Monsoon surge / Cloudburst |
| `MqttInspector.tsx` | villagesLive | Streams the exact ESP32 JSON payload per node, pretty-printed |
| `Restricted.tsx` | cap, title | Visible plain-language restriction notice (no silent dead-ends) |

### 5.7 Page specs (9 pages)

| Route | Page | Gating | Contents |
|---|---|---|---|
| `/login` | `Login` | public | 5 role chips auto-filling credentials, error on bad creds |
| `/` | `Dashboard` | all | KPI row, 2D⇄3D map, drill panel, charts, alert feed, MQTT inspector |
| `/villages` | `Villages` | all | All 24 villages ranked by live score |
| `/villages/:id` | `VillageDetail` | all | Full village page: climate, sensors, WHY, evacuation card |
| `/alerts` | `Alerts` | all | Filterable log; ack/resolve per matrix; WHY on every row |
| `/sensors` | `Sensors` | field+ | 14 node health cards + MQTT inspector |
| `/analytics` | `Analytics` | district+ | AUC 0.87, ROC, confusion matrix, SHAP importance, 3 backtests |
| `/sources` | `Sources` | state+ | 11 feeds with health, latency, fallback mode |
| `/admin` | `Admin` | national | Role×capability matrix, directory, coverage |

### 5.8 Key algorithms (complexity & correctness)

| Algorithm | Where | Complexity | Notes |
|---|---|---|---|
| Weighted fusion score | `risk.ts` | O(1) per village | pure, no allocation churn |
| Alert decision | `live.tsx` tick | O(n) n=24 villages/4 s | threshold + 2-source + cooldown checks |
| Seed chain | `rng.ts` | O(len(id)) | `hashSeed` (murmur-style mix) → `mulberry32` |
| History window | `simulation.ts` | O(24) ring buffer | 24-point hourly, shift every 15 ticks |
| Contribution ranking | `risk.ts` | O(5 log 5) | sort 5 contributions desc for WHY box |
| Terrain susceptibility | `simulation.ts` | O(1) static per village | memoised by construction |

**UI performance budget:** 24 villages × 60 fps map markers is trivial for MapLibre GL
(WebGL); React re-renders are bounded by the 4 s tick, not per-frame state.

---

## 6. Data dictionary

| Field (in `types.ts`) | Type | Unit / range | Source in production |
|---|---|---|---|
| `Village.lat/lng` | number | °, 2–6 dp | district survey / Bhuvan |
| `Village.elevationM` | number | m ASL | Copernicus 30 m DEM |
| `Village.slopeDeg` | number | 0–60° | DEM gradient |
| `Village.riverDistKm` | number | km to river | PostGIS nearest-river |
| `Village.dangerLevelM` | number | m (CWC gauge) | CWC/WRIS gauge sheets |
| `Village.events[]` | `{year,label}[]` | — | GSI Bhukosh + district records |
| `VillageLive.rainMmHr` | number | mm/h | ESP32 / IMD AWS / IMERG |
| `VillageLive.rain24` | number | mm/24 h | rolling 24 h sum |
| `VillageLive.soilPct` | number | % saturation | ESP32 probe / SMAP L4 |
| `VillageLive.waterLevelM` | number | m | CWC/WRIS gauge |
| `VillageLive.score` | number | 0–100 | risk engine |
| `VillageLive.band` | enum | 4 bands | bandOf(score) |
| `VillageLive.contributions[]` | `Contribution[]` | points of 100 | SHAP values |
| `VillageLive.sourcesAgree` | boolean | — | ≥2 independent feeds |
| `VillageLive.arrivalMin` | number \| null | min | arrivalEstimate() |
| `VillageLive.history[]` | `HourPoint[24]` | hourly | telemetry store |
| `VillageLive.nowcast[]` | number[6] | mm/h next 6 h | LSTM/GRU |
| `VillageLive.nodeStatus` | enum | online/offline/low-battery/no-node | MQTT heartbeat |
| `FloodAlert.why` | string | plain text | template(SHAP top-3) |
| `FloodAlert.status` | enum | ACTIVE→ACKNOWLEDGED→RESOLVED | alert service |
| `SourceStatus.latencyMs` | number | ms | adapter heartbeat |

---

## 7. Design decisions & trade-offs

| Decision | Alternatives considered | Why this won |
|---|---|---|
| Simulated telemetry, not live APIs | Wire Open-Meteo now | Judge demo must be reproducible & offline-safe; contract is identical, so the swap is one file |
| Weighted transparent score, not a black box | Train a model for the demo | SHAP-style explainability is the product's USP; the linear model *is* the explanation |
| MapLibre GL, not Leaflet/Google | Leaflet (no 3-D), Google (key+cost) | 3-D terrain was a hard requirement; zero-key operation was a hard constraint |
| Context stores, not Redux | Redux/Zustand | 2 stores, tiny app; Context is built-in and sufficient |
| Client RBAC matrix | Server-only auth | Production keeps server JWT; the demo needs visible role-plays for judges |
| 4 s tick (1 h = 1 min) | Real-time cadence | Judges watch a full disaster arc in 2 minutes instead of waiting hours |
| localStorage session | Cookie session | Demo login page needs zero infrastructure; the **JWT flow now exists in `backend/`** for the production swap |
| Dark ops theme `#04070D` | Light admin theme | 24×7 control-room aesthetic; matches NDRF ops-centre framing; AA+ contrast |

**Known limitations (owned):** demo auth is client-side only; "sources" are simulated;
no persistence across reloads beyond the session key. The server-side counterparts of all
three are implemented in `backend/` (JWT + RBAC, feed status endpoint, DB persistence).

---

## 8. Production evolution path

The demo store is a drop-in stand-in for this backend — **the UI code does not change**.
The right-hand column is now **implemented** in `backend/` (last column = status):

| Demo (today) | Production (backend/) | Status |
|---|---|---|
| `simulation.ts` tick loop | `GET /risk/live` + `WS /ws/live` push | ✅ built |
| `DEMO_USERS` + `CAP_MATRIX` | `POST /auth/login` → JWT with role claims; server re-checks every cap | ✅ built |
| Seeded `FloodAlert[]` | `GET /alerts`, `POST /alerts/{id}/ack` / `/resolve` (RBAC enforced) | ✅ built |
| `simulation.ts` engine | `POST /telemetry` ESP32 ingest + server tick engine | ✅ built |
| Static `sources.ts` | `GET /sources/status` (adapter heartbeats) | ✅ endpoint (static heartbeats) |
| Simulated backtests | Real model registry: LightGBM + LSTM/GRU + SHAP, retrained monthly | ⏳ Phase 2 |
| `arrivalEstimate` heuristic | Hydrodynamic routing on DEM (α-parameterised, calibrated per watershed) | ⏳ Phase 2 |

Deployment of that stack for ₹0/month (Cloudflare Pages + Render/Koyeb + Neon/Supabase
Postgres) — with every form field, build command, and env var — is in
**[`docs/DEPLOYMENT.md`](DEPLOYMENT.md)**.

---

*End of design document. Diagrams are ASCII so they render on GitHub, in VS Code, and in
printed submissions without external tools. All figures verified against the code on 2026-10-05.*
