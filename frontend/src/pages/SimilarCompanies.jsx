import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Card, Loading, ErrorBox, RiskBadge } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import { GitCompareArrows } from "lucide-react";

export default function SimilarCompanies() {
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    setResults(null);
    Promise.all([api.getCompany(companyId), api.getSimilar(companyId, 6)])
      .then(([c, sim]) => { setCompanyName(c.name); setResults(sim); })
      .catch((e) => setError(e.message));
  }, [companyId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Similar Company Search</h2>
          <p className="text-slate-500 text-sm mt-1">
            Vendors with the closest risk profile — matched on industry, country, risk level, and top risk drivers
          </p>
        </div>
        <CompanyPicker value={companyId} onChange={setCompanyId} />
      </div>

      {error && <ErrorBox message={error} />}
      {!results && !error && <Loading />}

      {results && (
        <>
          <div className="text-sm text-slate-500">
            Companies most similar to <span className="font-semibold text-slate-800">{companyName}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((r) => (
              <Card key={r.id}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900">{r.name}</h3>
                  <RiskBadge level={r.risk_level} />
                </div>
                <div className="text-xs text-slate-500 mb-3">{r.industry} · {r.country}</div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Overall score</span>
                  <span className="font-medium text-slate-800">{r.overall}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-400 flex items-center gap-1">
                    <GitCompareArrows size={13} /> Similarity
                  </span>
                  <span className="font-medium text-indigo-600">{(r.similarity * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full"
                    style={{ width: `${Math.min(r.similarity * 100, 100)}%` }}
                  />
                </div>
                <Link
                  to={`/risk?company=${r.id}`}
                  className="inline-block mt-3 text-xs font-medium text-indigo-600 hover:underline"
                >
                  View risk breakdown →
                </Link>
              </Card>
            ))}
            {results.length === 0 && (
              <div className="text-sm text-slate-400 col-span-full py-8 text-center">
                No similar companies found.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
