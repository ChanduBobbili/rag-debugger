"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { DailyMetric } from "@/lib/types"
import ChartTooltip from "./ChartTooltip"
import ChartCard from "./ChartCard"
import { format } from "date-fns"

interface Props {
  data: DailyMetric[]
}

export default function LatencyChart({ data }: Props) {
  return (
    <ChartCard
      title="Latency Distribution"
      subtitle="Is your pipeline getting faster?"
      empty={!data.length}
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
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
            tickFormatter={(v: number) => `${v}ms`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="avg_latency_ms"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#8b5cf6" }}
            name="Avg Latency"
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
