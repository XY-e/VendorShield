import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Loading, ErrorBox } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import { ShieldCheck, ShieldX, UserCheck, Globe2, Clock } from "lucide-react";

const COUNTRY_RISK_STYLE = {
  low: "bg-green-50 text-green-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

export default function Compliance() {
  const [companyId, setCompanyId] = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [domain, setDomain] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    setCompliance(null);
    setDomain(null);
    Promise.all([api.getCompliance(companyId), api.getDomain(companyId)])
      .then(([c, d]) => { setCompliance(c); setDomain(d); })
      .catch((e) => setError(e.message));
  }, [companyId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Compliance</h2>
          <p className="text-slate-500 text-sm mt-1">Sanctions, PEP status, country and domain risk</p>
        </div>
        <CompanyPicker value={companyId} onChange={setCompanyId} />
      </div>

      {error && <ErrorBox message={error} />}
      {!compliance && !error && <Loading />}

      {compliance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Sanctions Status">
            <div className="flex items-center gap-2 mb-3">
              {compliance.sanctioned ? (
                <ShieldX className="text-red-600" size={22} />
              ) : (
                <ShieldCheck className="text-green-600" size={22} />
              )}
              <span className="font-semibold text-slate-800">
                {compliance.sanctioned ? `Sanctioned (${compliance.list_source})` : "No sanctions match"}
              </span>
            </div>
            <p className="text-sm text-slate-500">{compliance.details}</p>
          </Card>

          <Card title="PEP Status">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className={compliance.pep ? "text-amber-600" : "text-slate-400"} size={22} />
              <span className="font-semibold text-slate-800">
                {compliance.pep ? "Politically Exposed Person linked" : "No PEP linkage found"}
              </span>
            </div>
          </Card>

          <Card title="Country Risk">
            <div className="flex items-center gap-2 mb-2">
              <Globe2 size={18} className="text-slate-400" />
              <span className="text-slate-700">{compliance.country}</span>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${COUNTRY_RISK_STYLE[compliance.country_risk]}`}>
              {compliance.country_risk} risk jurisdiction
            </span>
          </Card>

          {domain && (
            <Card title="Domain Reputation">
              <div className="space-y-2 text-sm">
                <Row label="Domain" value={domain.domain} />
                <Row label="Registrar" value={domain.registrar} />
                <Row label="Domain Age" value={`${domain.age_days} days`} />
                <Row
                  label="Expires"
                  value={domain.expires_at ? new Date(domain.expires_at).toLocaleDateString() : "—"}
                />
                <Row
                  label="Blacklist Status"
                  value={domain.blacklisted ? "Blacklisted" : "Clean"}
                  valueClass={domain.blacklisted ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}
                />
                {domain.age_days < 365 && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 mt-2">
                    <Clock size={14} /> Young domain — higher risk
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, valueClass = "text-slate-800 font-medium" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
