"use client"
import { useEffect, useState } from "react"

interface ProjectedPoint {
  x: number
  y: number
  isQuery: boolean
  chunkId?: string
  text?: string
}

export function useEmbeddingProjection(
  queryVector: number[] | null,
  chunkVectors: Array<{ vector: number[]; chunk_id: string; text: string }>,
) {
  const [projection, setProjection] = useState<ProjectedPoint[]>([])
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<
    "idle" | "computing" | "done" | "error"
  >("idle")

  useEffect(() => {
    if (!queryVector || chunkVectors.length === 0) return

    setStatus("computing")
    setProgress(0)

    const allVectors = [queryVector, ...chunkVectors.map((c) => c.vector)]

    import("umap-js")
      .then(({ UMAP }) => {
        try {
          const umap = new UMAP({
            nComponents: 2,
            nNeighbors: Math.min(15, allVectors.length - 1),
            minDist: 0.1,
          })

          const embedding = umap.fit(allVectors)
          const points: ProjectedPoint[] = embedding.map(
            (coords: number[], i: number) => ({
              x: coords[0],
              y: coords[1],
              isQuery: i === 0,
              chunkId: i > 0 ? chunkVectors[i - 1].chunk_id : undefined,
              text: i > 0 ? chunkVectors[i - 1].text : "Query",
            }),
          )
          setProjection(points)
          setStatus("done")
        } catch {
          setStatus("error")
        }
      })
      .catch(() => {
        setStatus("error")
      })
  }, [queryVector, chunkVectors])

  return { projection, progress, status }
}
