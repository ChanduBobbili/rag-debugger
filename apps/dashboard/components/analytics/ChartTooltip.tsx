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
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs shadow-xl">
      <p className="mb-1 text-zinc-400">{formatDate(label)}</p>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="text-zinc-300">{item.name}:</span>
          <span className="font-medium text-white">{formatValue(item.value, item.name)}</span>
        </div>
      ))}
    </div>
  )
}
