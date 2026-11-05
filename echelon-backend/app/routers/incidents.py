"""
ECHELON Backend — Incidents Router
Manages correlation incidents, escalation, and STIX 2.1 export.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.models.schemas import ActionResponse, EscalateRequest, STIXBundle
from app.services.stix_exporter import incident_to_stix
from app.store import store

router = APIRouter(prefix="/api/v1/incidents", tags=["incidents"])


@router.get("/")
async def get_incidents(
    network: Optional[str] = Query(None, description="Filter: ALL, TOR, I2P, ZERONET, SIEM"),
    search: Optional[str] = Query(None, description="Search across title, targets, PGP key, BTC wallet"),
    limit: int = Query(50, le=200),
):
    """Return filtered correlation incidents."""
    incidents = store.get_incidents(network_filter=network, search=search)
    return {
        "incidents": incidents[:limit],
        "total": len(incidents),
        "filtered": len(incidents) < len(store.incidents),
    }


@router.get("/{incident_id}")
async def get_incident(incident_id: str):
    """Get a specific incident by ID."""
    inc = store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return inc


@router.post("/{incident_id}/escalate", response_model=ActionResponse)
async def escalate_to_siem(incident_id: str, body: EscalateRequest):
    """
    Escalate an incident to Wazuh SIEM and/or MISP via STIX 2.1 Sighting.
    In production, calls Wazuh REST API + MISP PyMISP client.
    """
    inc = store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    stix_bundle = incident_to_stix(inc)

    destinations = []
    if body.target in ("wazuh", "both"):
        destinations.append("Wazuh SIEM")
        # Real: requests.post(wazuh_api_url, json=stix_bundle.dict(), headers=auth_headers)
    if body.target in ("misp", "both"):
        destinations.append("MISP")
        # Real: misp.add_event(misp_event)

    return ActionResponse(
        success=True,
        message=f"Dispatched STIX 2.1 Bundle for {incident_id} to {' & '.join(destinations)}",
        data={
            "incident_id": incident_id,
            "stix_bundle_id": stix_bundle.id,
            "targets": destinations,
            "priority": body.priority,
            "objects_exported": len(stix_bundle.objects),
        },
    )


@router.get("/{incident_id}/stix", response_model=STIXBundle)
async def export_stix_bundle(incident_id: str):
    """Export incident as STIX 2.1 bundle JSON."""
    inc = store.get_incident(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
    return incident_to_stix(inc)


@router.post("/simulate", response_model=dict)
async def simulate_correlation():
    """
    Inject a simulated cross-overlay correlation incident (for demo/testing).
    This is what the frontend's "Simulate Correlation Hit" button calls.
    """
    import random
    from datetime import datetime, timezone
    from app.models.schemas import CorrelationIncident

    samples = [
        {
            "severity": "CRITICAL",
            "score": 98,
            "networks": ["TOR", "I2P", "SIEM"],
            "title": "SSH Host Key & PGP Collision Links Tor C2 to I2P Garlic Hidden Service",
            "primary_target": "q8m2n9p4k1r7s3t5u0w2y4z8a1c3e5g7i9k0m2o4q6s8u0w1x9y2.b32.i2p",
            "secondary_target": "cobaltstrike99x2m...v3.onion",
            "correlation_basis": "Identical Ed25519 SSH Host Key (SHA256:44a9...11f0) and JARM TLS fingerprint observed across Tor port 2222 and I2P SAM stream tunnel.",
            "pgp_key": "0x9F8B772A109CE481",
            "btc_wallet": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            "dom_hash": "mmh3:-1198420911",
            "raw_descriptor": "[CROSS-OVERLAY SSH + JARM CORRELATION]\nTor HSv3 Target: cobaltstrike99x2m...v3.onion:2222\nI2P Destination: q8m2n9p4k1r7...b32.i2p\nSSH-2.0-OpenSSH_8.9p1 Ubuntu\nJARM: 27d40d40d29d40d1dc42d43d00041d4689ee210389f4f6b4b5b1b93f92252d",
        },
        {
            "severity": "HIGH",
            "score": 93,
            "networks": ["ZERONET", "SIEM"],
            "title": "New ZeroNet Zite Revision Publishes Leaked Corporate VPN .ovpn Profiles",
            "primary_target": "1ZeroDayDrop88xPq...4Lm",
            "secondary_target": "vpn-gw-01.fin-core.internal",
            "correlation_basis": "ZeroNet DHT listener captured revision #19 of content.json. Extracted .ovpn client certificate matches internal CA serial 0x8841209A.",
            "pgp_key": "0x44C18890AABB1122",
            "btc_wallet": "1ZeroDayDrop88xPq9LmN2vB5kR7tY4Lm",
            "dom_hash": "sha512:77c1902a",
            "raw_descriptor": '{\n  "zite": "1ZeroDayDrop88xPq9LmN2vB5kR7tY4Lm",\n  "matched_yara_rule": "rule_Corp_OpenVPN_Private_Key"\n}',
        },
    ]

    pick = random.choice(samples)
    now = datetime.now(timezone.utc)
    new_inc = CorrelationIncident(
        id=f"INC-{now.year}-{random.randint(1000, 9999)}",
        timestamp=now.strftime("%H:%M:%S.%f")[:12] + " UTC",
        **pick,
    )
    await store.add_incident(new_inc)
    return {"injected": True, "incident": new_inc}
