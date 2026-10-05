# JAL-DARPAAN — 5-Minute Demo Script (for judges)

**Setup:** `npm run dev` → open `http://localhost:5173`. Default scenario already **Monsoon surge**.
> **Optional backend flex (30 s):** `pip install -r backend/requirements.txt && cd backend && python -m uvicorn app.main:app` → open `http://127.0.0.1:8000/docs` — "the same RBAC matrix, alert engine and ESP32 contract run server-side too; the UI swaps to this API with zero rewrites."

1. **Login (30 s).** Point out role chips → click **National Command** → e-mail & password auto-fill → Sign In. "Five roles — National NDRF HQ down to Village Pradhan — same platform, privileges scale with authority — and the identical matrix is enforced server-side in the FastAPI backend."
2. **Command Center (90 s).** KPI strip (24 villages, live alerts, sensors, peak rain). Map: "every village is a live risk marker — the chip shows current rainfall, colour = fused risk." Toggle **3D** — real satellite imagery + real terrain elevation of the Mandakini valley. Click **Kedarnath** → drill panel: climate now, soil, river level, **WHY box** (SHAP-style contributions) and flood-arrival countdown.
3. **Charts (30 s).** 24 h rainfall + dashed 6 h AI nowcast; soil saturation of top-risk villages; Mandakini level vs red danger line at Chandrapuri gauge.
4. **The drill (90 s).** Press **⛈ Cloudburst (Kedarnath-style)**. Watch upper-watershed villages climb orange → red, alerts fire in the feed with **"Confirmed by 2 sources"** badges (our false-alarm defence), arrival countdowns tick. Open an alert → WHY in plain language → **Acknowledge**. Mention cooldowns + confirmation rule end alarm fatigue.
5. **Sensor Network (30 s).** 14 ESP32 nodes (₹1,500/node, only at audited gap villages) — battery, signal, two seeded failure cases (offline node, low battery). **MQTT inspector** streams the exact production JSON payload — "real nodes plug in with zero code change."
6. **AI & Analytics (30 s).** AUC 0.87, ROC, SHAP feature importance, backtests: Kedarnath 2013 / Chamoli 2021 / Sikkim 2023 with achieved lead times.
7. **Close (30 s).** Data Sources page — 11 fused free feeds with automatic fallbacks (IMD portal restrictions don't break us). "Government already spent crores on these stations — we make them save lives."

**Talking-point backup:** Village-role login shows restricted, plain-language view. District login can *issue* evacuation advisories but cannot close them (only State/National can). User Management (National only) shows the full permission matrix.
