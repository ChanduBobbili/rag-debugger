# RAG Debugger 🔍

**Chrome DevTools for RAG Pipelines** — Instrument your RAG code with a single decorator, and this dashboard visualizes every stage in real time: embedding, retrieval, re-ranking, answer generation, and grounding attribution.

---

## Why RAG Debugger?

When your RAG chatbot gives a wrong answer, you're left guessing. RAG Debugger makes the entire pipeline transparent:

| Question | Without RAG Debugger | With RAG Debugger |
|----------|---------------------|-------------------|
| Was the right document retrieved? | 🤷 No idea | ✅ See all chunks + similarity scores |
| Was the reranker helpful? | 🤷 No idea | ✅ Compare cosine vs rerank scores side by side |
| Did the LLM use the context? | 🤷 No idea | ✅ Sentence-level grounding highlights (green/red) |
| Which stage was slow? | 🤷 No idea | ✅ Stage-by-stage latency timeline |
| Is quality improving over time? | 🤷 No idea | ✅ Grounding trends + analytics dashboard |

---

## How It Works

```
Your RAG App                SDK                    Server                 Dashboard
┌──────────┐         ┌──────────────┐        ┌──────────────┐       ┌──────────────┐
│ embed()  │──emit──▶│ @rag_trace   │──POST─▶│ FastAPI +    │──GET─▶│ Next.js UI   │
│ retrieve │  event  │ non-blocking │ /events│ DuckDB       │ REST  │ D3 charts    │
│ rerank() │         │ auto trace   │        │ grounding    │ + WS  │ live updates │
│ generate │         │ PII scrub    │        │ analytics    │       │ analytics    │
└──────────┘         └──────────────┘        └──────────────┘       └──────────────┘
```

### The 3 Components

| Component | What It Does | Why It Exists |
|-----------|-------------|---------------|
| **SDK** (`packages/sdk/`) | `@rag_trace("retrieve")` — one-line decorator on your existing functions | Captures inputs, outputs, timing, errors **without blocking** your pipeline. Scrubs PII before sending. |
| **Server** (`apps/server/`) | FastAPI + DuckDB + sentence-transformers | Stores events, computes **grounding scores** (checks if each LLM sentence is supported by retrieved chunks), broadcasts via WebSocket. |
| **Dashboard** (`apps/dashboard/`) | Next.js 16 + D3.js + Recharts | Pipeline timeline, chunk waterfall chart, grounding highlighter, embedding scatter plot, live analytics. |

---

## Real-World Benefits

1. **Debug bad answers** — drill into a specific trace, see which chunks were retrieved, and whether the LLM actually used them
2. **Optimize latency** — see that retrieval takes 800ms (add a cache!) or generation takes 3s (use a faster model!)
3. **Detect hallucinations** — the grounding highlighter shows you, sentence by sentence, what's supported by evidence vs. hallucinated
4. **Track quality over time** — after changing your chunking strategy or embedding model, see if grounding scores improved
5. **Production monitoring** — the live WebSocket feed shows every query flowing through your pipeline in real time

---

## Quick Start (3 terminals)

### Terminal 1: Start the server

```bash
cd apps/server
uv venv && uv pip install -e .
uv run uvicorn main:app --host 0.0.0.0 --port 7777 --reload
```

### Terminal 2: Start the dashboard

```bash
cd apps/dashboard
pnpm install && pnpm dev
```

### Terminal 3: Run the test app

```bash
cd apps/test-app
uv venv --clear .venv
uv pip install --python .venv/bin/python3 httpx pydantic
.venv/bin/python3 main.py                              # Run all 8 sample queries
.venv/bin/python3 main.py --query "What is RAG?"       # Single query
.venv/bin/python3 main.py --loop                       # Continuous (every 5s)
.venv/bin/python3 main.py --error                      # Simulate errors
```

Open http://localhost:3000 (or :3001) — traces appear as the pipeline runs.

---

## Instrument Your Own RAG Code

```python
from rag_debugger import init, rag_trace

# 1. Initialize once at startup
init(dashboard_url="http://localhost:7777")

# 2. Decorate your pipeline functions — that's it
@rag_trace("embed")
async def embed_query(query: str) -> list[float]:
    return await openai_embed(query)

@rag_trace("retrieve")
async def retrieve_chunks(vector: list[float], k: int = 10):
    return await vector_store.query(vector, k)

@rag_trace("rerank")
async def rerank(query: str, chunks: list) -> list:
    return await cohere_rerank(query, chunks)

@rag_trace("generate")
async def generate(query: str, context: str) -> str:
    return await llm.complete(query, context)
```

