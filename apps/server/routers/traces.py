from fastapi import APIRouter, Query
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
    row = db.execute("""
        SELECT query_vector, chunks FROM rag_events
        WHERE trace_id = ? AND stage = 'embed' AND query_vector IS NOT NULL
        LIMIT 1
    """, [trace_id]).fetchone()
    if not row:
        return {"available": False}
    return {
        "available": True,
        "query_vector": row[0],
        "chunks": json.loads(row[1]) if row[1] else [],
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
