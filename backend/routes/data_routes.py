from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Company, NewsItem, CyberFinding, SanctionRecord, DomainInfo
from api import schemas

router = APIRouter(prefix="/api", tags=["data"])


@router.get("/companies/{company_id}/news", response_model=list[schemas.NewsOut])
def company_news(company_id: int, db: Session = Depends(get_db)):
    items = (
        db.query(NewsItem)
        .filter(NewsItem.company_id == company_id)
        .order_by(NewsItem.published_at.desc())
        .all()
    )
    return items


@router.get("/news/feed", response_model=list[schemas.NewsOut])
def global_news_feed(limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(NewsItem)
        .order_by(NewsItem.published_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/companies/{company_id}/cyber", response_model=schemas.CyberOut)
def company_cyber(company_id: int, db: Session = Depends(get_db)):
    finding = db.query(CyberFinding).filter(CyberFinding.company_id == company_id).first()
    if not finding:
        raise HTTPException(404, "No cyber data for this company")
    return finding


@router.get("/companies/{company_id}/compliance")
def company_compliance(company_id: int, db: Session = Depends(get_db)):
    sanction = db.query(SanctionRecord).filter(SanctionRecord.company_id == company_id).first()
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Company not found")
    return {
        "sanctioned": sanction.sanctioned if sanction else False,
        "pep": sanction.pep if sanction else False,
        "list_source": sanction.list_source if sanction else None,
        "country_risk": sanction.country_risk if sanction else "low",
        "details": sanction.details if sanction else None,
        "country": company.country,
    }


@router.get("/companies/{company_id}/domain", response_model=schemas.DomainOut)
def company_domain(company_id: int, db: Session = Depends(get_db)):
    domain = db.query(DomainInfo).filter(DomainInfo.company_id == company_id).first()
    if not domain:
        raise HTTPException(404, "No domain data for this company")
    return domain
