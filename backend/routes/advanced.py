import os
import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Company, RiskWeightConfig
from risk_engine import scoring
from risk_engine.fraud_ml import predict_fraud
from services.aml import run_aml_check
from services.relationship import build_network
from services.kyc_checklist import generate_kyc_checklist

router = APIRouter(prefix="/api", tags=["advanced"])


def _weights(db: Session) -> dict:
    cfg = db.query(RiskWeightConfig).first()
    return {
        "compliance": cfg.compliance, "cyber": cfg.cyber, "news": cfg.news,
        "financial": cfg.financial, "esg": cfg.esg, "domain": cfg.domain,
        "social": cfg.social,
    } if cfg else scoring.WEIGHTS_DEFAULT


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


def _load_all(db: Session):
    from sqlalchemy.orm import joinedload as jl
    return db.query(Company).options(
        jl(Company.news_items), jl(Company.sanctions),
        jl(Company.cyber_findings), jl(Company.domain),
        jl(Company.financials), jl(Company.esg),
    ).all()


# ---------- AML ----------

@router.get("/companies/{company_id}/aml")
def aml_check(company_id: int, db: Session = Depends(get_db)):
    company = _load(db, company_id)
    sanction = company.sanctions[0] if company.sanctions else None
    cyber = company.cyber_findings[0] if company.cyber_findings else None
    return run_aml_check(company, sanction, company.domain, company.financials, cyber)


@router.get("/aml/portfolio")
def aml_portfolio(db: Session = Depends(get_db)):
    """Run AML checks across all companies, return sorted by risk."""
    weights = _weights(db)
    companies = _load_all(db)
    results = []
    for c in companies:
        sanction = c.sanctions[0] if c.sanctions else None
        cyber = c.cyber_findings[0] if c.cyber_findings else None
        aml = run_aml_check(c, sanction, c.domain, c.financials, cyber)
        breakdown = scoring.score_company(c, weights)
        results.append({
            "id": c.id, "name": c.name, "industry": c.industry,
            "aml_risk": aml["aml_risk"], "total_flags": aml["total_flags"],
            "critical_count": aml["critical_count"], "high_count": aml["high_count"],
            "overall_score": breakdown["overall"], "risk_level": breakdown["risk_level"],
        })
    order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    results.sort(key=lambda r: (order.get(r["aml_risk"], 4), -r["total_flags"]))
    return results


# ---------- Fraud ML ----------

@router.get("/companies/{company_id}/fraud-score")
def fraud_score(company_id: int, db: Session = Depends(get_db)):
    company = _load(db, company_id)
    breakdown = scoring.score_company(company, _weights(db))
    return predict_fraud(company, breakdown, company.domain, company.financials)


@router.get("/fraud/portfolio")
def fraud_portfolio(db: Session = Depends(get_db)):
    weights = _weights(db)
    companies = _load_all(db)
    results = []
    for c in companies:
        breakdown = scoring.score_company(c, weights)
        fraud = predict_fraud(c, breakdown, c.domain, c.financials)
        results.append({
            "id": c.id, "name": c.name, "industry": c.industry,
            "fraud_probability": fraud["fraud_probability"],
            "fraud_tier": fraud["fraud_tier"],
            "overall_score": breakdown["overall"],
            "risk_level": breakdown["risk_level"],
        })
    results.sort(key=lambda r: r["fraud_probability"], reverse=True)
    return results


# ---------- Network Graph ----------

@router.get("/network")
def relationship_network(db: Session = Depends(get_db)):
    weights = _weights(db)
    companies = _load_all(db)
    pairs = [(c, scoring.score_company(c, weights)) for c in companies]
    return build_network(pairs)


# ---------- Company Comparison ----------

