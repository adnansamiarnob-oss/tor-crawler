"""
ECHELON Backend — Artifact Extractor Service
Real regex-based extraction of PGP keys, BTC/XMR wallets, onion/i2p/ZeroNet links,
and MurmurHash3 favicon fingerprinting.
"""
from __future__ import annotations
import base64
import hashlib
import re
from typing import Dict, List, Optional

try:
    import mmh3
    _mmh3_available = True
except ImportError:
    _mmh3_available = False

# ─── Regex Patterns ───────────────────────────────────────────────────────────
RE_BTC_BECH32 = re.compile(r'\b(bc1[a-zA-HJ-NP-Z0-9]{25,39})\b')
RE_BTC_LEGACY = re.compile(r'\b([13][a-km-zA-HJ-NP-Z1-9]{25,34})\b')
RE_XMR = re.compile(r'\b(4[0-9AB][1-9A-HJ-NP-Za-km-z]{93})\b')
RE_ONION_V3 = re.compile(r'\b([a-z2-7]{56}\.onion)\b')
RE_I2P_B32 = re.compile(r'\b([a-z2-7]{52}\.b32\.i2p)\b')
RE_I2P_HOST = re.compile(r'\b([a-z0-9\-]{1,63}\.i2p)\b')
RE_ZERONET = re.compile(r'\b(1[a-km-zA-HJ-NP-Z1-9]{25,34})\b')
RE_PGP_FP = re.compile(r'((?:[0-9A-F]{4}\s?){10})', re.IGNORECASE)
RE_PGP_KEYID = re.compile(r'(0x[0-9A-F]{8,16})', re.IGNORECASE)
RE_EMAIL = re.compile(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b')
RE_CVE = re.compile(r'CVE-\d{4}-\d{4,7}', re.IGNORECASE)
RE_AWS_KEY = re.compile(r'\b(AKIA[0-9A-Z]{16})\b')
RE_ETAG = re.compile(r'ETag:\s*"([^"]+)"', re.IGNORECASE)
RE_SERVER = re.compile(r'Server:\s*(.+)', re.IGNORECASE)


def extract_artifacts(html: str, headers: Optional[Dict[str, str]] = None) -> Dict:
    """
    Extract all IOCs and cryptographic artifacts from raw HTML/text content.
    Returns structured JSON matching the frontend's ArtifactCounts schema + extras.
    """
    headers = headers or {}

    btc_wallets = list(set(RE_BTC_BECH32.findall(html) + RE_BTC_LEGACY.findall(html)))
    xmr_wallets = list(set(RE_XMR.findall(html)))
    onion_links = list(set(RE_ONION_V3.findall(html)))
    i2p_b32 = list(set(RE_I2P_B32.findall(html)))
    i2p_hosts = list(set(RE_I2P_HOST.findall(html)))
    zeronet_zites = list(set(RE_ZERONET.findall(html)))
    pgp_fingerprints = list(set(RE_PGP_FP.findall(html)))
    pgp_keyids = list(set(RE_PGP_KEYID.findall(html)))
    emails = list(set(RE_EMAIL.findall(html)))
    cves = list(set(RE_CVE.findall(html)))
    aws_keys = list(set(RE_AWS_KEY.findall(html)))
    etag = RE_ETAG.search(html)
    server_header = RE_SERVER.search(html)

    return {
        "artifacts": {
            "pgp": len(pgp_fingerprints) + len(pgp_keyids),
            "wallets": len(btc_wallets) + len(xmr_wallets),
            "emails": len(emails),
            "cves": len(cves),
            "archives": 0,  # requires file download inspection
        },
        "pivots": {
            "onion": onion_links,
            "i2p_b32": i2p_b32,
            "i2p_hosts": i2p_hosts,
            "zeronet": zeronet_zites,
        },
        "crypto": {
            "btc": btc_wallets,
            "xmr": xmr_wallets,
        },
        "pgp": {
            "fingerprints": pgp_fingerprints,
            "keyids": pgp_keyids,
        },
        "leaked": {
            "emails": emails,
            "cves": cves,
            "aws_keys": aws_keys,
        },
        "server_fingerprint": {
            "etag": etag.group(1) if etag else None,
            "server": server_header.group(1).strip() if server_header else None,
        },
    }


def compute_favicon_mmh3(favicon_bytes: bytes) -> Optional[int]:
    """
    Compute MurmurHash3 of base64-encoded favicon bytes.
    This is the same algorithm used by Shodan for favicon indexing.
    """
    if not favicon_bytes:
        return None
    if _mmh3_available:
        b64 = base64.encodebytes(favicon_bytes)
        return mmh3.hash(b64)
    # Fallback: return a hash of the raw bytes as a placeholder
    return int(hashlib.md5(favicon_bytes).hexdigest()[:8], 16)


def check_siem_rules(content: str, rules: List[Dict]) -> List[Dict]:
    """
    Evaluate SIEM percolator rules against crawled content.
    Returns list of matched rules.
    """
    matched = []
    for rule in rules:
        try:
            pattern = rule.get("pattern", "")
            if re.search(pattern, content, re.IGNORECASE | re.DOTALL):
                matched.append({
                    "rule_id": rule["id"],
                    "rule_name": rule["name"],
                    "action": rule["action"],
                })
        except re.error:
            pass  # skip malformed patterns
    return matched
