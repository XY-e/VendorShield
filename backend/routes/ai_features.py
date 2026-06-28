from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from database import get_db
from models import Company, RiskWeightConfig
from risk_engine import scoring
from risk_engine.scenario import simulate
from rag.knowledge_base import build_corpus, answer_question
from rag.similarity import find_similar
from services.geo import centroid_for

router = APIRouter(prefix="/api", tags=["ai-features"])


def _weights(db: Session) -> dict:
    cfg = db.query(RiskWeightConfig).first()
    if not cfg:
        return scoring.WEIGHTS_DEFAULT
    return {
        "compliance": cfg.compliance, "cyber": cfg.cyber, "news": cfg.news,
        "financial": cfg.financial, "esg": cfg.esg, "domain": cfg.domain,
        "social": cfg.social,
    }


def _all_companies_with_breakdowns(db: Session, weights: dict) -> list[tuple]:
    companies = db.query(Company).options(
        joinedload(Company.news_items), joinedload(Company.sanctions),
        joinedload(Company.cyber_findings), joinedload(Company.domain),
        joinedload(Company.financials), joinedload(Company.esg),
    ).all()
    return [(c, scoring.score_company(c, weights)) for c in companies]


def _load_company(db: Session, company_id: int) -> Company:
    company = (
        db.query(Company)
        .options(
            joinedload(Company.news_items), joinedload(Company.sanctions),
            joinedload(Company.cyber_findings), joinedload(Company.domain),
            joinedload(Company.financials), joinedload(Company.esg),
        )
        .filter(Company.id == company_id)
        .first()
    )
    if not company:
        raise HTTPException(404, "Company not found")
    return company


# ---------- RAG Chatbot ----------

class ChatRequest(BaseModel):
    question: str
    company_id: int | None = None


@router.post("/chat")
def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """AI Chat Assistant: 'Explain why Tesla is high risk.' Retrieval-augmented over
    a knowledge base built from each company's news, sanctions, cyber, ESG, and
    financial data."""
    weights = _weights(db)
    pairs = _all_companies_with_breakdowns(db, weights)
    corpus = build_corpus(pairs)
    result = answer_question(corpus, payload.question, company_id=payload.company_id)
    return result


# ---------- Similar Company Retrieval ----------

@router.get("/companies/{company_id}/similar")
def similar_companies(company_id: int, top_n: int = 5, db: Session = Depends(get_db)):
    weights = _weights(db)
    pairs = _all_companies_with_breakdowns(db, weights)
    if company_id not in [c.id for c, _ in pairs]:
        raise HTTPException(404, "Company not found")
    return find_similar(pairs, company_id, top_n=top_n)


# ---------- Scenario Simulation ----------

class ScenarioRequest(BaseModel):
    category: str  # compliance / cyber / news / financial / esg / domain / social
    delta_pct: float  # e.g. 30 for +30%, -20 for -20%


@router.post("/companies/{company_id}/scenario")
def scenario_simulation(company_id: int, payload: ScenarioRequest, db: Session = Depends(get_db)):
    company = _load_company(db, company_id)
    weights = _weights(db)
    try:
        result = simulate(company, weights, payload.category, payload.delta_pct)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return result


# ---------- Geographic Risk Map ----------

@router.get("/geo/risk-map")
def geo_risk_map(db: Session = Depends(get_db)):
    """Aggregates average risk score per country for the Leaflet.js heatmap."""
    weights = _weights(db)
    pairs = _all_companies_with_breakdowns(db, weights)

    by_country: dict[str, dict] = {}
    for company, breakdown in pairs:
        country = company.country or "Unknown"
        bucket = by_country.setdefault(country, {"scores": [], "companies": []})
        bucket["scores"].append(breakdown["overall"])
        bucket["companies"].append({
            "id": company.id, "name": company.name,
            "overall": breakdown["overall"], "risk_level": breakdown["risk_level"],
        })

    results = []
    for country, bucket in by_country.items():
        centroid = centroid_for(country)
        if not centroid:
            continue
        avg = round(sum(bucket["scores"]) / len(bucket["scores"]), 1)
        results.append({
            "country": country,
            "lat": centroid["lat"],
            "lng": centroid["lng"],
            "average_score": avg,
            "risk_level": scoring.risk_level_from_score(avg),
            "company_count": len(bucket["companies"]),
            "companies": bucket["companies"],
        })
    return results
