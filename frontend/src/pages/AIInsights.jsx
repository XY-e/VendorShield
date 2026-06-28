import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Loading, ErrorBox, RiskBadge } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import { Sparkles, Download } from "lucide-react";

export default function AIInsights() {
  const [companyId, setCompanyId] = useState(null);
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setInsight(null);
    setLoading(true);
    api.getAIInsight(companyId)
      .then(setInsight)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI Insights</h2>
          <p className="text-slate-500 text-sm mt-1">LLM-generated risk summary and recommendation</p>
        </div>
        <CompanyPicker value={companyId} onChange={setCompanyId} />
      </div>

      {error && <ErrorBox message={error} />}
      {loading && <Loading label="Generating insight..." />}

      {insight && (
        <Card>
          <div className="flex items-start gap-4">
            <div className="bg-indigo-50 p-3 rounded-xl">
              <Sparkles className="text-indigo-600" size={22} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-slate-900">{insight.company_name}</h3>
                <RiskBadge level={insight.risk_level} />
              </div>
              <p className="text-slate-700 leading-relaxed">{insight.summary}</p>
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Recommendation</span>
                <p className="text-slate-800 mt-1">{insight.recommendation}</p>
              </div>
              {companyId && (
                <a
                  href={api.reportUrl(companyId)}
                  className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-indigo-600 hover:underline"
                >
                  <Download size={14} /> Download full PDF report
                </a>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
