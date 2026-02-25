import asyncio
import httpx
from .scrubber import scrub_event

_queue: asyncio.Queue | None = None
_dashboard_url: str = "http://localhost:7777"
_worker_task: asyncio.Task | None = None


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


async def start_worker() -> None:
    global _queue, _worker_task
    _queue = asyncio.Queue(maxsize=1000)
    _worker_task = asyncio.create_task(_emit_worker())


async def stop_worker() -> None:
    if _worker_task:
        await _queue.join()
        _worker_task.cancel()


async def emit(event: dict) -> None:
    """Non-blocking enqueue. Drops silently if queue is full (never blocks caller)."""
    if _queue is None:
        # Auto-start worker if not started yet
        await start_worker()
    scrubbed = scrub_event(event)
    try:
        _queue.put_nowait(scrubbed)
    except asyncio.QueueFull:
        pass  # Drop — never block the caller's pipeline
