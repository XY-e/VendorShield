from dataclasses import dataclass
import datetime as dt


@dataclass
class AMLFlag:
    code: str
    severity: str          # critical / high / medium
    category: str          # structure / pep / sanctions / financial / geographic / cyber / identity
    title: str
    description: str
    evidence: dict


CATEGORIES = {
    "structure": "Shell Company / Structuring",
    "pep": "PEP / Politically Exposed",
    "sanctions": "Sanctions / Watchlist",
    "financial": "Financial Anomaly",
    "geographic": "High-Risk Jurisdiction",
    "cyber": "Digital Identity Risk",
    "identity": "Identity / Transparency",
}


def check_shell_company(company, domain, financials) -> list[AMLFlag]:
    flags = []
    # Shell company indicator: very young domain + high market cap + very few employees
    if domain and financials:
        market_cap = getattr(financials, 'market_cap', None) or 0
        if domain.age_days < 365 and market_cap > 5_000_000 and (company.employees or 0) < 10:
            flags.append(AMLFlag(
                code="AML-SC-001", severity="critical", category="structure",
                title="Potential Shell Company",
                description="Company has very high reported market cap relative to its employee count and domain age, a common shell company indicator.",
                evidence={
                    "domain_age_days": domain.age_days,
                    "market_cap": market_cap,
                    "employees": company.employees,
                }
            ))
    # Young domain with no registration info
    if domain and domain.age_days and domain.age_days < 180:
        flags.append(AMLFlag(
            code="AML-SC-002", severity="medium", category="identity",
            title="Newly Registered Domain",
            description="Domain registered less than 6 months ago. New entities require enhanced due diligence under BNM AML/CFT guidelines.",
            evidence={"domain_age_days": domain.age_days, "domain": domain.domain}
        ))
    return flags


def check_pep(sanction) -> list[AMLFlag]:
    flags = []
    if not sanction:
        return flags
    if sanction.pep and sanction.sanctioned:
        flags.append(AMLFlag(
            code="AML-PEP-001", severity="critical", category="pep",
            title="PEP + Active Sanctions Match",
            description="Entity is both politically exposed and appears on an active sanctions list. Immediate escalation required.",
            evidence={"list_source": sanction.list_source}
        ))
    elif sanction.pep:
        flags.append(AMLFlag(
            code="AML-PEP-002", severity="high", category="pep",
            title="Politically Exposed Person (PEP) Link",
            description="Entity is linked to a PEP. Enhanced due diligence mandatory under FATF Recommendation 12 and BNM AML/CFT Policy.",
            evidence={}
        ))
    return flags


def check_sanctions(sanction) -> list[AMLFlag]:
    if sanction and sanction.sanctioned:
        return [AMLFlag(
            code="AML-SAN-001", severity="critical", category="sanctions",
            title=f"Active Sanctions Match ({sanction.list_source})",
            description=f"Entity matched against {sanction.list_source} sanctions list. Engaging with this entity may constitute a criminal offence.",
            evidence={"list_source": sanction.list_source, "details": sanction.details}
        )]
    return []


def check_financial_anomaly(financials, company) -> list[AMLFlag]:
    flags = []
    if not financials:
        return flags
    if financials.debt_ratio and financials.debt_ratio > 0.85 and financials.revenue_trend == "up":
        flags.append(AMLFlag(
            code="AML-FIN-001", severity="high", category="financial",
            title="Rapid Revenue Growth with Extreme Leverage",
            description="Unusually fast revenue growth combined with very high debt ratio can indicate layering or financial statement manipulation.",
            evidence={"debt_ratio": financials.debt_ratio, "revenue_trend": financials.revenue_trend}
        ))
    if financials.revenue_trend == "down" and financials.debt_ratio and financials.debt_ratio > 0.7:
        flags.append(AMLFlag(
            code="AML-FIN-002", severity="medium", category="financial",
            title="Declining Revenue with High Debt",
            description="Sustained financial stress can indicate a distressed entity used as a money mule or facing bankruptcy-related fraud.",
            evidence={"debt_ratio": financials.debt_ratio, "revenue_trend": financials.revenue_trend}
        ))
    return flags


