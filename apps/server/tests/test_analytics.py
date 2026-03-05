def test_analytics_returns_shape(client):
    resp = client.get("/analytics/metrics?days=7")
    assert resp.status_code == 200
    data = resp.json()
    assert "daily" in data
    assert "summary" in data
    assert "worst_queries" in data
    assert isinstance(data["daily"], list)
    assert isinstance(data["worst_queries"], list)


def test_analytics_30_days(client):
    resp = client.get("/analytics/metrics?days=30")
    assert resp.status_code == 200


def test_analytics_rejects_invalid_days(client):
    resp = client.get("/analytics/metrics?days=0")
    assert resp.status_code == 422
    resp = client.get("/analytics/metrics?days=91")
    assert resp.status_code == 422


def test_error_trace_appears_in_worst_queries(client):
    # Insert an error session_complete
    client.post("/events", json={
        "trace_id": "err-trace-1",
        "query_id": "err-q-1",
        "stage": "session_complete",
        "ts_start": 1700000000.0,
        "duration_ms": 100.0,
        "query_text": "error query",
        "error": "Simulated failure",
        "metadata": {"stage_count": 2, "has_error": True},
    })
    resp = client.get("/analytics/metrics?days=30")
    worst = resp.json()["worst_queries"]
    trace_ids = [q.get("trace_id") for q in worst]
    assert "err-trace-1" in trace_ids


def test_health_includes_grounding_threshold(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "grounding_threshold" in data
    assert isinstance(data["grounding_threshold"], float)
