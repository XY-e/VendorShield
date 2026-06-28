
from risk_engine import scoring


def simulate(company, weights: dict, category: str, delta_pct: float) -> dict:
    if category not in scoring.WEIGHTS_DEFAULT:
        raise ValueError(f"Unknown category: {category}")

    baseline = scoring.score_company(company, weights)

    scores = {k: baseline[k] for k in scoring.WEIGHTS_DEFAULT}
    original_value = scores[category]
    new_value = max(0.0, min(100.0, original_value * (1 + delta_pct / 100)))
    scores[category] = new_value

    simulated = scoring.compute_overall(scores, weights)

    return {
        "category": category,
        "delta_pct": delta_pct,
        "baseline": baseline,
        "simulated": simulated,
        "category_before": round(original_value, 1),
        "category_after": round(new_value, 1),
        "overall_before": baseline["overall"],
        "overall_after": simulated["overall"],
        "overall_delta": round(simulated["overall"] - baseline["overall"], 1),
        "risk_level_changed": baseline["risk_level"] != simulated["risk_level"],
    }
