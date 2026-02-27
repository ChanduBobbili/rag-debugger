"use client"

import { Play } from "lucide-react"
import type { RAGEvent } from "@/lib/types"
import PipelineTimeline from "@/components/PipelineTimeline"
import LiveFeed from "@/components/home/LiveFeed"
import ResultsSummary from "./ResultsSummary"
import { Card } from "@/components/ui/card"

interface ResultsPanelProps {
  traceId: string | null
  events: RAGEvent[]
  connected: boolean
}

export default function ResultsPanel({ traceId, events, connected }: ResultsPanelProps) {
  if (!traceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-zinc-600 gap-3">
        <div className="w-16 h-16 rounded-2xl border border-zinc-800 flex items-center justify-center">
          <Play className="h-6 w-6 opacity-40" />
        </div>
        <p className="text-sm font-medium text-zinc-500">Ready to run</p>
        <p className="text-xs text-center text-zinc-600 max-w-xs">
          Click <span className="text-zinc-400 font-medium">Run Query</span> to get a{" "}
          <span className="font-mono text-orange-400">trace_id</span>. Then run your
          SDK-instrumented pipeline with that ID to see live results here.
        </p>
        <div className="mt-3 space-y-1 text-xs font-mono bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-md text-zinc-500 text-left max-w-xs">
          <p className="text-zinc-400">Example:</p>
          <p>init(dashboard_url=</p>
          <p className="pl-2">&quot;http://localhost:7777&quot;)</p>
        </div>
      </div>
    )
  }

  const sessionComplete = events.some(e => e.stage === "session_complete")
  const genEvent = events.find(e => e.stage === "generate")
  const totalMs = events
    .filter(e => e.stage !== "session_complete" && e.duration_ms)
    .reduce((sum, e) => sum + (e.duration_ms ?? 0), 0)
  const chunkCount = events
    .filter(e => e.chunks)
    .reduce((sum, e) => sum + (e.chunks?.length ?? 0), 0)
  const grounding = genEvent?.grounding_scores
    ? genEvent.grounding_scores.filter(g => g.grounded).length / genEvent.grounding_scores.length
    : null

  return (
    <div className="space-y-4">
      {traceId && events.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs font-mono">
          <p className="text-zinc-500 mb-1">Waiting for pipeline events…</p>
          <p className="text-zinc-600">trace_id: <span className="text-orange-400">{traceId}</span></p>
          <p className="text-zinc-700 mt-1">
            In your pipeline, call: new_trace(trace_id=&quot;{traceId}&quot;)
          </p>
        </div>
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

      {traceId && (
        <p className="text-[10px] text-zinc-600 font-mono">
          trace: {traceId}
        </p>
      )}
    </div>
  )
}
