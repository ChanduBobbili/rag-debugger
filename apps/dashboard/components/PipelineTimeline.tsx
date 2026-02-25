"use client"
import { RAGEvent, RAGStage } from "@/lib/types"
import { useMemo } from "react"

const STAGE_COLORS: Record<string, string> = {
  embed: "#ff5c35",
  retrieve: "#f0c040",
  rerank: "#9b7dff",
  generate: "#00d4aa",
  session_complete: "#5a5880",
}

interface Props {
  events: RAGEvent[]
  onStageClick?: (stage: RAGStage) => void
}

export default function PipelineTimeline({ events, onStageClick }: Props) {
  const stages = useMemo(() => {
    const stageEvents = events.filter(e => e.duration_ms && e.stage !== "session_complete")
    const totalMs = stageEvents.reduce((sum, e) => sum + (e.duration_ms ?? 0), 0) || 1
    return stageEvents.map(e => ({
      stage: e.stage,
      durationMs: e.duration_ms ?? 0,
      widthPct: ((e.duration_ms ?? 0) / totalMs) * 100,
      error: e.error,
    }))
  }, [events])

  if (!stages.length) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: 56, fontSize: 12, color: "var(--muted)",
        border: "1px dashed var(--border2)", borderRadius: 8,
      }}>
        No pipeline stages recorded
      </div>
    )
  }

  const totalMs = stages.reduce((s, e) => s + e.durationMs, 0)

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        fontSize: 10, color: "var(--muted)", marginBottom: 10,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <span>Pipeline Execution</span>
        <span style={{ color: "var(--text2)" }}>{totalMs.toFixed(0)}ms total</span>
      </div>
      <div style={{
        display: "flex", height: 36, borderRadius: 6,
        overflow: "hidden", gap: 2, marginBottom: 12,
      }}>
        {stages.map((s, i) => (
          <div
            key={i}
            title={`${s.stage}: ${s.durationMs.toFixed(0)}ms`}
            onClick={() => onStageClick?.(s.stage as RAGStage)}
            style={{
              width: `${s.widthPct}%`, minWidth: 40,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
              color: "rgba(0,0,0,0.7)",
              background: s.error ? "var(--red)" : STAGE_COLORS[s.stage],
              cursor: "pointer", transition: "filter 0.15s",
              borderRadius: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
            onMouseLeave={e => (e.currentTarget.style.filter = "none")}
          >
            {s.widthPct > 12 ? s.stage : ""}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {stages.map((s, i) => (
          <span key={i} style={{
            fontSize: 10, color: STAGE_COLORS[s.stage],
            display: "flex", alignItems: "center", gap: 5,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span style={{
              display: "inline-block", width: 6, height: 6,
              borderRadius: "50%", background: STAGE_COLORS[s.stage],
            }} />
            {s.stage}: {s.durationMs.toFixed(0)}ms
          </span>
        ))}
      </div>
    </div>
  )
}
