"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { QuerySession } from "@/lib/types"
import TraceList from "@/components/TraceList"
import { useTraceStream } from "@/hooks/useTraceStream"
import LiveQueryPanel from "@/components/LiveQueryPanel"

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
      className="rounded-lg border p-5"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="text-2xl font-mono font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  )
}

export default function HomePage() {
  const [traces, setTraces] = useState<QuerySession[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    avgGrounding: 0,
    failureRate: 0,
    avgLatency: 0,
  })
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
            failureRate: analytics.summary.failure_rate,
            avgLatency: analytics.summary.avg_latency ?? 0,
          })
        }
      } catch (e) {
        console.error("Failed to load dashboard data:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Dashboard
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Monitor your RAG pipeline performance in real time
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Traces Today"
          value={loading ? "—" : String(stats.total)}
          color="var(--rag)"
        />
        <StatCard
          label="Avg Grounding"
          value={
            loading
              ? "—"
              : stats.avgGrounding
                ? `${(stats.avgGrounding * 100).toFixed(0)}%`
                : "—"
          }
          color="var(--agent)"
        />
        <StatCard
          label="Failure Rate"
          value={
            loading
              ? "—"
              : `${stats.failureRate?.toFixed(1)}%`
          }
          color={stats.failureRate > 10 ? "#ef4444" : "var(--agent)"}
        />
        <StatCard
          label="Avg Latency"
          value={
            loading
              ? "—"
              : stats.avgLatency
                ? `${stats.avgLatency.toFixed(0)}ms`
                : "—"
          }
          color="var(--trace)"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Traces */}
        <div className="lg:col-span-2">
          <h2
            className="text-lg font-bold mb-4"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Recent Traces
          </h2>
          <TraceList traces={traces} loading={loading} />
        </div>

        {/* Live Feed + Quick Start */}
        <div className="space-y-6">
          <div>
            <h2
              className="text-lg font-bold mb-4"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Live Activity
            </h2>
            <LiveQueryPanel events={events} connected={connected} />
          </div>

          <div
            className="rounded-lg border p-4"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <h3
              className="text-sm font-bold mb-3"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Quick Start
            </h3>
            <pre
              className="text-xs p-3 rounded overflow-x-auto"
              style={{ background: "var(--surface2)", color: "var(--muted)" }}
            >
              {`pip install rag-debugger-sdk

from rag_debugger import init, rag_trace

init(dashboard_url="http://localhost:7777")

@rag_trace("retrieve")
async def search(query: str):
    return await vector_db.query(query)`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
