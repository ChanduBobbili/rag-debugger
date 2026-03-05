from rag_debugger import new_trace
from rag_debugger.context import _trace_id, _query_id


def test_new_trace_sets_context():
    with new_trace(trace_id="test-123", query_id="q-456"):
        assert _trace_id.get() == "test-123"
        assert _query_id.get() == "q-456"


def test_new_trace_resets_on_exit():
    outer_tid = _trace_id.get()
    with new_trace(trace_id="inner-trace"):
        assert _trace_id.get() == "inner-trace"
    assert _trace_id.get() == outer_tid


def test_new_trace_resets_on_exception():
    outer_tid = _trace_id.get()
    try:
        with new_trace(trace_id="error-trace"):
            raise ValueError("test error")
    except ValueError:
        pass
    assert _trace_id.get() == outer_tid


def test_nested_traces_restore_correctly():
    with new_trace(trace_id="outer"):
        assert _trace_id.get() == "outer"
        with new_trace(trace_id="inner"):
            assert _trace_id.get() == "inner"
        assert _trace_id.get() == "outer"
    assert _trace_id.get() == ""
