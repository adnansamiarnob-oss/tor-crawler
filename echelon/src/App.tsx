import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ShieldAlert, Globe, Terminal, Activity, Cpu, Database, Search, Play, Pause,
  Plus, Download, RefreshCw, AlertTriangle, CheckCircle2, Eye, Lock, Zap,
  Crosshair, FileCode, Layers, Radio, ChevronRight, X, Copy, Check, Server,
  Share2, Network, Code, Bug, Flame, ArrowUpRight, Key, Fingerprint, GitBranch,
  HardDrive, Radar, Workflow, Sliders, ExternalLink, Box, Braces, Wifi, WifiOff
} from 'lucide-react';
import { api, connectIncidentStream, checkBackendAvailable } from './api/client.js';

// ============================================================================
// 1. MULTI-OVERLAY DAEMON & PROXY TELEMETRY
// ============================================================================
const INITIAL_DAEMONS = [
  {
    id: 'TOR-POOL-01',
    network: 'TOR',
    name: 'tor-socks5-cluster (v3 Onion)',
    endpoint: 'socks5h://127.0.0.1:9050..9074',
    controlPort: 'tcp://127.0.0.1:9051 (Stem Auth)',
    status: 'ONLINE',
    circuits: 24,
    avgLatency: '410ms',
    bandwidth: '18.4 MB/s',
     specificMetric: 'HSv3 Descriptors Cached: 3,842',
    color: 'purple'
  },
  {
    id: 'I2P-SAM-02',
    network: 'I2P',
    name: 'i2pd-garlic-router (SAM v3.3)',
    endpoint: 'http://127.0.0.1:4444 | SAM :7656',
    controlPort: 'i2pcontrol://127.0.0.1:7650',
    status: 'ONLINE',
    circuits: 18,
    avgLatency: '685ms',
    bandwidth: '9.2 MB/s',
    specificMetric: 'NetDB Floodfill Peers: 1,428 | Tunnel Build: 71%',
    color: 'emerald'
  },
  {
    id: 'ZN-DHT-03',
    network: 'ZERONET',
    name: 'zeronet-p2p-tracker (BitTorrent + BTC)',
    endpoint: 'ws://127.0.0.1:43110/ZeroNet-Internal',
    controlPort: 'ZeroFrame API + Tor Always-Mode',
    status: 'ONLINE',
    circuits: 312,
    avgLatency: '195ms',
    bandwidth: '34.1 MB/s',
    specificMetric: 'Seeded Zites: 312 | Verified content.json: 14,910',
    color: 'amber'
  },
  {
    id: 'CORR-NEO4J-04',
    network: 'ENGINE',
    name: 'prism-correlation-graph (Neo4j + pgvector)',
    endpoint: 'bolt://10.240.0.15:7687',
    controlPort: 'Redis Streams: darknet_ingest_v2',
    status: 'SYNCED',
    circuits: 16,
    avgLatency: '12ms',
    bandwidth: '1420 docs/m',
    specificMetric: 'Cross-Overlay Identity Links: 9,412 | SIEM Rules: 84',
    color: 'cyan'
  }
];

// ============================================================================
// 2. CROSS-OVERLAY ENTITY CORRELATION GRAPH NODES & EDGES
// ============================================================================
const GRAPH_NODES = [
  {
    id: 'ACTOR-01',
    label: 'APT-SHADOW // "KromSec_Admin"',
    sub: 'Threat Actor Persona',
    type: 'ACTOR',
    network: 'CORE',
    x: 490,
    y: 215,
    confidence: '99.2%',
    details: {
      role: 'Ransomware Affiliate & 0-Day Broker',
      languages: 'Russian (Native), English (Technical)',
      stylometryMatch: '96.8% cosine similarity across RAMP (Tor) and RuBoard (.i2p)',
      firstObserved: '2025-11-04 UTC',
      activeIncidents: 4
    }
  },
  {
    id: 'PGP-01',
    label: 'PGP: 0x9F8B...44C1',
    sub: 'Ed25519 Identity Key',
    type: 'ARTIFACT',
    network: 'CRYPTO',
    x: 310,
    y: 120,
    confidence: '100%',
    details: {
      fingerprint: '9F8B 772A 109C E481 9920 B31F 8842 110E 009A 44C1',
      uid: 'kromsec_escrow@secmail.pro',
      reusedOn: 'Signed Tor Leak blog posts + I2P Jabber OTR + ZeroNet Zite admin cert'
    }
  },
  {
    id: 'WALLET-01',
    label: 'BTC: bc1qxy2kg...w8h2',
    sub: 'Escrow & Ransom Cluster',
    type: 'ARTIFACT',
    network: 'CRYPTO',
    x: 685,
    y: 120,
    confidence: '97.5%',
    details: {
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      volume: '48.92 BTC ($4.31M USD)',
      mixerHop: 'Peel-chain to Sinbad/ChipMixer successor -> Monero atomic swap'
    }
  },
  {
    id: 'TOR-NODE-01',
    label: 'lockbit742...v3.onion',
    sub: 'TOR v3 Extortion Portal',
    type: 'SERVICE',
    network: 'TOR',
    x: 160,
    y: 235,
    confidence: '99.0%',
    details: {
      fullAddress: 'lockbit742x9q0p2m7n8k1l3j5h6g4f2d1s9a8z7x6c5v4b3n2m1.onion',
      hsDescriptor: 'HSv3 blinded key rotated 4h ago | Intro Points: 3',
      faviconHash: 'MurmurHash3: -1198420911 (Matches I2P mirror)',
      leakedServerHeader: 'nginx/1.24.0 (Ubuntu) | ETag: "6728a1-1f4"'
    }
  },
  {
    id: 'I2P-NODE-01',
    label: 'vx9k2m...b32.i2p',
    sub: 'I2P Garlic C2 & Jabber Forum',
    type: 'SERVICE',
    network: 'I2P',
    x: 335,
    y: 350,
    confidence: '96.4%',
    details: {
      fullAddress: 'vx9k2m8n4p1q7r3s5t6u0w2y4z8a1c3e5g7i9k0m2o4q6s8u0w.b32.i2p',
      leaseSet: 'LeaseSet2 Encrypted (ElGamal/ECIES-X25519-AEAD-Ratchet)',
      inunnels: '3 Inbound / 3 Outbound (Length: 3 hops)',
      linkedBy: 'Identical Favicon MurmurHash3 & PGP key 0x9F8B...44C1'
    }
  },
  {
    id: 'ZN-NODE-01',
    label: '1ShadowLeak9x...8Kp',
    sub: 'ZeroNet P2P Dead-Drop Zite',
    type: 'SERVICE',
    network: 'ZERONET',
    x: 655,
    y: 350,
    confidence: '98.1%',
    details: {
      fullAddress: '1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp',
      contentJsonSig: 'Signed by Bitcoin PrivKey corresponding to 1Shadow...8Kp',
      peersSeeding: '47 BitTorrent DHT Peers (19 via Tor Onion routing, 28 Clearnet)',
      linkedBy: 'Distributes .torrent magnet links for SQL dumps announced on Tor'
    }
  },
  {
    id: 'SIEM-CORP-01',
    label: 'CORP-ASSET: api.fin-core.internal',
    sub: 'Wazuh SIEM Alert Match',
    type: 'SIEM',
    network: 'SIEM',
    x: 840,
    y: 235,
    confidence: '98.9%',
    details: {
      alertId: 'WAZUH-CRIT-88412',
      correlationType: 'Leaked .env & JWT Secret found inside ZeroNet SQL chunk #14',
      exposedCreds: '142 Employee Corporate Emails + AWS_SECRET_ACCESS_KEY',
      autoAction: 'SOAR Playbook triggered: Key revoked & BGP sinkhole active'
    }
  }
];

