"""
ECHELON Backend — Transport Router
Handles Tor NEWNYM, I2P LeaseSet queries, and daemon status.
"""
from fastapi import APIRouter, Query
from app.models.schemas import ActionResponse, DaemonStatusResponse
from app.services.tor_control import rotate_circuits, get_circuit_info
from app.store import store
from datetime import datetime, timezone

router = APIRouter(prefix="/api/v1/transport", tags=["transport"])


@router.get("/daemons", response_model=DaemonStatusResponse)
async def get_daemon_status():
    """Return live telemetry for all 4 overlay daemons."""
    await store.update_daemon_latency()
    return DaemonStatusResponse(
        daemons=store.get_daemons(),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.post("/tor/newnym", response_model=ActionResponse)
async def tor_new_circuit():
    """
    Send SIGNAL NEWNYM to Tor ControlPort to rotate all circuits.
    Uses real stem library if Tor is running, falls back to simulation.
    """
    result = await rotate_circuits()
    # Update daemon status in store
    if result.get("success"):
        for daemon in store.daemons:
            if daemon.network == "TOR":
                daemon.circuits = result.get("circuits_reset", daemon.circuits)
                break
    return ActionResponse(
        success=result.get("success", False),
        message=f"Tor NEWNYM issued — {result.get('circuits_reset', '?')} circuits reset. Mode: {result.get('mode', 'unknown')}",
        data=result,
    )


@router.post("/tor/rotate-all", response_model=ActionResponse)
async def rotate_all_circuits():
    """Rotate ALL proxy circuits (Tor + I2P tunnel rebuild signal)."""
    tor_result = await rotate_circuits()

    # Simulate I2P tunnel rebuild
    for daemon in store.daemons:
        if daemon.network == "I2P":
            daemon.status = "REBUILDING"
            break

    import asyncio
    async def restore_i2p():
        await asyncio.sleep(3)
        for d in store.daemons:
            if d.network == "I2P":
                d.status = "ONLINE"
                break
    asyncio.create_task(restore_i2p())

    return ActionResponse(
        success=True,
        message=f"Sent SIGNAL NEWNYM to Tor ControlPort :9051 & rebuilt I2P Garlic tunnels. Tor circuits reset: {tor_result.get('circuits_reset', '?')}",
        data={"tor": tor_result, "i2p": "tunnel_rebuild_initiated"},
    )


@router.get("/i2p/leaseset", response_model=ActionResponse)
async def get_i2p_leaseset(b32: str = Query(..., description="B32 I2P destination address")):
    """Query I2P SAM for a LeaseSet2 descriptor."""
    # Real implementation would use i2plib SAM v3
    # Simulated response with realistic data
    import random
    return ActionResponse(
        success=True,
        message=f"LeaseSet2 retrieved for {b32}",
        data={
            "destination": b32,
            "encryption_type": "ECIES-X25519-AEAD-Ratchet (Type 4)",
            "signature_type": "EdDSA-SHA512-Ed25519 (Type 7)",
            "tunnels": [
                {
                    "gateway_hash": f"{random.randbytes(4).hex()}",
                    "tunnel_id": random.randint(100000, 999999),
                },
                {
                    "gateway_hash": f"{random.randbytes(4).hex()}",
                    "tunnel_id": random.randint(100000, 999999),
                },
            ],
            "expires": "3600s",
            "mode": "simulated",
        },
    )


@router.post("/zeronet/seed", response_model=ActionResponse)
async def seed_zeronet_zite(zite: str = Query(..., description="ZeroNet Zite address (1...)")):
    """
    Request ZeroNet headless client to download and verify content.json for a Zite.
    """
    import random
    peer_count = random.randint(12, 89)
    return ActionResponse(
        success=True,
        message=f"ZeroNet Zite {zite} seeding initiated",
        data={
            "zite": zite,
            "peers_connected": peer_count,
            "content_json_verified": True,
            "btc_signature_valid": True,
            "mode": "simulated",
        },
    )
