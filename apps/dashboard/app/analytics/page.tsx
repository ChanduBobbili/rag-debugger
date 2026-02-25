"use client"
import { useRAGMetrics } from "@/hooks/useRAGMetrics"
import { MetricsLineChart, MetricsBarChart } from "@/components/MetricsChart"

interface StatCardProps { label: string; value: string; accent: string; delta?: string; up?: boolean }

function StatCard({ label, value, accent, delta, up }: StatCardProps) {
  return (
    <div className="stat-card" style={{ "--accent": accent } as React.CSSProperties}>
      <div style={{
        position: "absolute", top: -20, right: -20, width: 70, height: 70,
        borderRadius: "50%", background: accent, opacity: 0.04, filter: "blur(16px)", pointerEvents: "none",
      }} />
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: accent, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {delta && <div style={{ fontSize: 10, color: up ? "var(--teal)" : "var(--red)", fontFamily: "'JetBrains Mono', monospace" }}>{up ? "↑" : "↓"} {delta}</div>}
    </div>
  )
}

export default function AnalyticsPage() {
  const { data, loading, error } = useRAGMetrics(7)
  const s = data?.summary

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="skeleton" style={{ height: 32, width: 200 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
      </div>
      <div className="skeleton" style={{ height: 260 }} />
    </div>
  )

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px" }}>
      <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 6 }}>Failed to load analytics</div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{error}</div>
    </div>
  )

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>Analytics</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>Pipeline performance · Last 7 days</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["7d","30d","90d"].map((d, i) => (
            <button key={d} className={`chip${i===0?" active":""}`}>{d}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Queries" value={String(s?.total ?? 0)} accent="var(--rag)" delta="23% vs prev week" up />
        <StatCard label="Avg Grounding" value={s?.avg_grounding ? `${(s.avg_grounding * 100).toFixed(0)}%` : "—"} accent="var(--teal)" delta="5.1% improvement" up />
        <StatCard label="Avg Latency" value={s?.avg_latency ? `${s.avg_latency.toFixed(0)}ms` : "—"} accent="var(--purple)" delta="34ms faster" up />
        <StatCard label="Failure Rate" value={`${(s?.failure_rate ?? 0).toFixed(1)}%`} accent={(s?.failure_rate ?? 0) > 10 ? "var(--red)" : "var(--gold)"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Grounding Score Trend</span></div>
          <div style={{ padding: "16px 18px" }}>
            <MetricsLineChart data={data?.daily ?? []} dataKey="avg_grounding" color="var(--teal)" label="Avg Grounding" />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Query Volume</span></div>
          <div style={{ padding: "16px 18px" }}>
            <MetricsLineChart data={data?.daily ?? []} dataKey="total_queries" color="var(--rag)" label="Queries" />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Avg Latency (ms)</span></div>
          <div style={{ padding: "16px 18px" }}>
            <MetricsLineChart data={data?.daily ?? []} dataKey="avg_latency_ms" color="var(--purple)" label="Latency ms" />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Error Count</span></div>
          <div style={{ padding: "16px 18px" }}>
            <MetricsBarChart data={data?.daily ?? []} xKey="date" yKey="error_count" color="var(--red)" />
          </div>
        </div>
      </div>

      {data?.worst_queries && data.worst_queries.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Lowest Grounding — Improvement Candidates</span>
            <span style={{ fontSize: 10, color: "var(--muted)", cursor: "pointer" }}>Export</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg2)" }}>
                {["#","Query","Grounding","Latency",""].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.worst_queries.map((q, i) => (
                <tr key={i}
                  style={{ cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.01)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,30,50,0.7)", fontSize: 11, color: "var(--muted)" }}>{i+1}</td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,30,50,0.7)", maxWidth: 320 }}>
                    <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.query_text || "—"}</div>
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,30,50,0.7)" }}>
                    <span className="score-low" style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                      {q.overall_grounding_score?.toFixed(2) ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,30,50,0.7)", fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                    {q.total_duration_ms?.toFixed(0) ?? "—"}ms
                  </td>
                  <td style={{ padding: "10px 14px", borderBottom: "1px solid rgba(30,30,50,0.7)" }}>
                    <a href={`/traces/${q.trace_id}`} style={{ fontSize: 11, color: "var(--rag)", textDecoration: "none" }}>Inspect →</a>
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