const GRAPH_EDGES = [
  { from: 'ACTOR-01', to: 'PGP-01', label: 'Signs Releases' },
  { from: 'ACTOR-01', to: 'WALLET-01', label: 'Controls Escrow' },
  { from: 'PGP-01', to: 'TOR-NODE-01', label: 'PGP /pgp.txt' },
  { from: 'PGP-01', to: 'I2P-NODE-01', label: 'Same Keyring' },
  { from: 'ACTOR-01', to: 'I2P-NODE-01', label: '96.8% Stylometry' },
  { from: 'ACTOR-01', to: 'ZN-NODE-01', label: 'Signs content.json' },
  { from: 'WALLET-01', to: 'ZN-NODE-01', label: 'BTC Key Reuse' },
  { from: 'TOR-NODE-01', to: 'I2P-NODE-01', label: 'Favicon & ETag Match' },
  { from: 'ZN-NODE-01', to: 'SIEM-CORP-01', label: 'Leaked Corp Creds!' }
];

// ============================================================================
// 3. REAL-TIME MULTI-NETWORK INCIDENT CORRELATION STREAM
// ============================================================================
const INITIAL_CORRELATIONS = [
  {
    id: 'INC-2026-9941',
    timestamp: '14:52:19.084 UTC',
    severity: 'CRITICAL',
    score: 99,
    networks: ['TOR', 'ZERONET', 'SIEM'],
    title: 'Corporate JWT Secret & DB Dump Cross-Seeded on ZeroNet + Tor',
    primaryTarget: '1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp',
    secondaryTarget: 'lockbit742x9q0p2m...v3.onion',
    correlationBasis: 'YARA Rule [rule_Corp_Env_Leak] matched inside ZeroNet content.json SQLite shard; identical SHA-256 announced 4 mins prior on Tor v3 ransom blog.',
    pgpKey: '0x9F8B772A109CE481',
    btcWallet: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    domHash: 'mmh3:-1198420911',
    rawDescriptor: `{
  "zeronet_site": "1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp",
  "content_json_modified": 1762372910,
  "signers_sign": "H9xPq8LmN2vB5kR7tY4wZ1cX8Kp9912048120...",
  "files": {
    "dumps/fin_core_prod_2026.sql.7z": {
      "sha512": "a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1...",
      "size": 489120412
    }
  },
  "siem_correlation": {
    "matched_domain": "fin-core.internal",
    "leaked_keys": ["AKIAIOSFODNN7EXAMPLE", "jwt_hs256_prod_secret"]
  }
}`
  },
  {
    id: 'INC-2026-9940',
    timestamp: '14:51:04.612 UTC',
    severity: 'CRITICAL',
    score: 96,
    networks: ['TOR', 'I2P'],
    title: 'Tor Ransomware Portal Mirrored to Encrypted I2P Eepsite (Favicon + ETag Collision)',
    primaryTarget: 'vx9k2m8n4p1q7r3s5t6u0w2y4z8a1c3e5g7i9k0m2o4q6s8u0w.b32.i2p',
    secondaryTarget: 'lockbit742x9q0p2m...v3.onion',
    correlationBasis: 'Identical HTTP ETag ("6728a1-1f4"), CSS AST structure, and MurmurHash3 favicon (-1198420911) detected across Tor HSv3 and I2P Garlic LeaseSet2.',
    pgpKey: '0x9F8B772A109CE481',
    btcWallet: '44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A',
    domHash: 'mmh3:-1198420911',
    rawDescriptor: `[I2P LEASESET2 HEADER]
Destination: vx9k2m8n4p1q7r3s5t6u0w2y4z8a1c3e5g7i9k0m2o4q6s8u0w.b32.i2p
EncryptionType: ECIES-X25519-AEAD-Ratchet (Type 4)
SignatureType: EdDSA-SHA512-Ed25519 (Type 7)
Tunnels:
  - GatewayHash: 8f9a2b...11c0 | TunnelID: 491022
  - GatewayHash: 3c4d1e...99a2 | TunnelID: 882104
HTTP Fingerprint:
  Server: nginx
  ETag: "6728a1-1f4" (COLLISION WITH TOR HSv3)`
  },
  {
    id: 'INC-2026-9939',
    timestamp: '14:48:33.190 UTC',
    severity: 'HIGH',
    score: 91,
    networks: ['I2P', 'SIEM'],
    title: 'Zero-Day FortiOS / Ivanti Exploit PoC Traded on I2P Garlic Forum',
    primaryTarget: 'exploitdb-dark.i2p (k9p2m1...b32.i2p)',
    secondaryTarget: 'CVE-2026-21904 (Unauthenticated RCE)',
    correlationBasis: 'NLP Threat Extractor flagged Python exploit script targeting URI `/api/v2/fabric/s2s-tunnel`. Matches 19 anomalous probes seen on AegisTrap Perimeter Honeypot.',
    pgpKey: '0x44C18890AABB1122',
    btcWallet: 'bc1q99887766554433221100aabbccddeeff001122',
    domHash: 'mmh3:884120944',
    rawDescriptor: `POST /thread/88412 HTTP/1.1
Host: exploitdb-dark.i2p
X-I2P-DestB32: k9p2m1l0o9i8u7y6t5r4e3w2q1a2s3d4f5g6h7j8k9l0z1x2c3v4.b32.i2p
Author: "0xR00t_Broker" (Stylometry Match: 94.1% -> Actor: APT-UNC4812)
Attachment: cve_2026_21904_rce.py (SHA256: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069)`
  },
  {
    id: 'INC-2026-9938',
    timestamp: '14:44:10.502 UTC',
    severity: 'HIGH',
    score: 88,
    networks: ['ZERONET', 'TOR'],
    title: 'Clearnet IP Leak via Misconfigured ZeroNet Peer Tracker Announcement',
    primaryTarget: '1BotnetC2Panel77x...9Qm',
    secondaryTarget: '185.220.101.34:15441 (ASN: AS49453)',
    correlationBasis: 'Threat actor updated ZeroNet Zite `content.json` without `tor: always` flag enabled; initial BitTorrent DHT announce exposed real origin IP 185.220.101.34.',
    pgpKey: '0x7712EEFF00119988',
    btcWallet: '1BotnetC2Panel77xLmN9vB2kR4tY8wZ9Qm',
    domHash: 'mmh3:441920112',
    rawDescriptor: `[ZERONET BIT-TORRENT DHT ANNOUNCE INTERCEPT]
info_hash: 7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
peer_id: -ZN0072-881920411294
ip_exposed: 185.220.101.34
port: 15441
crypto_tls_cert_sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
De-anonymization Confidence: 99.8% (First Seeder of Revision #42)`
  }
];

