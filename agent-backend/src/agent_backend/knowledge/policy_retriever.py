"""
Policy RAG Retriever for Workio Platform Knowledge Base.
Provides semantic vector search with OpenAI text-embedding-3-small and hybrid keyword ranking.
"""

import json
import logging
import math
from pathlib import Path
from typing import List, Dict, Any, Optional

from agent_backend.config import settings

logger = logging.getLogger("agent_backend.knowledge.retriever")

POLICIES_FILE = Path(__file__).resolve().parent / "policies.json"


def _cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = math.sqrt(sum(a * a for a in vec1))
    magnitude2 = math.sqrt(sum(b * b for b in vec2))
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    return dot_product / (magnitude1 * magnitude2)


class PolicyRetriever:
    """In-memory RAG Vector Store and Semantic Search for Workio Platform Policies."""

    def __init__(self, data_file: Path = POLICIES_FILE):
        self.data_file = data_file
        self.policies: List[Dict[str, Any]] = []
        self.embeddings: Dict[str, List[float]] = {}
        self._is_indexed = False
        self._load_documents()

    def _load_documents(self):
        """Load JSON policy documents."""
        if not self.data_file.exists():
            logger.warning(f"Policy file not found: {self.data_file}")
            self.policies = []
            return

        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                self.policies = json.load(f)
            logger.info(f"Loaded {len(self.policies)} policy documents into RAG knowledge store.")
        except Exception as e:
            logger.error(f"Failed to load policies from {self.data_file}: {e}")
            self.policies = []

    async def _ensure_vector_index(self):
        """Index documents with OpenAI embeddings if not already cached."""
        if self._is_indexed:
            return

        if not settings.openai_api_key or settings.openai_api_key == "your_openai_api_key_here":
            logger.info("OpenAI API key not configured. Using keyword RAG matching.")
            self._is_indexed = True
            return

        try:
            from langchain_openai import OpenAIEmbeddings

            embedder = OpenAIEmbeddings(
                model="text-embedding-3-small",
                api_key=settings.openai_api_key
            )

            texts_to_embed = [
                f"{p.get('title', '')}: {p.get('summary', '')} {p.get('content', '')} {' '.join(p.get('tags', []))}"
                for p in self.policies
            ]

            logger.info(f"Computing embeddings for {len(texts_to_embed)} policy documents...")
            vectors = await embedder.aembed_documents(texts_to_embed)

            for policy, vec in zip(self.policies, vectors):
                self.embeddings[policy["id"]] = vec

            self._is_indexed = True
            logger.info("Policy RAG vector index created successfully.")
        except Exception as e:
            logger.warning(f"Could not compute embeddings via OpenAI: {e}. Falling back to keyword search.")
            self._is_indexed = True

    def _keyword_score(self, query: str, policy: Dict[str, Any]) -> float:
        """Compute keyword relevance score."""
        q_tokens = set(query.lower().split())
        score = 0.0

        title_tokens = set(policy.get("title", "").lower().split())
        tags = [t.lower() for t in policy.get("tags", [])]
        content_lower = policy.get("content", "").lower()
        summary_lower = policy.get("summary", "").lower()

        for token in q_tokens:
            if len(token) <= 2:
                continue
            if token in title_tokens:
                score += 3.0
            if any(token in tag for tag in tags):
                score += 2.5
            if token in summary_lower:
                score += 1.5
            if token in content_lower:
                score += 1.0

        return score

    async def search(
        self,
        query: str,
        top_k: int = 2,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search policies using hybrid semantic + keyword ranking.
        """
        if not self.policies:
            self._load_documents()

        if not self.policies:
            return []

        await self._ensure_vector_index()

        candidates = self.policies
        if category:
            cat_clean = category.strip().lower()
            filtered = [p for p in candidates if cat_clean in p.get("category", "").lower()]
            if filtered:
                candidates = filtered

        # If embeddings are available, compute cosine similarity
        query_vec: Optional[List[float]] = None
        if self.embeddings and settings.openai_api_key and settings.openai_api_key != "your_openai_api_key_here":
            try:
                from langchain_openai import OpenAIEmbeddings
                embedder = OpenAIEmbeddings(
                    model="text-embedding-3-small",
                    api_key=settings.openai_api_key
                )
                query_vec = await embedder.aembed_query(query)
            except Exception as e:
                logger.warning(f"Query embedding failed: {e}")
                query_vec = None

        scored_results = []
        for policy in candidates:
            pid = policy["id"]
            kw_score = self._keyword_score(query, policy)

            sem_score = 0.0
            if query_vec and pid in self.embeddings:
                sem_score = _cosine_similarity(query_vec, self.embeddings[pid])

            # Hybrid score: 70% semantic + 30% normalized keyword
            norm_kw = min(kw_score / 10.0, 1.0)
            final_score = (sem_score * 0.7) + (norm_kw * 0.3) if query_vec else norm_kw

            scored_results.append({
                "policy": policy,
                "score": round(final_score, 4),
                "semantic_score": round(sem_score, 4) if query_vec else None,
                "keyword_score": round(kw_score, 2)
            })

        scored_results.sort(key=lambda x: x["score"], reverse=True)
        top_matches = scored_results[:top_k]

        return [
            {
                "id": item["policy"]["id"],
                "category": item["policy"]["category"],
                "title": item["policy"]["title"],
                "summary": item["policy"]["summary"],
                "content": item["policy"]["content"],
                "score": item["score"]
            }
            for item in top_matches
        ]


# Singleton instance
policy_retriever = PolicyRetriever()
