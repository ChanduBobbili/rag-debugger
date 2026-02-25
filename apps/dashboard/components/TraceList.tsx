"use client"
import Link from "next/link"
import type { QuerySession } from "@/lib/types"
import { format } from "date-fns"

interface Props {
  traces: QuerySession[]
  loading?: boolean
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--surface2)", color: "var(--muted)" }}>
        —
      </span>
    )
  }
  const color =
    score >= 0.8 ? "#00d4aa" : score >= 0.5 ? "#f0c040" : "#ff6b35"
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded"
      style={{ background: `${color}15`, color }}
    >
      {score.toFixed(2)}
    </span>
  )
}

function StatusDot({ hasError }: { hasError: boolean }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: hasError ? "#ef4444" : "#00d4aa" }}
    />
  )
}

export default function TraceList({ traces, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-full" />
        ))}
      </div>
    )
  }

  if (!traces.length) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center rounded-lg border"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="text-3xl mb-3">◎</div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          No traces recorded yet
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          Instrument your RAG pipeline with the SDK to start seeing traces here
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--surface)" }}>
            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--muted)" }}>
              Status
            </th>
            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--muted)" }}>
              Query
            </th>
            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--muted)" }}>
              Grounding
            </th>
            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--muted)" }}>
              Latency
            </th>
            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--muted)" }}>
              Stages
            </th>
            <th className="text-left px-4 py-3 font-medium text-xs" style={{ color: "var(--muted)" }}>
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {traces.map((trace) => (
            <Link
              key={trace.query_id}
              href={`/traces/${trace.trace_id}`}
              className="contents"
            >
              <tr
                className="cursor-pointer transition-colors hover:bg-white/[0.02] border-t"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="px-4 py-3">
                  <StatusDot hasError={trace.has_error} />
                </td>
                <td className="px-4 py-3 max-w-xs truncate" style={{ color: "var(--text)" }}>
                  {trace.query_text || "—"}
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={trace.overall_grounding_score} />
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>
                  {trace.total_duration_ms
                    ? `${trace.total_duration_ms.toFixed(0)}ms`
                    : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>
                  {trace.stage_count ?? 0}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                  {trace.created_at
                    ? format(new Date(trace.created_at), "MMM d, HH:mm")
                    : "—"}
                </td>
              </tr>
            </Link>
          ))}
        </tbody>
      </table>
    </div>
  )
}