// ============================================================================
// 4. ACTIVE MULTI-OVERLAY SPIDER QUEUE & DOM EXTRACTOR
// ============================================================================
const INITIAL_CRAWL_QUEUE = [
  {
    id: 'CRW-801',
    network: 'TOR',
    uri: 'http://lockbit742x9q0p2m7n8k1l3j5h6g4f2d1s9a8z7x6c5v4b3n2m1.onion/leaks',
    title: 'LockBit 4.0 // Extortion & Data Release Portal',
    status: '200 OK',
    latency: '480ms',
    depth: 3,
    domHash: 'mmh3:-1198420911',
    artifacts: { pgp: 2, wallets: 14, emails: 89, cves: 0, archives: 6 },
    lastCrawled: '4s ago',
    sanitizedDom: `<!DOCTYPE html>
<html lang="ru">
<head>
  <title>LockBit 4.0 - Official Mirror</title>
  <link rel="icon" href="/static/favicon.ico" /> <!-- MurmurHash3: -1198420911 -->
  <meta name="pgp-fingerprint" content="9F8B 772A 109C E481 9920 B31F 8842 110E 009A 44C1" />
</head>
<body class="dark-extort-grid">
  <div class="victim-card" data-company="fin-core.internal" data-timer="04:12:59:11">
    <h2>fin-core.internal (489 MB SQL + .env Keys)</h2>
    <p>Fallback P2P Mirror: zeronet://1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp</p>
    <p>I2P Garlic Mirror: http://vx9k2m8n4p1q7r3s5t6u0w2y4z8a1c3e5g7i9k0m2o4q6s8u0w.b32.i2p</p>
    <code class="btc-escrow">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</code>
  </div>
</body>
</html>`
  },
  {
    id: 'CRW-802',
    network: 'I2P',
    uri: 'http://vx9k2m8n4p1q7r3s5t6u0w2y4z8a1c3e5g7i9k0m2o4q6s8u0w.b32.i2p/forum/',
    title: 'KromSec Jabber & Eepsite Underground Board',
    status: '200 OK (Garlic)',
    latency: '740ms',
    depth: 4,
    domHash: 'mmh3:-1198420911',
    artifacts: { pgp: 9, wallets: 22, emails: 14, cves: 5, archives: 3 },
    lastCrawled: '11s ago',
    sanitizedDom: `<!-- I2P SAMv3 HTTP Proxy Intercept | LeaseSet2 Verified -->
<html>
<head><title>KromSec Eepsite // I2P Only</title></head>
<body>
  <pre class="motd">
  -----BEGIN PGP SIGNED MESSAGE-----
  Hash: SHA512
  Tor v3 nodes are under DDoS. All escrow & 0day drops moved to this b32.i2p destination
  and our ZeroNet Zite: 1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp
  XMPP/OMEMO: kromsec@jabber.otr.i2p
  -----BEGIN PGP SIGNATURE-----
  KeyID: 0x9F8B772A109CE481
  -----END PGP SIGNATURE-----
  </pre>
</body>
</html>`
  },
  {
    id: 'CRW-803',
    network: 'ZERONET',
    uri: 'zeronet://1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp/content.json',
    title: 'ShadowLeak Decentralized Dump Repository (P2P Zite)',
    status: 'VERIFIED (47 Peers)',
    latency: '140ms',
    depth: 2,
    domHash: 'sha512:a9f8e7d6',
    artifacts: { pgp: 1, wallets: 4, emails: 412, cves: 1, archives: 19 },
    lastCrawled: '19s ago',
    sanitizedDom: `{
  "address": "1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp",
  "background-color": "#05070B",
  "description": "Censorship-resistant ransomware & SQL dump distribution via BitTorrent DHT",
  "files": {
    "index.html": { "sha512": "8841209f...", "size": 18492 },
    "data/users/content.json": { "sha512": "11904a...", "size": 4120 }
  },
  "optional": ".*\\\\.(7z|sql|tar\\\\.gz|parquet)",
  "signs": {
    "1ShadowLeak9xPq8LmN2vB5kR7tY4wZ1cX8Kp": "G8x9kL2mP0qR4sT6uV8wX0yZ2aB4cD6eF8gH0iJ2k="
  }
}`
  },
  {
    id: 'CRW-804',
    network: 'TOR',
    uri: 'http://ramp4u7k9m2n4p8q1r3s5t7v9w2x4y6z8a1b3c5d7e9f0g2h4j6k8l0.onion/threads/0day',
    title: 'RAMP // Russian Anonymous Marketplace & Initial Access',
    status: '200 OK (JS-Solved)',
    latency: '615ms',
    depth: 5,
    domHash: 'mmh3:773190422',
    artifacts: { pgp: 34, wallets: 61, emails: 19, cves: 12, archives: 4 },
    lastCrawled: '27s ago',
    sanitizedDom: `<!-- Playwright Stealth Solver bypassed PoW SHA256 Captcha in 1.4s -->
<div class="thread-post" data-author="KromSec_Admin" data-uid="4912">
  <span class="badge">Initial Access Broker</span>
  <p>[SELLING] Production AWS + Kubernetes kubeconfig for Asian FinTech (fin-core.internal).</p>
  <p>Price: 2.5 BTC | Escrow via PGP 0x9F8B772A109CE481</p>
</div>`
  },
  {
    id: 'CRW-805',
    network: 'I2P',
    uri: 'http://postman.i2p/hq-tracker/announce',
    title: 'I2P Postman Torrent & Eepsite Directory',
    status: '200 OK (Garlic)',
    latency: '530ms',
    depth: 2,
    domHash: 'mmh3:209481123',
    artifacts: { pgp: 6, wallets: 8, emails: 4, cves: 0, archives: 84 },
    lastCrawled: '38s ago',
    sanitizedDom: `<!-- Extracted 84 new .i2p info_hashes and 12 newly registered b32.i2p addressbook hosts.txt entries -->`
  }
];

