"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import TrendSparkline from "./TrendSparkline"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardProps {
  label: string
  value: string
  delta?: string
  deltaPositive?: boolean
  color: string
  sparklineData?: number[]
  loading?: boolean
}

const COLOR_MAP: Record<string, { text: string; delta: string; spark: string }> = {
  orange: { text: "text-orange-400", delta: "bg-orange-500/10 text-orange-400", spark: "#f97316" },
  emerald: { text: "text-emerald-400", delta: "bg-emerald-500/10 text-emerald-400", spark: "#10b981" },
  red: { text: "text-red-400", delta: "bg-red-500/10 text-red-400", spark: "#ef4444" },
  violet: { text: "text-violet-400", delta: "bg-violet-500/10 text-violet-400", spark: "#8b5cf6" },
}

export default function StatCard({ label, value, delta, deltaPositive, color, sparklineData, loading }: StatCardProps) {
  const colors = COLOR_MAP[color] || COLOR_MAP.orange

  if (loading) {
    return (
      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-6 w-full" />
      </Card>
    )
  }

  return (
    <Card className="p-4 hover:shadow-lg hover:shadow-zinc-900/50 hover:border-zinc-700 transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
        {delta && (
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
            deltaPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
          )}>
            {deltaPositive ? "↑" : "↓"} {delta}
          </span>
        )}
      </div>
      <div className={cn("text-3xl font-semibold font-mono tracking-tight mb-3", colors.text)}>
        {value}
      </div>
      {sparklineData && sparklineData.length > 1 && (
        <TrendSparkline data={sparklineData} color={colors.spark} width={200} height={24} />
      )}
    </Card>
  )
}
