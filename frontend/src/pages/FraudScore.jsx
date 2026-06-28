import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Loading, ErrorBox } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Brain } from "lucide-react";

const TIER_COLOR = { "Very High": "#dc2626", "High": "#ea580c", "Medium": "#ca8a04", "Low": "#16a34a" };

function FraudGauge({ probability, tier }) {
  const color = TIER_COLOR[tier] || "#64748b";
  const size = 200;
  const radius = size / 2 - 16;
  const circumference = Math.PI * radius;
  const dash = circumference * Math.min(probability, 100) / 100;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
        <path d={`M 16 ${size/2} A ${radius} ${radius} 0 0 1 ${size-16} ${size/2}`} fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round" />
        <path d={`M 16 ${size/2} A ${radius} ${radius} 0 0 1 ${size-16} ${size/2}`} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
        <text x={size/2} y={size/2-4} textAnchor="middle" fontSize="32" fontWeight="700" fill="#0f172a">{probability}%</text>
        <text x={size/2} y={size/2+16} textAnchor="middle" fontSize="12" fill="#64748b">Fraud Probability</text>
      </svg>
      <span className="text-sm font-semibold px-3 py-1 rounded-full mt-1" style={{ color, backgroundColor: color + "1a" }}>{tier} Risk</span>
    </div>
  );
}

export default function FraudScore() {
  const [companyId, setCompanyId] = useState(null);
  const [score, setScore] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [tab, setTab] = useState("company");
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getFraudPortfolio().then(setPortfolio).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!companyId || tab !== "company") return;
    setScore(null);
    api.getFraudScore(companyId).then(setScore).catch((e) => setError(e.message));
  }, [companyId, tab]);

  const featureLabel = (f) => f.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ML Fraud Probability Score</h2>
          <p className="text-slate-500 text-sm mt-1">RandomForest model trained on 600 synthetic samples with FATF-aligned fraud labels</p>
        </div>
        <div className="flex gap-2 items-center">
          {["company", "portfolio"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
              {t === "company" ? "Single Company" : "Portfolio View"}
            </button>
          ))}
          {tab === "company" && <CompanyPicker value={companyId} onChange={setCompanyId} />}
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {tab === "company" && !score && <Loading />}
      {tab === "company" && score && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="flex flex-col items-center justify-center">
            <FraudGauge probability={score.fraud_probability} tier={score.fraud_tier} />
            <p className="text-xs text-slate-400 mt-3 text-center">{score.model}</p>
          </Card>

          <Card title="Interpretation" className="lg:col-span-2">
            <div className="flex items-start gap-3">
              <Brain className="text-indigo-600 shrink-0 mt-1" size={20} />
              <p className="text-slate-700">{score.interpretation}</p>
            </div>
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Top Risk Drivers (Feature Importance)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={score.top_features} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" domain={[0, 50]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="feature" tickFormatter={featureLabel} width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                    {score.top_features.map((_, i) => (
                      <Cell key={i} fill={["#6366f1","#ec4899","#f59e0b","#10b981","#06b6d4"][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Feature Values for This Company" className="lg:col-span-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {score.feature_values.map((f) => (
                <div key={f.feature} className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">{featureLabel(f.feature)}</div>
                  <div className="font-bold text-slate-800">{f.value}</div>
                  <div className="text-xs text-slate-500">importance: {f.importance}%</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "portfolio" && (
        !portfolio ? <Loading /> : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">Fraud Probability</th>
                  <th className="py-2 pr-4">Tier</th>
                  <th className="py-2 pr-4">Industry</th>
                  <th className="py-2 pr-4">Overall Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => { setCompanyId(p.id); setTab("company"); }}>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{p.name}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-[80px]">
                          <div className="h-2 rounded-full" style={{ width: `${p.fraud_probability}%`, backgroundColor: TIER_COLOR[p.fraud_tier] }} />
                        </div>
                        <span className="font-medium">{p.fraud_probability}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: TIER_COLOR[p.fraud_tier], backgroundColor: TIER_COLOR[p.fraud_tier] + "1a" }}>
                        {p.fraud_tier}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">{p.industry}</td>
                    <td className="py-2.5 pr-4">{p.overall_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}
    </div>
  );
}
