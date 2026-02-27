"use client"

import type { ChunkScore } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  chunks: ChunkScore[]
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value * 100}%`, background: color }}
        />
      </div>
      <span className="w-10 text-right font-mono text-[11px] text-zinc-400 tabular-nums">{value.toFixed(2)}</span>
    </div>
  )
}

export default function ChunkScoreTable({ chunks }: Props) {
  if (!chunks.length) {
    return (
      <div className="flex items-center justify-center py-8 text-xs text-zinc-600">No reranking data available</div>
    )
  }

  const sorted = [...chunks].sort((a, b) => a.final_rank - b.final_rank)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="w-12 px-3 py-2 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
              Rank
            </th>
            <th className="px-3 py-2 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
              Chunk ID
            </th>
            <th className="w-40 px-3 py-2 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
              Cosine Score
            </th>
            <th className="w-40 px-3 py-2 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
              Rerank Score
            </th>
            <th className="w-16 px-3 py-2 text-right text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
              Delta
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((chunk) => {
            const delta =
              chunk.rerank_score != null ? ((chunk.rerank_score - chunk.cosine_score) / chunk.cosine_score) * 100 : null
            const promoted = delta != null && delta > 10
            return (
              <tr
                key={chunk.chunk_id}
                className={cn(
                  "border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30",
                  promoted && "bg-emerald-500/5",
                )}
              >
                <td className="px-3 py-2.5 font-mono text-xs text-zinc-500">{chunk.final_rank + 1}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                    {chunk.chunk_id.slice(0, 12)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <ScoreBar value={chunk.cosine_score} color="#f97316" />
                </td>
                <td className="px-3 py-2.5">
                  {chunk.rerank_score != null ? (
                    <ScoreBar value={chunk.rerank_score} color="#8b5cf6" />
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right">
                  {delta != null ? (
                    <span className={cn("font-mono text-[11px]", delta > 0 ? "text-emerald-400" : "text-red-400")}>
                      {delta > 0 ? "+" : ""}
                      {delta.toFixed(0)}%
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
