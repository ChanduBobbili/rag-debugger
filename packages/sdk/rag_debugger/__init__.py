import uuid
from contextlib import asynccontextmanager
from .emitter import configure, stop_worker
from .decorators import rag_trace
from .context import set_trace_id, set_query_id, reset_context
from .context import _trace_id, _query_id

__version__ = "0.1.0"

_initialized = False


def init(dashboard_url: str = "http://localhost:7777") -> None:
    """Call once at application startup.

    Configures the dashboard URL. The background worker starts lazily
    on the first ``emit()`` call, so this is safe to call at import time
    or before the async event loop is running.
    """
    global _initialized
    configure(dashboard_url)
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


class _TraceHandle:
    """Lightweight handle returned by the ``trace()`` context manager."""
    __slots__ = ("trace_id", "query_id")

    def __init__(self, trace_id: str, query_id: str) -> None:
        self.trace_id = trace_id
        self.query_id = query_id


@asynccontextmanager
async def trace(
    trace_id: str | None = None,
    query_id: str | None = None,
):
    """Async context manager for explicit trace scoping.

    Usage::

        async with rag_debugger.trace(trace_id="req-123") as t:
            print(t.trace_id)
            result = await my_rag_pipeline(query)
        # Context is automatically restored after the block

    Nested ``trace()`` contexts work correctly — the outer context
    is restored when the inner block exits.
    """
    tid = trace_id or str(uuid.uuid4())
    qid = query_id or str(uuid.uuid4())

    # Save previous values using ContextVar tokens
    trace_token = _trace_id.set(tid)
    query_token = _query_id.set(qid)

    try:
        yield _TraceHandle(tid, qid)
    finally:
        # Restore previous values
        _trace_id.reset(trace_token)
        _query_id.reset(query_token)


__all__ = ["init", "rag_trace", "new_trace", "reset_context", "trace", "stop_worker", "__version__"]
