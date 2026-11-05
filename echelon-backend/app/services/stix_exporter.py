"""
ECHELON Backend — STIX 2.1 Bundle Generator
Converts correlation incidents to STIX 2.1 format for SIEM/MISP export.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import List

from app.models.schemas import CorrelationIncident, STIXBundle


def incident_to_stix(incident: CorrelationIncident) -> STIXBundle:
    """Convert a CorrelationIncident to a STIX 2.1 Bundle."""
    now = datetime.now(timezone.utc).isoformat()
    bundle_id = f"bundle--{uuid.uuid4()}"
    report_id = f"report--{uuid.uuid4()}"
    threat_actor_id = f"threat-actor--{uuid.uuid4()}"
    indicator_id = f"indicator--{uuid.uuid4()}"
    sighting_id = f"sighting--{uuid.uuid4()}"

    objects: List[dict] = []

    # Threat Actor
    objects.append({
        "type": "threat-actor",
        "spec_version": "2.1",
        "id": threat_actor_id,
        "created": now,
        "modified": now,
        "name": f"Threat Actor ({incident.id})",
        "description": incident.correlation_basis,
        "labels": ["criminal", "ransomware"],
        "external_references": [
            {
                "source_name": "ECHELON PRISM-DARKNET",
                "description": incident.title,
                "url": f"echelon://incident/{incident.id}",
            }
        ],
    })

    # Indicator (PGP Key)
    if incident.pgp_key:
        objects.append({
            "type": "indicator",
            "spec_version": "2.1",
            "id": indicator_id,
            "created": now,
            "modified": now,
            "name": f"PGP Key {incident.pgp_key}",
            "description": f"PGP key observed across {', '.join(incident.networks)} networks",
            "indicator_types": ["malicious-activity"],
            "pattern": f"[email-message:from_ref.value = '{incident.pgp_key}']",
            "pattern_type": "stix",
            "valid_from": now,
            "confidence": incident.score,
        })

    # Indicator (BTC Wallet)
    if incident.btc_wallet:
        btc_id = f"indicator--{uuid.uuid4()}"
        objects.append({
            "type": "indicator",
            "spec_version": "2.1",
            "id": btc_id,
            "created": now,
            "modified": now,
            "name": f"Cryptocurrency Wallet {incident.btc_wallet[:20]}...",
            "description": "Ransom escrow wallet linked to threat actor",
            "indicator_types": ["malicious-activity"],
            "pattern": f"[cryptocurrency-wallet:address = '{incident.btc_wallet}']",
            "pattern_type": "stix",
            "valid_from": now,
        })

    # Sighting
    objects.append({
        "type": "sighting",
        "spec_version": "2.1",
        "id": sighting_id,
        "created": now,
        "modified": now,
        "first_seen": now,
        "last_seen": now,
        "count": 1,
        "sighting_of_ref": indicator_id,
        "where_sighted_refs": [],
        "summary": True,
        "description": f"Observed on: {', '.join(incident.networks)}",
        "confidence": incident.score,
        "severity": incident.severity,
    })

    # Report wrapping all objects
    objects.append({
        "type": "report",
        "spec_version": "2.1",
        "id": report_id,
        "created": now,
        "modified": now,
        "name": incident.title,
        "description": incident.correlation_basis,
        "published": now,
        "report_types": ["threat-actor", "indicator"],
        "object_refs": [obj["id"] for obj in objects],
        "labels": [sev.lower() for sev in [incident.severity]],
        "external_references": [
            {
                "source_name": "ECHELON",
                "description": f"Incident ID: {incident.id}",
            }
        ],
    })

    return STIXBundle(
        id=bundle_id,
        objects=objects,
    )
