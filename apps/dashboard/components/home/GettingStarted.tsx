"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const STEPS = {
  python: [
    { title: "Install", code: "pip install rag-debugger-sdk" },
    {
      title: "Initialize",
      code: `from rag_debugger import init, rag_trace\ninit(dashboard_url="http://localhost:7777")`,
    },
    {
      title: "Decorate",
      code: `@rag_trace("retrieve")\nasync def search(query: str):\n    return await db.query(query)`,
    },
  ],
  langchain: [
    { title: "Install", code: "pip install rag-debugger-sdk langchain-core" },
    {
      title: "Initialize",
      code: `from rag_debugger.adapters.langchain import RAGDebuggerCallback\nhandler = RAGDebuggerCallback(dashboard_url="http://localhost:7777")`,
    },
    {
      title: "Instrument",
      code: `chain = retrieval_chain.with_config(\n    callbacks=[handler]\n)`,
    },
  ],
  llamaindex: [
    { title: "Install", code: "pip install rag-debugger-sdk llama-index-core" },
    {
      title: "Initialize",
      code: `from rag_debugger.adapters.llamaindex import RAGDebuggerLlamaIndex\nfrom llama_index.core.callbacks import CallbackManager\n\nhandler = RAGDebuggerLlamaIndex(dashboard_url="http://localhost:7777")\ncallback_manager = CallbackManager([handler])`,
    },
    {
      title: "Instrument",
      code: `index = VectorStoreIndex.from_documents(\n    docs, callback_manager=callback_manager\n)`,
    },
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
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 pr-10 font-mono text-xs leading-relaxed text-zinc-300">
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="absolute top-2 right-2 h-6 w-6 text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-zinc-300"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  )
}

export default function GettingStarted() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-zinc-800/50 px-5 pt-5 pb-3">
        <h3 className="text-sm font-medium text-zinc-200">Getting Started</h3>
        <p className="mt-0.5 text-xs text-zinc-500">Instrument your RAG pipeline in 3 steps</p>
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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {steps.map((step, i) => (
                  <div key={i}>
                    <p className="mb-2 text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
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
