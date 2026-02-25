"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { api } from "@/lib/api"
import type {
  RAGEvent,
  ChunkScore,
  GroundingData,
  EmbeddingData,
  RAGStage,
} from "@/lib/types"
import PipelineTimeline from "@/components/PipelineTimeline"
import ChunkWaterfall from "@/components/ChunkWaterfall"
import ChunkCard from "@/components/ChunkCard"
import GroundingHighlighter from "@/components/GroundingHighlighter"
import EmbeddingScatter from "@/components/EmbeddingScatter"

export default function TraceDetailPage() {
  const params = useParams()
  const traceId = params.traceId as string

  const [events, setEvents] = useState<RAGEvent[]>([])
  const [grounding, setGrounding] = useState<GroundingData | null>(null)
  const [embeddings, setEmbeddings] = useState<EmbeddingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChunk, setSelectedChunk] = useState<ChunkScore | null>(null)
  const [activeTab, setActiveTab] = useState<string>("embed")
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(
    null,
  )

  useEffect(() => {
    async function load() {
      try {
        const [traceData, groundingData, embeddingData] = await Promise.all([
          api.traces.get(traceId),
          api.traces.grounding(traceId),
          api.traces.embeddings(traceId),
        ])
        setEvents(traceData.events || [])
        setGrounding(groundingData)
        setEmbeddings(embeddingData)
      } catch (e) {
        console.error("Failed to load trace:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [traceId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-64 w-full" />
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="text-3xl mb-3">◎</div>
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Trace not found
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
          Trace ID: {traceId}
        </div>
      </div>
    )
  }

  // Extract data from events
  const queryText =
    events.find((e) => e.query_text)?.query_text ?? "Unknown query"
  const generatedAnswer =
    events.find((e) => e.stage === "generate")?.generated_answer
  const allChunks: ChunkScore[] = []
  events.forEach((e) => {
    if (e.chunks) {
      try {
        const parsed =
          typeof e.chunks === "string" ? JSON.parse(e.chunks) : e.chunks
        if (Array.isArray(parsed)) allChunks.push(...parsed)
      } catch {
        // ignore parse errors
      }
    }
  })
  const uniqueChunks = allChunks.filter(
    (c, i, arr) => arr.findIndex((a) => a.chunk_id === c.chunk_id) === i,
  )

  const stages: RAGStage[] = ["embed", "retrieve", "rerank", "generate"]
  const activeEvent = events.find((e) => e.stage === activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--muted)" }}>
          <span>Trace</span>
          <span>·</span>
          <span className="font-mono">{traceId.slice(0, 8)}…</span>
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          {queryText.slice(0, 80)}
          {queryText.length > 80 ? "…" : ""}
        </h1>
      </div>

      {/* Panel A — Pipeline Timeline */}
      <div
        className="rounded-lg border p-4"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <PipelineTimeline
          events={events}
          onStageClick={(stage) => setActiveTab(stage)}
        />
      </div>

      {/* Panel B — Query & Answer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold mb-3"
            style={{ color: "var(--muted)" }}
          >
            Query
          </h3>
          <p className="text-sm">{queryText}</p>
        </div>

        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold mb-3"
            style={{ color: "var(--muted)" }}
          >
            Generated Answer
          </h3>
          {generatedAnswer && grounding?.available && grounding.grounding ? (
            <GroundingHighlighter
              answer={generatedAnswer}
              grounding={grounding.grounding}
              chunks={uniqueChunks}
              onSentenceHover={setHighlightedChunkId}
            />
          ) : (
            <p className="text-sm" style={{ color: "var(--text)" }}>
              {generatedAnswer || "No answer generated"}
            </p>
          )}
        </div>
      </div>

      {/* Panel C — Chunk Scoring Waterfall */}
      {uniqueChunks.length > 0 && (
        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: "var(--muted)" }}
          >
            Chunk Score Waterfall
          </h3>
          <ChunkWaterfall
            chunks={uniqueChunks}
            onChunkClick={setSelectedChunk}
          />
          {selectedChunk && (
            <div className="mt-4">
              <ChunkCard
                chunk={selectedChunk}
                highlighted={
                  highlightedChunkId === selectedChunk.chunk_id
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Panel D — Embedding Scatter */}
      {embeddings?.available && (
        <div
          className="rounded-lg border p-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold mb-4"
            style={{ color: "var(--muted)" }}
          >
            Embedding Space (UMAP)
          </h3>
          <EmbeddingScatter
            queryVector={embeddings.query_vector ?? null}
            chunkVectors={
              uniqueChunks
                .filter(() => embeddings.query_vector)
                .map((c) => ({
                  vector: Array(embeddings.query_vector?.length ?? 0)
                    .fill(0)
                    .map(() => Math.random()),
                  chunk_id: c.chunk_id,
                  text: c.text,
                }))
            }
          />
        </div>
      )}

      {/* Panel E — Stage Details (tabbed) */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          {stages.map((stage) => {
            const hasEvent = events.some((e) => e.stage === stage)
            return (
              <button
                key={stage}
                onClick={() => setActiveTab(stage)}
                className="px-4 py-2 text-sm font-mono transition-colors"
                style={{
                  color:
                    activeTab === stage
                      ? "var(--rag)"
                      : hasEvent
                        ? "var(--text)"
                        : "var(--muted)",
                  borderBottom:
                    activeTab === stage ? "2px solid var(--rag)" : "2px solid transparent",
                  opacity: hasEvent ? 1 : 0.5,
                }}
              >
                {stage}
              </button>
            )
          })}
        </div>

        <div className="p-4">
          {activeEvent ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <span
                  className="text-xs px-2 py-1 rounded font-mono"
                  style={{
                    background: "rgba(167,139,250,0.1)",
                    color: "var(--trace)",
                  }}
                >
                  {activeEvent.duration_ms?.toFixed(0)}ms
                </span>
                {activeEvent.error && (
                  <span
                    className="text-xs px-2 py-1 rounded font-mono"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      color: "#ef4444",
                    }}
                  >
                    Error: {activeEvent.error}
                  </span>
                )}
              </div>

              <details open className="text-xs">
                <summary
                  className="cursor-pointer mb-2 hover:underline"
                  style={{ color: "var(--muted)" }}
                >
                  Raw Event Data
                </summary>
                <pre
                  className="p-3 rounded overflow-x-auto max-h-64"
                  style={{
                    background: "var(--surface2)",
                    color: "var(--muted)",
                  }}
                >
                  {JSON.stringify(activeEvent, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>
              No data for this stage
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
