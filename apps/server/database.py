import asyncio
import duckdb
import json
from pathlib import Path

DB_PATH = Path("data/rag_traces.duckdb")
_db: duckdb.DuckDBPyConnection | None = None
_write_lock = asyncio.Lock()


def init_db() -> None:
    global _db
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    _db = duckdb.connect(str(DB_PATH))
    _create_tables()


def close_db() -> None:
    if _db:
        _db.close()


def get_db() -> duckdb.DuckDBPyConnection:
    if _db is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _db


def _create_tables() -> None:
    _db.execute("""
        CREATE TABLE IF NOT EXISTS rag_events (
            id VARCHAR PRIMARY KEY,
            trace_id VARCHAR NOT NULL,
            query_id VARCHAR NOT NULL,
            stage VARCHAR NOT NULL,
            ts_start DOUBLE NOT NULL,
            duration_ms DOUBLE,
            query_text TEXT,
            query_vector FLOAT[],
            chunks JSON,
            generated_answer TEXT,
            grounding_scores JSON,
            error TEXT,
            metadata JSON DEFAULT '{}',
            created_at TIMESTAMP DEFAULT current_timestamp
        )
    """)
    _db.execute("""
        CREATE TABLE IF NOT EXISTS query_sessions (
            query_id VARCHAR PRIMARY KEY,
            trace_id VARCHAR NOT NULL,
            query_text TEXT,
            total_duration_ms DOUBLE,
            chunk_count INTEGER,
            final_answer TEXT,
            overall_grounding_score FLOAT,
            stage_count INTEGER DEFAULT 0,
            has_error BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT current_timestamp
        )
    """)
    _db.execute("""
        CREATE INDEX IF NOT EXISTS idx_events_trace ON rag_events(trace_id)
    """)
    _db.execute("""
        CREATE INDEX IF NOT EXISTS idx_sessions_created ON query_sessions(created_at)
    """)


# ---------------------------------------------------------------------------
# Write helpers — ALL use _write_lock
# ---------------------------------------------------------------------------

async def insert_event(event: dict) -> None:
    async with _write_lock:
        db = get_db()
        db.execute("""
            INSERT OR REPLACE INTO rag_events
            (id, trace_id, query_id, stage, ts_start, duration_ms,
             query_text, query_vector, chunks, generated_answer,
             grounding_scores, error, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            event.get("id"), event.get("trace_id"), event.get("query_id"),
            event.get("stage"), event.get("ts_start"), event.get("duration_ms"),
            event.get("query_text"), event.get("query_vector"),
            json.dumps(event.get("chunks")),
            event.get("generated_answer"),
            json.dumps(event.get("grounding_scores")),
            event.get("error"),
            json.dumps(event.get("metadata", {}))
        ])


async def upsert_session(session: dict) -> None:
    async with _write_lock:
        db = get_db()
        db.execute("""
            INSERT OR REPLACE INTO query_sessions
            (query_id, trace_id, query_text, total_duration_ms, chunk_count,
             final_answer, overall_grounding_score, stage_count, has_error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            session.get("query_id"), session.get("trace_id"),
            session.get("query_text"), session.get("total_duration_ms"),
            session.get("chunk_count"), session.get("final_answer"),
            session.get("overall_grounding_score"), session.get("stage_count"),
            session.get("has_error", False)
        ])


async def update_grounding_scores(event_id: str, scores: list[dict]) -> None:
    """Update grounding scores for an event. Public API for events router."""
    async with _write_lock:
        get_db().execute(
            "UPDATE rag_events SET grounding_scores = ? WHERE id = ?",
            [json.dumps(scores), event_id]
        )


async def update_session_grounding(trace_id: str, score: float) -> None:
    """Update overall_grounding_score for a session by trace_id."""
    async with _write_lock:
        get_db().execute(
            "UPDATE query_sessions SET overall_grounding_score = ? WHERE trace_id = ?",
            [score, trace_id]
        )


async def delete_trace(trace_id: str) -> int:
    """Deletes all events and the session for a trace. Returns 1 on success."""
    async with _write_lock:
        db = get_db()
        db.execute("DELETE FROM rag_events WHERE trace_id = ?", [trace_id])
        db.execute("DELETE FROM query_sessions WHERE trace_id = ?", [trace_id])
        return 1


async def cleanup_old_traces(retention_days: int) -> dict:
    """Delete traces older than retention_days. Returns summary."""
    async with _write_lock:
        db = get_db()
        db.execute("""
            DELETE FROM rag_events
            WHERE created_at < current_timestamp - (CAST(? AS INTEGER) * INTERVAL '1 day')
        """, [retention_days])
        db.execute("""
            DELETE FROM query_sessions
            WHERE created_at < current_timestamp - (CAST(? AS INTEGER) * INTERVAL '1 day')
        """, [retention_days])
    return {"retention_days": retention_days}


# ---------------------------------------------------------------------------
# Read helpers — no lock needed
# ---------------------------------------------------------------------------

def _rows_to_dicts(cursor) -> list[dict]:
    """Convert DuckDB cursor results to list of dicts without pandas."""
    if cursor.description is None:
        return []
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    return [dict(zip(columns, row)) for row in rows]


def get_traces(
    limit: int = 50,
    offset: int = 0,
    has_error: bool | None = None,
    min_grounding: float | None = None,
) -> list[dict]:
    db = get_db()
    conditions: list[str] = []
    params: list = []
    if has_error is not None:
        conditions.append("has_error = ?")
        params.append(has_error)
    if min_grounding is not None:
        conditions.append("overall_grounding_score >= ?")
        params.append(min_grounding)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    cursor = db.execute(f"""
        SELECT * FROM query_sessions {where}
        ORDER BY created_at DESC LIMIT ? OFFSET ?
    """, params + [limit, offset])
    return _rows_to_dicts(cursor)


def get_trace_events(trace_id: str) -> list[dict]:
    db = get_db()
    cursor = db.execute("""
        SELECT * FROM rag_events WHERE trace_id = ? ORDER BY ts_start
    """, [trace_id])
    return _rows_to_dicts(cursor)
