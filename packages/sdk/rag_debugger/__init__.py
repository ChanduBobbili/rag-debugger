import asyncio
from .emitter import configure, start_worker, stop_worker
from .decorators import rag_trace
from .context import set_trace_id, set_query_id, reset_context

_initialized = False


def init(dashboard_url: str = "http://localhost:7777") -> None:
    """Call once at application startup."""
    global _initialized
    configure(dashboard_url)

    # Start background emission worker
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(start_worker())
    except RuntimeError:
        # No running loop (sync context) — worker starts on first emit
        pass

    _initialized = True


def new_trace(
    trace_id: str | None = None,
    query_id: str | None = None,
) -> None:
    """Explicitly set trace/query IDs (optional — auto-generated if not called)."""
    if trace_id:
        set_trace_id(trace_id)
    if query_id:
        set_query_id(query_id)


__all__ = ["init", "rag_trace", "new_trace", "reset_context"]
