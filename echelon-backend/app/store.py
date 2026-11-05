"""
ECHELON Backend — In-Memory Data Store
Holds all live state: daemon statuses, crawl queue, incidents, artifacts.
In production, replace with Redis + PostgreSQL + Neo4j.
"""
from __future__ import annotations
import asyncio
import random
import time
from copy import deepcopy
from datetime import datetime, timezone
from typing import Callable, Dict, List, Optional

from app.models.schemas import (
    ArtifactCounts,
    AttributionVaultResponse,
    CorrelationIncident,
    CrawlJob,
    DaemonStatus,
    FaviconCollision,
    GraphEdge,
    GraphNode,
    PGPKey,
    SIEMRule,
    StylemetryCluster,
)


# ─────────────────────────────────────────────────────────────────────────────
# Seed Data — mirrors the frontend's static constants exactly
# ─────────────────────────────────────────────────────────────────────────────
_INITIAL_DAEMONS: List[DaemonStatus] = [
    DaemonStatus(
        id="TOR-POOL-01",
        network="TOR",
        name="tor-socks5-cluster (v3 Onion)",
        endpoint="socks5h://127.0.0.1:9050..9074",
        control_port="tcp://127.0.0.1:9051 (Stem Auth)",
        status="ONLINE",
        circuits=24,
        avg_latency="410ms",
        bandwidth="18.4 MB/s",
        specific_metric="HSv3 Descriptors Cached: 3,842",
        color="purple",
    ),
    DaemonStatus(
        id="I2P-SAM-02",
        network="I2P",
        name="i2pd-garlic-router (SAM v3.3)",
        endpoint="http://127.0.0.1:4444 | SAM :7656",
        control_port="i2pcontrol://127.0.0.1:7650",
        status="ONLINE",
        circuits=18,
        avg_latency="685ms",
        bandwidth="9.2 MB/s",
        specific_metric="NetDB Floodfill Peers: 1,428 | Tunnel Build: 71%",
        color="emerald",
    ),
    DaemonStatus(
        id="ZN-DHT-03",
        network="ZERONET",
        name="zeronet-p2p-tracker (BitTorrent + BTC)",
        endpoint="ws://127.0.0.1:43110/ZeroNet-Internal",
        control_port="ZeroFrame API + Tor Always-Mode",
        status="ONLINE",
        circuits=312,
        avg_latency="195ms",
        bandwidth="34.1 MB/s",
        specific_metric="Seeded Zites: 312 | Verified content.json: 14,910",
        color="amber",
    ),
    DaemonStatus(
        id="CORR-NEO4J-04",
        network="ENGINE",
        name="prism-correlation-graph (Neo4j + pgvector)",
        endpoint="bolt://10.240.0.15:7687",
        control_port="Redis Streams: darknet_ingest_v2",
        status="SYNCED",
        circuits=16,
        avg_latency="12ms",
        bandwidth="1420 docs/m",
        specific_metric="Cross-Overlay Identity Links: 9,412 | SIEM Rules: 84",
        color="cyan",
    ),
]

