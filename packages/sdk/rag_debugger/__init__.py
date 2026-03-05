import uuid
from contextlib import asynccontextmanager
from .emitter import configure, stop_worker
from .decorators import rag_trace
from .context import set_trace_id, set_query_id, reset_context
from .context import _trace_id, _query_id

__version__ = "1.1.1"

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


class _NewTraceCtx:
    """
    Dual-use: call new_trace() directly OR use as a context manager.

    Direct call (fire-and-forget, no cleanup guarantee)::

        new_trace(trace_id="req-123")

    Context manager (resets context on exit, even on error)::

        with new_trace(trace_id="req-123"):
            result = run_pipeline(query)
    """

    def __init__(self, trace_id: str | None, query_id: str | None) -> None:
        self._tid = trace_id
        self._qid = query_id
        self._trace_token = None
        self._query_token = None
        self._applied = False

    def _apply(self) -> None:
        if self._applied:
            return
        self._applied = True
        if self._tid:
            self._trace_token = _trace_id.set(self._tid)
        if self._qid:
            self._query_token = _query_id.set(self._qid)

    def __enter__(self):
        self._apply()
        return self

    def __exit__(self, *_):
        if self._trace_token is not None:
            _trace_id.reset(self._trace_token)
        if self._query_token is not None:
            _query_id.reset(self._query_token)


def new_trace(
    trace_id: str | None = None,
    query_id: str | None = None,
) -> _NewTraceCtx:
    """
    Set trace/query IDs. Use as a context manager to guarantee cleanup::

        with new_trace(trace_id="req-123"):
            await pipeline.run(query)

    Or call directly (no cleanup guarantee — only safe in single-request scripts)::

        new_trace(trace_id="req-123")
        await pipeline.run(query)
    """
    ctx = _NewTraceCtx(trace_id, query_id)
    ctx._apply()
    return ctx


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
