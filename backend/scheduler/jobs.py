import logging
from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal
from models import Company, NewsItem, CyberFinding, Alert
from services import mock_data
from risk_engine import scoring

logger = logging.getLogger("scheduler")


def fetch_news_job():
    db = SessionLocal()
    try:
        for company in db.query(Company).all():
            for n in mock_data.generate_news(company.name, n=2):
                db.add(NewsItem(company_id=company.id, **n))
        db.commit()
        logger.info("fetch_news_job: refreshed news for all companies")
    finally:
        db.close()


def fetch_shodan_job():
    db = SessionLocal()
    try:
        for company in db.query(Company).all():
            finding = db.query(CyberFinding).filter(CyberFinding.company_id == company.id).first()
            new_data = mock_data.generate_cyber(company.name)
            if finding:
                for k, v in new_data.items():
                    setattr(finding, k, v)
            else:
                db.add(CyberFinding(company_id=company.id, **new_data))
        db.commit()
        logger.info("fetch_shodan_job: refreshed cyber exposure data")
    finally:
        db.close()


def calculate_scores_job():
    from models import RiskHistory
    db = SessionLocal()
    try:
        for company in db.query(Company).all():
            breakdown = scoring.score_company(company)
            db.add(RiskHistory(
                company_id=company.id,
                compliance_score=breakdown["compliance"], cyber_score=breakdown["cyber"],
                news_score=breakdown["news"], financial_score=breakdown["financial"],
                esg_score=breakdown["esg"], domain_score=breakdown["domain"],
                social_score=breakdown["social"], overall_score=breakdown["overall"],
                risk_level=breakdown["risk_level"],
            ))
        db.commit()
        logger.info("calculate_scores_job: recorded daily risk history snapshot")
    finally:
        db.close()


def send_alerts_job():
    db = SessionLocal()
    try:
        for company in db.query(Company).all():
            breakdown = scoring.score_company(company)
            if breakdown["risk_level"] in ("High", "Critical"):
                db.add(Alert(
                    company_id=company.id,
                    severity="critical" if breakdown["risk_level"] == "Critical" else "warning",
                    message=f"{company.name} risk level is {breakdown['risk_level']} "
                            f"(score {breakdown['overall']}).",
                ))
        db.commit()
        logger.info("send_alerts_job: generated alerts for elevated-risk companies")
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    sched = BackgroundScheduler()
    sched.add_job(fetch_news_job, "interval", hours=24, id="fetch_news")
    sched.add_job(fetch_shodan_job, "interval", hours=24, id="fetch_shodan")
    sched.add_job(calculate_scores_job, "interval", hours=24, id="calculate_scores")
    sched.add_job(send_alerts_job, "interval", hours=24, id="send_alerts")
    sched.start()
    logger.info("Scheduler started with 4 daily jobs")
    return sched
