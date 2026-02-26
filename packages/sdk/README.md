# RAG Debugger SDK 🔍

[![PyPI version](https://img.shields.io/pypi/v/rag-debugger.svg)](https://pypi.org/project/rag-debugger/)
[![Python](https://img.shields.io/pypi/pyversions/rag-debugger.svg)](https://pypi.org/project/rag-debugger/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**One-line decorator to debug your RAG pipelines in real time.**

Instrument any Python RAG pipeline with `@rag_trace` — captures inputs, outputs, timing, and errors for every stage (embed → retrieve → rerank → generate) and streams them to the [RAG Debugger Dashboard](https://github.com/ChanduBobbili/rag-debugger).

## Features

- 🔗 **One decorator** — `@rag_trace("retrieve")` on your existing functions
- ⚡ **Non-blocking** — async background worker, never slows your pipeline
- 🧵 **Auto-correlation** — `trace_id` / `query_id` via `ContextVar` (no manual threading)
- 🔒 **PII scrubbing** — emails, phone numbers, SSNs, API keys automatically redacted
- 🔌 **Framework adapters** — LangChain, LlamaIndex, and OpenAI out of the box
- 🛡️ **Safe** — errors in the SDK never crash your application

## Installation

```bash
pip install rag-debugger
```

With framework adapters:

```bash
pip install rag-debugger[langchain]    # LangChain
pip install rag-debugger[llamaindex]   # LlamaIndex
pip install rag-debugger[openai]       # OpenAI
pip install rag-debugger[all]          # All adapters
```

## Quick Start

```python
from rag_debugger import init, rag_trace

# 1. Point to your RAG Debugger server
init(dashboard_url="http://localhost:7777")

# 2. Decorate your pipeline functions
@rag_trace("embed")
async def embed_query(query: str) -> list[float]:
    return await my_embedder.embed(query)

@rag_trace("retrieve")
async def retrieve_chunks(vector: list[float], k: int = 10):
    return await vector_store.query(vector, k)

@rag_trace("rerank")
async def rerank(query: str, chunks: list) -> list:
    return await reranker.rerank(query, chunks)

@rag_trace("generate")
async def generate(query: str, context: str) -> str:
    return await llm.complete(query, context)

# 3. Call your pipeline — traces appear in the dashboard
answer = await generate(query, context)
```

The decorator automatically:

- Generates `trace_id` and `query_id` per request
- Captures function inputs and outputs
- Measures `duration_ms` for each stage
- Emits a `session_complete` summary after the generate stage
- Scrubs PII before sending

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

client = RAGDebuggerOpenAI(openai.AsyncOpenAI())
embedding = await client.embed("What is RAG?")
response = await client.complete("Explain RAG")
```

## Advanced Usage

### Explicit Trace Control

```python
from rag_debugger import new_trace, reset_context

# Group events under a custom trace
new_trace(trace_id="my-trace-123", query_id="q-001")
await embed_query("What is RAG?")
await retrieve_chunks(vector)

# Reset for the next request
reset_context()
```

### Async Context Manager

```python
import rag_debugger

async with rag_debugger.trace(trace_id="req-123") as t:
    print(t.trace_id)
    result = await my_rag_pipeline(query)
# Context is automatically restored after the block
```

## Documentation

- [Full SDK Documentation](https://github.com/ChanduBobbili/rag-debugger/blob/main/docs/SDK.md)
- [Server Documentation](https://github.com/ChanduBobbili/rag-debugger/blob/main/docs/SERVER.md)
- [Dashboard Documentation](https://github.com/ChanduBobbili/rag-debugger/blob/main/docs/DASHBOARD.md)

## License

MIT — see [LICENSE](https://github.com/ChanduBobbili/rag-debugger/blob/main/LICENSE) for details.
