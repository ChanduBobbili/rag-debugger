"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import type { RAGEvent, RAGStage } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const STAGE_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  embed: { bg: "bg-orange-500", text: "text-orange-400", hex: "#f97316" },
  retrieve: { bg: "bg-yellow-500", text: "text-yellow-400", hex: "#eab308" },
  rerank: { bg: "bg-violet-500", text: "text-violet-400", hex: "#8b5cf6" },
  generate: { bg: "bg-emerald-500", text: "text-emerald-400", hex: "#10b981" },
}

interface Props {
  events: RAGEvent[]
  onStageClick?: (stage: RAGStage) => void
}

export default function PipelineTimeline({ events, onStageClick }: Props) {
  const stages = useMemo(() => {
    const stageEvents = events.filter((e) => e.duration_ms && e.stage !== "session_complete")
    const totalMs = stageEvents.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0) || 1
    return stageEvents.map((e) => ({
      stage: e.stage,
      durationMs: e.duration_ms ?? 0,
      widthPct: ((e.duration_ms ?? 0) / totalMs) * 100,
      pctOfTotal: (((e.duration_ms ?? 0) / totalMs) * 100).toFixed(1),
      error: e.error,
    }))
  }, [events])

  if (!stages.length) {
    return (
      <div className="flex h-14 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-xs text-zinc-600">
        No pipeline stages recorded
      </div>
    )
  }

  const totalMs = stages.reduce((s, e) => s + e.durationMs, 0)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-zinc-500">Pipeline Execution</span>
        <span className="font-mono text-xs text-zinc-400">{totalMs.toFixed(0)}ms total</span>
      </div>

      {/* Bar segments */}
      <div className="mb-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
        {stages.map((s, i) => {
          const colors = STAGE_COLORS[s.stage]
          const hasError = !!s.error
          return (
            <Tooltip key={i} delayDuration={0}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
                  style={{ width: `${Math.max(s.widthPct, 3)}%`, transformOrigin: "left" }}
                  className={cn(
                    "h-full cursor-pointer rounded-sm transition-opacity hover:opacity-80",
                    hasError
                      ? "bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_4px,#27272a_4px,#27272a_8px)]"
                      : colors?.bg,
                  )}
                  onClick={() => onStageClick?.(s.stage as RAGStage)}
                />
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">
                <p className="font-medium">{s.stage}</p>
                <p>
                  {s.durationMs.toFixed(0)}ms · {s.pctOfTotal}%
                </p>
                {s.error && <p className="text-red-400">{s.error}</p>}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      {/* Labels */}
      <div className="flex flex-wrap gap-4">
        {stages.map((s, i) => {
          const colors = STAGE_COLORS[s.stage]
          return (
            <button
              key={i}
              onClick={() => onStageClick?.(s.stage as RAGStage)}
              className="flex items-center gap-1.5 font-mono text-[10px] transition-opacity hover:opacity-80"
            >
              <span className={cn("h-2 w-2 rounded-full", colors?.bg)} />
              <span className={colors?.text}>{s.stage}</span>
              <span className="text-zinc-600">{s.durationMs.toFixed(0)}ms</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
