
import random
from database import Base, engine, SessionLocal
from models import (
    Company, NewsItem, SanctionRecord, CyberFinding, DomainInfo,
    FinancialMetric, ESGScore, RiskHistory, Alert, RiskWeightConfig
)
from services import mock_data
from risk_engine import scoring

SAMPLE_COMPANIES = [
    "Tesla", "Nvidia", "Sime Darby Plantation", "Petronas Chemicals", "Maybank",
    "Grab Holdings", "Acme Manufacturing Co", "Globex Logistics", "Initech Software",
    "Umbrella Pharma", "Stark Industrial", "Wayne Enterprises Holdings",
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Company).count() > 0:
            print("Database already seeded, skipping.")
            return

        if db.query(RiskWeightConfig).count() == 0:
            db.add(RiskWeightConfig())
            db.commit()

        for name in SAMPLE_COMPANIES:
            info = mock_data.generate_company_info(name)
            company = Company(**info)
            db.add(company)
            db.flush()  # get company.id

            sanc = mock_data.generate_sanctions(name)
            db.add(SanctionRecord(company_id=company.id, **sanc))

            for n in mock_data.generate_news(name):
                db.add(NewsItem(company_id=company.id, **n))

            cyber = mock_data.generate_cyber(name)
            db.add(CyberFinding(company_id=company.id, **cyber))

            domain = mock_data.generate_domain(name, info["website"])
            db.add(DomainInfo(company_id=company.id, **domain))

            fin = mock_data.generate_financials()
            db.add(FinancialMetric(company_id=company.id, **fin))

            esg = mock_data.generate_esg()
            db.add(ESGScore(company_id=company.id, **esg))

            db.commit()
            db.refresh(company)

            # compute risk + seed a short history trend (last 14 days)
            breakdown = scoring.score_company(company)
            for days_ago in range(14, -1, -1):
                jitter = lambda v: max(0, min(100, v + random.uniform(-6, 6)))
                hist = RiskHistory(
                    company_id=company.id,
                    compliance_score=jitter(breakdown["compliance"]),
                    cyber_score=jitter(breakdown["cyber"]),
                    news_score=jitter(breakdown["news"]),
                    financial_score=jitter(breakdown["financial"]),
                    esg_score=jitter(breakdown["esg"]),
                    domain_score=jitter(breakdown["domain"]),
                    social_score=jitter(breakdown["social"]),
                    overall_score=jitter(breakdown["overall"]),
                    risk_level=scoring.risk_level_from_score(breakdown["overall"]),
                )
                db.add(hist)
            db.commit()

            # generate an alert if risk is high/critical
            if breakdown["risk_level"] in ("High", "Critical"):
                db.add(Alert(
                    company_id=company.id,
                    severity="critical" if breakdown["risk_level"] == "Critical" else "warning",
                    message=f"{name} risk level elevated to {breakdown['risk_level']} "
                            f"(score {breakdown['overall']}).",
                ))
                db.commit()

        print(f"Seeded {len(SAMPLE_COMPANIES)} companies with full risk data.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
