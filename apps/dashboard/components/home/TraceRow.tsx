"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { QuerySession } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TraceRowProps {
  trace: QuerySession
}

const STAGE_COLORS: Record<string, string> = {
  embed: "bg-orange-500",
  retrieve: "bg-yellow-500",
  rerank: "bg-violet-500",
  generate: "bg-emerald-500",
}

function StageDots({ count }: { count: number }) {
  const stages =
    count >= 4
      ? ["embed", "retrieve", "rerank", "generate"]
      : count >= 3
        ? ["embed", "retrieve", "generate"]
        : ["embed", "generate"]
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <span key={i}>
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", STAGE_COLORS[s])} />
          {i < stages.length - 1 && <span className="mx-0.5 text-[10px] text-zinc-600">→</span>}
        </span>
      ))}
    </div>
  )
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-zinc-500 bg-zinc-800"
  if (score >= 0.75) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
  if (score >= 0.5) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
  return "text-red-400 bg-red-500/10 border-red-500/20"
}

export default function TraceRow({ trace }: TraceRowProps) {
  const relativeTime = trace.created_at ? formatDistanceToNow(new Date(trace.created_at), { addSuffix: false }) : ""

  return (
    <Link
      href={`/traces/${trace.trace_id}`}
      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-zinc-800/50"
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", trace.has_error ? "bg-red-500" : "bg-emerald-500")} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-zinc-200">{trace.query_text || "Unknown query"}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-mono text-[10px] text-zinc-600">{trace.trace_id.slice(0, 8)}…</span>
          <StageDots count={trace.stage_count ?? 0} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {trace.overall_grounding_score !== null && (
          <Badge
            variant="outline"
            className={cn("border px-1.5 font-mono text-[10px]", scoreColor(trace.overall_grounding_score))}
          >
            {trace.overall_grounding_score.toFixed(2)}
          </Badge>
        )}
        {trace.total_duration_ms !== null && (
          <span
            className={cn(
              "font-mono text-[11px] tabular-nums",
              trace.total_duration_ms > 10000 ? "text-red-400" : "text-zinc-500",
            )}
          >
            {trace.total_duration_ms.toFixed(0)}ms
          </span>
        )}
        {relativeTime && <span className="w-8 text-right text-[10px] text-zinc-600">{relativeTime}</span>}
        <ChevronRight className="h-3.5 w-3.5 text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  )
}
