import type { Metadata } from "next"
import "./globals.css"
import Sidebar from "@/components/layout/Sidebar"

export const metadata: Metadata = {
  title: "RAG Debugger",
  description: "Real-time RAG pipeline debugging dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <header
            className="flex items-center justify-between px-7 shrink-0"
            style={{
              height: 52,
              background: "var(--bg2)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
              rag-debugger /
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: "⟳ Refresh", primary: false },
                { label: "⬇ Export", primary: false },
                { label: "+ New Trace", primary: true },
              ].map(({ label, primary }) => (
                <button
                  key={label}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 5,
                    fontSize: 11,
                    fontFamily: "'JetBrains Mono', monospace",
                    cursor: "pointer",
                    border: primary ? "1px solid var(--rag)" : "1px solid var(--border2)",
                    background: primary ? "var(--rag)" : "var(--surface2)",
                    color: primary ? "#fff" : "var(--text2)",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>
          <main
            className="flex-1 overflow-y-auto"
            style={{ padding: "28px 32px" }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
