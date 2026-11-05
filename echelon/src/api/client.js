/**
 * ECHELON Frontend — API Client
 * All communication with the FastAPI backend goes through this module.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';

// ─── Generic fetch helper ─────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e) {
    console.warn(`[ECHELON API] ${path} failed:`, e.message);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DAEMON / TRANSPORT APIs
// ─────────────────────────────────────────────────────────────────────────────
export const api = {
  /**
   * GET /api/v1/transport/daemons
   * Returns live telemetry for all 4 overlay daemons.
   */
  getDaemons: () => apiFetch('/api/v1/transport/daemons'),

  /**
   * POST /api/v1/transport/tor/newnym
   * Rotate all Tor circuits via ControlPort SIGNAL NEWNYM.
   */
  torNewnym: () => apiFetch('/api/v1/transport/tor/newnym', { method: 'POST' }),

  /**
   * POST /api/v1/transport/tor/rotate-all
   * Rotate ALL circuits (Tor + I2P tunnel rebuild).
   */
  rotateAllCircuits: () => apiFetch('/api/v1/transport/tor/rotate-all', { method: 'POST' }),

  // ─── CRAWLER APIs ──────────────────────────────────────────────────────────
  /**
   * GET /api/v1/crawler/queue
   * Returns the active spider queue.
   */
  getCrawlQueue: (network) => {
    const params = network && network !== 'ALL' ? `?network=${network}` : '';
    return apiFetch(`/api/v1/crawler/queue${params}`);
  },

  /**
   * POST /api/v1/crawler/seed
   * Inject a new darknet seed URL.
   */
  injectSeed: (payload) => apiFetch('/api/v1/crawler/seed', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  /**
   * POST /api/v1/crawler/spider/{job_id}
   * Trigger recursive sub-link spidering on a crawl job.
   */
  spiderJob: (jobId) => apiFetch(`/api/v1/crawler/spider/${jobId}`, { method: 'POST' }),

  /**
   * POST /api/v1/crawler/yara/{job_id}
   * Run YARA scan on discovered archives from a crawl job.
   */
  yaraScanJob: (jobId) => apiFetch(`/api/v1/crawler/yara/${jobId}`, { method: 'POST' }),

  // ─── GRAPH APIs ────────────────────────────────────────────────────────────
  /**
   * GET /api/v1/graph/
   * Return all nodes and edges for the attribution graph.
   */
  getGraph: () => apiFetch('/api/v1/graph/'),

  /**
   * GET /api/v1/graph/neighbors/{nodeId}
   * Expand Cypher hops — 2-hop neighborhood query.
   */
  expandNodeNeighbors: (nodeId, hops = 2) =>
    apiFetch(`/api/v1/graph/neighbors/${nodeId}?hops=${hops}`),

  // ─── INCIDENTS APIs ────────────────────────────────────────────────────────
  /**
   * GET /api/v1/incidents/
   * Return filtered correlation incidents.
   */
  getIncidents: (network, search) => {
    const params = new URLSearchParams();
    if (network && network !== 'ALL') params.set('network', network);
    if (search) params.set('search', search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiFetch(`/api/v1/incidents/${qs}`);
  },

  /**
   * POST /api/v1/incidents/{id}/escalate
   * Escalate incident to Wazuh SIEM + MISP.
   */
  escalateIncident: (incidentId, target = 'both', priority = 'P1') =>
    apiFetch(`/api/v1/incidents/${incidentId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ incident_id: incidentId, target, priority }),
    }),

  /**
   * GET /api/v1/incidents/{id}/stix
   * Export incident as STIX 2.1 bundle.
   */
  exportSTIX: (incidentId) => apiFetch(`/api/v1/incidents/${incidentId}/stix`),

  /**
   * POST /api/v1/incidents/simulate
   * Inject a simulated cross-overlay correlation hit.
   */
  simulateCorrelation: () => apiFetch('/api/v1/incidents/simulate', { method: 'POST' }),

  // ─── ATTRIBUTION VAULT APIs ───────────────────────────────────────────────
  /**
   * GET /api/v1/artifacts/vault
   * Return PGP keyring, favicon collisions, and stylometry clusters.
   */
  getVault: () => apiFetch('/api/v1/artifacts/vault'),

  // ─── SIEM RULES APIs ──────────────────────────────────────────────────────
  /**
   * GET /api/v1/siem/rules
   * Return all active SIEM percolator rules.
   */
  getSIEMRules: () => apiFetch('/api/v1/siem/rules'),

  /**
   * POST /api/v1/siem/rules/push
   * Sync all rules to the Redis crawler worker fleet.
   */
  pushRulesToFleet: () => apiFetch('/api/v1/siem/rules/push', { method: 'POST' }),

  // ─── HEALTH ───────────────────────────────────────────────────────────────
  health: () => apiFetch('/api/v1/health'),
};

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket — Live Incident Stream
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Connect to the live WebSocket incident stream.
 * @param {function} onIncident - Called with each new CorrelationIncident
 * @param {function} onError - Called on connection error
 * @returns {function} cleanup function to close the WebSocket
 */
export function connectIncidentStream(onIncident, onError) {
  const wsUrl = `${WS_BASE}/ws/v1/incidents/live`;
  let ws = null;
  let reconnectTimer = null;
  let isActive = true;

  function connect() {
    if (!isActive) return;
    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.info('[ECHELON WS] Connected to live incident stream');
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'incident' && payload.data) {
            onIncident(payload.data);
          }
          // ping/pong handled silently
        } catch (e) {
          console.warn('[ECHELON WS] Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('[ECHELON WS] Error:', err);
        if (onError) onError(err);
      };

      ws.onclose = () => {
        console.info('[ECHELON WS] Disconnected. Reconnecting in 5s...');
        if (isActive) {
          reconnectTimer = setTimeout(connect, 5000);
        }
      };

      // Keep-alive ping every 25s
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 25000);

      ws._pingInterval = pingInterval;
    } catch (e) {
      console.warn('[ECHELON WS] Connect failed:', e);
      if (isActive) reconnectTimer = setTimeout(connect, 5000);
    }
  }

  connect();

  return function cleanup() {
    isActive = false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      clearInterval(ws._pingInterval);
      ws.close();
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Backend availability check
// ─────────────────────────────────────────────────────────────────────────────
export async function checkBackendAvailable() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}
