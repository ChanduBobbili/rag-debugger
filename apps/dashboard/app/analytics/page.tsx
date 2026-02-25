"use client"
import { useRAGMetrics } from "@/hooks/useRAGMetrics"
import { MetricsLineChart, MetricsBarChart } from "@/components/MetricsChart"

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="text-xl font-mono font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { data, loading, error } = useRAGMetrics(7)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
        <div className="skeleton h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-red-400 text-sm">Failed to load analytics</div>
        <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          {error}
        </div>
      </div>
    )
  }

  const summary = data?.summary

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Analytics
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          RAG pipeline performance metrics over the last 7 days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Queries"
          value={String(summary?.total ?? 0)}
          color="var(--rag)"
        />
        <StatCard
          label="Avg Grounding Score"
          value={
            summary?.avg_grounding
              ? `${(summary.avg_grounding * 100).toFixed(0)}%`
              : "—"
          }
          color="var(--agent)"
        />
        <StatCard
          label="Avg Latency"
          value={
            summary?.avg_latency
              ? `${summary.avg_latency.toFixed(0)}ms`
              : "—"
          }
          color="var(--trace)"
        />
        <StatCard
          label="Failure Rate"
          value={`${(summary?.failure_rate ?? 0).toFixed(1)}%`}
          color={
            (summary?.failure_rate ?? 0) > 10 ? "#ef4444" : "var(--agent)"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: "var(--muted)" }}
          >
            Grounding Score Trend
          </h3>
          <MetricsLineChart
            data={data?.daily ?? []}
            dataKey="avg_grounding"
            color="#00d4aa"
            label="Avg Grounding"
          />
        </div>

        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: "var(--muted)" }}
          >
            Query Volume
          </h3>
          <MetricsLineChart
            data={data?.daily ?? []}
            dataKey="total_queries"
            color="#ff6b35"
            label="Queries"
          />
        </div>

        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: "var(--muted)" }}
          >
            Avg Latency Trend
          </h3>
          <MetricsLineChart
            data={data?.daily ?? []}
            dataKey="avg_latency_ms"
            color="#a78bfa"
            label="Latency (ms)"
          />
        </div>

        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: "var(--muted)" }}
          >
            Error Count
          </h3>
          <MetricsBarChart
            data={data?.daily ?? []}
            xKey="date"
            yKey="error_count"
            color="#ef4444"
          />
        </div>
      </div>

      {/* Worst Queries Table */}
      {data?.worst_queries && data.worst_queries.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: "var(--muted)" }}
          >
            Lowest Grounding Scores (Improvement Candidates)
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th
                  className="text-left px-3 py-2 text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Query
                </th>
                <th
                  className="text-left px-3 py-2 text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Grounding
                </th>
                <th
                  className="text-left px-3 py-2 text-xs"
                  style={{ color: "var(--muted)" }}
                >
                  Latency
                </th>
              </tr>
            </thead>
            <tbody>
              {data.worst_queries.map((q, i) => (
                <tr
                  key={i}
                  className="border-t"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-3 py-2 max-w-xs truncate">
                    {q.query_text || "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "#ff6b35" }}>
                    {q.overall_grounding_score?.toFixed(3) ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs" style={{ color: "var(--muted)" }}>
                    {q.total_duration_ms?.toFixed(0) ?? "—"}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
