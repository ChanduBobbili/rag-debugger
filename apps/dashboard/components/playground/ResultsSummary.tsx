"use client"

import { motion } from "framer-motion"
import { CheckCircle, Clock, Layers } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface ResultsSummaryProps {
  grounding: number | null
  totalMs: number | null
  chunkCount: number | null
  show: boolean
}

function scoreColor(s: number): string {
  if (s >= 0.75) return "text-emerald-400"
  if (s >= 0.5) return "text-yellow-400"
  return "text-red-400"
}

function SummaryCard({ icon: Icon, label, value, colorClass, delay }: {
  icon: LucideIcon; label: string; value: string; colorClass: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="p-3 flex items-center gap-3">
        <Icon className={cn("h-4 w-4 shrink-0", colorClass)} />
        <div>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className={cn("text-lg font-semibold font-mono", colorClass)}>{value}</p>
        </div>
      </Card>
    </motion.div>
  )
}

export default function ResultsSummary({ grounding, totalMs, chunkCount, show }: ResultsSummaryProps) {
  if (!show) return null

  return (
    <div className="grid grid-cols-3 gap-3">
      <SummaryCard
        icon={CheckCircle}
        label="Grounding Score"
        value={grounding != null ? `${(grounding * 100).toFixed(0)}%` : "—"}
        colorClass={grounding != null ? scoreColor(grounding) : "text-zinc-500"}
        delay={0}
      />
      <SummaryCard
        icon={Clock}
        label="Total Latency"
        value={totalMs != null ? `${totalMs.toFixed(0)}ms` : "—"}
        colorClass="text-zinc-300"
        delay={0.05}
      />
      <SummaryCard
        icon={Layers}
        label="Chunks Retrieved"
        value={chunkCount != null ? String(chunkCount) : "—"}
        colorClass="text-zinc-300"
        delay={0.1}
      />
    </div>
  )
}