_INITIAL_NODES: List[GraphNode] = [
    GraphNode(
        id="ACTOR-01",
        label='APT-SHADOW // "KromSec_Admin"',
        sub="Threat Actor Persona",
        type="ACTOR",
        network="TOR",
        x=490, y=215,
        confidence="99.2%",
        details={
            "role": "Ransomware Affiliate & 0-Day Broker",
            "languages": "Russian (Native), English (Technical)",
            "stylometryMatch": "96.8% cosine similarity across RAMP (Tor) and RuBoard (.i2p)",
            "firstObserved": "2025-11-04 UTC",
            "activeIncidents": 4,
        },
    ),
    GraphNode(
        id="PGP-01",
        label="PGP: 0x9F8B...44C1",
        sub="Ed25519 Identity Key",
        type="ARTIFACT",
        network="CRYPTO",
        x=310, y=120,
        confidence="100%",
        details={
            "fingerprint": "9F8B 772A 109C E481 9920 B31F 8842 110E 009A 44C1",
            "uid": "kromsec_escrow@secmail.pro",
            "reusedOn": "Signed Tor Leak blog posts + I2P Jabber OTR + ZeroNet Zite admin cert",
        },
    ),
    GraphNode(
        id="WALLET-01",
        label="BTC: bc1qxy2kg...w8h2",
        sub="Escrow & Ransom Cluster",
        type="ARTIFACT",
        network="CRYPTO",
        x=685, y=120,
        confidence="97.5%",
        details={
            "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            "volume": "48.92 BTC ($4.31M USD)",
            "mixerHop": "Peel-chain to Sinbad/ChipMixer successor -> Monero atomic swap",
        },
    ),
    GraphNode(
        id="TOR-NODE-01",
        label="lockbit742...v3.onion",
        sub="TOR v3 Extortion Portal",
        type="SERVICE",
        network="TOR",
        x=160, y=235,
        confidence="99.0%",
        details={
            "fullAddress": "lockbit742x9q0p2m7n8k1l3j5h6g4f2d1s9a8z7x6c5v4b3n2m1.onion",
            "hsDescriptor": "HSv3 blinded key rotated 4h ago | Intro Points: 3",
            "faviconHash": "MurmurHash3: -1198420911 (Matches I2P mirror)",
            "leakedServerHeader": 'nginx/1.24.0 (Ubuntu) | ETag: "6728a1-1f4"',
        },
    ),
    GraphNode(
        id="I2P-NODE-01",
        label="vx9k2m...b32.i2p",
        sub="I2P Garlic C2 & Jabber Forum",
        type="SERVICE",
        network="I2P",
        x=335, y=350,
        confidence="96.4%",
        details={
            "fullAddress": "vx9k2m8n4p1q7r3s5t6u0w2y4z8a1c3e5g7i9k0m2o4q6s8u0w.b32.i2p",
            "leaseSet": "LeaseSet2 Encrypted (ElGamal/ECIES-X25519-AEAD-Ratchet)",
            "tunnels": "3 Inbound / 3 Outbound (Length: 3 hops)",
            "linkedBy": "Identical Favicon MurmurHash3 & PGP key 0x9F8B...44C1",
        },
    ),
    GraphNode(
        id="ZN-NODE-01",
        label="1ShadowLeak9x...8Kp",
        sub="ZeroNet P2P Dead-Drop Zite",
        type="SERVICE",
        network="ZERONET",
        x=655, y=350,
        confidence="98.1%",
        details={
            "fullAddress": "1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp",
            "contentJsonSig": "Signed by Bitcoin PrivKey corresponding to 1Shadow...8Kp",
            "peersSeeding": "47 BitTorrent DHT Peers (19 via Tor Onion routing, 28 Clearnet)",
            "linkedBy": "Distributes .torrent magnet links for SQL dumps announced on Tor",
        },
    ),
    GraphNode(
        id="SIEM-CORP-01",
        label="CORP-ASSET: api.fin-core.internal",
        sub="Wazuh SIEM Alert Match",
        type="SIEM",
        network="SIEM",
        x=840, y=235,
        confidence="98.9%",
        details={
            "alertId": "WAZUH-CRIT-88412",
            "correlationType": "Leaked .env & JWT Secret found inside ZeroNet SQL chunk #14",
            "exposedCreds": "142 Employee Corporate Emails + AWS_SECRET_ACCESS_KEY",
            "autoAction": "SOAR Playbook triggered: Key revoked & BGP sinkhole active",
        },
    ),
]

