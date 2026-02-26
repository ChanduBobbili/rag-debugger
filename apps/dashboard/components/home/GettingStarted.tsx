"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const STEPS = {
  python: [
    { title: "Install", code: "pip install rag-debugger-sdk" },
    { title: "Initialize", code: `from rag_debugger import init, rag_trace\ninit(dashboard_url="http://localhost:7777")` },
    { title: "Decorate", code: `@rag_trace("retrieve")\nasync def search(query: str):\n    return await db.query(query)` },
  ],
  langchain: [
    { title: "Install", code: "pip install rag-debugger-sdk langchain" },
    { title: "Initialize", code: `from rag_debugger.integrations import LangChainTracer\ntracer = LangChainTracer(dashboard_url="http://localhost:7777")` },
    { title: "Instrument", code: `chain = retrieval_chain.with_config(\n    callbacks=[tracer]\n)` },
  ],
  llamaindex: [
    { title: "Install", code: "pip install rag-debugger-sdk llama-index" },
    { title: "Initialize", code: `from rag_debugger.integrations import LlamaIndexHandler\nhandler = LlamaIndexHandler(dashboard_url="http://localhost:7777")` },
    { title: "Instrument", code: `from llama_index.core import Settings\nSettings.callback_manager.add_handler(handler)` },
  ],
}

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg p-3 pr-10 overflow-x-auto leading-relaxed">
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  )
}

export default function GettingStarted() {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-zinc-800/50">
        <h3 className="text-sm font-medium text-zinc-200">Getting Started</h3>
        <p className="text-xs text-zinc-500 mt-0.5">Instrument your RAG pipeline in 3 steps</p>
      </div>
      <div className="p-5">
        <Tabs defaultValue="python">
          <TabsList className="mb-4">
            <TabsTrigger value="python">Python</TabsTrigger>
            <TabsTrigger value="langchain">LangChain</TabsTrigger>
            <TabsTrigger value="llamaindex">LlamaIndex</TabsTrigger>
          </TabsList>
          {Object.entries(STEPS).map(([key, steps]) => (
            <TabsContent key={key} value={key}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {steps.map((step, i) => (
                  <div key={i}>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-2">
                      Step {i + 1}: {step.title}
                    </p>
                    <CopyBlock code={step.code} />
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Card>
  )
}
