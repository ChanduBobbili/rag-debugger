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
  const stages = count >= 4
    ? ["embed", "retrieve", "rerank", "generate"]
    : count >= 3
      ? ["embed", "retrieve", "generate"]
      : ["embed", "generate"]
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <span key={i}>
          <span className={cn("inline-block w-1.5 h-1.5 rounded-full", STAGE_COLORS[s])} />
          {i < stages.length - 1 && <span className="text-zinc-600 text-[10px] mx-0.5">→</span>}
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
  const relativeTime = trace.created_at
    ? formatDistanceToNow(new Date(trace.created_at), { addSuffix: false })
    : ""

  return (
    <Link
      href={`/traces/${trace.trace_id}`}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/50 transition-colors duration-150"
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full shrink-0",
          trace.has_error ? "bg-red-500" : "bg-emerald-500"
        )}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-200 truncate">
            {trace.query_text || "Unknown query"}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-zinc-600 font-mono">
            {trace.trace_id.slice(0, 8)}…
          </span>
          <StageDots count={trace.stage_count ?? 0} />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {trace.overall_grounding_score !== null && (
          <Badge
            variant="outline"
            className={cn("font-mono text-[10px] px-1.5 border", scoreColor(trace.overall_grounding_score))}
          >
            {trace.overall_grounding_score.toFixed(2)}
          </Badge>
        )}
        {trace.total_duration_ms !== null && (
          <span className={cn(
            "text-[11px] font-mono tabular-nums",
            trace.total_duration_ms > 10000 ? "text-red-400" : "text-zinc-500"
          )}>
            {trace.total_duration_ms.toFixed(0)}ms
          </span>
        )}
        {relativeTime && (
          <span className="text-[10px] text-zinc-600 w-8 text-right">{relativeTime}</span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}
