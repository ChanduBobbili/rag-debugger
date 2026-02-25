"use client"
import { useState } from "react"
import type { ChunkScore } from "@/lib/types"

interface Props { chunk: ChunkScore; highlighted?: boolean }

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
      <span style={{ fontSize: 9, color, width: 36, textAlign: "right", flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: "var(--border2)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${value * 100}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 9, color, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{value.toFixed(2)}</span>
    </div>
  )
}

export default function ChunkCard({ chunk, highlighted }: Props) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{
      background: highlighted ? "rgba(255,92,53,0.04)" : "var(--bg2)",
      border: `1px solid ${highlighted ? "var(--rag)" : "var(--border)"}`,
      borderRadius: 8, padding: "12px 14px", cursor: "pointer",
      transition: "border-color 0.15s, background 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 9, padding: "2px 6px", background: "var(--surface3)",
          color: "var(--muted)", borderRadius: 3, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {chunk.chunk_id}
        </span>
        <ScoreBar label="cos" value={chunk.cosine_score} color="var(--rag)" />
        {chunk.rerank_score !== null && chunk.rerank_score !== undefined && (
          <ScoreBar label="rnk" value={chunk.rerank_score} color="var(--gold)" />
        )}
        <span style={{ fontSize: 9, color: "var(--muted)", marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" }}>
          #{chunk.final_rank + 1}
        </span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.6 }}>
        {expanded ? chunk.text : chunk.text.slice(0, 200)}
        {chunk.text.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ marginLeft: 4, fontSize: 11, color: "var(--rag)", background: "none", border: "none", cursor: "pointer" }}
          >
            {expanded ? "less" : "…more"}
          </button>
        )}
      </p>
      {Object.keys(chunk.metadata).length > 0 && (
        <details style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          <summary style={{ fontSize: 10, color: "var(--muted)", cursor: "pointer" }}>metadata</summary>
          <pre style={{
            marginTop: 6, fontSize: 10, padding: "8px 12px", borderRadius: 5,
            background: "var(--bg)", color: "var(--muted)", overflowX: "auto", maxHeight: 120,
          }}>
            {JSON.stringify(chunk.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
