"use client"

import { format } from "date-fns"

interface PayloadItem {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: PayloadItem[]
  label?: string
}

function formatValue(value: number | string | undefined, name?: string): string {
  if (value === undefined) return "—"
  const v = Number(value)
  if (isNaN(v)) return String(value)
  if (name?.includes("grounding")) return `${(v * 100).toFixed(1)}%`
  if (name?.includes("latency") || name?.includes("Latency")) return `${v.toFixed(0)}ms`
  return v.toLocaleString()
}

function formatDate(label: string | undefined): string {
  if (!label) return ""
  try {
    return format(new Date(label), "MMM d, yyyy")
  } catch {
    return label
  }
}

export default function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl text-xs font-mono">
      <p className="text-zinc-400 mb-1">{formatDate(label)}</p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />
          <span className="text-zinc-300">{item.name}:</span>
          <span className="text-white font-medium">{formatValue(item.value, item.name)}</span>
        </div>
      ))}
    </div>
  )
}
