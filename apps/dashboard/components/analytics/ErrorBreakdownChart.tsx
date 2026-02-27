"use client"

import {
  BarChart,
  Bar,
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

export default function ErrorBreakdownChart({ data }: Props) {
  return (
    <ChartCard
      title="Error Breakdown"
      subtitle="Which days have the most failures?"
      empty={!data.length || data.every(d => d.error_count === 0)}
    >
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
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
          />
          <Tooltip content={<ChartTooltip />} />
          <Bar
            dataKey="error_count"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
            name="Errors"
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-zinc-600 mt-2">
        Stage-level breakdown coming soon
      </p>
    </ChartCard>
  )
}
