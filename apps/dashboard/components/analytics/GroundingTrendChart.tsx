"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import type { DailyMetric } from "@/lib/types"
import ChartTooltip from "./ChartTooltip"
import ChartCard from "./ChartCard"
import { format } from "date-fns"

interface Props {
  data: DailyMetric[]
}

export default function GroundingTrendChart({ data }: Props) {
  return (
    <ChartCard
      title="Grounding Score Trend"
      subtitle="Is answer quality improving over time?"
      empty={!data.length || data.every(d => d.avg_grounding === null)}
    >
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="groundingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="#27272a" />
          <XAxis
            dataKey="date"
            stroke="#52525b"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickFormatter={(v: string) => {
              try { return format(new Date(v), "M/d") } catch { return v }
            }}
          />
          <YAxis
            stroke="#52525b"
            tick={{ fill: "#71717a", fontSize: 11 }}
            domain={[0, 1]}
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          />
          <Tooltip content={<ChartTooltip />} />
          <ReferenceLine
            y={0.7}
            stroke="#3f3f46"
            strokeDasharray="4 2"
            label={{ value: "Target", fill: "#71717a", fontSize: 10, position: "left" }}
          />
          <Area
            type="monotone"
            dataKey="avg_grounding"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#groundingGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#10b981" }}
            name="Avg Grounding"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
