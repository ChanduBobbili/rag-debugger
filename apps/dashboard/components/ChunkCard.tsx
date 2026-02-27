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
    <div className="flex items-center gap-2 flex-1">
      <span className={cn("text-[9px] w-8 text-right shrink-0 font-mono", colorClass)}>{label}</span>
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", colorClass.replace("text-", "bg-"))} style={{ width: `${value * 100}%` }} />
      </div>
      <span className={cn("text-[9px] shrink-0 font-mono tabular-nums", colorClass)}>{value.toFixed(2)}</span>
    </div>
  )
}

export default function ChunkCard({ chunk, highlighted }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn(
      "rounded-lg border p-3 transition-all duration-150",
      highlighted
        ? "bg-orange-500/5 border-orange-500/40"
        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
    )}>
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        <span className="text-[9px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
          {chunk.chunk_id}
        </span>
        <ScoreBar label="cos" value={chunk.cosine_score} colorClass="text-orange-400" />
        {chunk.rerank_score != null && (
          <ScoreBar label="rnk" value={chunk.rerank_score} colorClass="text-yellow-400" />
        )}
        <span className="text-[9px] font-mono text-zinc-600 ml-auto">#{chunk.final_rank + 1}</span>
      </div>

      <p className="text-xs text-zinc-400 leading-relaxed">
        {expanded ? chunk.text : chunk.text.slice(0, 200)}
        {chunk.text.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-orange-400 hover:text-orange-300 transition-colors"
          >
            {expanded ? "less" : "…more"}
          </button>
        )}
      </p>

      {Object.keys(chunk.metadata).length > 0 && (
        <details className="mt-2 pt-2 border-t border-zinc-800">
          <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors">
            metadata
          </summary>
          <pre className="mt-1.5 text-[10px] font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 rounded p-2 overflow-x-auto max-h-28">
            {JSON.stringify(chunk.metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}