_INITIAL_EDGES: List[GraphEdge] = [
    GraphEdge(**{"from": "ACTOR-01", "to": "PGP-01", "label": "Signs Releases"}),
    GraphEdge(**{"from": "ACTOR-01", "to": "WALLET-01", "label": "Controls Escrow"}),
    GraphEdge(**{"from": "PGP-01", "to": "TOR-NODE-01", "label": "PGP /pgp.txt"}),
    GraphEdge(**{"from": "PGP-01", "to": "I2P-NODE-01", "label": "Same Keyring"}),
    GraphEdge(**{"from": "ACTOR-01", "to": "I2P-NODE-01", "label": "96.8% Stylometry"}),
    GraphEdge(**{"from": "ACTOR-01", "to": "ZN-NODE-01", "label": "Signs content.json"}),
    GraphEdge(**{"from": "WALLET-01", "to": "ZN-NODE-01", "label": "BTC Key Reuse"}),
    GraphEdge(**{"from": "TOR-NODE-01", "to": "I2P-NODE-01", "label": "Favicon & ETag Match"}),
    GraphEdge(**{"from": "ZN-NODE-01", "to": "SIEM-CORP-01", "label": "Leaked Corp Creds!"}),
]

_INITIAL_INCIDENTS: List[CorrelationIncident] = [
    CorrelationIncident(
        id="INC-2026-9941",
        timestamp="14:52:19.084 UTC",
        severity="CRITICAL",
        score=99,
        networks=["TOR", "ZERONET", "SIEM"],
        title="Corporate JWT Secret & DB Dump Cross-Seeded on ZeroNet + Tor",
        primary_target="1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp",
        secondary_target="lockbit742x9q0p2m...v3.onion",
        correlation_basis="YARA Rule [rule_Corp_Env_Leak] matched inside ZeroNet content.json SQLite shard; identical SHA-256 announced 4 mins prior on Tor v3 ransom blog.",
        pgp_key="0x9F8B772A109CE481",
        btc_wallet="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
        dom_hash="mmh3:-1198420911",
        raw_descriptor='{\n  "zeronet_site": "1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp",\n  "leaked_keys": ["AKIAIOSFODNN7EXAMPLE", "jwt_hs256_prod_secret"]\n}',
    ),
    CorrelationIncident(
        id="INC-2026-9940",
        timestamp="14:51:04.612 UTC",
        severity="CRITICAL",
        score=96,
        networks=["TOR", "I2P"],
        title="Tor Ransomware Portal Mirrored to Encrypted I2P Eepsite (Favicon + ETag Collision)",
        primary_target="vx9k2m8n4p1q7r3s5t6u0w2y4z8a1c3e5g7i9k0m2o4q6s8u0w.b32.i2p",
        secondary_target="lockbit742x9q0p2m...v3.onion",
        correlation_basis='Identical HTTP ETag ("6728a1-1f4"), CSS AST structure, and MurmurHash3 favicon (-1198420911) detected across Tor HSv3 and I2P Garlic LeaseSet2.',
        pgp_key="0x9F8B772A109CE481",
        btc_wallet="44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A",
        dom_hash="mmh3:-1198420911",
        raw_descriptor="[I2P LEASESET2 HEADER]\nDestination: vx9k2m8...b32.i2p\nEncryptionType: ECIES-X25519-AEAD-Ratchet\nHTTP Fingerprint:\n  ETag: \"6728a1-1f4\" (COLLISION WITH TOR HSv3)",
    ),
    CorrelationIncident(
        id="INC-2026-9939",
        timestamp="14:48:33.190 UTC",
        severity="HIGH",
        score=91,
        networks=["I2P", "SIEM"],
        title="Zero-Day FortiOS / Ivanti Exploit PoC Traded on I2P Garlic Forum",
        primary_target="exploitdb-dark.i2p (k9p2m1...b32.i2p)",
        secondary_target="CVE-2026-21904 (Unauthenticated RCE)",
        correlation_basis="NLP Threat Extractor flagged Python exploit script targeting URI `/api/v2/fabric/s2s-tunnel`. Matches 19 anomalous probes seen on AegisTrap Perimeter Honeypot.",
        pgp_key="0x44C18890AABB1122",
        btc_wallet="bc1q99887766554433221100aabbccddeeff001122",
        dom_hash="mmh3:884120944",
        raw_descriptor="POST /thread/88412 HTTP/1.1\nHost: exploitdb-dark.i2p\nAttachment: cve_2026_21904_rce.py (SHA256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069)",
    ),
    CorrelationIncident(
        id="INC-2026-9938",
        timestamp="14:44:10.502 UTC",
        severity="HIGH",
        score=88,
        networks=["ZERONET", "TOR"],
        title="Clearnet IP Leak via Misconfigured ZeroNet Peer Tracker Announcement",
        primary_target="1BotnetC2Panel77x...9Qm",
        secondary_target="185.220.101.34:15441 (ASN: AS49453)",
        correlation_basis="Threat actor updated ZeroNet Zite without `tor: always` flag; initial BitTorrent DHT announce exposed real origin IP 185.220.101.34.",
        pgp_key="0x7712EEFF00119988",
        btc_wallet="1BotnetC2Panel77xLmN9vB2kR4tY8wZ9Qm",
        dom_hash="mmh3:441920112",
        raw_descriptor="[ZERONET DHT ANNOUNCE INTERCEPT]\nip_exposed: 185.220.101.34\nport: 15441\nDe-anonymization Confidence: 99.8%",
    ),
]

