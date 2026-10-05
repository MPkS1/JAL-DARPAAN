"""ORM models — villages, users, alerts, hourly telemetry, MQTT packets."""
from __future__ import annotations

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class VillageRow(Base):
    __tablename__ = "villages"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    district: Mapped[str] = mapped_column(String(80), index=True)
    state: Mapped[str] = mapped_column(String(80), index=True)
    elevationM: Mapped[int] = mapped_column(Integer)
    slopeDeg: Mapped[int] = mapped_column(Integer)
    population: Mapped[int] = mapped_column(Integer)
    households: Mapped[int] = mapped_column(Integer)
    riverName: Mapped[str] = mapped_column(String(120))
    riverDistKm: Mapped[float] = mapped_column(Float)
    watershed: Mapped[str] = mapped_column(String(40))
    dangerLevelM: Mapped[float] = mapped_column(Float)
    nodeId: Mapped[str | None] = mapped_column(String(32), nullable=True)
    shelter: Mapped[str] = mapped_column(Text)
    route: Mapped[str] = mapped_column(Text)
    eventsJson: Mapped[str] = mapped_column(Text, default="[]")  # JSON [{year, label}]


class UserRow(Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(160), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(16), index=True)  # national|state|district|field|village
    org: Mapped[str] = mapped_column(String(160))
    posting: Mapped[str] = mapped_column(String(160))
    scopeState: Mapped[str | None] = mapped_column(String(80), nullable=True)
    scopeDistrict: Mapped[str | None] = mapped_column(String(80), nullable=True)
    scopeVillageId: Mapped[str | None] = mapped_column(String(32), nullable=True)
    passwordSalt: Mapped[str] = mapped_column(String(64))
    passwordHash: Mapped[str] = mapped_column(String(128))
    loginEnabled: Mapped[bool] = mapped_column(Boolean, default=True)


class AlertRow(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(16), primary_key=True)  # AL-101…
    villageId: Mapped[str] = mapped_column(String(32), index=True)
    villageName: Mapped[str] = mapped_column(String(120))
    severity: Mapped[str] = mapped_column(String(12))   # WATCH|WARNING|CRITICAL
    status: Mapped[str] = mapped_column(String(16), index=True)  # ACTIVE|ACKNOWLEDGED|RESOLVED
    ts: Mapped[int] = mapped_column(Integer, index=True)  # epoch ms
    why: Mapped[str] = mapped_column(Text)
    sourcesJson: Mapped[str] = mapped_column(Text, default="[]")
    arrivalMin: Mapped[int | None] = mapped_column(Integer, nullable=True)
    score: Mapped[float] = mapped_column(Float)
    manual: Mapped[bool] = mapped_column(Boolean, default=False)
    ackBy: Mapped[str | None] = mapped_column(String(120), nullable=True)
    ackTs: Mapped[int | None] = mapped_column(Integer, nullable=True)
    resolvedTs: Mapped[int | None] = mapped_column(Integer, nullable=True)


class TelemetryRow(Base):
    """Hourly telemetry series (HourPoint) — appended on every simulated-hour shift."""

    __tablename__ = "telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    villageId: Mapped[str] = mapped_column(String(32), index=True)
    ts: Mapped[int] = mapped_column(Integer, index=True)  # epoch ms of the hour bucket
    hour: Mapped[str] = mapped_column(String(8))  # "HH:00" IST label
    rain: Mapped[float] = mapped_column(Float)
    soil: Mapped[float] = mapped_column(Float)
    water: Mapped[float] = mapped_column(Float)


class MqttPacketRow(Base):
    """Latest packets per node (upserted) for the /sensors/mqtt/recent view."""

    __tablename__ = "mqtt_packets"

    nodeId: Mapped[str] = mapped_column(String(32), primary_key=True)
    villageId: Mapped[str] = mapped_column(String(32), index=True)
    ts: Mapped[int] = mapped_column(Integer, index=True)
    payloadJson: Mapped[str] = mapped_column(Text)
