import type {
  QuerySession,
  TraceDetailResponse,
  ChunkStageData,
  EmbeddingData,
  GroundingData,
  AnalyticsResponse,
} from "./types"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7777"

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, { ...options, signal: controller.signal })
        if (!res.ok && i < retries - 1) continue
        return res
      } catch (e) {
        if (i === retries - 1) throw e
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)))
      }
    }
    throw new Error("Max retries exceeded")
  } finally {
    clearTimeout(timeout)
  }
}

export const api = {
  traces: {
    list: async (params?: {
      limit?: number
      offset?: number
      has_error?: boolean
      min_grounding?: number
    }): Promise<QuerySession[]> => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      )
      const res = await fetchWithRetry(`${BASE}/traces?${qs}`)
      return res.json()
    },
    get: async (traceId: string): Promise<TraceDetailResponse> => {
      const res = await fetchWithRetry(`${BASE}/traces/${traceId}`)
      return res.json()
    },
    chunks: async (traceId: string): Promise<ChunkStageData[]> => {
      const res = await fetchWithRetry(`${BASE}/traces/${traceId}/chunks`)
      return res.json()
    },
    embeddings: async (traceId: string): Promise<EmbeddingData> => {
      const res = await fetchWithRetry(`${BASE}/traces/${traceId}/embeddings`)
      return res.json()
    },
    grounding: async (traceId: string): Promise<GroundingData> => {
      const res = await fetchWithRetry(`${BASE}/traces/${traceId}/grounding`)
      return res.json()
    },
  },
  analytics: {
    metrics: async (days = 7): Promise<AnalyticsResponse> => {
      const res = await fetchWithRetry(
        `${BASE}/analytics/metrics?days=${days}`,
      )
      return res.json()
    },
  },
  health: async (): Promise<{ status: string; db: string }> => {
    const res = await fetchWithRetry(`${BASE}/health`)
    return res.json()
  },
}
