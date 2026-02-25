import pytest
import duckdb
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture
def test_db(monkeypatch):
    """In-memory DuckDB for tests — does not touch the real file."""
    import database

    test_conn = duckdb.connect(":memory:")
    monkeypatch.setattr(database, "_db", test_conn)

    # Monkeypatch init_db / close_db so the lifespan uses the in-memory db
    def _test_init():
        database._db = test_conn
        database._create_tables()

    def _test_close():
        pass  # keep connection open for the duration of the test

    monkeypatch.setattr(database, "init_db", _test_init)
    monkeypatch.setattr(database, "close_db", _test_close)

    database._create_tables()
    yield test_conn
    test_conn.close()


@pytest.fixture
def client(test_db):
    from main import app

    with TestClient(app) as c:
        yield c
