"use client"
import { useEffect, useRef } from "react"
import * as d3 from "d3"
import type { ChunkScore } from "@/lib/types"
import ErrorBoundary from "./ErrorBoundary"

interface Props {
  chunks: ChunkScore[]
  onChunkClick?: (chunk: ChunkScore) => void
}

function ChunkWaterfallInner({ chunks, onChunkClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!svgRef.current || !chunks.length) return

    const container = containerRef.current
    const W = container?.clientWidth ?? 700
    const H = 300
    const margin = { top: 20, right: 20, bottom: 60, left: 50 }
    const innerW = W - margin.left - margin.right
    const innerH = H - margin.top - margin.bottom

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove()
    svg.attr("width", W).attr("height", H)

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    const stages = ["cosine_score", "rerank_score"] as const
    const stageLabels: Record<string, string> = {
      cosine_score: "Cosine",
      rerank_score: "Re-rank",
    }
    const colors: Record<string, string> = {
      cosine_score: "#ff6b35",
      rerank_score: "#f0c040",
    }

    const x0 = d3
      .scaleBand()
      .domain(chunks.map((_, i) => String(i)))
      .range([0, innerW])
      .paddingInner(0.2)

    const x1 = d3
      .scaleBand<string>()
      .domain([...stages])
      .range([0, x0.bandwidth()])
      .padding(0.1)

    const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0])

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .selectAll("line")
      .data(y.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "#1e1e2e")
      .attr("stroke-dasharray", "2,2")

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x0).tickFormat((i) => `C${+i + 1}`))
      .selectAll("text")
      .style("fill", "#7a788a")
      .style("font-size", "11px")
      .style("font-family", "DM Mono, monospace")

    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".1f")))
      .selectAll("text")
      .style("fill", "#7a788a")
      .style("font-size", "11px")
      .style("font-family", "DM Mono, monospace")

    // Remove axis lines styling
    g.selectAll(".domain").attr("stroke", "#2a2a3a")
    g.selectAll(".tick line").attr("stroke", "#2a2a3a")

    // Y-axis label
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -40)
      .attr("x", -innerH / 2)
      .attr("text-anchor", "middle")
      .style("fill", "#7a788a")
      .style("font-size", "11px")
      .text("Score")

    // Tooltip div
    const tooltipId = "rag-waterfall-tooltip"
    let existing = document.getElementById(tooltipId)
    if (!existing) {
      existing = document.createElement("div")
      existing.id = tooltipId
      Object.assign(existing.style, {
        position: "absolute",
        background: "#1a1a24",
        border: "1px solid #2a2a3a",
        color: "#e8e6f0",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        pointerEvents: "none",
        opacity: "0",
        fontFamily: "DM Mono, monospace",
        zIndex: "50",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      })
      document.body.appendChild(existing)
    }
    const tooltip = d3.select(existing)

    // Bars with animation
    stages.forEach((stage) => {
      g.selectAll(`.bar-${stage}`)
        .data(chunks)
        .join("rect")
        .attr("class", `bar-${stage}`)
        .attr("x", (_, i) => (x0(String(i)) ?? 0) + (x1(stage) ?? 0))
        .attr("width", x1.bandwidth())
        .attr("y", innerH)
        .attr("height", 0)
        .attr("fill", colors[stage])
        .attr("opacity", 0.85)
        .attr("rx", 2)
        .style("cursor", "pointer")
        .on("click", (_, d) => onChunkClick?.(d))
        .on("mouseover", function (event: MouseEvent, d: ChunkScore) {
          d3.select(this).attr("opacity", "1")
          const score = d[stage]
          if (score !== null && score !== undefined) {
            tooltip
              .style("opacity", "1")
              .html(
                `<strong>${stageLabels[stage]}</strong><br/>Score: ${Number(score).toFixed(3)}<br/>Rank: ${d.final_rank + 1}<br/><span style="color:#7a788a">${d.text.slice(0, 60)}…</span>`,
              )
              .style("left", `${event.pageX + 12}px`)
              .style("top", `${event.pageY - 30}px`)
          }
        })
        .on("mousemove", (event: MouseEvent) => {
          tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 30}px`)
        })
        .on("mouseout", function () {
          d3.select(this).attr("opacity", "0.85")
          tooltip.style("opacity", "0")
        })
        .transition()
        .duration(600)
        .delay((_, i) => i * 40)
        .attr("y", (d) => {
          const val = Number(d[stage] ?? 0)
          return y(val)
        })
        .attr("height", (d) => {
          const val = Number(d[stage] ?? 0)
          return innerH - y(val)
        })
    })

    // Legend
    const legend = g.append("g").attr("transform", `translate(${innerW - 160}, -10)`)

    stages.forEach((stage, i) => {
      const lg = legend.append("g").attr("transform", `translate(${i * 90}, 0)`)
      lg.append("rect").attr("width", 10).attr("height", 10).attr("rx", 2).attr("fill", colors[stage])
      lg.append("text")
        .attr("x", 14)
        .attr("y", 9)
        .style("fill", "#7a788a")
        .style("font-size", "10px")
        .text(stageLabels[stage])
    })

    return () => {
      tooltip.style("opacity", "0")
    }
  }, [chunks, onChunkClick])

  if (!chunks.length) {
    return (
      <div className="text-muted border-border flex h-48 items-center justify-center rounded-md border text-sm">
        No chunk data available for this trace
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} className="w-full" style={{ height: 300 }} />
    </div>
  )
}

export default function ChunkWaterfall(props: Props) {
  return (
    <ErrorBoundary fallback={<div className="p-4 text-sm text-red-400">Failed to render chunk waterfall</div>}>
      <ChunkWaterfallInner {...props} />
    </ErrorBoundary>
  )
}
