import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Loading, ErrorBox } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";

const SERIES = [
  { key: "overall_score", label: "Overall", color: "#0f172a" },
  { key: "compliance_score", label: "Compliance", color: "#6366f1" },
  { key: "cyber_score", label: "Cyber", color: "#ec4899" },
  { key: "news_score", label: "News", color: "#f59e0b" },
  { key: "financial_score", label: "Financial", color: "#10b981" },
];

export default function HistoricalTrends() {
  const [companyId, setCompanyId] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(SERIES.map((s) => s.key));

  useEffect(() => {
    if (!companyId) return;
    setHistory(null);
    api.getHistory(companyId).then(setHistory).catch((e) => setError(e.message));
  }, [companyId]);

  const data = (history || []).map((h) => ({
    ...h,
    date: new Date(h.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  const toggle = (key) =>
    setVisible((v) => (v.includes(key) ? v.filter((k) => k !== key) : [...v, key]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Historical Trends</h2>
          <p className="text-slate-500 text-sm mt-1">Risk evolution over the last 15 daily snapshots</p>
        </div>
        <CompanyPicker value={companyId} onChange={setCompanyId} />
      </div>

      {error && <ErrorBox message={error} />}
      {!history && !error && <Loading />}

      {history && (
        <Card>
          <div className="flex flex-wrap gap-2 mb-4">
            {SERIES.map((s) => (
              <button
                key={s.key}
                onClick={() => toggle(s.key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  visible.includes(s.key)
                    ? "text-white border-transparent"
                    : "text-slate-400 border-slate-200 bg-white"
                }`}
                style={visible.includes(s.key) ? { backgroundColor: s.color } : {}}
              >
                {s.label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              {SERIES.filter((s) => visible.includes(s.key)).map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={s.key === "overall_score" ? 3 : 1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
