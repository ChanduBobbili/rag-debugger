"use client"
import { useState } from "react"
import type { GroundingResult, ChunkScore } from "@/lib/types"

interface Props {
  answer: string
  grounding: GroundingResult[]
  chunks?: ChunkScore[]
  onSentenceHover?: (chunkId: string | null) => void
}

export default function GroundingHighlighter({
  answer,
  grounding,
  chunks,
  onSentenceHover,
}: Props) {
  const [tooltip, setTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)

  if (!grounding.length) {
    return <p className="text-sm" style={{ color: "var(--text)" }}>{answer}</p>
  }

  const groundedCount = grounding.filter((g) => g.grounded).length

  return (
    <div className="relative">
      <p className="text-sm leading-relaxed">
        {grounding.map((result, i) => {
          const chunk = chunks?.find(
            (c) => c.chunk_id === result.source_chunk_id,
          )
          return (
            <span
              key={i}
              className="cursor-pointer transition-all duration-150"
              style={{
                backgroundColor: result.grounded
                  ? "rgba(0, 212, 170, 0.15)"
                  : "rgba(255, 107, 53, 0.15)",
                borderBottom: result.grounded
                  ? "1px solid rgba(0, 212, 170, 0.5)"
                  : "1px solid rgba(255, 107, 53, 0.5)",
                borderRadius: "2px",
                padding: "1px 2px",
              }}
              onMouseEnter={(e) => {
                onSentenceHover?.(result.source_chunk_id)
                setTooltip({
                  text: `Score: ${result.score.toFixed(3)}${chunk ? ` · Source: ${chunk.text.slice(0, 80)}…` : result.grounded ? " · Grounded" : " · Not grounded"}`,
                  x: e.clientX,
                  y: e.clientY,
                })
              }}
              onMouseLeave={() => {
                onSentenceHover?.(null)
                setTooltip(null)
              }}
            >
              {result.sentence}{" "}
            </span>
          )
        })}
      </p>

      {tooltip && (
        <div
          className="fixed z-50 max-w-xs text-xs p-2 rounded"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 30,
            background: "#1a1a24",
            border: "1px solid #2a2a3a",
            color: "#e8e6f0",
            fontFamily: "DM Mono, monospace",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          {tooltip.text}
        </div>
      )}

      <div className="flex gap-4 mt-3 text-xs" style={{ color: "var(--muted)" }}>
        <span style={{ color: "#00d4aa" }}>■ Grounded</span>
        <span style={{ color: "#ff6b35" }}>■ Hallucinated</span>
        <span className="ml-auto">
          {groundedCount}/{grounding.length} sentences grounded
        </span>
      </div>
    </div>
  )
}
