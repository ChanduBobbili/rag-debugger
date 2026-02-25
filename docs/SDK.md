# RAG Debugger — SDK Documentation

> Lightweight Python SDK for instrumenting RAG pipelines with a single decorator.

---

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Module Breakdown](#module-breakdown)
  - [\_\_init\_\_.py — Public API](#__init__py--public-api)
  - [decorators.py — @rag_trace](#decoratorspy--rag_trace)
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

---

## Architecture Overview

```
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
pip install -e packages/sdk

# With LangChain adapter
pip install -e "packages/sdk[langchain]"

# With LlamaIndex adapter
pip install -e "packages/sdk[llamaindex]"

# With OpenAI adapter
pip install -e "packages/sdk[openai]"

# All adapters
pip install -e "packages/sdk[all]"
```

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

```
packages/sdk/
├── pyproject.toml                # Dependencies and build config
└── rag_debugger/
    ├── __init__.py               # Public API: init(), rag_trace, new_trace(), reset_context()
    ├── decorators.py             # @rag_trace decorator implementation
    ├── context.py                # ContextVar-based trace/query ID propagation
    ├── emitter.py                # Async HTTP event emitter with retry
    ├── scrubber.py               # PII redaction (emails, phones, API keys)
    ├── models.py                 # Pydantic event schemas
    └── adapters/
        ├── __init__.py
        ├── langchain.py          # LangChain BaseCallbackHandler
        ├── llamaindex.py         # LlamaIndex callback handler
        └── openai.py             # OpenAI client wrapper
```

---

## Module Breakdown

### `__init__.py` — Public API

Exposes four functions and starts the background emitter worker:

| Export | Description |
|--------|-------------|
| `init(dashboard_url)` | Set the server URL. Call once at startup |
| `rag_trace(stage)` | Decorator for instrumenting pipeline functions |
| `new_trace(trace_id?, query_id?)` | Set explicit IDs (optional — auto-generated otherwise) |
| `reset_context()` | Clear current trace/query context for a new request |

```python
from rag_debugger import init, rag_trace, new_trace, reset_context
```

---

### `decorators.py` — @rag_trace

The core decorator that instruments any sync or async function.

#### What It Captures

| Data | Source | Stage |
|------|--------|-------|
| `trace_id`, `query_id` | `ContextVar` (auto-generated) | All |
| `query_text` | First `str` argument | All |
| `ts_start`, `duration_ms` | `time.time()` before/after | All |
| `error` | Exception message (if raised) | All |
| `query_vector` | Return value (if `list[float]`) | `embed` |
| `chunks` | Return value (if `list[dict]`) | `retrieve`, `rerank` |
| `generated_answer` | Return value (if `str`) | `generate` |

#### Behavior

1. Gets or creates `trace_id` and `query_id` from `ContextVar`
2. Records `ts_start` timestamp
3. Calls the wrapped function
4. Calculates `duration_ms`
5. Enriches the event with stage-specific data
6. Emits the event asynchronously (non-blocking)
7. After `generate` stage, also emits a `session_complete` event
8. If the function throws, captures the error and **re-raises** it

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

---

### `context.py` — Trace Propagation

Uses Python's `contextvars.ContextVar` for automatic trace correlation across async calls.

| Function | Description |
|----------|-------------|
| `get_or_create_trace_id()` | Returns current `trace_id` or generates a new UUID |
| `get_or_create_query_id()` | Returns current `query_id` or generates a new UUID |
| `set_trace_id(id)` | Explicitly set the trace ID |
| `set_query_id(id)` | Explicitly set the query ID |
| `new_trace(trace_id?, query_id?)` | Set both IDs (UUID defaults if None) |
| `reset_context()` | Clear both IDs for a new request |

#### How ContextVar Works

```python
# Request 1 (coroutine A)
trace_id = get_or_create_trace_id()  # "tr-abc123"
# All @rag_trace calls within this coroutine tree use "tr-abc123"

# Request 2 (coroutine B, concurrent)
trace_id = get_or_create_trace_id()  # "tr-def456"
# Completely isolated from Request 1
```

---

### `emitter.py` — Async Event Emitter

Non-blocking HTTP emitter using `asyncio.Queue` and a background worker.

#### Flow

```
@rag_trace emits event
       │
       ▼
  asyncio.Queue (max 10,000)
       │
       ▼
  Background worker (runs forever)
       │
       ▼
  scrubber.scrub(payload)
       │
       ▼
  httpx.AsyncClient.post("/events")
       │ (retry 3x with exponential backoff)
       ▼
  RAG Debugger Server
```

#### Retry Logic

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 500ms |
| 3 | 1000ms |

If all retries fail, the event is **silently dropped** (never crashes your pipeline).

---

### `scrubber.py` — PII Redaction

Automatically redacts sensitive information before events are emitted.

| Pattern | Example | Replacement |
|---------|---------|-------------|
| Email addresses | `user@example.com` | `[EMAIL_REDACTED]` |
| Phone numbers | `+1-555-123-4567` | `[PHONE_REDACTED]` |
| SSNs | `123-45-6789` | `[SSN_REDACTED]` |
| API keys | `sk-abc123...` | `[API_KEY_REDACTED]` |

The scrubber recursively walks all string values in the event payload (including nested dicts and lists).

---

### `models.py` — Event Schemas

| Model | Fields |
|-------|--------|
| `ChunkScore` | `chunk_id`, `text`, `cosine_score`, `rerank_score`, `final_rank`, `metadata` |
| `RAGEvent` | `id`, `trace_id`, `query_id`, `stage`, `ts_start`, `duration_ms`, `query_text`, `query_vector`, `chunks`, `generated_answer`, `grounding_scores`, `error`, `metadata` |

---

## Framework Adapters

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

| LangChain Event | RAG Stage |
|-----------------|-----------|
| `on_retriever_end` | `retrieve` |
| `on_llm_end` | `generate` |

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

| LlamaIndex Event | RAG Stage |
|------------------|-----------|
| `EMBEDDING` | `embed` |
| `RETRIEVE` | `retrieve` |
| `RERANKING` | `rerank` |
| `LLM` | `generate` |

---

### OpenAI Adapter

Wraps the OpenAI client to auto-instrument embedding and completion calls.

```python
from rag_debugger import init
from rag_debugger.adapters.openai import RAGDebuggerOpenAI

init(dashboard_url="http://localhost:7777")

client = RAGDebuggerOpenAI()

# Embedding calls → "embed" events
embedding = client.embed("What is RAG?")

# Completion calls → "generate" events
response = client.complete(
    messages=[{"role": "user", "content": "Explain RAG"}],
    model="gpt-4",
)
```

---

## API Reference

### `init(dashboard_url: str) -> None`

Initialize the SDK. Must be called once before any `@rag_trace` calls.

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

### `reset_context() -> None`

Clear the current trace/query context. Call between requests to start a fresh trace.

```python
reset_context()
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

### Sync Function Support

The decorator works with both async and sync functions:

```python
@rag_trace("retrieve")
def sync_retrieve(query: str):
    return db.query(query)  # Sync function — fully supported
```

---

## Configuration

| Setting | Default | Set Via |
|---------|---------|---------|
| Dashboard URL | `http://localhost:7777` | `init(dashboard_url=...)` |
| Queue size | 10,000 events | Hardcoded (emitter.py) |
| Max retries | 3 | Hardcoded (emitter.py) |
| PII scrubbing | Enabled | Always on |
| Trace ID format | UUID hex (first 12 chars) | Auto-generated |
