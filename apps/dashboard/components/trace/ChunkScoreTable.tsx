"use client"

import type { ChunkScore } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  chunks: ChunkScore[]
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
      <span className="text-[11px] font-mono text-zinc-400 w-10 text-right tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  )
}

export default function ChunkScoreTable({ chunks }: Props) {
  if (!chunks.length) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-zinc-600">
        No reranking data available
      </div>
    )
  }

  const sorted = [...chunks].sort((a, b) => a.final_rank - b.final_rank)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-medium w-12">Rank</th>
            <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Chunk ID</th>
            <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-medium w-40">Cosine Score</th>
            <th className="text-left py-2 px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-medium w-40">Rerank Score</th>
            <th className="text-right py-2 px-3 text-[10px] uppercase tracking-wider text-zinc-500 font-medium w-16">Delta</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((chunk) => {
            const delta = chunk.rerank_score != null
              ? ((chunk.rerank_score - chunk.cosine_score) / chunk.cosine_score * 100)
              : null
            const promoted = delta != null && delta > 10
            return (
              <tr
                key={chunk.chunk_id}
                className={cn(
                  "border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors",
                  promoted && "bg-emerald-500/5"
                )}
              >
                <td className="py-2.5 px-3 text-xs font-mono text-zinc-500">
                  {chunk.final_rank + 1}
                </td>
                <td className="py-2.5 px-3">
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                    {chunk.chunk_id.slice(0, 12)}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <ScoreBar value={chunk.cosine_score} color="#f97316" />
                </td>
                <td className="py-2.5 px-3">
                  {chunk.rerank_score != null ? (
                    <ScoreBar value={chunk.rerank_score} color="#8b5cf6" />
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right">
                  {delta != null ? (
                    <span className={cn(
                      "text-[11px] font-mono",
                      delta > 0 ? "text-emerald-400" : "text-red-400"
                    )}>
                      {delta > 0 ? "+" : ""}{delta.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
