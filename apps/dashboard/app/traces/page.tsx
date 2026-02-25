"use client"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { QuerySession } from "@/lib/types"
import TraceList from "@/components/TraceList"

export default function TracesPage() {
  const [traces, setTraces] = useState<QuerySession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "errors" | "low">("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await api.traces.list({
          limit: 100,
          has_error: filter === "errors" ? true : undefined,
          min_grounding: filter === "low" ? undefined : undefined,
        })
        setTraces(data)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [filter])

  const filtered = search
    ? traces.filter(t => t.query_text?.toLowerCase().includes(search.toLowerCase()) || t.trace_id.includes(search))
    : traces

  const FILTERS: { id: typeof filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "errors", label: "Errors only" },
    { id: "low", label: "Low grounding" },
  ]

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 2 }}>Traces</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{traces.length} total recorded</div>
        </div>
        <button style={{
          padding: "5px 12px", borderRadius: 5, fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace", cursor: "pointer",
          border: "1px solid var(--border2)", background: "var(--surface2)", color: "var(--text2)",
        }}>⬇ Export CSV</button>
      </div>

      {/* Filter bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", background: "var(--surface2)",
        border: "1px solid var(--border)", borderRadius: 8, marginBottom: 14,
      }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>⌕</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search queries or trace IDs…"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "var(--text)", minWidth: 0,
          }}
        />
        <div style={{ width: 1, height: 16, background: "var(--border2)", flexShrink: 0 }} />
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`chip${filter === f.id ? " active" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <TraceList traces={filtered} loading={loading} />
    </div>
  )
}
