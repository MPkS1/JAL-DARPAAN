"""Port of src/lib/simulation.ts — telemetry generation + ESP32 payload contract.

Function-for-function port of the frontend simulation engine (monsoon physics,
scenario targets, seeded 24 h history, node/climate/source state) so the
backend produces the same telemetry shapes and alert triggers as the demo UI.
"""
from __future__ import annotations

import math
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from .risk import arrival_estimate, clamp, clamp01, compute_risk
from .rng import hash_seed, mulberry32, noise

IST = timezone(timedelta(hours=5, minutes=30))

# Unseeded jitter for live ticks (the TS tick loop uses Math.random).
_tick_rand = random.Random()

# Alert trigger thresholds (slightly above band edges to avoid edge-flicker).
ALERT_THRESHOLDS = {"WATCH": 45, "WARNING": 62, "CRITICAL": 78}

# Seeded hardware failures so health-monitoring is visible in every demo.
NODE_FAILURES: dict[str, dict[str, Any]] = {
    "ESP32-UK-010": {"status": "offline", "battery": 67, "signal": -93},      # Kyark — comms dropout
    "ESP32-UK-005": {"status": "low-battery", "battery": 31, "signal": -78},  # Kalimath — solar underpowered
}

SCENARIOS = ("normal", "monsoon", "cloudburst")


def round1(n: float) -> float:
    return round(n * 10) / 10


def round2(n: float) -> float:
    return round(n * 100) / 100


def hour_label_of(hours_ago: int, now: datetime | None = None) -> str:
    now_h = (now or datetime.now(timezone.utc)).astimezone(IST).hour
    return f"{(now_h - hours_ago + 48) % 24:02d}:00"


# --- Terrain + hydrology ------------------------------------------------------

def susceptibility(v: dict[str, Any]) -> float:
    """Static 0..1 terrain index per village, from DEM features."""
    slope_part = clamp01(v["slopeDeg"] / 60) * 0.4
    river_part = clamp01((3 - v["riverDistKm"]) / 3) * 0.25
    elev_part = clamp01(v["elevationM"] / 3600) * 0.35
    return clamp01(slope_part + river_part + elev_part)


def scenario_targets(v: dict[str, Any], scenario: str) -> dict[str, float]:
    """Per-village scenario targets — the "weather truth" telemetry walks toward."""
    sus = susceptibility(v)
    cloudburst_zone = v["lat"] >= 30.4  # upper Mandakini: Kedarnath → Chandrapuri corridor
    if scenario == "normal":
        return {
            "rainBase": 0.4 + sus * 2,
            "soilBase": 42 + sus * 12,
            "waterTarget": v["dangerLevelM"] * 0.42,
        }
    if scenario == "monsoon":
        return {
            "rainBase": 4 + sus * 20,
            "soilBase": 55 + sus * 26,
            "waterTarget": v["dangerLevelM"] * 0.66,
        }
    if scenario == "cloudburst":
        return {
            "rainBase": (58 + sus * 34) if cloudburst_zone else (16 + sus * 20),
            "soilBase": min(97, (86 + sus * 10) if cloudburst_zone else (70 + sus * 14)),
            "waterTarget": v["dangerLevelM"] * (0.94 if cloudburst_zone else 0.78),
        }
    raise ValueError(f"unknown scenario: {scenario}")


# --- History / nowcast / node / climate / sources ------------------------------

def make_history(
    v: dict[str, Any], t: dict[str, float], sus: float, now: datetime | None = None
) -> list[dict[str, Any]]:
    """24 hourly points ending "now" — replay-style monsoon pattern with a burst 4–9 h ago."""
    rand = mulberry32(hash_seed(v["id"] + "hist"))
    pts: list[dict[str, Any]] = []
    burst_amp = 6 + sus * 26
    for i in range(24):
        hours_ago = 23 - i
        rain = t["rainBase"] * 0.35
        if hours_ago <= 2:
            rain = t["rainBase"] * (0.72 + 0.14 * (2 - hours_ago))
        if 4 <= hours_ago <= 9:
            rain += burst_amp * math.sin(((hours_ago - 4) / 5) * math.pi)
        rain = max(0.0, rain + noise(rand, 1.1))
        soil = clamp(t["soilBase"] * (0.6 + 0.4 * (i / 23)) + noise(rand, 2), 25, 98)
        water = clamp(t["waterTarget"] * (0.55 + 0.45 * (i / 23)) + noise(rand, 0.07), 0.3, 6.5)
        pts.append(
            {
                "hour": hour_label_of(hours_ago, now),
                "rain": round1(rain),
                "soil": round1(soil),
                "water": round2(water),
            }
        )
    return pts


