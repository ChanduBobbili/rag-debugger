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

export default function VolumeChart({ data }: Props) {
  return (
    <ChartCard
      title="Query Volume"
      subtitle="When are users asking the most questions?"
      empty={!data.length}
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
            dataKey="total_queries"
            fill="#f97316"
            radius={[4, 4, 0, 0]}
            name="Queries"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
