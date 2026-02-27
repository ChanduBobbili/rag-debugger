"use client"

import { useState } from "react"
import type { ChunkScore } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  chunk: ChunkScore
  highlighted?: boolean
}

function ScoreBar({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <span className={cn("w-8 shrink-0 text-right font-mono text-[9px]", colorClass)}>{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn("h-full rounded-full", colorClass.replace("text-", "bg-"))}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className={cn("shrink-0 font-mono text-[9px] tabular-nums", colorClass)}>{value.toFixed(2)}</span>
    </div>
  )
}

export default function ChunkCard({ chunk, highlighted }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-150",
        highlighted ? "border-orange-500/40 bg-orange-500/5" : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
      )}
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">{chunk.chunk_id}</span>
        <ScoreBar label="cos" value={chunk.cosine_score} colorClass="text-orange-400" />
        {chunk.rerank_score != null && <ScoreBar label="rnk" value={chunk.rerank_score} colorClass="text-yellow-400" />}
        <span className="ml-auto font-mono text-[9px] text-zinc-600">#{chunk.final_rank + 1}</span>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">
        {expanded ? chunk.text : chunk.text.slice(0, 200)}
        {chunk.text.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-orange-400 transition-colors hover:text-orange-300"
          >
            {expanded ? "less" : "…more"}
          </button>
        )}
      </p>

      {Object.keys(chunk.metadata).length > 0 && (
        <details className="mt-2 border-t border-zinc-800 pt-2">
          <summary className="cursor-pointer text-[10px] text-zinc-600 transition-colors hover:text-zinc-400">
            metadata
          </summary>
          <pre className="mt-1.5 max-h-28 overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-[10px] text-zinc-500">
            {JSON.stringify(chunk.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
