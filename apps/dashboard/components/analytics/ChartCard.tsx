"use client"

import { Card } from "@/components/ui/card"
import { BarChart2 } from "lucide-react"

interface ChartCardProps {
  title: string
  subtitle: string
  children: React.ReactNode
  empty?: boolean
}

export default function ChartCard({ title, subtitle, children, empty }: ChartCardProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-zinc-800/50 px-4 pt-4 pb-2">
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
      </div>
      <div className="p-4">
        {empty ? (
          <div
            className="flex h-[200px] flex-col items-center justify-center text-zinc-600"
            aria-label={`No data for ${title}`}
          >
            <BarChart2 className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">No data for this time range</p>
            <p className="mt-1 text-xs">Run some queries with the SDK to generate analytics</p>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
