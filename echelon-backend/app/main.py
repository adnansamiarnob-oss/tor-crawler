"""
ECHELON Backend — Main FastAPI Application
Entry point with WebSocket live stream, CORS, and background tasks.
"""
from __future__ import annotations
import asyncio
import json
import logging
import random
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.routers import transport, crawler, graph, incidents, siem_rules, artifacts
from app.store import store
from app.models.schemas import CorrelationIncident, IncidentStream

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("echelon")


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket Connection Manager
# ─────────────────────────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        logger.info(f"WS client connected. Active: {len(self.active)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)
        logger.info(f"WS client disconnected. Active: {len(self.active)}")

    async def broadcast(self, payload: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


ws_manager = ConnectionManager()


# ─────────────────────────────────────────────────────────────────────────────
# Background Tasks
# ─────────────────────────────────────────────────────────────────────────────
async def _telemetry_updater():
    """Update daemon latency metrics every 4 seconds (matches frontend useEffect)."""
    while True:
        await asyncio.sleep(4)
        try:
            await store.update_daemon_latency()
        except Exception as e:
            logger.warning(f"Telemetry update error: {e}")


async def _incident_broadcaster():
    """Callback: broadcast new incidents to all WebSocket clients."""
    async def _on_new_incident(incident: CorrelationIncident):
        payload = IncidentStream(type="incident", data=incident)
        await ws_manager.broadcast(json.loads(payload.model_dump_json()))
    store.subscribe_incidents(_on_new_incident)


async def _keepalive_pinger():
    """Send periodic ping messages to keep WebSocket connections alive."""
    while True:
        await asyncio.sleep(30)
        try:
            await ws_manager.broadcast({"type": "ping", "timestamp": datetime.now(timezone.utc).isoformat()})
        except Exception:
            pass


# ─────────────────────────────────────────────────────────────────────────────
# App Lifespan
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("ECHELON Backend starting up...")
    asyncio.create_task(_telemetry_updater())
    asyncio.create_task(_keepalive_pinger())
    await _incident_broadcaster()
    logger.info("ECHELON Backend ready. All systems ONLINE.")
    yield
    # Shutdown
    logger.info("ECHELON Backend shutting down.")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ECHELON // PRISM-DARKNET API",
    description="Autonomous Tor (HSv3) • I2P (Garlic LeaseSet2) • ZeroNet (DHT/Zite) Crawler & Correlation Engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS — allow the Vite dev server and any localhost origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*",  # Open for local dev; restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ─────────────────────────────────────────────────────────
app.include_router(transport.router)
app.include_router(crawler.router)
app.include_router(graph.router)
app.include_router(incidents.router)
app.include_router(siem_rules.router)
app.include_router(artifacts.router)


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket — Live Incident Stream
# ─────────────────────────────────────────────────────────────────────────────
@app.websocket("/ws/v1/incidents/live")
async def ws_incidents_live(websocket: WebSocket):
    """
    WebSocket endpoint for real-time cross-overlay correlation incident stream.
    Frontend connects and receives live push events on new incidents.
    """
    await ws_manager.connect(websocket)

    # Send all existing incidents on connect (initial state sync)
    existing = store.get_incidents()
    for inc in existing[:10]:
        payload = IncidentStream(type="incident", data=inc)
        try:
            await websocket.send_json(json.loads(payload.model_dump_json()))
        except Exception:
            break

    try:
        while True:
            # Keep connection alive — wait for client messages
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ─────────────────────────────────────────────────────────────────────────────
# Health & Root Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "system": "ECHELON // PRISM-DARKNET",
        "status": "ONLINE",
        "version": "1.0.0",
        "docs": "/api/docs",
        "websocket": "ws://localhost:8000/ws/v1/incidents/live",
    }


@app.get("/api/v1/health")
async def health():
    daemons = store.get_daemons()
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "daemons": {d.id: d.status for d in daemons},
        "crawl_queue_depth": len(store.get_crawl_queue()),
        "total_incidents": len(store.incidents),
        "ws_clients": len(ws_manager.active),
    }