def nowcast_for(rain: float, scenario: str) -> list[float]:
    r = max(0.0, rain)
    if scenario == "normal":
        return [r * 0.5, r * 0.3, r * 0.15, r * 0.05, 0, 0]
    if scenario == "monsoon":
        return [r * 1.05, r * 1.1, r * 0.95, r * 0.8, r * 0.6, r * 0.4]
    return [r * 1.2, r * 1.35, r * 1.1, r * 0.75, r * 0.45, r * 0.25]


def node_state_for(v: dict[str, Any], rand: Callable[[], float]) -> dict[str, Any]:
    if not v["nodeId"]:
        return {"nodeStatus": "no-node", "batteryPct": None, "signalDbm": None}
    fail = NODE_FAILURES.get(v["nodeId"])
    if fail:
        return {"nodeStatus": fail["status"], "batteryPct": fail["battery"], "signalDbm": fail["signal"]}
    return {
        "nodeStatus": "online",
        "batteryPct": round(58 + rand() * 40),
        "signalDbm": round(-55 - rand() * 30),
    }


def climate_for(
    v: dict[str, Any], soil_pct: float, rain_mm_hr: float, rng: Callable[[], float]
) -> dict[str, float]:
    return {
        "tempC": round1(24 - (v["elevationM"] - 300) * 0.0065 + noise(rng, 0.4)),
        "humidityPct": round1(clamp(55 + soil_pct * 0.4 + rain_mm_hr * 0.3, 40, 98)),
        "windKmph": round1(clamp(4 + susceptibility(v) * 10 + noise(rng, 2), 1, 40)),
        "pressureHpa": round(1013 - v["elevationM"] * 0.101 + noise(rng, 0.8)),
    }


def sources_for(v: dict[str, Any], rain: float, soil: float, water: float) -> dict[str, Any]:
    """≥2 independent sources must agree for WARNING/CRITICAL — the false-alarm defence."""
    sources: list[str] = []
    if v["nodeId"]:
        fail = NODE_FAILURES.get(v["nodeId"])
        if not fail or fail["status"] != "offline":
            sources.append(v["nodeId"])
    sources.append("GPM IMERG" if v["nodeId"] else "IMD AWS Rudraprayag")
    if soil >= 80:
        sources.append("SMAP L4")
    if not v["nodeId"] and rain >= 8:
        sources.append("GPM IMERG")

    uniq = list(dict.fromkeys(sources))  # dedupe, keep order
    river_ratio = water / v["dangerLevelM"]
    agree = rain >= 10 and (soil >= 80 or river_ratio >= 0.72)
    return {"sourcesAgree": agree and len(uniq) >= 2, "sources": uniq[:3]}


# --- Live-state construction + tick --------------------------------------------

def init_village_live(
    v: dict[str, Any], scenario: str, now_ms: int | None = None
) -> dict[str, Any]:
    """Mirror of initVillageLive(v, scenario) → VillageLive."""
    now_ms = now_ms or int(datetime.now(timezone.utc).timestamp() * 1000)
    now = datetime.fromtimestamp(now_ms / 1000, tz=timezone.utc)
    rand = mulberry32(hash_seed(v["id"]))
    sus = susceptibility(v)
    t = scenario_targets(v, scenario)
    history = make_history(v, t, sus, now)
    last = history[-1]
    nowcast = nowcast_for(last["rain"], scenario)
    node = node_state_for(v, rand)
    climate = climate_for(v, last["soil"], last["rain"], rand)
    risk = compute_risk(v, last["rain"], last["soil"], last["water"])
    arrival = arrival_estimate(risk["band"], last["rain"], last["soil"], last["water"], v["dangerLevelM"])
    src = sources_for(v, last["rain"], last["soil"], last["water"])

    return {
        "id": v["id"],
        "rainMmHr": round1(last["rain"]),
        "rain24": round1(sum(p["rain"] for p in history)),
        "soilPct": round1(last["soil"]),
        "waterLevelM": last["water"],
        "tempC": climate["tempC"],
        "humidityPct": climate["humidityPct"],
        "windKmph": climate["windKmph"],
        "pressureHpa": climate["pressureHpa"],
        "score": risk["score"],
        "band": risk["band"],
        "contributions": risk["contributions"],
        "sourcesAgree": src["sourcesAgree"],
        "sources": src["sources"],
        "arrivalMin": arrival,
        "history": history,
        "nowcast": nowcast,
        "batteryPct": node["batteryPct"],
        "signalDbm": node["signalDbm"],
        "nodeStatus": node["nodeStatus"],
        "updatedAt": now_ms,
    }


