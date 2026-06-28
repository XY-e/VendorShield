
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


def _company_document(company, breakdown: dict) -> str:
    parts = [f"Company: {company.name}.", f"Industry: {company.industry}.", f"Country: {company.country}."]

    parts.append(f"Overall risk level is {breakdown['risk_level']} with score {breakdown['overall']}/100.")
    parts.append(
        f"Compliance score {breakdown['compliance']}, cyber score {breakdown['cyber']}, "
        f"news score {breakdown['news']}, financial score {breakdown['financial']}, "
        f"ESG score {breakdown['esg']}, domain score {breakdown['domain']}, "
        f"social score {breakdown['social']}."
    )

    if company.sanctions:
        s = company.sanctions[0]
        parts.append(s.details or "")
        if s.pep:
            parts.append(f"{company.name} has a linked politically exposed person (PEP).")

    negative_news = [n for n in company.news_items if n.sentiment_label == "negative"]
    for n in negative_news[:5]:
        parts.append(f"News: {n.title} (category: {n.category}).")

    if company.cyber_findings:
        c = company.cyber_findings[0]
        cve_ids = [cve["id"] for cve in (c.cves or [])]
        if cve_ids:
            parts.append(f"{company.name} has known vulnerabilities: {', '.join(cve_ids)}.")
        if not c.ssl_valid:
            parts.append(f"{company.name} has an invalid or missing SSL certificate.")

    if company.financials:
        f = company.financials
        parts.append(f"Debt ratio {f.debt_ratio}, revenue trend is {f.revenue_trend}.")

    if company.esg:
        parts.append(f"ESG overall score (higher=better) is {company.esg.overall}.")

    if company.domain and company.domain.blacklisted:
        parts.append(f"{company.name}'s domain is blacklisted.")

    return " ".join(p for p in parts if p)


def build_corpus(companies_with_breakdowns: list[tuple]) -> dict:
    """companies_with_breakdowns: list of (company_orm, breakdown_dict).
    Returns {"docs": [...], "names": [...], "vectorizer": ..., "matrix": ...}"""
    docs = [_company_document(c, b) for c, b in companies_with_breakdowns]
    names = [c.name for c, _ in companies_with_breakdowns]
    ids = [c.id for c, _ in companies_with_breakdowns]
    vectorizer = TfidfVectorizer(stop_words="english")
    matrix = vectorizer.fit_transform(docs) if docs else None
    return {"docs": docs, "names": names, "ids": ids, "vectorizer": vectorizer, "matrix": matrix}


def retrieve(corpus: dict, question: str, company_id: int | None = None, top_k: int = 3) -> list[dict]:
    if not corpus["docs"]:
        return []
    if company_id is not None and company_id in corpus["ids"]:
        idx = corpus["ids"].index(company_id)
        return [{"company": corpus["names"][idx], "text": corpus["docs"][idx], "score": 1.0}]

    q_vec = corpus["vectorizer"].transform([question])
    sims = cosine_similarity(q_vec, corpus["matrix"]).flatten()
    ranked = sims.argsort()[::-1][:top_k]
    return [
        {"company": corpus["names"][i], "text": corpus["docs"][i], "score": round(float(sims[i]), 3)}
        for i in ranked if sims[i] > 0
    ]


def _template_answer(question: str, retrieved: list[dict]) -> str:
    if not retrieved:
        return "I couldn't find any companies in the knowledge base relevant to that question."
    lead = retrieved[0]
    return (
        f"Based on the knowledge base, here's what's relevant to \"{question}\":\n\n"
        + "\n\n".join(f"• {r['company']}: {r['text']}" for r in retrieved)
    )


def answer_question(corpus: dict, question: str, company_id: int | None = None) -> dict:
    retrieved = retrieve(corpus, question, company_id=company_id)

    if not ANTHROPIC_API_KEY:
        return {"answer": _template_answer(question, retrieved), "sources": [r["company"] for r in retrieved]}

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        context = "\n\n".join(f"[{r['company']}] {r['text']}" for r in retrieved)
        prompt = (
            f"You are a vendor risk analyst assistant. Use ONLY the context below to answer.\n\n"
            f"Context:\n{context}\n\nQuestion: {question}\n\n"
            "Answer in 2-4 concise sentences, citing company names where relevant. "
            "If the context doesn't contain the answer, say so."
        )
        msg = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in msg.content if b.type == "text").strip()
        return {"answer": text, "sources": [r["company"] for r in retrieved]}
    except Exception:
        return {"answer": _template_answer(question, retrieved), "sources": [r["company"] for r in retrieved]}


# To go live with the spec's exact stack (ChromaDB + LangChain + sentence-transformers):
#   from langchain_community.vectorstores import Chroma
#   from langchain_community.embeddings import HuggingFaceEmbeddings
#   embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
#   vectordb = Chroma.from_texts(docs, embeddings, metadatas=[{"company": n} for n in names])
#   results = vectordb.similarity_search(question, k=3)
# Keep answer_question()'s LLM-calling logic unchanged; only retrieve() needs swapping.
