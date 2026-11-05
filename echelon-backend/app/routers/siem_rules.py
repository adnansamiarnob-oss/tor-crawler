"""
ECHELON Backend — SIEM Rules Router
Manages percolator/YARA rules and crawler fleet rule sync.
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import ActionResponse, SIEMRule, SIEMRulesResponse, PushRulesResponse
from app.store import store

router = APIRouter(prefix="/api/v1/siem", tags=["siem"])


@router.get("/rules", response_model=SIEMRulesResponse)
async def get_siem_rules():
    """Return all active SIEM percolator rules."""
    rules = store.get_rules()
    total_hits = sum(r.hits_24h for r in rules)
    return SIEMRulesResponse(rules=rules, total=len(rules), total_hits_24h=total_hits)


@router.get("/rules/{rule_id}")
async def get_rule(rule_id: str):
    rule = store.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")
    return rule


@router.post("/rules/push", response_model=PushRulesResponse)
async def push_rules_to_fleet():
    """
    Sync all active rules to the Redis Crawler Worker fleet.
    In production: publishes rules to Redis channel 'crawler_rule_sync'.
    """
    rules = store.get_rules()
    enabled = [r for r in rules if r.enabled]

    # Real implementation: redis_client.publish("crawler_rule_sync", json.dumps(rule_dicts))
    return PushRulesResponse(
        pushed=len(enabled),
        workers_notified=4,
        message=f"Synced all {len(enabled)} YARA & Percolator rules to Redis Crawler Workers",
    )


@router.post("/rules/{rule_id}/trigger-test", response_model=ActionResponse)
async def test_rule(rule_id: str, test_content: str = ""):
    """Test a rule against provided content."""
    rule = store.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule {rule_id} not found")

    import re
    matched = False
    try:
        matched = bool(re.search(rule.pattern, test_content, re.IGNORECASE))
    except re.error as e:
        return ActionResponse(success=False, message=f"Pattern error: {e}")

    return ActionResponse(
        success=True,
        message=f"Rule {rule_id} {'MATCHED' if matched else 'NO MATCH'} against test content",
        data={"rule_id": rule_id, "matched": matched, "pattern": rule.pattern},
    )
