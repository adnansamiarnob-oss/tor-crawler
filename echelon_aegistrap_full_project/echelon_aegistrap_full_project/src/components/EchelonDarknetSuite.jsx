import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert, Radar, Network, Terminal, Cpu, Database, Eye, Lock,
  Activity, Zap, RefreshCw, Search, Layers, Globe, AlertTriangle,
  Key, FileCode, CheckCircle2, Radio, Crosshair, GitCommit, ArrowUpRight,
  Server, Share2, Filter, Play, Pause, Sparkles, Flame, Binary, Orbit
} from 'lucide-react';

const OVERLAY_NODES = [
  {
    id: 'ACTOR-CORE',
    label: 'UNC-3944 // DEADBOLT SYNDICATE',
    type: 'ACTOR',
    network: 'CORE',
    x: 450,
    y: 250,
    risk: 99,
    pgp: '0x9F8A7B1C4E2D0F19',
    status: 'TRACKED',
    details: 'Primary Ransomware-as-a-Service & Zero-Day Broker operating across Tor, I2P, and ZeroNet.'
  },
  {
    id: 'TOR-HS-01',
    label: 'lockbit74x29a...d9q2.onion',
    type: 'SERVICE',
    network: 'TOR',
    x: 185,
    y: 110,
    risk: 96,
    pgp: '0x9F8A7B1C4E2D0F19',
    faviconHash: 'mmh3:-148291044',
    sshBanner: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.6',
    status: 'ONLINE',
    latency: '412ms',
    details: 'Tor v3 Onion Negotiation Portal. Shares identical PGP key & CSS AST structure with I2P Eepsite.'
  },
  {
    id: 'TOR-HS-02',
    label: 'exploitmarket...v4a.onion',
    type: 'FORUM',
    network: 'TOR',
    x: 160,
    y: 375,
    risk: 88,
    pgp: '0x44A1B9E09C113F2A',
    faviconHash: 'mmh3:88219301',
    sshBanner: 'SSH-2.0-OpenSSH_9.2p1 Debian-2',
    status: 'ONLINE',
    latency: '580ms',
    details: '0-Day escrow forum advertising Fortinet & Ivanti RCE chains.'
  },
  {
    id: 'I2P-EEP-01',
    label: 'deadbolt-c2...b32.i2p',
    type: 'C2_INFRA',
    network: 'I2P',
    x: 725,
    y: 115,
    risk: 98,
    pgp: '0x9F8A7B1C4E2D0F19',
    faviconHash: 'mmh3:-148291044',
    garlicTunnels: '4 Inbound / 4 Outbound (ElGamal/AES+SessionTag)',
    status: 'ONLINE',
    latency: '690ms',
    details: 'I2P Garlic-routed C2 dead-drop & exfiltration API. Exact MurmurHash3 favicon match to lockbit74x29a.onion.'
  },
  {
    id: 'ZNET-ZITE-01',
    label: '1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D',
    type: 'ZITE_DROP',
    network: 'ZERONET',
    x: 735,
    y: 385,
    risk: 91,
    pgp: '0x9F8A7B1C4E2D0F19',
    btcSigner: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    peers: '37 DHT Peers (2 Clearnet IP Leaks Detected)',
    status: 'SYNCED',
    latency: '128ms',
    details: 'Decentralized ZeroNet leak repository signed via content.json ECDSA key.'
  },
  {
    id: 'SIEM-INC-902',
    label: 'Wazuh Alert #99412: Outbound SOCKS5',
    type: 'SIEM_HIT',
    network: 'SIEM',
    x: 450,
    y: 455,
    risk: 99,
    host: 'PROD-DB-04 (10.24.18.92)',
    status: 'CRITICAL',
    latency: '2ms',
    details: 'Internal enterprise server attempted Tor rendezvous & DNS resolution of deadbolt-c2.b32.i2p via local proxy.'
  }
];

