# NOTE: This module runs in a ProcessPoolExecutor — no async, no event loop access
import os
import re

GROUNDING_THRESHOLD = float(os.environ.get("RAG_DEBUGGER_GROUNDING_THRESHOLD", "0.65"))

# Module-level model — loaded once per worker process
_model = None


def _get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _split_sentences(text: str) -> list[str]:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in sentences if len(s.strip()) > 10]


def compute_grounding(answer: str, chunks: list[dict]) -> list[dict]:
    """
    Pure function — no async, runs in ProcessPoolExecutor.
    Returns list of GroundingResult dicts.
    """
    if not answer or not chunks:
        return []

    model = _get_model()
    sentences = _split_sentences(answer)
    chunk_texts = [c.get("text", "") for c in chunks]
    chunk_ids = [c.get("chunk_id", str(i)) for i, c in enumerate(chunks)]

    if not sentences or not chunk_texts:
        return []

    sent_embeddings = model.encode(sentences, convert_to_tensor=True)
    chunk_embeddings = model.encode(chunk_texts, convert_to_tensor=True)

    from sentence_transformers import util
    similarity_matrix = util.cos_sim(sent_embeddings, chunk_embeddings)

    results: list[dict] = []
    for i, sentence in enumerate(sentences):
        scores = similarity_matrix[i]
        best_score = float(scores.max())
        best_idx = int(scores.argmax())
        results.append({
            "sentence": sentence,
            "grounded": best_score > GROUNDING_THRESHOLD,
            "score": round(best_score, 4),
            "source_chunk_id": chunk_ids[best_idx] if best_score > GROUNDING_THRESHOLD else None,
        })

    return results
