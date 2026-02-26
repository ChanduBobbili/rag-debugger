"use client"

import { motion } from "framer-motion"
import type { QuerySession } from "@/lib/types"
import TraceRow from "@/components/home/TraceRow"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
  traces: QuerySession[]
  loading?: boolean
}

export default function TraceList({ traces, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (!traces.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-zinc-800 rounded-xl">
        <div className="text-2xl mb-3 opacity-40">◎</div>
        <p className="text-sm text-zinc-400">No traces yet</p>
        <p className="text-xs text-zinc-600 mt-1">
          Instrument your RAG pipeline with the SDK to see traces here
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800/50">
      {traces.map((trace, i) => (
        <motion.div
          key={trace.query_id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <TraceRow trace={trace} />
        </motion.div>
      ))}
    </div>
  )
}
