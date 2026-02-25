"use client"
import { useEffect, useState, useCallback } from "react"
import type { AnalyticsResponse } from "@/lib/types"
import { api } from "@/lib/api"

export function useRAGMetrics(days = 7) {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.analytics.metrics(days)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch metrics")
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return { data, loading, error, refetch: fetchMetrics }
}
