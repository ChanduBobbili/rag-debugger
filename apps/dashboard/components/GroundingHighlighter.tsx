"use client"
import { useState } from "react"
import type { GroundingResult, ChunkScore } from "@/lib/types"

interface Props {
  answer: string
  grounding: GroundingResult[]
  chunks?: ChunkScore[]
  onSentenceHover?: (chunkId: string | null) => void
}

export default function GroundingHighlighter({ answer, grounding, chunks, onSentenceHover }: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const groundedCount = grounding.filter(g => g.grounded).length
  const pct = grounding.length ? Math.round((groundedCount / grounding.length) * 100) : 0

  if (!grounding.length) {
    return <p style={{ fontSize: 13, lineHeight: 1.8, color: "var(--text)" }}>{answer}</p>
  }

  return (
    <div>
      <p style={{ fontSize: 13, lineHeight: 1.9, color: "var(--text)" }}>
        {grounding.map((result, i) => {
          const chunk = chunks?.find(c => c.chunk_id === result.source_chunk_id)
          return (
            <span
              key={i}
              className={result.grounded ? "grounded" : "hallucinated"}
              onMouseEnter={e => {
                onSentenceHover?.(result.source_chunk_id)
                if (chunk) {
                  setTooltip({
                    text: `${(result.score * 100).toFixed(0)}% match · ${chunk.text.slice(0, 70)}…`,
                    x: e.clientX, y: e.clientY,
                  })
                }
              }}
              onMouseLeave={() => { onSentenceHover?.(null); setTooltip(null) }}
            >
              {result.sentence}{" "}
            </span>
          )
        })}
      </p>
      {tooltip && (
        <div style={{
          position: "fixed", zIndex: 50, maxWidth: 300,
          fontSize: 11, padding: "6px 10px",
          borderRadius: 5, pointerEvents: "none",
          background: "var(--surface2)", border: "1px solid var(--border2)",
          color: "var(--text2)", fontFamily: "'JetBrains Mono', monospace",
          left: tooltip.x + 10, top: tooltip.y - 30,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          {tooltip.text}
        </div>
      )}
      <div style={{
        display: "flex", gap: 16, marginTop: 12,
        fontSize: 10, color: "var(--muted)", alignItems: "center",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(0,212,170,0.5)", display: "inline-block" }} />
          Grounded
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: "rgba(255,68,102,0.5)", display: "inline-block" }} />
          Hallucinated
        </span>
        <span style={{ marginLeft: "auto", color: pct >= 70 ? "var(--teal)" : pct >= 50 ? "var(--gold)" : "var(--red)" }}>
          {groundedCount}/{grounding.length} sentences · {pct}% grounded
        </span>
      </div>
    </div>
  )
}
