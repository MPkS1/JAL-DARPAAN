"""SQLAlchemy engine + session factory (SQLite dev / Postgres-ready)."""
from __future__ import annotations

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DB_URL

connect_args = {}
if DB_URL.startswith("sqlite"):
    # FastAPI runs sync endpoints in a threadpool + the engine runs in the
    # event loop, so cross-thread sqlite access is required.
    connect_args["check_same_thread"] = False

engine = create_engine(DB_URL, connect_args=connect_args, future=True)

if DB_URL.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record):  # noqa: ANN001
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=5000")
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — one session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
