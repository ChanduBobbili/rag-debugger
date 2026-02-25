"use client"
import { useState } from "react"
import type { ChunkScore } from "@/lib/types"

interface Props {
  chunk: ChunkScore
  highlighted?: boolean
}

export default function ChunkCard({ chunk, highlighted }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-lg border p-4 transition-all duration-200"
      style={{
        background: highlighted
          ? "rgba(255, 107, 53, 0.05)"
          : "var(--surface)",
        borderColor: highlighted ? "var(--rag)" : "var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: "var(--surface2)", color: "var(--muted)" }}
          >
            {chunk.chunk_id}
          </span>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: "rgba(255,107,53,0.1)", color: "var(--rag)" }}
          >
            cos: {chunk.cosine_score.toFixed(3)}
          </span>
          {chunk.rerank_score !== null && chunk.rerank_score !== undefined && (
            <span
              className="text-xs font-mono px-2 py-0.5 rounded"
              style={{
                background: "rgba(240,192,64,0.1)",
                color: "var(--accent)",
              }}
            >
              rerank: {chunk.rerank_score.toFixed(3)}
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          Rank #{chunk.final_rank + 1}
        </span>
      </div>

      <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
        {expanded ? chunk.text : chunk.text.slice(0, 200)}
        {chunk.text.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-xs hover:underline"
            style={{ color: "var(--rag)" }}
          >
            {expanded ? "show less" : "…show more"}
          </button>
        )}
      </p>

      {Object.keys(chunk.metadata).length > 0 && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <details className="text-xs">
            <summary
              className="cursor-pointer hover:underline"
              style={{ color: "var(--muted)" }}
            >
              metadata
            </summary>
            <pre
              className="mt-1 p-2 rounded text-xs overflow-x-auto"
              style={{ background: "var(--surface2)", color: "var(--muted)" }}
            >
              {JSON.stringify(chunk.metadata, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
