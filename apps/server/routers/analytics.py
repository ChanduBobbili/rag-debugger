from fastapi import APIRouter, Query
from datetime import datetime, timedelta, timezone
import database

router = APIRouter()


@router.get("/analytics/metrics")
async def get_metrics(days: int = Query(7, ge=1, le=90)) -> dict:
    db = database.get_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    daily_cursor = db.execute("""
        SELECT
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as total_queries,
            AVG(overall_grounding_score) as avg_grounding,
            AVG(total_duration_ms) as avg_latency_ms,
            SUM(CASE WHEN has_error THEN 1 ELSE 0 END) as error_count
        FROM query_sessions
        WHERE created_at >= ?
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
    """, [cutoff])
    daily_stats = database._rows_to_dicts(daily_cursor)

    summary = db.execute("""
        SELECT
            COUNT(*) as total,
            AVG(overall_grounding_score) as avg_grounding,
            AVG(total_duration_ms) as avg_latency,
            SUM(CASE WHEN has_error THEN 1 ELSE 0 END) * 100.0 / GREATEST(COUNT(*), 1) as failure_rate
        FROM query_sessions
        WHERE created_at >= ?
    """, [cutoff]).fetchone()

    worst_cursor = db.execute("""
        SELECT query_text, overall_grounding_score, total_duration_ms, trace_id,
               has_error
        FROM query_sessions
        WHERE overall_grounding_score IS NOT NULL OR has_error = true
        ORDER BY
            has_error DESC,
            overall_grounding_score ASC NULLS FIRST
        LIMIT 10
    """)
    worst = database._rows_to_dicts(worst_cursor)

    return {
        "daily": daily_stats,
        "summary": {
            "total": summary[0] if summary else 0,
            "avg_grounding": summary[1] if summary else None,
            "avg_latency": summary[2] if summary else None,
            "failure_rate": summary[3] if summary else 0,
        },
        "worst_queries": worst,
    }


@router.get("/analytics/chunk-score-distribution")
async def chunk_distribution() -> list[dict]:
    db = database.get_db()
    cursor = db.execute("""
        WITH chunk_data AS (
            SELECT json_extract(chunks, '$[' || i.idx || '].cosine_score') as score
            FROM rag_events,
            UNNEST(range(json_array_length(chunks))) AS i(idx)
            WHERE chunks IS NOT NULL AND chunks != 'null'
        )
        SELECT
            ROUND(score::FLOAT * 10) / 10 as score_bucket,
            COUNT(*) as count
        FROM chunk_data
        WHERE score IS NOT NULL
        GROUP BY score_bucket
        ORDER BY score_bucket
    """)
    return database._rows_to_dicts(cursor)
