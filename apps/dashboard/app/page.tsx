"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import type { QuerySession, AnalyticsResponse, DailyMetric } from "@/lib/types"
import { useTraceStream } from "@/hooks/useTraceStream"
import { AlertCircle } from "lucide-react"
import StatCard from "@/components/home/StatCard"
import TraceRow from "@/components/home/TraceRow"
import LiveFeed from "@/components/home/LiveFeed"
import GettingStarted from "@/components/home/GettingStarted"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

function computeDelta(daily: DailyMetric[], key: keyof DailyMetric): { delta: string; deltaPositive: boolean } | undefined {
  if (daily.length < 2) return undefined
  const prev = Number(daily[daily.length - 2][key] ?? 0)
  const curr = Number(daily[daily.length - 1][key] ?? 0)
  if (prev === 0) return undefined
  const pct = ((curr - prev) / prev) * 100
  return {
    delta: `${Math.abs(pct).toFixed(1)}%`,
    deltaPositive: pct >= 0,
  }
}

export default function HomePage() {
  const [traces, setTraces] = useState<QuerySession[]>([])
  const [metrics, setMetrics] = useState<AnalyticsResponse | null>(null)
  const [tracesLoading, setTracesLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { events, connected } = useTraceStream("__live__")

  useEffect(() => {
    api.analytics.metrics(7)
      .then((d) => { setMetrics(d); setMetricsLoading(false) })
      .catch(() => { setMetricsLoading(false) })

    api.traces.list({ limit: 8 })
      .then((d) => { setTraces(d); setTracesLoading(false) })
      .catch((e) => {
        setError("Failed to load traces. Is the server running at localhost:7777?")
        setTracesLoading(false)
        console.error(e)
      })
  }, [])

  useEffect(() => {
    const latestEvent = events[events.length - 1]
    if (latestEvent?.stage === "session_complete") {
      api.traces.list({ limit: 8 }).then(setTraces).catch(() => {})
    }
  }, [events])

  const s = metrics?.summary
  const daily = metrics?.daily ?? []
  const totalSpark = daily.map((d) => d.total_queries)
  const groundingSpark = daily.map((d) => d.avg_grounding ?? 0)
  const latencySpark = daily.map((d) => d.avg_latency_ms ?? 0)
  const errorSpark = daily.map((d) => d.error_count)

  const traceDelta = computeDelta(daily, "total_queries")
  const groundingDelta = computeDelta(daily, "avg_grounding")
  const failureDelta = computeDelta(daily, "error_count")
  const latencyDelta = computeDelta(daily, "avg_latency_ms")

  const cards = [
    {
      label: "Traces Today", color: "orange",
      value: metricsLoading ? "—" : String(s?.total ?? 0),
      sparklineData: totalSpark,
      ...traceDelta,
    },
    {
      label: "Avg Grounding", color: "emerald",
      value: metricsLoading ? "—" : s?.avg_grounding ? `${(s.avg_grounding * 100).toFixed(0)}%` : "—",
      sparklineData: groundingSpark,
      ...groundingDelta,
    },
    {
      label: "Failure Rate", color: "red",
      value: metricsLoading ? "—" : `${(s?.failure_rate ?? 0).toFixed(1)}%`,
      sparklineData: errorSpark,
      ...(failureDelta ? { delta: failureDelta.delta, deltaPositive: !failureDelta.deltaPositive } : {}),
    },
    {
      label: "Avg Latency", color: "violet",
      value: metricsLoading ? "—" : s?.avg_latency ? `${s.avg_latency.toFixed(0)}ms` : "—",
      sparklineData: latencySpark,
      ...(latencyDelta ? { delta: latencyDelta.delta, deltaPositive: !latencyDelta.deltaPositive } : {}),
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <StatCard {...card} loading={metricsLoading} />
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Traces */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-200">Recent Traces</h2>
            <Link href="/traces" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/50">
            {tracesLoading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : traces.length > 0 ? (
              traces.map((trace, i) => (
                <motion.div
                  key={trace.query_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <TraceRow trace={trace} />
                </motion.div>
              ))
            ) : null}
          </div>
        </div>

        {/* Live Feed */}
        <div>
          <h2 className="text-sm font-medium text-zinc-200 mb-3">Live Activity</h2>
          <LiveFeed events={events} connected={connected} />
        </div>
      </div>

      {/* Getting Started — only when no traces */}
      {!tracesLoading && traces.length === 0 && !error && <GettingStarted />}
    </motion.div>
  )
}
