"""Bit-exact port of src/lib/rng.ts — deterministic seeded RNG (mulberry32).

JavaScript's 32-bit integer semantics (Math.imul, >>>) are emulated with
masks so seeded sequences match the frontend byte-for-byte.
"""
from __future__ import annotations

from typing import Callable

_MASK = 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    """Math.imul — 32-bit integer multiply (mod 2^32 of the bit patterns)."""
    return (a * b) & _MASK


def hash_seed(s: str) -> int:
    h = (1779033703 ^ len(s)) & _MASK
    for ch in s:
        h = _imul(h ^ ord(ch), 3432918353)
        h = ((h << 13) & _MASK) | (h >> 19)
    return h & _MASK  # JS `>>> 0`


def mulberry32(seed: int) -> Callable[[], float]:
    a = seed & _MASK

    def rand() -> float:
        nonlocal a
        a = (a + 0x6D2B79F5) & _MASK
        t = a
        t = _imul(t ^ (t >> 15), 1 | t)
        t = ((t + _imul(t ^ (t >> 7), 61 | t)) ^ t) & _MASK
        return ((t ^ (t >> 14)) & _MASK) / 4294967296.0

    return rand


def noise(rand: Callable[[], float], amplitude: float = 1.0) -> float:
    return (rand() * 2 - 1) * amplitude