_INITIAL_CRAWL_QUEUE: List[CrawlJob] = [
    CrawlJob(
        id="CRW-801",
        network="TOR",
        uri="http://lockbit742x9q0p2m7n8k1l3j5h6g4f2d1s9a8z7x6c5v4b3n2m1.onion/leaks",
        title="LockBit 4.0 // Extortion & Data Release Portal",
        status="200 OK",
        latency="480ms",
        depth=3,
        dom_hash="mmh3:-1198420911",
        artifacts=ArtifactCounts(pgp=2, wallets=14, emails=89, cves=0, archives=6),
        last_crawled="4s ago",
        sanitized_dom='<!DOCTYPE html>\n<html lang="ru">\n<head><title>LockBit 4.0 - Official Mirror</title>\n  <meta name="pgp-fingerprint" content="9F8B 772A 109C E481 9920 B31F 8842 110E 009A 44C1" />\n</head>\n<body>\n  <div class="victim-card" data-company="fin-core.internal">\n    <h2>fin-core.internal (489 MB SQL + .env Keys)</h2>\n    <code class="btc-escrow">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</code>\n  </div>\n</body>\n</html>',
    ),
    CrawlJob(
        id="CRW-802",
        network="I2P",
        uri="http://vx9k2m8n4p1q7r3s5t6u0w2y4z8a1c3e5g7i9k0m2o4q6s8u0w.b32.i2p/forum/",
        title="KromSec Jabber & Eepsite Underground Board",
        status="200 OK (Garlic)",
        latency="740ms",
        depth=4,
        dom_hash="mmh3:-1198420911",
        artifacts=ArtifactCounts(pgp=9, wallets=22, emails=14, cves=5, archives=3),
        last_crawled="11s ago",
        sanitized_dom="<!-- I2P SAMv3 HTTP Proxy Intercept | LeaseSet2 Verified -->\n<html><body>\n  <pre class='motd'>\n  -----BEGIN PGP SIGNED MESSAGE-----\n  KeyID: 0x9F8B772A109CE481\n  -----END PGP SIGNATURE-----\n  </pre>\n</body></html>",
    ),
    CrawlJob(
        id="CRW-803",
        network="ZERONET",
        uri="zeronet://1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp/content.json",
        title="ShadowLeak Decentralized Dump Repository (P2P Zite)",
        status="VERIFIED (47 Peers)",
        latency="140ms",
        depth=2,
        dom_hash="sha512:a9f8e7d6",
        artifacts=ArtifactCounts(pgp=1, wallets=4, emails=412, cves=1, archives=19),
        last_crawled="19s ago",
        sanitized_dom='{\n  "address": "1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp",\n  "description": "Censorship-resistant ransomware & SQL dump distribution via BitTorrent DHT"\n}',
    ),
    CrawlJob(
        id="CRW-804",
        network="TOR",
        uri="http://ramp4u7k9m2n4p8q1r3s5t7v9w2x4y6z8a1b3c5d7e9f0g2h4j6k8l0.onion/threads/0day",
        title="RAMP // Russian Anonymous Marketplace & Initial Access",
        status="200 OK (JS-Solved)",
        latency="615ms",
        depth=5,
        dom_hash="mmh3:773190422",
        artifacts=ArtifactCounts(pgp=34, wallets=61, emails=19, cves=12, archives=4),
        last_crawled="27s ago",
        sanitized_dom='<!-- Playwright Stealth Solver bypassed PoW SHA256 Captcha in 1.4s -->\n<div class="thread-post" data-author="KromSec_Admin" data-uid="4912">\n  <p>[SELLING] Production AWS + Kubernetes kubeconfig for Asian FinTech</p>\n  <p>Price: 2.5 BTC | Escrow via PGP 0x9F8B772A109CE481</p>\n</div>',
    ),
    CrawlJob(
        id="CRW-805",
        network="I2P",
        uri="http://postman.i2p/hq-tracker/announce",
        title="I2P Postman Torrent & Eepsite Directory",
        status="200 OK (Garlic)",
        latency="530ms",
        depth=2,
        dom_hash="mmh3:209481123",
        artifacts=ArtifactCounts(pgp=6, wallets=8, emails=4, cves=0, archives=84),
        last_crawled="38s ago",
        sanitized_dom="<!-- Extracted 84 new .i2p info_hashes and 12 newly registered b32.i2p addressbook hosts.txt entries -->",
    ),
]

