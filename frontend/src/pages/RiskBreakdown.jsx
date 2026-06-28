import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Card, Loading, ErrorBox, RiskBadge } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const CATEGORY_LABELS = {
  compliance: "Compliance", cyber: "Cyber", news: "News",
  financial: "Financial", esg: "ESG", domain: "Domain", social: "Social",
};
const PIE_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6", "#ef4444"];

export default function RiskBreakdown() {
  const [params] = useSearchParams();
  const [companyId, setCompanyId] = useState(params.get("company") ? Number(params.get("company")) : null);
  const [risk, setRisk] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    setRisk(null);
    Promise.all([api.getRisk(companyId), api.getCompany(companyId)])
      .then(([r, c]) => { setRisk(r); setCompanyName(c.name); })
      .catch((e) => setError(e.message));
  }, [companyId]);

  const radarData = risk
    ? Object.keys(CATEGORY_LABELS).map((k) => ({ category: CATEGORY_LABELS[k], score: risk[k] }))
    : [];
  const pieData = risk
    ? Object.keys(CATEGORY_LABELS).map((k) => ({ name: CATEGORY_LABELS[k], value: risk[k] }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Risk Breakdown</h2>
          <p className="text-slate-500 text-sm mt-1">Category-level risk composition</p>
        </div>
        <CompanyPicker value={companyId} onChange={setCompanyId} />
      </div>

      {error && <ErrorBox message={error} />}
      {!risk && !error && <Loading />}

      {risk && (
        <>
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-800">{companyName}</h3>
            <RiskBadge level={risk.risk_level} />
            <span className="text-sm text-slate-500">Overall: {risk.overall} / 100</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Risk Radar">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Category Share">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Category Scores" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pieData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
