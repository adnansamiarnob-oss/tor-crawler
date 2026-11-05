/**
 * ECHELON Frontend — Custom React Hooks
 * Data-fetching hooks that connect UI state to the FastAPI backend.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { api, connectIncidentStream, checkBackendAvailable } from '../api/client.js';

// ─── Backend Status Hook ───────────────────────────────────────────────────
export function useBackendStatus() {
  const [isOnline, setIsOnline] = useState(null); // null = checking
  useEffect(() => {
    checkBackendAvailable().then(setIsOnline);
    const interval = setInterval(() => checkBackendAvailable().then(setIsOnline), 30000);
    return () => clearInterval(interval);
  }, []);
  return isOnline;
}

// ─── Daemon Telemetry Hook ─────────────────────────────────────────────────
export function useDaemonTelemetry(isStreamActive, initialDaemons) {
  const [daemons, setDaemons] = useState(initialDaemons || []);
  const [loading, setLoading] = useState(true);

  const fetchDaemons = useCallback(async () => {
    try {
      const data = await api.getDaemons();
      setDaemons(data.daemons || data);
      setLoading(false);
    } catch {
      // Fall back to local simulation if backend unavailable
      if (initialDaemons) {
        setDaemons(prev =>
          prev.map(d => ({
            ...d,
            avg_latency:
              d.network === 'TOR'
                ? `${Math.floor(380 + Math.random() * 90)}ms`
                : d.network === 'I2P'
                ? `${Math.floor(620 + Math.random() * 140)}ms`
                : d.network === 'ZERONET'
                ? `${Math.floor(160 + Math.random() * 65)}ms`
                : '11ms',
          }))
        );
      }
      setLoading(false);
    }
  }, [initialDaemons]);

  useEffect(() => {
    fetchDaemons();
  }, [fetchDaemons]);

  useEffect(() => {
    if (!isStreamActive) return;
    const timer = setInterval(fetchDaemons, 4000);
    return () => clearInterval(timer);
  }, [isStreamActive, fetchDaemons]);

  return { daemons, loading, refetch: fetchDaemons };
}

// ─── Crawl Queue Hook ──────────────────────────────────────────────────────
export function useCrawlQueue(initialQueue) {
  const [crawlQueue, setCrawlQueue] = useState(initialQueue || []);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      const data = await api.getCrawlQueue();
      setCrawlQueue(data.jobs || data);
      setLoading(false);
    } catch {
      setCrawlQueue(initialQueue || []);
      setLoading(false);
    }
  }, [initialQueue]);

  useEffect(() => {
    fetchQueue();
    const timer = setInterval(fetchQueue, 8000); // Refresh every 8s
    return () => clearInterval(timer);
  }, [fetchQueue]);

  const addJobToQueue = useCallback((newJob) => {
    setCrawlQueue(prev => [newJob, ...prev]);
  }, []);

  return { crawlQueue, loading, refetch: fetchQueue, addJobToQueue };
}

// ─── Live Incidents Hook (WebSocket) ──────────────────────────────────────
export function useLiveIncidents(initialIncidents, isStreamActive) {
  const [incidents, setIncidents] = useState(initialIncidents || []);
  const [loading, setLoading] = useState(true);
  const cleanupRef = useRef(null);

  // Initial load from REST
  useEffect(() => {
    api.getIncidents().then(data => {
      if (data.incidents?.length) setIncidents(data.incidents);
      setLoading(false);
    }).catch(() => {
      setIncidents(initialIncidents || []);
      setLoading(false);
    });
  }, [initialIncidents]);

  // WebSocket subscription for live pushes
  useEffect(() => {
    if (!isStreamActive) return;
    cleanupRef.current = connectIncidentStream(
      (newIncident) => {
        setIncidents(prev => {
          // Avoid duplicates
          if (prev.find(i => i.id === newIncident.id)) return prev;
          return [newIncident, ...prev];
        });
      },
      (err) => console.warn('[ECHELON] WS incident stream error:', err)
    );
    return () => cleanupRef.current?.();
  }, [isStreamActive]);

  const addIncident = useCallback((incident) => {
    setIncidents(prev => [incident, ...prev]);
  }, []);

  return { incidents, loading, addIncident };
}

// ─── Graph Data Hook ───────────────────────────────────────────────────────
export function useGraphData(initialNodes, initialEdges) {
  const [graphNodes, setGraphNodes] = useState(initialNodes || []);
  const [graphEdges, setGraphEdges] = useState(initialEdges || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGraph().then(data => {
      if (data.nodes) setGraphNodes(data.nodes);
      if (data.edges) setGraphEdges(data.edges);
      setLoading(false);
    }).catch(() => {
      setGraphNodes(initialNodes || []);
      setGraphEdges(initialEdges || []);
      setLoading(false);
    });
  }, [initialNodes, initialEdges]);

  return { graphNodes, graphEdges, loading };
}

// ─── Attribution Vault Hook ────────────────────────────────────────────────
export function useAttributionVault() {
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getVault().then(data => {
      setVault(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { vault, loading };
}

// ─── SIEM Rules Hook ───────────────────────────────────────────────────────
export function useSIEMRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSIEMRules().then(data => {
      setRules(data.rules || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return { rules, loading };
}
