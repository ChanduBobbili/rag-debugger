"use client"

import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"

export default function SettingsPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
        <p className="text-xs text-zinc-500 font-mono">Configure your RAG Debugger instance</p>
      </div>
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-zinc-600 gap-2">
          <p className="text-sm">Settings page coming soon</p>
          <p className="text-xs">Server URL, theme preferences, and more</p>
        </div>
      </Card>
    </motion.div>
  )
}
