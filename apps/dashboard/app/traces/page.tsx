"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { api } from "@/lib/api"
import type { QuerySession } from "@/lib/types"
import TraceList from "@/components/TraceList"
import { Search, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FilterType = "all" | "errors" | "low"

const PAGE_SIZE = 50

export default function TracesPage() {
  const [traces, setTraces] = useState<QuerySession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>("all")
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.traces.list({
          limit: PAGE_SIZE,
          offset,
          has_error: filter === "errors" ? true : undefined,
        })
        setTraces(prev => offset === 0 ? data : [...prev, ...data])
        setHasMore(data.length === PAGE_SIZE)
      } catch (e) {
        setError("Failed to load traces. Is the server running at localhost:7777?")
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [filter, offset])

  useEffect(() => { setOffset(0) }, [filter])

  const filtered = search
    ? traces.filter(t =>
        t.query_text?.toLowerCase().includes(search.toLowerCase()) ||
        t.trace_id.includes(search)
      )
    : filter === "low"
      ? traces.filter(t => t.overall_grounding_score !== null && t.overall_grounding_score < 0.5)
      : traces

  const FILTERS: { id: FilterType; label: string; icon?: React.ReactNode }[] = [
    { id: "all", label: "All" },
    { id: "errors", label: "Errors", icon: <AlertCircle className="h-3 w-3 mr-1" /> },
    { id: "low", label: "Low grounding < 0.5" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Filter bar */}
      <div className="sticky top-0 z-10 backdrop-blur-sm border-b border-zinc-800 mb-4 -mx-4 lg:-mx-6 px-4 lg:px-6">
        <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Traces</h1>
          <p className="text-xs text-zinc-500 font-mono">{traces.length} total recorded</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400 mb-4">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          {error}
        </div>
      )}
        
        <div className="flex items-center gap-2 py-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search queries or trace IDs…"
              className="w-full pl-9 h-9 bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 transition-colors"
            />
          </div>
          {FILTERS.map(f => (
            <Button
              key={f.id}
              variant={filter === f.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f.id)}
              className={cn(filter === f.id && "text-zinc-100")}
            >
              {f.icon}
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <TraceList traces={filtered} loading={loading} />

      {hasMore && !loading && (
        <button
          onClick={() => setOffset(o => o + PAGE_SIZE)}
          className="w-full mt-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors border border-dashed border-zinc-800 rounded-lg"
        >
          Load more traces
        </button>
      )}
    </motion.div>
  )
}
