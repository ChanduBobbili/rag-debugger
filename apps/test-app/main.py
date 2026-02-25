"""
RAG Debugger — Test Application
================================
A simulated RAG pipeline that uses the @rag_trace SDK decorator.
Run this to push live traces into the server → dashboard.

Usage:
    python main.py                     # Run all queries
    python main.py --query "my query"  # Run a single custom query
    python main.py --loop              # Run continuously (every 5s)
    python main.py --error             # Simulate an error trace
"""

import asyncio
import random
import time
import math
import argparse
import sys
import os

# Add SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../packages/sdk"))

from rag_debugger import init, rag_trace, new_trace, reset_context


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SERVER_URL = os.environ.get("RAG_SERVER_URL", "http://localhost:7777")

# Simulated knowledge base
KNOWLEDGE_BASE = [
    {
        "id": "kb-001",
        "text": "Retrieval Augmented Generation (RAG) combines a retrieval system with a generative language model. The retrieval system fetches relevant documents from a knowledge base, and the language model uses them as context to generate accurate, grounded responses.",
        "source": "rag-overview.pdf",
        "page": 1,
    },
    {
        "id": "kb-002",
        "text": "Vector embeddings are dense numerical representations of text that capture semantic meaning. They allow similarity search by computing distances (cosine, dot product) between vectors in high-dimensional space.",
        "source": "embeddings-guide.pdf",
        "page": 3,
    },
    {
        "id": "kb-003",
        "text": "HNSW (Hierarchical Navigable Small World) is an algorithm for approximate nearest neighbor search. It builds a multi-layer graph where each layer is a proximity graph, enabling logarithmic search complexity.",
        "source": "vector-search.pdf",
        "page": 7,
    },
    {
        "id": "kb-004",
        "text": "Re-ranking uses cross-encoder models to score query-document pairs more accurately than bi-encoder retrieval. Cross-encoders process the query and document together, capturing fine-grained interactions.",
        "source": "reranking-paper.pdf",
        "page": 2,
    },
    {
        "id": "kb-005",
        "text": "Chunking strategies determine how documents are split before embedding. Semantic chunking preserves natural text boundaries, while fixed-size chunking is simpler but may split sentences. Overlap between chunks prevents information loss at boundaries.",
        "source": "chunking-best-practices.pdf",
        "page": 5,
    },
    {
        "id": "kb-006",
        "text": "Grounding evaluation measures how well each generated sentence is supported by the retrieved context. Methods include NLI-based scoring, sentence-level cosine similarity, and token-level overlap metrics like ROUGE.",
        "source": "grounding-eval.pdf",
        "page": 1,
    },
    {
        "id": "kb-007",
        "text": "Hallucination in RAG pipelines occurs when the language model generates information not present in the retrieved context. Common causes include irrelevant retrieval, insufficient context, and model overconfidence.",
        "source": "hallucination-study.pdf",
        "page": 4,
    },
    {
        "id": "kb-008",
        "text": "Fine-tuning modifies model weights on domain-specific data through gradient updates. Unlike RAG, it bakes knowledge directly into the model, but requires retraining when the knowledge base changes.",
        "source": "fine-tuning-vs-rag.pdf",
        "page": 2,
    },
    {
        "id": "kb-009",
        "text": "Prompt engineering for RAG involves structuring the prompt to clearly separate the retrieved context from the user query. System prompts should instruct the model to only use provided context and acknowledge uncertainty.",
        "source": "prompt-engineering.pdf",
        "page": 6,
    },
    {
        "id": "kb-010",
        "text": "Evaluation metrics for RAG include faithfulness (grounding), answer relevancy, context precision, and context recall. These can be computed using LLM-as-judge or embedding-based similarity methods.",
        "source": "rag-evaluation.pdf",
        "page": 3,
    },
]

SAMPLE_QUERIES = [
    "What is RAG and how does it work?",
    "How do vector embeddings capture semantic meaning?",
    "Explain the HNSW algorithm for nearest neighbor search",
    "What is the purpose of re-ranking in retrieval?",
    "Best practices for chunking documents",
    "How to evaluate grounding in generated responses?",
    "What causes hallucinations in RAG systems?",
    "Difference between RAG and fine-tuning?",
]


# ---------------------------------------------------------------------------
# Simulated RAG Pipeline (instrumented with @rag_trace)
# ---------------------------------------------------------------------------

