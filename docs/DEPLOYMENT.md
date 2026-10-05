# JAL-DARPAAN — GitHub & Free Hosting Playbook

**PS 26192 · Team BhushaktiAI**
Companion to [`docs/DESIGN.md`](DESIGN.md). Everything here was verified against the live
2026 documentation of each platform (Cloudflare Pages, Render, Koyeb, Railway, Vercel) —
field names are the ones you will actually see in each dashboard.

> **TL;DR — the recommended (best) setup:**
> **Frontend → Cloudflare Pages** · **Backend → Render (free Web Service)** ·
> **Database → Neon PostgreSQL (free)** · **CI → GitHub Actions**. Total cost: **₹0/month**.

---

## Table of contents

- [Part 0 — Recommended stack & why (comparison)](#part-0--recommended-stack--why-comparison)
- [Part 1 — Push this code to GitHub](#part-1--push-this-code-to-github)
- [Part 2 — Deploy the frontend to Cloudflare Pages (every required field)](#part-2--deploy-the-frontend-to-cloudflare-pages-every-required-field)
- [Part 3 — Deploy the backend to Render (every required field)](#part-3--deploy-the-backend-to-render-every-required-field)
- [Part 4 — Free databases (Neon / Supabase / Aiven)](#part-4--free-databases-neon--supabase--aiven)
- [Part 5 — The ESP32/MQTT piece (MQTT over WSS)](#part-5--the-esp32mqtt-piece-mqtt-over-wss)
- [Part 6 — CI/CD with GitHub Actions](#part-6--cicd-with-github-actions)
- [Part 7 — Free-tier limits, gotchas & troubleshooting](#part-7--free-tier-limits-gotchas--troubleshooting)
- [Part 8 — Judge-ready checklist](#part-8--judge-ready-checklist)

---

## Part 0 — Recommended stack & why (comparison)

### Frontend (this repo is a static Vite build → `dist/`)

| Platform | Free tier (2026) | Custom domain | SPA routing | Credit card? | Verdict |
|---|---|---|---|---|---|
| **Cloudflare Pages** | Unlimited bandwidth & requests, unlimited sites, 500 builds/mo | ✅ free, auto-TLS | ✅ auto (no 404.html needed — no top-level 404.html ⇒ SPA fallback) | ❌ no | ⭐ best |
| Vercel | 100 GB bandwidth, 1000 build minutes | ✅ | ✅ auto | ❌ no | excellent, slightly lower limits |
| Netlify | 100 GB bandwidth, 300 build min | ✅ | needs `_redirects` | ❌ no | good |
| GitHub Pages | 1 GB site, 100 GB/mo soft | ✅ (APNX verification) | needs 404.html trick + base path | ❌ no | workable, more hacks |

**Why Cloudflare Pages wins for JAL-DARPAAN:** unlimited bandwidth (the 3-D satellite map is
tile-heavy), automatic SPA fallback (`/villages/VN-2201` deep links work with **no** `_redirects`
file, because Pages switches to SPA mode when no top-level `404.html` exists), the fastest edge
network in India (PoPs in Mumbai/Delhi/Chennai), and zero cost forever — no "hobby" time-bombs.

### Backend (FastAPI — built in `backend/`, per DESIGN.md §8)

| Platform | Free tier (2026, per docs) | Sleeps? | Credit card? | Verdict |
|---|---|---|---|---|
| **Render** | 750 free instance-hours/month, 512 MB RAM, free Postgres (1 GB, expires 30 days) | sleeps after 15 min idle; ~60 s cold start | ❌ **no card needed** | ⭐ best |
| Koyeb | 1 free web service, 0.1 vCPU / 512 MB | sleeps | ❌ → now needs **$29 pre-auth hold** (Feb 2026 policy) | runner-up if you have a card |
| Railway | $5 one-time + $1/month credit | no sleep | ❌ no | credits run out in weeks |
| Google Cloud Run | 2 M requests/mo, scale-to-zero | no | ✅ **card required** | cheapest at scale, needs GCP |
| Vercel/Netlify Functions | 10 s timeout serverless | — | ❌ no | ✗ cannot run WebSockets/MQTT workers |

**Why Render wins for the demo/judge scenario:** no credit card at all, exact FastAPI recipe in
their official docs (`pip install -r requirements.txt` + `uvicorn main:app --host 0.0.0.0 --port $PORT`),
750 h/mo = one service runs all month, and the 60 s cold-start after 15 min idle is irrelevant —
judges hit the site, it spins up, and the demo UI keeps it warm by design. Koyeb is the only
serious alternative and it now demands a $29 card pre-authorisation (Feb 2026 policy change), so
Render is the default.

---

## Part 1 — Push this code to GitHub

### 1.1 One-time setup

```bash
# 1. Confirm identity (repo-local, no global changes)
git config user.name  "Your Name"
git config user.email "you@example.com"

# 2. Check .gitignore already excludes build artefacts
cat .gitignore
#   node_modules/  dist/  .vite/  *.log  .DS_Store   ← already present in this repo
```

### 1.2 Create the repo and push (copy-paste, 6 commands)

1. Go to <https://github.com/new> and create an **empty** repository (no README/license —
   the repo already has one): name it `jal-darpaan`, visibility **Private** (recommended for
   SIH until you present; you can flip to Public later for judges).

2. Then run from the project root:

```bash
git init                                  # if not already a git repo
git add .                                 # stages everything except .gitignore'd paths
git commit -m "JAL-DARPAAN v1.0 — village-level flash flood early warning (SIH 2026 PS 26192)"
git branch -M main
git remote add origin https://github.com/<USERNAME>/jal-darpaan.git
git push -u origin main
```

3. Verify: refresh the GitHub page — you should see `src/`, `docs/`, `index.html`,
   `package.json` — and **not** `node_modules/` or `dist/`.

> **First push on a new machine?** GitHub no longer accepts account passwords for git.
> Use **Personal Access Token** (Settings → Developer settings → Personal access tokens →
> generate **classic** token with `repo` scope; paste it as the password) or set up the
> **GitHub CLI** (`gh auth login`) / **SSH keys** once and forget passwords forever.

### 1.3 Recommended repo hygiene

- Add a short description + topics: `sih-2026`, `disaster-management`, `flash-flood`,
  `react`, `typescript`, `maplibre`.
- Protect `main` (Settings → Branches → "Require a pull request before merging") once you
  have teammates pushing.
- The repo ships `docs/DESIGN.md`, `docs/PLAN.md`, `docs/DEMO_SCRIPT.md` — judges can audit
  the architecture without running anything.

---

## Part 2 — Deploy the frontend to Cloudflare Pages (every required field)

The current repo is a **pure static SPA** — this alone makes the whole project live on the
internet in ~5 minutes, ₹0 forever.

### 2.1 Field-by-field form values

**Path:** <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Pages** tab →
**Connect to Git** → pick GitHub → authorise → select the `jal-darpaan` repo →
**Begin setup**. Then fill:

| Field on the Cloudflare form | Value to enter | Notes |
|---|---|---|
| **Project name** | `jal-darpaan` | becomes `jal-darpaan.pages.dev` |
| **Production branch** | `main` | deploys on every push to main |
| **Framework preset** | `React (Vite)` (or None) | just pre-fills the next two fields |
| **Build command** | `npm run build` | this runs `tsc --noEmit && vite build` — a type error fails the deploy, which is what you want |
| **Build output directory** | `/dist` | Vite's output; per CF docs the React(Vite) preset is `dist` |
| **Root directory** | *(leave blank)* | repo root is the project root |
| **Environment variables** | *(none needed)* | this app has no build-time secrets |

Click **Save and Deploy**. First build ≈ 1–2 min. Live URL:
**`https://jal-darpaan.pages.dev`** 🎉

### 2.2 SPA routing — the one gotcha

Your routes are `/villages/VN-2201`, `/alerts`, `/admin`… On some hosts a hard refresh of a
deep link 404s. **On Cloudflare Pages you don't need to do anything**: per the Pages docs,
*"if your project does not include a top-level `404.html` file, Pages assumes you are deploying
a single-page application"* and matches all paths to `/`. This repo has no `404.html`, so
deep links just work.

*(If you ever move to Netlify/GitHub Pages instead: create `public/_redirects` with
`/* /index.html 200` for Netlify, or copy `dist/index.html` to `dist/404.html` before deploy
for GH Pages. Not needed on Cloudflare.)*

### 2.3 Custom domain (free)

Dashboard → your Pages project → **Custom domains** → **Set up a custom domain** → enter
e.g. `jaldarpaan.in` (buy ~₹500/yr anywhere, or get one free via the GitHub Student Pack) →
Cloudflare auto-provisions the DNS + free TLS certificate. Optional.

### 2.4 Updating the site

Just `git push`. Cloudflare rebuilds and redeploys automatically; rollbacks are one click
(Deployments → latest → **Manage deployment → Rollback to this deployment**).

---

## Part 3 — Deploy the backend to Render (every required field)

The FastAPI backend from `DESIGN.md §8` **now exists** in `backend/` — host it free on Render.
Verified field values from Render's official *Deploy a FastAPI App* guide:

### 3.1 Required files in the repo (✅ already present in `backend/`)

```
backend/
├── requirements.txt     # fastapi, uvicorn[standard], SQLAlchemy, PyJWT
├── README.md            # setup + endpoint reference
└── app/
    ├── main.py          # FastAPI app (app = FastAPI(), lifespan seeds DB + starts tick loop)
    └── …                # auth, engine, simulation, risk, rng, seed, models, database, config
```

`requirements.txt` (as shipped):

```text
fastapi>=0.115
uvicorn[standard]>=0.32
SQLAlchemy>=2.0
PyJWT>=2.9
```

> The dev DB is SQLite (zero setup). For a managed free Postgres, create a Neon database and set
> `JD_DB_URL=postgresql+psycopg://…` in Render's environment (add `psycopg[binary]` to
> requirements). The seed runs automatically on startup, so the free instance boots with all
> 24 villages, users and demo alerts already loaded.

### 3.2 Field-by-field form values

**Path:** <https://dashboard.render.com> → **New +** → **Web Service** → connect your GitHub
repo (grant access; if it's private, tick the repo in the install window) → configure:

| Field on the Render form | Value to enter | Notes |
|---|---|---|
| **Repository / Branch** | `jal-darpaan` / `main` | auto-deploy on push (default on) |
| **Language / Runtime** | `Python 3` | Render detects from requirements.txt |
| **Root Directory** | `backend` | since the backend lives in a subfolder |
| **Runtime** | `Python` (not Docker) | simplest; Docker also works if you add a Dockerfile |
| **Build Command** | `pip install -r requirements.txt` | exact command from Render's FastAPI doc |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | module path is `app.main:app` because the code lives in `backend/app/`; `$PORT` is injected by Render |
| **Instance Type** | `Free` | 512 MB RAM, 0.1 CPU |
| **Region** | `Singapore` | lowest India latency of the free regions |
| **Health Check Path** | `/health` | add `@app.get("/health") → {"ok": true}` in main.py — keeps deploys verifiable |
| **Environment Variables** | see §3.3 | add in the dashboard, not in code |

### 3.3 Required environment variables (Render dashboard → Environment)

The backend reads `JD_*` variables (see `backend/app/config.py`):

| Key | Example / how to get it | Required? |
|---|---|---|
| `JD_DB_URL` | From **Neon** (free, no expiry): `postgresql+psycopg://user:pass@host/db?sslmode=require` — add `psycopg[binary]` to requirements | optional — defaults to SQLite |
| `JD_SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` | ✅ for auth (change from dev default) |
| `JD_TOKEN_EXPIRE_MINUTES` | `720` | recommended |
| `JD_CORS_ORIGINS` | `https://jal-darpaan.pages.dev` | ✅ lock to your Pages URL |
| `REDIS_URL` | From Upstash (free): `rediss://default:xxx@host:6379` | ⏳ Phase 2 (cache/PostGIS wiring) |

⚠️ **Never commit real secrets** — `.gitignore` should get `*.env`. Values set in the
dashboard are injected at runtime; locally use a `.env` file that is **not** pushed.

### 3.4 Verify the deploy

1. Render dashboard → your service → **Events** tab → watch the build log → "Live".
2. Open `https://jal-darpaan-backend.onrender.com/docs` — the FastAPI Swagger UI must render.
3. `curl https://jal-darpaan-backend.onrender.com/health` → `{"ok":true,"service":"jaldarpaan-api","tick":…}` — the tick value increments every 4 s (server-side simulation engine running).

### 3.5 Cold starts — the one limitation, and the fix

Free web services **sleep after 15 min without inbound traffic** and take ~1 min to wake.
For a SIH demo this is fine (open the URL before the judges arrive — the load spinner is
actually a talking point about scale-to-zero economics). To keep it awake during demo day,
ping `/health` every 10 min with any uptime pinger (e.g. cron-job.org, free) — or just
present the frontend, which keeps the backend warm via its polling.

---

## Part 4 — Free databases (Neon / Supabase / Aiven)

| Provider | Free tier (2026) | PostGIS? | Card? | Notes |
|---|---|---|---|---|
| **Neon** | 0.5 GB storage, ~190 compute hrs/mo, scale-to-zero | ✅ (enable extension) | ❌ no | ⭐ best fit — serverless Postgres, generous always-free |
| **Supabase** | 500 MB DB, 2 projects, pauses after 1 week inactivity | ✅ | ❌ no | bundles auth + storage + realtime you may not need |
| **Render Postgres** | 1 GB | ✅ | ❌ no | ⚠️ **expires 30 days after creation** on free plan — use for a hackathon weekend only |
| Aiven | 1 DB, 1 vCPU/1 GB | ✅ | ❌ no | solid alternative |

**Recommendation:** **Neon**. Steps: sign up with GitHub → **Create project** → region
`Singapore` → copy the **pooled connection string** → paste into Render's `DATABASE_URL` →
run `CREATE EXTENSION IF NOT EXISTS postgis;` once in the SQL editor. Free, no card, no
expiry (unlike Render's 30-day Postgres).

---

## Part 5 — The ESP32/MQTT piece (MQTT over WSS)

The demo's MQTT inspector shows the payload format; a real deployment adds a public broker:

1. ESP32 sketch publishes to topic `jaldarpaan/telemetry/{village_code}` over WSS (port 8084)
   — brokers: **EMQX Cloud Serverless** (free 1M session-minutes/mo) or HiveMQ Cloud (free
   100 connections). Both give a `wss://…` URL, no card.
2. Backend worker subscribes; each message is exactly the JSON in `DESIGN.md §5.3`.
3. Render free tier **cannot** accept raw TCP MQTT, but WSS works because it rides HTTPS.

This is optional for the SIH demo — the simulator already emits the identical contract.

---

## Part 6 — CI/CD with GitHub Actions

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build     # tsc --noEmit + vite build — type errors fail the pipeline
```

Both Cloudflare Pages and Render already auto-deploy on push; this workflow additionally
gates pull requests with a green/red checkmark — free on public repos (2,000 min/month on
private free plans).

---

## Part 7 — Free-tier limits, gotchas & troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Deep link 404s after refresh | host is serving static files without SPA fallback | Cloudflare: nothing (auto). Netlify: `_redirects` `/* /index.html 200`. GH Pages: `404.html` copy of index |
| Blank page on pages.dev | wrong build output dir | must be `/dist` (Vite default), not `/build` |
| Build fails on Cloudflare but passes locally | Node version mismatch | Cloudflare uses current LTS; locally match with `nvm use 20` |
| `tsc` error fails Cloudflare deploy | `npm run build` includes `tsc --noEmit` | intended — fix the type error, don't remove the check |
| Backend asleep, 503 during demo | Render free spins down after 15 min | open the URL 1 min before demo, or keep frontend polling |
| Render backend dead after a month | free Postgres expires in 30 days | use **Neon** for the DB instead (no expiry) |
| `git push` asks for password | PAT auth required | use a Personal Access Token or `gh auth login` |
| Push rejected `non-fast-forward` | remote has commits you don't | `git pull --rebase origin main` then push |
| Map tiles blank offline | tiles stream from Esri/AWS | present with internet; tiles are keyless so this is only a connectivity issue |
| `npm run build` locally | — | verify before every push: `npm run build` must exit 0 |

**Cost summary: Cloudflare Pages ₹0 + Render ₹0 + Neon ₹0 + GitHub ₹0 = ₹0/month.**

---

## Part 8 — Judge-ready checklist

- [ ] Code pushed to GitHub (private or public), README renders, docs visible
- [ ] Frontend live on `https://jal-darpaan.pages.dev` — open it, hard-refresh `/alerts`
      (deep-link test), toggle 3-D map
- [ ] All 5 role logins tested on the live URL
- [ ] Scenario drill (Cloudburst) runs; alerts fire with 2-source badge + WHY
- [ ] (Optional) backend `/docs` Swagger URL shown in the README
- [ ] `npm run build` exits 0 locally right before the presentation
- [ ] QR code to the live URL on the final slide

---

*Sources verified 2026-10-05: Cloudflare Pages docs (Build configuration; Serving Pages —
SPA behaviour), Render docs (Deploy for Free; Deploy a FastAPI App), Koyeb/Railway/Cloud Run
free-tier policies as published, plus the 2026 free-backend-hosting comparisons.*
