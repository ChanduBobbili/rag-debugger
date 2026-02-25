"""LlamaIndex observer adapter for RAG Debugger SDK."""

try:
    from llama_index.core.callbacks import CallbackManager, CBEventType, LlamaDebugHandler
    from llama_index.core.callbacks.base_handler import BaseCallbackHandler
except ImportError:
    raise ImportError(
        "LlamaIndex adapter requires llama-index-core. "
        "Install with: pip install rag-debugger-sdk[llamaindex]"
    )

import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional
from ..context import get_or_create_trace_id, get_or_create_query_id
from ..emitter import emit


class RAGDebuggerLlamaIndex(BaseCallbackHandler):
    """
    LlamaIndex callback handler for RAG Debugger.
    Usage:
        from rag_debugger.adapters.llamaindex import RAGDebuggerLlamaIndex
        handler = RAGDebuggerLlamaIndex()
        callback_manager = CallbackManager([handler])
        index = VectorStoreIndex.from_documents(docs, callback_manager=callback_manager)
    """

    def __init__(self) -> None:
        super().__init__([], [])
        self._event_starts: Dict[str, float] = {}

    def on_event_start(
        self,
        event_type: CBEventType,
        payload: Optional[Dict[str, Any]] = None,
        event_id: str = "",
        **kwargs,
    ) -> str:
        self._event_starts[event_id] = time.time()
        return event_id

    def on_event_end(
        self,
        event_type: CBEventType,
        payload: Optional[Dict[str, Any]] = None,
        event_id: str = "",
        **kwargs,
    ) -> None:
        start_time = self._event_starts.pop(event_id, time.time())
        duration = (time.time() - start_time) * 1000

        stage = self._map_event_type(event_type)
        if stage is None:
            return

        event = {
            "id": str(uuid.uuid4()),
            "trace_id": get_or_create_trace_id(),
            "query_id": get_or_create_query_id(),
            "stage": stage,
            "ts_start": start_time,
            "duration_ms": duration,
        }

        if payload:
            if stage == "retrieve" and "nodes" in payload:
                event["chunks"] = [
                    {
                        "chunk_id": str(i),
                        "text": str(getattr(n, "text", ""))[:1000],
                        "cosine_score": float(getattr(n, "score", 0.0)),
                        "final_rank": i,
                    }
                    for i, n in enumerate(payload["nodes"])
                ]
            elif stage == "generate" and "response" in payload:
                event["generated_answer"] = str(payload["response"])

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(emit(event))
        except RuntimeError:
            pass

    def start_trace(self, trace_id: Optional[str] = None) -> None:
        pass

    def end_trace(
        self,
        trace_id: Optional[str] = None,
        trace_map: Optional[Dict[str, List[str]]] = None,
    ) -> None:
        pass

    @staticmethod
    def _map_event_type(event_type: CBEventType) -> Optional[str]:
        mapping = {
            CBEventType.EMBEDDING: "embed",
            CBEventType.RETRIEVE: "retrieve",
            CBEventType.RERANKING: "rerank",
            CBEventType.LLM: "generate",
        }
        return mapping.get(event_type)
