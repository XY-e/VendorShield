import os
import numpy as np

_bundle      = None
_MODEL_PATH  = os.path.join(os.path.dirname(__file__), '..', 'data', 'models', 'fraud_model.pkl')

_FEATURE_NAMES = [
    "compliance_score", "cyber_score",    "news_score",
    "financial_score",  "esg_score",      "domain_score",
    "debt_ratio_pct",   "domain_age_norm","employee_norm",
]


# ---------- model loading ----------
def _load_bundle():
    global _bundle
    if _bundle is not None:
        return _bundle
    try:
        import joblib
        _bundle = joblib.load(_MODEL_PATH)
    except Exception as e:
        _bundle = None
    return _bundle


# ---------- calibration ----------
def _calibrate(raw_prob: float, bundle: dict) -> float:
    """Power-law mapping: compresses the top, expands the middle."""
    ref_max = bundle.get('calibration_ref_max', 0.43)
    power   = bundle.get('calibration_power',   0.55)
    ratio   = min(raw_prob / ref_max, 1.0)
    return round(float(ratio ** power) * 100, 1)


# ---------- synthetic fallback ----------
_fallback_rf      = None
_fallback_scaler  = None

def _ensure_fallback():
    global _fallback_rf, _fallback_scaler
    if _fallback_rf:
        return
    import random
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import StandardScaler

    rng = random.Random(42)
    X, y = [], []
    for _ in range(600):
        row = [rng.uniform(0, 100) for _ in range(9)]
        score = (
            (1 if row[0] > 70 else 0) * 3 + (1 if row[2] > 65 else 0) * 2 +
            (1 if row[7] < 20 else 0) * 2 + (1 if row[6] > 80 else 0) +
            (1 if row[1] > 60 else 0) + (1 if row[8] < 10 and row[6] > 70 else 0) * 2
        )
        label = 1 if score >= 4 else 0
        if rng.random() < 0.08:
            label = 1 - label
        X.append(row); y.append(label)

    _fallback_scaler = StandardScaler()
    Xs = _fallback_scaler.fit_transform(np.array(X))
    _fallback_rf = RandomForestClassifier(
        n_estimators=100, max_depth=6, random_state=42, class_weight='balanced')
    _fallback_rf.fit(Xs, y)


# ---------- feature extraction ----------
def _extract_features(company, breakdown: dict, domain, financials) -> list[float]:
    debt_ratio_pct  = (financials.debt_ratio * 100) if financials else 40.0
    raw_age         = domain.age_days if (domain and domain.age_days) else 365
    domain_age_norm = min(raw_age / 1825 * 100, 100)          # 5-yr normalisation
    employee_norm   = min((company.employees or 50) / 5000 * 100, 100)
    return [
        breakdown.get("compliance", 30),
        breakdown.get("cyber",      20),
        breakdown.get("news",       15),
        breakdown.get("financial",  30),
        breakdown.get("esg",        30),
        breakdown.get("domain",     25),
        debt_ratio_pct,
        domain_age_norm,
        employee_norm,
    ]


# ---------- public API ----------
def predict_fraud(company, breakdown: dict, domain, financials) -> dict:
    """
    Returns a dict with:
      fraud_probability  – 0-100 calibrated fraud risk score
      fraud_tier         – Low / Medium / High / Very High
      model              – description of the trained model
      top_features       – [{feature, importance}] sorted descending
      feature_values     – [{feature, value, importance}]
      interpretation     – plain-English summary
    """
    features = _extract_features(company, breakdown, domain, financials)
    bundle   = _load_bundle()

    if bundle:
        rf          = bundle['rf_model']
        raw_prob    = float(rf.predict_proba([features])[0][1])
        fraud_pct   = _calibrate(raw_prob, bundle)
        importances = rf.feature_importances_
        model_desc  = (
            f"RandomForest (200 trees, balanced weights) trained on "
            f"{bundle['n_samples']:,} real companies "
            f"(Company Bankruptcy dataset, AUC-ROC {bundle['train_auc']:.2f}) "
            f"+ CC Fraud calibration ({bundle['cc_n_samples']:,} transactions, "
            f"AUC-ROC {bundle['cc_auc']:.2f}). "
            f"Power-law calibration applied."
        )
    else:
        _ensure_fallback()
        import warnings
        warnings.warn("fraud_model.pkl not found — using synthetic fallback.", stacklevel=2)
        Xs          = _fallback_scaler.transform([features])
        raw_prob    = float(_fallback_rf.predict_proba(Xs)[0][1])
        fraud_pct   = round(raw_prob * 100, 1)
        importances = _fallback_rf.feature_importances_
        model_desc  = "RandomForest (100 trees, 600 synthetic samples — fallback mode)"

    tier = (
        "Very High" if fraud_pct >= 70 else
        "High"      if fraud_pct >= 50 else
        "Medium"    if fraud_pct >= 25 else
        "Low"
    )

    feat_imp = sorted(
        [{"feature": _FEATURE_NAMES[i],
          "importance": round(float(importances[i]) * 100, 1),
          "value":      round(features[i], 1)}
         for i in range(len(_FEATURE_NAMES))],
        key=lambda x: x["importance"], reverse=True,
    )

    return {
        "company_name":      company.name,
        "fraud_probability": fraud_pct,
        "fraud_tier":        tier,
        "model":             model_desc,
        "top_features":      [{"feature": f["feature"], "importance": f["importance"]}
                               for f in feat_imp[:5]],
        "feature_values":    feat_imp,
        "interpretation":    _interpret(tier, feat_imp[:2]),
    }


def _interpret(tier: str, top2: list[dict]) -> str:
    drivers = " and ".join(f["feature"].replace("_", " ") for f in top2)
    return {
        "Very High": (f"Model detects high-confidence fraud indicators driven by {drivers}. "
                      "Immediate investigation and MLRO escalation recommended."),
        "High":      (f"Multiple fraud risk signals present ({drivers}). "
                      "Enhanced manual review required before onboarding."),
        "Medium":    (f"Moderate fraud signals detected ({drivers}). "
                      "Standard due diligence with additional monitoring."),
        "Low":       ("Low fraud probability. No significant individual risk drivers. "
                      "Standard onboarding process applies."),
    }[tier]
