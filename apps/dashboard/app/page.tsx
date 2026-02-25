"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { QuerySession } from "@/lib/types"
import TraceList from "@/components/TraceList"
import { useTraceStream } from "@/hooks/useTraceStream"
import LiveQueryPanel from "@/components/LiveQueryPanel"

interface StatCardProps {
  label: string; value: string; delta?: string; deltaUp?: boolean; accent: string;
}

function StatCard({ label, value, delta, deltaUp, accent }: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <div style={{
        position: "absolute", top: -30, right: -30, width: 90, height: 90,
        borderRadius: "50%", background: accent, opacity: 0.04, filter: "blur(20px)",
        pointerEvents: "none",
      }} />
      <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, color: accent, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {delta && (
        <div style={{ fontSize: 10, color: deltaUp ? "var(--teal)" : "var(--red)", display: "flex", alignItems: "center", gap: 3, fontFamily: "'JetBrains Mono', monospace" }}>
          {deltaUp ? "↑" : "↓"} {delta}
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const [traces, setTraces] = useState<QuerySession[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, avgGrounding: 0, failureRate: 0, avgLatency: 0 })
  const { events, connected } = useTraceStream("__live__")

  useEffect(() => {
    async function load() {
      try {
        const [traceList, analytics] = await Promise.all([
          api.traces.list({ limit: 20 }),
          api.analytics.metrics(1).catch(() => null),
        ])
        setTraces(traceList)
        if (analytics?.summary) {
          setStats({
            total: analytics.summary.total,
            avgGrounding: analytics.summary.avg_grounding ?? 0,
            failureRate: analytics.summary.failure_rate ?? 0,
            avgLatency: analytics.summary.avg_latency ?? 0,
          })
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>Overview</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>Last 24 hours · Auto-refreshing</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Traces Today" value={loading ? "—" : String(stats.total)} delta="from yesterday" deltaUp accent="var(--rag)" />
        <StatCard label="Avg Grounding" value={loading ? "—" : stats.avgGrounding ? `${(stats.avgGrounding * 100).toFixed(0)}%` : "—"} delta="improvement" deltaUp accent="var(--teal)" />
        <StatCard label="Failure Rate" value={loading ? "—" : `${stats.failureRate?.toFixed(1)}%`} accent={stats.failureRate > 10 ? "var(--red)" : "var(--gold)"} />
        <StatCard label="Avg Latency" value={loading ? "—" : stats.avgLatency ? `${stats.avgLatency.toFixed(0)}ms` : "—"} accent="var(--purple)" />
      </div>

      {/* Main content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Recent Traces</div>
            <a href="/traces" style={{ fontSize: 11, color: "var(--rag)", textDecoration: "none" }}>View all →</a>
          </div>
          <TraceList traces={traces} loading={loading} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>Live Activity</div>
            <LiveQueryPanel events={events} connected={connected} />
          </div>

          {/* Quickstart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Quickstart</span>
              <span style={{ fontSize: 10, color: "var(--muted)", cursor: "pointer" }}>copy ⧉</span>
            </div>
            <div style={{ padding: "14px 16px" }}>
              <pre style={{
                fontSize: 11, lineHeight: 1.85, color: "var(--text2)",
                background: "var(--bg2)", border: "1px solid var(--border)",
                borderRadius: 6, padding: "12px 14px", overflowX: "auto",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
{`pip install rag-debugger-sdk

from rag_debugger import init, rag_trace
init(dashboard_url="http://localhost:7777")

@rag_trace("retrieve")
async def search(query: str):
    return await db.query(query)`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
