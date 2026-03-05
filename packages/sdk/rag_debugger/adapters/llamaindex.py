"""LlamaIndex observer adapter for RAG Debugger SDK."""

try:
    from llama_index.core.callbacks import CallbackManager, CBEventType, LlamaDebugHandler
    from llama_index.core.callbacks.base_handler import BaseCallbackHandler
except ImportError:
    raise ImportError(
        "LlamaIndex adapter requires llama-index-core. "
        "Install with: pip install rag-debugger[llamaindex]"
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
        self._stages: list[dict] = []
        self._query_text: str = ""
        self._query_start: float = 0.0
        self._trace_id: str = ""
        self._query_id: str = ""

    def on_event_start(
        self,
        event_type: CBEventType,
        payload: Optional[Dict[str, Any]] = None,
        event_id: str = "",
        **kwargs,
    ) -> str:
        self._event_starts[event_id] = time.time()
        if event_type == CBEventType.QUERY:
            self._query_start = time.time()
            self._trace_id = get_or_create_trace_id()
            self._query_id = get_or_create_query_id()
            if payload and "query_str" in payload:
                self._query_text = str(payload["query_str"])[:500]
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

        # Emit stage event for known stages
        if stage is not None:
            event = {
                "id": str(uuid.uuid4()),
                "trace_id": self._trace_id or get_or_create_trace_id(),
                "query_id": self._query_id or get_or_create_query_id(),
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

            self._schedule(emit(event))
            self._stages.append({"stage": stage, "duration_ms": duration})

        # Emit session_complete when the top-level QUERY event closes
        if event_type == CBEventType.QUERY:
            total_ms = sum(s["duration_ms"] for s in self._stages)
            answer = str(payload.get("response", "")) if payload else ""
            self._schedule(emit({
                "id": str(uuid.uuid4()),
                "trace_id": self._trace_id or get_or_create_trace_id(),
                "query_id": self._query_id or get_or_create_query_id(),
                "stage": "session_complete",
                "ts_start": time.time(),
                "duration_ms": total_ms,
                "query_text": self._query_text,
                "generated_answer": answer or None,
                "metadata": {
                    "stage_count": len(self._stages),
                    "has_error": False,
                },
            }))
            self._stages = []

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

    @staticmethod
    def _schedule(coro) -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(coro)
        except RuntimeError:
            pass  # No running loop — event silently dropped