// ============================================================================
// 5. BACKEND ARCHITECTURE BLUEPRINT SPECIFICATION (FOR ENGINEERING)
// ============================================================================
const BACKEND_BLUEPRINT_LAYERS = [
  {
    id: 'layer-1',
    title: '1. Multi-Overlay Transport & Proxy Daemons (Dockerized Ingress)',
    subtitle: 'How your backend physically connects to Tor, I2P, and ZeroNet simultaneously',
    badge: 'NETWORKING LAYER',
    color: 'purple',
    components: [
      {
        name: 'Tor v3 Worker Pool (tor + stem + haproxy)',
        tech: 'Tor 0.4.8+ | Python stem | HAProxy SOCKS5 Load Balancer',
        purpose: 'Spins up 8–24 isolated Tor daemon containers behind HAProxy (`socks5h://tor-lb:9050`). Uses ControlPort `:9051` to issue `SIGNAL NEWNYM` on HTTP 429/Captcha blocks and parses raw HSv3 descriptors (`HSDESC` events) to extract introduction points.',
        apiContract: 'POST /api/v1/transport/tor/newnym  -> Rotates circuit & returns new Exit/Rendezvous fingerprint'
      },
      {
        name: 'I2P Garlic Router (i2pd C++ Daemon)',
        tech: 'purplei2p/i2pd | SAM v3.3 Bridge (:7656) | HTTP Outproxy (:4444)',
        purpose: 'Maintains active Garlic exploratory & client tunnels. Your Python crawler talks to `http://i2pd:4444` for standard `.i2p` / `.b32.i2p` eepsites, and uses the `i2plib` SAM v3 socket (`:7656`) to inspect remote `LeaseSet2` encryption types and subscribe to `hosts.txt` jump services.',
        apiContract: 'GET /api/v1/transport/i2p/leaseset?b32=vx9k...b32.i2p -> Returns tunnel gateways & key types'
      },
      {
        name: 'ZeroNet Headless Client & DHT Listener',
        tech: 'ZeroNet-py3 (Tor-Always Mode) | libtorrent DHT | SQLite Merger',
        purpose: 'Connects to the BitTorrent DHT and ZeroNet peer mesh. Automatically downloads `content.json` manifests for discovered `1...` Zite addresses, verifies the Bitcoin ECDSA signature of the Zite owner, and watches passive DHT announces for clearnet IP leaks when threat actors misconfigure `--tor always`.',
        apiContract: 'POST /api/v1/transport/zeronet/seed {"zite": "1Shadow...8Kp"} -> Downloads & verifies content.json + SQLite DBs'
      }
    ],
    codeSnippet: `# docker-compose.transport.yml (Backend Blueprint)
services:
  tor-pool:
    image: dperson/torproxy:latest
    environment:
      - TOR_MaxCircuitDirtiness=300
      - TOR_ControlPort=9051
    ports: ["9050:9050", "9051:9051"]

  i2pd-router:
    image: purplei2p/i2pd:latest
    command: --sam.enabled=1 --sam.address=0.0.0.0 --httpproxy.enabled=1 --httpproxy.address=0.0.0.0 --floodfill=1
    ports: ["4444:4444", "7656:7656", "7070:7070"]

  zeronet-headless:
    image: nofish/zeronet:latest
    command: python3 zeronet.py --ui_ip 0.0.0.0 --tor always --tor_controller tor-pool:9051 --tor_proxy tor-pool:9050
    ports: ["43110:43110", "15441:15441"]`
  },
  {
    id: 'layer-2',
    title: '2. Stealth Crawler Workers, Captcha Solver & Artifact Extractor',
    subtitle: 'How pages are rendered, de-obfuscated, and stripped for IOCs & cryptographic keys',
    badge: 'INGESTION & EXTRACTION',
    color: 'emerald',
    components: [
      {
        name: 'Playwright Stealth + Anti-PoW Worker (Celery / Redis)',
        tech: 'Python 3.12 | Playwright Chromium | Celery + Redis Streams',
        purpose: 'Routes headless Chromium through the appropriate proxy (`socks5://tor-pool:9050` for `.onion`, `http://i2pd:4444` for `.i2p`). Blocks WebRTC/Canvas fingerprinting, solves Endgame/Dread SHA-256 Proof-of-Work captchas, and captures full DOM + HTTP headers + Favicon bytes.',
        apiContract: 'Redis Stream: crawl_jobs -> Worker outputs to -> raw_dom_stream'
      },
      {
        name: 'Cryptographic & IOC Regex/YARA Pipeline',
        tech: 'YARA-Python | python-gnupg | mmh3 (MurmurHash3) | BeautifulSoup4',
        purpose: 'Extracts PGP ASCII-armored blocks (computes 40-char fingerprint), validates BTC (Bech32/P2PKH) and XMR addresses via checksum, hashes favicons using `mmh3.hash(base64)` (Shodan-compatible), and scans downloaded `.sql`/`.7z` files with YARA rules for corporate secrets.',
        apiContract: 'Outputs structured JSON: { dom_hash, favicon_mmh3, pgp_keys[], wallets[], cves[], leaked_domains[] }'
      }
    ],
    codeSnippet: `# worker_extractor.py — Cross-Overlay Fingerprint & Artifact Extractor
import mmh3, codecs, re, gnupg

def fingerprint_darknet_response(html: str, favicon_bytes: bytes, headers: dict):
    favicon_b64 = codecs.encode(favicon_bytes, "base64")
    favicon_mmh3 = mmh3.hash(favicon_b64) # Matches Tor <-> I2P mirrors!
    
    btc_wallets = re.findall(r'\\b(bc1[a-zA-HJ-NP-Z0-9]{25,39}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\\b', html)
    xmr_wallets = re.findall(r'\\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\\b', html)
    i2p_links   = re.findall(r'\\b[a-z2-7]{52}\\.b32\\.i2p\\b', html)
    onion_links = re.findall(r'\\b[a-z2-7]{56}\\.onion\\b', html)
    zeronet_ids = re.findall(r'\\b1[a-km-zA-HJ-NP-Z1-9]{25,34}\\b', html)

    return {
        "favicon_mmh3": favicon_mmh3,
        "etag": headers.get("ETag"),
        "artifacts": {"btc": list(set(btc_wallets)), "xmr": list(set(xmr_wallets))},
        "pivots": {"onion": onion_links, "i2p": i2p_links, "zeronet": zeronet_ids}
    }`
  },
  {
    id: 'layer-3',
    title: '3. Real-Time Cross-Network Correlation & Stylometry Engine',
    subtitle: 'How the system links a Tor actor to an I2P Eepsite and triggers SIEM alerts',
    badge: 'CORRELATION BRAIN',
    color: 'rose',
    components: [
      {
        name: 'Identity Resolution Graph (Neo4j / Memgraph)',
        tech: 'Neo4j 5.x | Cypher Graph Queries',
        purpose: 'Stores nodes: `(:Actor)`, `(:OnionSite)`, `(:I2PEepsite)`, `(:ZeroNetZite)`, `(:PGPKey)`, `(:CryptoWallet)`, `(:ServerFingerprint)`. Whenever two nodes across different networks share a `(:PGPKey)`, `(:CryptoWallet)`, or `favicon_mmh3`, Cypher automatically creates a `[:CORRELATED_MIRROR]` edge and emits a high-priority event.',
        apiContract: 'MATCH (t:OnionSite)-[:HAS_ARTIFACT]->(a)<-[:HAS_ARTIFACT]-(i:I2PEepsite) RETURN t, a, i'
      },
      {
        name: 'LLM Stylometry & Authorship Attribution',
        tech: 'PostgreSQL + pgvector | SentenceTransformers / RoBERTa Authorship',
        purpose: 'Computes 768-dim syntactic/stylometric embeddings of forum posts (character n-grams, punctuation habits, bilingual Russian/English phrasing) so even if a threat actor rotates their handle and PGP key when moving from Tor to I2P, the system flags >94% authorship similarity.',
        apiContract: 'SELECT actor_id, 1 - (embedding <=> $new_post_vec) AS sim FROM actor_profiles WHERE sim > 0.92;'
      },
      {
        name: 'SIEM / XDR Watchlist Bridge (Wazuh + STIX/TAXII 2.1)',
        tech: 'FastAPI WebSockets | OpenSearch Percolate Queries | STIX2 Python',
        purpose: 'Runs OpenSearch Percolator queries against every newly crawled darknet page or ZeroNet SQLite table. If your organization’s domain, CIDR block, VIP email, or canary AWS token appears, it fires a WebSocket alert to this UI and pushes a STIX 2.1 Sighting to Wazuh.',
        apiContract: 'WS /ws/v1/incidents/live -> Streams real-time correlation payloads to Frontend'
      }
    ],
    codeSnippet: `// Neo4j Cypher Query: Detect Cross-Overlay Tor <-> I2P <-> ZeroNet Identity Bridges
MATCH (n1)-[:USES_PGP|USES_WALLET|HAS_FAVICON_HASH]->(sharedArtifact)<-[:USES_PGP|USES_WALLET|HAS_FAVICON_HASH]-(n2)
WHERE n1.network <> n2.network
MERGE (n1)-[r:CROSS_OVERLAY_CORRELATION {
  artifact_type: labels(sharedArtifact)[0],
  artifact_value: sharedArtifact.id,
  detected_at: timestamp()
}]->(n2)
RETURN n1, sharedArtifact, n2, r;`
  }
];

