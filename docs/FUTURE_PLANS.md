# JAL-DARPAAN — Future Plans & Capability Roadmap (v1.0)

**PS 26192 · Team BhushaktiAI**
Extends [`docs/DESIGN.md`](DESIGN.md) (architecture) and [`docs/PLAN.md`](PLAN.md) (build plan).
Companion: [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) (hosting).

> This roadmap adds the **full multi-hazard water picture** to the platform: how much water each
> region receives, what it releases, whether mountains themselves are moving, what dams and
> glacial lakes are holding, and what satellite rivers show — all from free/open sources,
> keeping the **₹0/month** constraint.

---

## Table of contents

- [1. The big picture: what we can "see" today vs. plan to see](#1-the-big-picture-what-we-can-see-today-vs-plan-to-see)
- [2. Capability A — Mountain-movement detection (before the rain)](#2-capability-a--mountain-movement-detection-before-the-rain)
- [3. Capability B — Satellite view of rivers & water sources](#3-capability-b--satellite-view-of-rivers--water-sources)
- [4. Capability C — Dams, reservoirs & water released by each region](#4-capability-c--dams-reservoirs--water-released-by-each-region)
- [5. Capability D — Real rainfall input accounting (in → stored → released)](#5-capability-d--real-rainfall-input-accounting-in--stored--released)
- [6. Capability E — Real historical flash-flood event library](#6-capability-e--real-historical-flash-flood-event-library)
- [7. New data sources & what each contributes](#7-new-data-sources--what-each-contributes)
- [8. Extended risk model](#8-extended-risk-model)
- [9. New screens & API surface](#9-new-screens--api-surface)
- [10. Implementation phases](#10-implementation-phases)
- [11. Limits, risks & mitigations](#11-limits-risks--mitigations)
- [12. Master backlog](#12-master-backlog)

---

## 1. The big picture: what we can "see" today vs. plan to see

```
TODAY (demo engine)                     FUTURE (this roadmap)
────────────────────                    ─────────────────────────────────────────────
Rain 1h/24h (simulated)                 Real station + satellite + forecast rainfall
Soil % (simulated)                      SMAP L4 + ESP32 probes
River level (simulated)                 CWC/WRIS gauges + GloFAS discharge + SWOT width
Slope (static DEM number)               ⛰ InSAR: is the slope MOVING? how fast? (NEW)
Danger level (static)                   ⛰ Dams: storage %, release schedules (NEW)
                                        🛰 River/water-body change from Sentinel-1/2 (NEW)
                                        🛰 Glacial-lake area & GLOF watch (NEW)
                                        💧 Region water-balance ledger (NEW)
```

One sentence: **today we model rain hitting a static hill; the roadmap lets us watch the hill
itself, the water stored above it, and the rivers draining it — from space, for free.**

---

## 2. Capability A — Mountain-movement detection (before the rain)

> Your requirement: *"comparing the mountains before rainfall and the present mountains — is
> there any movement in that mountain?"*

This is **InSAR** (Interferometric Synthetic Aperture Radar) — comparing radar images of the same
slope taken at different dates; millimetre-scale ground movement between them is measurable.
It's how slow landslides are detected **before** they fail, and it works through clouds — exactly
when optical satellites fail and monsoon floods strike.

### How it works (pipeline)

```
Sentinel-1 SLC pairs (free, ESA Copernicus)
        │  orbit pairs: e.g. Jan 2026 vs Jun 2026 (12-day repeats)
        ▼
Processor: SNAP (ESA, free) / ISCE2 / LiCSBAS (open-source chains)
        │  produces: per-pixel displacement velocity (mm/yr) + coherence
        ▼
Landslide Movement Index per village polygon:
    LMI = max LOS velocity within 500 m buffer of the village slope
        ▼
Risk input: LMI > 5 mm/yr → slope-stability weight rises; > 15 mm/yr → WATCH landslides
```

### What exists free today

| Source | What it gives | Access | Cost |
|---|---|---|---|
| **Sentinel-1 C-band SAR** | 5×20 m radar scenes, 6–12 day repeat, all-weather | ESA Copernicus Data Space (free account) | ₹0 |
| **EGMS methodology** | Europe's free InSAR service proves the approach at scale (mm/yr precision); no Himalaya equivalent yet — we build our own mini-EGMS for the pilot district | Copernicus Land (documentation/pattern) | ₹0 |
| **Peer-reviewed method** | Sentinel-1 InSAR landslide reconnaissance validated in steep terrain (e.g. Gisborne NZ study) | literature | — |

**Honest limits:** steep Himalayan relief + heavy vegetation causes decorrelation (loss of signal)
in places; snow/ice and fast-moving landslides break the technique. So we treat InSAR as a
**static-to-seasonal hazard layer** (recomputed monthly, not real-time) and confirm active zones
with ESP32 tilt/moisture probes and post-rain optical checks.

### Deliverables

- [ ] `insar-worker` — batch job: download Sentinel-1 pairs → LiCSBAS/SNAP → per-village LMI table
- [ ] New `Village.slopeMotionMmYr` field + UI badge: "⛰ Slope moving 8 mm/yr — monitored"
- [ ] Add movement to the risk engine (§8) as a new weighted feature (0.08, rebalanced)
- [ ] Backtest sanity check: does InSAR flag the Dharali (2025) and Chamoli (2021) source zones?

---

## 3. Capability B — Satellite view of rivers & water sources

> Your requirement: *"the satellite view of rivers and water sources."*

### 3.1 River & flood-extent mapping (Sentinel-1/2 + NDWI)

```
Sentinel-2 optical (10 m, 5-day)  ──► NDWI = (Green − NIR)/(Green + NIR) > 0  ─┐
Sentinel-1 SAR (cloud-penetrating) ──► backstroke threshold water mask        ├─► Water extent
                                                                              ─┘
Compare today's water extent vs. 30-day baseline & last-year same-week
        ▼
RiverSurfaceChange = Δ area of river/water pixels inside village watershed
        ▼
Feeds risk engine as an independent CONFIRMING SOURCE (satellite agrees with gauge?)
```

- Cloud-free optical fails during storms → **SAR is the monsoon workhorse**; optical NDWI is the
  clear-sky cross-check. Together: every 1–5 days.
- Free sources: Copernicus Data Space (Sentinel-1/2), Google Earth Engine for batch NDWI.

### 3.2 SWOT — measuring actual river width & water height from orbit

NASA/CNES **SWOT** (Surface Water Ocean Topography) satellite measures river width, water-surface
elevation and slope for rivers ≥ ~50–100 m wide, data free via CNES/NASA. For the Mandakini's
broad stretches it gives an **independent river-state check** where no gauge exists. Higher in the
valley (narrow channels) SWOT can't see the river — covered instead by 3.1 and gauges.

### 3.3 Glacial lakes — the GLOF watch (Sikkim 2023 killer)

ICIMOD and ISRO maintain glacial-lake inventories; Sentinel-2/NDWI tracks **lake area growth**
month over month. A lake growing rapidly (e.g. >10 % area in a season) or a suddenly shrinking one
(breach!) upstream of a pilot village raises a GLOF flag into the risk engine:

```
GLOF_WATCH = lake_area_change > threshold OR breach-detected → notify downstream villages
             with travel-time estimate (DEM flow routing) + pre-emptive alert
```

### 3.4 Satellite image tiles in the UI (already live today)

The demo already streams **Esri World Imagery** + **AWS terrarium terrain** in the 3-D map — the
roadmap only adds analytical layers on top: river polygon overlay, flood-extent heat, glacial-lake
markers, dam markers (§4).

### Deliverables

- [ ] `water-mask-worker` — Sentinel-1/2 → NDWI/SAR water masks → per-watershed `RiverSurfaceChange`
- [ ] `glof-watch-worker` — monthly glacial-lake area series (ICIMOD/ISRO inventory + NDWI) with breach alerts
- [ ] SWOT river-width series for wide stretches → `VillageLive.swotWidthM`
- [ ] Map overlays: river extent (current vs baseline), glacial lakes, dams, landslide zones

---

## 4. Capability C — Dams, reservoirs & water released by each region

> Your requirement: *"the dams water level and how much water is being released by each area and region."*

### What exists free today (verified)

| Source | Gives | Cadence | Access |
|---|---|---|---|
| **India-WRIS Reservoir module** (indiawris.gov.in) | Water level, live storage, salient features of reservoirs across India, monitored by central & state agencies | daily/weekly | open WebGIS + datasets |
| **CWC Weekly Reservoir Storage Bulletin** | Live storage of ~150–190 major reservoirs, % of live capacity, vs last year | weekly | public bulletin |
| **CWC flood forecasting** | Forecasts at ~350 stations (150 inflow sites at dams/barrages + 200 level sites) | daily/6-hourly in flood season | FloodWatch India app + AFF portal |
| **State dam-authority pages** (e.g. Uttarakhand irrigation, THDC for Tehri) | Project-specific levels and (sometimes) release notices | varies | public/press |

**Uttarakhand pilot relevance:** Tehri dam (one of India's tallest) plus run-of-river barrages on
the Alaknanda/Bhagirathi/Mandakini. Run-of-river projects don't hold big storage but change flow
timing; Tehri holds and can release — both matter downstream, and both are representable.

### Data model additions

```ts
interface DamStatus {
  id: string; name: string;
  lat: number; lng: number;
  river: string;
  fullReservoirLevelM: number;
  currentLevelM: number | null;        // WRIS / CWC bulletin
  liveStorageMcum: number | null;      // million cubic metres
  liveStoragePct: number | null;       // % of live capacity
  inflowCumecs: number | null;         // CWC inflow forecast sites
  outflowCumecs: number | null;        // release = spillway + turbines + gates
  releaseNote?: string;                // "gated release 14:00–16:00" (scraped/manual)
  source: 'WRIS' | 'CWC-BULLETIN' | 'AFF' | 'STATE';
  updatedAt: number;
}
```

### Region water-release ledger

```ts
interface RegionWaterLedger {           // per micro-watershed / district
  regionId: string;
  rainfallInputMcum24h: number;         // rain over region × area → volume (§5)
  reservoirStorageMcum: number;         // upstream live storage (WRIS)
  release24hMcum: number;               // dam/barrage outflow integrated over 24 h
  naturalRunoffMcum24h: number;         // discharge (GloFAS/Open-Meteo) − known releases
  balanceTrend: 'filling' | 'steady' | 'draining';
}
```

**UI:** a "💧 Water Ledger" card per region — *Input (rain) → Stored (reservoirs) → Released
( dam outflow) → Draining downstream*, plus a dam marker layer on the map (icon colour = storage %,
red = high storage + heavy rain upstream = the dangerous combination).

### Deliverables

- [ ] `dam-worker` — ingest WRIS reservoir data + CWC weekly bulletin (scrape/CSV) → `DamStatus[]`
- [ ] CWC AFF inflow/outflow feed for forecast sites → release estimates
- [ ] Region ledger computation + UI card + map layer
- [ ] Alert rule: **storage > 85 % AND upstream rain > 50 mm/24 h AND rising** → advisory to downstream villages

---

## 5. Capability D — Real rainfall input accounting (in → stored → released)

> Your requirement: *"rainfall calculated and how much water is being released by each area and region — how much the input we get."*

### The water-balance chain

```
INPUT   rain depth (mm) over region area (m²)  →  Volume = depth × area × 10⁻³ (m³)
        sources: IMD AWS/ARG · GPM IMERG (satellite, 10 km grid) · Open-Meteo (free API,
                 no key, forecast + ERA5 history back to 1940) · ESP32 nodes
        QA: cross-check gauge vs IMERG per village; flag disagreement > 30 % ("rain sensor
        vs satellite conflict" — itself a data-quality alert)
        ▼
INTERCEPT  soil wetting (SMAP L4 + probes), evapotranspiration (Open-Meteo ET₀),
           glacier/snow contribution in upper watershed (temperature-driven melt model)
        ▼
RUNOFF   Curve-Number / SCS method on DEM micro-watersheds → how much of the input
         becomes streamflow, per region, per hour
        ▼
RELEASE  dam/barrage outflow (§4) + natural streamflow (CWC gauge or GloFAS discharge)
        ▼
LEDGER   RegionWaterLedger (§4) — every number traceable to its source feed
```

### Free discharge data (already API-ready)

**Open-Meteo Flood API** serves **GloFAS river discharge** (forecast + reanalysis back to 1984)
free, no key — giving every ungauged Himalayan stream a physics-based discharge estimate in m³/s.
This becomes the "how much water is the region releasing" number where no dam or gauge exists.

### Deliverables

- [ ] `water-balance-worker` — rain volume per micro-watershed (IMERG + gauges), CN runoff split
- [ ] Open-Meteo Flood API adapter → `VillageLive.dischargeCumecs` + `baselineDischarge`
- [ ] Rain QA cross-check (gauge vs satellite vs reanalysis) with data-quality badges
- [ ] Per-region ledger UI + CSV export (auditable by district authorities)

---

## 6. Capability E — Real historical flash-flood event library

> Your requirement: *"all the real flash floods."*

Backtests today are hand-authored summaries. The plan: a structured, growing **event corpus** the
model replays and learns from.

| Event | What we encode |
|---|---|
| **Kedarnath 2013** (June, ~6,000 deaths) | rainfall regime, Chorabari lake role, arrival times valley-wise, affected village list |
| **Chamoli 2021** (Ronti Gad rock-ice avalanche → flood) | InSAR/terrain precursors (§2!), travel time to each village |
| **Sikkim GLOF 2023** (South Lhonak lake) | lake-area growth signals (§3.3) visible in advance — the case FOR GLOF watch |
| **Dharali 2025** (Uttarkashi flash flood) | recent CWC/IMD archive; nearest modern analogue for the pilot district |
| **Uttarakhand 1880–present inventory** | GSI Bhukosh landslide records + district gazetteers → per-village event history |

Each event = `{village, startTs, rainfall series, river response, damages, alert-would-have-fired-at}`
stored in PostGIS; the AI engine replays them as regression tests, and lead-time metrics become
**measured, not claimed**.

### Deliverables

- [ ] `events/` corpus schema + first 5 events encoded
- [ ] Replay harness: run the live risk engine over each event → lead time, false alarms
- [ ] "Would-have-saved" dashboard: for every historical event, what JAL-DARPAAN would have said

---

## 7. New data sources & what each contributes

| # | Source | Gives | Cadence | Free? | Key needed? |
|---|---|---|---|---|---|
| 1 | ESA **Sentinel-1 SAR** | slope motion (InSAR), cloud-proof water extent | 6–12 d | ✅ | free account |
| 2 | ESA **Sentinel-2** | NDWI water bodies, glacial lakes | ~5 d | ✅ | free account |
| 3 | NASA/CNES **SWOT** | river width & water height | repeat passes | ✅ | open |
| 4 | **India-WRIS** reservoirs | dam level & live storage | daily/weekly | ✅ | no |
| 5 | **CWC weekly bulletin** + AFF (~350 forecast stations) | storage %, inflow/outflow forecasts | weekly/6-hourly | ✅ | no |
| 6 | **Open-Meteo Flood API** (GloFAS) | river discharge for ANY stream, 1984→ | daily | ✅ | **no key** |
| 7 | Open-Meteo Forecast/ERA5 | rainfall + ET₀ + temperature (melt) | hourly | ✅ | **no key** |
| 8 | GPM **IMERG** (via NASA) | satellite rain grids | 30 min | ✅ | free account |
| 9 | **ICIMOD / ISRO glacial-lake inventories** | GLOF baseline | static + NDWI updates | ✅ | no |
| 10 | GSI **Bhukosh** | landslide & event history | static | ✅ | no |

Everything stays **₹0**; no proprietary keys. Full hosting of the workers on the same free tiers
documented in `DEPLOYMENT.md` (Render/Koyeb background workers, Neon Postgres).

---

## 8. Extended risk model

The 5-feature demo model grows to 8 — same transparency, same SHAP-style WHY:

```
score = 100 × ( 0.28·rain₁ₕ + 0.22·soil + 0.14·river + 0.10·slopeMotion
              + 0.09·slope + 0.07·dischargeAnomaly + 0.05·glof/damStress + 0.05·history )
```

New terms:

| Term | Meaning | Source |
|---|---|---|
| `slopeMotion` | normalised InSAR velocity (0 = stable, 1 = >20 mm/yr) | §2 |
| `dischargeAnomaly` | current GloFAS discharge ÷ seasonal baseline (1984→) | §5 |
| `glof/damStress` | upstream glacial-lake flag OR dam high-storage+rain combo | §3.3, §4 |

- 2-source confirmation rule **retained and strengthened**: satellite-derived water extent now
  counts as an independent confirming source alongside gauges and nodes.
- The demo simulator gains matching seeded fields so the UI can be built **before** the real
  workers exist (same contract-first approach that worked for the current build).

---

## 9. New screens & API surface

**New UI (role-gated like today):**

| Screen | Content |
|---|---|
| **Water Ledger** (State/National) | per-region input→stored→released→draining cards, dam table, 7-day volumes |
| **Terrain Watch** (District+) | InSAR movement heat-map on the 3-D map, movement-ranked village list, zone dossiers |
| **GLOF & Dams panel** (Dashboard add-on) | glacial-lake area sparklines, dam storage bars, release notices |
| **Events Explorer** (Analytics add-on) | historical flood library, replay results, "would-have-saved" metrics |

**New API endpoints (extends `PLAN.md §8`):**

```text
GET /dams                  → DamStatus[]            GET /regions/ledger?window=24h
GET /terrain/motion        → per-village LMI series GET /water/discharge?village=…
GET /glaciers/lakes        → lake areas + trends    GET /events  ·  GET /events/{id}/replay
```

---

## 10. Implementation phases

| Phase | Name | Scope | Depends on |
|---|---|---|---|
| **F1** | **Water balance + discharge** (highest value/effort ratio — pure software, keyless APIs) | Open-Meteo Flood/weather adapters, rain-volume + runoff per region, ledger v1, QA cross-checks | FastAPI backend (✅ built — `backend/`, extends it with adapter routes) |
| **F2** | **Dams & reservoirs** | WRIS + CWC bulletin ingestion, `DamStatus`, release ledger, high-storage alert rule, map layer | F1 |
| **F3** | **Satellite water extent + GLOF watch** | Sentinel-1/2 masks, `RiverSurfaceChange` as confirming source, glacial-lake series, GLOF alerting | F1; GEE or Copernicus account |
| **F4** | **InSAR terrain watch** | Sentinel-1 pair processing (LiCSBAS/SNAP) → per-village LMI, UI heat-map, extended model | F3 infra; monthly batch OK |
| **F5** | **Event corpus & replay** | event library, replay harness, "would-have-saved" metrics, model retraining loop | F1–F4 for full fidelity; corpus itself can start immediately |

**Cadence note:** InSAR = monthly batch; water masks = daily; discharge/ledger = 6–24 h;
dams = daily + bulletins; all layered under the existing 15-min live risk loop.

---

## 11. Limits, risks & mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| InSAR decorrelation in steep, vegetated Himalaya | High | treat as seasonal hazard layer; corroborate with probes + optical; use coherence masking |
| Clouds block optical satellites during storms | High | SAR is the monsoon primary; optical is the clear-sky cross-check (this is why §3 uses both) |
| WRIS/CWC portals change or throttle | Medium | adapter pattern with fallbacks (as today); bulletin CSV archive; ledger tolerates stale dam data with `updatedAt` visible |
| Worker compute for InSAR exceeds free tiers | Medium | process only the pilot district (~small); monthly batch; start with publicly published displacement studies where available |
| SWOT cannot see narrow headwater channels | Low | falls back to gauges + GloFAS discharge + water-mask change |
| Ledger numbers disputed ("whose volume is right?") | Medium | every figure carries source + timestamp + confidence; CSV export for audit; disagreements become data-quality alerts, not silent errors |

---

## 12. Master backlog

Ordered build list (each maps to a phase above):

- [ ] **F1.1** Open-Meteo Flood API adapter → `dischargeCumecs` + seasonal baseline
- [ ] **F1.2** Rain-volume per micro-watershed (IMERG × area, gauge-fused, QA-flagged)
- [ ] **F1.3** Curve-Number runoff split on DEM watersheds
- [ ] **F1.4** `RegionWaterLedger` compute + UI card + CSV export
- [ ] **F2.1** WRIS reservoir + CWC bulletin ingestion → `DamStatus[]`
- [ ] **F2.2** Dam map layer + storage bars + release notices
- [ ] **F2.3** High-storage + upstream-rain alert rule (advisory to downstream villages)
- [ ] **F3.1** Sentinel-1/2 water masks → `RiverSurfaceChange` (independent confirming source)
- [ ] **F3.2** Glacial-lake inventory + NDWI series + GLOF breach watch
- [ ] **F3.3** SWOT width/elevation series for wide stretches
- [ ] **F4.1** Sentinel-1 InSAR chain (LiCSBAS/SNAP) → per-village LMI
- [ ] **F4.2** Terrain Watch screen + movement badge + model term (rebalanced weights)
- [ ] **F5.1** Event corpus (Kedarnath 2013, Chamoli 2021, Sikkim 2023, Dharali 2025, +)
- [ ] **F5.2** Replay harness + "would-have-saved" metrics + retraining loop

**Sequencing rationale:** F1 needs no satellite accounts, no new hardware, no keys — it alone
turns the demo's simulated numbers into *real, sourced* water maths. Each later phase adds one
new sensing capability with a visible UI payoff and an honest, documented limit.

---

*Sources verified 2026-10-05: India-WRIS (reservoir module, live telemetry), CWC (weekly
reservoir bulletin; ~350 flood-forecast stations per PIB Dec 2025), FloodWatch India app,
ESA Copernicus (Sentinel-1/2), EGMS (InSAR service pattern & precision literature),
Sentinel-1 InSAR landslide studies (e.g. Gisborne NZ), ICIMOD GLOF EWS material,
glacial-lake NDWI change literature, Open-Meteo Flood API docs (GloFAS v4, 1984→, free no-key),
NASA/CNES SWOT mission page.*
