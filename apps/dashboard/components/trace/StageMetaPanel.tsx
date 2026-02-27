"use client"

import type { ChunkScore, RAGEvent } from "@/lib/types"
import { Card } from "@/components/ui/card"

interface Props {
  event: RAGEvent
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-3">
      <p className="mb-1 text-[10px] tracking-wider text-zinc-500 uppercase">{label}</p>
      <p className="font-mono text-lg font-semibold text-zinc-200">{value}</p>
    </Card>
  )
}

export default function StageMetaPanel({ event }: Props) {
  const meta = event.metadata ?? {}

  if (event.stage === "embed") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <MetaItem label="Model" value={String(meta.model || "text-emb-3-small")} />
        <MetaItem label="Dimensions" value={String(meta.dimensions || event.query_vector?.length || "—")} />
        <MetaItem label="Duration" value={`${event.duration_ms?.toFixed(0) ?? "—"}ms`} />
        <MetaItem label="Vector Norm" value={String(meta.norm || "1.000")} />
      </div>
    )
  }

  if (event.stage === "retrieve") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <MetaItem label="Chunks Retrieved" value={String(event.chunks?.length ?? meta.chunk_count ?? "—")} />
        <MetaItem label="Duration" value={`${event.duration_ms?.toFixed(0) ?? "—"}ms`} />
        <MetaItem label="Index Type" value={String(meta.index_type || "vector")} />
        <MetaItem
          label="Top Score"
          value={
            event.chunks?.length
              ? Math.max(...(event?.chunks?.map?.((c: ChunkScore) => c?.cosine_score ?? 0) ?? [])).toFixed(3)
              : "—"
          }
        />
      </div>
    )
  }

  if (event.stage === "generate") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <MetaItem label="Duration" value={`${event.duration_ms?.toFixed(0) ?? "—"}ms`} />
        <MetaItem label="Answer Length" value={`${event.generated_answer?.length ?? 0} chars`} />
        <MetaItem label="Model" value={String(meta.model || "gpt-4")} />
        <MetaItem label="Tokens" value={String(meta.tokens || "—")} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <MetaItem label="Duration" value={`${event.duration_ms?.toFixed(0) ?? "—"}ms`} />
      <MetaItem label="Stage" value={event.stage} />
    </div>
  )
}
