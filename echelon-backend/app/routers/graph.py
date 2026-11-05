"""
ECHELON Backend — Graph Router
Neo4j-backed entity resolution graph queries.
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import GraphResponse, NeighborResponse
from app.store import store

router = APIRouter(prefix="/api/v1/graph", tags=["graph"])


@router.get("/", response_model=GraphResponse)
async def get_full_graph():
    """Return all nodes and edges for the cross-overlay attribution graph."""
    nodes, edges = store.get_graph()
    return GraphResponse(nodes=nodes, edges=edges)


@router.get("/nodes")
async def get_graph_nodes():
    """Return all graph nodes."""
    nodes, _ = store.get_graph()
    return {"nodes": nodes, "total": len(nodes)}


@router.get("/edges")
async def get_graph_edges():
    """Return all graph edges."""
    _, edges = store.get_graph()
    return {"edges": edges, "total": len(edges)}


@router.get("/neighbors/{node_id}", response_model=NeighborResponse)
async def expand_node_neighbors(node_id: str, hops: int = 2):
    """
    Expand Cypher hops — get all nodes reachable within N hops from node_id.
    Uses in-memory BFS. In production, this runs:
    MATCH (n {id: $node_id})-[*1..{hops}]-(neighbor) RETURN neighbor
    """
    # Check node exists
    nodes, _ = store.get_graph()
    start_node = next((n for n in nodes if n.id == node_id), None)
    if not start_node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

    # BFS expansion up to `hops` depth
    visited = {node_id}
    frontier = {node_id}
    all_connecting_edges = []

    for _ in range(hops):
        next_frontier = set()
        for nid in frontier:
            neighbors, connecting = store.get_node_neighbors(nid)
            for n in neighbors:
                if n.id not in visited:
                    visited.add(n.id)
                    next_frontier.add(n.id)
            # Collect unique edges
            for e in connecting:
                edge_key = f"{e.from_node}-{e.to_node}"
                if edge_key not in [f"{ex.from_node}-{ex.to_node}" for ex in all_connecting_edges]:
                    all_connecting_edges.append(e)
        frontier = next_frontier

    visited.discard(node_id)
    neighbor_nodes = [n for n in nodes if n.id in visited]

    cypher_query = (
        f"MATCH (n {{id: '{node_id}'}})-[*1..{hops}]-(neighbor)\n"
        f"RETURN n, neighbor\n"
        f"-- Returned {len(neighbor_nodes)} neighbors across {len(all_connecting_edges)} edges"
    )

    return NeighborResponse(
        node_id=node_id,
        neighbors=neighbor_nodes,
        connecting_edges=all_connecting_edges,
        cypher_query=cypher_query,
    )
