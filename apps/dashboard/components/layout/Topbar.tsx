"use client"

import { usePathname } from "next/navigation"
import { Menu, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface TopbarProps {
  connected: boolean
  onMenuClick: () => void
  onSearchClick: () => void
}

const ROUTE_NAMES: Record<string, string> = {
  "/": "Dashboard",
  "/traces": "Traces",
  "/analytics": "Analytics",
  "/playground": "Playground",
  "/settings": "Settings",
}

function getBreadcrumb(path: string): string[] {
  if (path === "/") return ["Dashboard"]
  const segments = path.split("/").filter(Boolean)
  const crumbs: string[] = []
  let current = ""
  for (const seg of segments) {
    current += `/${seg}`
    crumbs.push(ROUTE_NAMES[current] || seg.slice(0, 8))
  }
  return crumbs
}

export default function Topbar({ connected, onMenuClick, onSearchClick }: TopbarProps) {
  const path = usePathname()
  const crumbs = getBreadcrumb(path)

  return (
    <header className="flex items-center justify-between h-[52px] px-4 lg:px-6 bg-zinc-950 border-b border-zinc-800 shrink-0">
      {/* Left: hamburger (mobile) + breadcrumb */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8 text-zinc-400"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <nav className="flex items-center text-sm text-zinc-400">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && <span className="mx-2 text-zinc-600">/</span>}
              <span className={cn(i === crumbs.length - 1 ? "text-zinc-100 font-medium" : "text-zinc-500")}>
                {c}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Right: search + status */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSearchClick}
          className="hidden sm:flex items-center gap-2 text-zinc-500 border-zinc-800 hover:text-zinc-300 h-8 px-3"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs">Search traces...</span>
          <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 cursor-default font-normal",
                connected
                  ? "border-emerald-500/20 text-emerald-400"
                  : "border-red-500/20 text-red-400"
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  connected ? "bg-emerald-500 live-dot" : "bg-red-500"
                )}
              />
              {connected ? "Live" : "Offline"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{connected ? "Connected to localhost:7777" : "Server unreachable"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