const OVERLAY_LINKS = [
  { from: 'TOR-HS-01', to: 'ACTOR-CORE', label: 'PGP: 0x9F8A..0F19', color: '#A855F7', speed: '2.6s' },
  { from: 'TOR-HS-02', to: 'ACTOR-CORE', label: 'XMR Escrow Cluster', color: '#A855F7', speed: '3.4s' },
  { from: 'I2P-EEP-01', to: 'ACTOR-CORE', label: 'mmh3:-148291044', color: '#00F0FF', speed: '2.1s' },
  { from: 'ZNET-ZITE-01', to: 'ACTOR-CORE', label: 'ECDSA Signer Match', color: '#F59E0B', speed: '2.9s' },
  { from: 'SIEM-INC-902', to: 'ACTOR-CORE', label: 'C2 Beacon Correlation', color: '#FF2A54', speed: '1.3s' },
  { from: 'TOR-HS-01', to: 'I2P-EEP-01', label: 'Failover Mirror', color: '#00F0FF', dashed: true, speed: '4.2s' }
];

const INITIAL_INTERCEPTS = [
  {
    id: 'INT-8841',
    ts: '22:14:09.412Z',
    network: 'TOR',
    uri: 'http://lockbit74x29a8f1d9q2.onion/api/v2/negotiate',
    category: 'RaaS / Extortion',
    matchType: 'PGP + Favicon mmh3',
    confidence: 99.4,
    siemAlert: 'WAZUH-RULE-87901 (Tor Egress)',
    snippet: 'POST /api/v2/negotiate {"victim_id":"CORP-BD-88","ransom_xmr":42.5}'
  },
  {
    id: 'INT-8840',
    ts: '22:14:04.108Z',
    network: 'I2P',
    uri: 'http://deadbolt-c2-77x9a.b32.i2p/gate.php',
    category: 'C2 Dead-Drop',
    matchType: 'I2P LeaseSet2 + TLS JA3',
    confidence: 97.8,
    siemAlert: 'SURICATA-SID-2039411',
    snippet: 'SAMv3 STREAM STATUS RESULT=OK DESTINATION=deadbolt-c2...b32.i2p'
  },
  {
    id: 'INT-8839',
    ts: '22:13:55.890Z',
    network: 'ZERONET',
    uri: 'zero://1HeLLo4uzjaLetFx6NH3PMwFP3qbRbTf3D/content.json',
    category: 'Credential Dump',
    matchType: 'BitTorrent DHT Peer IP Leak',
    confidence: 95.1,
    siemAlert: 'ELASTIC-CTI-MATCH-402',
    snippet: 'content.json signed by 1A1zP1eP... | Leaked Peer: 185.220.101.44:15441'
  },
  {
    id: 'INT-8838',
    ts: '22:13:41.004Z',
    network: 'TOR',
    uri: 'http://exploitmarket99v4a.onion/thread/cve-2026-4491',
    category: '0-Day Exploit Broker',
    matchType: 'Stylometric NLP Author ID',
    confidence: 91.6,
    siemAlert: 'WAZUH-CVE-WATCH-19',
    snippet: 'Selling unauthenticated RCE chain for enterprise SSL-VPN appliances...'
  }
];

const FINGERPRINT_CLUSTERS = [
  {
    artifact: 'PGP Key ID: 0x9F8A7B1C4E2D0F19',
    type: 'Cryptographic Identity',
    torHits: 'lockbit74x29a...onion',
    i2pHits: 'deadbolt-c2...b32.i2p',
    znetHits: '1HeLLo4uz...RbTf3D',
    clearnetLeak: '185.220.101.44 (ASN 205100 - F3 Netze e.V.)',
    confidence: '99.8%'
  },
  {
    artifact: 'Favicon MurmurHash3: -148291044',
    type: 'Visual / Asset Hash',
    torHits: 'lockbit74x29a...onion',
    i2pHits: 'deadbolt-c2...b32.i2p',
    znetHits: 'None',
    clearnetLeak: '91.219.236.174 (Shodan Historical Match)',
    confidence: '98.2%'
  },
  {
    artifact: 'XMR Subaddress: 88a9f...31c4e',
    type: 'Cryptocurrency Escrow',
    torHits: 'exploitmarket...v4a.onion',
    i2pHits: 'vendor-escrow...b32.i2p',
    znetHits: '1Market99...x89A',
    clearnetLeak: 'Binance KYC Cashout Cluster #4419',
    confidence: '94.5%'
  },
  {
    artifact: 'SSH Host Key: SHA256:k9L2p...88xQ',
    type: 'Infrastructure Reuse',
    torHits: 'lockbit74x29a...onion:22',
    i2pHits: 'ssh-mgmt...b32.i2p',
    znetHits: 'DHT Seeder Node #14',
    clearnetLeak: '45.141.84.112 (Moldova Bulletproof VPS)',
    confidence: '99.9%'
  }
];