@rag_trace("embed")
async def embed_query(query: str) -> list[float]:
    """Simulate embedding generation (returns a fake 64-dim vector)."""
    await asyncio.sleep(random.uniform(0.02, 0.08))  # simulate latency
    # Generate a deterministic-ish vector from the query
    random.seed(hash(query) % 10000)
    vector = [random.gauss(0, 1) for _ in range(64)]
    # Normalize
    norm = math.sqrt(sum(x**2 for x in vector))
    return [x / norm for x in vector]


@rag_trace("retrieve")
async def retrieve_chunks(query: str, k: int = 5) -> list[dict]:
    """Simulate vector similarity search against the knowledge base."""
    await asyncio.sleep(random.uniform(0.05, 0.25))  # simulate DB query

    # Pick k random chunks and assign fake similarity scores
    selected = random.sample(KNOWLEDGE_BASE, min(k, len(KNOWLEDGE_BASE)))
    chunks = []
    for i, doc in enumerate(selected):
        cosine = round(random.uniform(0.55, 0.97), 4)
        chunks.append({
            "id": doc["id"],
            "text": doc["text"],
            "score": cosine,
            "cosine_score": cosine,
            "rerank_score": None,  # Not yet reranked
            "final_rank": i,
            "metadata": {"source": doc["source"], "page": doc["page"]},
        })
    # Sort by score descending
    chunks.sort(key=lambda c: c["score"], reverse=True)
    for i, c in enumerate(chunks):
        c["final_rank"] = i
    return chunks


@rag_trace("rerank")
async def rerank_chunks(query: str, chunks: list[dict]) -> list[dict]:
    """Simulate cross-encoder re-ranking."""
    await asyncio.sleep(random.uniform(0.03, 0.12))  # cross-encoder latency

    for chunk in chunks:
        # Simulate rerank score (somewhat correlated with cosine)
        base = chunk["cosine_score"] * 0.7
        noise = random.uniform(-0.15, 0.25)
        chunk["rerank_score"] = round(max(0.1, min(1.0, base + noise)), 4)

    # Re-sort by rerank score
    chunks.sort(key=lambda c: c["rerank_score"], reverse=True)
    for i, c in enumerate(chunks):
        c["final_rank"] = i
    return chunks


@rag_trace("generate")
async def generate_answer(query: str, context: str) -> str:
    """Simulate LLM generation."""
    await asyncio.sleep(random.uniform(0.2, 0.8))  # LLM latency

    # Build a plausible answer from the context chunks
    answers = {
        "What is RAG": "RAG (Retrieval Augmented Generation) is a technique that combines information retrieval with language model generation. It first retrieves relevant documents from a knowledge base using vector similarity search, then provides these documents as context to the LLM for generating grounded responses.",
        "vector embeddings": "Vector embeddings are dense numerical representations that encode the semantic meaning of text into fixed-dimensional spaces. They enable similarity search by computing distances like cosine similarity between encoded queries and documents.",
        "HNSW": "HNSW (Hierarchical Navigable Small World) is a graph-based algorithm for approximate nearest neighbor search. It constructs a multi-layer navigable graph structure that allows efficient search with logarithmic time complexity, making it ideal for large-scale vector databases.",
        "re-ranking": "Re-ranking improves retrieval quality by using cross-encoder models to jointly score query-document pairs. Unlike bi-encoders used in initial retrieval, cross-encoders capture fine-grained semantic interactions, typically improving precision by 15-30%.",
        "chunking": "Document chunking best practices include: using semantic boundaries (paragraphs, sections) rather than fixed character counts, maintaining 10-20% overlap between adjacent chunks, keeping chunk sizes between 256-512 tokens, and preserving document metadata for filtering.",
        "grounding": "Grounding evaluation measures whether generated sentences are supported by retrieved context. Common approaches include NLI-based classification, sentence-level cosine similarity against source chunks, and token-overlap metrics like ROUGE. Each sentence can be classified as grounded or hallucinated.",
        "hallucination": "Hallucinations in RAG systems occur when the model generates information not present in the retrieved documents. Key causes include: irrelevant chunk retrieval, insufficient context length, query-context mismatch, and the model's tendency to fill knowledge gaps from its training data.",
        "fine-tuning": "RAG and fine-tuning take different approaches to knowledge augmentation. Fine-tuning embeds knowledge directly into model weights through gradient updates, while RAG retrieves knowledge at inference time. RAG is more flexible and up-to-date, but fine-tuning can better capture domain-specific reasoning patterns.",
    }

    for key, answer in answers.items():
        if key.lower() in query.lower():
            return answer

    return f"Based on the provided context, {query.lower().rstrip('?')} involves several key concepts from the retrieved documents. The retrieved chunks provide comprehensive coverage of this topic."