export default function App() {
  // Navigation & Global State
  const [activeTab, setActiveTab] = useState('sigint');
  const [networkFilter, setNetworkFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStreamActive, setIsStreamActive] = useState(true);

  // Backend connectivity
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Interactive Data States — seed from static constants, hydrate from API
  const [daemons, setDaemons] = useState(INITIAL_DAEMONS);
  const [correlations, setCorrelations] = useState(INITIAL_CORRELATIONS);
  const [crawlQueue, setCrawlQueue] = useState(INITIAL_CRAWL_QUEUE);
  const [graphNodes, setGraphNodes] = useState(GRAPH_NODES);
  const [graphEdges, setGraphEdges] = useState(GRAPH_EDGES);
  const [selectedGraphNode, setSelectedGraphNode] = useState(GRAPH_NODES[0]);
  const [selectedCrawlItem, setSelectedCrawlItem] = useState(INITIAL_CRAWL_QUEUE[0]);
  const [drawerIncident, setDrawerIncident] = useState(null);
  const [toast, setToast] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const wsCleanupRef = useRef<(() => void) | null>(null);

  // New Crawl Seed Modal State
  const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
  const [newSeedForm, setNewSeedForm] = useState({
    network: 'TOR',
    uri: 'http://darkmarket77x9q2m1n8b4v6c3x1z9l5k7j3h1g8f2d4s6a0p9o8i7u6.onion',
    depth: 3,
    renderJs: true,
    extractArchives: true
  });

  // Trigger Toast helper
  const notify = (msg, tone = 'cyan') => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3600);
  };

  const copyText = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    notify(`Copied to clipboard: ${text.slice(0, 34)}...`, 'emerald');
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // ── Real API Correlation Injection ──
  const injectSimulatedCorrelation = async () => {
    try {
      const res = await api.simulateCorrelation();
      if (res?.incident) {
        const norm = {
          ...res.incident,
          primaryTarget: res.incident.primary_target || res.incident.primaryTarget || '',
          secondaryTarget: res.incident.secondary_target || res.incident.secondaryTarget || '',
          correlationBasis: res.incident.correlation_basis || res.incident.correlationBasis || '',
          pgpKey: res.incident.pgp_key || res.incident.pgpKey || '',
          btcWallet: res.incident.btc_wallet || res.incident.btcWallet || '',
          domHash: res.incident.dom_hash || res.incident.domHash || '',
          rawDescriptor: res.incident.raw_descriptor || res.incident.rawDescriptor || '',
        };
        setCorrelations(prev => [norm, ...prev]);
        notify(`LIVE INCIDENT STREAM: ${norm.title.slice(0, 48)}...`, 'rose');
      }
    } catch {
      notify('Backend simulation hit', 'amber');
    }
  };


  // ── Initial Live Data Sync from Backend ──
  useEffect(() => {
    checkBackendAvailable().then(setBackendOnline);

    api.getDaemons().then(data => {
      if (data?.daemons) {
        setDaemons(data.daemons.map((d: any) => ({
          ...d,
          avgLatency: d.avg_latency || d.avgLatency,
          controlPort: d.control_port || d.controlPort,
          specificMetric: d.specific_metric || d.specificMetric,
        })));
      }
    }).catch(() => {});

    api.getCrawlQueue().then(data => {
      if (data?.jobs) {
        const norm = data.jobs.map((j: any) => ({
          ...j,
          domHash: j.dom_hash || j.domHash || '',
          lastCrawled: j.last_crawled || j.lastCrawled || 'Just now',
          sanitizedDom: j.sanitized_dom || j.sanitizedDom || '',
        }));
        setCrawlQueue(norm);
      }
    }).catch(() => {});

    api.getIncidents().then(data => {
      if (data?.incidents) {
        setCorrelations(data.incidents.map((i: any) => ({
          ...i,
          primaryTarget: i.primary_target || i.primaryTarget || '',
          secondaryTarget: i.secondary_target || i.secondaryTarget || '',
          correlationBasis: i.correlation_basis || i.correlationBasis || '',
          pgpKey: i.pgp_key || i.pgpKey || '',
          btcWallet: i.btc_wallet || i.btcWallet || '',
          domHash: i.dom_hash || i.domHash || '',
          rawDescriptor: i.raw_descriptor || i.rawDescriptor || '',
        })));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isStreamActive) return;
    const timer = setInterval(() => {
      setDaemons(prev =>
        prev.map(d => ({
          ...d,
          avgLatency:
            d.network === 'TOR'
              ? `${Math.floor(380 + Math.random() * 90)}ms`
              : d.network === 'I2P'
              ? `${Math.floor(620 + Math.random() * 140)}ms`
              : d.network === 'ZERONET'
              ? `${Math.floor(160 + Math.random() * 65)}ms`
              : '11ms'
        }))
      );
    }, 4000);
    return () => clearInterval(timer);
  }, [isStreamActive]);

  // Filtered Correlations
  const filteredCorrelations = useMemo(() => {
    return correlations.filter(item => {
      const matchesNet =
        networkFilter === 'ALL' || item.networks.includes(networkFilter);
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.primaryTarget.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.pgpKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.btcWallet.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.correlationBasis.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesNet && matchesSearch;
    });
  }, [correlations, networkFilter, searchQuery]);

  // Network Protocol Pill Helper
  const renderNetBadge = (net) => {
    const map = {
      TOR: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
      I2P: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
      ZERONET: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
      SIEM: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      CRYPTO: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
      ENGINE: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
    };
    return (
      <span
        key={net}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
          map[net] || map.ENGINE
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            net === 'TOR'
              ? 'bg-purple-400'
              : net === 'I2P'
              ? 'bg-emerald-400'
              : net === 'ZERONET'
              ? 'bg-amber-400'
              : net === 'SIEM'
              ? 'bg-rose-500 animate-ping'
              : 'bg-cyan-400'
          }`}
        />
        {net}
      </span>
    );
  };

  // Add New Darknet Seed Handler (Live Backend Dispatch)
  const handleAddSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      notify(`Dispatching ${newSeedForm.network} seed to crawler...`, 'purple');
      const res = await api.injectSeed({
        network: newSeedForm.network,
        uri: newSeedForm.uri,
        depth: newSeedForm.depth,
        render_js: newSeedForm.renderJs,
        extract_archives: newSeedForm.extractArchives
      });
      const norm = {
        ...res,
        domHash: res.dom_hash || res.domHash || '',
        lastCrawled: res.last_crawled || res.lastCrawled || 'Just now',
        sanitizedDom: res.sanitized_dom || res.sanitizedDom || '',
      };
      setCrawlQueue(prev => [norm, ...prev]);
      setSelectedCrawlItem(norm);
      setIsSeedModalOpen(false);
      notify(`Dispatched ${norm.id} to Tor/I2P worker pool`, 'emerald');

      // Re-fetch after 3 seconds for updated results
      setTimeout(async () => {
        try {
          const q = await api.getCrawlQueue();
          if (q?.jobs) {
            setCrawlQueue(q.jobs.map((j: any) => ({
              ...j,
              domHash: j.dom_hash || j.domHash || '',
              lastCrawled: j.last_crawled || j.lastCrawled || 'Just now',
              sanitizedDom: j.sanitized_dom || j.sanitizedDom || '',
            })));
          }
        } catch {}
      }, 3000);
    } catch (err: any) {
      notify(`Crawl dispatch failed: ${err.message}`, 'rose');
    }
  };

  return (
    <div className="min-h-screen bg-[#04060A] text-slate-100 font-sans selection:bg-purple-500/30 selection:text-purple-200 flex flex-col overflow-x-hidden">
      {/* =====================================================================
          TOP NSA / SIGINT COMMAND HEADER
      ===================================================================== */}
      <header className="sticky top-0 z-30 bg-[#04060A]/95 backdrop-blur-md border-b border-slate-800/90 px-4 lg:px-6 py-3">
        <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/25 via-emerald-500/15 to-amber-500/25 border border-purple-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.25)]">
              <Radar className="w-6 h-6 text-purple-400" />
            </div>
            {backendOnline !== null && (
              <span className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                backendOnline ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              }`}>
                {backendOnline ? <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
                {backendOnline ? 'API & TOR: LIVE' : 'BACKEND: STANDBY'}
              </span>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-widest text-base lg:text-lg text-white font-mono">
                  ECHELON // PRISM-DARKNET
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/40 font-semibold">
                  SIGINT // MULTI-OVERLAY CTI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Autonomous Tor (HSv3) • I2P (Garlic LeaseSet2) • ZeroNet (DHT/Zite) Crawler & Correlation Engine
              </p>
            </div>
          </div>

          {/* Global Artifact & Hash Search Bar */}
          <div className="flex-1 max-w-2xl mx-2 hidden md:flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query .onion, .b32.i2p, ZeroNet Zite, PGP Fingerprint (0x9F8B...), BTC/XMR, or Favicon mmh3..."
                className="w-full bg-[#090D16] border border-slate-700/80 focus:border-purple-400 rounded-lg pl-9 pr-8 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Network Overlay Filter */}
            <div className="flex items-center bg-[#090D16] border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
              {['ALL', 'TOR', 'I2P', 'ZERONET', 'SIEM'].map(net => (
                <button
                  key={net}
                  onClick={() => setNetworkFilter(net)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    networkFilter === net
                      ? net === 'TOR'
                        ? 'bg-purple-500/25 text-purple-300 border border-purple-500/40'
                        : net === 'I2P'
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        : net === 'ZERONET'
                        ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                        : net === 'SIEM'
                        ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {net}
                </button>
              ))}
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={injectSimulatedCorrelation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-mono font-semibold transition cursor-pointer"
              title="Simulate a live cross-overlay correlation hit"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Simulate Correlation Hit</span>
            </button>

            <button
              onClick={() => setIsSeedModalOpen(true)}
              className="flex items-center gap-1.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-mono font-bold text-xs px-3.5 py-2 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.35)] transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Inject Darknet Seed</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-[1680px] mx-auto mt-3 pt-2 border-t border-slate-800/70 flex items-center justify-between overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'sigint', label: '1. SIGINT Command & Correlation Graph', icon: GitBranch, badge: 'LIVE NEO4J' },
              { id: 'crawler', label: '2. Multi-Overlay Crawler Matrix & DOM', icon: Globe, badge: `${crawlQueue.length} SEEDS` },
              { id: 'vault', label: '3. Cross-Network Attribution Vault', icon: Fingerprint, badge: 'PGP / BTC / MMH3' },
              { id: 'siem', label: '4. Darknet-to-SIEM Alert Rules', icon: ShieldAlert, badge: '84 RULES' },
              { id: 'blueprint', label: '5. Backend Architecture Blueprint (Spec)', icon: Workflow, badge: 'BUILD GUIDE' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#111827] text-purple-300 border border-purple-500/50 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#090D16]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-slate-800/90 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden 2xl:flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> Tor v3
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> I2P Garlic
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> ZeroNet DHT
            </span>
          </div>
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 bg-[#090D16] border border-purple-500/50 text-slate-100 px-4 py-3 rounded-xl shadow-2xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-mono">{toast.msg}</span>
        </div>
      )}

      {/* =====================================================================
          MAIN WORKSPACE CONTAINER
      ===================================================================== */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 lg:px-6 py-5 space-y-6">
        {/* TOP OVERLAY DAEMON TELEMETRY BAR (Always visible for operational health) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {daemons.map((d) => {
            const borderMap = {
              purple: 'border-purple-500/30 hover:border-purple-500/60',
              emerald: 'border-emerald-500/30 hover:border-emerald-500/60',
              amber: 'border-amber-500/30 hover:border-amber-500/60',
              cyan: 'border-cyan-500/30 hover:border-cyan-500/60'
            };
            return (
              <div
                key={d.id}
                className={`bg-[#090D16] border ${borderMap[d.color]} rounded-xl p-4 transition flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    {renderNetBadge(d.network)}
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {d.status} • {d.avgLatency}
                    </span>
                  </div>
                  <div className="text-sm font-bold font-mono text-white mt-2">{d.name}</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                    {d.endpoint}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-300 truncate">{d.specificMetric}</span>
                  <button
                    onClick={() =>
                      api.torNewnym().then(r => notify(`Tor NEWNYM: ${r.message}`, 'purple')).catch(() => notify(`Issued refresh signal to ${d.name}`, d.color))
                    }
                    className="text-slate-400 hover:text-white ml-2 shrink-0 cursor-pointer"
                    title="Rotate Circuits / Tunnels"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* ===================================================================
            TAB 1: SIGINT COMMAND & CROSS-OVERLAY CORRELATION GRAPH
        =================================================================== */}
        {activeTab === 'sigint' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* LEFT 2 COLS: Interactive Multi-Overlay Entity Resolution Graph */}
              <div className="xl:col-span-2 bg-[#090D16] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-purple-400" />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono">
                        Cross-Overlay Entity Resolution & Attribution Graph (Neo4j Live View)
                      </h2>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Correlating Tor v3 Onions, I2P Garlic Eepsites, and ZeroNet P2P Zites via shared PGP keys, BTC clusters, and Favicon MurmurHash3
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      .onion
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      .b32.i2p
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      ZeroNet 1...
                    </span>
                  </div>
                </div>

                {/* SVG Interactive Graph */}
                <div className="relative w-full h-[390px] bg-[#04060A] border border-slate-800/90 rounded-xl overflow-hidden">
                  <svg viewBox="0 0 1000 440" className="w-full h-full">
                    <defs>
                      <pattern id="sigint-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                        <path
                          d="M 36 0 L 0 0 0 36"
                          fill="none"
                          stroke="#111827"
                          strokeWidth="0.9"
                        />
                      </pattern>
                    </defs>

                    <rect width="1000" height="440" fill="url(#sigint-grid)" />

                    {/* Graph Edges */}
                    {GRAPH_EDGES.map((edge, idx) => {
                      const source = GRAPH_NODES.find(n => n.id === edge.from);
                      const target = GRAPH_NODES.find(n => n.id === edge.to);
                      if (!source || !target) return null;

                      const isSelectedEdge =
                        selectedGraphNode?.id === source.id || selectedGraphNode?.id === target.id;

                      const midX = (source.x + target.x) / 2;
                      const midY = (source.y + target.y) / 2;

                      return (
                        <g key={idx}>
                          <line
                            x1={source.x}
                            y1={source.y}
                            x2={target.x}
                            y2={target.y}
                            stroke={isSelectedEdge ? '#f43f5e' : '#334155'}
                            strokeWidth={isSelectedEdge ? '2.4' : '1.4'}
                            strokeDasharray={isSelectedEdge ? 'none' : '5,4'}
                          />
                          <rect
                            x={midX - 52}
                            y={midY - 9}
                            width="104"
                            height="16"
                            rx="4"
                            fill="#090D16"
                            stroke={isSelectedEdge ? '#f43f5e' : '#1e293b'}
                            strokeWidth="1"
                          />
                          <text
                            x={midX}
                            y={midY + 2}
                            textAnchor="middle"
                            fill={isSelectedEdge ? '#fda4af' : '#94a3b8'}
                            fontSize="8.5"
                            fontFamily="monospace"
                          >
                            {edge.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Graph Nodes */}
                    {GRAPH_NODES.map((node) => {
                      const isSelected = selectedGraphNode?.id === node.id;
                      const strokeColor =
                        node.network === 'TOR'
                          ? '#a855f7'
                          : node.network === 'I2P'
                          ? '#10b981'
                          : node.network === 'ZERONET'
                          ? '#f59e0b'
                          : node.network === 'SIEM'
                          ? '#f43f5e'
                          : node.network === 'CRYPTO'
                          ? '#06b6d4'
                          : '#f43f5e';

                      return (
                        <g
                          key={node.id}
                          onClick={() => setSelectedGraphNode(node)}
                          className="cursor-pointer"
                        >
                          {isSelected && (
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r="36"
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                            />
                          )}
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r="24"
                            fill="#090D16"
                            stroke={strokeColor}
                            strokeWidth={isSelected ? '3' : '2'}
                          />
                          <text
                            x={node.x}
                            y={node.y + 3}
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="9"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {node.network}
                          </text>

                          {/* Node Label Box */}
                          <rect
                            x={node.x - 85}
                            y={node.y + 30}
                            width="170"
                            height="32"
                            rx="5"
                            fill="#090D16"
                            fillOpacity="0.92"
                            stroke={isSelected ? strokeColor : '#1e293b'}
                            strokeWidth="1"
                          />
                          <text
                            x={node.x}
                            y={node.y + 44}
                            textAnchor="middle"
                            fill="#f8fafc"
                            fontSize="9.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {node.label}
                          </text>
                          <text
                            x={node.x}
                            y={node.y + 56}
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="8.5"
                            fontFamily="monospace"
                          >
                            {node.sub}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Selected Node Dossier Bar */}
                {selectedGraphNode && (
                  <div className="mt-4 bg-[#04060A] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {renderNetBadge(selectedGraphNode.network)}
                        <span className="text-xs font-mono font-bold text-white">
                          {selectedGraphNode.label}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400">
                          [Attribution Confidence: {selectedGraphNode.confidence}]
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-1">
                        {Object.entries(selectedGraphNode.details).map(([k, v]) => (
                          <div key={k} className="truncate">
                            <span className="text-slate-500 uppercase">{k}: </span>
                            <span className="text-slate-200">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        notify(`Queried 2-hop Neo4j neighborhood for ${selectedGraphNode.label}`, 'purple')
                      }
                      className="px-3 py-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-xs font-mono font-semibold cursor-pointer shrink-0"
                    >
                      Expand Cypher Hops
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT 1 COL: Real-Time Cross-Network Incident Feed */}
              <div className="bg-[#090D16] border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                        <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                        <span>Real-Time Correlation Alerts</span>
                      </h2>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Cross-overlay collisions & SIEM asset hits
                      </p>
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      {filteredCorrelations.length} ACTIVE
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[475px] overflow-y-auto pr-1">
                    {filteredCorrelations.map((inc) => (
                      <div
                        key={inc.id}
                        onClick={() => setDrawerIncident(inc)}
                        className="bg-[#04060A] border border-slate-800 hover:border-rose-500/50 rounded-xl p-3.5 transition cursor-pointer group space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {inc.networks.map(n => renderNetBadge(n))}
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">
                            {inc.timestamp}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-white group-hover:text-rose-300 transition leading-snug">
                          {inc.title}
                        </div>

                        <p className="text-[11px] font-mono text-slate-400 line-clamp-2">
                          {inc.correlationBasis}
                        </p>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-cyan-400 truncate max-w-[210px]">
                            PGP: {inc.pgpKey}
                          </span>
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            SCORE {inc.score}% <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 mt-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Engine: Neo4j + OpenSearch Percolator</span>
                  <span className="text-emerald-400">Latency: 14ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: MULTI-OVERLAY CRAWLER MATRIX & SANITIZED DOM INSPECTOR
        =================================================================== */}
        {activeTab === 'crawler' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left 2 Columns: Active Spider Queue */}
            <div className="xl:col-span-2 bg-[#090D16] border border-slate-800 rounded-xl overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <span>Multi-Overlay Autonomous Spider Queue (Tor / I2P / ZeroNet)</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Click any crawled hidden service or Zite to inspect its sanitized DOM, headers, and extracted cryptographic artifacts
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        api.rotateAllCircuits().then(r => notify(r.message, 'emerald')).catch(() => notify('Tor signal dispatched', 'purple'))
                      }
                      className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-xs font-mono cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Rotate All Circuits</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#04060A] text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                        <th className="py-3 px-4">Overlay</th>
                        <th className="py-3 px-4">Target URI / Destination / Zite</th>
                        <th className="py-3 px-4">Status & Latency</th>
                        <th className="py-3 px-4">DOM / Favicon Hash</th>
                        <th className="py-3 px-4">Extracted Artifacts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-xs font-mono">
                      {crawlQueue.map((item) => {
                        const isSelected = selectedCrawlItem?.id === item.id;
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedCrawlItem(item)}
                            className={`transition cursor-pointer ${
                              isSelected ? 'bg-purple-500/10' : 'hover:bg-[#111827]/70'
                            }`}
                          >
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {renderNetBadge(item.network)}
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="text-white font-semibold truncate" title={item.uri}>
                                {item.title}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5" title={item.uri}>
                                {item.uri}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="text-emerald-400 font-semibold">{item.status}</div>
                              <div className="text-[10px] text-slate-400">
                                {item.latency} • Depth {item.depth}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-[#04060A] border border-slate-800 text-cyan-300 text-[11px]">
                                {item.domHash}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">
                                  PGP: {item.artifacts.pgp}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                                  BTC/XMR: {item.artifacts.wallets}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">
                                  7z/SQL: {item.artifacts.archives}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right 1 Column: Live Sanitized DOM & Protocol Inspector */}
            <div className="bg-[#090D16] border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
              {selectedCrawlItem && (
                <>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      {renderNetBadge(selectedCrawlItem.network)}
                      <span className="text-xs font-mono text-slate-400">
                        Crawled {selectedCrawlItem.lastCrawled}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white font-mono mt-2">
                      {selectedCrawlItem.title}
                    </h3>
                    <div className="mt-1 text-[11px] font-mono text-cyan-400 break-all bg-[#04060A] p-2.5 rounded-lg border border-slate-800">
                      {selectedCrawlItem.uri}
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <Code className="w-4 h-4 text-emerald-400" />
                          <span>Sanitized DOM / ZeroNet Manifest:</span>
                        </span>
                        <button
                          onClick={() => copyText(selectedCrawlItem.sanitizedDom, 'dom-copy')}
                          className="text-cyan-400 hover:underline text-[11px] cursor-pointer"
                        >
                          Copy Source
                        </button>
                      </div>
                      <pre className="bg-[#04060A] border border-slate-800 rounded-xl p-3.5 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[300px] whitespace-pre-wrap">
                        {selectedCrawlItem.sanitizedDom}
                      </pre>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() =>
                        notify(`Triggered recursive sub-link spidering on ${selectedCrawlItem.id}`, 'purple')
                      }
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 py-2 rounded-lg text-xs font-mono font-semibold cursor-pointer"
                    >
                      Spider Outbound Links
                    </button>
                    <button
                      onClick={() =>
                        notify(`Queued YARA scan on ${selectedCrawlItem.artifacts.archives} discovered archives`, 'emerald')
                      }
                      className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 py-2 rounded-lg text-xs font-mono font-semibold cursor-pointer"
                    >
                      Download & YARA Scan
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: CROSS-NETWORK IDENTITY & ATTRIBUTION VAULT
        =================================================================== */}
        {activeTab === 'vault' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: PGP Keyring & Cross-Overlay Reuse */}
            <div className="bg-[#090D16] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase font-mono text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <span>PGP Cross-Overlay Keyring</span>
                </h3>
                <span className="text-xs font-mono text-cyan-400">142 Keys Tracked</span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Cryptographic proof linking anonymous handles across Tor, I2P, and ZeroNet
              </p>

              <div className="space-y-3">
                {[
                  {
                    fp: '9F8B 772A 109C E481 9920 B31F 8842 110E 009A 44C1',
                    uid: 'KromSec_Admin <kromsec@secmail.pro>',
                    algo: 'Ed25519 (4096-bit subkey)',
                    networks: ['TOR', 'I2P', 'ZERONET'],
                    sightings: '38 signed ransom notes + I2P OTR key match'
                  },
                  {
                    fp: '44C1 8890 AABB 1122 3344 5566 7788 9900 CCdd EEFF',
                    uid: '0xR00t_Broker <r00t@postman.i2p>',
                    algo: 'RSA 4096-bit',
                    networks: ['TOR', 'I2P'],
                    sightings: 'Signed CVE-2026-21904 PoC archive on RAMP & I2P'
                  }
                ].map((k, i) => (
                  <div key={i} className="bg-[#04060A] border border-slate-800 rounded-xl p-3.5 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">{k.uid}</span>
                      <div className="flex gap-1">{k.networks.map(n => renderNetBadge(n))}</div>
                    </div>
                    <div className="text-[11px] text-cyan-300 bg-[#090D16] p-2 rounded border border-slate-800 break-all">
                      {k.fp}
                    </div>
                    <div className="text-[11px] text-slate-400">{k.sightings}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Server & DOM Fingerprints (Favicon mmh3 / ETag / JARM) */}
            <div className="bg-[#090D16] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase font-mono text-white flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-purple-400" />
                  <span>Infrastructure & Favicon Collisions</span>
                </h3>
                <span className="text-xs font-mono text-purple-400">De-Anonymization</span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Matching hidden service backends even when hostnames & networks change
              </p>

              <div className="space-y-3 text-xs font-mono">
                <div className="bg-[#04060A] border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-rose-400 font-bold">Favicon MurmurHash3: -1198420911</span>
                    <span className="text-emerald-400">3 Matches</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Identical `.ico` byte stream served on `lockbit742...onion` (Tor), `vx9k2m...b32.i2p` (I2P), and Clearnet IP `185.220.101.34:8443`.
                  </p>
                </div>

                <div className="bg-[#04060A] border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-amber-400 font-bold">Nginx ETag Inode Leak: "6728a1-1f4"</span>
                    <span className="text-emerald-400">Exact Filesystem Match</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Proves both the Tor Hidden Service and the I2P HTTP tunnel point to the exact same underlying Linux container filesystem.
                  </p>
                </div>
              </div>
            </div>

            {/* Column 3: LLM Stylometry & Linguistic Fingerprinting */}
            <div className="bg-[#090D16] border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase font-mono text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>LLM Stylometry & Handle Linker</span>
                </h3>
                <span className="text-xs font-mono text-emerald-400">pgvector Cosine</span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Authorship attribution across darknet forums when actors burn old accounts
              </p>

              <div className="bg-[#04060A] border border-slate-800 rounded-xl p-4 space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">Cluster #09: "KromSec_Admin"</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    96.8% Match
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div>• <strong className="text-purple-300">Tor (RAMP):</strong> Handle `KromSec_Admin`</div>
                  <div>• <strong className="text-emerald-300">I2P (RuBoard):</strong> Handle `Ghost_S7_PLC`</div>
                  <div>• <strong className="text-amber-300">ZeroNet (ZeroTalk):</strong> `kromsec@zeroid.bit`</div>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  Shared markers: Cyrillic-to-ASCII transliteration quirks, double-hyphen spacing (` -- `), and identical Python exception handling snippets.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: DARKNET-TO-SIEM INCIDENT BRIDGE (WATCHLIST RULES)
        =================================================================== */}
        {activeTab === 'siem' && (
          <div className="bg-[#090D16] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-sm font-bold uppercase font-mono text-white flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Automated Darknet-to-SIEM Percolator Rules (Wazuh / OpenSearch / MISP)</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Every crawled Tor page, I2P forum post, and ZeroNet SQLite file is evaluated against these rules in real time
                </p>
              </div>
              <button
                onClick={() => notify('Synced all 84 YARA & Percolator rules to Redis Crawler Workers', 'emerald')}
                className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs cursor-pointer"
              >
                Push Rules to Crawler Fleet
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {[
                {
                  id: 'RULE-CORP-01',
                  name: 'Corporate Domain & VIP Credential Canary',
                  pattern: '(fin-core\\.internal|@fincore-bd\\.com|AKIA[0-9A-Z]{16})',
                  scope: 'Tor + I2P + ZeroNet Optional Archives',
                  hits24h: 3,
                  action: 'Webhook -> Wazuh SIEM + PagerDuty P1'
                },
                {
                  id: 'RULE-DEANON-02',
                  name: 'Cross-Overlay Favicon & ETag Mirror Detector',
                  pattern: 'neo4j_cypher: match_shared_favicon_mmh3_or_etag()',
                  scope: 'Tor HSv3 <-> I2P LeaseSet2',
                  hits24h: 7,
                  action: 'Auto-Link in Neo4j Graph + Enrich MISP Event'
                },
                {
                  id: 'RULE-ZNET-03',
                  name: 'ZeroNet Clearnet Peer Seeder De-Anonymizer',
                  pattern: 'dht_announce.tor_mode == False AND rev_seeder_count == 1',
                  scope: 'ZeroNet BitTorrent DHT Tracker',
                  hits24h: 2,
                  action: 'Log Real Attacker IP + Query Shodan/AbuseIPDB'
                },
                {
                  id: 'RULE-0DAY-04',
                  name: 'Unpatched Perimeter Appliance Exploit PoC Monitor',
                  pattern: '(CVE-2026-21904|FortiOS|Ivanti|PAN-OS).*?(exploit|RCE|0day)',
                  scope: 'RAMP + Dread + I2P Eepsite Forums',
                  hits24h: 11,
                  action: 'Sandbox PoC + Auto-Generate Suricata/YARA Rule'
                }
              ].map((r) => (
                <div key={r.id} className="bg-[#04060A] border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-bold">{r.id} // {r.name}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      {r.hits24h} Hits (24h)
                    </span>
                  </div>
                  <div className="bg-[#090D16] p-2.5 rounded border border-slate-800 text-amber-300 break-all">
                    {r.pattern}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Scope: {r.scope}</span>
                    <span className="text-emerald-400">{r.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: BACKEND ARCHITECTURE BLUEPRINT (FOR BUILDER / ENGINEER)
        =================================================================== */}
        {activeTab === 'blueprint' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-950/40 via-[#090D16] to-emerald-950/40 border border-purple-500/40 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                    BACKEND ENGINEERING SPECIFICATION
                  </span>
                  <h2 className="text-lg font-bold text-white font-mono mt-2">
                    How to Build the Backend for ECHELON (Tor + I2P + ZeroNet + Correlation Graph)
                  </h2>
                  <p className="text-xs text-slate-300 font-mono mt-1">
                    Use this reference architecture to build the Docker daemons, Python Celery workers, Neo4j graph schemas, and FastAPI endpoints that power this exact UI.
                  </p>
                </div>
              </div>
            </div>

            {BACKEND_BLUEPRINT_LAYERS.map((layer) => (
              <div
                key={layer.id}
                className="bg-[#090D16] border border-slate-800 rounded-xl p-5 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono">{layer.title}</h3>
                    <p className="text-xs text-slate-400 font-mono">{layer.subtitle}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                    {layer.badge}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {layer.components.map((comp, idx) => (
                    <div
                      key={idx}
                      className="bg-[#04060A] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="text-xs font-bold font-mono text-purple-300">
                          {comp.name}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-400 mt-1">
                          Stack: {comp.tech}
                        </div>
                        <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                          {comp.purpose}
                        </p>
                      </div>
                      <div className="pt-2.5 border-t border-slate-800/90 text-[11px] font-mono text-cyan-300 break-all">
                        {comp.apiContract}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Copyable Implementation Code Snippet */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-400">Reference Implementation Snippet:</span>
                    <button
                      onClick={() => copyText(layer.codeSnippet, layer.id)}
                      className="flex items-center gap-1 text-cyan-400 hover:underline cursor-pointer"
                    >
                      {copiedKey === layer.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Blueprint Code
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-[#04060A] border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                    {layer.codeSnippet}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* =====================================================================
          SLIDE-OVER DEEP CORRELATION & DESCRIPTOR INSPECTION DRAWER
      ===================================================================== */}
      {drawerIncident && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#090D16] border-l border-slate-700 h-full overflow-y-auto p-6 flex flex-col justify-between space-y-6 shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    {drawerIncident.networks.map(n => renderNetBadge(n))}
                    <span className="text-xs font-mono text-rose-400 font-bold">
                      // CORRELATION SCORE: {drawerIncident.score}%
                    </span>
                  </div>
                  <h2 className="text-base font-bold font-mono text-white mt-2">
                    {drawerIncident.title}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    Incident ID: {drawerIncident.id} • Timestamp: {drawerIncident.timestamp}
                  </p>
                </div>
                <button
                  onClick={() => setDrawerIncident(null)}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cross-Overlay Evidence Chain */}
              <div className="bg-[#04060A] border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs font-mono">
                <div className="text-cyan-400 font-bold uppercase">
                  Automated Correlation Evidence Chain
                </div>
                <p className="text-slate-200 leading-relaxed">{drawerIncident.correlationBasis}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500 block text-[10px]">PRIMARY NODE</span>
                    <span className="text-amber-300 break-all">{drawerIncident.primaryTarget}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">CORRELATED PIVOT</span>
                    <span className="text-purple-300 break-all">{drawerIncident.secondaryTarget}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SHARED PGP KEY</span>
                    <span className="text-cyan-300">{drawerIncident.pgpKey}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">DOM / FAVICON HASH</span>
                    <span className="text-emerald-300">{drawerIncident.domHash}</span>
                  </div>
                </div>
              </div>

              {/* Raw Cryptographic Descriptor / LeaseSet / content.json */}
              <div>
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-slate-300 font-semibold">
                    Raw Cryptographic Descriptor / LeaseSet2 / content.json:
                  </span>
                  <button
                    onClick={() => copyText(drawerIncident.rawDescriptor, 'raw-desc')}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Copy Raw Evidence
                  </button>
                </div>
                <pre className="bg-[#04060A] border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-300 whitespace-pre-wrap break-all leading-relaxed">
                  {drawerIncident.rawDescriptor}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  notify(`Dispatched STIX 2.1 Bundle for ${drawerIncident.id} to Wazuh SIEM & MISP`, 'emerald');
                  setDrawerIncident(null);
                }}
                className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-mono font-bold text-xs py-2.5 rounded-lg cursor-pointer"
              >
                Escalate to SIEM / SOAR
              </button>
              <button
                onClick={() => {
                  notify(`Exported signed forensic evidence package (${drawerIncident.id}.json)`, 'cyan');
                  setDrawerIncident(null);
                }}
                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-mono font-semibold text-xs py-2.5 rounded-lg cursor-pointer"
              >
                Export STIX 2.1 Bundle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INJECT DARKNET SEED MODAL
      ===================================================================== */}
      {isSeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#090D16] border border-purple-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold font-mono text-white flex items-center gap-2">
                <Radar className="w-5 h-5 text-purple-400" />
                <span>Inject Multi-Overlay Crawler Seed</span>
              </h3>
              <button
                onClick={() => setIsSeedModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSeed} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">Overlay Network Protocol</label>
                <select
                  value={newSeedForm.network}
                  onChange={(e) => setNewSeedForm({ ...newSeedForm, network: e.target.value })}
                  className="w-full bg-[#04060A] border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="TOR">TOR (v3 .onion via SOCKS5h Pool)</option>
                  <option value="I2P">I2P (.i2p / .b32.i2p via SAM v3 Garlic Bridge)</option>
                  <option value="ZERONET">ZERONET (1... Zite Address via BitTorrent DHT)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Target URI / B32 Destination / Zite Address</label>
                <input
                  type="text"
                  required
                  value={newSeedForm.uri}
                  onChange={(e) => setNewSeedForm({ ...newSeedForm, uri: e.target.value })}
                  className="w-full bg-[#04060A] border border-slate-700 rounded-lg px-3 py-2 text-cyan-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Max Recursion Depth</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newSeedForm.depth}
                    onChange={(e) => setNewSeedForm({ ...newSeedForm, depth: Number(e.target.value) })}
                    className="w-full bg-[#04060A] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="flex flex-col justify-end space-y-1.5">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newSeedForm.renderJs}
                      onChange={(e) => setNewSeedForm({ ...newSeedForm, renderJs: e.target.checked })}
                    />
                    <span>Playwright Stealth PoW Solver</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSeedModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold cursor-pointer"
                >
                  Dispatch to Redis Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}