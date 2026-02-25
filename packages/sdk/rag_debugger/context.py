from contextvars import ContextVar
import uuid

_trace_id: ContextVar[str] = ContextVar("rag_trace_id", default="")
_query_id: ContextVar[str] = ContextVar("rag_query_id", default="")


def get_or_create_trace_id() -> str:
    tid = _trace_id.get()
    if not tid:
        tid = str(uuid.uuid4())
        _trace_id.set(tid)
    return tid


def get_or_create_query_id() -> str:
    qid = _query_id.get()
    if not qid:
        qid = str(uuid.uuid4())
        _query_id.set(qid)
    return qid


def set_trace_id(tid: str) -> None:
    _trace_id.set(tid)


def set_query_id(qid: str) -> None:
    _query_id.set(qid)


def reset_context() -> None:
    _trace_id.set("")
    _query_id.set("")
