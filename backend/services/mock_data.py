import random
import datetime as dt
from faker import Faker

fake = Faker()
random.seed()

INDUSTRIES = ["Technology", "Manufacturing", "Finance", "Healthcare", "Retail", "Energy", "Logistics"]
COUNTRIES = ["United States", "Malaysia", "Singapore", "United Kingdom", "Germany", "China", "India", "Brazil"]
NEWS_CATEGORIES = ["fraud", "lawsuit", "data breach", "corruption", "bankruptcy", "general"]
NEWS_TEMPLATES = {
    "fraud": "{company} under investigation for alleged accounting fraud",
    "lawsuit": "{company} faces class-action lawsuit over contract dispute",
    "data breach": "{company} discloses data breach affecting customer records",
    "corruption": "{company} executives named in bribery probe",
    "bankruptcy": "{company} files for bankruptcy protection amid restructuring",
    "general": "{company} announces quarterly results and expansion plans",
}
SOURCES = ["Reuters", "Bloomberg", "The Star", "TechCrunch", "Channel News Asia", "Financial Times"]


def generate_company_info(name: str | None = None) -> dict:
    company_name = name or fake.company()
    return {
        "name": company_name,
        "website": f"https://www.{company_name.lower().replace(',', '').replace(' ', '')[:20]}.com",
        "industry": random.choice(INDUSTRIES),
        "country": random.choice(COUNTRIES),
        "registration_status": random.choices(
            ["active", "active", "active", "dissolved", "suspended"], k=1
        )[0],
        "employees": random.randint(10, 50000),
        "revenue": round(random.uniform(0.5, 5000) * 1_000_000, 2),
    }


def generate_sanctions(company_name: str) -> dict:
    sanctioned = random.random() < 0.08
    pep = random.random() < 0.12
    return {
        "sanctioned": sanctioned,
        "pep": pep,
        "list_source": random.choice(["OFAC", "EU", "UN"]) if sanctioned else None,
        "country_risk": random.choices(["low", "medium", "high"], weights=[0.7, 0.22, 0.08])[0],
        "details": (
            f"{company_name} appears on a sanctions watchlist." if sanctioned
            else f"No sanctions matches found for {company_name}."
        ),
    }


def generate_news(company_name: str, n: int | None = None) -> list[dict]:
    n = n if n is not None else random.randint(2, 8)
    items = []
    for _ in range(n):
        category = random.choices(
            NEWS_CATEGORIES, weights=[0.1, 0.15, 0.1, 0.08, 0.05, 0.52]
        )[0]
        title = NEWS_TEMPLATES[category].format(company=company_name)
        is_negative = category != "general"
        sentiment_score = (
            round(random.uniform(-0.95, -0.2), 2) if is_negative
            else round(random.uniform(-0.1, 0.9), 2)
        )
        sentiment_label = (
            "negative" if sentiment_score < -0.15
            else "positive" if sentiment_score > 0.15
            else "neutral"
        )
        items.append({
            "title": title,
            "url": f"https://news.example.com/{fake.slug()}",
            "source": random.choice(SOURCES),
            "published_at": fake.date_time_between(start_date="-90d", end_date="now"),
            "category": category,
            "sentiment_label": sentiment_label,
            "sentiment_score": sentiment_score,
        })
    return items


def generate_cyber(company_name: str) -> dict:
    n_ports = random.randint(1, 6)
    open_ports = [
        {"port": p, "service": s}
        for p, s in random.sample(
            [(22, "ssh"), (80, "http"), (443, "https"), (3306, "mysql"),
             (21, "ftp"), (8080, "http-alt"), (3389, "rdp"), (25, "smtp")],
            k=min(n_ports, 8),
        )
    ]
    n_cves = random.choices([0, 1, 2, 3, 5], weights=[0.4, 0.25, 0.15, 0.12, 0.08])[0]
    cves = [
        {
            "id": f"CVE-2025-{random.randint(1000, 9999)}",
            "severity": random.choices(["low", "medium", "high", "critical"], weights=[0.3, 0.35, 0.25, 0.1])[0],
        }
        for _ in range(n_cves)
    ]
    ssl_valid = random.random() > 0.1
    sev_weight = {"low": 5, "medium": 15, "high": 30, "critical": 50}
    risky_ports = {21, 3389, 23, 3306}
    exposure_score = min(
        100,
        sum(sev_weight[c["severity"]] for c in cves)
        + sum(10 for p in open_ports if p["port"] in risky_ports)
        + (15 if not ssl_valid else 0),
    )
    return {
        "open_ports": open_ports,
        "ssl_valid": ssl_valid,
        "ssl_expiry": fake.date_time_between(start_date="now", end_date="+1y") if ssl_valid else None,
        "cves": cves,
        "exposure_score": float(exposure_score),
        "scanned_at": dt.datetime.utcnow(),
    }


def generate_domain(company_name: str, website: str | None) -> dict:
    domain = (website or f"{company_name.lower()}.com").replace("https://www.", "").replace("https://", "")
    age_days = random.randint(20, 9000)
    return {
        "domain": domain,
        "registrar": random.choice(["GoDaddy", "Namecheap", "Cloudflare", "Google Domains", "MarkMonitor"]),
        "age_days": age_days,
        "expires_at": fake.date_time_between(start_date="now", end_date="+2y"),
        "blacklisted": random.random() < 0.04,
    }


def generate_financials() -> dict:
    return {
        "market_cap": round(random.uniform(1, 500) * 1_000_000, 2),
        "debt_ratio": round(random.uniform(0.05, 0.95), 2),
        "revenue_trend": random.choices(["up", "flat", "down"], weights=[0.45, 0.3, 0.25])[0],
    }


def generate_esg() -> dict:
    e = round(random.uniform(20, 95), 1)
    s = round(random.uniform(20, 95), 1)
    g = round(random.uniform(20, 95), 1)
    return {
        "environmental": e,
        "social": s,
        "governance": g,
        "overall": round((e + s + g) / 3, 1),
    }


def generate_social_sentiment() -> float:
    """Returns a 0-100 social risk score (higher = more negative sentiment online)."""
    return round(random.uniform(0, 60), 1)
