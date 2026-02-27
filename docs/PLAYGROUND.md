# Playground

The Playground is a sandbox for testing queries against your live, SDK-instrumented RAG pipeline. Use it to compare configurations, debug output quality, and iterate on retrieval parameters before deploying changes to production. **The Playground does not run a pipeline itself** — it coordinates trace IDs between the dashboard and your running pipeline. When you click "Run Query," the dashboard registers a trace and subscribes to its WebSocket feed. Your pipeline must use that trace ID to send events back.

## Prerequisites

Before using the Playground, ensure:

- [ ] The RAG Debugger server is running at `http://localhost:7777`
- [ ] Your RAG pipeline is running and instrumented with `@rag_trace` decorators
- [ ] The SDK is initialized in your pipeline code:
  ```python
  from rag_debugger import init
  init(dashboard_url="http://localhost:7777")
  ```

## Running Your First Query

1. Open the Playground at [http://localhost:3000/playground](http://localhost:3000/playground)
2. Enter a natural language query in the **Query** text area (e.g., "What is retrieval augmented generation?")
3. Adjust **Top-K**, **Embedding Model**, and **Chunk Size** if desired (defaults work fine for a first run)
4. Click **Run Query** (or press `⌘+Enter` / `Ctrl+Enter`)
5. The results panel shows a **"Waiting for pipeline events…"** card with a generated `trace_id`
6. Copy the `trace_id` and use it in your pipeline:

```python
from rag_debugger import new_trace

new_trace(trace_id="<paste trace_id here>")
result = your_pipeline.run("your query")
```

7. As your pipeline executes each stage (embed → retrieve → rerank → generate), events stream into the results panel in real time
8. When the pipeline completes, the **ResultsSummary** cards appear with grounding score, latency, and chunk count

![Single mode results](./assets/playground-single.png)

## Understanding the Results Panel

After events start arriving, the results panel displays three main elements:

### Pipeline Timeline

A horizontal bar divided into colored segments representing each pipeline stage. Segment widths are proportional to each stage's execution time:

| Color    | Stage    | What it represents                          |
|----------|----------|---------------------------------------------|
| Orange   | Embed    | Query embedding generation                  |
| Yellow   | Retrieve | Vector store search for relevant chunks     |
| Violet   | Rerank   | Cross-encoder re-scoring of retrieved chunks|
| Emerald  | Generate | LLM answer generation with grounding check  |

### Live Feed

A scrolling event log showing each stage as it completes. The abbreviations are:

| Abbreviation | Stage            |
|-------------|------------------|
| `EMB`       | Embed            |
| `RET`       | Retrieve         |
| `RNK`       | Rerank           |
| `GEN`       | Generate         |
| `DONE`      | Session complete |

### Results Summary

Three metric cards appear after the pipeline completes:

- **Grounding Score** — The percentage of generated sentences supported by retrieved context:
  - **≥ 75%**: Good — most claims are grounded in retrieved documents
  - **50–74%**: Moderate — some claims lack source support
  - **< 50%**: Poor — the model is likely hallucinating
- **Latency** — Total pipeline execution time in milliseconds
- **Chunk Count** — Total number of chunks processed across retrieve and rerank stages

## Comparing Two Configurations (A/B Mode)

1. Click the **Compare A/B** toggle in the config panel (or press `A` on your keyboard)
2. Two config panels appear: **Config A** and **Config B**, each with independent Top-K, Embedding Model, and Chunk Size settings
3. Enter a query and click **Run Both** — the dashboard registers two separate trace IDs
4. Run both pipelines with their respective trace IDs:

```python
new_trace(trace_id="<trace_id_a>")
result_a = pipeline_a.run("your query")

new_trace(trace_id="<trace_id_b>")
result_b = pipeline_b.run("your query")
```

5. Results stream into side-by-side panels. When both complete, **winner badges** appear:
   - 🟢 **Winner: Grounding** (emerald) — this config produced a higher grounding score (more sentences supported by retrieved context)
   - 🟣 **Winner: Latency** (violet) — this config completed the full pipeline faster

## Configuration Parameters Reference

| Parameter       | Values                                                                  | Default                    | What it affects                                                                                                           |
|-----------------|-------------------------------------------------------------------------|----------------------------|---------------------------------------------------------------------------------------------------------------------------|
| Top-K           | 1–50 (slider)                                                           | 10                         | Number of chunks retrieved from the vector store. Higher values increase recall but may reduce precision and add latency.  |
| Embedding Model | `text-embedding-3-small`, `text-embedding-3-large`, `text-embedding-ada-002` | `text-embedding-3-small`   | The model used to embed your query into a vector. Must match the model used when your vector store was originally indexed. |
| Chunk Size      | `256 tokens`, `512 tokens`, `1024 tokens`                               | `512 tokens`               | The text segment size used during document ingestion. Smaller chunks are more precise; larger chunks provide more context.  |

## Run History

The last 10 runs are saved automatically to your browser's `localStorage`. Each entry shows the query text, grounding score, and latency.

- **Restore a run**: Click any row in the "Recent Runs" section to restore its query and config to the form
- **Delete a run**: Hover over a row and click the trash icon to remove it
- **Browser-local**: History is stored in your browser only — it is not synced across machines or users. Clearing your browser data will erase it.

## Keyboard Shortcuts

| Key                  | Action                                  |
|----------------------|-----------------------------------------|
| `⌘+Enter` / `Ctrl+Enter` | Run the current query                |
| `A`                  | Toggle between Single and Compare A/B mode |
| `⌘K`                | Open global search to navigate to any past trace |

## Troubleshooting

**"Waiting for pipeline events…" never resolves**

The `trace_id` was not passed to your pipeline, or the pipeline is not running. Verify the SDK is initialized with `init(dashboard_url="http://localhost:7777")` and that your `new_trace(trace_id=...)` call uses the exact ID shown in the dashboard's waiting card. Also ensure your pipeline is actually executing — check the terminal where it runs for errors.

**Results appear but grounding score is missing**

The grounding model (`all-MiniLM-L6-v2`, ~80MB) may still be downloading on first run, or the background grounding worker failed. Wait 10–15 seconds after the `DONE` event, then reload the trace detail page at `/traces/<trace_id>` to check if computed scores appear. If not, check the server logs for grounding worker errors.

**Compare A/B shows one result but not the other**

Both pipelines must call `new_trace` with their respective trace IDs (`trace_id_a` and `trace_id_b`). If only one pipeline was instrumented with its trace ID, only that panel will populate. Double-check that you copied the correct trace ID for each config variant.
