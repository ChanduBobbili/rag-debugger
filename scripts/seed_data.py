"""Seed the RAG Debugger with realistic sample traces."""
import httpx, time, uuid, random

BASE = "http://localhost:7777"

QUERIES = [
    "What is retrieval augmented generation and how does it work?",
    "Explain the difference between fine-tuning and RAG",
    "How do vector databases store and retrieve embeddings?",
    "What are the best practices for chunking documents in RAG?",
    "How does re-ranking improve retrieval quality?",
    "What causes hallucinations in RAG pipelines?",
    "Compare cosine similarity vs dot product for embedding search",
    "How to evaluate grounding in LLM responses?",
]

ANSWERS = [
    "Retrieval Augmented Generation (RAG) combines a retrieval system with a language model. First, relevant documents are retrieved from a knowledge base using embedding similarity, then these documents are provided as context to the LLM for generating accurate answers.",
    "Fine-tuning modifies model weights on domain-specific data, while RAG retrieves relevant context at inference time. RAG is more flexible and doesn't require retraining, but fine-tuning can capture nuanced domain knowledge better.",
    "Vector databases like Pinecone, Weaviate, and Qdrant store high-dimensional embedding vectors and use approximate nearest neighbor (ANN) algorithms like HNSW or IVF to efficiently retrieve similar vectors at scale.",
    "Best practices include: 1) Use semantic chunking over fixed-size splits, 2) Maintain 10-20% overlap between chunks, 3) Keep chunks between 256-512 tokens, 4) Preserve document structure like headers and paragraphs.",
    "Re-ranking uses a cross-encoder model to score query-document pairs more accurately than bi-encoder retrieval. It typically improves precision@k by 15-30% by reordering the initial retrieval results.",
    "Hallucinations in RAG occur when: 1) Retrieved context is irrelevant, 2) The model ignores provided context, 3) Chunk size is too large diluting relevant information, 4) The query falls outside the knowledge base scope.",
    "Cosine similarity measures the angle between vectors (scale-invariant), while dot product measures both angle and magnitude. For normalized embeddings they are equivalent. Cosine is preferred when embedding magnitudes vary.",
    "Grounding evaluation checks if each generated sentence is supported by retrieved context. Methods include NLI-based scoring, sentence-level attribution, and token-level overlap metrics like ROUGE.",
]

CHUNK_TEXTS = [
    "RAG combines information retrieval with text generation, allowing LLMs to access external knowledge beyond their training data.",
    "Vector embeddings are dense numerical representations of text that capture semantic meaning in high-dimensional space.",
    "HNSW (Hierarchical Navigable Small World) graphs provide efficient approximate nearest neighbor search with logarithmic complexity.",
    "Cross-encoder models process query-document pairs jointly, producing more accurate relevance scores than bi-encoders.",
    "Semantic chunking preserves the natural boundaries of text, producing more coherent chunks for embedding and retrieval.",
    "Sentence-level grounding scores measure how well each generated sentence is supported by the retrieved context.",
    "The retrieval step uses embedding similarity to find the most relevant chunks from the knowledge base.",
    "Fine-tuning adapts pre-trained model weights through additional training on domain-specific data.",
    "Approximate nearest neighbor algorithms trade a small amount of accuracy for significant speed improvements.",
    "Document preprocessing including cleaning, deduplication, and metadata extraction improves retrieval quality.",
]

def seed():
    client = httpx.Client(timeout=10)

    for i, query in enumerate(QUERIES):
        trace_id = f"tr-{uuid.uuid4().hex[:8]}"
        query_id = f"q-{uuid.uuid4().hex[:8]}"
        has_error = random.random() < 0.15  # 15% error rate

        # Stage 1: embed
        embed_dur = random.uniform(15, 80)
        client.post(f"{BASE}/events", json={
            "trace_id": trace_id, "query_id": query_id,
            "stage": "embed", "ts_start": time.time(),
            "duration_ms": embed_dur,
            "query_text": query,
        })

        # Stage 2: retrieve
        k = random.randint(5, 12)
        chunks = []
        for j in range(k):
            chunks.append({
                "chunk_id": f"chunk-{j+1}",
                "text": random.choice(CHUNK_TEXTS),
                "cosine_score": round(random.uniform(0.55, 0.98), 4),
                "rerank_score": round(random.uniform(0.3, 0.95), 4) if random.random() > 0.3 else None,
                "final_rank": j,
                "metadata": {"source": f"doc-{random.randint(1,20)}.pdf", "page": random.randint(1,50)},
            })
        retrieve_dur = random.uniform(50, 300)
        client.post(f"{BASE}/events", json={
            "trace_id": trace_id, "query_id": query_id,
            "stage": "retrieve", "ts_start": time.time(),
            "duration_ms": retrieve_dur,
            "query_text": query, "chunks": chunks,
        })

        # Stage 3: rerank
        rerank_dur = random.uniform(30, 150)
        reranked = sorted(chunks, key=lambda c: c["rerank_score"] or 0, reverse=True)
        for j, c in enumerate(reranked):
            c["final_rank"] = j
        client.post(f"{BASE}/events", json={
            "trace_id": trace_id, "query_id": query_id,
            "stage": "rerank", "ts_start": time.time(),
            "duration_ms": rerank_dur,
            "query_text": query, "chunks": reranked,
        })

        # Stage 4: generate
        answer = ANSWERS[i]
        gen_dur = random.uniform(200, 1500)
        error_msg = "Context window exceeded" if has_error else None
        grounding = []
        sentences = [s.strip() for s in answer.split(". ") if s.strip()]
        for s in sentences:
            grounded = random.random() > 0.25
            grounding.append({
                "sentence": s + ("." if not s.endswith(".") else ""),
                "grounded": grounded,
                "score": round(random.uniform(0.7, 0.99) if grounded else random.uniform(0.1, 0.45), 3),
                "source_chunk_id": random.choice(chunks)["chunk_id"] if grounded else None,
            })
        client.post(f"{BASE}/events", json={
            "trace_id": trace_id, "query_id": query_id,
            "stage": "generate", "ts_start": time.time(),
            "duration_ms": gen_dur,
            "query_text": query,
            "generated_answer": answer if not has_error else None,
            "grounding_scores": grounding if not has_error else None,
            "error": error_msg,
        })

        # Session complete
        total_dur = embed_dur + retrieve_dur + rerank_dur + gen_dur
        grounding_scores = [g["score"] for g in grounding] if grounding else []
        avg_grounding = sum(grounding_scores) / len(grounding_scores) if grounding_scores else None
        client.post(f"{BASE}/events", json={
            "trace_id": trace_id, "query_id": query_id,
            "stage": "session_complete", "ts_start": time.time(),
            "duration_ms": total_dur,
            "query_text": query,
            "generated_answer": answer if not has_error else None,
            "metadata": {
                "stage_count": 4,
                "chunk_count": k,
                "has_error": has_error,
                "total_duration_ms": total_dur,
                "overall_grounding_score": avg_grounding,
            },
        })

        print(f"✓ Trace {i+1}/8: {trace_id} ({query[:50]}...)")

    print(f"\n🎉 Seeded 8 traces with full pipeline data!")
    print(f"   Dashboard: http://localhost:3000")

if __name__ == "__main__":
    seed()
