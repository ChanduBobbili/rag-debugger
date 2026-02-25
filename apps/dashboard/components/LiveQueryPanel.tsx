"use client"
import { useEffect, useRef } from "react"
import type { RAGEvent } from "@/lib/types"

interface Props { events: RAGEvent[]; connected: boolean }

const STAGE_COLORS: Record<string, string> = {
  embed: "#ff5c35", retrieve: "#f0c040",
  rerank: "#9b7dff", generate: "#00d4aa", session_complete: "#5a5880",
}
const STAGE_ABBR: Record<string, string> = {
  embed: "EMB", retrieve: "RET", rerank: "RNK", generate: "GEN", session_complete: "DONE",
}

export default function LiveQueryPanel({ events, connected }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [events.length])

  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <div className="card-header">
        <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className={connected ? "live-dot" : ""}
            style={{
              display: "inline-block", width: 6, height: 6, borderRadius: "50%",
              background: connected ? "var(--teal)" : "var(--red)",
            }}
          />
          Live Feed
        </span>
        <span style={{ fontSize: 10, color: connected ? "var(--teal)" : "var(--red)" }}>
          {connected ? `${events.length} events` : "Disconnected"}
        </span>
      </div>
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        {events.length === 0 ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "32px 16px", fontSize: 11, color: "var(--muted)",
          }}>
            Waiting for pipeline events…
          </div>
        ) : (
          events.map((event, i) => {
            const color = STAGE_COLORS[event.stage] ?? "#5a5880"
            const abbr = STAGE_ABBR[event.stage] ?? event.stage.toUpperCase().slice(0, 3)
            return (
              <div
                key={event.id || i}
                className={i === events.length - 1 ? "feed-new" : ""}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 16px",
                  borderBottom: "1px solid rgba(30,30,50,0.6)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.01)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{
                  fontSize: 9, padding: "2px 6px", borderRadius: 3,
                  fontWeight: 700, letterSpacing: "0.04em", flexShrink: 0,
                  background: `${color}20`, color,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {abbr}
                </span>
                <span style={{
                  flex: 1, fontSize: 11, color: "var(--text2)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {event.query_text?.slice(0, 55) || event.stage}
                </span>
                {event.duration_ms !== null && event.duration_ms !== undefined && (
                  <span style={{
                    fontSize: 10, color: "var(--muted)", flexShrink: 0,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {event.duration_ms.toFixed(0)}ms
                  </span>
                )}
                {event.error && (
                  <span style={{ color: "var(--red)", fontSize: 11, flexShrink: 0 }}>⚠</span>
                )}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
