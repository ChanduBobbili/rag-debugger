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
        setTraces((prev) => (offset === 0 ? data : [...prev, ...data]))
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

  useEffect(() => {
    setOffset(0)
  }, [filter])

  const filtered = search
    ? traces.filter((t) => t.query_text?.toLowerCase().includes(search.toLowerCase()) || t.trace_id.includes(search))
    : filter === "low"
      ? traces.filter((t) => t.overall_grounding_score !== null && t.overall_grounding_score < 0.5)
      : traces

  const FILTERS: { id: FilterType; label: string; icon?: React.ReactNode }[] = [
    { id: "all", label: "All" },
    { id: "errors", label: "Errors", icon: <AlertCircle className="mr-1 h-3 w-3" /> },
    { id: "low", label: "Low grounding < 0.5" },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      {/* Filter bar */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-zinc-800 px-4 backdrop-blur-sm lg:-mx-6 lg:px-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Traces</h1>
            <p className="font-mono text-xs text-zinc-500">{traces.length} total recorded</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search queries or trace IDs…"
              className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-9 text-sm text-zinc-200 transition-colors outline-none placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-600"
            />
          </div>
          {FILTERS.map((f) => (
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
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
          className="mt-3 w-full rounded-lg border border-dashed border-zinc-800 py-2 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Load more traces
        </button>
      )}
    </motion.div>
  )
}
