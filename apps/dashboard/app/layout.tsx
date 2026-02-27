import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import AppShell from "@/components/layout/AppShell"
import { Toaster } from "sonner"

export const metadata: Metadata = {
  title: "RAG Debugger",
  description: "Real-time RAG pipeline debugging dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  )
}
