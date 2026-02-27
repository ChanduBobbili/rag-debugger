# RAG Debugger — Test Application

A self-contained test app that simulates a complete RAG pipeline using the `@rag_trace` SDK.
It pushes live traces to the server so you can watch them appear in the dashboard in real time.

## Setup

```bash
cd apps/test-app
uv venv --clear .venv
uv pip install --python .venv/bin/python3 httpx pydantic
```

## Usage

```bash
# Run all 8 sample queries
.venv/bin/python3 main.py

# Run a single custom query
.venv/bin/python3 main.py --query "What is vector search?"

# Continuous mode (new trace every 5 seconds)
.venv/bin/python3 main.py --loop

# Simulate error traces
.venv/bin/python3 main.py --error

# Custom top-K
.venv/bin/python3 main.py --k 10

# Point to a different server
.venv/bin/python3 main.py --server http://my-server:7777

# Run with a specific trace_id
.venv/bin/python3 main.py --query "What is the age of chandu bobbili?" --trace-id "playground-3de81c7c-0b60-415c-bf86-91282d0480b9"
```

## What It Does

The app simulates a 4-stage RAG pipeline, each decorated with `@rag_trace`:

1. **`embed_query()`** — generates a fake 64-dim normalized vector
2. **`retrieve_chunks()`** — picks chunks from a 10-document knowledge base with random similarity scores
3. **`rerank_chunks()`** — adds cross-encoder rerank scores and reorders
4. **`generate_answer()`** — returns a pre-written answer matched to the query

Every function call emits a trace event to the server via the SDK.
