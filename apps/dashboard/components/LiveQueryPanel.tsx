"use client"
import { useState } from "react"
import type { RAGEvent } from "@/lib/types"

interface Props {
  events: RAGEvent[]
  connected: boolean
}

export default function LiveQueryPanel({ events, connected }: Props) {
  const [autoScroll, setAutoScroll] = useState(true)

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full pulse-dot"
            style={{ background: connected ? "#00d4aa" : "#ef4444" }}
          />
          <span style={{ color: "var(--muted)" }}>
            {connected ? "Live" : "Disconnected"}
          </span>
          <span style={{ color: "var(--muted)" }}>
            · {events.length} events
          </span>
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className="text-xs px-2 py-1 rounded transition-colors"
          style={{
            background: autoScroll ? "rgba(0,212,170,0.1)" : "var(--surface2)",
            color: autoScroll ? "#00d4aa" : "var(--muted)",
          }}
        >
          {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto p-2 space-y-1">
        {events.length === 0 ? (
          <div className="text-center py-8 text-xs" style={{ color: "var(--muted)" }}>
            Waiting for events…
          </div>
        ) : (
          events.map((event, i) => (
            <div
              key={event.id || i}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono transition-colors"
              style={{ background: "var(--surface2)" }}
            >
              <StageBadge stage={event.stage} />
              <span className="truncate flex-1" style={{ color: "var(--text)" }}>
                {event.query_text?.slice(0, 50) || event.stage}
              </span>
              {event.duration_ms && (
                <span style={{ color: "var(--muted)" }}>
                  {event.duration_ms.toFixed(0)}ms
                </span>
              )}
              {event.error && (
                <span style={{ color: "#ef4444" }}>⚠</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    embed: "#ff6b35",
    retrieve: "#f0c040",
    rerank: "#a78bfa",
    generate: "#00d4aa",
    session_complete: "#7a788a",
  }
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded shrink-0"
      style={{
        background: `${colors[stage] || "#7a788a"}20`,
        color: colors[stage] || "#7a788a",
      }}
    >
      {stage}
    </span>
  )
}
