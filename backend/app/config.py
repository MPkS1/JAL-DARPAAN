"""Central configuration — env-overridable, dev-safe defaults.

All knobs map to the demo constants in src/store/live.tsx (TICK_MS, SHIFT_EVERY,
ALERT_COOLDOWN_MS) so backend behaviour mirrors the documented tick loop.
"""
from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

# --- Security ----------------------------------------------------------------
SECRET_KEY = os.environ.get("JD_SECRET_KEY", "dev-secret-change-me-in-production")
TOKEN_EXPIRE_MINUTES = int(os.environ.get("JD_TOKEN_EXPIRE_MINUTES", "720"))
PBKDF2_ITERATIONS = int(os.environ.get("JD_PBKDF2_ITERATIONS", "120_000"))

# --- Database ----------------------------------------------------------------
# SQLite by default (zero-setup dev). For deployment swap to Neon Postgres:
#   JD_DB_URL=postgresql+psycopg://user:pass@host/db   (+ pip install psycopg[binary])
DB_URL = os.environ.get("JD_DB_URL", f"sqlite:///{BACKEND_DIR / 'jaldarpaan.db'}")

# --- Simulation / alert engine (mirrors src/store/live.tsx) -------------------
TICK_SECONDS = float(os.environ.get("JD_TICK_SECONDS", "4.0"))   # TICK_MS = 4000
SHIFT_EVERY = int(os.environ.get("JD_SHIFT_EVERY", "15"))        # ticks per simulated hour
ALERT_COOLDOWN_S = float(os.environ.get("JD_ALERT_COOLDOWN_S", "90"))  # per-village cooldown
ALERT_HISTORY_CAP = int(os.environ.get("JD_ALERT_HISTORY_CAP", "60"))  # alerts kept in feed

# --- HTTP ---------------------------------------------------------------------
CORS_ORIGINS = [o.strip() for o in os.environ.get("JD_CORS_ORIGINS", "*").split(",") if o.strip()]
HOST = os.environ.get("JD_HOST", "127.0.0.1")
PORT = int(os.environ.get("JD_PORT", "8000"))