The decorator automatically:
- Generates `trace_id` and `query_id` via ContextVar
- Captures function inputs and outputs
- Measures `duration_ms`
- Emits events asynchronously (non-blocking, never crashes your pipeline)
- Scrubs PII (emails, API keys, SSNs) before sending

---

## What Happens Under the Hood

When you call your pipeline, here's the event flow:

```
embed_query("What is RAG?")
  → @rag_trace captures 64-dim vector, 23ms duration   → POST /events ✓

retrieve_chunks(vector, k=5)
  → @rag_trace captures 5 chunks + cosine scores       → POST /events ✓

rerank_chunks(query, chunks)
  → @rag_trace captures reranked scores                 → POST /events ✓

generate_answer(query, context)
  → @rag_trace captures answer text                     → POST /events ✓
  → auto-emits session_complete summary                 → POST /events ✓

Server:
  → Stores all 5 events in DuckDB
  → Computes sentence-level grounding (MiniLM model)
  → Broadcasts via WebSocket to dashboard

Dashboard:
  → Pipeline timeline shows stage durations
  → Chunk waterfall compares cosine vs rerank scores
  → Grounding highlighter shows green (grounded) / red (hallucinated) sentences
```

---

## Framework Adapters

### LangChain

```python
from rag_debugger.adapters.langchain import RAGDebuggerCallback

handler = RAGDebuggerCallback()
chain.invoke({"query": "..."}, config={"callbacks": [handler]})
```

### LlamaIndex

```python
from rag_debugger.adapters.llamaindex import RAGDebuggerLlamaIndex
from llama_index.core.callbacks import CallbackManager

handler = RAGDebuggerLlamaIndex()
callback_manager = CallbackManager([handler])
index = VectorStoreIndex.from_documents(docs, callback_manager=callback_manager)
```

### OpenAI

```python
from rag_debugger.adapters.openai import RAGDebuggerOpenAI

client = RAGDebuggerOpenAI()
embedding = client.embed("What is RAG?")          # → "embed" event
response = client.complete(messages=[...])          # → "generate" event
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Ingest SDK events |
| GET | `/traces` | List query sessions (paginated, filterable) |
| GET | `/traces/{id}` | Full trace with all events |
| GET | `/traces/{id}/chunks` | Chunk scores across stages |
| GET | `/traces/{id}/embeddings` | Vectors for UMAP projection |
| GET | `/traces/{id}/grounding` | Sentence attribution data |
| GET | `/analytics/metrics?days=7` | Daily metrics (grounding, latency, errors) |
| WS | `/ws/{trace_id}` | Real-time event stream |
| POST | `/playground/query` | Test query endpoint |
| GET | `/health` | Health check |

---

## Docker

```bash
docker-compose up --build
```

- **Server**: http://localhost:7777
- **Dashboard**: http://localhost:3000

---

## Project Structure

```
rag-debugger/
├── apps/
│   ├── server/             # FastAPI backend
│   │   ├── routers/        # events, traces, analytics, ws, playground
│   │   ├── database.py     # DuckDB connection + queries
│   │   ├── grounding.py    # Sentence attribution scorer (MiniLM)
│   │   └── models.py       # Pydantic schemas
│   ├── dashboard/          # Next.js 16 frontend
│   │   ├── app/            # Pages (Home, Traces, Analytics, Playground)
│   │   ├── components/     # D3 charts, timeline, grounding highlighter
│   │   ├── hooks/          # WebSocket, UMAP, metrics hooks
│   │   └── lib/            # API client, TypeScript types
│   └── test-app/           # Test application for SDK integration
├── packages/
│   └── sdk/                # Python instrumentation SDK
│       └── rag_debugger/   # Core SDK + framework adapters
├── docs/                   # Detailed docs (SERVER.md, SDK.md, DASHBOARD.md)
├── docker-compose.yml
├── Makefile
└── README.md
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TypeScript 5.9 |
| Charts | D3.js (waterfall), Recharts (metrics) |
| Embeddings | umap-js (browser), Canvas2D |
| Backend | FastAPI, Python 3.10+ |
| Database | DuckDB (columnar analytics) |
| Grounding | sentence-transformers (all-MiniLM-L6-v2) |
| Real-time | WebSockets |
| SDK | Python, httpx, ContextVar propagation |

---

## License

MIT
