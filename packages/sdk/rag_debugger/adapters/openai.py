"""OpenAI wrapper adapter for RAG Debugger SDK."""

try:
    import openai
except ImportError:
    raise ImportError(
        "OpenAI adapter requires openai. "
        "Install with: pip install rag-debugger[openai]"
    )

import asyncio
import time
import uuid
from typing import Any
from ..context import get_or_create_trace_id, get_or_create_query_id
from ..emitter import emit


class RAGDebuggerOpenAI:
    """
    Wrapper around OpenAI client that auto-instruments embedding and completion calls.
    Usage:
        from rag_debugger.adapters.openai import RAGDebuggerOpenAI
        client = RAGDebuggerOpenAI(openai.AsyncOpenAI())
        embeddings = await client.embed("hello world")
        response = await client.complete("hello world", system="You are helpful")
    """

    def __init__(self, client: Any) -> None:
        self._client = client

    async def embed(self, text: str, model: str = "text-embedding-3-small") -> list[float]:
        ts_start = time.time()
        try:
            response = await self._client.embeddings.create(
                input=text,
                model=model,
            )
            vector = response.data[0].embedding
            duration = (time.time() - ts_start) * 1000

            await emit({
                "id": str(uuid.uuid4()),
                "trace_id": get_or_create_trace_id(),
                "query_id": get_or_create_query_id(),
                "stage": "embed",
                "ts_start": ts_start,
                "duration_ms": duration,
                "query_text": text[:500],
                "query_vector": vector[:1536],
            })

            return vector
        except Exception as e:
            duration = (time.time() - ts_start) * 1000
            await emit({
                "id": str(uuid.uuid4()),
                "trace_id": get_or_create_trace_id(),
                "query_id": get_or_create_query_id(),
                "stage": "embed",
                "ts_start": ts_start,
                "duration_ms": duration,
                "query_text": text[:500],
                "error": str(e),
            })
            raise

    async def complete(
        self,
        prompt: str,
        system: str = "You are a helpful assistant.",
        model: str = "gpt-4o-mini",
        **kwargs,
    ) -> str:
        ts_start = time.time()
        try:
            response = await self._client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                **kwargs,
            )
            answer = response.choices[0].message.content or ""
            duration = (time.time() - ts_start) * 1000

            await emit({
                "id": str(uuid.uuid4()),
                "trace_id": get_or_create_trace_id(),
                "query_id": get_or_create_query_id(),
                "stage": "generate",
                "ts_start": ts_start,
                "duration_ms": duration,
                "query_text": prompt[:500],
                "generated_answer": answer,
            })

            return answer
        except Exception as e:
            duration = (time.time() - ts_start) * 1000
            await emit({
                "id": str(uuid.uuid4()),
                "trace_id": get_or_create_trace_id(),
                "query_id": get_or_create_query_id(),
                "stage": "generate",
                "ts_start": ts_start,
                "duration_ms": duration,
                "query_text": prompt[:500],
                "error": str(e),
            })
            raise
