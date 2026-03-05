try:
    from langchain_core.callbacks import BaseCallbackHandler
    from langchain_core.outputs import LLMResult
except ImportError:
    raise ImportError(
        "LangChain adapter requires langchain-core. "
        "Install with: pip install rag-debugger[langchain]"
    )

import asyncio
import time
import uuid
from ..context import get_or_create_trace_id, get_or_create_query_id
from ..emitter import emit


class RAGDebuggerCallback(BaseCallbackHandler):
    """
    LangChain callback handler for RAG Debugger.

    Usage::

        from rag_debugger.adapters.langchain import RAGDebuggerCallback
        handler = RAGDebuggerCallback()
        chain.invoke({"query": "..."}, config={"callbacks": [handler]})
    """

    def __init__(self) -> None:
        self._embed_start: float = 0.0
        self._retriever_start: float = 0.0
        self._llm_start: float = 0.0
        self._query_text: str = ""
        self._stages: list[dict] = []          # for session_complete
        self._trace_id: str = ""
        self._query_id: str = ""

    # ------------------------------------------------------------------ embed
    def on_embeddings_start(self, serialized, texts, **kwargs) -> None:
        self._embed_start = time.time()
        if texts:
            self._query_text = texts[0]
        self._trace_id = get_or_create_trace_id()
        self._query_id = get_or_create_query_id()

    def on_embeddings_end(self, embeddings, **kwargs) -> None:
        duration = (time.time() - self._embed_start) * 1000
        vector = embeddings[0] if embeddings else []
        event = {
            "id": str(uuid.uuid4()),
            "trace_id": self._trace_id,
            "query_id": self._query_id,
            "stage": "embed",
            "ts_start": self._embed_start,
            "duration_ms": duration,
            "query_text": self._query_text[:500],
            "query_vector": vector[:4096],
        }
        self._stages.append({"stage": "embed", "duration_ms": duration})
        self._schedule(emit(event))

    # --------------------------------------------------------------- retrieve
    def on_retriever_start(self, serialized, query, **kwargs) -> None:
        self._retriever_start = time.time()
        self._query_text = self._query_text or query
        if not self._trace_id:
            self._trace_id = get_or_create_trace_id()
            self._query_id = get_or_create_query_id()

    def on_retriever_end(self, documents, **kwargs) -> None:
        duration = (time.time() - self._retriever_start) * 1000
        chunks = [
            {
                "chunk_id": str(i),
                "text": doc.page_content[:1000],
                "cosine_score": float(
                    doc.metadata.get("score",
                    doc.metadata.get("relevance_score", 0.0))
                ),
                "rerank_score": doc.metadata.get("rerank_score"),
                "final_rank": i,
                "metadata": dict(doc.metadata),
            }
            for i, doc in enumerate(documents)
        ]
        event = {
            "id": str(uuid.uuid4()),
            "trace_id": self._trace_id,
            "query_id": self._query_id,
            "stage": "retrieve",
            "ts_start": self._retriever_start,
            "duration_ms": duration,
            "query_text": self._query_text[:500],
            "chunks": chunks,
        }
        self._stages.append({"stage": "retrieve", "duration_ms": duration})
        self._schedule(emit(event))

    # ----------------------------------------------------------------- llm
    def on_llm_start(self, serialized, prompts, **kwargs) -> None:
        self._llm_start = time.time()

    def on_llm_end(self, response: LLMResult, **kwargs) -> None:
        duration = (time.time() - self._llm_start) * 1000
        answer = (
            response.generations[0][0].text
            if response.generations
            else ""
        )
        gen_event = {
            "id": str(uuid.uuid4()),
            "trace_id": self._trace_id,
            "query_id": self._query_id,
            "stage": "generate",
            "ts_start": self._llm_start,
            "duration_ms": duration,
            "query_text": self._query_text[:500],
            "generated_answer": answer,
        }
        self._stages.append({"stage": "generate", "duration_ms": duration})

        total_ms = sum(s["duration_ms"] for s in self._stages)
        session_event = {
            "id": str(uuid.uuid4()),
            "trace_id": self._trace_id,
            "query_id": self._query_id,
            "stage": "session_complete",
            "ts_start": time.time(),
            "duration_ms": total_ms,
            "query_text": self._query_text[:500],
            "generated_answer": answer,
            "metadata": {
                "stage_count": len(self._stages),
                "has_error": False,
            },
        }
        self._schedule(emit(gen_event))
        self._schedule(emit(session_event))
        self._stages = []  # reset for next chain invocation

    def on_llm_error(self, error, **kwargs) -> None:
        duration = (time.time() - self._llm_start) * 1000
        self._stages.append({"stage": "generate", "duration_ms": duration})
        total_ms = sum(s["duration_ms"] for s in self._stages)
        error_event = {
            "id": str(uuid.uuid4()),
            "trace_id": self._trace_id,
            "query_id": self._query_id,
            "stage": "session_complete",
            "ts_start": time.time(),
            "duration_ms": total_ms,
            "error": str(error),
            "metadata": {
                "stage_count": len(self._stages),
                "has_error": True,
            },
        }
        self._schedule(emit(error_event))
        self._stages = []

    @staticmethod
    def _schedule(coro) -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(coro)
        except RuntimeError:
            pass  # No running loop — event silently dropped
