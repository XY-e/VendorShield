
import datetime as dt

WEIGHTS_DEFAULT = {
    "compliance": 0.30,
    "cyber": 0.20,
    "news": 0.15,
    "financial": 0.15,
    "esg": 0.10,
    "domain": 0.05,
    "social": 0.05,
}

LEVEL_THRESHOLDS = [
    (25, "Low"),
    (50, "Medium"),
    (75, "High"),
    (101, "Critical"),
]


def risk_level_from_score(score: float) -> str:
    for threshold, label in LEVEL_THRESHOLDS:
        if score < threshold:
            return label
    return "Critical"


def compliance_score(sanction_record) -> float:
    if sanction_record is None:
        return 10.0
    score = 0.0
    if sanction_record.sanctioned:
        score += 70
    if sanction_record.pep:
        score += 20
    score += {"low": 0, "medium": 10, "high": 25}.get(sanction_record.country_risk, 0)
    return min(score, 100.0)


def cyber_score(cyber_finding) -> float:
    if cyber_finding is None:
        return 20.0
    return float(cyber_finding.exposure_score)


def news_score(news_items) -> float:
    if not news_items:
        return 15.0
    negatives = [n for n in news_items if n.sentiment_label == "negative"]
    ratio = len(negatives) / len(news_items)
    severity = {
        "fraud": 25, "corruption": 25, "data breach": 20,
        "bankruptcy": 20, "lawsuit": 12, "general": 0,
    }
    severity_total = sum(severity.get(n.category, 0) for n in negatives)
    return min(100.0, ratio * 50 + min(severity_total, 50))


def financial_score(financials) -> float:
    if financials is None:
        return 30.0
    score = 0.0
    score += financials.debt_ratio * 60
    if financials.revenue_trend == "down":
        score += 30
    elif financials.revenue_trend == "flat":
        score += 10
    return min(score, 100.0)


def esg_score(esg) -> float:
    if esg is None:
        return 30.0
    # ESG "overall" is a quality score (higher = better); invert to a risk score.
    return max(0.0, 100.0 - esg.overall)


def domain_score(domain) -> float:
    if domain is None:
        return 25.0
    score = 0.0
    if domain.age_days < 365:
        score += 40
    elif domain.age_days < 730:
        score += 15
    if domain.blacklisted:
        score += 50
    if domain.expires_at and domain.expires_at < dt.datetime.utcnow() + dt.timedelta(days=30):
        score += 10
    return min(score, 100.0)


def social_score(social_value: float | None) -> float:
    return float(social_value) if social_value is not None else 20.0


def compute_overall(scores: dict, weights: dict | None = None) -> dict:
    w = weights or WEIGHTS_DEFAULT
    overall = sum(scores[key] * w[key] for key in w)
    overall = round(overall, 1)
    return {
        **{k: round(v, 1) for k, v in scores.items()},
        "overall": overall,
        "risk_level": risk_level_from_score(overall),
    }


def score_company(company, weights: dict | None = None) -> dict:
    """Computes the full risk breakdown for a Company ORM object with its relations loaded."""
    sanction = company.sanctions[0] if company.sanctions else None
    cyber = company.cyber_findings[0] if company.cyber_findings else None
    scores = {
        "compliance": compliance_score(sanction),
        "cyber": cyber_score(cyber),
        "news": news_score(company.news_items),
        "financial": financial_score(company.financials),
        "esg": esg_score(company.esg),
        "domain": domain_score(company.domain),
        "social": social_score(getattr(company, "_social_score", None)),
    }
    return compute_overall(scores, weights)
