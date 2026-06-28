def _base_checklist() -> list[dict]:
    return [
        {"id": "kyc_01", "category": "Identity Verification", "item": "Obtain Certificate of Incorporation / SSM Form 9", "mandatory": True},
        {"id": "kyc_02", "category": "Identity Verification", "item": "Verify company registration number against SSM records", "mandatory": True},
        {"id": "kyc_03", "category": "Identity Verification", "item": "Obtain latest M&A (Memorandum & Articles of Association)", "mandatory": True},
        {"id": "kyc_04", "category": "Beneficial Ownership", "item": "Identify all beneficial owners with ≥25% shareholding", "mandatory": True},
        {"id": "kyc_05", "category": "Beneficial Ownership", "item": "Verify identity of each beneficial owner (NRIC/Passport)", "mandatory": True},
        {"id": "kyc_06", "category": "Sanctions Screening", "item": "Screen company and directors against OFAC, EU, UN lists", "mandatory": True},
        {"id": "kyc_07", "category": "Sanctions Screening", "item": "Screen against BNM's Terrorism Financing designated list", "mandatory": True},
        {"id": "kyc_08", "category": "Business Activity", "item": "Obtain business profile / audited financial statements (last 2 years)", "mandatory": True},
        {"id": "kyc_09", "category": "Business Activity", "item": "Verify primary business activity matches stated industry", "mandatory": True},
        {"id": "kyc_10", "category": "Digital Presence", "item": "Verify company website and domain ownership", "mandatory": False},
    ]


def _edd_checklist() -> list[dict]:
    return [
        {"id": "edd_01", "category": "Enhanced Due Diligence", "item": "Obtain source of funds / wealth documentation", "mandatory": True},
        {"id": "edd_02", "category": "Enhanced Due Diligence", "item": "Conduct independent reference checks (minimum 2 trade references)", "mandatory": True},
        {"id": "edd_03", "category": "Enhanced Due Diligence", "item": "Obtain senior management sign-off before onboarding", "mandatory": True},
        {"id": "edd_04", "category": "Enhanced Due Diligence", "item": "Schedule 6-monthly risk review (not annual)", "mandatory": True},
        {"id": "edd_05", "category": "Enhanced Due Diligence", "item": "Set transaction monitoring thresholds 50% below standard", "mandatory": True},
    ]


def _pep_checklist() -> list[dict]:
    return [
        {"id": "pep_01", "category": "PEP Procedures", "item": "Obtain approval from senior management before establishing relationship", "mandatory": True},
        {"id": "pep_02", "category": "PEP Procedures", "item": "Establish source of wealth and source of funds for PEP-linked entity", "mandatory": True},
        {"id": "pep_03", "category": "PEP Procedures", "item": "Document the nature of the PEP's public function", "mandatory": True},
        {"id": "pep_04", "category": "PEP Procedures", "item": "Conduct enhanced ongoing monitoring for the business relationship duration", "mandatory": True},
    ]


def _geo_checklist(country: str) -> list[dict]:
    return [
        {"id": "geo_01", "category": "Geographic Risk", "item": f"Document rationale for engaging with {country}-registered entity", "mandatory": True},
        {"id": "geo_02", "category": "Geographic Risk", "item": "Apply countermeasures per FATF guidance for high-risk jurisdiction", "mandatory": True},
        {"id": "geo_03", "category": "Geographic Risk", "item": "Obtain correspondent bank approval if applicable", "mandatory": False},
    ]


def generate_kyc_checklist(company, aml_result: dict) -> dict:
    items = _base_checklist()
    aml_risk = aml_result.get("aml_risk", "Low")

    if aml_risk in ("High", "Critical"):
        items += _edd_checklist()

    flags = aml_result.get("flags", [])
    has_pep = any(f["category"] == "pep" for f in flags)
    if has_pep:
        items += _pep_checklist()

    has_geo = any(f["code"] == "AML-GEO-001" for f in flags)
    if has_geo:
        items += _geo_checklist(company.country or "high-risk jurisdiction")

    dd_level = (
        "Enhanced Due Diligence (EDD)" if aml_risk in ("High", "Critical")
        else "Simplified Due Diligence (SDD)" if aml_risk == "Low"
        else "Customer Due Diligence (CDD)"
    )

    return {
        "company_name": company.name,
        "dd_level": dd_level,
        "aml_risk": aml_risk,
        "total_items": len(items),
        "mandatory_count": sum(1 for i in items if i["mandatory"]),
        "checklist": items,
        "regulatory_basis": "BNM AML/CFT Policy Document 2020, FATF 40 Recommendations",
        "review_frequency": "6 months" if aml_risk in ("High", "Critical") else "12 months",
    }
