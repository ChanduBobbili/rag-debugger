def test_delete_all_traces(client):
    # Insert some data
    client.post("/events", json={
        "trace_id": "del-trace-1", "query_id": "del-q-1",
        "stage": "embed", "ts_start": 1700000000.0,
    })
    # Delete all
    resp = client.delete("/traces")
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    # Verify empty
    traces = client.get("/traces").json()
    assert traces == []


def test_delete_by_date(client):
    resp = client.delete("/traces/by-date?before=2099-01-01T00:00:00Z")
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_delete_by_date_invalid_format(client):
    resp = client.delete("/traces/by-date?before=not-a-date")
    assert resp.status_code == 400
