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
          body: JSON.stringify({ query: query.trim(), k, chunk_size: 512, embedding_model: "text-embedding-3-small" }),
        }
      )
      const data = await res.json()
      setTraceId(data.trace_id)
    } catch (e) { console.error(e) }
    finally { setIsRunning(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>Playground</div>
        <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>Test queries against your live RAG pipeline in real time</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>
        {/* Config */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Configuration</span></div>
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>Query</div>
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="What is retrieval augmented generation?"
                  rows={4}
                  style={{
                    width: "100%", background: "var(--bg2)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: 10, fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12, color: "var(--text)", resize: "vertical", outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--rag)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border)")}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>
                  Top-K: <span style={{ color: "var(--rag)" }}>{k}</span>
                </div>
                <input type="range" min="1" max="50" value={k}
                  onChange={e => setK(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--rag)" }} />
              </div>
              {[
                { label: "Embedding Model", options: ["text-embedding-3-small","text-embedding-3-large","text-embedding-ada-002"] },
                { label: "Chunk Size", options: ["256 tokens","512 tokens","1024 tokens"] },
              ].map(({ label, options }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
                  <select style={{
                    width: "100%", background: "var(--bg2)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "7px 10px", fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, color: "var(--text)", outline: "none",
                  }}>
                    {options.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <button
                onClick={runQuery}
                disabled={isRunning || !query.trim()}
                style={{
                  background: isRunning ? "var(--surface2)" : "var(--rag)",
                  color: isRunning ? "var(--muted)" : "#fff",
                  border: "none", borderRadius: 6, padding: "10px",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                  cursor: isRunning || !query.trim() ? "not-allowed" : "pointer",
                  opacity: !query.trim() ? 0.5 : 1, transition: "all 0.15s",
                  letterSpacing: "0.05em",
                }}
              >
                {isRunning ? "Running…" : "▷ Run Query"}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {traceId ? (
            <>
              {events.length > 0 && (
                <div className="card" style={{ padding: 16 }}>
                  <PipelineTimeline events={events} />
                </div>
              )}
              <LiveQueryPanel events={events} connected={connected} />
              <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                trace: {traceId}
              </div>
            </>
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", flex: 1, minHeight: 300,
              border: "1px dashed var(--border2)", borderRadius: 10,
            }}>
              <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>▷</div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 6 }}>Ready to run</div>
              <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", maxWidth: 360 }}>
                Enter a query and click Run Query to stream live events from your RAG pipeline
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
