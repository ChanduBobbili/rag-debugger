from pydantic import BaseModel, Field
from typing import Literal
import uuid


class ChunkScore(BaseModel):
    chunk_id: str
    text: str
    cosine_score: float
    rerank_score: float | None = None
    final_rank: int
    metadata: dict = {}


class GroundingResult(BaseModel):
    sentence: str
    grounded: bool
    score: float
    source_chunk_id: str | None = None


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
    grounding_scores: list[GroundingResult] | None = None
    error: str | None = None
    metadata: dict = {}


class SessionCompletePayload(BaseModel):
    query_id: str
    trace_id: str
    query_text: str | None = None
    total_duration_ms: float
    chunk_count: int
    final_answer: str | None = None
    overall_grounding_score: float | None = None
    stage_count: int
    has_error: bool = False


class EventIngestResponse(BaseModel):
    ok: bool
    trace_id: str
    event_id: str
