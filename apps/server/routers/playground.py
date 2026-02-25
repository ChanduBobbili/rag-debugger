from fastapi import APIRouter
from pydantic import BaseModel
import uuid

router = APIRouter()


class PlaygroundConfig(BaseModel):
    query: str
    k: int = 10
    chunk_size: int = 512
    embedding_model: str = "text-embedding-3-small"


class CompareConfig(BaseModel):
    query: str
    config_a: PlaygroundConfig
    config_b: PlaygroundConfig


@router.post("/playground/query")
async def run_playground_query(config: PlaygroundConfig) -> dict:
    """
    Runs a test query. The connected RAG pipeline (instrumented with SDK)
    executes the query and streams events back via WebSocket.
    This endpoint returns a trace_id the client subscribes to.
    """
    trace_id = f"playground-{uuid.uuid4()}"
    return {
        "trace_id": trace_id,
        "ws_url": f"/ws/{trace_id}",
        "message": "Subscribe to ws_url to receive live events as your RAG pipeline executes",
    }


@router.post("/playground/compare")
async def compare_configs(config: CompareConfig) -> dict:
    return {
        "trace_id_a": f"playground-a-{uuid.uuid4()}",
        "trace_id_b": f"playground-b-{uuid.uuid4()}",
        "message": "Run your RAG pipeline twice with different configs, using each trace_id",
    }
