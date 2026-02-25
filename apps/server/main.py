from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import database
from routers import events, traces, analytics, ws, playground


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    database.init_db()
    print("✓ DuckDB initialized")
    yield
    # Shutdown
    database.close_db()
    print("✓ DuckDB closed")


app = FastAPI(
    title="RAG Debugger API",
    version="0.1.0",
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
    return {"status": "ok", "db": "connected"}
