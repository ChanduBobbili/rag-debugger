"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface NavItemProps {
  href: string
  icon: LucideIcon
  label: string
  badge?: number | string
  collapsed: boolean
}

export default function NavItem({ href, icon: Icon, label, badge, collapsed }: NavItemProps) {
  const path = usePathname()
  const active = path === href || (href !== "/" && path.startsWith(href))

  const content = (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
        active
          ? "bg-zinc-800/60 text-white"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40",
        collapsed && "justify-center px-0"
      )}
      aria-label={label}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-orange-500 rounded-r" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", collapsed ? "ml-0" : "ml-0")} />
      {!collapsed && (
        <>
          <span className="truncate">{label}</span>
          {badge !== undefined && (
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-5">
              {badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {label}
          {badge !== undefined && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {badge}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}