_SIEM_RULES: List[SIEMRule] = [
    SIEMRule(
        id="RULE-CORP-01",
        name="Corporate Domain & VIP Credential Canary",
        pattern=r"(fin-core\.internal|@fincore-bd\.com|AKIA[0-9A-Z]{16})",
        scope="Tor + I2P + ZeroNet Optional Archives",
        hits_24h=3,
        action="Webhook -> Wazuh SIEM + PagerDuty P1",
    ),
    SIEMRule(
        id="RULE-DEANON-02",
        name="Cross-Overlay Favicon & ETag Mirror Detector",
        pattern="neo4j_cypher: match_shared_favicon_mmh3_or_etag()",
        scope="Tor HSv3 <-> I2P LeaseSet2",
        hits_24h=7,
        action="Auto-Link in Neo4j Graph + Enrich MISP Event",
    ),
    SIEMRule(
        id="RULE-ZNET-03",
        name="ZeroNet Clearnet Peer Seeder De-Anonymizer",
        pattern="dht_announce.tor_mode == False AND rev_seeder_count == 1",
        scope="ZeroNet BitTorrent DHT Tracker",
        hits_24h=2,
        action="Log Real Attacker IP + Query Shodan/AbuseIPDB",
    ),
    SIEMRule(
        id="RULE-0DAY-04",
        name="Unpatched Perimeter Appliance Exploit PoC Monitor",
        pattern=r"(CVE-2026-21904|FortiOS|Ivanti|PAN-OS).{0,50}(exploit|RCE|0day)",
        scope="RAMP + Dread + I2P Eepsite Forums",
        hits_24h=11,
        action="Sandbox PoC + Auto-Generate Suricata/YARA Rule",
    ),
]

