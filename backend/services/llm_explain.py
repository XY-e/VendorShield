import os
import json

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

DRIVER_LABELS = {
    "compliance": "sanctions/PEP exposure",
    "cyber": "cybersecurity exposure",
    "news": "negative news coverage",
    "financial": "financial instability",
    "esg": "weak ESG practices",
    "domain": "domain reputation issues",
    "social": "negative social sentiment",
}


def _top_drivers(breakdown: dict, n: int = 2) -> list[str]:
    keys = [k for k in DRIVER_LABELS if k in breakdown]
    ranked = sorted(keys, key=lambda k: breakdown[k], reverse=True)
    return [DRIVER_LABELS[k] for k in ranked[:n] if breakdown[k] >= 30]


def _template_explanation(company_name: str, breakdown: dict) -> dict:
    drivers = _top_drivers(breakdown)
    level = breakdown["risk_level"]
    if not drivers:
        summary = (
            f"{company_name} presents {level.lower()} overall risk. No single "
            f"risk category stands out as a significant concern at this time."
        )
    else:
        driver_text = " and ".join(drivers)
        summary = (
            f"{company_name} presents {level.lower()} risk, driven primarily by "
            f"{driver_text}."
        )

    if level in ("High", "Critical"):
        recommendation = "Enhanced due diligence is recommended before proceeding."
    elif level == "Medium":
        recommendation = "Periodic monitoring is recommended; no immediate action required."
    else:
        recommendation = "Standard monitoring is sufficient at this risk level."

    return {
        "company_name": company_name,
        "summary": summary,
        "recommendation": recommendation,
        "risk_level": level,
    }


def explain_risk(company_name: str, breakdown: dict) -> dict:
    if not ANTHROPIC_API_KEY:
        return _template_explanation(company_name, breakdown)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        prompt = (
            f"Company: {company_name}\n"
            f"Risk score breakdown (0-100, higher=riskier): {json.dumps(breakdown)}\n\n"
            "Write a 2-sentence risk explanation for a compliance analyst: sentence 1 "
            "states the overall risk level and primary drivers, sentence 2 gives a "
            "concrete recommendation. Be concise and factual."
        )
        msg = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in msg.content if b.type == "text").strip()
        sentences = text.split(". ")
        summary = sentences[0].strip().rstrip(".") + "."
        recommendation = ". ".join(sentences[1:]).strip() or "Standard monitoring is sufficient."
        return {
            "company_name": company_name,
            "summary": summary,
            "recommendation": recommendation,
            "risk_level": breakdown["risk_level"],
        }
    except Exception:
        # Never let an LLM/API failure break the dashboard — fall back gracefully.
        return _template_explanation(company_name, breakdown)