@router.get("/compare")
def compare_companies(id_a: int, id_b: int, db: Session = Depends(get_db)):
    weights = _weights(db)
    a = _load(db, id_a)
    b = _load(db, id_b)
    breakdown_a = scoring.score_company(a, weights)
    breakdown_b = scoring.score_company(b, weights)

    sanction_a = a.sanctions[0] if a.sanctions else None
    sanction_b = b.sanctions[0] if b.sanctions else None
    cyber_a = a.cyber_findings[0] if a.cyber_findings else None
    cyber_b = b.cyber_findings[0] if b.cyber_findings else None
    aml_a = run_aml_check(a, sanction_a, a.domain, a.financials, cyber_a)
    aml_b = run_aml_check(b, sanction_b, b.domain, b.financials, cyber_b)
    fraud_a = predict_fraud(a, breakdown_a, a.domain, a.financials)
    fraud_b = predict_fraud(b, breakdown_b, b.domain, b.financials)

    return {
        "company_a": {
            "id": a.id, "name": a.name, "industry": a.industry, "country": a.country,
            "employees": a.employees, "revenue": a.revenue,
            "risk": breakdown_a, "aml_risk": aml_a["aml_risk"],
            "aml_flags": aml_a["total_flags"], "fraud_probability": fraud_a["fraud_probability"],
        },
        "company_b": {
            "id": b.id, "name": b.name, "industry": b.industry, "country": b.country,
            "employees": b.employees, "revenue": b.revenue,
            "risk": breakdown_b, "aml_risk": aml_b["aml_risk"],
            "aml_flags": aml_b["total_flags"], "fraud_probability": fraud_b["fraud_probability"],
        },
    }


# ---------- KYC Checklist ----------

@router.get("/companies/{company_id}/kyc-checklist")
def kyc_checklist(company_id: int, db: Session = Depends(get_db)):
    company = _load(db, company_id)
    sanction = company.sanctions[0] if company.sanctions else None
    cyber = company.cyber_findings[0] if company.cyber_findings else None
    aml_result = run_aml_check(company, sanction, company.domain, company.financials, cyber)
    return generate_kyc_checklist(company, aml_result)


# ---------- Autonomous AI Agent ----------

