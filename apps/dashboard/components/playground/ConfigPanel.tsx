"use client"

import { useRef, useEffect } from "react"
import { Loader2, Play, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface PlaygroundConfig {
  k: number
  model: string
  chunkSize: string
}

export interface PlaygroundRun {
  id: string
  query: string
  config: PlaygroundConfig
  result: { grounding: number; latencyMs: number; traceId: string }
  timestamp: Date
}

interface ConfigPanelProps {
  mode: "single" | "compare"
  onModeChange: (mode: "single" | "compare") => void
  query: string
  onQueryChange: (q: string) => void
  config: PlaygroundConfig
  onConfigChange: (c: PlaygroundConfig) => void
  configB?: PlaygroundConfig
  onConfigBChange?: (c: PlaygroundConfig) => void
  isRunning: boolean
  onRun: () => void
  history: PlaygroundRun[]
  onHistorySelect: (run: PlaygroundRun) => void
  onHistoryDelete: (id: string) => void
}

const MODELS = ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"]
const CHUNK_SIZES = ["256 tokens", "512 tokens", "1024 tokens"]

function ConfigFields({ config, onChange, label }: { config: PlaygroundConfig; onChange: (c: PlaygroundConfig) => void; label?: string }) {
  return (
    <div className="space-y-3">
      {label && <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{label}</p>}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Top-K</span>
          <span className="text-xs font-mono text-orange-400">{config.k}</span>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          value={config.k}
          onChange={e => onChange({ ...config, k: Number(e.target.value) })}
          className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-orange-500"
        />
      </div>
      <div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Embedding Model</span>
        <select
          value={config.model}
          onChange={e => onChange({ ...config, model: e.target.value })}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
        >
          {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Chunk Size</span>
        <select
          value={config.chunkSize}
          onChange={e => onChange({ ...config, chunkSize: e.target.value })}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
        >
          {CHUNK_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )
}

export default function ConfigPanel({
  mode, onModeChange, query, onQueryChange, config, onConfigChange,
  configB, onConfigBChange, isRunning, onRun, history, onHistorySelect, onHistoryDelete,
}: ConfigPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onRun()
    }
  }

  return (
    <Card className="p-0 overflow-hidden flex flex-col">
      <div className="p-4 space-y-4 flex-1">
        {/* Mode toggle */}
        <div className="flex rounded-md border border-zinc-800 p-0.5 w-fit">
          {(["single", "compare"] as const).map(m => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                "px-3 py-1 text-xs rounded-sm transition-colors capitalize",
                mode === m ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {m === "compare" ? "Compare A/B" : m}
            </button>
          ))}
        </div>

        {/* Query */}
        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Query</span>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What is retrieval augmented generation?"
            maxLength={500}
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none resize-none focus-visible:ring-1 focus-visible:ring-zinc-600 transition-colors"
          />
          <p className="text-[10px] text-zinc-600 mt-1">{query.length}/500</p>
        </div>

        <Separator />

        {/* Parameters */}
        {mode === "compare" ? (
          <div className="space-y-4">
            <ConfigFields config={config} onChange={onConfigChange} label="Config A" />
            <Separator />
            {configB && onConfigBChange && (
              <ConfigFields config={configB} onChange={onConfigBChange} label="Config B" />
            )}
          </div>
        ) : (
          <ConfigFields config={config} onChange={onConfigChange} />
        )}

        {/* Run button */}
        <Button
          onClick={onRun}
          disabled={isRunning || !query.trim()}
          className={cn(
            "w-full",
            isRunning
              ? "bg-zinc-800 text-zinc-400"
              : "bg-orange-500 hover:bg-orange-600 text-white"
          )}
        >
          {isRunning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Running…</>
          ) : (
            <><Play className="h-4 w-4" /> {mode === "compare" ? "Run Both" : "Run Query"}</>
          )}
        </Button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <>
          <Separator />
          <div className="p-4 pt-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Recent Runs</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {history.slice(0, 10).map(run => (
                <div
                  key={run.id}
                  className="group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  onClick={() => onHistorySelect(run)}
                >
                  <span className="flex-1 text-xs text-zinc-400 truncate">{run.query.slice(0, 40)}</span>
                  <Badge variant="secondary" className="text-[9px] font-mono">
                    {run.result.grounding.toFixed(2)}
                  </Badge>
                  <span className="text-[10px] text-zinc-600 font-mono">{run.result.latencyMs.toFixed(0)}ms</span>
                  <button
                    onClick={e => { e.stopPropagation(); onHistoryDelete(run.id) }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400"
                    aria-label="Delete run"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
