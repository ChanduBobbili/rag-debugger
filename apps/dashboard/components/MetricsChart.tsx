"use client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import type { DailyMetric } from "@/lib/types"

interface LineProps {
  data: DailyMetric[]
  dataKey: keyof DailyMetric
  color?: string
  label?: string
}

export function MetricsLineChart({ data, dataKey, color = "#ff6b35", label = "" }: LineProps) {
  if (!data.length) {
    return (
      <div className="text-muted border-border flex h-48 items-center justify-center rounded-md border text-sm">
        No data available
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis
            dataKey="date"
            stroke="#7a788a"
            tick={{ fontSize: 11, fontFamily: "DM Mono" }}
            tickFormatter={(v: string) => {
              const d = new Date(v)
              return `${d.getMonth() + 1}/${d.getDate()}`
            }}
          />
          <YAxis stroke="#7a788a" tick={{ fontSize: 11, fontFamily: "DM Mono" }} />
          <Tooltip
            contentStyle={{
              background: "#1a1a24",
              border: "1px solid #2a2a3a",
              borderRadius: "6px",
              color: "#e8e6f0",
              fontFamily: "DM Mono, monospace",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, r: 3 }}
            name={label || (dataKey as string)}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

interface BarProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  xKey: string
  yKey: string
  color?: string
}

export function MetricsBarChart({ data, xKey, yKey, color = "#a78bfa" }: BarProps) {
  if (!data.length) {
    return (
      <div className="text-muted border-border flex h-48 items-center justify-center rounded-md border text-sm">
        No data available
      </div>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
          <XAxis dataKey={xKey} stroke="#7a788a" tick={{ fontSize: 11, fontFamily: "DM Mono" }} />
          <YAxis stroke="#7a788a" tick={{ fontSize: 11, fontFamily: "DM Mono" }} />
          <Tooltip
            contentStyle={{
              background: "#1a1a24",
              border: "1px solid #2a2a3a",
              borderRadius: "6px",
              color: "#e8e6f0",
              fontFamily: "DM Mono, monospace",
              fontSize: "12px",
            }}
          />
          <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
