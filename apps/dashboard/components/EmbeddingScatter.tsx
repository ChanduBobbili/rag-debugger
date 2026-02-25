"use client"
import { useEffect, useRef, useState } from "react"
import ErrorBoundary from "./ErrorBoundary"

interface ProjectedPoint {
  x: number
  y: number
  isQuery: boolean
  chunkId?: string
  text?: string
}

interface Props {
  queryVector: number[] | null
  chunkVectors: Array<{ vector: number[]; chunk_id: string; text: string }>
}

function EmbeddingScatterInner({ queryVector, chunkVectors }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [projection, setProjection] = useState<ProjectedPoint[]>([])
  const [status, setStatus] = useState<"idle" | "computing" | "done" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [hoveredPoint, setHoveredPoint] = useState<ProjectedPoint | null>(null)

  useEffect(() => {
    if (!queryVector || chunkVectors.length === 0) return

    setStatus("computing")
    setProgress(0)

    // Dynamic import of umap-js to avoid SSR issues
    import("umap-js").then(({ UMAP }) => {
      const allVectors = [queryVector, ...chunkVectors.map((c) => c.vector)]
      const umap = new UMAP({
        nComponents: 2,
        nNeighbors: Math.min(15, allVectors.length - 1),
        minDist: 0.1,
      })

      try {
        const embedding = umap.fit(allVectors)
        const points: ProjectedPoint[] = embedding.map(
          (coords: number[], i: number) => ({
            x: coords[0],
            y: coords[1],
            isQuery: i === 0,
            chunkId: i > 0 ? chunkVectors[i - 1].chunk_id : undefined,
            text: i > 0 ? chunkVectors[i - 1].text : "Query Vector",
          }),
        )
        setProjection(points)
        setStatus("done")
      } catch {
        setStatus("error")
      }
    }).catch(() => {
      setStatus("error")
    })
  }, [queryVector, chunkVectors])

  // Canvas rendering
  useEffect(() => {
    if (!canvasRef.current || projection.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height
    const padding = 40

    // Compute scale
    const xs = projection.map((p) => p.x)
    const ys = projection.map((p) => p.y)
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const yMin = Math.min(...ys)
    const yMax = Math.max(...ys)
    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1

    const scaleX = (v: number) =>
      padding + ((v - xMin) / xRange) * (W - 2 * padding)
    const scaleY = (v: number) =>
      padding + ((v - yMin) / yRange) * (H - 2 * padding)

    // Clear
    ctx.fillStyle = "#111118"
    ctx.fillRect(0, 0, W, H)

    // Draw chunk points
    projection.forEach((p) => {
      if (p.isQuery) return
      const px = scaleX(p.x)
      const py = scaleY(p.y)
      ctx.beginPath()
      ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fillStyle =
        hoveredPoint?.chunkId === p.chunkId
          ? "#00ffd0"
          : "rgba(0, 212, 170, 0.7)"
      ctx.fill()
    })

    // Draw query point (larger, orange)
    const query = projection.find((p) => p.isQuery)
    if (query) {
      const px = scaleX(query.x)
      const py = scaleY(query.y)
      // Glow
      ctx.beginPath()
      ctx.arc(px, py, 12, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(255, 107, 53, 0.2)"
      ctx.fill()
      // Dot
      ctx.beginPath()
      ctx.arc(px, py, 8, 0, Math.PI * 2)
      ctx.fillStyle = "#ff6b35"
      ctx.fill()
      ctx.strokeStyle = "#fff"
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    // Legend
    ctx.font = "11px DM Mono"
    ctx.fillStyle = "#ff6b35"
    ctx.fillRect(W - 130, 10, 8, 8)
    ctx.fillStyle = "#7a788a"
    ctx.fillText("Query", W - 118, 18)

    ctx.fillStyle = "#00d4aa"
    ctx.fillRect(W - 130, 24, 8, 8)
    ctx.fillStyle = "#7a788a"
    ctx.fillText("Chunks", W - 118, 32)
  }, [projection, hoveredPoint])

  // Mouse hover handler
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || projection.length === 0) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const W = canvas.width
    const H = canvas.height
    const padding = 40
    const xs = projection.map((p) => p.x)
    const ys = projection.map((p) => p.y)
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const yMin = Math.min(...ys)
    const yMax = Math.max(...ys)
    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1

    const scaleX = (v: number) =>
      padding + ((v - xMin) / xRange) * (W - 2 * padding)
    const scaleY = (v: number) =>
      padding + ((v - yMin) / yRange) * (H - 2 * padding)

    let nearest: ProjectedPoint | null = null
    let minDist = 20

    for (const p of projection) {
      const dx = scaleX(p.x) - mx
      const dy = scaleY(p.y) - my
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < minDist) {
        minDist = dist
        nearest = p
      }
    }

    setHoveredPoint(nearest)
  }

  if (!queryVector || chunkVectors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm border border-border rounded-md" style={{ color: "var(--muted)" }}>
        No embedding data available
      </div>
    )
  }

  if (status === "computing") {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 border border-border rounded-md">
        <div className="text-sm" style={{ color: "var(--muted)" }}>Computing UMAP projection…</div>
        <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress * 100}%`, background: "var(--rag)" }}
          />
        </div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-red-400 border border-red-900 rounded-md">
        Failed to compute UMAP projection
      </div>
    )
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="w-full rounded-lg border border-border"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
      />
      {hoveredPoint && (
        <div
          className="absolute bottom-2 left-2 text-xs p-2 rounded max-w-xs"
          style={{
            background: "#1a1a24",
            border: "1px solid #2a2a3a",
            color: "#e8e6f0",
            fontFamily: "DM Mono, monospace",
          }}
        >
          <div style={{ color: hoveredPoint.isQuery ? "#ff6b35" : "#00d4aa" }}>
            {hoveredPoint.isQuery ? "Query" : `Chunk ${hoveredPoint.chunkId}`}
          </div>
          <div className="mt-1" style={{ color: "#7a788a" }}>
            {hoveredPoint.text?.slice(0, 100)}…
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmbeddingScatter(props: Props) {
  return (
    <ErrorBoundary
      fallback={
        <div className="text-red-400 text-sm p-4">
          Failed to render embedding scatter
        </div>
      }
    >
      <EmbeddingScatterInner {...props} />
    </ErrorBoundary>
  )
}
