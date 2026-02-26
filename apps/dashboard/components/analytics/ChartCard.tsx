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
    <Card className="p-0 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-zinc-800/50">
        <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="p-4">
        {empty ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-zinc-600" aria-label={`No data for ${title}`}>
            <BarChart2 className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-sm">No data for this time range</p>
            <p className="text-xs mt-1">Run some queries with the SDK to generate analytics</p>
          </div>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
