from fastapi import APIRouter, BackgroundTasks
from models import RAGEvent, EventIngestResponse
from routers.ws import ws_manager
import database
import grounding
import asyncio
import json

router = APIRouter()
_process_pool = None


def set_process_pool(pool) -> None:
    """Receive the ProcessPoolExecutor from the lifespan handler."""
    global _process_pool
    _process_pool = pool


def _lookup_chunks_for_trace(trace_id: str) -> list[dict]:
    """Fetch chunks from the most recent retrieve or rerank event for this trace."""
    db = database.get_db()
    row = db.execute("""
        SELECT chunks FROM rag_events
        WHERE trace_id = ? AND stage IN ('rerank', 'retrieve') AND chunks IS NOT NULL
        ORDER BY ts_start DESC LIMIT 1
    """, [trace_id]).fetchone()
    if row and row[0]:
        parsed = json.loads(row[0]) if isinstance(row[0], str) else row[0]
        return parsed if isinstance(parsed, list) else []
    return []


@router.post("/events", response_model=EventIngestResponse)
async def ingest_event(event: RAGEvent, background_tasks: BackgroundTasks) -> EventIngestResponse:
    event_dict = event.model_dump()

    # Handle session_complete event type
    if event.stage == "session_complete":
        await database.upsert_session({
            "query_id": event.query_id,
            "trace_id": event.trace_id,
            "query_text": event.query_text,
            "total_duration_ms": event.duration_ms,
            "chunk_count": event.metadata.get("chunk_count", 0),
            "final_answer": event.generated_answer,
            "overall_grounding_score": event.metadata.get("overall_grounding_score"),
            "stage_count": event.metadata.get("stage_count", 0),
            "has_error": bool(event.error),
        })
        await ws_manager.broadcast(event.trace_id, event_dict)
        return EventIngestResponse(ok=True, trace_id=event.trace_id, event_id=event.id)

    # Insert event first so chunk data is available for lookup
    await database.insert_event(event_dict)

    # For generate stage with answer, compute grounding in background
    if event.stage == "generate" and event.generated_answer:
        chunks = (
            [c.model_dump() for c in event.chunks]
            if event.chunks
            else _lookup_chunks_for_trace(event.trace_id)
        )
        if chunks:
            background_tasks.add_task(
                _compute_and_store_grounding,
                event.id,
                event.trace_id,
                event.generated_answer,
                chunks,
            )

    # Broadcast to WebSocket subscribers
    await ws_manager.broadcast(event.trace_id, event_dict)

    return EventIngestResponse(ok=True, trace_id=event.trace_id, event_id=event.id)


async def _compute_and_store_grounding(
    event_id: str,
    trace_id: str,
    answer: str,
    chunks: list[dict],
) -> None:
    """Runs grounding in ProcessPoolExecutor, then updates the event and session."""
    if _process_pool is None:
        print("Grounding skipped: process pool not initialized")
        return
    loop = asyncio.get_event_loop()
    try:
        results = await loop.run_in_executor(
            _process_pool,
            grounding.compute_grounding,
            answer,
            chunks,
        )
        await database.update_grounding_scores(event_id, results)

        # Update session's overall grounding score
        if results:
            avg_score = sum(r["score"] for r in results) / len(results)
            await database.update_session_grounding(trace_id, avg_score)

        await ws_manager.broadcast(trace_id, {
            "type": "grounding_update",
            "event_id": event_id,
            "grounding_scores": results,
        })
    except Exception as e:
        print(f"Grounding computation failed: {e}")
