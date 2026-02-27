"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import type { RAGEvent, ChunkScore, GroundingData, EmbeddingData, RAGStage } from "@/lib/types"
import PipelineTimeline from "@/components/PipelineTimeline"
import ChunkWaterfall from "@/components/ChunkWaterfall"
import ChunkCard from "@/components/ChunkCard"
import GroundingHighlighter from "@/components/GroundingHighlighter"
import EmbeddingScatter from "@/components/EmbeddingScatter"
import ChunkScoreTable from "@/components/trace/ChunkScoreTable"
import StageMetaPanel from "@/components/trace/StageMetaPanel"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Share2, ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const STAGE_COLORS: Record<string, string> = {
  embed: "bg-orange-500",
  retrieve: "bg-yellow-500",
  rerank: "bg-violet-500",
  generate: "bg-emerald-500",
}

export default function TraceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const traceId = params.traceId as string

  const [events, setEvents] = useState<RAGEvent[]>([])
  const [grounding, setGrounding] = useState<GroundingData | null>(null)
  const [embeddings, setEmbeddings] = useState<EmbeddingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [groundingLoading, setGroundingLoading] = useState(true)
  const [selectedChunk, setSelectedChunk] = useState<ChunkScore | null>(null)
  const [activeTab, setActiveTab] = useState<string>("embed")
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([api.traces.get(traceId), api.traces.embeddings(traceId)])
      .then(([trace, emb]) => {
        setEvents(trace.events || [])
        setEmbeddings(emb)
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load trace data")
        setLoading(false)
      })

    api.traces
      .grounding(traceId)
      .then((g) => {
        setGrounding(g)
        setGroundingLoading(false)
      })
      .catch(() => setGroundingLoading(false))
  }, [traceId])

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
    toast.success("Link copied to clipboard")
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return

      if (e.key === "Escape") {
        router.push("/traces")
        return
      }
      if (e.key === "c" && !e.metaKey) {
        navigator.clipboard.writeText(traceId)
        return
      }

      const stages: RAGStage[] = ["embed", "retrieve", "rerank", "generate"]
      const enabledStages = stages.filter((s) => events.some((e) => e.stage === s))
      const currentIdx = enabledStages.indexOf(activeTab as RAGStage)

      if (e.key === "ArrowRight" && currentIdx < enabledStages.length - 1) {
        setActiveTab(enabledStages[currentIdx + 1])
      }
      if (e.key === "ArrowLeft" && currentIdx > 0) {
        setActiveTab(enabledStages[currentIdx - 1])
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [activeTab, router, traceId])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="mb-3 h-8 w-8 text-zinc-600" />
        <p className="text-sm text-zinc-400">{error || "Trace not found"}</p>
        <p className="mt-1 font-mono text-xs text-zinc-600">ID: {traceId}</p>
        <Button variant="ghost" size="sm" onClick={() => router.push("/traces")} className="mt-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to traces
        </Button>
      </div>
    )
  }

  const queryText = events.find((e) => e.query_text)?.query_text ?? "Unknown query"
  const generatedAnswer = events.find((e) => e.stage === "generate")?.generated_answer
  const allChunks: ChunkScore[] = []
  events.forEach((e) => {
    if (e.chunks) {
      try {
        const parsed = typeof e.chunks === "string" ? JSON.parse(e.chunks as unknown as string) : e.chunks
        if (Array.isArray(parsed)) allChunks.push(...parsed)
      } catch {
        /* ignore */
      }
    }
  })
  const uniqueChunks = allChunks.filter((c, i, arr) => arr.findIndex((a) => a.chunk_id === c.chunk_id) === i)

  const stages: RAGStage[] = ["embed", "retrieve", "rerank", "generate"]
  const activeEvent = events.find((e) => e.stage === activeTab)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
            <button onClick={() => router.push("/traces")} className="transition-colors hover:text-zinc-300">
              Traces
            </button>
            <span>/</span>
            <span className="font-mono text-zinc-400">{traceId.slice(0, 8)}</span>
          </div>
          <h1 className="text-xl leading-tight font-semibold text-zinc-100">
            {queryText.slice(0, 80)}
            {queryText.length > 80 ? "…" : ""}
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare} className="shrink-0">
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share
        </Button>
      </div>

      {/* Pipeline Timeline */}
      <Card className="p-4">
        <PipelineTimeline events={events} onStageClick={(stage) => setActiveTab(stage)} />
      </Card>

      {/* Query & Answer */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-2 text-xs font-medium tracking-wider text-zinc-500 uppercase">Query</h3>
          <p className="text-sm leading-relaxed text-zinc-200">{queryText}</p>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 text-xs font-medium tracking-wider text-zinc-500 uppercase">Generated Answer</h3>
          {generatedAnswer && grounding?.available && grounding.grounding ? (
            <GroundingHighlighter
              answer={generatedAnswer}
              grounding={grounding.grounding}
              chunks={uniqueChunks}
              onSentenceHover={setHighlightedChunkId}
            />
          ) : groundingLoading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Computing grounding scores…
            </div>
          ) : (
            <p className="text-sm text-zinc-400">{generatedAnswer || "No answer generated"}</p>
          )}
        </Card>
      </div>

      {/* Stage Tabs */}
      <Card className="overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-zinc-800 px-4">
            <TabsList className="h-auto gap-0 bg-transparent p-0">
              {stages.map((stage) => {
                const ev = events.find((e) => e.stage === stage)
                return (
                  <TabsTrigger
                    key={stage}
                    value={stage}
                    disabled={!ev}
                    className="relative gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm data-[state=active]:border-orange-500 data-[state=active]:bg-transparent"
                  >
                    <span className={cn("h-2 w-2 rounded-full", STAGE_COLORS[stage])} />
                    <span className="capitalize">{stage}</span>
                    {ev?.duration_ms != null && (
                      <span className="font-mono text-[10px] text-zinc-600">{ev.duration_ms.toFixed(0)}ms</span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {stages.map((stage) => {
            const ev = events.find((e) => e.stage === stage)
            return (
              <TabsContent key={stage} value={stage} className="mt-0 space-y-4 p-4">
                {ev ? (
                  <>
                    {ev.error && (
                      <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                        <AlertCircle className="mr-2 inline h-4 w-4" />
                        {ev.error}
                      </div>
                    )}

                    <StageMetaPanel event={ev} />

                    {stage === "retrieve" && uniqueChunks.length > 0 && (
                      <div className="space-y-4">
                        <ChunkWaterfall chunks={uniqueChunks} onChunkClick={setSelectedChunk} />
                        {selectedChunk && (
                          <ChunkCard
                            chunk={selectedChunk}
                            highlighted={highlightedChunkId === selectedChunk.chunk_id}
                          />
                        )}
                      </div>
                    )}

                    {stage === "rerank" && <ChunkScoreTable chunks={uniqueChunks} />}

                    {stage === "generate" && generatedAnswer && grounding?.available && grounding.grounding && (
                      <div className="space-y-4">
                        <GroundingHighlighter
                          answer={generatedAnswer}
                          grounding={grounding.grounding}
                          chunks={uniqueChunks}
                          onSentenceHover={setHighlightedChunkId}
                        />
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-zinc-800">
                                <th className="px-3 py-2 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                                  #
                                </th>
                                <th className="px-3 py-2 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                                  Sentence
                                </th>
                                <th className="w-20 px-3 py-2 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                                  Score
                                </th>
                                <th className="w-24 px-3 py-2 text-left text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
                                  Source
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {grounding.grounding.map((g, i) => (
                                <tr
                                  key={i}
                                  className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30"
                                >
                                  <td className="px-3 py-2 text-xs text-zinc-600">{i + 1}</td>
                                  <td className="max-w-md truncate px-3 py-2 text-xs text-zinc-400">{g.sentence}</td>
                                  <td className="px-3 py-2">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "font-mono text-[10px]",
                                        g.grounded
                                          ? "border-emerald-500/20 text-emerald-400"
                                          : "border-red-500/20 text-red-400",
                                      )}
                                    >
                                      {(g.score * 100).toFixed(0)}%
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[10px] text-zinc-600">
                                    {g.source_chunk_id ? (
                                      <button
                                        onClick={() => {
                                          setActiveTab("retrieve")
                                          const chunk = uniqueChunks.find((c) => c.chunk_id === g.source_chunk_id)
                                          if (chunk) setSelectedChunk(chunk)
                                        }}
                                        className="text-orange-400 transition-colors hover:text-orange-300"
                                      >
                                        {g.source_chunk_id.slice(0, 10)}
                                      </button>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <details className="text-xs">
                      <summary className="mb-2 cursor-pointer text-zinc-600 transition-colors hover:text-zinc-400">
                        Raw Event Data
                      </summary>
                      <pre className="max-h-64 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] text-zinc-500">
                        {JSON.stringify(ev, null, 2)}
                      </pre>
                    </details>
                  </>
                ) : (
                  <div className="py-8 text-center text-sm text-zinc-600">No data for this stage</div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </Card>

      {/* Embedding Scatter */}
      {embeddings?.available && (
        <Card className="p-4">
          <h3 className="mb-4 text-xs font-medium tracking-wider text-zinc-500 uppercase">Embedding Space (UMAP)</h3>
          <EmbeddingScatter
            queryVector={embeddings.query_vector ?? null}
            chunkVectors={uniqueChunks
              .filter(() => embeddings.query_vector)
              .map((c) => ({
                vector: Array(embeddings.query_vector?.length ?? 0)
                  .fill(0)
                  .map(() => Math.random()),
                chunk_id: c.chunk_id,
                text: c.text,
              }))}
          />
        </Card>
      )}
    </motion.div>
  )
}