_VAULT_DATA = AttributionVaultResponse(
    pgp_keys=[
        PGPKey(
            id="pgp-01",
            fingerprint="9F8B 772A 109C E481 9920 B31F 8842 110E 009A 44C1",
            uid="KromSec_Admin <kromsec@secmail.pro>",
            algorithm="Ed25519 (4096-bit subkey)",
            networks=["TOR", "I2P", "ZERONET"],
            sightings="38 signed ransom notes + I2P OTR key match",
            first_seen="2025-11-04 UTC",
            last_seen="2026-11-05 UTC",
        ),
        PGPKey(
            id="pgp-02",
            fingerprint="44C1 8890 AABB 1122 3344 5566 7788 9900 CCdd EEFF",
            uid="0xR00t_Broker <r00t@postman.i2p>",
            algorithm="RSA 4096-bit",
            networks=["TOR", "I2P"],
            sightings="Signed CVE-2026-21904 PoC archive on RAMP & I2P",
            first_seen="2026-01-15 UTC",
            last_seen="2026-11-04 UTC",
        ),
    ],
    favicon_collisions=[
        FaviconCollision(
            mmh3_hash="-1198420911",
            matches=3,
            sites=["lockbit742...onion", "vx9k2m...b32.i2p", "185.220.101.34:8443"],
            description="Identical `.ico` byte stream served across Tor HSv3, I2P Garlic, and Clearnet IP.",
            etag='"6728a1-1f4"',
        ),
        FaviconCollision(
            mmh3_hash="884120944",
            matches=2,
            sites=["exploitdb-dark.i2p", "k9p2m1...b32.i2p"],
            description="Shared favicon across multiple I2P eepsite addresses for the same exploit forum.",
        ),
    ],
    stylometry_clusters=[
        StylemetryCluster(
            cluster_id="CLU-09",
            primary_handle="KromSec_Admin",
            match_score="96.8%",
            aliases=[
                {"network": "TOR (RAMP)", "handle": "KromSec_Admin"},
                {"network": "I2P (RuBoard)", "handle": "Ghost_S7_PLC"},
                {"network": "ZeroNet (ZeroTalk)", "handle": "kromsec@zeroid.bit"},
            ],
            shared_markers="Cyrillic-to-ASCII transliteration quirks, double-hyphen spacing (` -- `), identical Python exception handling snippets.",
        ),
    ],
    total_pgp=142,
    total_wallets=89,
)


