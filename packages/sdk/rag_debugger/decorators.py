import asyncio
import time
import uuid
from functools import wraps
from typing import Literal
from .context import get_or_create_trace_id, get_or_create_query_id
from .emitter import emit

RAGStage = Literal["embed", "retrieve", "rerank", "generate"]

# Track stages per query for session_complete calculation
_query_stages: dict[str, list] = {}


def rag_trace(stage: RAGStage):
    """
    Decorator for any RAG pipeline function.
    Works with both async and sync functions.
    Auto-generates trace_id and query_id via ContextVar.
    Emits session_complete after 'generate' stage.
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            trace_id = get_or_create_trace_id()
            query_id = get_or_create_query_id()
            event_id = str(uuid.uuid4())
            ts_start = time.time()

            event = {
                "id": event_id,
                "trace_id": trace_id,
                "query_id": query_id,
                "stage": stage,
                "ts_start": ts_start,
            }

            # Capture query text from first string argument
            if args and isinstance(args[0], str):
                event["query_text"] = args[0][:500]  # truncate

            try:
                result = await func(*args, **kwargs)
                event["duration_ms"] = (time.time() - ts_start) * 1000
                event["output"] = _safe_serialize(result, stage)
                _enrich_event(event, result, stage)
                await emit(event)
                _track_stage(query_id, stage, event)

                # Emit session_complete after generate
                if stage == "generate":
                    await _emit_session_complete(query_id, trace_id, event, result)

                return result
            except Exception as e:
                event["duration_ms"] = (time.time() - ts_start) * 1000
                event["error"] = str(e)
                await emit(event)
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # For sync functions, create a new event loop or use existing one
            try:
                loop = asyncio.get_running_loop()
                # If there's already a running loop, we can't use run_until_complete
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    return pool.submit(
                        asyncio.run, async_wrapper(*args, **kwargs)
                    ).result()
            except RuntimeError:
                return asyncio.run(async_wrapper(*args, **kwargs))

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


def _enrich_event(event: dict, result, stage: str) -> None:
    """Add stage-specific output fields."""
    if stage == "embed" and isinstance(result, list):
        event["query_vector"] = result[:1536]  # cap at ada-002 dims
    elif stage in ("retrieve", "rerank") and isinstance(result, list):
        event["chunks"] = [_to_chunk_dict(c, i) for i, c in enumerate(result)]
    elif stage == "generate" and isinstance(result, str):
        event["generated_answer"] = result


def _to_chunk_dict(chunk, rank: int) -> dict:
    if isinstance(chunk, dict):
        return {
            "chunk_id": chunk.get("id", str(rank)),
            "text": str(chunk.get("text", chunk.get("page_content", "")))[:1000],
            "cosine_score": float(chunk.get("score", chunk.get("cosine_score", 0.0))),
            "rerank_score": chunk.get("rerank_score"),
            "final_rank": rank,
            "metadata": chunk.get("metadata", {}),
        }
    return {
        "chunk_id": str(rank),
        "text": str(chunk)[:500],
        "cosine_score": 0.0,
        "final_rank": rank,
    }


def _safe_serialize(value, stage: str):
    if stage == "embed":
        return None  # vectors sent separately
    try:
        import json
        json.dumps(value)
        return value
    except Exception:
        return str(value)[:200]


def _track_stage(query_id: str, stage: str, event: dict) -> None:
    if query_id not in _query_stages:
        _query_stages[query_id] = []
    _query_stages[query_id].append({
        "stage": stage,
        "duration_ms": event.get("duration_ms", 0),
    })


async def _emit_session_complete(
    query_id: str, trace_id: str, gen_event: dict, answer
) -> None:
    stages = _query_stages.pop(query_id, [])
    total_ms = sum(s["duration_ms"] for s in stages)
    await emit({
        "id": str(uuid.uuid4()),
        "trace_id": trace_id,
        "query_id": query_id,
        "stage": "session_complete",
        "ts_start": time.time(),
        "duration_ms": total_ms,
        "query_text": gen_event.get("query_text"),
        "generated_answer": str(answer) if answer else None,
        "metadata": {
            "stage_count": len(stages),
            "has_error": False,
        },
    })
