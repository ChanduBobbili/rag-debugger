# RAG Debugger — Dashboard Documentation

**Version:** 0.0.1  
**Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · shadcn/ui · Recharts · D3.js · Geist fonts  
**Server:** FastAPI + DuckDB on `http://localhost:7777`  
**Dashboard:** `http://localhost:3000`

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [How the Dashboard Works](#2-how-the-dashboard-works)
3. [Layout — Sidebar & Topbar](#3-layout--sidebar--topbar)
4. [Home Page](#4-home-page)
5. [Traces Page](#5-traces-page)
6. [Trace Detail Page](#6-trace-detail-page)
7. [Analytics Page](#7-analytics-page)
8. [Playground Page](#8-playground-page)
9. [Settings Page](#9-settings-page)
10. [Keyboard Shortcuts](#10-keyboard-shortcuts)
11. [Data Types Reference](#11-data-types-reference)
12. [Known Limitations](#12-known-limitations)

---

## 1. Quick Start

### Prerequisites

| Service | Command | Expected output |
|---------|---------|-----------------|
| Server | `cd apps/server && uv run uvicorn main:app --port 7777 --reload` | `✓ DuckDB initialized` |
| Dashboard | `cd apps/dashboard && pnpm dev` | `Local: http://localhost:3000` |
| Test data | `cd apps/test-app && .venv/bin/python3 main.py` | 8 traces pushed to server |

### Environment variable

By default the dashboard talks to `http://localhost:7777`. If your server runs elsewhere:

```bash
# apps/dashboard/.env.local
NEXT_PUBLIC_API_URL=http://your-server:7777
```

### Connection status

The green **Live** badge in the top-right of every page confirms the WebSocket connection to the server is active. If it shows red **Offline**, check the server is running before using any page.

---

## 2. How the Dashboard Works

### Data flow

```
Your RAG app
  → @rag_trace decorator (SDK)
    → POST /events (server)
      → DuckDB storage
      → WebSocket broadcast → Dashboard updates live
      → Background grounding computation (MiniLM model)
```

Every time a decorated function in your pipeline runs, the SDK emits an event. The dashboard receives those events in real time via WebSocket and also reads historical data from REST endpoints.

### Event types

| Stage | What it captures |
|-------|-----------------|
| `embed` | Query text, vector dimensions, duration |
| `retrieve` | Retrieved chunks with cosine scores, duration |
| `rerank` | Reranked chunks with new scores, duration |
| `generate` | Generated answer text, duration |
| `session_complete` | Summary: total duration, grounding score, chunk count |

### Grounding score

After the `generate` event arrives, the server runs `all-MiniLM-L6-v2` in a background process to score each sentence in the generated answer against the retrieved chunks. A sentence scores above `0.65` cosine similarity is marked **grounded** (green). Below that is **hallucinated** (red). The overall grounding score is the fraction of grounded sentences, expressed as a decimal (e.g., `0.87` = 87% of sentences supported by retrieved context).

This computation takes 2–10 seconds. The Trace Detail page shows a spinner while it runs.

### Color language

The dashboard uses a consistent 4-color system for RAG stages across every chart, badge, and timeline:

| Stage | Color |
|-------|-------|
| Embed | Orange |
| Retrieve | Yellow |
| Rerank | Violet |
| Generate | Emerald |
| Error | Red |

---

## 3. Layout — Sidebar & Topbar

### Sidebar

The sidebar appears on the left on desktop (`lg` breakpoint and above). On mobile it is hidden behind a hamburger button that opens a slide-in sheet.

**Expanded (240px):**
- Logo: hexagon icon + "RAG Debugger" + version number
- **Workspace** section: Dashboard, Traces, Analytics, Playground
- **System** section: Settings
- Collapse toggle button at the bottom
- Connection status footer: green pulsing dot + "Connected" when server is reachable, red dot + "Offline" when not

**Collapsed (64px):**
- Icons only, no labels
- Hovering any icon shows a tooltip with the page name
- Connection dot only (hover for server URL)

Press `[` anywhere on the page (when not in an input) to toggle the sidebar.

**Active page indicator:** The current page's nav item has an orange left border accent and a slightly lighter background.

### Topbar

Fixed 52px bar across the top of the content area.

- **Left:** Breadcrumb — shows the current page name. On a trace detail page it shows `Traces / {trace_id}`.
- **Center:** Search button — click or press `⌘K` (Mac) / `Ctrl+K` (Windows/Linux) to open the command palette. Shows the last 10 traces searchable by query text or trace ID.
- **Right:** Connection badge — green "Live" when WebSocket is connected, red "Offline" when not. Hover it for the server URL.
- **Mobile only:** Hamburger button on the far left to open the sidebar sheet.

### Command palette (`⌘K`)

Opens a dialog that searches through your recent traces. Type any part of a query or trace ID. Each result shows:
- Green/red status dot (success/error)
- Query text (truncated to 60 characters)
- Grounding score badge (color-coded)
- Relative timestamp

Selecting a result navigates directly to that trace's detail page.

---

## 4. Home Page

**Route:** `/`  
**API calls:** `GET /analytics/metrics?days=7`, `GET /traces?limit=8`  
**WebSocket:** `/ws/__live__`

The home page gives you a live dashboard overview of your RAG pipeline's health.

### Stat Cards

Four metric cards load in parallel with independent loading states:

| Card | What it shows | Color |
|------|--------------|-------|
| **Traces Today** | Total queries recorded in the last 7 days | Orange |
| **Avg Grounding** | Mean grounding score across all traces, as a percentage | Emerald |
| **Failure Rate** | Percentage of traces that had an error in any stage | Red |
| **Avg Latency** | Mean total pipeline duration in milliseconds | Violet |

Each card has:
- A 7-day sparkline at the bottom showing the trend
- The value in large monospace font
- A delta badge (↑/↓) when a `delta` prop is available

**While loading:** Each card shows a skeleton placeholder matching the card's exact dimensions. No "Loading..." text.

**When value is unavailable:** Displays `—` (em dash).

### Recent Traces

Shows the last 8 traces as clickable rows. Each row contains:

- **Left:** Green dot (success) or red dot (error)
- **Query text:** Truncated to one line
- **Trace ID:** First 8 characters in monospace
- **Stage dots:** Colored dots connected by `→` arrows showing which stages ran (e.g., orange → yellow → violet → emerald for a full 4-stage pipeline)
- **Right side:** Grounding score badge (color-coded by threshold), total latency in ms, relative time ("2m", "1h")
- **Hover:** Chevron → icon appears on the right; row background lightens

Clicking any row navigates to the Trace Detail page for that trace.

**Grounding badge colors:**

| Score | Color |
|-------|-------|
| ≥ 0.75 | Emerald (good) |
| 0.50–0.74 | Yellow (moderate) |
| < 0.50 | Red (poor) |
| No score | Grey (error or no generate stage) |

### Live Activity Feed

Shows pipeline events as they arrive via WebSocket in real time. Each row shows:
- Stage badge (`EMB`, `RET`, `RNK`, `GEN`, `DONE`) with stage color
- Query text (truncated)
- Duration in ms
- Red `⚠` icon if the event has an error

New events animate in from the left. The feed auto-scrolls to the newest event. If you scroll up to inspect older events, auto-scroll pauses. Scrolling back to the bottom resumes it.

The header shows a pulsing green dot + "Live" when connected, the total event count.

### Getting Started (empty state)

Shown only when no traces exist yet. Displays a 3-step quick-start guide with copyable code blocks for **Python**, **LangChain**, and **LlamaIndex**. Each code block has a copy button that shows a checkmark for 2 seconds after clicking.

---

## 5. Traces Page

**Route:** `/traces`  
**API calls:** `GET /traces?limit=100` (re-fetched when filter changes)

Lists all recorded traces with filtering and search.

### Filter Bar

Sticky at the top of the content area (doesn't scroll with the list). Contains:

**Search input** — filters client-side by query text or trace ID as you type. No server round-trip.

**Filter buttons:**

| Button | What it shows |
|--------|--------------|
| **All** | All traces (default) |
| **Errors** | Only traces where `has_error = true`. Re-fetches from server with `?has_error=true`. |
| **Low grounding < 0.5** | Client-side filter: traces with `overall_grounding_score < 0.5`. Does not re-fetch. |

When "Errors" is active, the page re-fetches from the server (the other two filters work client-side on already-loaded data).

**Active filter** has a secondary background color. Inactive filters are ghost buttons.

### Trace List

Same `TraceRow` component used on the home page. Rows stagger in with a 40ms animation delay between them.

**Empty state:** A dashed border box with a unicoded circle icon and "No traces yet" with a hint to instrument your pipeline.

**Loading state:** 6 skeleton placeholder rows the same height as real rows.

**Trace count:** Shown below the page title as `{N} total recorded` in monospace.

---

## 6. Trace Detail Page

**Route:** `/traces/[traceId]`  
**API calls (parallel):** `GET /traces/{id}`, `GET /traces/{id}/embeddings`  
**API call (independent):** `GET /traces/{id}/grounding`  
**WebSocket:** Not used on this page (data is historical)

The most data-rich page in the dashboard. Shows every detail of a single RAG pipeline execution.

### Header

- **Breadcrumb:** `Traces / {first 8 chars of trace ID}` — clicking "Traces" navigates back
- **Query text:** Full query, up to 80 characters (truncated with `…`)
- **Share button:** Copies the current URL to clipboard

### Pipeline Timeline

A horizontal bar showing all stages as colored segments. Width of each segment is proportional to that stage's duration as a percentage of the total pipeline time.

- **Hover** a segment: tooltip shows stage name, exact milliseconds, and percentage of total
- **Click** a segment: activates the corresponding stage tab below
- **Error stages** render as a red diagonal stripe pattern instead of the stage color
- **Animation:** Each segment grows from left to right with a staggered delay on page load

Below the bar, clickable text labels show: colored dot + stage name + duration in ms.

**Total duration** appears in the top-right corner of the timeline card.

### Query & Answer Cards

Two cards side by side (stacked on mobile):

**Query card:** Full query text with comfortable line spacing.

**Generated Answer card:**
- If grounding has finished computing: answer text with sentence-level highlights (green = grounded, red = hallucinated). Hover a highlighted sentence for a tooltip showing the match score and a preview of the source chunk.
- If grounding is still computing: a spinner with "Computing grounding scores…"
- If no answer was generated: "No answer generated"

### Stage Tabs

Four tabs: **Embed**, **Retrieve**, **Rerank**, **Generate**.

Each tab trigger shows:
- Colored dot (stage color)
- Stage name
- Duration in ms (from that stage's event)
- Disabled (50% opacity) if no event exists for that stage

The active tab has an orange bottom border.

**Keyboard:** `←` / `→` arrows switch tabs (when not in an input field).

---

#### Embed Tab

A 2×2 grid of metadata cards:

| Card | Value |
|------|-------|
| Model | Embedding model name from `event.metadata.model` (fallback: `text-emb-3-small`) |
| Dimensions | Vector length from `event.query_vector.length` or `event.metadata.dimensions` |
| Duration | `event.duration_ms` in ms |
| Vector Norm | From `event.metadata.norm` (fallback: `1.000`) |

---

#### Retrieve Tab

**Stage meta panel** (2×2 grid):

| Card | Value |
|------|-------|
| Chunks Retrieved | Number of chunks in `event.chunks` |
| Duration | `event.duration_ms` in ms |
| Index Type | `event.metadata.index_type` (fallback: `vector`) |
| Top Score | Highest `cosine_score` across all chunks |

**Chunk Waterfall chart** (D3.js):

A grouped bar chart with one group per chunk. Each group has two bars:
- Orange bar: cosine score (initial retrieval score)
- Yellow bar: rerank score (after re-ranking, if available)

X-axis labels: `C1`, `C2`, `C3`, … (chunk index)  
Y-axis: 0.0 to 1.0 (score)

- Bars animate up from the bottom on render, with a 40ms stagger between chunks
- Hover a bar: tooltip shows score value, chunk rank, and first 60 characters of chunk text
- Click a bar: selects that chunk and shows the **Chunk Card** below the chart

**Chunk Card** (shown when a chunk is selected):
- Chunk ID badge
- Orange score bar: cosine score
- Violet score bar: rerank score (if available)
- `#N` rank indicator
- Chunk text (up to 200 characters, "…more" to expand)
- Metadata details in a `<details>` element

---

#### Rerank Tab

**Chunk Score Table** — one row per chunk, sorted by `final_rank`:

| Column | Content |
|--------|---------|
| Rank | Final rank number |
| Chunk ID | First 12 characters in a monospace badge |
| Cosine Score | Orange progress bar + numeric value |
| Rerank Score | Violet progress bar + numeric value |
| Delta | Percentage change between cosine and rerank score, green if positive, red if negative |

Rows where the reranker **promoted** a chunk (delta > +10%) have a subtle emerald background.

---

#### Generate Tab

Two panels:

1. **Grounding Highlighter** — same sentence-level highlight view as the Answer card in the header, but with more space. Green = grounded, red = hallucinated.

2. **Sentence-level grounding table:**

| Column | Content |
|--------|---------|
| # | Sentence index |
| Sentence | Truncated to one line |
| Score | Percentage badge, emerald if grounded, red if not |
| Source | First 10 characters of the source chunk ID, or `—` if hallucinated |

**Raw Event Data** — a collapsible `<details>` at the bottom of every stage tab showing the full JSON of the `RAGEvent` object. Useful for debugging.

### Embedding Space (UMAP)

Shown only if the `embed` stage has a vector (`embeddings.available === true`).

A canvas-based scatter plot that projects all vectors into 2D using UMAP:
- **Orange dot (larger, with glow):** Query vector
- **Teal/green dots:** Retrieved chunk vectors
- **Status:** Shows "Computing UMAP projection…" while running, "Failed to compute" on error

Hover a dot: tooltip shows "Query" or `Chunk {id}` + first 100 characters of the text.

> **Note:** The chunk vectors currently use placeholder random values because storing full high-dimensional vectors is expensive. The query vector is real. This view is primarily useful for understanding cluster shape and proximity of the query to retrieved chunks.

---

## 7. Analytics Page

**Route:** `/analytics`  
**API calls:** `GET /analytics/metrics?days={7|30|90}` (re-fetched when time range changes)  
**Hook:** `useRAGMetrics(days)`

Shows pipeline performance over time with trend charts and a table of traces that need attention.

### Time Range Toggle

Three buttons in the top-right: **7d**, **30d**, **90d**. Clicking one re-fetches all data for that window. The active range has a secondary background.

### Stat Cards

Same `StatCard` component as the home page, showing aggregated values for the selected time window:

| Card | Metric | Source |
|------|--------|--------|
| Total Queries | Count of traces | `summary.total` |
| Avg Grounding | Mean grounding score as % | `summary.avg_grounding` |
| Avg Latency | Mean total duration in ms | `summary.avg_latency` |
| Failure Rate | % of traces with errors | `summary.failure_rate` |

### Charts (2×2 grid)

All charts use Recharts with a shared tooltip design: dark background, monospace font, colored dot per series.

**Grounding Score Trend** (Area chart)
- Y-axis: 0–100% grounding score
- Green area fill with gradient
- A dashed reference line at 70% labeled "Target"
- Question it answers: *"Is answer quality improving over time?"*

**Latency Distribution** (Line chart)
- Y-axis: milliseconds
- Violet line for average latency
- Question it answers: *"Is my pipeline getting faster?"*

**Query Volume** (Bar chart)
- Y-axis: number of queries per day
- Orange bars
- Question it answers: *"When are users asking the most questions?"*

**Error Breakdown** (Bar chart)
- Y-axis: error count per day
- Red bars
- Question it answers: *"Which days have the most failures?"*
- Note: Stage-level breakdown is planned but not yet implemented

**Empty state (all charts):** When no data exists for the selected time range, shows a centered bar chart icon with "No data for this time range" and a hint to run some SDK queries.

### Improvement Candidates Table

Appears when `worst_queries` data is available (lowest grounding scores). Shows up to 10 traces sorted by grounding score ascending by default.

**Columns:**

| Column | Content | Sortable |
|--------|---------|---------|
| # | Row number | — |
| Query | Query text (truncated) | Yes |
| Grounding | Mini progress bar + score badge in red | Yes |
| Latency | Duration in ms, red if > 5,000ms | Yes |
| (action) | "Inspect →" link to the trace detail page | — |

Click any sortable column header to sort. Click again to reverse direction. An `↕` icon appears on the active sort column.

---

## 8. Playground Page

**Route:** `/playground`  
**API calls:** `POST /playground/query`, `POST /playground/compare`  
**WebSocket:** `/ws/{trace_id}` (subscribed after a run)

An experimental sandbox for testing queries against your live RAG pipeline.

> **Important:** The Playground does not run a RAG pipeline itself. It generates a `trace_id` and tells your SDK-instrumented pipeline to emit events tagged with that ID. Your pipeline must already be running and instrumented with `@rag_trace` for results to appear.

### Configuration Panel (left, 320px)

**Mode toggle:** Switch between **Single** and **Compare A/B** mode.

**Query textarea:**
- Auto-resizes as you type (max ~160px height)
- 500-character limit with a live counter below
- `Ctrl+Enter` / `⌘+Enter` submits the query

**Parameters:**
- **Top-K** slider: 1–50, orange accent, live value display
- **Embedding Model** dropdown: `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002`
- **Chunk Size** dropdown: `256 tokens`, `512 tokens`, `1024 tokens`

**In Compare A/B mode:** Shows two sets of parameters — "Config A" and "Config B" — separated by a divider. The query is shared between both.

**Run button:**
- Default: orange background, `▷ Run Query` (or `▷ Run Both` in compare mode)
- Running: grey background, spinner + "Running…", disabled
- Disabled when query is empty: 50% opacity, not clickable

**Recent Runs** (below a divider, only when history exists):
- Up to 10 past runs from `localStorage`
- Each shows: truncated query, grounding score badge, latency in ms
- **Click** a row: restores that query and config to the form
- **Hover** a row: trash icon appears to delete that entry

**Keyboard shortcut:** `A` (when not in an input) toggles between Single and Compare A/B mode.

### Results Panel (right)

**Empty state (before first run):**
- Play icon in a rounded square
- "Ready to run" heading
- Short explanation that the pipeline must be running
- `init(dashboard_url="http://localhost:7777")` snippet

**After clicking Run:**

The results panel shows three sections that build as events arrive:

1. **Pipeline Timeline** — same animated timeline as the Trace Detail page, showing which stages have completed so far

2. **Live Events feed** — same `LiveFeed` component as the home page. Events stream in as the pipeline runs. Auto-scrolls. Pauses if you scroll up.

3. **Results Summary** — appears only after a `session_complete` event arrives (the final event that signals the pipeline finished). Three mini cards:
   - **Grounding Score** — percentage, color-coded (emerald ≥ 75%, yellow ≥ 50%, red < 50%)
   - **Total Latency** — sum of all stage durations
   - **Chunks Retrieved** — total chunks across all stages

   The cards animate in with a staggered entrance.

4. **Trace ID** — shown in small monospace text below the summary. Click the trace ID to go to the full Trace Detail page.

### Compare A/B Mode

Two ResultsPanel columns side by side. Each column has a header badge:
- **Config A** — `k={value}, {model-short-name}`
- **Config B** — `k={value}, {model-short-name}`

After both pipelines finish (both receive `session_complete`), **winner badges** appear automatically:
- Emerald "Winner: Grounding" on the config with the higher grounding score
- Violet "Winner: Latency" on the config with the lower total latency

---

## 9. Settings Page

**Route:** `/settings`

Currently a placeholder. Shows "Settings page coming soon" with a note that server URL, theme preferences, and more are planned.

---

## 10. Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `[` | Toggle sidebar collapse | Anywhere (not in inputs) |
| `⌘K` / `Ctrl+K` | Open command search | Anywhere |
| `G` then `H` | Navigate to Home | Anywhere (200ms window) |
| `G` then `T` | Navigate to Traces | Anywhere |
| `G` then `A` | Navigate to Analytics | Anywhere |
| `G` then `P` | Navigate to Playground | Anywhere |
| `←` / `→` | Switch stage tabs | Trace Detail page |
| `Escape` | Navigate back to /traces | Trace Detail page |
| `C` | Copy trace ID to clipboard | Trace Detail page |
| `Ctrl+Enter` / `⌘+Enter` | Submit query | Playground textarea |
| `A` | Toggle Single/Compare A/B | Playground (not in inputs) |

---

## 11. Data Types Reference

### `QuerySession` (trace list row)

```typescript
interface QuerySession {
  query_id: string           // UUID
  trace_id: string           // UUID
  query_text: string | null  // The user's question
  total_duration_ms: number | null  // Sum of all stage durations
  chunk_count: number | null        // Chunks retrieved
  final_answer: string | null       // Generated answer
  overall_grounding_score: number | null  // 0.0–1.0
  has_error: boolean
  stage_count: number        // How many stages ran
  created_at: string         // ISO timestamp
}
```

### `RAGEvent` (individual pipeline stage)

```typescript
interface RAGEvent {
  id: string
  trace_id: string
  query_id: string
  stage: "embed" | "retrieve" | "rerank" | "generate" | "session_complete"
  ts_start: number           // Unix timestamp (seconds)
  duration_ms: number | null
  query_text: string | null
  query_vector: number[] | null  // Embedding vector
  chunks: ChunkScore[] | null    // Retrieved/reranked chunks
  generated_answer: string | null
  grounding_scores: GroundingResult[] | null
  error: string | null
  metadata: Record<string, unknown>
}
```

### `ChunkScore`

```typescript
interface ChunkScore {
  chunk_id: string
  text: string
  cosine_score: number       // Initial retrieval score (0.0–1.0)
  rerank_score: number | null  // After re-ranking (0.0–1.0)
  final_rank: number         // 0-indexed final position
  metadata: Record<string, unknown>
}
```

### `GroundingResult`

```typescript
interface GroundingResult {
  sentence: string
  grounded: boolean          // true if score > 0.65
  score: number              // Cosine similarity to best matching chunk
  source_chunk_id: string | null  // null if hallucinated
}
```

### `AnalyticsResponse`

```typescript
interface AnalyticsResponse {
  daily: DailyMetric[]
  summary: {
    total: number
    avg_grounding: number | null
    avg_latency: number | null
    failure_rate: number       // Percentage (0–100)
  }
  worst_queries: QuerySession[]
}

interface DailyMetric {
  date: string               // ISO date string
  total_queries: number
  avg_grounding: number | null
  avg_latency_ms: number | null
  error_count: number
}
```

---

## 12. Known Limitations

### Playground requires an external pipeline

The `POST /playground/query` endpoint returns a `trace_id` and a WebSocket URL, but does not execute a pipeline. Your SDK-instrumented application must call `new_trace(trace_id=returned_id)` and then run its pipeline for events to appear in the Playground results panel.

**Workaround:** While the Playground is open and subscribed to a trace ID, run this in your terminal:

```bash
cd apps/test-app
RAG_TRACE_ID=<trace_id_from_playground> .venv/bin/python3 main.py --query "your query"
```

### UMAP scatter uses placeholder chunk vectors

The Embedding Space panel on the Trace Detail page shows the real query vector but uses random placeholder vectors for chunks. This is because chunk vectors are large and storing them all in DuckDB is expensive. The scatter shape and query position are accurate; individual chunk positions are not.

### Grounding takes 2–10 seconds

The MiniLM grounding model runs in a background process after the `generate` event arrives. During this time the answer card shows a spinner. Refresh the page if the spinner persists beyond 30 seconds — this usually indicates the grounding worker failed silently.

### LiveFeed height in Tailwind

The `LiveFeed` component sets height via a dynamic string `h-[${maxVisible * 40}px]`. Tailwind v4 does not support dynamic class names generated at runtime. If the feed appears too tall or too short, this is the cause. The inline `style` prop on the scroll container compensates for this.

### Settings page is a placeholder

The `/settings` page currently shows only a "coming soon" card. Server URL configuration, theme preferences, and retention policy settings are planned but not implemented.

### GettingStarted uses incorrect SDK import paths

The "LangChain" and "LlamaIndex" tabs in the Getting Started panel on the home page reference `from rag_debugger.integrations import ...` but the actual SDK adapter paths are `from rag_debugger.adapters.langchain import RAGDebuggerCallback` and `from rag_debugger.adapters.llamaindex import RAGDebuggerLlamaIndex`.