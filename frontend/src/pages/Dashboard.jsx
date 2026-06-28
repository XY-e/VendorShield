import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Card, Loading, ErrorBox, RiskBadge, RiskGauge } from "../components/Shared";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { RISK_COLORS } from "../api/client";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.dashboardSummary().then(setSummary).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!summary) return <Loading label="Loading dashboard..." />;

  const levelOrder = ["Critical", "High", "Medium", "Low"];
  const levelData = levelOrder
    .filter((l) => summary.level_counts[l])
    .map((l) => ({ level: l, count: summary.level_counts[l] }));

  const overallLevel =
    summary.average_score >= 75 ? "Critical" :
    summary.average_score >= 50 ? "High" :
    summary.average_score >= 25 ? "Medium" : "Low";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Portfolio Risk Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">
          Overview across {summary.companies.length} monitored vendors
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Average Portfolio Risk" className="flex flex-col items-center">
          <RiskGauge score={summary.average_score} level={overallLevel} />
        </Card>

        <Card title="Risk Level Distribution" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={levelData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="level" width={80} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {levelData.map((entry, i) => (
                  <Cell key={i} fill={RISK_COLORS[entry.level]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Monitored Vendors" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-4">Company</th>
              <th className="py-2 pr-4">Industry</th>
              <th className="py-2 pr-4">Overall Score</th>
              <th className="py-2 pr-4">Risk Level</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {summary.companies.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2.5 pr-4 font-medium text-slate-800">{c.name}</td>
                <td className="py-2.5 pr-4 text-slate-500">{c.industry}</td>
                <td className="py-2.5 pr-4">{c.overall}</td>
                <td className="py-2.5 pr-4"><RiskBadge level={c.risk_level} /></td>
                <td className="py-2.5 pr-4">
                  <Link to={`/risk?company=${c.id}`} className="text-indigo-600 hover:underline text-xs font-medium">
                    View details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
