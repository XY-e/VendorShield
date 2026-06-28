
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

DRIVER_LABELS = {
    "compliance": "compliance_risk", "cyber": "cyber_risk", "news": "news_risk",
    "financial": "financial_risk", "esg": "esg_risk", "domain": "domain_risk",
    "social": "social_risk",
}


def _profile_text(company, breakdown: dict) -> str:
    score_band = (
        "score_band_0_25" if breakdown["overall"] < 25 else
        "score_band_25_50" if breakdown["overall"] < 50 else
        "score_band_50_75" if breakdown["overall"] < 75 else
        "score_band_75_100"
    )
    top_drivers = sorted(DRIVER_LABELS, key=lambda k: breakdown[k], reverse=True)[:2]
    driver_tags = " ".join(DRIVER_LABELS[d] for d in top_drivers if breakdown[d] >= 30)

    industry_tag = (company.industry or "").replace(" ", "_")
    country_tag = (company.country or "").replace(" ", "_")

    return (
        f"industry_{industry_tag} industry_{industry_tag} "  # weighted x2 - industry matters most
        f"country_{country_tag} risk_level_{breakdown['risk_level']} {score_band} {driver_tags}"
    )


def find_similar(companies_with_breakdowns: list[tuple], target_id: int, top_n: int = 5) -> list[dict]:
    """companies_with_breakdowns: list of (company_orm, breakdown_dict) for the whole portfolio."""
    ids = [c.id for c, _ in companies_with_breakdowns]
    if target_id not in ids or len(companies_with_breakdowns) < 2:
        return []

    texts = [_profile_text(c, b) for c, b in companies_with_breakdowns]
    vectorizer = TfidfVectorizer()
    matrix = vectorizer.fit_transform(texts)

    target_idx = ids.index(target_id)
    sims = cosine_similarity(matrix[target_idx], matrix).flatten()

    ranked = sorted(
        ((i, sims[i]) for i in range(len(ids)) if i != target_idx),
        key=lambda x: x[1], reverse=True,
    )[:top_n]

    results = []
    for i, score in ranked:
        company, breakdown = companies_with_breakdowns[i]
        results.append({
            "id": company.id,
            "name": company.name,
            "industry": company.industry,
            "country": company.country,
            "overall": breakdown["overall"],
            "risk_level": breakdown["risk_level"],
            "similarity": round(float(score), 3),
        })
    return results


# To go live with real embeddings + FAISS:
#   from sentence_transformers import SentenceTransformer
#   import faiss
#   model = SentenceTransformer("all-MiniLM-L6-v2")
#   vectors = model.encode(texts, normalize_embeddings=True)
#   index = faiss.IndexFlatIP(vectors.shape[1])
#   index.add(vectors)
#   scores, idxs = index.search(vectors[target_idx:target_idx+1], top_n + 1)
# find_similar()'s return shape can stay identical.
