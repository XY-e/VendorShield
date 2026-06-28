import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Company, RiskHistory, Alert, RiskWeightConfig
from api import schemas
from risk_engine import scoring
from services.llm_explain import explain_risk
from services.pdf_report import build_report

router = APIRouter(prefix="/api", tags=["insights"])


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


def _weights(db: Session) -> dict:
    cfg = db.query(RiskWeightConfig).first()
    if not cfg:
        return scoring.WEIGHTS_DEFAULT
    return {
        "compliance": cfg.compliance, "cyber": cfg.cyber, "news": cfg.news,
        "financial": cfg.financial, "esg": cfg.esg, "domain": cfg.domain,
        "social": cfg.social,
    }


@router.get("/companies/{company_id}/ai-insight", response_model=schemas.AIInsightOut)
def ai_insight(company_id: int, db: Session = Depends(get_db)):
    company = _load_company(db, company_id)
    breakdown = scoring.score_company(company, _weights(db))
    return explain_risk(company.name, breakdown)


@router.get("/companies/{company_id}/history", response_model=list[schemas.RiskHistoryOut])
def risk_history(company_id: int, db: Session = Depends(get_db)):
    return (
        db.query(RiskHistory)
        .filter(RiskHistory.company_id == company_id)
        .order_by(RiskHistory.recorded_at.asc())
        .all()
    )


@router.get("/alerts", response_model=list[schemas.AlertOut])
def list_alerts(unread_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(Alert)
    if unread_only:
        query = query.filter(Alert.read.is_(False))
    return query.order_by(Alert.created_at.desc()).all()


@router.post("/alerts/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(404, "Alert not found")
    alert.read = True
    db.commit()
    return {"ok": True}


@router.get("/companies/{company_id}/report.pdf")
def company_report(company_id: int, db: Session = Depends(get_db)):
    company = _load_company(db, company_id)
    breakdown = scoring.score_company(company, _weights(db))
    insight = explain_risk(company.name, breakdown)
    news = [
        {
            "title": n.title,
            "published_at": n.published_at,
            "sentiment_label": n.sentiment_label,
        }
        for n in sorted(company.news_items, key=lambda x: x.published_at, reverse=True)
    ]
    pdf_bytes = build_report(
        {"name": company.name}, breakdown, insight, news
    )
    filename = f"{company.name.replace(' ', '_')}_risk_report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/admin/weights", response_model=schemas.WeightConfigOut)
def get_weights(db: Session = Depends(get_db)):
    cfg = db.query(RiskWeightConfig).first()
    if not cfg:
        cfg = RiskWeightConfig()
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


@router.put("/admin/weights", response_model=schemas.WeightConfigOut)
def update_weights(payload: schemas.WeightConfigUpdate, db: Session = Depends(get_db)):
    total = sum(payload.model_dump().values())
    if abs(total - 1.0) > 0.01:
        raise HTTPException(400, f"Weights must sum to 1.0 (got {total:.2f})")
    cfg = db.query(RiskWeightConfig).first()
    if not cfg:
        cfg = RiskWeightConfig()
        db.add(cfg)
    for k, v in payload.model_dump().items():
        setattr(cfg, k, v)
    db.commit()
    db.refresh(cfg)
    return cfg


@router.get("/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    companies = db.query(Company).options(
        joinedload(Company.news_items), joinedload(Company.sanctions),
        joinedload(Company.cyber_findings), joinedload(Company.domain),
        joinedload(Company.financials), joinedload(Company.esg),
    ).all()
    weights = _weights(db)
    results = []
    for c in companies:
        breakdown = scoring.score_company(c, weights)
        results.append({"id": c.id, "name": c.name, "industry": c.industry, **breakdown})
    if not results:
        return {"average_score": 0, "level_counts": {}, "companies": []}
    avg = round(sum(r["overall"] for r in results) / len(results), 1)
    level_counts: dict[str, int] = {}
    for r in results:
        level_counts[r["risk_level"]] = level_counts.get(r["risk_level"], 0) + 1
    return {
        "average_score": avg,
        "level_counts": level_counts,
        "companies": sorted(results, key=lambda r: r["overall"], reverse=True),
    }
