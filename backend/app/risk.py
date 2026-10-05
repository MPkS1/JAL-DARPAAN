"""Port of src/lib/risk.ts — the transparent weighted-fusion risk engine.

score = 100 × (0.34·rain + 0.27·soil + 0.17·river + 0.16·slope + 0.06·history)

Bands: SAFE <40 · WATCH 40–59 · WARNING 60–74 · CRITICAL ≥75.
Alert triggers fire at 45/62/78 (engine.py) — same as the frontend contract.
"""
from __future__ import annotations

from typing import Any

WEIGHTS = {"rain": 0.34, "soil": 0.27, "river": 0.17, "slope": 0.16, "history": 0.06}

BAND_HEX = {
    "SAFE": "#22c55e",
    "WATCH": "#facc15",
    "WARNING": "#f97316",
    "CRITICAL": "#ef4444",
}

CONTRIB_META = [
    ("Rainfall 1 h", "rain", "#22d3ee"),
    ("Soil saturation", "soil", "#a78bfa"),
    ("River level", "river", "#38bdf8"),
    ("Slope susceptibility", "slope", "#fb923c"),
    ("Event history", "history", "#94a3b8"),
]


def clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def clamp01(v: float) -> float:
    return clamp(v, 0.0, 1.0)


def band_of(score: float) -> str:
    if score >= 75:
        return "CRITICAL"
    if score >= 60:
        return "WARNING"
    if score >= 40:
        return "WATCH"
    return "SAFE"


def compute_risk(v: dict[str, Any], rain_mm_hr: float, soil_pct: float, water_level_m: float) -> dict[str, Any]:
    """Mirror of computeRisk(village, {rainMmHr, soilPct, waterLevelM}) → {score, band, contributions}."""
    rain_norm = clamp01(rain_mm_hr / 60)
    soil_norm = clamp01(soil_pct / 100)
    river_norm = clamp01(water_level_m / v["dangerLevelM"])
    slope_norm = clamp01(v["slopeDeg"] / 60)
    hist_norm = clamp01(len(v["events"]) / 3)

    raw = 100 * (
        WEIGHTS["rain"] * rain_norm
        + WEIGHTS["soil"] * soil_norm
        + WEIGHTS["river"] * river_norm
        + WEIGHTS["slope"] * slope_norm
        + WEIGHTS["history"] * hist_norm
    )

    norm_by_key = {
        "rain": rain_norm,
        "soil": soil_norm,
        "river": river_norm,
        "slope": slope_norm,
        "history": hist_norm,
    }
    contributions = [
        {"label": label, "value": WEIGHTS[key] * norm_by_key[key] * 100, "color": color}
        for label, key, color in CONTRIB_META
    ]
    contributions.sort(key=lambda c: c["value"], reverse=True)

    score = round(clamp(raw, 0, 100) * 10) / 10
    return {"score": score, "band": band_of(score), "contributions": contributions}


def arrival_estimate(
    band: str, rain_mm_hr: float, soil_pct: float, water_level_m: float, danger_level_m: float
) -> int | None:
    """Estimated minutes until local flash-flood arrival (only meaningful ≥ WARNING)."""
    if band not in ("WARNING", "CRITICAL"):
        return None
    t = (
        200
        - rain_mm_hr * 1.5
        - max(0.0, soil_pct - 60) * 1.5
        - clamp01(water_level_m / danger_level_m) * 60
    )
    return round(clamp(t, 12, 240))