# ─────────────────────────────────────────────────────────────────────────────
# In-Memory Store Class
# ─────────────────────────────────────────────────────────────────────────────
class DataStore:
    """Thread-safe (asyncio) in-memory store for ECHELON operational data."""

    def __init__(self):
        self.daemons: List[DaemonStatus] = deepcopy(_INITIAL_DAEMONS)
        self.crawl_queue: List[CrawlJob] = deepcopy(_INITIAL_CRAWL_QUEUE)
        self.incidents: List[CorrelationIncident] = deepcopy(_INITIAL_INCIDENTS)
        self.graph_nodes: List[GraphNode] = deepcopy(_INITIAL_NODES)
        self.graph_edges: List[GraphEdge] = deepcopy(_INITIAL_EDGES)
        self.siem_rules: List[SIEMRule] = deepcopy(_SIEM_RULES)
        self.vault: AttributionVaultResponse = deepcopy(_VAULT_DATA)
        self._incident_subscribers: List[Callable] = []
        self._lock = asyncio.Lock()

    # ── Daemon Methods ────────────────────────────────────────────────────────
    def get_daemons(self) -> List[DaemonStatus]:
        return self.daemons

    async def update_daemon_latency(self):
        """Simulate or query live telemetry updates — called by background task."""
        async with self._lock:
            # Query real Tor circuit count if stem is available
            try:
                from app.services.tor_control import get_circuit_info
                tor_info = await get_circuit_info()
            except Exception:
                tor_info = {"status": "ONLINE", "circuit_count": 18, "mode": "simulated"}

            for d in self.daemons:
                if d.network == "TOR":
                    d.circuits = tor_info.get("circuit_count", d.circuits)
                    d.status = tor_info.get("status", "ONLINE")
                    mode = tor_info.get("mode", "live")
                    d.avg_latency = f"{random.randint(390, 460)}ms"
                    d.specific_metric = f"Active Circuits: {d.circuits} ({mode.upper()}) | HSv3 Descriptors: 3,842"
                elif d.network == "I2P":
                    d.avg_latency = f"{random.randint(620, 760)}ms"
                elif d.network == "ZERONET":
                    d.avg_latency = f"{random.randint(160, 225)}ms"

    async def set_daemon_status(self, daemon_id: str, status: str):
        async with self._lock:
            for d in self.daemons:
                if d.id == daemon_id:
                    d.status = status
                    break

    # ── Crawl Queue Methods ───────────────────────────────────────────────────
    def get_crawl_queue(self) -> List[CrawlJob]:
        return self.crawl_queue

    def get_crawl_job(self, job_id: str) -> Optional[CrawlJob]:
        return next((j for j in self.crawl_queue if j.id == job_id), None)

    async def add_crawl_job(self, job: CrawlJob):
        async with self._lock:
            self.crawl_queue.insert(0, job)

    async def update_crawl_job(self, job_id: str, **kwargs):
        async with self._lock:
            for job in self.crawl_queue:
                if job.id == job_id:
                    for key, val in kwargs.items():
                        setattr(job, key, val)
                    break

    # ── Incident Methods ──────────────────────────────────────────────────────
    def get_incidents(self, network_filter: Optional[str] = None, search: Optional[str] = None) -> List[CorrelationIncident]:
        results = self.incidents
        if network_filter and network_filter != "ALL":
            results = [i for i in results if network_filter in i.networks]
        if search:
            q = search.lower()
            results = [
                i for i in results
                if q in i.title.lower()
                or q in i.primary_target.lower()
                or q in i.pgp_key.lower()
                or q in i.btc_wallet.lower()
                or q in i.correlation_basis.lower()
            ]
        return results

    def get_incident(self, incident_id: str) -> Optional[CorrelationIncident]:
        return next((i for i in self.incidents if i.id == incident_id), None)

    async def add_incident(self, incident: CorrelationIncident):
        async with self._lock:
            self.incidents.insert(0, incident)
        # Notify WebSocket subscribers
        for callback in self._incident_subscribers:
            try:
                await callback(incident)
            except Exception:
                pass

    def subscribe_incidents(self, callback: Callable):
        self._incident_subscribers.append(callback)

    def unsubscribe_incidents(self, callback: Callable):
        self._incident_subscribers = [c for c in self._incident_subscribers if c != callback]

    # ── Graph Methods ─────────────────────────────────────────────────────────
    def get_graph(self):
        return self.graph_nodes, self.graph_edges

    def get_node_neighbors(self, node_id: str):
        connected_edges = [
            e for e in self.graph_edges
            if e.from_node == node_id or e.to_node == node_id
        ]
        neighbor_ids = set()
        for e in connected_edges:
            neighbor_ids.add(e.from_node)
            neighbor_ids.add(e.to_node)
        neighbor_ids.discard(node_id)
        neighbors = [n for n in self.graph_nodes if n.id in neighbor_ids]
        return neighbors, connected_edges

    def add_graph_node(self, node: GraphNode):
        self.graph_nodes.append(node)

    def add_graph_edge(self, edge: GraphEdge):
        self.graph_edges.append(edge)

    # ── SIEM Rules Methods ────────────────────────────────────────────────────
    def get_rules(self) -> List[SIEMRule]:
        return self.siem_rules

    def get_rule(self, rule_id: str) -> Optional[SIEMRule]:
        return next((r for r in self.siem_rules if r.id == rule_id), None)

    async def increment_rule_hits(self, rule_id: str):
        async with self._lock:
            for r in self.siem_rules:
                if r.id == rule_id:
                    r.hits_24h += 1
                    r.last_triggered = datetime.now(timezone.utc).isoformat()
                    break

    # ── Vault / Attribution Methods ───────────────────────────────────────────
    def get_vault(self) -> AttributionVaultResponse:
        return self.vault


# Singleton store instance
store = DataStore()
