import { useEffect, useState } from "react";
import { api, RISK_COLORS } from "../api/client";
import { Card, Loading, ErrorBox } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import { ShieldAlert, AlertTriangle, AlertOctagon, CheckCircle2, FileText } from "lucide-react";

const AML_COLORS = { Critical: "#dc2626", High: "#ea580c", Medium: "#ca8a04", Low: "#16a34a" };
const SEVERITY_ICON = {
  critical: <AlertOctagon size={16} className="text-red-600 shrink-0" />,
  high: <AlertTriangle size={16} className="text-orange-500 shrink-0" />,
  medium: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
};

export default function AMLDashboard() {
  const [portfolio, setPortfolio] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [tab, setTab] = useState("portfolio");
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAMLPortfolio().then(setPortfolio).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!companyId || tab !== "detail") return;
    setDetail(null); setKyc(null);
    Promise.all([api.getAML(companyId), api.getKYCChecklist(companyId)])
      .then(([aml, k]) => { setDetail(aml); setKyc(k); })
      .catch((e) => setError(e.message));
  }, [companyId, tab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AML Red Flag Engine</h2>
          <p className="text-slate-500 text-sm mt-1">FATF + BNM AML/CFT aligned — shell company detection, PEP exposure, sanctions, geographic risk</p>
        </div>
        <div className="flex gap-2">
          {["portfolio", "detail"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {t === "portfolio" ? "Portfolio Overview" : "Company Detail + KYC"}
            </button>
          ))}
          {tab === "detail" && <CompanyPicker value={companyId} onChange={setCompanyId} />}
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {tab === "portfolio" && (
        !portfolio ? <Loading /> : (
          <Card className="overflow-x-auto">
            <div className="mb-4 flex gap-4 flex-wrap">
              {["Critical","High","Medium","Low"].map(lvl => {
                const count = portfolio.filter(p => p.aml_risk === lvl).length;
                return count > 0 ? (
                  <div key={lvl} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: AML_COLORS[lvl] + "1a" }}>
                    <span className="text-sm font-semibold" style={{ color: AML_COLORS[lvl] }}>{count} {lvl}</span>
                  </div>
                ) : null;
              })}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Company</th>
                  <th className="py-2 pr-4">AML Risk</th>
                  <th className="py-2 pr-4">Flags</th>
                  <th className="py-2 pr-4">Critical</th>
                  <th className="py-2 pr-4">High</th>
                  <th className="py-2 pr-4">Overall Score</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => { setCompanyId(p.id); setTab("detail"); }}>
                    <td className="py-2.5 pr-4 font-medium text-slate-800">{p.name}</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ color: AML_COLORS[p.aml_risk], backgroundColor: AML_COLORS[p.aml_risk] + "1a" }}>
                        {p.aml_risk}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-medium">{p.total_flags}</td>
                    <td className="py-2.5 pr-4 text-red-600 font-bold">{p.critical_count || "—"}</td>
                    <td className="py-2.5 pr-4 text-orange-500 font-semibold">{p.high_count || "—"}</td>
                    <td className="py-2.5 pr-4">{p.overall_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      )}

      {tab === "detail" && (
        !detail ? <Loading /> : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-900">{detail.company_name}</h3>
              <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ color: AML_COLORS[detail.aml_risk], backgroundColor: AML_COLORS[detail.aml_risk] + "1a" }}>
                AML Risk: {detail.aml_risk}
              </span>
            </div>

            <Card title="Recommendation">
              <p className="text-sm text-slate-700">{detail.recommendation}</p>
              <p className="text-xs text-slate-400 mt-2">{detail.regulatory_basis}</p>
            </Card>

            <Card title={`Red Flags (${detail.total_flags})`}>
              {detail.flags.length === 0 ? (
                <div className="flex items-center gap-2 text-green-700 text-sm"><CheckCircle2 size={18} /> No AML red flags detected.</div>
              ) : (
                <div className="space-y-3">
                  {detail.flags.map((f, i) => (
                    <div key={i} className={`p-3 rounded-lg border ${f.severity === "critical" ? "bg-red-50 border-red-200" : f.severity === "high" ? "bg-orange-50 border-orange-200" : "bg-amber-50 border-amber-200"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {SEVERITY_ICON[f.severity]}
                        <span className="font-semibold text-sm text-slate-900">{f.title}</span>
                        <span className="text-xs text-slate-400 ml-auto">{f.code} · {f.category_label}</span>
                      </div>
                      <p className="text-xs text-slate-600">{f.description}</p>
                      {Object.keys(f.evidence).length > 0 && (
                        <div className="mt-1.5 text-xs text-slate-500 font-mono bg-white/60 px-2 py-1 rounded">
                          {Object.entries(f.evidence).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {kyc && (
              <Card title={`KYC Checklist — ${kyc.dd_level}`}>
                <div className="flex gap-4 mb-4 text-sm">
                  <span className="text-slate-500">Review every <strong>{kyc.review_frequency}</strong></span>
                  <span className="text-slate-500">{kyc.mandatory_count} mandatory items</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(
                    kyc.checklist.reduce((acc, item) => {
                      (acc[item.category] = acc[item.category] || []).push(item);
                      return acc;
                    }, {})
                  ).map(([cat, items]) => (
                    <div key={cat}>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-3 mb-1">{cat}</div>
                      {items.map((item) => (
                        <div key={item.id} className="flex items-start gap-2 py-1.5 border-b border-slate-100 last:border-0">
                          <input type="checkbox" className="mt-0.5 accent-indigo-600" />
                          <span className="text-sm text-slate-700 flex-1">{item.item}</span>
                          {item.mandatory && <span className="text-xs text-red-600 font-medium shrink-0">Required</span>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )
      )}
    </div>
  );
}
