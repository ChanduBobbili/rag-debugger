def test_ingest_event(client):
    resp = client.post(
        "/events",
        json={
            "trace_id": "tr-1",
            "query_id": "q-1",
            "stage": "embed",
            "ts_start": 1700000000.0,
            "duration_ms": 42.5,
            "query_text": "test query",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["trace_id"] == "tr-1"


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_invalid_stage_rejected(client):
    resp = client.post(
        "/events",
        json={
            "trace_id": "tr-1",
            "query_id": "q-1",
            "stage": "invalid_stage",
            "ts_start": 1700000000.0,
        },
    )
    assert resp.status_code == 422


def test_session_complete_event(client):
    resp = client.post(
        "/events",
        json={
            "trace_id": "tr-2",
            "query_id": "q-2",
            "stage": "session_complete",
            "ts_start": 1700000001.0,
            "duration_ms": 200.0,
            "query_text": "test session",
            "generated_answer": "Test answer",
            "metadata": {
                "stage_count": 4,
                "chunk_count": 5,
                "has_error": False,
            },
        },
    )
    assert resp.status_code == 200
    assert resp.json()["ok"] is True

    # Verify session was created
    traces = client.get("/traces").json()
    assert len(traces) >= 1
