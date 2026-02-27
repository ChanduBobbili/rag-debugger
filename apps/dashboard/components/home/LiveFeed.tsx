"use client"

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { RAGEvent } from "@/lib/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface LiveFeedProps {
  events: RAGEvent[]
  connected: boolean
  maxVisible?: number
}

const STAGE_CONFIG: Record<string, { abbr: string; color: string; bg: string }> = {
  embed: { abbr: "EMB", color: "text-orange-400", bg: "bg-orange-500/15" },
  retrieve: { abbr: "RET", color: "text-yellow-400", bg: "bg-yellow-500/15" },
  rerank: { abbr: "RNK", color: "text-violet-400", bg: "bg-violet-500/15" },
  generate: { abbr: "GEN", color: "text-emerald-400", bg: "bg-emerald-500/15" },
  session_complete: { abbr: "DONE", color: "text-zinc-500", bg: "bg-zinc-500/15" },
}

export default function LiveFeed({ events, connected, maxVisible = 6 }: LiveFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)

  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events.length, userScrolled])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20
    setUserScrolled(!isAtBottom)
  }

  const activeCount = events.filter((e) => e.stage !== "session_complete").length

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", connected ? "live-dot bg-emerald-500" : "bg-red-500")} />
          <span className="text-xs font-medium text-zinc-300">Live</span>
        </div>
        <span className="text-[10px] text-zinc-500">{activeCount} events</span>
      </div>

      <ScrollArea style={{ height: maxVisible * 40 }}>
        <div ref={scrollRef} onScroll={handleScroll} style={{ maxHeight: maxVisible * 40 }} className="overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-xs text-zinc-600">
              Waiting for pipeline events…
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {events.map((event, i) => {
                const cfg = STAGE_CONFIG[event.stage] ?? STAGE_CONFIG.session_complete
                return (
                  <motion.div
                    key={event.id || i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 border-b border-zinc-800/30 px-4 py-2 transition-colors hover:bg-zinc-800/30"
                  >
                    <span
                      className={cn("shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold", cfg.bg, cfg.color)}
                    >
                      {cfg.abbr}
                    </span>
                    <span className="flex-1 truncate text-xs text-zinc-400">
                      {event.query_text?.slice(0, 55) || event.stage}
                    </span>
                    {event.duration_ms != null && (
                      <span className="shrink-0 font-mono text-[10px] text-zinc-600">
                        {event.duration_ms.toFixed(0)}ms
                      </span>
                    )}
                    {event.error && <span className="shrink-0 text-[10px] text-red-400">⚠</span>}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
