import { useEffect, useState } from "react";
import { api, RISK_COLORS } from "../api/client";
import { Card, Loading, ErrorBox, RiskBadge } from "../components/Shared";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

const AML_COLORS = { Critical: "#dc2626", High: "#ea580c", Medium: "#ca8a04", Low: "#16a34a" };
const FRAUD_COLORS = { "Very High": "#dc2626", "High": "#ea580c", "Medium": "#ca8a04", "Low": "#16a34a" };
const CAT_LABELS = { compliance: "Compliance", cyber: "Cyber", news: "News", financial: "Financial", esg: "ESG", domain: "Domain", social: "Social" };

function Delta({ a, b, lowerIsBetter = true }) {
  const diff = a - b;
  if (Math.abs(diff) < 1) return <Minus size={14} className="text-slate-400" />;
  const aIsWorse = lowerIsBetter ? diff > 0 : diff < 0;
  return aIsWorse
    ? <ArrowUp size={14} className="text-red-500" />
    : <ArrowDown size={14} className="text-green-500" />;
}

function CompanySelector({ label, value, onChange, companies }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1 font-medium">{label}</div>
      <select value={value || ""} onChange={(e) => onChange(Number(e.target.value))}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white w-48">
        <option value="">Select company…</option>
        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );
}

export default function CompareCompanies() {
  const [companies, setCompanies] = useState([]);
  const [idA, setIdA] = useState(null);
  const [idB, setIdB] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.listCompanies().then(setCompanies); }, []);

  useEffect(() => {
    if (!idA || !idB || idA === idB) return;
    setLoading(true); setResult(null);
    api.compareCompanies(idA, idB)
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [idA, idB]);

  const radarData = result
    ? Object.keys(CAT_LABELS).map((k) => ({
        category: CAT_LABELS[k],
        [result.company_a.name]: result.company_a.risk[k],
        [result.company_b.name]: result.company_b.risk[k],
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Vendor Comparison</h2>
        <p className="text-slate-500 text-sm mt-1">Side-by-side risk, AML, and fraud profile comparison</p>
      </div>

      <Card>
        <div className="flex flex-wrap gap-6 items-end">
          <CompanySelector label="Company A" value={idA} onChange={setIdA} companies={companies} />
          <div className="text-slate-300 font-bold text-2xl mb-1">vs</div>
          <CompanySelector label="Company B" value={idB} onChange={setIdB} companies={companies} />
          {idA && idB && idA === idB && <span className="text-xs text-amber-600">Select two different companies</span>}
        </div>
      </Card>

      {error && <ErrorBox message={error} />}
      {loading && <Loading />}

      {result && (() => {
        const a = result.company_a;
        const b = result.company_b;
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[a, b].map((c, i) => (
                <Card key={i}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-slate-900">{c.name}</h3>
                    <RiskBadge level={c.risk.risk_level} />
                  </div>
                  <div className="space-y-1 text-sm">
                    <Row label="Industry" value={c.industry} />
                    <Row label="Country" value={c.country} />
                    <Row label="Employees" value={c.employees?.toLocaleString()} />
                    <Row label="Overall Score" value={<strong>{c.risk.overall}</strong>} />
                    <Row label="AML Risk" value={<span className="font-semibold" style={{ color: AML_COLORS[c.aml_risk] }}>{c.aml_risk}</span>} />
                    <Row label="AML Flags" value={c.aml_flags} />
                    <Row label="Fraud Probability" value={`${c.fraud_probability}%`} />
                  </div>
                </Card>
              ))}
            </div>

            <Card title="Risk Radar — Head to Head">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey={a.name} stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                  <Radar dataKey={b.name} stroke="#ec4899" fill="#ec4899" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Category Score Comparison">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4 text-indigo-600">{a.name}</th>
                    <th className="py-2 pr-4 text-pink-600">{b.name}</th>
                    <th className="py-2 pr-4">Δ</th>
                    <th className="py-2 pr-4">Winner (lower=safer)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(CAT_LABELS).map((k) => {
                    const va = a.risk[k];
                    const vb = b.risk[k];
                    const winner = va < vb ? a.name : vb < va ? b.name : "Tie";
                    const winColor = va < vb ? "#6366f1" : vb < va ? "#ec4899" : "#64748b";
                    return (
                      <tr key={k} className="border-b border-slate-100">
                        <td className="py-2 pr-4 font-medium">{CAT_LABELS[k]}</td>
                        <td className="py-2 pr-4 font-mono">{va}</td>
                        <td className="py-2 pr-4 font-mono">{vb}</td>
                        <td className="py-2 pr-4"><Delta a={va} b={vb} /></td>
                        <td className="py-2 pr-4 text-xs font-semibold" style={{ color: winColor }}>{winner}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        );
      })()}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-800">{value ?? "—"}</span>
    </div>
  );
}
