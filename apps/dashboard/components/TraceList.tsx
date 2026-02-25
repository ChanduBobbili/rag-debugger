"use client"
import Link from "next/link"
import type { QuerySession } from "@/lib/types"
import { format } from "date-fns"

interface Props {
  traces: QuerySession[]
  loading?: boolean
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return (
      <span
        className="font-mono tabular"
        style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4,
          background: "var(--surface2)", color: "var(--muted)" }}
      >—</span>
    )
  }
  const cls = score >= 0.75 ? "score-high" : score >= 0.5 ? "score-mid" : "score-low"
  return (
    <span className={`font-mono ${cls}`} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4 }}>
      {score.toFixed(2)}
    </span>
  )
}

const STAGE_ABBR: Record<string, string> = {
  embed: "E", retrieve: "R", rerank: "RR", generate: "G",
}
const STAGE_CLASS: Record<string, string> = {
  embed: "stage-embed", retrieve: "stage-retrieve",
  rerank: "stage-rerank", generate: "stage-generate",
}

function StagePills({ count }: { count: number }) {
  const stages = count >= 4
    ? ["embed","retrieve","rerank","generate"]
    : count >= 3
    ? ["embed","retrieve","generate"]
    : ["embed","generate"]
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {stages.map(s => (
        <span key={s} className={`stage-pill ${STAGE_CLASS[s]}`}>
          {STAGE_ABBR[s]}
        </span>
      ))}
    </div>
  )
}

export default function TraceList({ traces, loading }: Props) {
  if (loading) {
    return (
      <div className="card" style={{ padding: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 44, marginBottom: 6 }} />
        ))}
      </div>
    )
  }

  if (!traces.length) {
    return (
      <div
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "48px 24px", textAlign: "center",
          border: "1px dashed var(--border2)", borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>◉</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 4 }}>No traces yet</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          Instrument your RAG pipeline with the SDK to see traces here
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--bg2)" }}>
            {["", "Query", "Grounding", "Stages", "Chunks", "Latency", "Time"].map(h => (
              <th key={h} style={{
                textAlign: "left", padding: "8px 12px",
                fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase",
                color: "var(--muted)", borderBottom: "1px solid var(--border)",
                fontFamily: "'JetBrains Mono', monospace",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {traces.map((trace) => (
            <Link key={trace.query_id} href={`/traces/${trace.trace_id}`} className="contents">
              <tr
                style={{ cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.015)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(30,30,50,0.7)", width: 24 }}>
                  <span
                    className={`status-dot ${trace.has_error ? "status-err" : "status-ok"}`}
                    style={{ display: "inline-block" }}
                  />
                </td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(30,30,50,0.7)", maxWidth: 280 }}>
                  <div style={{ fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {trace.query_text || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>
                    {trace.trace_id.slice(0, 8)}…
                  </div>
                </td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(30,30,50,0.7)" }}>
                  <ScoreBadge score={trace.overall_grounding_score} />
                </td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(30,30,50,0.7)" }}>
                  <StagePills count={trace.stage_count ?? 0} />
                </td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(30,30,50,0.7)", fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                  {trace.chunk_count ?? "—"}
                </td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(30,30,50,0.7)", fontSize: 11, color: trace.total_duration_ms && trace.total_duration_ms > 10000 ? "var(--red)" : "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                  {trace.total_duration_ms ? `${trace.total_duration_ms.toFixed(0)}ms` : "—"}
                </td>
                <td style={{ padding: "10px 12px", borderBottom: "1px solid rgba(30,30,50,0.7)", fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {trace.created_at ? format(new Date(trace.created_at), "MMM d, HH:mm") : "—"}
                </td>
              </tr>
            </Link>
          ))}
        </tbody>
      </table>
    </div>
  )
}
