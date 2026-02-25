"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { QuerySession } from "@/lib/types"
import TraceList from "@/components/TraceList"

export default function TracesPage() {
  const [traces, setTraces] = useState<QuerySession[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    hasError: undefined as boolean | undefined,
    minGrounding: undefined as number | undefined,
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await api.traces.list({
          limit: 100,
          has_error: filters.hasError,
          min_grounding: filters.minGrounding,
        })
        setTraces(data)
      } catch (e) {
        console.error("Failed to load traces:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filters])

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Traces
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Browse all query traces from your RAG pipeline
        </p>
      </div>

      {/* Filters */}
      <div
        className="flex gap-4 items-center p-4 rounded-lg border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.hasError === true}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                hasError: e.target.checked ? true : undefined,
              }))
            }
            className="rounded"
          />
          <span style={{ color: "var(--muted)" }}>Errors only</span>
        </label>

        <div className="flex items-center gap-2 text-sm">
          <span style={{ color: "var(--muted)" }}>Min grounding:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={filters.minGrounding ?? 0}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                minGrounding:
                  Number(e.target.value) > 0
                    ? Number(e.target.value)
                    : undefined,
              }))
            }
            className="w-32"
          />
          <span className="text-xs font-mono" style={{ color: "var(--rag)" }}>
            {filters.minGrounding?.toFixed(2) ?? "any"}
          </span>
        </div>

        <button
          onClick={() =>
            setFilters({ hasError: undefined, minGrounding: undefined })
          }
          className="text-xs px-3 py-1 rounded transition-colors"
          style={{ background: "var(--surface2)", color: "var(--muted)" }}
        >
          Reset
        </button>
      </div>

      <TraceList traces={traces} loading={loading} />
    </div>
  )
}
