"use client"

interface SparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
}

export default function TrendSparkline({ data, color, width = 80, height = 24 }: SparklineProps) {
  if (!data.length) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2

  const points = data
    .map((v, i) => {
      const x = padding + (i / Math.max(data.length - 1, 1)) * (width - padding * 2)
      const y = height - padding - ((v - min) / range) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(" ")

  const fillPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`
  const gradientId = `sparkline-${color.replace(/[^a-z0-9]/gi, "")}`

  return (
    <svg width={width} height={height} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.15} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
