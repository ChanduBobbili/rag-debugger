from fastapi import APIRouter, Query, HTTPException
import database
import json

router = APIRouter()


@router.get("/traces")
async def list_traces(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    has_error: bool | None = None,
    min_grounding: float | None = Query(None, ge=0.0, le=1.0),
) -> list[dict]:
    return database.get_traces(limit, offset, has_error, min_grounding)


@router.get("/traces/{trace_id}")
async def get_trace(trace_id: str) -> dict:
    events = database.get_trace_events(trace_id)
    if not events:
        return {"trace_id": trace_id, "events": [], "not_found": True}
    return {"trace_id": trace_id, "events": events}


@router.get("/traces/{trace_id}/chunks")
async def get_chunks(trace_id: str) -> list[dict]:
    db = database.get_db()
    rows = db.execute("""
        SELECT stage, chunks FROM rag_events
        WHERE trace_id = ? AND chunks IS NOT NULL
        ORDER BY ts_start
    """, [trace_id]).fetchall()
    return [{"stage": r[0], "chunks": json.loads(r[1])} for r in rows]


@router.get("/traces/{trace_id}/embeddings")
async def get_embeddings(trace_id: str) -> dict:
    db = database.get_db()

    # 1) Get query vector from embed stage
    embed_row = db.execute("""
        SELECT query_vector FROM rag_events
        WHERE trace_id = ? AND stage = 'embed' AND query_vector IS NOT NULL
        LIMIT 1
    """, [trace_id]).fetchone()
    query_vector = list(embed_row[0]) if embed_row and embed_row[0] else None

    # 2) Get chunks from retrieve/rerank
    chunk_row = db.execute("""
        SELECT chunks FROM rag_events
        WHERE trace_id = ? AND stage IN ('rerank', 'retrieve')
              AND chunks IS NOT NULL AND chunks != 'null'
        ORDER BY ts_start DESC LIMIT 1
    """, [trace_id]).fetchone()

    if not chunk_row or not chunk_row[0]:
        if query_vector:
            return {"available": True, "query_vector": query_vector, "chunks": [], "has_real_vectors": False}
        return {"available": False}

    raw_chunks = json.loads(chunk_row[0]) if isinstance(chunk_row[0], str) else chunk_row[0]
    if not isinstance(raw_chunks, list):
        return {"available": False}

    # 3) Check if chunks already carry real vectors
    has_real = any(c.get("vector") for c in raw_chunks)

    # 4) If no real vectors, generate proxy vectors from cosine_score
    if not has_real:
        import math, hashlib
        dims = len(query_vector) if query_vector else 32
        for i, c in enumerate(raw_chunks):
            score = float(c.get("cosine_score", 0.0))
            # Deterministic seed from chunk_id so the proxy is stable across reloads
            seed_str = c.get("chunk_id", str(i))
            seed = int(hashlib.md5(seed_str.encode()).hexdigest()[:8], 16)
            # Generate a random-looking unit vector scaled by cosine_score
            proxy = []
            x = seed
            for d in range(min(dims, 64)):
                x = (x * 1103515245 + 12345) & 0x7FFFFFFF
                val = (x / 0x7FFFFFFF) * 2 - 1
                proxy.append(val)
            # Normalize and scale by cosine_score
            norm = math.sqrt(sum(v * v for v in proxy)) or 1.0
            c["vector"] = [round(v / norm * score, 6) for v in proxy]

    return {
        "available": True,
        "query_vector": query_vector,
        "chunks": raw_chunks,
        "has_real_vectors": has_real,
    }


@router.get("/traces/{trace_id}/grounding")
async def get_grounding(trace_id: str) -> dict:
    db = database.get_db()
    row = db.execute("""
        SELECT generated_answer, grounding_scores FROM rag_events
        WHERE trace_id = ? AND stage = 'generate'
        LIMIT 1
    """, [trace_id]).fetchone()
    if not row:
        return {"available": False}
    return {
        "available": True,
        "answer": row[0],
        "grounding": json.loads(row[1]) if row[1] else [],
    }


@router.delete("/traces")
async def delete_all_traces() -> dict:
    """Delete every trace and session. Useful for dev environment resets."""
    db = database.get_db()
    async with database._write_lock:
        db.execute("DELETE FROM rag_events")
        db.execute("DELETE FROM query_sessions")
    return {"ok": True, "deleted": "all"}


@router.delete("/traces/by-date")
async def delete_traces_before(
    before: str = Query(..., description="ISO 8601 datetime, e.g. 2024-01-01T00:00:00Z")
) -> dict:
    """Delete all traces created before the given datetime."""
    from datetime import datetime
    try:
        datetime.fromisoformat(before.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(400, f"Invalid datetime format: {before!r}")
    async with database._write_lock:
        db = database.get_db()
        db.execute(
            "DELETE FROM rag_events WHERE created_at < ?", [before]
        )
        db.execute(
            "DELETE FROM query_sessions WHERE created_at < ?", [before]
        )
    return {"ok": True, "deleted_before": before}


@router.delete("/traces/{trace_id}")
async def delete_trace(trace_id: str) -> dict:
    await database.delete_trace(trace_id)
    return {"ok": True, "deleted": trace_id}