def check_geographic_risk(sanction, company) -> list[AMLFlag]:
    flags = []
    HIGH_RISK_COUNTRIES = {"Iran", "North Korea", "Syria", "Myanmar", "Russia", "Belarus", "Cuba"}
    MEDIUM_RISK_COUNTRIES = {"China", "UAE", "Turkey", "Pakistan"}
    country = company.country or ""
    if country in HIGH_RISK_COUNTRIES:
        flags.append(AMLFlag(
            code="AML-GEO-001", severity="critical", category="geographic",
            title=f"FATF High-Risk Jurisdiction: {country}",
            description="Entity is registered in a country subject to FATF's call for enhanced due diligence or countermeasures.",
            evidence={"country": country}
        ))
    elif country in MEDIUM_RISK_COUNTRIES:
        flags.append(AMLFlag(
            code="AML-GEO-002", severity="medium", category="geographic",
            title=f"Elevated Jurisdiction Risk: {country}",
            description="Entity is registered in a country with elevated AML/CFT risk. Standard due diligence may not be sufficient.",
            evidence={"country": country}
        ))
    if sanction and sanction.country_risk == "high":
        flags.append(AMLFlag(
            code="AML-GEO-003", severity="high", category="geographic",
            title="High-Risk Jurisdiction (Sanction Database)",
            description="Sanction database classifies this entity's country of origin as high-risk.",
            evidence={"country_risk": sanction.country_risk}
        ))
    return flags


def check_cyber_identity(domain, cyber) -> list[AMLFlag]:
    flags = []
    if domain and domain.blacklisted:
        flags.append(AMLFlag(
            code="AML-CYB-001", severity="high", category="cyber",
            title="Blacklisted Domain",
            description="Entity's domain appears on security blacklists. May indicate fraudulent or malicious operations.",
            evidence={"domain": domain.domain}
        ))
    if cyber and not cyber.ssl_valid:
        flags.append(AMLFlag(
            code="AML-CYB-002", severity="medium", category="cyber",
            title="Invalid SSL Certificate",
            description="No valid SSL certificate detected. Legitimate financial entities maintain valid SSL certificates.",
            evidence={}
        ))
    if cyber and cyber.cves:
        critical_cves = [c for c in cyber.cves if c.get("severity") == "critical"]
        if critical_cves:
            flags.append(AMLFlag(
                code="AML-CYB-003", severity="high", category="cyber",
                title=f"{len(critical_cves)} Critical CVE(s) Detected",
                description="Critical security vulnerabilities may indicate a compromised or neglected system, or an entity with no legitimate tech operations.",
                evidence={"cve_ids": [c["id"] for c in critical_cves]}
            ))
    return flags


def run_aml_check(company, sanction, domain, financials, cyber) -> dict:
    """Run all AML rules and return a structured report."""
    all_flags: list[AMLFlag] = []
    all_flags += check_shell_company(company, domain, financials)
    all_flags += check_pep(sanction)
    all_flags += check_sanctions(sanction)
    all_flags += check_financial_anomaly(financials, company)
    all_flags += check_geographic_risk(sanction, company)
    all_flags += check_cyber_identity(domain, cyber)

    severity_order = {"critical": 0, "high": 1, "medium": 2}
    all_flags.sort(key=lambda f: severity_order.get(f.severity, 3))

    critical_count = sum(1 for f in all_flags if f.severity == "critical")
    high_count = sum(1 for f in all_flags if f.severity == "high")
    medium_count = sum(1 for f in all_flags if f.severity == "medium")

    if critical_count > 0:
        aml_risk = "Critical"
    elif high_count >= 2:
        aml_risk = "High"
    elif high_count == 1 or medium_count >= 2:
        aml_risk = "Medium"
    else:
        aml_risk = "Low"

    return {
        "company_name": company.name,
        "aml_risk": aml_risk,
        "total_flags": len(all_flags),
        "critical_count": critical_count,
        "high_count": high_count,
        "medium_count": medium_count,
        "flags": [
            {
                "code": f.code, "severity": f.severity, "category": f.category,
                "title": f.title, "description": f.description, "evidence": f.evidence,
                "category_label": CATEGORIES.get(f.category, f.category),
            }
            for f in all_flags
        ],
        "recommendation": _recommendation(aml_risk),
        "regulatory_basis": "BNM AML/CFT Policy Document, FATF 40 Recommendations",
    }


def _recommendation(level: str) -> str:
    return {
        "Critical": "Immediately suspend engagement. File Suspicious Transaction Report (STR) with BNM. Do not tip off the entity.",
        "High": "Enhanced Due Diligence (EDD) required before any transaction. Obtain source of funds documentation.",
        "Medium": "Standard Customer Due Diligence (CDD) with additional monitoring. Review again in 30 days.",
        "Low": "No immediate AML concerns. Standard monitoring is sufficient.",
    }[level]