export default function EchelonDarknetSuite() {
  const [activeTab, setActiveTab] = useState('topology');
  const [selectedNode, setSelectedNode] = useState(OVERLAY_NODES[0]);
  const [streamActive, setStreamActive] = useState(true);
  const [intercepts, setIntercepts] = useState(INITIAL_INTERCEPTS);
  const [networkFilter, setNetworkFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [deanonymizePulse, setDeanonymizePulse] = useState(false);
  const [circuitId, setCircuitId] = useState('CIRC-9941-TORv3');
  const [hops, setHops] = useState([
    { role: 'ENTRY GUARD', ip: '185.220.101.7:9001', asn: 'AS205100 (DE)', latency: '34ms' },
    { role: 'MIDDLE RELAY', ip: '198.98.56.149:443', asn: 'AS53667 (US)', latency: '112ms' },
    { role: 'RENDEZVOUS PT', ip: '45.154.255.14:9001', asn: 'AS44477 (NL)', latency: '198ms' },
    { role: 'HIDDEN SERVICE', ip: 'lockbit74x...onion', asn: 'HS_DESC v3 (Ed25519)', latency: '412ms' }
  ]);
  const [spectralBars, setSpectralBars] = useState(Array.from({ length: 18 }, () => 45));

  // Animate spectral frequency bars & incoming darknet intercepts
  useEffect(() => {
    if (!streamActive) return;
    const interval = setInterval(() => {
      setSpectralBars(Array.from({ length: 18 }, () => Math.floor(Math.random() * 82) + 18));
    }, 650);
    return () => clearInterval(interval);
  }, [streamActive]);

  useEffect(() => {
    if (!streamActive) return;
    const pool = [
      {
        network: 'TOR',
        uri: 'http://ransomhub88x19.onion/chat/victim-9921',
        category: 'RaaS Negotiation',
        matchType: 'WebSocket Token Correlation',
        confidence: 96.7,
        siemAlert: 'WAZUH-TOR-EGRESS-41',
        snippet: 'WS Frame: {"actor":"admin","msg":"Upload decryptor proof for domain controller"}'
      },
      {
        network: 'I2P',
        uri: 'http://apt-loader-drop.b32.i2p/stage2.elf',
        category: 'ELF Dropper Staging',
        matchType: 'YARA: Linux_Cobalt_Beacon',
        confidence: 99.1,
        siemAlert: 'FALCON-EDR-ELF-902',
        snippet: 'GET /stage2.elf | SHA256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      },
      {
        network: 'ZERONET',
        uri: 'zero://1LeakBase99x2LetFx6NH3PMwFP3qb/data/users.json',
        category: 'Telecom DB Dump',
        matchType: 'ECDSA PubKey + DHT Peer Leak',
        confidence: 94.3,
        siemAlert: 'SIEM-CORR-HIGH-08',
        snippet: 'BitTorrent DHT Announce from 94.142.241.111:26552 (Clearnet Exposure!)'
      }
    ];

    const timer = setInterval(() => {
      const sample = pool[Math.floor(Math.random() * pool.length)];
      const now = new Date().toISOString().split('T')[1].slice(0, 12) + 'Z';
      setIntercepts(prev => [
        {
          id: `INT-${Math.floor(1000 + Math.random() * 9000)}`,
          ts: now,
          ...sample
        },
        ...prev.slice(0, 9)
      ]);
    }, 4200);

    return () => clearInterval(timer);
  }, [streamActive]);

  const rotateCircuit = () => {
    const guards = ['185.220.101.44:9001', '193.218.118.91:443', '89.58.27.19:9001'];
    const middles = ['194.26.192.64:9001', '51.15.43.205:443', '162.247.74.201:9001'];
    const rends = ['45.66.35.11:9001', '109.70.100.2:443', '37.218.245.50:9001'];
    setCircuitId(`CIRC-${Math.floor(1000 + Math.random() * 9000)}-NEWNYM`);
    setHops([
      { role: 'ENTRY GUARD', ip: guards[Math.floor(Math.random() * guards.length)], asn: 'AS205100 (DE)', latency: `${22 + Math.floor(Math.random() * 30)}ms` },
      { role: 'MIDDLE RELAY', ip: middles[Math.floor(Math.random() * middles.length)], asn: 'AS12876 (FR)', latency: `${95 + Math.floor(Math.random() * 45)}ms` },
      { role: 'RENDEZVOUS PT', ip: rends[Math.floor(Math.random() * rends.length)], asn: 'AS44477 (NL)', latency: `${180 + Math.floor(Math.random() * 60)}ms` },
      { role: 'HIDDEN SERVICE', ip: 'lockbit74x...onion', asn: 'HS_DESC v3 (Ed25519)', latency: `${350 + Math.floor(Math.random() * 110)}ms` }
    ]);
  };

  const triggerPulse = () => {
    setDeanonymizePulse(true);
    setTimeout(() => setDeanonymizePulse(false), 3200);
  };

  const filteredIntercepts = useMemo(() => {
    return intercepts.filter(item => {
      const matchesNet = networkFilter === 'ALL' || item.network === networkFilter;
      const matchesSearch =
        item.uri.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.snippet.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesNet && matchesSearch;
    });
  }, [intercepts, networkFilter, searchQuery]);

  const badgeStyle = net => {
    if (net === 'TOR') return 'bg-purple-500/15 text-purple-300 border-purple-500/40';
    if (net === 'I2P') return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40';
    if (net === 'ZERONET') return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    return 'bg-rose-500/15 text-rose-300 border-rose-500/40';
  };

  return (
    <div className="min-h-screen bg-[#030508] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Subtle tactical grid background */}
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 20%, rgba(0, 240, 255, 0.14), transparent 55%), linear-gradient(to right, rgba(30, 41, 59, 0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(30, 41, 59, 0.35) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 36px 36px, 36px 36px'
        }}
      />

      {/* TOP COMMAND HEADER */}
      <header className="relative z-20 border-b border-slate-800/90 bg-[#070B12]/90 backdrop-blur-md px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <Radar className="w-5 h-5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold">
                  NSA // SIGINT OVERLAY CRAWLER
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  TS // SI // NOFORN
                </span>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                ECHELON // PRISM-DARKNET CORRELATION ENGINE
              </h1>
            </div>
          </div>

          {/* Live Spectral Frequency Analyzer */}
          <div className="hidden xl:flex items-center gap-3 bg-[#0B111E] border border-slate-800 px-3.5 py-1.5 rounded-lg">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div className="text-[11px] font-mono text-slate-400">
              <div className="text-cyan-300 font-semibold">GARLIC / ONION SPECTRAL STREAM</div>
              <div>SAMv3 :7656 | SOCKS5 :9050 | ZNP :15441</div>
            </div>
            <div className="flex items-end gap-0.5 h-7 ml-2">
              {spectralBars.map((val, idx) => (
                <div
                  key={idx}
                  className="w-1 rounded-t transition-all duration-300"
                  style={{
                    height: `${val}%`,
                    backgroundColor: idx % 3 === 0 ? '#A855F7' : idx % 2 === 0 ? '#00F0FF' : '#F59E0B'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Stream Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={triggerPulse}
              className="px-3 py-1.5 rounded-lg font-mono text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 transition cursor-pointer shadow-[0_0_15px_rgba(255,42,84,0.25)]"
            >
              <Crosshair className="w-3.5 h-3.5" />
              DE-ANONYMIZE PULSE
            </button>
            <button
              onClick={() => setStreamActive(!streamActive)}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs border flex items-center gap-1.5 transition cursor-pointer ${
                streamActive
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {streamActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {streamActive ? 'LIVE CRAWL: ACTIVE' : 'CRAWL PAUSED'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-[1600px] mx-auto mt-3 pt-2 border-t border-slate-800/70 flex flex-wrap gap-2">
          {[
            { id: 'topology', label: '1. Cross-Overlay Topology & Radar', icon: Orbit },
            { id: 'crawler', label: '2. Multi-Hop Circuit & Darknet Crawler', icon: Globe },
            { id: 'fingerprints', label: '3. Cryptographic Attribution Matrix', icon: Key },
            { id: 'blueprint', label: '4. Backend Engineering Blueprint', icon: Server }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-lg font-mono text-xs flex items-center gap-2 transition cursor-pointer ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                    : 'bg-[#0B101B] text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <main className="relative z-10 max-w-[1600px] w-full mx-auto px-6 py-5 flex-1 space-y-5">
        {/* TOP KPI RIBBON */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'TOR v3 ONIONS INDEXED', val: '14,892', sub: 'HS_DESC Poller + 24 SOCKS5 Workers', color: 'text-purple-400', border: 'border-purple-500/30' },
            { label: 'I2P EEPSITES & LEASESETS', val: '3,419', sub: 'SAMv3 Bridge (:7656) Floodfill Sync', color: 'text-cyan-400', border: 'border-cyan-500/30' },
            { label: 'ZERONET ZITES MIRRORED', val: '1,904', sub: 'BitTorrent DHT + ECDSA Signer Graph', color: 'text-amber-400', border: 'border-amber-500/30' },
            { label: 'CROSS-NETWORK MATCHES', val: '428', sub: 'Shared PGP / Favicon mmh3 / SSH Key', color: 'text-emerald-400', border: 'border-emerald-500/30' },
            { label: 'SIEM INCIDENT CORRELATIONS', val: '7 CRITICAL', sub: 'Internal Host -> Darknet C2 Hits', color: 'text-rose-400', border: 'border-rose-500/40' }
          ].map((kpi, i) => (
            <div key={i} className={`bg-[#090D16]/90 border ${kpi.border} rounded-xl p-3.5 shadow-lg`}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{kpi.label}</div>
              <div className={`text-2xl font-bold font-mono mt-1 ${kpi.color}`}>{kpi.val}</div>
              <div className="text-[11px] text-slate-400 mt-1 truncate">{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* TAB 1: TOPOLOGY & LIVE RADAR */}
        {activeTab === 'topology' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Kinetic SVG Radar & Entity Correlation Graph */}
            <div className="lg:col-span-8 bg-[#080C14] border border-slate-800 rounded-xl p-4 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <span className="text-xs font-mono uppercase text-cyan-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> REAL-TIME CROSS-OVERLAY ENTITY GRAPH
                  </span>
                  <h2 className="text-sm font-semibold text-slate-200">
                    Tor (.onion) + I2P (.b32.i2p) + ZeroNet (Zite) + Enterprise SIEM Correlation
                  </h2>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="flex items-center gap-1 text-purple-300"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"/> TOR</span>
                  <span className="flex items-center gap-1 text-cyan-300"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block"/> I2P</span>
                  <span className="flex items-center gap-1 text-amber-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/> ZERONET</span>
                  <span className="flex items-center gap-1 text-rose-300"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"/> SIEM HIT</span>
                </div>
              </div>

              <div className="relative w-full h-[490px] bg-[#05080F] rounded-lg border border-slate-800/80 overflow-hidden">
                <svg viewBox="0 0 900 520" className="w-full h-full">
                  <defs>
                    <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.16" />
                      <stop offset="65%" stopColor="#A855F7" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Concentric Orbital Rings */}
                  <circle cx="450" cy="250" r="215" fill="url(#radarGlow)" stroke="#1E293B" strokeDasharray="4 6" />
                  <circle cx="450" cy="250" r="145" fill="none" stroke="#1E293B" strokeDasharray="2 4" />
                  <circle cx="450" cy="250" r="75" fill="none" stroke="#00F0FF" strokeOpacity="0.25" />

                  {/* Rotating Radar Sweep Line */}
                  <g style={{ transformOrigin: '450px 250px' }} className="animate-radar">
                    <line x1="450" y1="250" x2="450" y2="25" stroke="#00F0FF" strokeWidth="1.5" strokeOpacity="0.55" />
                    <path d="M450,250 L450,25 A225,225 0 0,1 610,95 Z" fill="#00F0FF" fillOpacity="0.06" />
                  </g>

                  {/* De-anonymization Laser Pulse when triggered */}
                  {deanonymizePulse && (
                    <g>
                      <circle cx="450" cy="250" r="210" fill="none" stroke="#FF2A54" strokeWidth="3" className="animate-ping" />
                      {OVERLAY_NODES.map((n, idx) => (
                        <line
                          key={idx}
                          x1="450"
                          y1="250"
                          x2={n.x}
                          y2={n.y}
                          stroke="#FF2A54"
                          strokeWidth="2.5"
                        />
                      ))}
                    </g>
                  )}

                  {/* Curved Bezier Links + Animated Telemetry Packets */}
                  {OVERLAY_LINKS.map((link, idx) => {
                    const source = OVERLAY_NODES.find(n => n.id === link.from);
                    const target = OVERLAY_NODES.find(n => n.id === link.to);
                    if (!source || !target) return null;
                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2 - 28;
                    const pathData = `M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`;
                    const pathId = `link-path-${idx}`;

                    return (
                      <g key={idx}>
                        <path
                          id={pathId}
                          d={pathData}
                          fill="none"
                          stroke={link.color}
                          strokeWidth="1.8"
                          strokeOpacity="0.55"
                          strokeDasharray={link.dashed ? '5 5' : 'none'}
                        />
                        {streamActive && (
                          <circle r="4" fill={link.color}>
                            <animateMotion dur={link.speed} repeatCount="indefinite" path={pathData} />
                          </circle>
                        )}
                        <rect
                          x={midX - 58}
                          y={midY - 10}
                          width="116"
                          height="18"
                          rx="4"
                          fill="#070B12"
                          stroke={link.color}
                          strokeOpacity="0.4"
                        />
                        <text
                          x={midX}
                          y={midY + 2}
                          textAnchor="middle"
                          fill="#CBD5E1"
                          fontSize="9"
                          fontFamily="JetBrains Mono"
                        >
                          {link.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Overlay Nodes */}
                  {OVERLAY_NODES.map(node => {
                    const isSelected = selectedNode?.id === node.id;
                    const nodeColor =
                      node.network === 'TOR'
                        ? '#A855F7'
                        : node.network === 'I2P'
                        ? '#00F0FF'
                        : node.network === 'ZERONET'
                        ? '#F59E0B'
                        : '#FF2A54';

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedNode(node)}
                        className="cursor-pointer"
                      >
                        {(isSelected || node.network === 'SIEM' || node.network === 'CORE') && (
                          <circle
                            r="28"
                            fill="none"
                            stroke={nodeColor}
                            strokeWidth="1.5"
                            strokeOpacity="0.5"
                            className="animate-ping"
                          />
                        )}
                        <circle
                          r={node.network === 'CORE' ? 24 : 18}
                          fill="#090D16"
                          stroke={nodeColor}
                          strokeWidth={isSelected ? '3' : '2'}
                        />
                        <text
                          y="4"
                          textAnchor="middle"
                          fill={nodeColor}
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="JetBrains Mono"
                        >
                          {node.network}
                        </text>
                        <rect
                          x="-85"
                          y="24"
                          width="170"
                          height="20"
                          rx="4"
                          fill="#070B12"
                          stroke="#1E293B"
                        />
                        <text
                          y="37"
                          textAnchor="middle"
                          fill="#F1F5F9"
                          fontSize="9.5"
                          fontFamily="JetBrains Mono"
                        >
                          {node.label.slice(0, 25)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Right Inspector Column */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bg-[#080C14] border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-cyan-400">DEEP NODE TELEMETRY</span>
                    <h3 className="text-base font-bold font-mono text-white mt-0.5">{selectedNode.label}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-xs font-mono border ${badgeStyle(selectedNode.network)}`}>
                    RISK {selectedNode.risk}/100
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-3 leading-relaxed">{selectedNode.details}</p>

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="bg-[#05080F] p-2.5 rounded border border-slate-800/80 flex justify-between">
                    <span className="text-slate-400">NODE ID / STATUS:</span>
                    <span className="text-cyan-300">{selectedNode.id} // {selectedNode.status}</span>
                  </div>
                  {selectedNode.pgp && (
                    <div className="bg-[#05080F] p-2.5 rounded border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">PGP FINGERPRINT:</span>
                      <span className="text-purple-300">{selectedNode.pgp}</span>
                    </div>
                  )}
                  {selectedNode.faviconHash && (
                    <div className="bg-[#05080F] p-2.5 rounded border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">FAVICON MMH3:</span>
                      <span className="text-emerald-300">{selectedNode.faviconHash}</span>
                    </div>
                  )}
                  {selectedNode.garlicTunnels && (
                    <div className="bg-[#05080F] p-2.5 rounded border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">I2P GARLIC LEASE:</span>
                      <span className="text-cyan-300">{selectedNode.garlicTunnels}</span>
                    </div>
                  )}
                  {selectedNode.peers && (
                    <div className="bg-[#05080F] p-2.5 rounded border border-slate-800/80 flex justify-between">
                      <span className="text-slate-400">ZERONET DHT:</span>
                      <span className="text-amber-300">{selectedNode.peers}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live Intercept Stream */}
              <div className="bg-[#080C14] border border-slate-800 rounded-xl p-4 flex-1">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase text-rose-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> REAL-TIME SIEM & DARKNET INTERCEPTS
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">{intercepts.length} buffered</span>
                </div>
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {intercepts.slice(0, 5).map(item => (
                    <div key={item.id} className="bg-[#05080F] border border-slate-800/90 rounded-lg p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeStyle(item.network)}`}>
                          {item.network}
                        </span>
                        <span className="font-mono text-[10px] text-rose-400">{item.siemAlert}</span>
                      </div>
                      <div className="font-mono text-slate-200 mt-1.5 truncate">{item.uri}</div>
                      <div className="font-mono text-[11px] text-slate-400 mt-1 truncate">{item.snippet}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MULTI-HOP CIRCUIT & LIVE CRAWLER */}
        {activeTab === 'crawler' && (
          <div className="space-y-5">
            {/* Interactive 3-Hop Anonymity Circuit Visualizer */}
            <div className="bg-[#080C14] border border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 uppercase">ACTIVE TOR / I2P GARLIC CIRCUIT TUNNEL</span>
                  <h3 className="text-sm font-semibold text-white">
                    Active Circuit ID: <span className="font-mono text-purple-400">{circuitId}</span>
                  </h3>
                </div>
                <button
                  onClick={rotateCircuit}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  SIGNAL NEWNYM / ROTATE CIRCUIT
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {hops.map((hop, i) => (
                  <div key={i} className="bg-[#05080F] border border-slate-800 rounded-lg p-3 relative">
                    <div className="text-[10px] font-mono text-cyan-400 uppercase">{hop.role}</div>
                    <div className="text-sm font-mono font-bold text-white mt-1">{hop.ip}</div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2">
                      <span>{hop.asn}</span>
                      <span className="text-emerald-400">{hop.latency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-[#080C14] border border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  {['ALL', 'TOR', 'I2P', 'ZERONET'].map(net => (
                    <button
                      key={net}
                      onClick={() => setNetworkFilter(net)}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs border cursor-pointer ${
                        networkFilter === net
                          ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/50'
                          : 'bg-[#05080F] text-slate-400 border-slate-800'
                      }`}
                    >
                      {net}
                    </button>
                  ))}
                </div>
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter .onion, .b32.i2p, Zite or CVE..."
                    className="w-full bg-[#05080F] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredIntercepts.map(item => (
                  <div key={item.id} className="bg-[#05080F] border border-slate-800/90 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeStyle(item.network)}`}>
                          {item.network}
                        </span>
                        <span className="font-mono text-xs text-white font-semibold">{item.uri}</span>
                        <span className="text-[11px] font-mono text-slate-400">{item.ts}</span>
                      </div>
                      <div className="font-mono text-xs text-slate-300">{item.snippet}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <div className="text-[10px] text-emerald-400">{item.matchType} ({item.confidence}%)</div>
                        <div className="text-[11px] text-rose-400">{item.siemAlert}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CRYPTOGRAPHIC ATTRIBUTION MATRIX */}
        {activeTab === 'fingerprints' && (
          <div className="bg-[#080C14] border border-slate-800 rounded-xl p-5">
            <div className="mb-4">
              <span className="text-xs font-mono text-cyan-400 uppercase">CROSS-NETWORK IDENTITY LINKING</span>
              <h2 className="text-base font-bold text-white mt-0.5">
                Cryptographic & Visual Artifacts Proving Shared Threat Actor Infrastructure
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-3 px-3">SHARED ARTIFACT</th>
                    <th className="py-3 px-3">TOR (.ONION)</th>
                    <th className="py-3 px-3">I2P (.B32.I2P)</th>
                    <th className="py-3 px-3">ZERONET (ZITE)</th>
                    <th className="py-3 px-3">DE-ANONYMIZED CLEARNET LEAD</th>
                    <th className="py-3 px-3">CONFIDENCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {FINGERPRINT_CLUSTERS.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50">
                      <td className="py-3 px-3 text-cyan-300 font-semibold">{row.artifact}</td>
                      <td className="py-3 px-3 text-purple-300">{row.torHits}</td>
                      <td className="py-3 px-3 text-cyan-200">{row.i2pHits}</td>
                      <td className="py-3 px-3 text-amber-300">{row.znetHits}</td>
                      <td className="py-3 px-3 text-rose-300">{row.clearnetLeak}</td>
                      <td className="py-3 px-3 text-emerald-400 font-bold">{row.confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: BACKEND ENGINEERING BLUEPRINT */}
        {activeTab === 'blueprint' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: '1. Overlay Ingress & Proxy Daemons (Docker Pool)',
                stack: 'Tor (stem :9051) + i2pd (SAMv3 :7656) + ZeroNet (--tor always :15441)',
                desc: 'Deploy isolated proxy containers. Python workers connect to Tor ControlPort 9051 to issue SIGNAL NEWNYM per crawl batch, use i2pd HTTP proxy (:4444) for .b32.i2p eepsites, and parse ZeroNet content.json files.'
              },
              {
                title: '2. Multi-Modal Artifact Extractor Workers',
                stack: 'Playwright Headless + python-gnupg + mmh3 + YARA-python',
                desc: 'Strip DOM scripts, compute MurmurHash3 of /favicon.ico, extract ASCII-armored PGP public blocks, regex BTC/XMR wallet addresses, and hash SSH/TLS JA3 fingerprints.'
              },
              {
                title: '3. Entity Graph & Cross-Network Linker',
                stack: 'Neo4j Graph DB + OpenSearch + Redis Streams',
                desc: 'Every extracted PGP key, favicon hash, or XMR address becomes a Graph Node. When a .onion site and a .b32.i2p site link to the same PGP node, emit a high-confidence Actor Cluster event.'
              },
              {
                title: '4. Real-Time SIEM / Wazuh Incident Correlator',
                stack: 'FastAPI WebSockets + Wazuh / Suricata Webhook Consumer',
                desc: 'Ingest enterprise firewall/SIEM alerts in real time. Cross-check outbound IPs, JA3 hashes, and DNS queries against the active Darknet Entity Graph to flag internal hosts communicating with darknet C2s.'
              }
            ].map((layer, idx) => (
              <div key={idx} className="bg-[#080C14] border border-slate-800 rounded-xl p-4">
                <div className="text-xs font-mono text-cyan-400 font-bold">{layer.title}</div>
                <div className="text-xs font-mono text-purple-300 mt-1">{layer.stack}</div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{layer.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* BOTTOM RAW SOCKET HEX INTERCEPT TICKER */}
      <footer className="relative z-20 border-t border-slate-800 bg-[#05080F] py-2 px-4 overflow-hidden">
        <div className="animate-marquee font-mono text-[11px] text-slate-400 flex items-center gap-8">
          <span className="text-cyan-400">[SAMv3 :7656] STREAM STATUS RESULT=OK ID=4419</span>
          <span className="text-purple-400">[TOR CTRL :9051] 650 HS_DESC RECEIVED lockbit74x29a...onion</span>
          <span className="text-amber-400">[ZERONET DHT :15441] VERIFIED ECDSA SIG content.json (1HeLLo4uz...)</span>
          <span className="text-rose-400">[WAZUH SIEM CORRELATION] Rule 87901 matched outbound SOCKS5 beacon on PROD-DB-04</span>
          <span className="text-emerald-400">[MMH3 MATCH] Favicon hash -148291044 linked across Tor & I2P</span>
        </div>
      </footer>
    </div>
  );
}
