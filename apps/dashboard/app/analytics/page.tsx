"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRAGMetrics } from "@/hooks/useRAGMetrics"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import StatCard from "@/components/home/StatCard"
import GroundingTrendChart from "@/components/analytics/GroundingTrendChart"
import LatencyChart from "@/components/analytics/LatencyChart"
import VolumeChart from "@/components/analytics/VolumeChart"
import ErrorBreakdownChart from "@/components/analytics/ErrorBreakdownChart"
import ImprovementTable from "@/components/analytics/ImprovementTable"

const TIME_RANGES = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
] as const

export default function AnalyticsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(7)
  const { data, loading, error } = useRAGMetrics(days)
  const s = data?.summary
  const daily = data?.daily ?? []

  const cards = [
    {
      label: "Total Queries",
      color: "orange",
      value: loading ? "—" : String(s?.total ?? 0),
      sparklineData: daily.map((d) => d.total_queries),
    },
    {
      label: "Avg Grounding",
      color: "emerald",
      value: loading ? "—" : s?.avg_grounding ? `${(s.avg_grounding * 100).toFixed(0)}%` : "—",
      sparklineData: daily.map((d) => d.avg_grounding ?? 0),
    },
    {
      label: "Avg Latency",
      color: "violet",
      value: loading ? "—" : s?.avg_latency ? `${s.avg_latency.toFixed(0)}ms` : "—",
      sparklineData: daily.map((d) => d.avg_latency_ms ?? 0),
    },
    {
      label: "Failure Rate",
      color: "red",
      value: loading ? "—" : `${(s?.failure_rate ?? 0).toFixed(1)}%`,
      sparklineData: daily.map((d) => d.error_count),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Analytics</h1>
          <p className="font-mono text-xs text-zinc-500">Pipeline performance · Last {days} days</p>
        </div>
        <div className="flex rounded-md border border-zinc-800 p-0.5">
          {TIME_RANGES.map((r) => (
            <Button
              key={r.value}
              variant="ghost"
              size="sm"
              onClick={() => setDays(r.value)}
              className={cn(
                "h-7 rounded-sm px-3 text-xs",
                days === r.value ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <StatCard {...card} loading={loading} />
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GroundingTrendChart data={daily} />
          <LatencyChart data={daily} />
          <VolumeChart data={daily} />
          <ErrorBreakdownChart data={daily} />
        </div>
      )}

      {/* Improvement Table */}
      {data?.worst_queries && data.worst_queries.length > 0 && <ImprovementTable queries={data.worst_queries} />}
    </motion.div>
  )
}
