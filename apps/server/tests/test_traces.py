def test_get_traces_empty(client):
    resp = client.get("/traces")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_trace_not_found(client):
    resp = client.get("/traces/nonexistent-id")
    assert resp.status_code == 200
    data = resp.json()
    assert data["not_found"] is True


def test_get_trace_with_events(client):
    # Insert an event first
    client.post(
        "/events",
        json={
            "trace_id": "tr-test",
            "query_id": "q-test",
            "stage": "embed",
            "ts_start": 1700000000.0,
            "duration_ms": 10.0,
            "query_text": "hello world",
        },
    )

    resp = client.get("/traces/tr-test")
    assert resp.status_code == 200
    data = resp.json()
    assert data["trace_id"] == "tr-test"
    assert len(data["events"]) == 1
    assert data["events"][0]["stage"] == "embed"


def test_get_chunks_empty(client):
    resp = client.get("/traces/nonexistent/chunks")
    assert resp.status_code == 200
    assert resp.json() == []


def test_get_grounding_unavailable(client):
    resp = client.get("/traces/nonexistent/grounding")
    assert resp.status_code == 200
    assert resp.json()["available"] is False


def test_get_embeddings_unavailable(client):
    resp = client.get("/traces/nonexistent/embeddings")
    assert resp.status_code == 200
    assert resp.json()["available"] is False


def test_analytics_metrics(client):
    resp = client.get("/analytics/metrics?days=7")
    assert resp.status_code == 200
    data = resp.json()
    assert "daily" in data
    assert "summary" in data
    assert "worst_queries" in data
