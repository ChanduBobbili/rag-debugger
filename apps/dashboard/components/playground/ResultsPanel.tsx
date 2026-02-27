"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Copy, Check } from "lucide-react"
import type { RAGEvent } from "@/lib/types"
import PipelineTimeline from "@/components/PipelineTimeline"
import LiveFeed from "@/components/home/LiveFeed"
import ResultsSummary from "./ResultsSummary"
import { Card } from "@/components/ui/card"

const SNIPPET = `from rag_debugger import new_trace

new_trace(trace_id="your_trace_id")
result = your_pipeline.run("your query")`

interface ResultsPanelProps {
  traceId: string | null
  events: RAGEvent[]
  connected: boolean
}

export default function ResultsPanel({ traceId, events, connected }: ResultsPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(SNIPPET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ---------- Task A: Empty state (no run started) ---------- */
  if (!traceId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex h-full min-h-100 items-center justify-center"
      >
        <Card className="w-full max-w-md p-5">
          <p className="mb-4 text-sm font-medium text-zinc-200">How to use the Playground</p>
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="font-mono text-sm font-bold text-orange-400">1</span>
              <span className="text-sm text-zinc-400">
                Enter a query and click <span className="font-medium text-zinc-200">Run Query</span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-sm font-bold text-orange-400">2</span>
              <span className="text-sm text-zinc-400">
                Copy the <code className="font-mono text-zinc-300">trace_id</code> that appears
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-sm font-bold text-orange-400">3</span>
              <span className="text-sm text-zinc-400">Run your pipeline with that trace&nbsp;ID</span>
            </li>
          </ol>

          {/* Copyable code block */}
          <div className="group relative mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-zinc-400"
              aria-label="Copy snippet"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-zinc-400">{SNIPPET}</pre>
          </div>

          <p className="mt-3 text-xs text-zinc-600">
            The dashboard subscribes to your trace_id. Events appear here as your pipeline runs.
          </p>
        </Card>
      </motion.div>
    )
  }

  /* ---------- Computed metrics ---------- */
  const sessionComplete = events.some((e) => e.stage === "session_complete")
  const genEvent = events.find((e) => e.stage === "generate")
  const totalMs = events
    .filter((e) => e.stage !== "session_complete" && e.duration_ms)
    .reduce((sum, e) => sum + (e.duration_ms ?? 0), 0)
  const chunkCount = events.filter((e) => e.chunks).reduce((sum, e) => sum + (e.chunks?.length ?? 0), 0)
  const grounding = genEvent?.grounding_scores
    ? genEvent.grounding_scores.filter((g) => g.grounded).length / genEvent.grounding_scores.length
    : null

  return (
    <div className="space-y-4">
      {/* ---------- Task B: Waiting state ---------- */}
      {traceId && events.length === 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <span className="live-dot h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-sm font-medium text-zinc-300">Waiting for pipeline events</span>
          </div>
          <div className="space-y-1 rounded-md border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-500">
            <p className="text-zinc-400">trace_id:</p>
            <p className="break-all text-orange-400">{traceId}</p>
          </div>
          <p className="text-xs text-zinc-600">
            Pass this <span className="font-mono text-zinc-500">trace_id</span> to{" "}
            <span className="font-mono text-zinc-500">new_trace()</span> in your pipeline.
          </p>
        </Card>
      )}

      {events.length > 0 && (
        <Card className="p-4">
          <PipelineTimeline events={events} />
        </Card>
      )}

      <LiveFeed events={events} connected={connected} />

      <ResultsSummary
        grounding={grounding}
        totalMs={totalMs || null}
        chunkCount={chunkCount || null}
        show={sessionComplete}
      />

      {traceId && <p className="font-mono text-[10px] text-zinc-600">trace: {traceId}</p>}
    </div>
  )
}
