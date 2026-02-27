"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import type { QuerySession } from "@/lib/types"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

export default function CommandSearch() {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<QuerySession[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const loadTraces = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.traces.list({ limit: 10 })
      setResults(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadTraces()
  }, [open, loadTraces])

  const scoreColor = (s: number | null) => {
    if (s === null) return "text-zinc-500"
    if (s >= 0.75) return "text-emerald-400"
    if (s >= 0.5) return "text-yellow-400"
    return "text-red-400"
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search traces..." />
      <CommandList>
        <CommandEmpty>{loading ? "Searching..." : "No results found."}</CommandEmpty>
        <CommandGroup heading="Recent Traces">
          {results.map((trace) => (
            <CommandItem
              key={trace.query_id}
              value={trace.query_text || trace.trace_id}
              onSelect={() => {
                router.push(`/traces/${trace.trace_id}`)
                setOpen(false)
              }}
              className="flex cursor-pointer items-center gap-3"
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${trace.has_error ? "bg-red-500" : "bg-emerald-500"}`}
              />
              <span className="flex-1 truncate text-sm">{(trace.query_text || "Unknown query").slice(0, 60)}</span>
              {trace.overall_grounding_score !== null && (
                <Badge
                  variant="secondary"
                  className={`font-mono text-[10px] ${scoreColor(trace.overall_grounding_score)}`}
                >
                  {trace.overall_grounding_score.toFixed(2)}
                </Badge>
              )}
              <span className="shrink-0 font-mono text-[10px] text-zinc-500">
                {trace.created_at ? formatDistanceToNow(new Date(trace.created_at), { addSuffix: true }) : ""}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