def _run_agent_steps(company: Company, breakdown: dict, aml: dict, fraud: dict) -> list[dict]:
    """Runs 10 autonomous investigation steps, each producing a structured finding."""
    sanction = company.sanctions[0] if company.sanctions else None
    cyber = company.cyber_findings[0] if company.cyber_findings else None
    neg_news = [n for n in company.news_items if n.sentiment_label == "negative"]
    steps = []

    # 1 — Profile
    steps.append({
        "step": 1, "title": "Loading Company Profile",
        "icon": "search",
        "status": "clear",
        "finding": f"{company.name} is a {company.industry} company based in {company.country} "
                   f"with {company.employees or 'unknown'} employees and "
                   f"RM{(company.revenue or 0)/1e6:.1f}M reported revenue.",
        "detail": None,
    })

    # 2 — Sanctions
    sanctioned = sanction and sanction.sanctioned
    pep = sanction and sanction.pep
    status2 = "critical" if sanctioned else ("flagged" if pep else "clear")
    steps.append({
        "step": 2, "title": "Sanctions & Watchlist Screening",
        "icon": "shield",
        "status": status2,
        "finding": (
            f"⚠️ SANCTIONED — matched on {sanction.list_source}. Immediate escalation required."
            if sanctioned else
            f"⚠️ PEP linkage detected. Enhanced due diligence mandatory."
            if pep else
            "No matches on OFAC, EU, UN or PEP databases."
        ),
        "detail": sanction.details if sanction else None,
    })

    # 3 — News
    status3 = "critical" if len(neg_news) >= 4 else ("flagged" if neg_news else "clear")
    categories = list({n.category for n in neg_news if n.category != "general"})
    steps.append({
        "step": 3, "title": "News Sentiment Analysis",
        "icon": "newspaper",
        "status": status3,
        "finding": (
            f"Found {len(neg_news)} negative article(s) covering: {', '.join(categories) or 'general concerns'}."
            if neg_news else
            f"Scanned {len(company.news_items)} articles — no negative sentiment detected."
        ),
        "detail": neg_news[0].title if neg_news else None,
    })

    # 4 — Cyber
    n_cves = len(cyber.cves or []) if cyber else 0
    critical_cves = [c for c in (cyber.cves or []) if c.get("severity") == "critical"] if cyber else []
    status4 = "critical" if critical_cves else ("flagged" if n_cves > 0 or (cyber and not cyber.ssl_valid) else "clear")
    steps.append({
        "step": 4, "title": "Cybersecurity Assessment",
        "icon": "shield-alert",
        "status": status4,
        "finding": (
            f"Exposure score {cyber.exposure_score:.0f}/100. "
            f"{len(cyber.open_ports or [])} open ports, {n_cves} CVE(s) detected. "
            f"SSL: {'Valid' if cyber.ssl_valid else 'INVALID'}."
            if cyber else "No cyber scan data available."
        ),
        "detail": f"Critical CVEs: {[c['id'] for c in critical_cves]}" if critical_cves else None,
    })

    # 5 — Financial
    fin = company.financials
    status5 = "flagged" if fin and (fin.debt_ratio > 0.7 or fin.revenue_trend == "down") else "clear"
    steps.append({
        "step": 5, "title": "Financial Health Review",
        "icon": "trending-up",
        "status": status5,
        "finding": (
            f"Debt ratio {fin.debt_ratio:.0%}, revenue trend: {fin.revenue_trend}. "
            + ("⚠️ High leverage detected." if fin.debt_ratio > 0.7 else "")
            + (" ⚠️ Declining revenue." if fin.revenue_trend == "down" else "")
            if fin else "No financial data on record."
        ),
        "detail": None,
    })

    # 6 — AML
    n_flags = aml.get("total_flags", 0)
    status6 = "critical" if aml.get("aml_risk") in ("Critical",) else \
              "flagged" if aml.get("aml_risk") in ("High", "Medium") else "clear"
    steps.append({
        "step": 6, "title": "AML Red Flag Screening",
        "icon": "alert-triangle",
        "status": status6,
        "finding": (
            f"AML risk level: {aml.get('aml_risk')}. {n_flags} flag(s) triggered "
            f"({aml.get('critical_count',0)} critical, {aml.get('high_count',0)} high)."
            if n_flags else
            f"AML risk level: {aml.get('aml_risk')}. No FATF/BNM red flags triggered."
        ),
        "detail": aml["flags"][0]["title"] if aml.get("flags") else None,
    })

    # 7 — Fraud ML
    prob = fraud.get("fraud_probability", 0)
    tier = fraud.get("fraud_tier", "Low")
    status7 = "critical" if tier == "Very High" else ("flagged" if tier in ("High", "Medium") else "clear")
    steps.append({
        "step": 7, "title": "ML Fraud Probability Scoring",
        "icon": "brain",
        "status": status7,
        "finding": f"RandomForest model assigns {prob}% fraud probability (tier: {tier}). "
                   f"{fraud.get('interpretation','')[:120]}",
        "detail": None,
    })

    # 8 — Domain
    dom = company.domain
    status8 = "flagged" if dom and (dom.blacklisted or (dom.age_days or 9999) < 365) else "clear"
    steps.append({
        "step": 8, "title": "Domain Reputation Check",
        "icon": "globe",
        "status": status8,
        "finding": (
            f"Domain: {dom.domain}. Age: {dom.age_days} days. "
            + ("⚠️ BLACKLISTED." if dom.blacklisted else "")
            + (" ⚠️ Young domain — elevated risk." if (dom.age_days or 9999) < 365 else "")
            + (f" Registrar: {dom.registrar}." if dom.registrar else "")
            if dom else "No domain data available."
        ),
        "detail": None,
    })

    # 9 — Regulatory
    country_risk = (sanction.country_risk if sanction else "low")
    status9 = "flagged" if country_risk == "high" else ("flagged" if pep or sanctioned else "clear")
    steps.append({
        "step": 9, "title": "Regulatory Alignment (BNM / FATF)",
        "icon": "scroll",
        "status": status9,
        "finding": (
            f"Country risk: {country_risk}. "
            + ("Enhanced CDD required under BNM AML/CFT Policy Doc. " if country_risk == "high" or pep else "")
            + ("Simplified CDD applicable — standard monitoring recommended." if country_risk == "low" and not pep and not sanctioned else "")
        ),
        "detail": None,
    })

    # 10 — Final verdict
    level = breakdown["risk_level"]
    overall = breakdown["overall"]
    status10 = "critical" if level in ("Critical",) else ("flagged" if level == "High" else "clear")
    action = {
        "Critical": "REJECT or ESCALATE to MLRO immediately. Do not onboard.",
        "High": "Enhanced Due Diligence required. Escalate to senior compliance officer.",
        "Medium": "Standard Due Diligence with enhanced monitoring. Quarterly review.",
        "Low": "Simplified Due Diligence. Annual review sufficient.",
    }.get(level, "Standard review.")
    steps.append({
        "step": 10, "title": "Final Verdict & Recommendations",
        "icon": "clipboard-check",
        "status": status10,
        "finding": f"Overall risk score: {overall}/100 ({level}). {action}",
        "detail": aml.get("recommendation", ""),
    })
    return steps


