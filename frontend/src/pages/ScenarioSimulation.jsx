import { useState } from "react";
import { api } from "../api/client";
import { Card, ErrorBox, RiskBadge } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import { Play, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";

const CATEGORIES = [
  { key: "compliance", label: "Compliance Risk" },
  { key: "cyber", label: "Cyber Risk" },
  { key: "news", label: "News Risk" },
  { key: "financial", label: "Financial Risk" },
  { key: "esg", label: "ESG Risk" },
  { key: "domain", label: "Domain Reputation" },
  { key: "social", label: "Social Sentiment" },
];

export default function ScenarioSimulation() {
  const [companyId, setCompanyId] = useState(null);
  const [category, setCategory] = useState("cyber");
  const [deltaPct, setDeltaPct] = useState(30);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.runScenario(companyId, category, deltaPct);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Scenario Simulation</h2>
          <p className="text-slate-500 text-sm mt-1">
            "If cyber risk increases by 30%, what happens to overall risk?"
          </p>
        </div>
        <CompanyPicker value={companyId} onChange={setCompanyId} />
      </div>

      {error && <ErrorBox message={error} />}

      <Card title="Configure Scenario">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Risk Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700">Change</label>
              <span className={`text-sm font-semibold ${deltaPct >= 0 ? "text-red-600" : "text-green-600"}`}>
                {deltaPct > 0 ? "+" : ""}{deltaPct}%
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="100"
              step="5"
              value={deltaPct}
              onChange={(e) => setDeltaPct(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        </div>
        <button
          onClick={run}
          disabled={!companyId || loading}
          className="inline-flex items-center gap-2 mt-5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
        >
          <Play size={16} /> {loading ? "Simulating..." : "Run Simulation"}
        </button>
      </Card>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title={`${CATEGORIES.find((c) => c.key === category)?.label} Impact`}>
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">Before</div>
                <div className="text-2xl font-bold text-slate-800">{result.category_before}</div>
              </div>
              <ArrowRight className="text-slate-300" />
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">After</div>
                <div className="text-2xl font-bold text-indigo-600">{result.category_after}</div>
              </div>
            </div>
          </Card>

          <Card title="Overall Risk Impact">
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">Before</div>
                <div className="text-2xl font-bold text-slate-800">{result.overall_before}</div>
                <RiskBadge level={result.baseline.risk_level} />
              </div>
              <ArrowRight className="text-slate-300" />
              <div className="text-center">
                <div className="text-xs text-slate-400 mb-1">After</div>
                <div className="text-2xl font-bold text-indigo-600">{result.overall_after}</div>
                <RiskBadge level={result.simulated.risk_level} />
              </div>
            </div>
            <div className={`flex items-center justify-center gap-1.5 mt-4 text-sm font-medium ${
              result.overall_delta > 0 ? "text-red-600" : result.overall_delta < 0 ? "text-green-600" : "text-slate-500"
            }`}>
              {result.overall_delta > 0 ? <TrendingUp size={16} /> : result.overall_delta < 0 ? <TrendingDown size={16} /> : null}
              {result.overall_delta > 0 ? "+" : ""}{result.overall_delta} points
              {result.risk_level_changed && (
                <span className="ml-2 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                  Risk level changed!
                </span>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
