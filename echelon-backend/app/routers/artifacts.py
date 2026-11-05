"""
ECHELON Backend — Artifacts Router
PGP keyring, favicon collision vault, and stylometry clusters.
"""
from fastapi import APIRouter
from app.models.schemas import AttributionVaultResponse
from app.store import store

router = APIRouter(prefix="/api/v1/artifacts", tags=["artifacts"])


@router.get("/vault", response_model=AttributionVaultResponse)
async def get_attribution_vault():
    """Return the full attribution vault: PGP keys, favicon collisions, stylometry clusters."""
    return store.get_vault()


@router.get("/pgp")
async def get_pgp_keys():
    vault = store.get_vault()
    return {"pgp_keys": vault.pgp_keys, "total": vault.total_pgp}


@router.get("/favicon-collisions")
async def get_favicon_collisions():
    vault = store.get_vault()
    return {"collisions": vault.favicon_collisions, "total": len(vault.favicon_collisions)}


@router.get("/stylometry")
async def get_stylometry_clusters():
    vault = store.get_vault()
    return {"clusters": vault.stylometry_clusters, "total": len(vault.stylometry_clusters)}
