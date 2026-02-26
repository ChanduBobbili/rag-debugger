"use client"

import { useState, useCallback } from "react"
import type { GroundingResult, ChunkScore } from "@/lib/types"
import { cn } from "@/lib/utils"

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

  const handleMouseEnter = useCallback((e: React.MouseEvent, result: GroundingResult) => {
    onSentenceHover?.(result.source_chunk_id)
    const chunk = chunks?.find(c => c.chunk_id === result.source_chunk_id)
    if (chunk) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const tooltipWidth = 280
      const x = rect.right + tooltipWidth > window.innerWidth
        ? rect.left - tooltipWidth - 4
        : rect.right + 4
      setTooltip({
        text: `${(result.score * 100).toFixed(0)}% match · ${chunk.text.slice(0, 70)}…`,
        x,
        y: rect.top,
      })
    }
  }, [chunks, onSentenceHover])

  if (!grounding.length) {
    return <p className="text-sm leading-relaxed text-zinc-300">{answer}</p>
  }

  return (
    <div>
      <p className="text-sm leading-[1.9] text-zinc-300">
        {grounding.map((result, i) => (
          <span
            key={i}
            className={cn(
              "px-0.5 py-px rounded-sm cursor-default transition-colors",
              result.grounded
                ? "bg-emerald-500/12 border-b border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-red-500/10 border-b border-red-500/30 hover:bg-red-500/18"
            )}
            onMouseEnter={(e) => handleMouseEnter(e, result)}
            onMouseLeave={() => { onSentenceHover?.(null); setTooltip(null) }}
          >
            {result.sentence}{" "}
          </span>
        ))}
      </p>
      {tooltip && (
        <div
          className="fixed z-50 max-w-[280px] text-xs py-1.5 px-2.5 rounded-md pointer-events-none font-mono bg-zinc-800 border border-zinc-700 text-zinc-300 shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
      <div className="flex gap-4 mt-3 text-[10px] text-zinc-500 items-center font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-emerald-500/50" />
          Grounded
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-sm bg-red-500/50" />
          Hallucinated
        </span>
        <span className={cn("ml-auto", pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-yellow-400" : "text-red-400")}>
          {groundedCount}/{grounding.length} · {pct}% grounded
        </span>
      </div>
    </div>
  )
}
