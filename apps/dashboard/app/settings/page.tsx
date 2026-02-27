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

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) setServerUrl(stored)
  }, [])

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
      className="space-y-6 max-w-xl"
    >
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
        <p className="text-xs text-zinc-500 font-mono">Configure your RAG Debugger instance</p>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-zinc-200 mb-0.5">Server URL</h3>
          <p className="text-xs text-zinc-500 mb-3">
            The FastAPI server that receives SDK events and serves trace data.
          </p>
          <div className="flex gap-2">
            <input
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-200 font-mono outline-none focus-visible:ring-1 focus-visible:ring-zinc-600 transition-colors"
              placeholder="http://localhost:7777"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testStatus === "testing"}
              className={
                testStatus === "ok" ? "border-emerald-500/50 text-emerald-400" :
                testStatus === "error" ? "border-red-500/50 text-red-400" : ""
              }
            >
              {testStatus === "testing" ? "Testing…" :
               testStatus === "ok" ? "✓ OK" :
               testStatus === "error" ? "✗ Failed" : "Test"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5">
            {saved ? <Check className="h-4 w-4" /> : null}
            {saved ? "Saved" : "Save"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-zinc-500 gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to default
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-medium text-zinc-200 mb-1">About</h3>
        <p className="text-xs text-zinc-500 font-mono">RAG Debugger Dashboard v0.0.1</p>
        <p className="text-xs text-zinc-600 mt-1">
          Instrument your RAG pipeline with <span className="font-mono text-zinc-500">@rag_trace</span> and this dashboard
          visualizes every stage in real time.
        </p>
      </Card>
    </motion.div>
  )
}
