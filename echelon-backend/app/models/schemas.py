"""
ECHELON Backend — Pydantic Data Models
Mirrors the data structures used by the frontend App.tsx
"""
from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


# ─────────────────────────────────────────────────────────────────────────────
# Overlay Network Types
# ─────────────────────────────────────────────────────────────────────────────
NetworkType = Literal["TOR", "I2P", "ZERONET", "ENGINE", "SIEM", "CRYPTO"]
SeverityType = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]


# ─────────────────────────────────────────────────────────────────────────────
# Daemon / Proxy Telemetry
# ─────────────────────────────────────────────────────────────────────────────
class DaemonStatus(BaseModel):
    id: str
    network: NetworkType
    name: str
    endpoint: str
    control_port: str
    status: str  # ONLINE / SYNCED / OFFLINE / DEGRADED
    circuits: int
    avg_latency: str
    bandwidth: str
    specific_metric: str
    color: str


class DaemonStatusResponse(BaseModel):
    daemons: List[DaemonStatus]
    timestamp: str


# ─────────────────────────────────────────────────────────────────────────────
# Crawl Queue
# ─────────────────────────────────────────────────────────────────────────────
class ArtifactCounts(BaseModel):
    pgp: int = 0
    wallets: int = 0
    emails: int = 0
    cves: int = 0
    archives: int = 0


class CrawlJob(BaseModel):
    id: str = Field(default_factory=lambda: f"CRW-{uuid.uuid4().hex[:6].upper()}")
    network: NetworkType
    uri: str
    title: str
    status: str = "QUEUED"
    latency: str = "pending"
    depth: int = 3
    dom_hash: str = "pending"
    artifacts: ArtifactCounts = Field(default_factory=ArtifactCounts)
    last_crawled: str = "just now"
    sanitized_dom: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class NewSeedRequest(BaseModel):
    network: NetworkType
    uri: str
    depth: int = Field(default=3, ge=1, le=10)
    render_js: bool = True
    extract_archives: bool = True


class CrawlQueueResponse(BaseModel):
    jobs: List[CrawlJob]
    total: int


# ─────────────────────────────────────────────────────────────────────────────
# Graph Nodes & Edges
# ─────────────────────────────────────────────────────────────────────────────
class NodeDetails(BaseModel):
    model_config = {"extra": "allow"}  # flexible for different node types


class GraphNode(BaseModel):
    id: str
    label: str
    sub: str
    type: str  # ACTOR, ARTIFACT, SERVICE, SIEM
    network: NetworkType
    x: float
    y: float
    confidence: str
    details: Dict[str, Any]


class GraphEdge(BaseModel):
    from_node: str = Field(alias="from")
    to_node: str = Field(alias="to")
    label: str

    model_config = {"populate_by_name": True}


class GraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]


class NeighborResponse(BaseModel):
    node_id: str
    neighbors: List[GraphNode]
    connecting_edges: List[GraphEdge]
    cypher_query: str


# ─────────────────────────────────────────────────────────────────────────────
# Correlation Incidents
# ─────────────────────────────────────────────────────────────────────────────
class CorrelationIncident(BaseModel):
    id: str = Field(default_factory=lambda: f"INC-{datetime.utcnow().year}-{uuid.uuid4().int % 9000 + 1000}")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().strftime("%H:%M:%S.%f")[:12] + " UTC")
    severity: SeverityType
    score: int = Field(ge=0, le=100)
    networks: List[NetworkType]
    title: str
    primary_target: str
    secondary_target: str
    correlation_basis: str
    pgp_key: str = ""
    btc_wallet: str = ""
    dom_hash: str = ""
    raw_descriptor: str = ""


class IncidentStream(BaseModel):
    """WebSocket push payload"""
    type: Literal["incident", "ping", "error"] = "incident"
    data: Optional[CorrelationIncident] = None
    message: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# Artifacts (PGP, Wallets, Fingerprints, Stylometry)
# ─────────────────────────────────────────────────────────────────────────────
class PGPKey(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    fingerprint: str
    uid: str
    algorithm: str
    networks: List[NetworkType]
    sightings: str
    first_seen: str
    last_seen: str


class FaviconCollision(BaseModel):
    mmh3_hash: str
    matches: int
    sites: List[str]
    description: str
    etag: Optional[str] = None


class StylemetryCluster(BaseModel):
    cluster_id: str
    primary_handle: str
    match_score: str  # e.g. "96.8%"
    aliases: List[Dict[str, str]]  # [{network, handle}]
    shared_markers: str


class AttributionVaultResponse(BaseModel):
    pgp_keys: List[PGPKey]
    favicon_collisions: List[FaviconCollision]
    stylometry_clusters: List[StylemetryCluster]
    total_pgp: int
    total_wallets: int


# ─────────────────────────────────────────────────────────────────────────────
# SIEM Rules
# ─────────────────────────────────────────────────────────────────────────────
class SIEMRule(BaseModel):
    id: str
    name: str
    pattern: str
    scope: str
    hits_24h: int = 0
    action: str
    enabled: bool = True
    last_triggered: Optional[str] = None


class SIEMRulesResponse(BaseModel):
    rules: List[SIEMRule]
    total: int
    total_hits_24h: int


class PushRulesResponse(BaseModel):
    pushed: int
    workers_notified: int
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Action Responses
# ─────────────────────────────────────────────────────────────────────────────
class ActionResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class STIXBundle(BaseModel):
    type: str = "bundle"
    id: str = Field(default_factory=lambda: f"bundle--{uuid.uuid4()}")
    spec_version: str = "2.1"
    objects: List[Dict[str, Any]]


class EscalateRequest(BaseModel):
    incident_id: str
    target: Literal["wazuh", "misp", "both"] = "both"
    priority: Literal["P1", "P2", "P3"] = "P1"
