"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import CommandSearch from "./CommandSearch"
import { useTraceStream } from "@/hooks/useTraceStream"

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { connected } = useTraceStream("__live__")
  const router = useRouter()

  const toggleSidebar = useCallback(() => setCollapsed((c) => !c), [])

  useEffect(() => {
    let gPressed = false
    let gTimeout: ReturnType<typeof setTimeout> | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable
      if (isInput) return

      if (e.key === "[" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        toggleSidebar()
        return
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        return
      }

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(true)
        return
      }

      // Vim-style g-then-letter navigation
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !gPressed) {
        gPressed = true
        gTimeout = setTimeout(() => { gPressed = false }, 200)
        return
      }

      if (gPressed) {
        gPressed = false
        if (gTimeout) clearTimeout(gTimeout)
        const routes: Record<string, string> = { h: "/", t: "/traces", a: "/analytics", p: "/playground" }
        const route = routes[e.key]
        if (route) {
          e.preventDefault()
          router.push(route)
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar, router])

  return (
    <TooltipProvider>
      <div
        className="h-screen overflow-hidden bg-zinc-950"
        data-collapsed={collapsed}
      >
        <div className="flex h-full">
          {/* Desktop sidebar */}
          <div className="hidden lg:flex">
            <Sidebar
              collapsed={collapsed}
              onToggle={toggleSidebar}
              connected={connected}
            />
          </div>

          {/* Mobile sidebar sheet */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-60 p-0 bg-zinc-950 border-zinc-800">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Sidebar
                collapsed={false}
                onToggle={() => setMobileOpen(false)}
                connected={connected}
              />
            </SheetContent>
          </Sheet>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Topbar
              connected={connected}
              onMenuClick={() => setMobileOpen(true)}
              onSearchClick={() => setSearchOpen(true)}
            />
            <main className="flex-1 overflow-y-auto p-4 lg:p-6">
              {children}
            </main>
          </div>
        </div>

        <CommandSearch />
      </div>
    </TooltipProvider>
  )
}
