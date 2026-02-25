"use client"
import { RAGEvent, RAGStage } from "@/lib/types"
import { useMemo } from "react"

const STAGE_COLORS: Record<string, string> = {
  embed: "#ff6b35",
  retrieve: "#f0c040",
  rerank: "#a78bfa",
  generate: "#00d4aa",
  session_complete: "#7a788a",
}

interface Props {
  events: RAGEvent[]
  onStageClick?: (stage: RAGStage) => void
}

export default function PipelineTimeline({ events, onStageClick }: Props) {
  const stages = useMemo(() => {
    const stageEvents = events.filter(
      (e) => e.duration_ms && e.stage !== "session_complete",
    )
    const totalMs =
      stageEvents.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0) || 1
    return stageEvents.map((e) => ({
      stage: e.stage,
      durationMs: e.duration_ms ?? 0,
      widthPct: ((e.duration_ms ?? 0) / totalMs) * 100,
      error: e.error,
    }))
  }, [events])

  if (!stages.length) {
    return (
      <div className="flex items-center justify-center h-16 text-sm text-muted border border-border rounded-md">
        No pipeline stages recorded yet
      </div>
    )
  }

  const totalMs = stages.reduce((sum, s) => sum + s.durationMs, 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted mb-1">
        <span>Pipeline Stages</span>
        <span>{totalMs.toFixed(0)}ms total</span>
      </div>
      <div className="flex h-10 rounded overflow-hidden border border-border">
        {stages.map((s, i) => (
          <div
            key={i}
            title={`${s.stage}: ${s.durationMs.toFixed(0)}ms`}
            onClick={() => onStageClick?.(s.stage as RAGStage)}
            className="flex items-center justify-center text-xs font-mono cursor-pointer hover:brightness-110 transition-all"
            style={{
              width: `${s.widthPct}%`,
              background: s.error ? "#ef4444" : STAGE_COLORS[s.stage],
              opacity: 0.85,
              minWidth: "40px",
              color: "#0a0a0f",
              fontWeight: 600,
            }}
          >
            {s.widthPct > 12 ? s.stage : ""}
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted flex-wrap">
        {stages.map((s, i) => (
          <span key={i} style={{ color: STAGE_COLORS[s.stage] }}>
            ● {s.stage}: {s.durationMs.toFixed(0)}ms
          </span>
        ))}
      </div>
    </div>
  )
}
