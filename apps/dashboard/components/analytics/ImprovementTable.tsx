"use client"

import { useState } from "react"
import Link from "next/link"
import type { WorstQuery } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  queries: WorstQuery[]
}

type SortKey = "grounding" | "latency" | "query"
type SortDir = "asc" | "desc"

export default function ImprovementTable({ queries }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("grounding")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const sorted = [...queries].sort((a, b) => {
    let cmp = 0
    if (sortKey === "grounding") {
      cmp = (a.overall_grounding_score ?? 0) - (b.overall_grounding_score ?? 0)
    } else if (sortKey === "latency") {
      cmp = (a.total_duration_ms ?? 0) - (b.total_duration_ms ?? 0)
    } else {
      cmp = (a.query_text ?? "").localeCompare(b.query_text ?? "")
    }
    return sortDir === "desc" ? -cmp : cmp
  })

  if (!queries.length) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 py-8 text-center">
        <p className="text-sm text-zinc-500">No improvement candidates</p>
        <p className="mt-1 text-xs text-zinc-600">All traces have grounding scores above 0.5</p>
      </div>
    )
  }

  const cols = [
    { key: "query" as const, label: "Query", sortable: true },
    { key: "grounding" as const, label: "Grounding", sortable: true },
    { key: "latency" as const, label: "Latency", sortable: true },
    { key: null, label: "" },
  ]

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-zinc-800/50 px-4 pt-4 pb-2">
        <h3 className="text-sm font-medium text-zinc-200">Improvement Candidates</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Low grounding traces worth investigating</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="w-8 px-4 py-2.5 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                #
              </th>
              {cols.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-4 py-2.5 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase",
                    col.sortable && "cursor-pointer transition-colors hover:text-zinc-300",
                  )}
                  onClick={() => col.sortable && col.key && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && col.key === sortKey && <ArrowUpDown className="h-3 w-3" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((q, i) => (
              <tr key={i} className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30">
                <td className="px-4 py-2.5 text-xs text-zinc-600">{i + 1}</td>
                <td className="max-w-xs px-4 py-2.5">
                  <span className="block truncate text-xs text-zinc-300">{q.query_text || "—"}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{ width: `${(q.overall_grounding_score ?? 0) * 100}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="border-red-500/20 font-mono text-[10px] text-red-400">
                      {q.overall_grounding_score?.toFixed(2) ?? "—"}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      (q.total_duration_ms ?? 0) > 5000 ? "text-red-400" : "text-zinc-400",
                    )}
                  >
                    {q.total_duration_ms?.toFixed(0) ?? "—"}ms
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/traces/${q.trace_id}`}
                    className="text-xs text-orange-400 transition-colors hover:text-orange-300"
                  >
                    Inspect →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
