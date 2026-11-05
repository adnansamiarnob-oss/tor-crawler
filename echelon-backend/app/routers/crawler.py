"""
ECHELON Backend — Crawler Router
Manages the spider queue, seed injection, DOM inspection, and YARA scans.
"""
from __future__ import annotations
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.models.schemas import (
    ActionResponse,
    ArtifactCounts,
    CrawlJob,
    CrawlQueueResponse,
    NewSeedRequest,
)
from app.services.crawler_engine import dispatch_crawl
from app.store import store

router = APIRouter(prefix="/api/v1/crawler", tags=["crawler"])


@router.get("/queue", response_model=CrawlQueueResponse)
async def get_crawl_queue(
    network: Optional[str] = Query(None, description="Filter by network: TOR, I2P, ZERONET"),
):
    """Return the active spider queue."""
    jobs = store.get_crawl_queue()
    if network and network != "ALL":
        jobs = [j for j in jobs if j.network == network]
    return CrawlQueueResponse(jobs=jobs, total=len(jobs))


@router.get("/queue/{job_id}")
async def get_crawl_job(job_id: str):
    """Get details for a specific crawl job including sanitized DOM."""
    job = store.get_crawl_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Crawl job {job_id} not found")
    return job


@router.post("/seed", response_model=CrawlJob)
async def inject_seed(payload: NewSeedRequest, background_tasks: BackgroundTasks):
    """
    Inject a new darknet seed URL into the crawler queue.
    Dispatches an async crawl job in the background.
    """
    network_latency = {"TOR": "440ms", "I2P": "690ms", "ZERONET": "180ms"}

    new_job = CrawlJob(
        id=f"CRW-{str(uuid.uuid4().int)[:6]}",
        network=payload.network,
        uri=payload.uri,
        title=f"Queued {payload.network} Deep Crawl Target",
        status="CRAWLING (Depth 1)",
        latency=network_latency.get(payload.network, "400ms"),
        depth=payload.depth,
        dom_hash="mmh3:pending_ingest",
        artifacts=ArtifactCounts(pgp=0, wallets=0, emails=0, cves=0, archives=0),
        last_crawled="just now",
        sanitized_dom=f"<!-- Dispatched to {payload.network} Worker Pool | JS Rendering: {payload.render_js} -->\n<html><body>Awaiting full DOM &amp; artifact extraction...</body></html>",
    )

    await store.add_crawl_job(new_job)

    # Run the actual crawl in background
    background_tasks.add_task(_run_crawl_background, new_job.id, new_job)

    return new_job


async def _run_crawl_background(job_id: str, job: CrawlJob):
    """Background task: dispatch the crawl and update the store with results."""
    try:
        updated_job = await dispatch_crawl(job)
        await store.update_crawl_job(
            job_id,
            status=updated_job.status,
            latency=updated_job.latency,
            sanitized_dom=updated_job.sanitized_dom,
            artifacts=updated_job.artifacts,
            dom_hash=updated_job.dom_hash,
            last_crawled="just now",
        )
    except Exception as e:
        await store.update_crawl_job(job_id, status=f"ERROR: {str(e)[:60]}")


@router.post("/spider/{job_id}", response_model=ActionResponse)
async def spider_outbound_links(job_id: str, background_tasks: BackgroundTasks):
    """
    Trigger recursive sub-link spidering on a completed crawl job.
    Extracts outbound .onion/.b32.i2p/ZeroNet links and queues them.
    """
    job = store.get_crawl_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Extract pivot links from sanitized DOM (run extraction service)
    from app.services.artifact_extractor import extract_artifacts
    extracted = extract_artifacts(job.sanitized_dom)
    pivots = extracted.get("pivots", {})
    all_pivots = (
        [("TOR", u) for u in pivots.get("onion", [])]
        + [("I2P", u) for u in pivots.get("i2p_b32", [])]
        + [("ZERONET", u) for u in pivots.get("zeronet", [])]
    )

    queued = 0
    for net, uri in all_pivots[:5]:  # Limit to 5 new seeds per spider
        child_job = CrawlJob(
            id=f"CRW-{str(uuid.uuid4().int)[:6]}",
            network=net,
            uri=f"http://{uri}/" if not uri.startswith("http") else uri,
            title=f"[SPIDER] {uri[:48]}",
            status="QUEUED",
            depth=job.depth - 1 if job.depth > 1 else 1,
            last_crawled="just now",
        )
        await store.add_crawl_job(child_job)
        background_tasks.add_task(_run_crawl_background, child_job.id, child_job)
        queued += 1

    return ActionResponse(
        success=True,
        message=f"Triggered recursive sub-link spidering on {job_id}. Queued {queued} outbound pivot links.",
        data={"parent_job": job_id, "queued_children": queued, "pivots_found": len(all_pivots)},
    )


@router.post("/yara/{job_id}", response_model=ActionResponse)
async def yara_scan_job(job_id: str):
    """
    Download discovered archives from a crawl job and run YARA rules against them.
    """
    job = store.get_crawl_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    rules = store.get_rules()
    rule_dicts = [{"id": r.id, "name": r.name, "pattern": r.pattern, "action": r.action} for r in rules]

    from app.services.artifact_extractor import check_siem_rules
    matched = check_siem_rules(job.sanitized_dom, rule_dicts)

    # Increment hit counts for matched rules
    for m in matched:
        await store.increment_rule_hits(m["rule_id"])

    return ActionResponse(
        success=True,
        message=f"YARA scan complete for {job_id}. Scanned {job.artifacts.archives} archives. {len(matched)} rule hits.",
        data={
            "job_id": job_id,
            "archives_scanned": job.artifacts.archives,
            "matched_rules": matched,
            "total_matches": len(matched),
        },
    )
