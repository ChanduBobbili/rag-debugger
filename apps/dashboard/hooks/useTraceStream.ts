"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import type { RAGEvent } from "@/lib/types"

const BASE_WS = process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") ?? "ws://localhost:7777"

export function useTraceStream(traceId: string | null) {
  const [events, setEvents] = useState<RAGEvent[]>([])
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCount = useRef(0)

  const connect = useCallback(() => {
    if (!traceId) return
    const ws = new WebSocket(`${BASE_WS}/ws/${traceId}`)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      retryCount.current = 0
    }
    ws.onmessage = (e) => {
      const event: RAGEvent = JSON.parse(e.data)
      setEvents((prev) => [...prev, event])
      setActiveStage(event.stage)
    }
    ws.onclose = () => {
      setConnected(false)
      // Exponential backoff reconnect (max 30s)
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30_000)
      retryCount.current += 1
      retryRef.current = setTimeout(connect, delay)
    }
    ws.onerror = () => ws.close()
  }, [traceId])

  useEffect(() => {
    connect()
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { events, activeStage, connected }
}