async def run_rag_pipeline(query: str, k: int = 5, simulate_error: bool = False):
    """Execute the full RAG pipeline for a single query."""
    print(f"\n{'='*60}")
    print(f"  Query: {query}")
    print(f"{'='*60}")

    reset_context()  # Fresh trace for each query
    start = time.time()

    try:
        # Stage 1: Embed
        print("  ⚡ Embedding query...")
        vector = await embed_query(query)
        print(f"     → {len(vector)}-dim vector generated")

        # Stage 2: Retrieve
        print(f"  🔍 Retrieving top-{k} chunks...")
        chunks = await retrieve_chunks(query, k=k)
        print(f"     → {len(chunks)} chunks retrieved (scores: {chunks[0]['score']:.3f} → {chunks[-1]['score']:.3f})")

        # Stage 3: Rerank
        print("  📊 Re-ranking chunks...")
        reranked = await rerank_chunks(query, chunks)
        print(f"     → Top rerank score: {reranked[0]['rerank_score']:.3f}")

        # Simulate error if requested
        if simulate_error:
            raise RuntimeError("Simulated context window exceeded error")

        # Stage 4: Generate
        context = "\n\n".join(c["text"] for c in reranked[:3])
        print("  🤖 Generating answer...")
        answer = await generate_answer(query, context)
        print(f"     → {len(answer)} chars generated")

        elapsed = (time.time() - start) * 1000
        print(f"\n  ✅ Pipeline complete in {elapsed:.0f}ms")
        print(f"  Answer: {answer[:120]}...")
        return answer

    except Exception as e:
        elapsed = (time.time() - start) * 1000
        print(f"\n  ❌ Pipeline failed in {elapsed:.0f}ms: {e}")
        raise


async def main():
    parser = argparse.ArgumentParser(description="RAG Debugger Test App")
    parser.add_argument("--query", type=str, help="Run a single custom query")
    parser.add_argument("--loop", action="store_true", help="Run continuously every 5s")
    parser.add_argument("--error", action="store_true", help="Simulate an error trace")
    parser.add_argument("--k", type=int, default=5, help="Number of chunks to retrieve")
    parser.add_argument("--server", type=str, default=SERVER_URL, help="Server URL")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════════════╗")
    print("║       RAG Debugger — Test Application            ║")
    print("╚══════════════════════════════════════════════════╝")
    print(f"  Server: {args.server}")
    print(f"  Mode:   {'Loop' if args.loop else 'Single run'}")

    # Initialize the SDK
    init(dashboard_url=args.server)
    print("  SDK:    ✓ Initialized\n")

    # Give the background worker time to start
    await asyncio.sleep(0.5)

    if args.query:
        # Single custom query
        await run_rag_pipeline(args.query, k=args.k, simulate_error=args.error)
    elif args.loop:
        # Continuous mode
        print("  Running in loop mode (Ctrl+C to stop)...\n")
        cycle = 0
        while True:
            query = random.choice(SAMPLE_QUERIES)
            should_error = args.error or random.random() < 0.1  # 10% error rate
            try:
                await run_rag_pipeline(query, k=args.k, simulate_error=should_error)
            except Exception:
                pass
            cycle += 1
            print(f"\n  ⏳ Waiting 5s... (cycle {cycle})")
            await asyncio.sleep(5)
    else:
        # Run all sample queries
        for query in SAMPLE_QUERIES:
            try:
                await run_rag_pipeline(query, k=args.k, simulate_error=args.error)
            except Exception:
                pass
            await asyncio.sleep(0.5)  # Small gap between traces

    # Give emitter time to flush
    print("\n  📤 Flushing events...")
    await asyncio.sleep(2)
    print("  ✅ Done! Check the dashboard at http://localhost:3000")


if __name__ == "__main__":
    asyncio.run(main())
