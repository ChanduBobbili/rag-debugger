"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, RotateCcw } from "lucide-react"
import { toast } from "sonner"

const LS_KEY = "rag-debugger-server-url"
const DEFAULT_URL = "http://localhost:7777"

export default function SettingsPage() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_URL)
  const [saved, setSaved] = useState(false)
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle")
  const [threshold, setThreshold] = useState<number | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) setServerUrl(stored)
  }, [])

  useEffect(() => {
    fetch(`${serverUrl.trim().replace(/\/$/, "")}/health`)
      .then(r => r.json())
      .then(d => setThreshold(d.grounding_threshold ?? null))
      .catch(() => setThreshold(null))
  }, [serverUrl])

  const handleSave = () => {
    const url = serverUrl.trim().replace(/\/$/, "")
    localStorage.setItem(LS_KEY, url)
    setSaved(true)
    toast.success("Server URL saved. Reload the page to apply.")
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    localStorage.removeItem(LS_KEY)
    setServerUrl(DEFAULT_URL)
    toast.success("Reset to default")
  }

  const handleTest = async () => {
    setTestStatus("testing")
    try {
      const res = await fetch(`${serverUrl.trim()}/health`, { signal: AbortSignal.timeout(5000) })
      const data = await res.json()
      setTestStatus(data.status === "ok" ? "ok" : "error")
    } catch {
      setTestStatus("error")
    }
    setTimeout(() => setTestStatus("idle"), 3000)
  }

  const handleClearAll = async () => {
    if (!confirm("Delete ALL traces? This cannot be undone.")) return
    try {
      await fetch(`${serverUrl.trim().replace(/\/$/, "")}/traces`, { method: "DELETE" })
      toast.success("All traces deleted")
    } catch {
      toast.error("Failed to delete traces")
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="max-w-xl space-y-6"
    >
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
        <p className="font-mono text-xs text-zinc-500">Configure your RAG Debugger instance</p>
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <h3 className="mb-0.5 text-sm font-medium text-zinc-200">Server URL</h3>
          <p className="mb-3 text-xs text-zinc-500">
            The FastAPI server that receives SDK events and serves trace data.
          </p>
          <div className="flex gap-2">
            <input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-zinc-600"
              placeholder="http://localhost:7777"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testStatus === "testing"}
              className={
                testStatus === "ok"
                  ? "border-emerald-500/50 text-emerald-400"
                  : testStatus === "error"
                    ? "border-red-500/50 text-red-400"
                    : ""
              }
            >
              {testStatus === "testing"
                ? "Testing…"
                : testStatus === "ok"
                  ? "✓ OK"
                  : testStatus === "error"
                    ? "✗ Failed"
                    : "Test"}
            </Button>
          </div>
          {threshold !== null && (
            <p className="text-xs text-zinc-600 font-mono mt-2">
              Grounding threshold:{" "}
              <span className="text-zinc-400">{threshold}</span>
              {" · "}
              <span className="text-zinc-700">
                set via RAG_DEBUGGER_GROUNDING_THRESHOLD env var
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600">
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Saved" : "Save"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-zinc-500">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default
          </Button>
        </div>
      </Card>

      <Card className="p-5 border-red-900/30">
        <h3 className="text-sm font-medium text-red-400 mb-1">Danger Zone</h3>
        <p className="text-xs text-zinc-500 mb-3">
          Permanently delete all traces and analytics data from the server.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          className="border-red-900/50 text-red-400 hover:bg-red-950/30"
        >
          Clear All Traces
        </Button>
      </Card>

      <Card className="p-5">
        <h3 className="mb-1 text-sm font-medium text-zinc-200">About</h3>
        <p className="font-mono text-xs text-zinc-500">RAG Debugger Dashboard v0.0.1</p>
        <p className="mt-1 text-xs text-zinc-600">
          Instrument your RAG pipeline with <span className="font-mono text-zinc-500">@rag_trace</span> and this
          dashboard visualizes every stage in real time.
        </p>
      </Card>
    </motion.div>
  )
}
