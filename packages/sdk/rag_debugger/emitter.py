import asyncio
import sys
import httpx
from .scrubber import scrub_event

_queue: asyncio.Queue | None = None
_dashboard_url: str = "http://localhost:7777"
_worker_task: asyncio.Task | None = None
_init_lock: asyncio.Lock | None = None

# BUG 3: Track dropped events and warn periodically
_drop_count: int = 0


def configure(dashboard_url: str) -> None:
    global _dashboard_url
    _dashboard_url = dashboard_url.rstrip("/")


async def _emit_worker() -> None:
    """Background worker that drains the queue and POSTs events."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            try:
                event = await asyncio.wait_for(_queue.get(), timeout=1.0)
                for attempt in range(3):
                    try:
                        await client.post(f"{_dashboard_url}/events", json=event)
                        break
                    except Exception:
                        await asyncio.sleep(0.5 * (2 ** attempt))
                _queue.task_done()
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break


async def _ensure_worker_started() -> None:
    """Lazily initialize queue and worker on first emit (BUG 4 fix)."""
    global _queue, _worker_task, _init_lock
    if _queue is not None:
        return  # already started
    if _init_lock is None:
        _init_lock = asyncio.Lock()
    async with _init_lock:
        if _queue is None:  # double-check after acquiring lock
            _queue = asyncio.Queue(maxsize=1000)
            _worker_task = asyncio.create_task(_emit_worker())


async def stop_worker() -> None:
    """
    Drain the event queue and shut down the background worker.

    Call this at application shutdown to guarantee all buffered events
    are flushed before the process exits. Without this, the last N
    events in the queue will be silently lost.

    Usage in an async app::

        import rag_debugger
        # ... at shutdown:
        await rag_debugger.stop_worker()

    Usage in a script::

        asyncio.run(rag_debugger.stop_worker())
    """
    if _worker_task:
        await _queue.join()
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass


async def emit(event: dict) -> None:
    """Non-blocking enqueue. Warns on drops instead of silently losing events."""
    global _drop_count
    await _ensure_worker_started()
    scrubbed = scrub_event(event)
    try:
        _queue.put_nowait(scrubbed)
    except asyncio.QueueFull:
        _drop_count += 1
        if _drop_count == 1 or _drop_count % 50 == 0:
            print(
                f"[rag-debugger] WARNING: event dropped (total dropped: {_drop_count})"
                f" — is the server running at {_dashboard_url}?",
                file=sys.stderr,
            )
