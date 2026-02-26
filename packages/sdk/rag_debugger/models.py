from pydantic import BaseModel, Field
from typing import Literal
import uuid


class ChunkScore(BaseModel):
    chunk_id: str
    text: str
    cosine_score: float
    rerank_score: float | None = None
    final_rank: int
    metadata: dict = Field(default_factory=dict)


class RAGEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str
    query_id: str
    stage: Literal["embed", "retrieve", "rerank", "generate", "session_complete"]
    ts_start: float
    duration_ms: float | None = None
    query_text: str | None = None
    query_vector: list[float] | None = None
    chunks: list[ChunkScore] | None = None
    generated_answer: str | None = None
    error: str | None = None
    metadata: dict = Field(default_factory=dict)
