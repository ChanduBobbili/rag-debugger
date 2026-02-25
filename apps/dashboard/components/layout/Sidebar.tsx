"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/traces", label: "Traces", icon: "◎" },
  { href: "/analytics", label: "Analytics", icon: "◈" },
  { href: "/playground", label: "Playground", icon: "◷" },
]

export default function Sidebar() {
  const path = usePathname()
  return (
    <aside
      className="w-56 flex flex-col border-r shrink-0"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="text-xs tracking-widest uppercase" style={{ color: "var(--muted)" }}>RAG</div>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: "1.25rem", fontWeight: 700 }}>Debugger</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors"
            style={{
              color: path === href ? "var(--rag)" : "var(--muted)",
              background: path === href ? "rgba(255,107,53,0.08)" : "transparent",
            }}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 text-xs border-t" style={{ color: "var(--muted)", borderColor: "var(--border)" }}>
        v0.1.0 · open source
      </div>
    </aside>
  )
}
