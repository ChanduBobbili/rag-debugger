"use client"

import { LayoutDashboard, Activity, BarChart3, Play, Settings, ChevronsLeft, ChevronsRight, Hexagon } from "lucide-react"
import NavItem from "./NavItem"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import packageJson from "../../package.json"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  connected: boolean
  traceCount?: number
}

const WORKSPACE_NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/traces", icon: Activity, label: "Traces" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/playground", icon: Play, label: "Playground" },
]

const SYSTEM_NAV = [
  { href: "/settings", icon: Settings, label: "Settings" },
]

export default function Sidebar({ collapsed, onToggle, connected, traceCount }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col bg-zinc-950 border-r border-zinc-800 transition-all duration-200 ease-in-out shrink-0 overflow-hidden",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 border-b border-zinc-800 shrink-0",
        collapsed ? "justify-center px-2" : "px-4 gap-3"
      )}>
        <Hexagon className="h-5 w-5 text-orange-500 shrink-0" />
        {!collapsed && (
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-semibold text-sm text-zinc-100 truncate">RAG Debugger</span>
            <span className="text-[10px] text-zinc-600 font-mono">v{packageJson.version}</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
            Workspace
          </p>
        )}
        {WORKSPACE_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
            badge={item.label === "Traces" ? traceCount : undefined}
          />
        ))}

        <Separator className="my-3" />

        {!collapsed && (
          <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
            System
          </p>
        )}
        {SYSTEM_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn("w-full text-zinc-500 hover:text-zinc-300", collapsed && "px-0")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </Button>
      </div>

      {/* Footer — connection status */}
      <div className={cn(
        "flex items-center h-12 border-t border-zinc-800 shrink-0",
        collapsed ? "justify-center px-2" : "px-4 gap-2"
      )}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <span
                className={cn("h-2 w-2 rounded-full shrink-0", connected ? "bg-emerald-500 live-dot" : "bg-red-500")}
              />
            </TooltipTrigger>
            <TooltipContent side="right">
              {connected ? "Connected · localhost:7777" : "Offline"}
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <span
              className={cn("h-2 w-2 rounded-full shrink-0", connected ? "bg-emerald-500 live-dot" : "bg-red-500")}
            />
            <div className="min-w-0">
              <p className={cn("text-[11px]", connected ? "text-zinc-400" : "text-red-400")}>
                {connected ? "Connected" : "Offline"}
              </p>
              <p className="text-[10px] text-zinc-600 font-mono truncate">localhost:7777</p>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