@router.get("/companies/{company_id}/agent-investigate")
def agent_investigate(company_id: int, db: Session = Depends(get_db)):
    """Autonomous AI agent that independently investigates a company end-to-end,
    returning structured step-by-step findings the frontend can animate through."""
    company = _load(db, company_id)
    weights = _weights(db)
    breakdown = scoring.score_company(company, weights)
    sanction = company.sanctions[0] if company.sanctions else None
    cyber = company.cyber_findings[0] if company.cyber_findings else None
    aml = run_aml_check(company, sanction, company.domain, company.financials, cyber)
    fraud = predict_fraud(company, breakdown, company.domain, company.financials)
    steps = _run_agent_steps(company, breakdown, aml, fraud)

    # Optionally use Claude to write a more nuanced executive summary
    summary = _agent_summary_llm(company.name, breakdown, aml, fraud, steps)

    return {
        "company_name": company.name,
        "company_id": company_id,
        "investigated_at": dt.datetime.utcnow().isoformat(),
        "overall_risk": breakdown["risk_level"],
        "overall_score": breakdown["overall"],
        "aml_risk": aml["aml_risk"],
        "fraud_probability": fraud["fraud_probability"],
        "steps": steps,
        "executive_summary": summary,
        "total_steps": len(steps),
        "flagged_steps": sum(1 for s in steps if s["status"] in ("flagged", "critical")),
    }


def _agent_summary_llm(name: str, breakdown: dict, aml: dict, fraud: dict, steps: list) -> str:
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    if ANTHROPIC_API_KEY:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
            flagged = [s for s in steps if s["status"] in ("flagged", "critical")]
            flags_text = "\n".join(f"- {s['title']}: {s['finding']}" for s in flagged[:5])
            prompt = (
                f"You are an autonomous AI compliance agent. You have just completed a full "
                f"risk investigation of {name}. Write a 3-sentence executive summary for a "
                f"compliance officer. Overall risk: {breakdown['risk_level']} ({breakdown['overall']}/100). "
                f"AML risk: {aml['aml_risk']}. Fraud probability: {fraud['fraud_probability']}%.\n"
                f"Key findings:\n{flags_text or 'No major flags.'}\n\n"
                f"Be direct, factual, and state the recommended action clearly."
            )
            msg = client.messages.create(
                model="claude-sonnet-4-6", max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            return "".join(b.text for b in msg.content if b.type == "text").strip()
        except Exception:
            pass

    # Template fallback
    level = breakdown["risk_level"]
    flagged_count = sum(1 for s in steps if s["status"] in ("flagged", "critical"))
    action = {
        "Critical": "Immediate escalation to MLRO is required. Do not proceed with onboarding.",
        "High": "Enhanced Due Diligence is required before onboarding. Escalate to senior compliance.",
        "Medium": "Standard Due Diligence with quarterly monitoring is recommended.",
        "Low": "Simplified Due Diligence applies. Annual review is sufficient.",
    }.get(level, "Standard review recommended.")
    return (
        f"Autonomous investigation of {name} completed across 10 risk dimensions. "
        f"Overall risk is rated {level} (score {breakdown['overall']}/100) with "
        f"{flagged_count} of 10 checks flagged. AML risk is {aml['aml_risk']} and "
        f"ML fraud probability is {fraud['fraud_probability']}%. {action}"
    )
