"use client"

import type { RAGEvent } from "@/lib/types"
import ResultsPanel from "./ResultsPanel"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { PlaygroundConfig } from "./ConfigPanel"

interface CompareResultsProps {
  traceIdA: string | null
  traceIdB: string | null
  eventsA: RAGEvent[]
  eventsB: RAGEvent[]
  connectedA: boolean
  connectedB: boolean
  configA: PlaygroundConfig
  configB: PlaygroundConfig
}

function getStats(events: RAGEvent[]) {
  const totalMs = events
    .filter((e) => e.stage !== "session_complete" && e.duration_ms)
    .reduce((sum, e) => sum + (e.duration_ms ?? 0), 0)
  const genEvent = events.find((e) => e.stage === "generate")
  const grounding = genEvent?.grounding_scores
    ? genEvent.grounding_scores.filter((g) => g.grounded).length / genEvent.grounding_scores.length
    : null
  return { totalMs, grounding }
}

/* ---------- Task F: Winner badges with tooltips ---------- */
function GroundingBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className="cursor-help bg-emerald-500/10 text-[9px] text-emerald-400">
          Winner: Grounding
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs border-zinc-700 bg-zinc-800 text-xs text-zinc-300">
        This config produced more sentences supported by retrieved context (higher grounding score).
      </TooltipContent>
    </Tooltip>
  )
}

function LatencyBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className="cursor-help bg-violet-500/10 text-[9px] text-violet-400">
          Winner: Latency
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs border-zinc-700 bg-zinc-800 text-xs text-zinc-300">
        This config completed the full pipeline faster (lower total duration).
      </TooltipContent>
    </Tooltip>
  )
}

export default function CompareResults({
  traceIdA,
  traceIdB,
  eventsA,
  eventsB,
  connectedA,
  connectedB,
  configA,
  configB,
}: CompareResultsProps) {
  const statsA = getStats(eventsA)
  const statsB = getStats(eventsB)
  const bothDone =
    eventsA.some((e) => e.stage === "session_complete") && eventsB.some((e) => e.stage === "session_complete")

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            Config A
          </Badge>
          <span className="text-[10px] text-zinc-600">
            k={configA.k}, {configA.model.split("-").pop()}
          </span>
          {bothDone && statsA.grounding != null && statsB.grounding != null && statsA.grounding > statsB.grounding && (
            <GroundingBadge />
          )}
          {bothDone && statsA.totalMs < statsB.totalMs && statsA.totalMs > 0 && <LatencyBadge />}
        </div>
        <ResultsPanel traceId={traceIdA} events={eventsA} connected={connectedA} />
      </div>
      <div className="space-y-2">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            Config B
          </Badge>
          <span className="text-[10px] text-zinc-600">
            k={configB.k}, {configB.model.split("-").pop()}
          </span>
          {bothDone && statsB.grounding != null && statsA.grounding != null && statsB.grounding > statsA.grounding && (
            <GroundingBadge />
          )}
          {bothDone && statsB.totalMs < statsA.totalMs && statsB.totalMs > 0 && <LatencyBadge />}
        </div>
        <ResultsPanel traceId={traceIdB} events={eventsB} connected={connectedB} />
      </div>
    </div>
  )
}
