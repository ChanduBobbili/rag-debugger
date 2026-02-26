import asyncio
import time
import uuid
from collections import OrderedDict
from functools import wraps
from typing import Literal
from .context import get_or_create_trace_id, get_or_create_query_id
from .emitter import emit

RAGStage = Literal["embed", "retrieve", "rerank", "generate"]

# Track stages per query for session_complete calculation.
# OrderedDict for FIFO eviction when cap is exceeded (BUG 1 fix).
_query_stages: OrderedDict[str, list] = OrderedDict()
_STAGES_CAP = 500
_STAGES_EVICT = 100

MAX_VECTOR_DIMS = 4096  # Safety cap — no real model exceeds this


def _enforce_stages_cap() -> None:
    """Evict oldest entries if _query_stages exceeds the safety cap."""
    if len(_query_stages) > _STAGES_CAP:
        for _ in range(_STAGES_EVICT):
            if _query_stages:
                _query_stages.popitem(last=False)


def rag_trace(stage: RAGStage):
    """
    Decorator for any RAG pipeline function.
    Works with both async and sync functions.
    Auto-generates trace_id and query_id via ContextVar.
    Emits session_complete after 'generate' stage.

    Sync function support is best-effort. If the decorated sync function
    is called inside an async framework (FastAPI, Django async views, etc.),
    use ``async def`` with ``await`` instead.
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
                stages = _query_stages.pop(query_id, [])
                await emit(event)
                if stage == "generate":
                    await _emit_error_session_complete(
                        query_id, trace_id, event, stages
                    )
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # BUG 2 fix: simple, honest sync support
            try:
                loop = asyncio.get_running_loop()
                if loop.is_running():
                    raise RuntimeError(
                        "rag_trace: cannot use a sync function inside a running "
                        "async event loop. Use 'async def' with 'await' instead."
                    )
            except RuntimeError as e:
                if "cannot use a sync function" in str(e):
                    raise
                # No running loop — safe to use asyncio.run()
                pass
            return asyncio.run(async_wrapper(*args, **kwargs))

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


def _enrich_event(event: dict, result, stage: str) -> None:
    """Add stage-specific output fields."""
    if stage == "embed" and isinstance(result, list):
        event["query_vector"] = result[:MAX_VECTOR_DIMS]
        event.setdefault("metadata", {})["vector_dims"] = len(result)
    elif stage in ("retrieve", "rerank") and isinstance(result, list):
        event["chunks"] = [_to_chunk_dict(c, i) for i, c in enumerate(result)]
    elif stage == "generate" and isinstance(result, str):
        event["generated_answer"] = result


def _to_chunk_dict(chunk, rank: int) -> dict:
    # BUG 6: Check for LangChain Document (and similar objects with page_content)
    if hasattr(chunk, "page_content"):
        metadata = dict(chunk.metadata) if hasattr(chunk, "metadata") and chunk.metadata else {}
        return {
            "chunk_id": getattr(chunk, "id", None) or str(rank),
            "text": str(chunk.page_content)[:1000],
            "cosine_score": float(metadata.get("score", metadata.get("relevance_score", 0.0))),
            "rerank_score": metadata.get("rerank_score"),
            "final_rank": rank,
            "metadata": metadata,
        }
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
    _enforce_stages_cap()


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


async def _emit_error_session_complete(
    query_id: str, trace_id: str, error_event: dict, stages: list
) -> None:
    total_ms = sum(s["duration_ms"] for s in stages) + error_event.get("duration_ms", 0)
    await emit({
        "id": str(uuid.uuid4()),
        "trace_id": trace_id,
        "query_id": query_id,
        "stage": "session_complete",
        "ts_start": time.time(),
        "duration_ms": total_ms,
        "query_text": error_event.get("query_text"),
        "error": error_event.get("error"),
        "metadata": {
            "stage_count": len(stages) + 1,
            "has_error": True,
        },
    })
