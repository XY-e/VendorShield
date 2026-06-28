
import os

_MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'models', 'sentiment_model.pkl')
_pipeline   = None


def _load_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    try:
        import joblib
        _pipeline = joblib.load(_MODEL_PATH)['pipeline']
    except Exception:
        _pipeline = None
    return _pipeline


# ---- keyword fallback ----
_NEG_WORDS = {
    "fraud", "lawsuit", "breach", "corruption", "bribery", "bankruptcy",
    "investigation", "scandal", "violation", "penalty", "fine", "hack",
    "leak", "decline", "loss", "default", "sued", "probe", "collapse",
    "crisis", "downgrade", "recall", "layoff", "debt", "deficit",
}
_POS_WORDS = {
    "growth", "expansion", "profit", "award", "partnership", "innovation",
    "record", "success", "launch", "milestone", "upgrade", "surge",
    "dividend", "acquisition", "revenue", "beat", "outperform",
}


def _keyword_classify(text: str) -> tuple[str, float]:
    words    = set(text.lower().replace(",", "").replace(".", "").split())
    neg_hits = len(words & _NEG_WORDS)
    pos_hits = len(words & _POS_WORDS)
    score    = pos_hits - neg_hits
    if score > 0:
        return "positive", min(0.50 + 0.15 * score, 0.97)
    if score < 0:
        return "negative", min(0.50 + 0.15 * abs(score), 0.97)
    return "neutral", 0.55


def classify(text: str) -> tuple[str, float]:
    pipe = _load_pipeline()
    if pipe is not None:
        label      = pipe.predict([text])[0]
        confidence = float(pipe.predict_proba([text])[0].max())
        return label, round(confidence, 3)
    return _keyword_classify(text)


# ---- risk-domain override keywords ----
_RISK_OVERRIDE_KEYWORDS = {
    "fraud", "sued", "bankruptcy", "bankrupt", "bribery", "corruption",
    "data breach", "cyber attack", "hack", "layoff", "lay off", "collapse",
    "default", "recall", "money laundering", "sanctions", "indicted",
    "convicted", "settlement", "fine", "penalty", "class action",
    "misconduct", "investigation", "probe", "scandal", "downgrade",
    "liquidation", "insolvency", "whistleblower", "sec charges",
}


def classify_risk_aware(text: str) -> tuple[str, float]:
    """
    Risk-aware classification for vendor news headlines.

    Applies the ML model first; if the model returns neutral AND the
    headline contains strong VENDOR RISK signal keywords (fraud,
    investigation, breach, etc.), the label is overridden to negative.

    Use this function (not classify()) when feeding news into news_score.
    """
    label, conf = classify(text)
    lower = text.lower()
    if label == "neutral" and any(kw in lower for kw in _RISK_OVERRIDE_KEYWORDS):
        return "negative", max(conf, 0.65)
    return label, conf
