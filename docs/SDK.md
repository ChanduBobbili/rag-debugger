# RAG Debugger — SDK Documentation

> Lightweight Python SDK for instrumenting RAG pipelines with a single decorator.
>
> **Version**: `0.1.0` · **Python**: `≥3.10` · **License**: MIT

---

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Module Breakdown](#module-breakdown)
  - [\_\_init\_\_.py — Public API](#__init__py--public-api)
  - [decorators.py — @rag\_trace](#decoratorspy--rag_trace)
  - [context.py — Trace Propagation](#contextpy--trace-propagation)
  - [emitter.py — Async Event Emitter](#emitterpy--async-event-emitter)
  - [scrubber.py — PII Redaction](#scrubberpy--pii-redaction)
  - [models.py — Event Schemas](#modelspy--event-schemas)
- [Framework Adapters](#framework-adapters)
  - [LangChain Adapter](#langchain-adapter)
  - [LlamaIndex Adapter](#llamaindex-adapter)
  - [OpenAI Adapter](#openai-adapter)
- [API Reference](#api-reference)
- [Advanced Usage](#advanced-usage)
- [Configuration](#configuration)

---

## Introduction

The RAG Debugger SDK is a **zero-overhead Python library** that instruments RAG pipeline functions using a simple `@rag_trace` decorator. It automatically captures inputs, outputs, timing, and errors for each pipeline stage and emits them asynchronously to the RAG Debugger Server.

### Design Principles

- **Non-blocking** — all events are emitted asynchronously via a background worker
- **Zero config** — auto-generates `trace_id` and `query_id` using `ContextVar`
- **Safe** — PII is scrubbed before emission; errors in the SDK never crash your pipeline
- **Framework-agnostic** — works with any Python code, plus adapters for LangChain, LlamaIndex, and OpenAI
- **Type-safe** — ships with `py.typed` marker (PEP 561) for full type-checker support

---

## Architecture Overview

```text
Your RAG Pipeline
       │
   @rag_trace("embed")     ◄── Decorator captures inputs/outputs/timing
   @rag_trace("retrieve")
   @rag_trace("rerank")
   @rag_trace("generate")
       │
       ▼
┌──────────────────────────────────────────────────┐
│                    SDK Core                       │
│                                                  │
│  context.py ──► ContextVar(trace_id, query_id)   │
│       │                                          │
│  decorators.py ──► capture stage data            │
│       │                                          │
│  scrubber.py ──► redact PII                      │
│       │                                          │
│  emitter.py ──► asyncio.Queue ──► background     │
│                  worker ──► httpx POST /events    │
└──────────────────────────────────────────────────┘
       │
       ▼
   RAG Debugger Server (http://localhost:7777)
```

---

## Installation

```bash
# Core SDK
pip install rag-debugger

# With LangChain adapter
pip install "rag-debugger[langchain]"

# With LlamaIndex adapter
pip install "rag-debugger[llamaindex]"

# With OpenAI adapter
pip install "rag-debugger[openai]"

# All adapters
pip install "rag-debugger[all]"
```

**Requirements**: Python ≥ 3.10. Core dependencies: `httpx ≥ 0.24.0`, `pydantic ≥ 2.0.0`.

---

## Quick Start

```python
from rag_debugger import init, rag_trace

# 1. Initialize once at startup
init(dashboard_url="http://localhost:7777")

# 2. Decorate your pipeline functions
@rag_trace("embed")
async def embed_query(query: str) -> list[float]:
    return await openai.embeddings.create(input=query)

@rag_trace("retrieve")
async def retrieve_chunks(vector: list[float], k: int = 10):
    return await vector_store.query(vector, k)

@rag_trace("rerank")
async def rerank(query: str, chunks: list) -> list:
    return await cohere.rerank(query, chunks)

@rag_trace("generate")
async def generate_answer(query: str, context: str) -> str:
    return await openai.chat.completions.create(...)

# 3. Call your pipeline — traces appear automatically in the dashboard
answer = await generate_answer(query, context)
```

---

## Project Structure

```text
packages/sdk/
├── pyproject.toml                # Package metadata, dependencies, build config
├── README.md                     # PyPI project description
└── rag_debugger/
    ├── __init__.py               # Public API: init(), rag_trace, new_trace(), trace(), etc.
    ├── decorators.py             # @rag_trace decorator implementation
    ├── context.py                # ContextVar-based trace/query ID propagation
    ├── emitter.py                # Async HTTP event emitter with retry + drop warnings
    ├── scrubber.py               # PII redaction (emails, phones, SSNs, API keys)
    ├── models.py                 # Pydantic event schemas (RAGEvent, ChunkScore)
    ├── py.typed                  # PEP 561 type-checker marker
    └── adapters/
        ├── __init__.py
        ├── langchain.py          # LangChain BaseCallbackHandler
        ├── llamaindex.py         # LlamaIndex callback handler
        └── openai.py             # OpenAI async client wrapper
```

---

## Module Breakdown

### `__init__.py` — Public API

Exposes the SDK's public surface. The background emitter worker starts **lazily** on the first `emit()` call, so `init()` is safe to call at import time.

| Export             | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `init(dashboard_url)` | Set the server URL. Call once at startup                        |
| `rag_trace(stage)` | Decorator for instrumenting pipeline functions                    |
| `new_trace(trace_id?, query_id?)` | Set explicit IDs (optional — auto-generated otherwise) |
| `trace(trace_id?, query_id?)` | Async context manager for scoped trace control            |
| `reset_context()`  | Clear current trace/query context for a new request               |
| `stop_worker()`    | Gracefully drain the event queue and stop the background worker   |
| `__version__`      | Package version string (e.g. `"0.1.0"`)                          |

```python
from rag_debugger import init, rag_trace, new_trace, trace, reset_context, stop_worker, __version__
```

---

### `decorators.py` — @rag_trace

The core decorator that instruments any sync or async function.

#### What It Captures

| Data                         | Source                            | Stage                  |
| ---------------------------- | --------------------------------- | ---------------------- |
| `trace_id`, `query_id`      | `ContextVar` (auto-generated)     | All                    |
| `query_text`                 | First `str` argument (truncated to 500 chars) | All          |
| `ts_start`, `duration_ms`   | `time.time()` before/after        | All                    |
| `error`                      | Exception message (if raised)     | All                    |
| `query_vector`               | Return value (if `list[float]`)   | `embed`                |
| `chunks`                     | Return value (if `list[dict]`)    | `retrieve`, `rerank`   |
| `generated_answer`           | Return value (if `str`)           | `generate`             |

#### Behavior

1. Gets or creates `trace_id` and `query_id` from `ContextVar`
2. Records `ts_start` timestamp
3. Calls the wrapped function
4. Calculates `duration_ms`
5. Enriches the event with stage-specific data (vectors, chunks, answers)
6. Emits the event asynchronously (non-blocking)
7. After `generate` stage, also emits a `session_complete` summary event
8. If the function throws, captures the error, cleans up tracking state, and **re-raises** it

#### Memory Safety

The decorator tracks per-query stages in an `OrderedDict` with a safety cap of 500 entries. When exceeded, the oldest 100 entries are evicted (FIFO). On errors, query tracking state is cleaned up immediately.

#### Chunk Handling

The `_to_chunk_dict()` helper supports three input formats:

- **LangChain `Document`** objects (with `page_content` and `metadata` attributes)
- **Plain `dict`** with `text`/`page_content`, `score`/`cosine_score` keys
- **Any other object** — converted to string (truncated to 500 chars)

#### Example

```python
@rag_trace("retrieve")
async def search(query: str, k: int = 10):
    results = await vector_db.query(query, k)
    return [
        {"chunk_id": r.id, "text": r.text, "cosine_score": r.score,
         "rerank_score": None, "final_rank": i, "metadata": {}}
        for i, r in enumerate(results)
    ]
```

#### Sync Function Support

The decorator works with both async and sync functions. Sync functions use `asyncio.run()` internally:

```python
@rag_trace("retrieve")
def sync_retrieve(query: str):
    return db.query(query)  # Sync function — fully supported
```

> **Note**: If a sync-decorated function is called inside an already-running async event loop (e.g. FastAPI, Django async views), the SDK will raise a clear `RuntimeError` advising you to use `async def` with `await` instead.

---

### `context.py` — Trace Propagation

Uses Python's `contextvars.ContextVar` for automatic trace correlation across async calls.

| Function                      | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `get_or_create_trace_id()`    | Returns current `trace_id` or generates a new UUID   |
| `get_or_create_query_id()`    | Returns current `query_id` or generates a new UUID   |
| `set_trace_id(id)`            | Explicitly set the trace ID                          |
| `set_query_id(id)`            | Explicitly set the query ID                          |
| `reset_context()`             | Clear both IDs for a new request                     |

#### How ContextVar Works

```python
# Request 1 (coroutine A)
trace_id = get_or_create_trace_id()  # "a3f8d1b6-..."
# All @rag_trace calls within this coroutine tree use this ID

# Request 2 (coroutine B, concurrent)
trace_id = get_or_create_trace_id()  # "b4c9e2c7-..."
# Completely isolated from Request 1
```

---

### `emitter.py` — Async Event Emitter

Non-blocking HTTP emitter using `asyncio.Queue` and a background worker. The worker starts **lazily** on the first `emit()` call, with a double-checked lock to prevent race conditions.

#### Flow

```text
@rag_trace emits event
       │
       ▼
  scrubber.scrub(payload)
       │
       ▼
  asyncio.Queue (max 1,000)
       │
       ▼
  Background worker (runs forever)
       │
       ▼
  httpx.AsyncClient.post("/events")
       │ (retry 3x with exponential backoff)
       ▼
  RAG Debugger Server
```

#### Retry Logic

| Attempt | Delay      |
| ------- | ---------- |
| 1       | Immediate  |
| 2       | 500ms      |
| 3       | 1000ms     |

#### Drop Behavior

If the queue is full (1,000 events), new events are **dropped with a warning** printed to `stderr`:

```text
[rag-debugger] WARNING: event dropped (total dropped: 1) — is the server running at http://localhost:7777?
```

Warnings repeat every 50 dropped events to avoid log spam. Events are never silently lost.

---

### `scrubber.py` — PII Redaction

Automatically redacts sensitive information before events are emitted.

| Pattern           | Example            | Replacement |
| ----------------- | ------------------ | ----------- |
| Email addresses   | `user@example.com` | `[EMAIL]`   |
| Phone numbers     | `555-123-4567`     | `[PHONE]`   |
| SSNs              | `123-45-6789`      | `[SSN]`     |
| API keys          | `sk-abc123...`     | `[API_KEY]` |

The scrubber recursively walks all string values in the event payload (including nested dicts and lists). PII scrubbing is always enabled and cannot be disabled.

---

### `models.py` — Event Schemas

Pydantic v2 models used for event validation:

| Model        | Key Fields                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `ChunkScore` | `chunk_id`, `text`, `cosine_score`, `rerank_score` (optional), `final_rank`, `metadata`                          |
| `RAGEvent`   | `id`, `trace_id`, `query_id`, `stage`, `ts_start`, `duration_ms`, `query_text`, `query_vector`, `chunks`, `generated_answer`, `error`, `metadata` |

> **Note**: Both models use `Field(default_factory=dict)` for the `metadata` field to avoid mutable default pitfalls.

---

## Framework Adapters

All adapters are optional dependencies. Importing them without the corresponding library installed raises a helpful `ImportError` with installation instructions.

### LangChain Adapter

Auto-instruments LangChain retriever and LLM calls.

```python
from rag_debugger import init
from rag_debugger.adapters.langchain import RAGDebuggerCallback

init(dashboard_url="http://localhost:7777")

handler = RAGDebuggerCallback()
chain.invoke({"query": "What is RAG?"}, config={"callbacks": [handler]})
```

#### Mapped Events

| LangChain Event      | RAG Stage    |
| -------------------- | ------------ |
| `on_retriever_end`   | `retrieve`   |
| `on_llm_end`         | `generate`   |

---

### LlamaIndex Adapter

Auto-instruments LlamaIndex embedding, retrieval, reranking, and LLM calls.

```python
from rag_debugger import init
from rag_debugger.adapters.llamaindex import RAGDebuggerLlamaIndex
from llama_index.core.callbacks import CallbackManager

init(dashboard_url="http://localhost:7777")

handler = RAGDebuggerLlamaIndex()
callback_manager = CallbackManager([handler])
index = VectorStoreIndex.from_documents(docs, callback_manager=callback_manager)
```

#### Mapped Events

| LlamaIndex Event | RAG Stage    |
| ---------------- | ------------ |
| `EMBEDDING`      | `embed`      |
| `RETRIEVE`       | `retrieve`   |
| `RERANKING`      | `rerank`     |
| `LLM`            | `generate`   |

---

### OpenAI Adapter

Wraps an OpenAI async client to auto-instrument embedding and completion calls.

```python
import openai
from rag_debugger import init
from rag_debugger.adapters.openai import RAGDebuggerOpenAI

init(dashboard_url="http://localhost:7777")

# Pass your AsyncOpenAI client
client = RAGDebuggerOpenAI(openai.AsyncOpenAI())

# Embedding calls → "embed" events
embedding = await client.embed("What is RAG?")

# Completion calls → "generate" events
response = await client.complete(
    prompt="Explain RAG",
    system="You are a helpful assistant.",
    model="gpt-4o-mini",
)
```

---

## API Reference

### `init(dashboard_url: str = "http://localhost:7777") -> None`

Initialize the SDK. Configures the server URL. Safe to call at import time — the background worker starts lazily on first event.

```python
init(dashboard_url="http://localhost:7777")
```

### `@rag_trace(stage: str)`

Decorator for instrumenting pipeline functions. Supported stages: `"embed"`, `"retrieve"`, `"rerank"`, `"generate"`.

```python
@rag_trace("embed")
async def my_embed_fn(query: str) -> list[float]: ...
```

### `new_trace(trace_id: str | None, query_id: str | None) -> None`

Explicitly set trace and query IDs. Both default to auto-generated UUIDs if `None`.

```python
new_trace(trace_id="custom-trace-123")
```

### `trace(trace_id: str | None, query_id: str | None)`

Async context manager for scoped trace control. Auto-generates IDs if not provided. Supports nesting — the outer context is restored when the inner block exits.

```python
import rag_debugger

async with rag_debugger.trace(trace_id="req-123") as t:
    print(t.trace_id)   # "req-123"
    print(t.query_id)   # auto-generated UUID
    result = await my_rag_pipeline(query)
# Context is automatically restored after the block
```

The returned `_TraceHandle` object exposes `trace_id` and `query_id` attributes.

### `reset_context() -> None`

Clear the current trace/query context. Call between requests to start a fresh trace.

```python
reset_context()
```

### `stop_worker() -> None`

Gracefully drain the event queue and stop the background emitter. Call during application shutdown to ensure all pending events are sent.

```python
await stop_worker()
```

### `__version__: str`

The package version string. Useful for logging and diagnostics.

```python
import rag_debugger
print(rag_debugger.__version__)  # "0.1.0"
```

---

## Advanced Usage

### Manual Trace Control

```python
from rag_debugger import new_trace, reset_context, rag_trace

# Explicitly group events into a custom trace
new_trace(trace_id="my-custom-trace", query_id="q-001")

@rag_trace("embed")
async def step1(): ...

@rag_trace("retrieve")
async def step2(): ...

await step1()
await step2()

# Reset for next request
reset_context()
```

### Scoped Tracing with Context Manager

```python
import rag_debugger

# Nested trace contexts work correctly
async with rag_debugger.trace(trace_id="outer") as outer:
    await embed_query("What is RAG?")

    async with rag_debugger.trace(trace_id="inner") as inner:
        await retrieve_chunks(vector)
    # inner context exits, outer context is restored

    await generate_answer(query, context)
# outer context exits, original context is restored
```

### Graceful Shutdown

```python
import rag_debugger

# Ensure all pending events are sent before exit
async def shutdown():
    await rag_debugger.stop_worker()
```

---

## Configuration

| Setting          | Default                   | Set Via                    |
| ---------------- | ------------------------- | -------------------------- |
| Dashboard URL    | `http://localhost:7777`   | `init(dashboard_url=...)` |
| Queue size       | 1,000 events             | Hardcoded (emitter.py)     |
| Max retries      | 3                        | Hardcoded (emitter.py)     |
| Retry timeout    | 10s per request          | Hardcoded (emitter.py)     |
| PII scrubbing    | Enabled                  | Always on                  |
| Trace ID format  | UUID v4                  | Auto-generated             |
| Python version   | ≥ 3.10                   | pyproject.toml             |
