"use client"
import { useState } from "react"
import { useTraceStream } from "@/hooks/useTraceStream"
import LiveQueryPanel from "@/components/LiveQueryPanel"
import PipelineTimeline from "@/components/PipelineTimeline"

export default function PlaygroundPage() {
  const [query, setQuery] = useState("")
  const [k, setK] = useState(10)
  const [traceId, setTraceId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const { events, connected } = useTraceStream(traceId)

  const runQuery = async () => {
    if (!query.trim()) return

    setIsRunning(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7777"}/playground/query`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            k,
            chunk_size: 512,
            embedding_model: "text-embedding-3-small",
          }),
        },
      )
      const data = await res.json()
      setTraceId(data.trace_id)
    } catch (e) {
      console.error("Playground query failed:", e)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-3xl font-bold mb-1"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          Playground
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Test queries against your RAG pipeline in real time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div
          className="rounded-lg border p-4 space-y-4"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <h3
            className="text-sm font-bold"
            style={{ color: "var(--muted)" }}
          >
            Configuration
          </h3>

          <div className="space-y-2">
            <label className="text-xs" style={{ color: "var(--muted)" }}>
              Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What is retrieval augmented generation?"
              className="w-full p-3 rounded text-sm resize-none"
              rows={4}
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs" style={{ color: "var(--muted)" }}>
              Top-K: {k}
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs" style={{ color: "var(--muted)" }}>
              Embedding Model
            </label>
            <select
              className="w-full p-2 rounded text-sm"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <option>text-embedding-3-small</option>
              <option>text-embedding-3-large</option>
              <option>text-embedding-ada-002</option>
            </select>
          </div>

          <button
            onClick={runQuery}
            disabled={isRunning || !query.trim()}
            className="w-full py-2 rounded text-sm font-bold transition-all"
            style={{
              background: isRunning ? "var(--surface2)" : "var(--rag)",
              color: isRunning ? "var(--muted)" : "#0a0a0f",
              opacity: !query.trim() ? 0.5 : 1,
            }}
          >
            {isRunning ? "Running…" : "Run Query"}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {traceId ? (
            <>
              <div className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                Trace: {traceId}
              </div>

              {events.length > 0 && (
                <div
                  className="rounded-lg border p-4"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                  }}
                >
                  <PipelineTimeline events={events} />
                </div>
              )}

              <LiveQueryPanel events={events} connected={connected} />
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-lg border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="text-3xl mb-3">◷</div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>
                Enter a query and click &quot;Run Query&quot; to start
              </div>
              <div className="text-xs mt-2 max-w-md text-center" style={{ color: "var(--muted)" }}>
                Your RAG pipeline must be running and instrumented with the SDK
                to receive live events
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
