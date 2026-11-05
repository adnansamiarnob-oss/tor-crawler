"""
ECHELON Backend — Tor Control Service
Real stem ControlPort integration with graceful fallback to simulation.
"""
from __future__ import annotations
import asyncio
import logging
import os
import random
from typing import Optional

logger = logging.getLogger(__name__)

TOR_CONTROL_HOST = os.getenv("TOR_CONTROL_HOST", "127.0.0.1")
TOR_CONTROL_PORT = int(os.getenv("TOR_CONTROL_PORT", "9051"))
TOR_CONTROL_PASS = os.getenv("TOR_CONTROL_PASSWORD", "")

_stem_available = False
try:
    import stem
    from stem import Signal
    from stem.control import Controller
    _stem_available = True
except ImportError:
    logger.warning("stem library not installed — using simulated Tor control")


async def rotate_circuits() -> dict:
    """
    Send SIGNAL NEWNYM to Tor ControlPort to get new circuits.
    Falls back to simulation if Tor daemon is not available.
    """
    if _stem_available:
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, _stem_newnym)
            return result
        except Exception as e:
            logger.warning(f"stem NEWNYM failed: {e} — using simulated response")

    # Simulated response
    await asyncio.sleep(0.3)
    return {
        "success": True,
        "new_exit_fingerprint": f"{''.join([f'{random.randint(0,15):X}' for _ in range(40)])}",
        "circuits_reset": random.randint(18, 28),
        "mode": "simulated",
    }


def _stem_newnym() -> dict:
    """Blocking stem call — run in executor."""
    with Controller.from_port(address=TOR_CONTROL_HOST, port=TOR_CONTROL_PORT) as ctrl:
        if TOR_CONTROL_PASS:
            ctrl.authenticate(password=TOR_CONTROL_PASS)
        else:
            ctrl.authenticate()
        ctrl.signal(Signal.NEWNYM)
        circuits = list(ctrl.get_circuits())
        return {
            "success": True,
            "circuits_reset": len(circuits),
            "new_exit_fingerprint": circuits[0].path[-1][0] if circuits else "unknown",
            "mode": "live",
        }


async def get_circuit_info() -> dict:
    """Get current circuit count and status."""
    if _stem_available:
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, _stem_circuit_info)
        except Exception as e:
            logger.warning(f"stem circuit info failed: {e}")

    return {
        "circuit_count": random.randint(20, 28),
        "status": "ONLINE",
        "avg_latency_ms": random.randint(380, 480),
        "mode": "simulated",
    }


def _stem_circuit_info() -> dict:
    with Controller.from_port(address=TOR_CONTROL_HOST, port=TOR_CONTROL_PORT) as ctrl:
        if TOR_CONTROL_PASS:
            ctrl.authenticate(password=TOR_CONTROL_PASS)
        else:
            ctrl.authenticate()
        circuits = list(ctrl.get_circuits())
        return {
            "circuit_count": len(circuits),
            "status": "ONLINE",
            "mode": "live",
        }
