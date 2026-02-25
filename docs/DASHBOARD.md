# RAG Debugger — Dashboard Documentation

> Next.js 16 real-time debugging dashboard for RAG pipeline visualization.

---

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Design System](#design-system)
- [Pages](#pages)
  - [Home (/)](#home-)
  - [Traces (/traces)](#traces-traces)
  - [Trace Detail (/traces/[traceId])](#trace-detail-tracestracteid)
  - [Analytics (/analytics)](#analytics-analytics)
  - [Playground (/playground)](#playground-playground)
- [Components Breakdown](#components-breakdown)
  - [Layout Components](#layout-components)
  - [Visualization Components](#visualization-components)
  - [Data Display Components](#data-display-components)
  - [Utility Components](#utility-components)
- [Hooks](#hooks)
- [Libraries](#libraries)
  - [lib/types.ts — TypeScript Types](#libtypests--typescript-types)
  - [lib/api.ts — API Client](#libapits--api-client)
- [Tech Stack](#tech-stack)
- [Configuration](#configuration)

---

## Introduction

The RAG Debugger Dashboard is a **Next.js 16** single-page application for real-time visualization of RAG pipeline traces. It connects to the FastAPI backend to display pipeline stages, chunk retrieval quality, sentence-level grounding attribution, and aggregate analytics.

### Key Features

- **Pipeline Timeline** — color-coded Gantt chart of pipeline stages with click-to-jump
- **Chunk Waterfall** — D3.js grouped bar chart comparing cosine vs. re-rank scores
- **Grounding Highlighter** — sentence-by-sentence attribution with green (grounded) / red (hallucinated) coloring
- **Embedding Scatter** — Canvas2D UMAP projection of query + chunk vectors
- **Live Activity** — WebSocket-powered real-time event feed
- **Analytics** — Recharts line/bar charts with trend data and improvement candidates

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Next.js 16 Dashboard                      │
│                                                              │
│  app/page.tsx ──────────┐                                    │
│  app/traces/page.tsx ───┤                                    │
│  app/traces/[id]/page ──┤  ◄── Pages (Server + Client)      │
│  app/analytics/page ────┤                                    │
│  app/playground/page ───┘                                    │
│                                                              │
│  components/              hooks/              lib/           │
│  ├── PipelineTimeline    ├── useTraceStream   ├── api.ts     │
│  ├── ChunkWaterfall (D3) ├── useRAGMetrics    └── types.ts   │
│  ├── GroundingHighlighter├── useEmbedding                    │
│  ├── EmbeddingScatter    │    Projection                     │
│  ├── MetricsChart        │                                   │
│  ├── TraceList           │                                   │
│  ├── LiveQueryPanel      │                                   │
│  ├── ChunkCard           │                                   │
│  └── ErrorBoundary       │                                   │
│                          │                                   │
│         ┌────────────────┘                                   │
│         ▼                                                    │
│  WebSocket (ws://localhost:7777/ws/{traceId})                 │
│  REST API (http://localhost:7777/traces, /analytics, etc.)    │
└──────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 20+ (22 recommended)
- pnpm 10+

### Installation

```bash
cd apps/dashboard
pnpm install
```

### Development

```bash
pnpm dev
# ▲ Next.js 16.1.6 (Turbopack)
# ✓ Ready in ~350ms
# → http://localhost:3000
```

### Production Build

```bash
pnpm build   # Creates optimized bundle
pnpm start   # Serves production build
```

---

## Project Structure

```
apps/dashboard/
├── app/
│   ├── globals.css                    # Design system (Tailwind 4 + CSS vars)
│   ├── layout.tsx                     # Root layout (Sidebar + main content)
│   ├── page.tsx                       # Home page
│   ├── traces/
│   │   ├── page.tsx                   # Traces list page
│   │   └── [traceId]/
│   │       └── page.tsx               # Trace detail page
│   ├── analytics/
│   │   └── page.tsx                   # Analytics page
│   └── playground/
│       └── page.tsx                   # Playground page
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx                # Navigation sidebar
│   ├── PipelineTimeline.tsx           # Stage duration bar chart
│   ├── ChunkWaterfall.tsx             # D3 grouped bar chart
│   ├── GroundingHighlighter.tsx       # Sentence attribution highlighter
│   ├── EmbeddingScatter.tsx           # Canvas UMAP scatter plot
│   ├── MetricsChart.tsx               # Recharts line + bar charts
│   ├── TraceList.tsx                  # Trace table with filters
│   ├── ChunkCard.tsx                  # Expandable chunk detail card
│   ├── LiveQueryPanel.tsx             # WebSocket live event feed
│   └── ErrorBoundary.tsx              # React error boundary
├── hooks/
│   ├── useTraceStream.ts              # WebSocket connection hook
│   ├── useRAGMetrics.ts               # Analytics data fetching hook
│   └── useEmbeddingProjection.ts      # UMAP projection hook
├── lib/
│   ├── types.ts                       # Shared TypeScript interfaces
│   └── api.ts                         # Typed API client with retry
├── next.config.ts                     # Next.js 16 ESM config
├── tsconfig.json                      # TypeScript configuration
├── package.json                       # Dependencies
└── Dockerfile                         # Containerization
```

---

## Design System

Defined in `app/globals.css` using **Tailwind CSS 4** with CSS-first configuration.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0a0a0f` | Page background |
| `--surface` | `#111118` | Card backgrounds |
| `--surface2` | `#1a1a24` | Nested surfaces, code blocks |
| `--border` | `#2a2a3a` | Borders, dividers |
| `--text` | `#e8e6f0` | Primary text |
| `--muted` | `#7a788a` | Secondary text, labels |
| `--rag` | `#ff6b35` | Orange — primary brand, embed stage |
| `--agent` | `#00d4aa` | Teal — success, grounded, generate stage |
| `--trace` | `#a78bfa` | Purple — rerank stage, latency |
| `--accent` | `#f0c040` | Yellow — retrieve stage, highlights |

### Typography

| Font | Family | Usage |
|------|--------|-------|
| DM Mono | Monospace | Body text, code, data values |
| Fraunces | Serif | Headings (h1, h2, h3) |

### Animations

| Animation | CSS Class | Duration |
|-----------|-----------|----------|
| Skeleton loading | `.skeleton` | 1.5s shimmer loop |
| Live indicator | `.pulse-dot` | 2s opacity pulse |

---

## Pages

### Home (`/`)

The landing dashboard with an overview of pipeline health.

| Section | Component | Data Source |
|---------|-----------|-------------|
| Stat Cards | Inline `StatCard` | `api.analytics.metrics(1)` |
| Recent Traces | `TraceList` | `api.traces.list({limit: 20})` |
| Live Activity | `LiveQueryPanel` | `useTraceStream("__live__")` |
| Quick Start | Code snippet | Static |

**Stat Cards:** Traces Today, Avg Grounding (%), Failure Rate (%), Avg Latency (ms)

---

### Traces (`/traces`)

Filterable, paginated list of all query sessions.

| Feature | Detail |
|---------|--------|
| **Error filter** | Checkbox — show only traces with errors |
| **Grounding filter** | Range slider (0.00–1.00) — minimum grounding score |
| **Reset** | Clears all filters |
| **Row click** | Navigates to `/traces/{traceId}` |

Data source: `api.traces.list({limit: 100, has_error, min_grounding})`

---

### Trace Detail (`/traces/[traceId]`)

Deep-dive view of a single pipeline execution. Contains 5 panels:

#### Panel A — Pipeline Timeline

Shows a horizontal proportional bar chart of stage durations.

| Stage | Color | Example |
|-------|-------|---------|
| embed | `#ff6b35` | 47ms |
| retrieve | `#f0c040` | 246ms |
| rerank | `#a78bfa` | 129ms |
| generate | `#00d4aa` | 360ms |

Click a stage to jump to its tab in Panel E.

#### Panel B — Query & Answer

Side-by-side display of the input query and generated answer. If grounding data is available, the answer uses `GroundingHighlighter` with sentence-level coloring:
- **Green** (teal) — sentence is grounded in retrieved context
- **Red** (orange) — sentence may be hallucinated

#### Panel C — Chunk Score Waterfall

D3.js grouped bar chart comparing **Cosine** (orange) and **Re-rank** (yellow) scores per chunk. Features:
- Staggered animation on load (40ms per bar)
- Hover tooltip with score, rank, and text preview
- Click to expand chunk details below the chart
- Responsive legend

#### Panel D — Embedding Scatter

Canvas2D scatter plot with UMAP-projected embeddings:
- **Orange dot** (large, with glow) — query vector
- **Teal dots** — chunk vectors
- Mouse hover shows chunk ID and text preview
- Loading state with progress bar during UMAP computation

#### Panel E — Stage Details (Tabbed)

Tab bar for `embed | retrieve | rerank | generate`. Each tab shows:
- Duration badge
- Error badge (if applicable)
- Collapsible raw JSON event data

---

### Analytics (`/analytics`)

Aggregate metrics dashboard over the last 7 days.

| Section | Component | Chart Type |
|---------|-----------|------------|
| Summary Cards | `StatCard` × 4 | Text |
| Grounding Score Trend | `MetricsLineChart` | Recharts Line |
| Query Volume | `MetricsLineChart` | Recharts Line |
| Avg Latency Trend | `MetricsLineChart` | Recharts Line |
| Error Count | `MetricsBarChart` | Recharts Bar |
| Improvement Candidates | HTML table | Sorted by lowest grounding |

Data source: `useRAGMetrics(7)` → `api.analytics.metrics(7)`

---

### Playground (`/playground`)

Interactive query testing interface for running queries against an instrumented pipeline.

| Control | Type | Default |
|---------|------|---------|
| Query | Textarea | — |
| Top-K | Range slider (1–50) | 10 |
| Embedding Model | Select dropdown | text-embedding-3-small |
| Run Query | Button | — |

Connects via WebSocket to stream live events for the `trace_id` returned by `POST /playground/query`.

---

## Components Breakdown

### Layout Components

#### `Sidebar.tsx`

Fixed-width (224px) sidebar with brand logo and navigation links.

| Link | Icon | Path |
|------|------|------|
| Home | `⌂` | `/` |
| Traces | `◎` | `/traces` |
| Analytics | `◈` | `/analytics` |
| Playground | `◷` | `/playground` |

Active link is highlighted with the `--rag` color and a subtle orange background.

---

### Visualization Components

#### `PipelineTimeline.tsx`

Gantt-style horizontal bar chart of stage durations.

| Prop | Type | Description |
|------|------|-------------|
| `events` | `RAGEvent[]` | Pipeline events to display |
| `onStageClick` | `(stage) => void` | Callback when a stage is clicked |

Calculates proportional widths based on `duration_ms / total_ms`. Error stages render in red.

---

#### `ChunkWaterfall.tsx`

D3.js grouped bar chart wrapped in an `ErrorBoundary`.

| Prop | Type | Description |
|------|------|-------------|
| `chunks` | `ChunkScore[]` | Chunks with cosine + rerank scores |
| `onChunkClick` | `(chunk) => void` | Callback when a bar is clicked |

Features:
- `d3.scaleBand` for chunk positions + sub-bands for cosine/rerank
- Animated transitions (600ms, staggered 40ms per chunk)
- Custom tooltip (dark theme, positioned at cursor)
- Grid lines and axis labels

---

#### `GroundingHighlighter.tsx`

Sentence-level attribution overlay with hover tooltips.

| Prop | Type | Description |
|------|------|-------------|
| `answer` | `string` | The generated answer text |
| `grounding` | `GroundingResult[]` | Per-sentence scores |
| `chunks` | `ChunkScore[]?` | Source chunks for tooltip |
| `onSentenceHover` | `(chunkId) => void` | Cross-highlight with waterfall |

---

#### `EmbeddingScatter.tsx`

Canvas2D scatter plot with UMAP projection.

| Prop | Type | Description |
|------|------|-------------|
| `queryVector` | `number[] \| null` | Query embedding |
| `chunkVectors` | `{vector, chunk_id, text}[]` | Chunk embeddings |

Uses dynamic import of `umap-js` to avoid SSR issues.

---

#### `MetricsChart.tsx`

Two Recharts components for analytics visualizations:

| Component | Chart Type | Dark Theme |
|-----------|-----------|------------|
| `MetricsLineChart` | Line with dots | `#1a1a24` tooltip |
| `MetricsBarChart` | Vertical bars | Rounded top corners |

---

### Data Display Components

#### `TraceList.tsx`

Sortable table with status indicators and grounding score badges.

| Feature | Detail |
|---------|--------|
| Status dot | Green (ok) / Red (error) |
| Score badge | Color-coded: ≥0.8 teal, ≥0.5 yellow, <0.5 orange |
| Loading state | 5 skeleton rows |
| Empty state | Icon + "No traces recorded yet" |

---

#### `ChunkCard.tsx`

Expandable card showing chunk details.

| Feature | Detail |
|---------|--------|
| Score badges | Cosine (orange) + Rerank (yellow) |
| Text preview | First 200 chars + "show more" |
| Metadata | Collapsible `<details>` with JSON |
| Highlight | Orange border when cross-referenced |

---

#### `LiveQueryPanel.tsx`

WebSocket-powered scrolling event feed.

| Feature | Detail |
|---------|--------|
| Connection indicator | Green/red pulse dot |
| Auto-scroll toggle | ON/OFF button |
| Stage badges | Color-coded per stage |
| Event count | "· N events" label |

---

### Utility Components

#### `ErrorBoundary.tsx`

React class component that catches rendering errors and displays a fallback UI. Wraps `ChunkWaterfall` and `EmbeddingScatter`.

---

## Hooks

### `useTraceStream(traceId: string | null)`

WebSocket connection hook for real-time event streaming.

| Return | Type | Description |
|--------|------|-------------|
| `events` | `RAGEvent[]` | Accumulated events |
| `activeStage` | `string \| null` | Most recent stage |
| `connected` | `boolean` | Connection status |

**Reconnection:** Exponential backoff starting at 1s, max 30s.

---

### `useRAGMetrics(days: number)`

Data-fetching hook for analytics.

| Return | Type | Description |
|--------|------|-------------|
| `data` | `AnalyticsResponse \| null` | Metrics data |
| `loading` | `boolean` | Loading state |
| `error` | `string \| null` | Error message |
| `refetch` | `() => void` | Manual refresh |

---

### `useEmbeddingProjection(queryVector, chunkVectors)`

UMAP projection hook for embedding visualization.

| Return | Type | Description |
|--------|------|-------------|
| `projection` | `ProjectedPoint[]` | 2D coordinates |
| `progress` | `number` | 0-1 computation progress |
| `status` | `idle \| computing \| done \| error` | Current state |

---

## Libraries

### `lib/types.ts` — TypeScript Types

| Type | Description |
|------|-------------|
| `RAGStage` | `"embed" \| "retrieve" \| "rerank" \| "generate" \| "session_complete"` |
| `ChunkScore` | Chunk with cosine/rerank scores |
| `GroundingResult` | Per-sentence attribution |
| `RAGEvent` | Full pipeline event |
| `QuerySession` | Summary row from `query_sessions` |
| `AnalyticsSummary` | Aggregate metrics |
| `DailyMetric` | Per-day breakdown |
| `AnalyticsResponse` | Full analytics response |
| `TraceDetailResponse` | Trace with events array |

---

### `lib/api.ts` — API Client

Typed fetch wrapper with retry logic.

| Feature | Detail |
|---------|--------|
| Base URL | `NEXT_PUBLIC_API_URL` or `http://localhost:7777` |
| Timeout | 30 seconds (`AbortController`) |
| Retries | 3 attempts with exponential backoff (500ms × 2^n) |

#### Available Methods

```typescript
api.traces.list({ limit, offset, has_error, min_grounding })
api.traces.get(traceId)
api.traces.chunks(traceId)
api.traces.embeddings(traceId)
api.traces.grounding(traceId)
api.analytics.metrics(days)
api.health()
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.1.6 |
| UI Library | React | 19.2.4 |
| Styling | Tailwind CSS | 4.2.1 |
| Charts (SVG) | D3.js | 7.9.0 |
| Charts (React) | Recharts | 3.7.0 |
| Embeddings | umap-js | 1.4.0 |
| Dates | date-fns | 4.1.0 |
| Language | TypeScript | 5.9.3 |
| Bundler | Turbopack | Built into Next.js 16 |

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:7777` | Backend server URL |
| Port | `3000` | Dashboard port (via `next dev --port`) |
