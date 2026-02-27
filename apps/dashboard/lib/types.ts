export type RAGStage = "embed" | "retrieve" | "rerank" | "generate" | "session_complete"

export interface ChunkScore {
  chunk_id: string
  text: string
  cosine_score: number
  rerank_score: number | null
  final_rank: number
  metadata: Record<string, unknown>
}

export interface GroundingResult {
  sentence: string
  grounded: boolean
  score: number
  source_chunk_id: string | null
}

export interface RAGEvent {
  id: string
  trace_id: string
  query_id: string
  stage: RAGStage
  ts_start: number
  duration_ms: number | null
  query_text: string | null
  query_vector: number[] | null
  chunks: ChunkScore[] | null
  generated_answer: string | null
  grounding_scores: GroundingResult[] | null
  error: string | null
  metadata: Record<string, unknown>
}

export interface QuerySession {
  query_id: string
  trace_id: string
  query_text: string | null
  total_duration_ms: number | null
  chunk_count: number | null
  final_answer: string | null
  overall_grounding_score: number | null
  has_error: boolean
  stage_count: number
  created_at: string
}

export interface AnalyticsSummary {
  total: number
  avg_grounding: number | null
  avg_latency: number | null
  failure_rate: number
}

export interface DailyMetric {
  date: string
  total_queries: number
  avg_grounding: number | null
  avg_latency_ms: number | null
  error_count: number
}

export interface WorstQuery {
  query_text: string | null
  overall_grounding_score: number | null
  total_duration_ms: number | null
  trace_id: string
}

export interface AnalyticsResponse {
  daily: DailyMetric[]
  summary: AnalyticsSummary
  worst_queries: WorstQuery[]
}

export interface TraceDetailResponse {
  trace_id: string
  events: RAGEvent[]
  not_found?: boolean
}

export interface ChunkStageData {
  stage: string
  chunks: ChunkScore[]
}

export interface EmbeddingData {
  available: boolean
  query_vector?: number[]
  chunks?: ChunkScore[]
}

export interface GroundingData {
  available: boolean
  answer?: string
  grounding?: GroundingResult[]
}
