from fastapi import APIRouter, BackgroundTasks
from models import RAGEvent, EventIngestResponse
from routers.ws import ws_manager
import database
import grounding
import asyncio
import json
from concurrent.futures import ProcessPoolExecutor

router = APIRouter()
_process_pool = ProcessPoolExecutor(max_workers=2)


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

    # For generate stage with answer + chunks, compute grounding in background
    if event.stage == "generate" and event.generated_answer and event.chunks:
        background_tasks.add_task(
            _compute_and_store_grounding,
            event.id,
            event.trace_id,
            event.generated_answer,
            [c.model_dump() for c in event.chunks],
        )

    # Insert event
    await database.insert_event(event_dict)

    # Broadcast to WebSocket subscribers
    await ws_manager.broadcast(event.trace_id, event_dict)

    return EventIngestResponse(ok=True, trace_id=event.trace_id, event_id=event.id)


async def _compute_and_store_grounding(
    event_id: str,
    trace_id: str,
    answer: str,
    chunks: list[dict],
) -> None:
    """Runs grounding in ProcessPoolExecutor, then updates the event."""
    loop = asyncio.get_event_loop()
    try:
        results = await loop.run_in_executor(
            _process_pool,
            grounding.compute_grounding,
            answer,
            chunks,
        )
        # Update event with grounding scores
        async with database._write_lock:
            database.get_db().execute(
                "UPDATE rag_events SET grounding_scores = ? WHERE id = ?",
                [json.dumps(results), event_id],
            )

        # Broadcast grounding update
        await ws_manager.broadcast(trace_id, {
            "type": "grounding_update",
            "event_id": event_id,
            "grounding_scores": results,
        })
    except Exception as e:
        print(f"Grounding computation failed: {e}")