def tick_village(
    v: dict[str, Any],
    live: dict[str, Any],
    scenario: str,
    shift: bool,
    now_ms: int | None = None,
) -> dict[str, Any]:
    """Advance one village's telemetry one tick (≈4 s). `shift` rolls the hourly window."""
    now_ms = now_ms or int(datetime.now(timezone.utc).timestamp() * 1000)
    now = datetime.fromtimestamp(now_ms / 1000, tz=timezone.utc)
    t = scenario_targets(v, scenario)
    rng = _tick_rand.random

    rain = (
        live["rainMmHr"]
        + (t["rainBase"] - live["rainMmHr"]) * 0.16
        + noise(rng, 0.4 + live["rainMmHr"] * 0.06)
        - live["rainMmHr"] * 0.004
    )
    rain = max(0.0, rain)
    soil = clamp(live["soilPct"] + (t["soilBase"] - live["soilPct"]) * 0.05 + noise(rng, 0.35), 25, 98.5)
    water = clamp(
        live["waterLevelM"] + (t["waterTarget"] - live["waterLevelM"]) * 0.09 + rain * 0.004 + noise(rng, 0.018),
        0.3,
        6.5,
    )

    history = [dict(p) for p in live["history"]]
    if shift:
        history.pop(0)
        history.append({"hour": hour_label_of(0, now), "rain": round1(rain), "soil": round1(soil), "water": round2(water)})
    else:
        last = history[-1]
        last["rain"] = round1(rain)
        last["soil"] = round1(soil)
        last["water"] = round2(water)

    risk = compute_risk(v, rain, soil, water)
    climate = climate_for(v, soil, rain, rng)

    battery_pct = live["batteryPct"]
    signal_dbm = live["signalDbm"]
    if live["nodeStatus"] == "low-battery" and battery_pct is not None:
        battery_pct = max(5.0, battery_pct - 0.015)
    if live["nodeStatus"] == "online" and signal_dbm is not None:
        signal_dbm = round(clamp(signal_dbm + noise(rng, 2), -90, -50))

    src = sources_for(v, rain, soil, water)
    next_live = dict(live)
    next_live.update(
        {
            "rainMmHr": round1(rain),
            "rain24": round1(sum(p["rain"] for p in history)),
            "soilPct": round1(soil),
            "waterLevelM": round2(water),
            "tempC": climate["tempC"],
            "humidityPct": climate["humidityPct"],
            "windKmph": climate["windKmph"],
            "pressureHpa": climate["pressureHpa"],
            "score": risk["score"],
            "band": risk["band"],
            "contributions": risk["contributions"],
            "sourcesAgree": src["sourcesAgree"],
            "sources": src["sources"],
            "arrivalMin": arrival_estimate(risk["band"], rain, soil, water, v["dangerLevelM"]),
            "history": history,
            "nowcast": nowcast_for(rain, scenario),
            "batteryPct": round1(battery_pct) if battery_pct is not None else None,
            "signalDbm": signal_dbm,
            "nodeStatus": live["nodeStatus"],
            "updatedAt": now_ms,
        }
    )
    return next_live


def make_mqtt_packet(v: dict[str, Any], live: dict[str, Any], now_ms: int | None = None) -> dict[str, Any]:
    """Exact ESP32 MQTT payload contract (PLAN.md §7 — simulator = production JSON)."""
    now_ms = now_ms or int(datetime.now(timezone.utc).timestamp() * 1000)
    ist = datetime.fromtimestamp(now_ms / 1000, tz=timezone.utc) + timedelta(hours=5, minutes=30)
    return {
        "node_id": v["nodeId"] or "ESP32-UK-PENDING",
        "village_code": v["code"],
        "timestamp": ist.strftime("%Y-%m-%dT%H:%M:%S") + "+05:30",
        "rainfall_mm_hr": live["rainMmHr"],
        "soil_moisture_pct": live["soilPct"],
        "water_level_m": live["waterLevelM"],
        "battery_pct": live["batteryPct"] or 0,
        "signal_dbm": live["signalDbm"] or 0,
    }
