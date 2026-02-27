"use client"

import { useRef, useEffect } from "react"
import { Loader2, Play, Trash2, HelpCircle, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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

/* ---------- Task C: Tooltip map ---------- */
const PARAM_TOOLTIPS: Record<string, string> = {
  "Top-K":
    "Number of chunks retrieved from the vector store. Higher values increase recall but may reduce precision and increase latency.",
  "Embedding Model":
    "The model used to embed your query. Must match the model used when your vector store was indexed.",
  "Chunk Size":
    "The text segment size used during document ingestion. Smaller chunks are more precise; larger chunks provide more context per result.",
}

function ParamLabel({ label }: { label: string }) {
  const tip = PARAM_TOOLTIPS[label]
  return (
    <span className="mb-1.5 flex items-center gap-1.5">
      <span className="text-[10px] tracking-wider text-zinc-500 uppercase">{label}</span>
      {tip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="cursor-help" aria-label={`${label} info`}>
              <HelpCircle className="h-3 w-3 text-zinc-600 transition-colors hover:text-zinc-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs border-zinc-700 bg-zinc-800 text-xs text-zinc-300">
            {tip}
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}

function ConfigFields({
  config,
  onChange,
  label,
}: {
  config: PlaygroundConfig
  onChange: (c: PlaygroundConfig) => void
  label?: string
}) {
  return (
    <div className="space-y-3">
      {label && <p className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">{label}</p>}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <ParamLabel label="Top-K" />
          <span className="font-mono text-xs text-orange-400">{config.k}</span>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          value={config.k}
          onChange={(e) => onChange({ ...config, k: Number(e.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-orange-500"
        />
      </div>
      <div>
        <ParamLabel label="Embedding Model" />
        <select
          value={config.model}
          onChange={(e) => onChange({ ...config, model: e.target.value })}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div>
        <ParamLabel label="Chunk Size" />
        <select
          value={config.chunkSize}
          onChange={(e) => onChange({ ...config, chunkSize: e.target.value })}
          className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
        >
          {CHUNK_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function ConfigPanel({
  mode,
  onModeChange,
  query,
  onQueryChange,
  config,
  onConfigChange,
  configB,
  onConfigBChange,
  isRunning,
  onRun,
  history,
  onHistorySelect,
  onHistoryDelete,
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
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="flex-1 space-y-4 p-4">
        {/* Mode toggle */}
        <div className="flex w-fit rounded-md border border-zinc-800 p-0.5">
          {(["single", "compare"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                "rounded-sm px-3 py-1 text-xs capitalize transition-colors",
                mode === m ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {m === "compare" ? "Compare A/B" : m}
            </button>
          ))}
        </div>

        {/* Query */}
        <div>
          <span className="mb-1.5 block text-[10px] tracking-wider text-zinc-500 uppercase">Query</span>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What is retrieval augmented generation?"
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200 transition-colors outline-none placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-600"
          />
          <p className="mt-1 text-[10px] text-zinc-600">{query.length}/500</p>
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
            isRunning ? "bg-zinc-800 text-zinc-400" : "bg-orange-500 text-white hover:bg-orange-600",
          )}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Running…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" /> {mode === "compare" ? "Run Both" : "Run Query"}
            </>
          )}
        </Button>

        {/* ---------- Task E: Help accordion ---------- */}
        <details className="overflow-hidden rounded-lg border border-zinc-800 text-xs text-zinc-600">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 transition-colors hover:bg-zinc-800/50 hover:text-zinc-400">
            <span>How does the Playground work?</span>
            <ChevronDown className="h-3 w-3 transition-transform [details[open]>&]:rotate-180" />
          </summary>
          <div className="space-y-2 border-t border-zinc-800 px-3 pt-1 pb-3 text-zinc-500">
            <p>
              1. Click <span className="font-medium text-zinc-300">Run Query</span> to register a trace with the server.
            </p>
            <p>
              2. Copy the <span className="font-mono text-zinc-400">trace_id</span> from the results panel.
            </p>
            <p>3. In your pipeline, wrap execution with:</p>
            <pre className="overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-2 font-mono text-[10px] text-zinc-400">
              {`from rag_debugger import new_trace\n\nnew_trace(trace_id="...")\npipeline.run(query)`}
            </pre>
            <p>4. Events stream here in real time as your pipeline executes.</p>
          </div>
        </details>
      </div>

      {/* History */}
      {history.length > 0 && (
        <>
          <Separator />
          <div className="p-4 pt-3">
            <p className="mb-2 text-[10px] tracking-wider text-zinc-500 uppercase">Recent Runs</p>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {history.slice(0, 10).map((run) => (
                <div
                  key={run.id}
                  className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-zinc-800/50"
                  onClick={() => onHistorySelect(run)}
                >
                  <span className="flex-1 truncate text-xs text-zinc-400">{run.query.slice(0, 40)}</span>
                  <Badge variant="secondary" className="font-mono text-[9px]">
                    {run.result.grounding.toFixed(2)}
                  </Badge>
                  <span className="font-mono text-[10px] text-zinc-600">{run.result.latencyMs.toFixed(0)}ms</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onHistoryDelete(run.id)
                    }}
                    className="text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
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
