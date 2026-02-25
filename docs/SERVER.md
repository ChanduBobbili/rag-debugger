# RAG Debugger — Server Documentation

> FastAPI backend for ingesting, storing, and serving RAG pipeline telemetry.

---

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Module Breakdown](#module-breakdown)
  - [main.py — Application Entry Point](#mainpy--application-entry-point)
  - [database.py — DuckDB Data Layer](#databasepy--duckdb-data-layer)
  - [models.py — Pydantic Schemas](#modelspy--pydantic-schemas)
  - [grounding.py — Sentence Attribution](#groundingpy--sentence-attribution)
  - [Routers](#routers)
    - [events.py — Event Ingestion](#routerseventspy--event-ingestion)
    - [traces.py — Trace Retrieval](#routerstracespy--trace-retrieval)
    - [analytics.py — Metrics Aggregation](#routersanalyticspy--metrics-aggregation)
    - [playground.py — Interactive Testing](#routersplaygroundpy--interactive-testing)
    - [ws.py — WebSocket Manager](#routerswspy--websocket-manager)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [Testing](#testing)

---

## Introduction

The RAG Debugger Server is a **FastAPI** application that serves as the central hub for collecting, storing, and querying RAG pipeline telemetry. It receives events from the Python SDK, persists them in **DuckDB** (a columnar analytics database), computes sentence-level **grounding scores** using sentence-transformers, and broadcasts events in real time over **WebSockets**.

### Key Capabilities

- **Event ingestion** — accepts `POST /events` from the SDK with full pipeline stage data
- **Trace browsing** — paginated, filterable REST endpoints for query sessions
- **Analytics** — daily aggregated metrics (grounding trends, latency, error rates)
- **Real-time streaming** — WebSocket broadcast per `trace_id`
- **Background grounding** — CPU-intensive sentence attribution offloaded to a `ProcessPoolExecutor`

---

## Architecture Overview

```
SDK (httpx POST)
       │
       ▼
┌────────────────────────────────────────────────────┐
│                  FastAPI Server                     │
│                                                    │
│  POST /events ──► insert_event() ──► DuckDB        │
│       │                                            │
│       ├──► ws_manager.broadcast() ──► WebSocket     │
│       │                                            │
│       └──► (if generate stage)                     │
│            ProcessPoolExecutor ──► grounding.py     │
│            sentence-transformers (MiniLM)           │
│                                                    │
│  GET /traces ◄── get_traces() ◄── DuckDB           │
│  GET /analytics/metrics ◄── SQL aggregation         │
│  WS /ws/{trace_id} ──► live event stream            │
└────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip

### Installation

```bash
cd apps/server
uv venv && uv pip install -e .
```

### Running

```bash
# Development (without hot-reload)
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 7777

# Development (with hot-reload)
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 7777 --reload

# Production
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 7777 --workers 4
```

### Health Check

```bash
curl http://localhost:7777/health
# {"status": "ok", "db": "connected"}
```

---

## Project Structure

```
apps/server/
├── main.py                 # FastAPI app, CORS, lifespan
├── database.py             # DuckDB connection, schema, queries
├── models.py               # Pydantic request/response models
├── grounding.py            # Sentence-level grounding scorer
├── pyproject.toml           # Dependencies and project metadata
├── data/                    # DuckDB file (auto-created)
│   └── rag_traces.duckdb
├── routers/
│   ├── __init__.py
│   ├── events.py           # POST /events endpoint
│   ├── traces.py           # GET /traces endpoints
│   ├── analytics.py        # GET /analytics endpoints
│   ├── playground.py       # POST /playground endpoints
│   └── ws.py               # WebSocket manager
└── tests/
    ├── conftest.py          # Shared fixtures (in-memory DB)
    ├── test_events.py       # Event ingestion tests
    └── test_traces.py       # Trace retrieval tests
```

---

## Module Breakdown

### `main.py` — Application Entry Point

Sets up the FastAPI application with:

| Concern | Detail |
|---------|--------|
| **CORS** | Allows all origins (`*`) for dashboard access |
| **Lifespan** | Calls `database.init_db()` on startup, `database.close_db()` on shutdown |
| **Routers** | Includes `events`, `traces`, `analytics`, `playground`, and `ws` routers |
| **Health** | `GET /health` returns DB connection status |

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()       # Create tables, connect DuckDB
    yield
    database.close_db()      # Clean shutdown
```

---

### `database.py` — DuckDB Data Layer

Manages the DuckDB connection as a **module-level singleton** with an `asyncio.Lock` for all write operations.

#### Key Functions

| Function | Description |
|----------|-------------|
| `init_db()` | Creates/connects to `data/rag_traces.duckdb`, runs `_create_tables()` |
| `close_db()` | Closes the DuckDB connection |
| `get_db()` | Returns the active connection (raises if uninitialized) |
| `insert_event(event)` | Inserts a RAG event (async, write-locked) |
| `upsert_session(session)` | Inserts/updates a query session (async, write-locked) |
| `get_traces(limit, offset, ...)` | Reads `query_sessions` with optional filters |
| `get_trace_events(trace_id)` | Returns all events for a given trace |
| `_rows_to_dicts(cursor)` | Converts DuckDB results to `list[dict]` without pandas |

#### Concurrency Model

```
Read operations  → No lock needed (DuckDB handles concurrent reads)
Write operations → asyncio.Lock ensures single-writer safety
```

---

### `models.py` — Pydantic Schemas

| Model | Purpose |
|-------|---------|
| `ChunkScore` | Individual retrieved chunk with `cosine_score`, `rerank_score`, `final_rank` |
| `GroundingResult` | Per-sentence attribution (`grounded`, `score`, `source_chunk_id`) |
| `RAGEvent` | Core event model — all fields from the SDK, auto-generated `id` |
| `SessionCompletePayload` | Summary metadata for a completed query session |
| `EventIngestResponse` | POST response: `{ok, trace_id, event_id}` |

#### RAGEvent Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Auto-generated UUID |
| `trace_id` | `str` | Groups all events in one pipeline run |
| `query_id` | `str` | Groups events for a single query |
| `stage` | `Literal` | One of: `embed`, `retrieve`, `rerank`, `generate`, `session_complete` |
| `ts_start` | `float` | Unix timestamp when the stage started |
| `duration_ms` | `float?` | Stage execution time in milliseconds |
| `query_text` | `str?` | The user's input query |
| `query_vector` | `list[float]?` | Embedding vector (embed stage) |
| `chunks` | `list[ChunkScore]?` | Retrieved/reranked chunks |
| `generated_answer` | `str?` | LLM output (generate stage) |
| `grounding_scores` | `list[GroundingResult]?` | Sentence attribution results |
| `error` | `str?` | Error message if the stage failed |
| `metadata` | `dict` | Arbitrary key-value metadata |

---

### `grounding.py` — Sentence Attribution

Computes **sentence-level grounding scores** using `sentence-transformers` (`all-MiniLM-L6-v2`).

#### How It Works

1. Splits the generated answer into sentences
2. Extracts text from all retrieved chunks
3. Encodes everything with the sentence-transformer model
4. For each sentence, computes cosine similarity against all chunk texts
5. Labels a sentence as "grounded" if max similarity ≥ 0.5

#### Execution Model

- Runs in a `ProcessPoolExecutor` (2 workers) to avoid blocking the async event loop
- Triggered automatically when a `generate` stage event includes both `generated_answer` and `chunks`
- Results are written back to the event's `grounding_scores` field

---

### Routers

#### `routers/events.py` — Event Ingestion

**`POST /events`** — The primary endpoint for SDK event ingestion.

Flow:
1. Validate the incoming `RAGEvent` via Pydantic
2. If `stage == "session_complete"` → upsert into `query_sessions` table
3. If `stage == "generate"` with answer + chunks → schedule background grounding
4. Insert the event into `rag_events` table
5. Broadcast the event via WebSocket to subscribed clients

---

#### `routers/traces.py` — Trace Retrieval

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/traces` | GET | Lists query sessions (paginated). Filters: `has_error`, `min_grounding` |
| `/traces/{trace_id}` | GET | Returns all events for a trace. Returns `{not_found: true}` if empty |
| `/traces/{trace_id}/chunks` | GET | Chunk scores across all stages for a trace |
| `/traces/{trace_id}/embeddings` | GET | Query vector + chunk data from embed stage |
| `/traces/{trace_id}/grounding` | GET | Generated answer + sentence-level grounding scores |

---

#### `routers/analytics.py` — Metrics Aggregation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analytics/metrics?days=7` | GET | Daily + summary stats: grounding, latency, errors, worst queries |
| `/analytics/chunk-score-distribution` | GET | Histogram of cosine scores across all chunks |

The `/analytics/metrics` response includes:

```json
{
  "daily": [{"date": "...", "total_queries": 8, "avg_grounding": 0.75, ...}],
  "summary": {"total": 8, "avg_grounding": 0.75, "avg_latency": 1218, "failure_rate": 0.0},
  "worst_queries": [{"query_text": "...", "overall_grounding_score": 0.501, ...}]
}
```

---

#### `routers/playground.py` — Interactive Testing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/playground/query` | POST | Accepts `{query, k, chunk_size, embedding_model}`. Returns `{trace_id}` |
| `/playground/compare` | POST | Runs two configs side-by-side for A/B comparison |

---

#### `routers/ws.py` — WebSocket Manager

Manages real-time event streaming via WebSocket connections.

| Method | Description |
|--------|-------------|
| `connect(trace_id, ws)` | Subscribe a client to a trace's event stream |
| `disconnect(trace_id, ws)` | Unsubscribe a client |
| `broadcast(trace_id, data)` | Send an event to all clients watching a specific trace |

**Endpoint:** `WS /ws/{trace_id}` — clients connect with a `trace_id` and receive JSON events as they arrive.

---

## API Reference

| Method | Endpoint | Request Body | Response |
|--------|----------|-------------|----------|
| POST | `/events` | `RAGEvent` JSON | `{ok, trace_id, event_id}` |
| GET | `/traces?limit=50&offset=0&has_error=true&min_grounding=0.5` | — | `QuerySession[]` |
| GET | `/traces/{trace_id}` | — | `{trace_id, events[]}` |
| GET | `/traces/{trace_id}/chunks` | — | `{stage, chunks[]}[]` |
| GET | `/traces/{trace_id}/embeddings` | — | `{available, query_vector, chunks}` |
| GET | `/traces/{trace_id}/grounding` | — | `{available, answer, grounding[]}` |
| GET | `/analytics/metrics?days=7` | — | `{daily[], summary, worst_queries[]}` |
| GET | `/analytics/chunk-score-distribution` | — | `{score_bucket, count}[]` |
| POST | `/playground/query` | `{query, k, ...}` | `{trace_id}` |
| WS | `/ws/{trace_id}` | — | Live `RAGEvent` JSON stream |
| GET | `/health` | — | `{status, db}` |

---

## Database Schema

### `rag_events` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | `VARCHAR PK` | UUID primary key |
| `trace_id` | `VARCHAR NOT NULL` | Groups pipeline events |
| `query_id` | `VARCHAR NOT NULL` | Groups query events |
| `stage` | `VARCHAR NOT NULL` | Pipeline stage name |
| `ts_start` | `DOUBLE NOT NULL` | Unix timestamp |
| `duration_ms` | `DOUBLE` | Execution time |
| `query_text` | `TEXT` | User query |
| `query_vector` | `FLOAT[]` | Embedding vector |
| `chunks` | `JSON` | Retrieved chunks |
| `generated_answer` | `TEXT` | LLM output |
| `grounding_scores` | `JSON` | Sentence attribution |
| `error` | `TEXT` | Error message |
| `metadata` | `JSON` | Arbitrary metadata |
| `created_at` | `TIMESTAMP` | Auto-set on insert |

**Index:** `idx_events_trace` on `trace_id`

### `query_sessions` Table

| Column | Type | Description |
|--------|------|-------------|
| `query_id` | `VARCHAR PK` | Primary key |
| `trace_id` | `VARCHAR NOT NULL` | Associated trace |
| `query_text` | `TEXT` | User query |
| `total_duration_ms` | `DOUBLE` | End-to-end latency |
| `chunk_count` | `INTEGER` | Number of chunks retrieved |
| `final_answer` | `TEXT` | Generated answer |
| `overall_grounding_score` | `FLOAT` | Average grounding across sentences |
| `stage_count` | `INTEGER` | Number of pipeline stages |
| `has_error` | `BOOLEAN` | Whether any stage failed |
| `created_at` | `TIMESTAMP` | Auto-set on insert |

**Index:** `idx_sessions_created` on `created_at`

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `data/rag_traces.duckdb` | DuckDB file path |
| `--port` | `7777` | Server port |
| `--host` | `0.0.0.0` | Bind address |
| `CORS origins` | `["*"]` | Allowed origins |

---

## Testing

Tests use an **in-memory DuckDB** so they never touch the real database.

```bash
# Run all tests
cd apps/server
.venv/bin/python -m pytest tests/ -v

# Run specific test file
.venv/bin/python -m pytest tests/test_events.py -v
```

### Test Coverage

| File | Tests | Covers |
|------|-------|--------|
| `test_events.py` | 4 | Ingestion, health, validation, session_complete |
| `test_traces.py` | 7 | Trace listing, detail, chunks, embeddings, grounding, analytics |
