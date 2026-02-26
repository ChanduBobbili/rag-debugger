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
    LangChain callback handler.
    Usage:
        from rag_debugger.adapters.langchain import RAGDebuggerCallback
        handler = RAGDebuggerCallback()
        chain.invoke({"query": "..."}, config={"callbacks": [handler]})
    """

    def __init__(self) -> None:
        self._retriever_start: float = 0
        self._llm_start: float = 0
        self._query_text: str = ""

    def on_retriever_start(self, serialized, query, **kwargs) -> None:
        self._retriever_start = time.time()
        self._query_text = query

    def on_retriever_end(self, documents, **kwargs) -> None:
        duration = (time.time() - self._retriever_start) * 1000
        chunks = [
            {
                "chunk_id": str(i),
                "text": doc.page_content[:1000],
                "cosine_score": doc.metadata.get("score", 0.0),
                "final_rank": i,
                "metadata": doc.metadata,
            }
            for i, doc in enumerate(documents)
        ]
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(emit({
                "id": str(uuid.uuid4()),
                "trace_id": get_or_create_trace_id(),
                "query_id": get_or_create_query_id(),
                "stage": "retrieve",
                "ts_start": self._retriever_start,
                "duration_ms": duration,
                "query_text": self._query_text,
                "chunks": chunks,
            }))
        except RuntimeError:
            pass  # No running loop — skip

    def on_llm_start(self, serialized, prompts, **kwargs) -> None:
        self._llm_start = time.time()

    def on_llm_end(self, response: LLMResult, **kwargs) -> None:
        duration = (time.time() - self._llm_start) * 1000
        answer = response.generations[0][0].text if response.generations else ""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(emit({
                "id": str(uuid.uuid4()),
                "trace_id": get_or_create_trace_id(),
                "query_id": get_or_create_query_id(),
                "stage": "generate",
                "ts_start": self._llm_start,
                "duration_ms": duration,
                "generated_answer": answer,
            }))
        except RuntimeError:
            pass
