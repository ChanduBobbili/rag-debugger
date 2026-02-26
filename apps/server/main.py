import asyncio
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from concurrent.futures import ProcessPoolExecutor
import database
from routers import events, traces, analytics, ws, playground

RETENTION_DAYS = int(os.environ.get("RAG_DEBUGGER_RETENTION_DAYS", "30"))


async def _retention_loop(retention_days: int) -> None:
    """Runs cleanup once on startup, then every 24 hours."""
    while True:
        try:
            result = await database.cleanup_old_traces(retention_days)
            print(f"✓ Retention cleanup done ({result})")
        except Exception as e:
            print(f"✗ Retention cleanup failed: {e}")
        await asyncio.sleep(86400)  # 24 hours


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    database.init_db()
    print("✓ DuckDB initialized")

    # ProcessPoolExecutor for grounding computation
    pool = ProcessPoolExecutor(max_workers=2)
    events.set_process_pool(pool)
    print("✓ ProcessPool started (2 workers)")

    # Start retention cleanup task if enabled
    retention_task = None
    if RETENTION_DAYS > 0:
        retention_task = asyncio.create_task(_retention_loop(RETENTION_DAYS))
        print(f"✓ Retention cleanup enabled ({RETENTION_DAYS} days)")

    yield

    # Shutdown
    if retention_task:
        retention_task.cancel()
        try:
            await retention_task
        except asyncio.CancelledError:
            pass
    pool.shutdown(wait=False)
    print("✓ ProcessPool shut down")
    database.close_db()
    print("✓ DuckDB closed")


app = FastAPI(
    title="RAG Debugger API",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(traces.router)
app.include_router(analytics.router)
app.include_router(playground.router)
app.include_router(ws.router)


@app.get("/health")
async def health() -> dict:
    db_status = "ok"
    try:
        database.get_db().execute("SELECT 1").fetchone()
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "db": db_status,
        "version": "0.2.0",
    }
