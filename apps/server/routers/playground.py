from fastapi import APIRouter
from pydantic import BaseModel
import os
import uuid

router = APIRouter()

PLAYGROUND_ENABLE_TEST_PIPELINE = os.environ.get("PLAYGROUND_ENABLE_TEST_PIPELINE", "").lower() in ("1", "true", "yes")


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

    message: str
    if PLAYGROUND_ENABLE_TEST_PIPELINE:
        import subprocess, sys
        subprocess.Popen(
            [sys.executable, "apps/test-app/main.py", "--trace-id", trace_id, "--query", config.query],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        message = "Pipeline started. Events will stream via WebSocket."
    else:
        message = (
            f"Run your pipeline with this trace_id:\n"
            f"  python apps/test-app/main.py --trace-id {trace_id} --query \"{config.query}\""
        )

    return {
        "trace_id": trace_id,
        "ws_url": f"/ws/{trace_id}",
        "test_pipeline_enabled": PLAYGROUND_ENABLE_TEST_PIPELINE,
        "message": message,
    }


@router.post("/playground/compare")
async def compare_configs(config: CompareConfig) -> dict:
    trace_id_a = f"playground-a-{uuid.uuid4()}"
    trace_id_b = f"playground-b-{uuid.uuid4()}"

    if PLAYGROUND_ENABLE_TEST_PIPELINE:
        import subprocess, sys
        subprocess.Popen(
            [sys.executable, "apps/test-app/main.py", "--trace-id", trace_id_a, "--query", config.query],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        subprocess.Popen(
            [sys.executable, "apps/test-app/main.py", "--trace-id", trace_id_b, "--query", config.query],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    return {
        "trace_id_a": trace_id_a,
        "trace_id_b": trace_id_b,
        "test_pipeline_enabled": PLAYGROUND_ENABLE_TEST_PIPELINE,
        "message": "Run your RAG pipeline twice with different configs, using each trace_id",
    }
