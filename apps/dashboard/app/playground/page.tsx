"use client"

import { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTraceStream } from "@/hooks/useTraceStream"
import { getBase } from "@/lib/api"
import { Hexagon, X } from "lucide-react"
import ConfigPanel, { type PlaygroundConfig, type PlaygroundRun } from "@/components/playground/ConfigPanel"
import ResultsPanel from "@/components/playground/ResultsPanel"
import CompareResults from "@/components/playground/CompareResults"

const DEFAULT_CONFIG: PlaygroundConfig = {
  k: 10,
  model: "text-embedding-3-small",
  chunkSize: "512 tokens",
}

const LS_KEY = "rag-playground-history"
const ONBOARDING_KEY = "rag-playground-onboarding-dismissed"

function loadHistory(): PlaygroundRun[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(runs: PlaygroundRun[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(runs.slice(0, 10)))
  } catch {
    /* ignore */
  }
}

export default function PlaygroundPage() {
  const [mode, setMode] = useState<"single" | "compare">("single")
  const [query, setQuery] = useState("")
  const [configA, setConfigA] = useState<PlaygroundConfig>({ ...DEFAULT_CONFIG })
  const [configB, setConfigB] = useState<PlaygroundConfig>({ ...DEFAULT_CONFIG, k: 20 })
  const [traceIdA, setTraceIdA] = useState<string | null>(null)
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [traceIdB, setTraceIdB] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [history, setHistory] = useState<PlaygroundRun[]>([])
  const [showOnboarding, setShowOnboarding] = useState(false)

  const streamA = useTraceStream(traceIdA)
  const streamB = useTraceStream(traceIdB)

  useEffect(() => {
    setHistory(loadHistory())
    const saved = sessionStorage.getItem("rag-playground-draft")
    if (saved) {
      try {
        const { query: q, configA: cfgA } = JSON.parse(saved)
        if (q) setQuery(q)
        if (cfgA) setConfigA(cfgA)
      } catch {}
    }
    /* Task D: Show onboarding banner on first visit */
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true)
    }
  }, [])

  useEffect(() => {
    if (query || configA.k !== 10) {
      sessionStorage.setItem("rag-playground-draft", JSON.stringify({ query, configA }))
    }
  }, [query, configA])

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false)
    localStorage.setItem(ONBOARDING_KEY, "true")
  }, [])

  const addToHistory = useCallback((run: PlaygroundRun) => {
    setHistory((prev) => {
      const next = [run, ...prev].slice(0, 10)
      saveHistory(next)
      return next
    })
  }, [])

  const runQuery = useCallback(async () => {
    if (!query.trim() || isRunning) return
    setIsRunning(true)
    const base = getBase()

    try {
      const resA = await fetch(`${base}/playground/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          k: configA.k,
          chunk_size: parseInt(configA.chunkSize),
          embedding_model: configA.model,
        }),
      })
      const dataA = await resA.json()
      setTraceIdA(dataA.trace_id)
      setServerMessage(dataA.message ?? null)

      if (mode === "compare") {
        const resB = await fetch(`${base}/playground/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            k: configB.k,
            chunk_size: parseInt(configB.chunkSize),
            embedding_model: configB.model,
          }),
        })
        const dataB = await resB.json()
        setTraceIdB(dataB.trace_id)
      }
    } catch (e) {
      console.error("Playground query failed:", e)
    } finally {
      setIsRunning(false)
    }
  }, [query, configA, configB, mode, isRunning])

  useEffect(() => {
    const sessionComplete = streamA.events.some((e) => e.stage === "session_complete")
    if (sessionComplete && traceIdA) {
      const genEvent = streamA.events.find((e) => e.stage === "generate")
      const totalMs = streamA.events
        .filter((e) => e.stage !== "session_complete" && e.duration_ms)
        .reduce((sum, e) => sum + (e.duration_ms ?? 0), 0)
      const grounding = genEvent?.grounding_scores
        ? genEvent.grounding_scores.filter((g) => g.grounded).length / genEvent.grounding_scores.length
        : 0

      addToHistory({
        id: traceIdA,
        query: query.trim(),
        config: configA,
        result: { grounding, latencyMs: totalMs, traceId: traceIdA },
        timestamp: new Date(),
      })
    }
  }, [streamA.events, traceIdA, query, configA, addToHistory])

  const handleHistorySelect = useCallback((run: PlaygroundRun) => {
    setQuery(run.query)
    setConfigA(run.config)
  }, [])

  const handleHistoryDelete = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((r) => r.id !== id)
      saveHistory(next)
      return next
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return
      if (e.key === "a" && !e.metaKey) {
        setMode((m) => (m === "single" ? "compare" : "single"))
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
      {/* ---------- Task D: First-visit onboarding banner ---------- */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className="relative mb-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4"
          >
            <button
              onClick={dismissOnboarding}
              className="absolute top-3 right-3 text-zinc-500 transition-colors hover:text-zinc-300"
              aria-label="Dismiss onboarding"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3">
              <Hexagon className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-zinc-100">Welcome to the Playground</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Test queries against your live RAG pipeline. Results appear here as your pipeline executes.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-100">Playground</h1>
        <p className="font-mono text-xs text-zinc-500">Test queries against your live RAG pipeline</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <ConfigPanel
          mode={mode}
          onModeChange={setMode}
          query={query}
          onQueryChange={setQuery}
          config={configA}
          onConfigChange={setConfigA}
          configB={configB}
          onConfigBChange={setConfigB}
          isRunning={isRunning}
          onRun={runQuery}
          history={history}
          onHistorySelect={handleHistorySelect}
          onHistoryDelete={handleHistoryDelete}
        />

        <div>
          {mode === "compare" ? (
            <CompareResults
              traceIdA={traceIdA}
              traceIdB={traceIdB}
              eventsA={streamA.events}
              eventsB={streamB.events}
              connectedA={streamA.connected}
              connectedB={streamB.connected}
              configA={configA}
              configB={configB}
            />
          ) : (
            <ResultsPanel traceId={traceIdA} events={streamA.events} connected={streamA.connected} serverMessage={serverMessage} />
          )}
        </div>
      </div>
    </motion.div>
  )
}
