# JAL-DARPAAN — AI Future Plans: Existing Solutions, New Discoveries & AI Roadmap (v1.0)

**PS 26192 · Team BhushaktiAI**
Companion to [`docs/FUTURE_PLANS.md`](FUTURE_PLANS.md) (sensing roadmap) and
[`docs/DESIGN.md`](DESIGN.md) (architecture). This document focuses on the **AI layer**:
what the world's best systems do today, what new AI discoveries (2024–2026) we can adopt, and
the exact features + models to build next.

> **One sentence:** Google Flood Hub proves AI can forecast floods even in ungauged basins —
> JAL-DARPAAN's AI roadmap is to *match their model class, then beat them on the one thing they
> don't do: village-level explainable flash-flood warnings for Indian hill villages with
> last-mile community delivery.*

---

## Table of contents

- [1. Existing solutions — the competitive landscape](#1-existing-solutions--the-competitive-landscape)
- [2. New AI discoveries 2024–2026 we can adopt](#2-new-ai-discoveries-20242026-we-can-adopt)
- [3. AI model architecture v2 (the target stack)](#3-ai-model-architecture-v2-the-target-stack)
- [4. New features on top of AI](#4-new-features-on-top-of-ai)
- [5. Data strategy & training corpora](#5-data-strategy--training-corpora)
- [6. Model ops: training, evaluation, retraining](#6-model-ops-training-evaluation-retraining)
- [7. Trust, explainability & alert fatigue](#7-trust-explainability--alert-fatigue)
- [8. What to build next — prioritised](#8-what-to-build-next--prioritised)
- [9. References](#9-references)

---

## 1. Existing solutions — the competitive landscape

Before building more AI, we map every serious player and what JAL-DARPAAN does differently.

| # | Solution | What it does | Strength | Weakness (our opportunity) |
|---|---|---|---|---|
| 1 | **GloFAS** (Copernicus/WMO) | Global flood awareness, ~5–11 km grid | Long lead time (up to 30 d), open | Too coarse for villages; no flash-flood focus |
| 2 | **Google Flood Hub** (2024→) | AI riverine flood forecasts in **80+ countries**, up to **7 days ahead**; 2026: new **flash-flood model** for cities | State-of-the-art LSTM; public API | **No village-level hill flash-flood resolution; no explainable WHY per village; no local-language last mile** |
| 3 | **Google City Flash Flood Model** (2026) | 24-h flash-flood warnings for **cities** | First urban flash-flood AI | **Not built for mountain villages / Himalayan micro-watersheds** |
| 4 | **FFGS** (IMD/CWC, India) | District-level flash-flood guidance | Official source | Rainfall-only, district scale, no village map |
| 5 | **CWC AFF** (~350 stations) | River-level forecasts | Real gauges, real telemetry | Only where gauges exist; no AI nowcasting |
| 6 | **NDMA SACHET / C-DOT CAP** | Cell-broadcast alerts (India-wide tests 2025–26) | Official last mile via telecom | Delivers alerts, **doesn't generate village-level risk** |
| 7 | **ICIMOD CBEWS** (Himalaya) | Cheap upstream→downstream community alarms | Proven last-mile model | Hardware-first, no AI, no dashboard |
| 8 | **Commercial vendors** (Fathom, Jupiter, One Concern…) | Proprietary risk scoring | Polished | Closed, expensive, not village-level for India |

**The gap nobody covers:** *village-level + explainable + Himalayan flash floods + free + open-source
+ integrates with India's official alert pipe (CAP/SACHET).* That's exactly JAL-DARPAAN's position.
Google's own flash-flood model explicitly targets **cities**; FFGS stops at districts; GloFAS is a
~10 km grid. Our edge is resolution + explainability + last mile, not raw compute.

**Best-in-class patterns worth copying (regardless of vendor):**

- Google Flood Hub: **LSTM + hydrological simulation + autoregressive forecasting**, trained on a
  5600-gauge / 68-year reanalysis corpus, calibrated to return periods (1.5-yr, 2-yr, 5-yr).
  Their code & training pipeline are public on `github.com/google-research/flood-forecasting`.
- GloFAS: **probabilistic ensembles** (never a single number), published thresholds per river.
- ICIMOD CBEWS: **community-anchored dissemination** (a caretaker + a siren beats a push notification).
- NDMA SACHET: **CAP XML as the single alert format** reaching every phone via cell broadcast.

---

## 2. New AI discoveries 2024–2026 we can adopt

| Discovery | What changed | How JAL-DARPAAN uses it |
|---|---|---|
| **GenCast / GraphCast / WeatherNext 2–3** (DeepMind, 2024–2026) | AI weather models now **beat ECMWF physics models** on most metrics; ensembles at 0.25°; WeatherNext 3 runs hourly | Use as **AI-generated upstream weather input** instead of/downside to raw NWP; ensemble spread becomes our uncertainty signal; eventually replace Open-Meteo's backbone with an AI-ensemble feed |
| **Time-series foundation models** — **TimesFM 2.5/3.0**, **Chronos-2**, **Moirai 2.0** (2024–2026) | **Zero-shot** multivariate forecasting rivals trained LSTMs; one forward pass, no per-basin training | **Cold-start nowcasting for ungauged villages** — forecast rain/soil/level where we have no training data; fine-tune later as local data accumulates |
| **Google Flood Hub LSTM + calibration** (2024–2025, code public) | Open recipe: LSTM + hydrological simulation + autoregressive rollout + return-period calibration reaches ~5-yr-return-period skill in ungauged basins | Adopt the **exact recipe** for our riverine module; their published paper is our spec |
| **Physics-informed / differentiable hydrology** (2025) | Hybrid models (conceptual hydrology ⊕ deep learning) win in glacierised basins — e.g. hybrid glacio-hydrological + LSTM/wavelet studies in the Upper Indus | Add a **snow/glacier-melt feature** (temperature-driven) so spring/summer GLOF-adjacent risks are modelled, not just monsoon rain |
| **ConvLSTM / spatio-temporal deep learning** (2024–2025 lit.) | ~18 % better than plain LSTM for flash floods; satellite+soil+slope fusion cuts false alarms ~30 % | Justifies our **fusion + 2-source rule**; ConvLSTM is our v2 vision backbone on radar + satellite stacks |
| **AI-TEW two-stage early warning** (2026, Nature npj Digital Medicine) | Two-stage AI frameworks measurably **reduce alert fatigue** | Adopt the two-stage pattern: **stage 1** silent scoring, **stage 2** human-confirm before broadcast — matches our ack/resolve workflow |
| **Explainable-AI trust studies** (2025–2026) | Transparency level directly changes responder trust & speed; SHAP is the standard | Keep SHAP, but add **counterfactual WHY** ("what would make this SAFE?") and per-alert confidence |

**Key insight:** the field has moved from *"can AI predict floods?"* (answered: yes) to
*"can AI be trusted, explained, and trusted at village scale?"* — which is precisely our niche.

---

## 3. AI model architecture v2 (the target stack)

```
                      ┌──────────────────────────────────────┐
                      │      LAYER 1 — WEATHER AI INPUT      │
                      │  Open-Meteo (today) → AI ensembles   │
                      │  (GenCast-class, via API partners)   │
                      └──────────────┬───────────────────────┘
                                     ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │                LAYER 2 — NOWCASTING ENGINE (0–6 h)                   │
   │                                                                     │
   │  A. TimesFM/Chronos zero-shot  → instant ungauged-village forecast   │
   │  B. Per-basin LSTM (Flood-Hub recipe) → fine-tuned where data exists │
   │  C. ConvLSTM vision module → radar+satellite stack → 1-h burst maps  │
   │  D. Snow/glacier melt feature (physics) → spring/summer risk         │
   │                                                                     │
   │  Ensemble A+B+C → median + spread → uncertainty per village          │
   └──────────────┬──────────────────────────────────────────────────────┘
                  ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │            LAYER 3 — RISK CLASSIFIER (village level)                 │
   │   LightGBM + isotonic calibration → P(flood) in next 1/3/6/12 h      │
   │   → threshold by return period (1.5y, 2y, 5y) → SAFE/WATCH/WARN/CRIT │
   │   → SHAP values → WHY box  (kept, not replaced — it's our moat)      │
   └──────────────┬──────────────────────────────────────────────────────┘
                  ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │         LAYER 4 — ALERT DECISION AI (anti-fatigue)                   │
   │   - Two-stage: model score → (if ≥ WARN) LLM drafts alert text       │
   │     → human (District EO+) confirms → CAP XML → SACHET cell broadcast│
   │   - Model-learned cooldowns per village, not fixed 90 s              │
   │   - Counterfactual WHY: "what would downgrade this alert?"           │
   └──────────────┬──────────────────────────────────────────────────────┘
                  ▼
   ┌─────────────────────────────────────────────────────────────────────┐
   │    LAYER 5 — LAST-MILE DISSEMINATION (AI-personalised)               │
   │    - CAP + SACHET (official India pipe)                              │
   │    - WhatsApp/Telegram bots (AI Q&A in Hindi/Garhwali)               │
   │    - Voice-call AI agent for illiterate/elderly users                │
   │    - Siren/LED trigger via ESP32 mesh (CBEWS pattern)                │
   └─────────────────────────────────────────────────────────────────────┘
```

### 3.1 Model candidates compared (what to pick per layer)

| Layer | Candidate | Pros | Cons | Verdict |
|---|---|---|---|---|
| 2 | **TimesFM 2.5/3.0** (Google) | zero-shot, multivariate, tiny compute | generic (not hydrology-specific) | ✅ **primary cold-start** |
| 2 | **Chronos-2** (Amazon) | strong zero-shot, probabilistic | heavier | ✅ ensemble member |
| 2 | Flood-Hub-style **LSTM** | hydrology-proven, explainable via SHAP | needs training data | ✅ fine-tune target |
| 2 | **ConvLSTM** on radar/satellite stacks | +18 % over LSTM for flash floods | needs GPU | ✅ when satellite data is wired |
| 3 | **LightGBM** + calibration | fast, best speed/accuracy for tabular risk, SHAP-native | tabular only | ✅ keep (already the plan) |
| 3 | TabPFN v2 | strong zero-shot tabular | small-data regime only | 🟡 fallback |
| 4 | LLM alert drafter (e.g. small open LLM) | plain-language Hindi/Garhwali text, Q&A | hallucination risk | ✅ with human-in-the-loop |
| 5 | Voice AI agent (TTS + ASR) | reaches non-literate users | telecom cost | 🟡 after pilot |

**Decision rule:** everything must run on the free-tier hosting from `DEPLOYMENT.md` — CPU-only
inference (LightGBM, TimesFM, small LSTM) or free GPU credits (Kaggle/Colab for training; never
on the serving path). No paid inference APIs in the critical loop.

---

## 4. New features on top of AI

### 4.1 Probabilistic alerts (ensemble, not single number)
Every alert becomes `P(flood in 1/3/6/12 h) = 78 % ± 12 %` with a **cone chart** — matching how
GenCast/GloFAS present uncertainty. Replaces the hard band with calibrated probability + band.

### 4.2 Counterfactual WHY (new explainability)
Current: *"Soil 92 % + 45 mm/h → HIGH."*
Added: *"Warning: soil at 92 % is the dominant driver. If rain drops below 20 mm/h for 2 h, this
becomes WATCH."* — built by perturbing SHAP contributions; huge for official trust (2025–26
research: transparency changes response speed).

### 4.3 AI alert drafter with human-in-the-loop
When score ≥ WARNING, an open LLM (small, self-hosted) drafts the alert in
**Hindi + Garhwali + English**, with village name, arrival time, shelter, route, helpline.
The District EO **edits/confirms** (two-stage AI-TEW pattern) before CAP/SACHET broadcast.
Protects against hallucination, builds officer trust, scales to any language.

### 4.4 Community AI hotlines & bots
- **WhatsApp/Telegram bot** per district: villagers ask "Kya aaj Kedarnath road safe hai?" →
  grounded answer from live risk + NOWCAST + route data (RAG over our own API).
- **Voice-call AI agent**: dials registered elderly/illiterate villagers, speaks the alert in
  local dialect, asks for acknowledgement by voice. (Pilot after dashboard.)

### 4.5 Citizen sensor network (human-in-the-loop AI)
- Villagers SMS/WhatsApp *"river badh rahi hai"* → AI classifies & geo-locates →
  becomes a **confirmation source** for the 2-source rule (already a UI pattern today).
- False-report penalty via cross-check against gauges/IMERG (keeps data honest).

### 4.6 Auto-generated drill & training mode
AI generates village-specific hypotheticals ("what if 80 mm/h falls for 3 h upstream?") and
runs them through the full pipeline — used for **officer training** and **model stress tests**.
Reuses the existing Scenario drill UI, now AI-parametrised.

### 4.7 Digital-twin replay (post-event forensics)
After any real event, ingest actual rainfall/level history → replay what JAL-DARPAAN **would have
said**, minute by minute → produce a public PDF report of lead time achieved. Turns every disaster
into a published validation (also great for SIH demo credibility).

### 4.8 Satellite vision module (v2 map layer)
ConvLSTM on stacked Sentinel-1/2 tiles → pixel-level water-extent forecast 1–2 h ahead, rendered
as a **new map layer** over the existing MapLibre view (complements `FUTURE_PLANS.md` §3).

---

## 5. Data strategy & training corpora

| Corpus | Purpose | Status |
|---|---|---|
| **Google Flood Forecasting dataset** (public, 5600 gauges, 68 yr reanalysis) | pre-train the LSTM exactly as Flood Hub did | ✅ free download |
| **CWC/WRIS India telemetry** (338+ gauges) | fine-tune to Indian rivers | ✅ open |
| **IMD gridded rainfall** (0.25°, 1901→) | rainfall input + labels | ✅ open |
| **GPM IMERG + SMAP + Sentinel** | satellite features (fusion cuts false alarms ~30 %) | ✅ open |
| **Event corpus** (Kedarnath 2013, Chamoli 2021, Sikkim 2023, Dharali 2025…) | test set + backtests | 🔨 build (F5) |
| **ESP32 village telemetry** (pilot district) | local fine-tune + SHAP trust evidence | 🔨 growing |
| **Citizen reports + officer ack/resolve actions** | RLHF-style label quality; auto-retrain | 🔨 growing |

**Labels:** the hard truth is that "flood/no-flood" at village level is scarce. Strategy:
(1) return-period calibration from long reanalysis (Flood Hub method), (2) damage records from
Bhukosh/SDMA as positive labels, (3) officer ack/resolve outcomes as weak labels.

---

## 6. Model ops: training, evaluation, retraining

- **Training:** Kaggle/Colab free GPUs → model artefacts versioned in Git LFS / HF Hub.
- **Serving:** CPU-only inference on Render/Koyeb free tier (LightGBM + TimesFM-2.5 +
  small LSTM all fit in 512 MB with ONNX/quantised variants).
- **Evaluation (always-on):**
  - AUC / Brier score / reliability diagram (calibration) on held-out events.
  - **Lead-time-at-precision-90 %** as the north-star metric (judges care: "did we warn in time
    with few false alarms?").
  - Per-village report card: precision/recall of past alerts vs officer resolutions.
- **Retraining:** monthly scheduled GitHub Action (free minutes) → evaluation gate → canary deploy.
- **Drift watch:** population stability index on features; auto-alert if input distributions shift.

---

## 7. Trust, explainability & alert fatigue

Research consensus 2025–26: transparency changes responder behaviour; two-stage AI reduces fatigue;
probabilistic messaging improves vigilance. JAL-DARPAAN's concrete commitments:

1. **Never auto-broadcast CRITICAL without human confirm** (two-stage; AI-TEW pattern).
2. **Every alert carries**: probability, band, SHAP top-3, counterfactual, arrival ETA, confidence.
3. **Per-village cooldown learned from outcomes**, not a fixed 90 s.
4. **Public model card**: what the model is, isn't, its limits (decorrelation, snow, ungauged).
5. **Officer override is always visible** in the audit log — no silent AI overrides.

---

## 8. What to build next — prioritised

> **Status note (Oct 2026):** the FastAPI backend that hosts this API is now **built**
> (`backend/` — JWT + RBAC, risk/simulation engines, alert lifecycle, ESP32 ingest,
> `WS /ws/live`). Every AI item below therefore lands on a real, permission-checked API
> rather than the in-browser demo store.

| # | Item | Phase | Effort | Impact | Why now |
|---|---|---|---|---|---|
| 1 | **TimesFM/Chronos zero-shot nowcasting** on real Open-Meteo/IMERG data | AI-1 | S | ⭐⭐⭐⭐ | keyless, CPU-only, instant credibility with judges ("AI predicts next 6 h") |
| 2 | **Probabilistic alerts + cone chart UI** | AI-1 | S | ⭐⭐⭐⭐ | matches GloFAS/GenCast best practice; small UI change |
| 3 | **Counterfactual WHY** in the existing SHAP box | AI-1 | S | ⭐⭐⭐ | differentiator; pure UI + risk-engine change |
| 4 | **Event replay harness** (Kedarnath/Chamoli/Sikkim) | AI-2 | M | ⭐⭐⭐⭐ | the "would-have-saved" proof; builds on FUTURE_PLANS F5 |
| 5 | **LSTM fine-tune (Flood Hub recipe)** on India-WRIS + IMD gridded | AI-2 | M | ⭐⭐⭐⭐ | once #4 exists to validate it |
| 6 | **AI alert drafter + two-stage confirm** | AI-2 | M | ⭐⭐⭐ | LLM integration; needs officer workflow ready |
| 7 | **ConvLSTM water-extent forecast layer** | AI-3 | L | ⭐⭐⭐ | needs Sentinel pipeline from FUTURE_PLANS F3 |
| 8 | **WhatsApp/Voice bot + citizen reports** | AI-3 | L | ⭐⭐⭐⭐ | last-mile; needs district MoU / pilot |
| 9 | **Digital-twin post-event forensics** | AI-4 | M | ⭐⭐ | after a real pilot season |
| 10 | **GenCast-class ensemble weather input** | AI-4 | M | ⭐⭐⭐ | when AI weather APIs become accessible/keyless |

**Sequencing rule:** every AI feature must (a) run on free-tier compute, (b) output explainable,
probabilistic results, (c) integrate the human-confirm workflow, (d) strengthen — never bypass —
the 2-source confirmation rule.

---

## 9. References (verified 2026-10-05)

1. Google Flood Hub — `sites.research.google/gr/floodforecasting` (80+ countries, 7-day riverine, 2026 flash-flood model for cities)
2. Google Research flood-forecasting repo — `github.com/google-research/flood-forecasting` (LSTM + hydrological simulation recipe, public)
3. Flood Forecasting API — `developers.google.com/flood-forecasting` (public API, Jan 2026)
4. GenCast (DeepMind, Dec 2024) — probabilistic ensemble beats ECMWF ENS on most metrics
5. WeatherNext 2 / 3 (Google DeepMind, Nov 2025→) — GNN weather models; hourly cycle (WN3)
6. TimesFM 3.0 (Google Research, 2026) — zero-shot multivariate time-series foundation model
7. Chronos-2 / Moirai 2.0 (Amazon/Salesforce, 2025–2026) — zero-shot time-series foundation models
8. AI-TEW two-stage early warning (npj Digital Medicine, 2026) — alert-fatigue reduction framework
9. Transparency in AI for emergency management (2025) — trust & accountability study
10. ConvLSTM ~18 % over LSTM for flash floods (Frontiers in Water 2024, as cited in `sih` submission)
11. Multi-source fusion cuts false alarms ~30 % (flood-forecasting literature, cited in `sih`)
12. Hybrid glacio-hydrological + DL streamflow forecasting, Upper Indus Basin (2025–2026)
13. NDMA SACHET / C-DOT CAP cell-broadcast system (pan-India tests 2025–26, PIB Apr 2026)
14. ICIMOD Community-Based Flood Early Warning System (CBEWS) — Himalayan last-mile pattern
15. WMO Bulletin Vol 74(2) 2025 — CAP + cell broadcast for Early Warnings for All

---

*This document is the AI layer of the roadmap; the sensing layer (InSAR, dams, water ledger) is
in [`docs/FUTURE_PLANS.md`](FUTURE_PLANS.md). Both share the same constraint: **₹0/month, free
and open data, explainable by default, human-confirmed before broadcast.***
