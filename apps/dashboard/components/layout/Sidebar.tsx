"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV = [
  { href: "/", label: "Dashboard", icon: "⌘", id: "home" },
  { href: "/traces", label: "Traces", icon: "◉", id: "traces" },
  { href: "/analytics", label: "Analytics", icon: "◈", id: "analytics" },
  { href: "/playground", label: "Playground", icon: "▷", id: "playground" },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside
      className="w-52 shrink-0 flex flex-col border-r"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 160,
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,92,53,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div style={{
          fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase",
          color: "var(--rag)", marginBottom: 4,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          // open source
        </div>
        <div style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: 22, lineHeight: 1, color: "var(--text)",
          letterSpacing: "-0.02em",
        }}>
          RAG <em style={{ fontStyle: "italic", color: "var(--rag2)" }}>Debug</em>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 pt-3">
        <div style={{
          fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase",
          color: "var(--muted)", padding: "4px 10px 8px",
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          Navigation
        </div>
        {NAV.map(({ href, label, icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all mb-0.5"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: active ? "var(--rag2)" : "var(--muted)",
                background: active ? "rgba(255,92,53,0.09)" : "transparent",
                border: active ? "1px solid rgba(255,92,53,0.14)" : "1px solid transparent",
                position: "relative",
              }}
            >
              {active && (
                <span style={{
                  position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                  width: 2, height: 16, background: "var(--rag)", borderRadius: "0 2px 2px 0",
                }} />
              )}
              <span style={{ width: 16, textAlign: "center", fontSize: 13 }}>{icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="p-4 border-t flex items-center gap-2"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="live-dot"
          style={{
            display: "inline-block", width: 6, height: 6, borderRadius: "50%",
            background: "var(--teal)",
          }}
        />
        <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
          Connected · v0.2.0
        </span>
      </div>
    </aside>
  )
}
