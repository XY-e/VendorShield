from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from database import get_db
from models import Company, RiskWeightConfig
from api import schemas
from risk_engine import scoring
from services import mock_data

router = APIRouter(prefix="/api/companies", tags=["companies"])


def _weights(db: Session) -> dict:
    cfg = db.query(RiskWeightConfig).first()
    if not cfg:
        return scoring.WEIGHTS_DEFAULT
    return {
        "compliance": cfg.compliance, "cyber": cfg.cyber, "news": cfg.news,
        "financial": cfg.financial, "esg": cfg.esg, "domain": cfg.domain,
        "social": cfg.social,
    }


def _load(db: Session, company_id: int) -> Company:
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


@router.get("", response_model=list[schemas.CompanyOut])
def list_companies(q: str | None = Query(None), db: Session = Depends(get_db)):
    query = db.query(Company)
    if q:
        query = query.filter(or_(Company.name.ilike(f"%{q}%"), Company.industry.ilike(f"%{q}%")))
    return query.order_by(Company.name).all()


@router.post("", response_model=schemas.CompanyOut)
def create_company(payload: schemas.CompanyCreate, db: Session = Depends(get_db)):
    """Add a new company and auto-populate mock risk data for it (stand-in for live
    API enrichment via OpenCorporates/OpenSanctions/Shodan/etc.)."""
    from models import SanctionRecord, NewsItem, CyberFinding, DomainInfo, FinancialMetric, ESGScore

    company = Company(**payload.model_dump())
    db.add(company)
    db.flush()

    db.add(SanctionRecord(company_id=company.id, **mock_data.generate_sanctions(company.name)))
    for n in mock_data.generate_news(company.name):
        db.add(NewsItem(company_id=company.id, **n))
    db.add(CyberFinding(company_id=company.id, **mock_data.generate_cyber(company.name)))
    db.add(DomainInfo(company_id=company.id, **mock_data.generate_domain(company.name, company.website)))
    db.add(FinancialMetric(company_id=company.id, **mock_data.generate_financials()))
    db.add(ESGScore(company_id=company.id, **mock_data.generate_esg()))
    db.commit()
    db.refresh(company)
    return company


@router.get("/{company_id}", response_model=schemas.CompanyOut)
def get_company(company_id: int, db: Session = Depends(get_db)):
    return _load(db, company_id)


@router.get("/{company_id}/risk", response_model=schemas.RiskScoreBreakdown)
def get_risk(company_id: int, db: Session = Depends(get_db)):
    company = _load(db, company_id)
    return scoring.score_company(company, _weights(db))


@router.get("/{company_id}/profile", response_model=schemas.CompanyFullProfile)
def get_profile(company_id: int, db: Session = Depends(get_db)):
    company = _load(db, company_id)
    breakdown = scoring.score_company(company, _weights(db))
    return schemas.CompanyFullProfile(
        company=company,
        risk=breakdown,
        news=sorted(company.news_items, key=lambda n: n.published_at, reverse=True),
        sanctions=company.sanctions[0] if company.sanctions else None,
        cyber=company.cyber_findings[0] if company.cyber_findings else None,
        domain=company.domain,
        financials=company.financials,
        esg=company.esg,
    )
