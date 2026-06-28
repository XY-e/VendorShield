import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Loading, ErrorBox } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import { ShieldCheck, ShieldAlert, Lock, Unlock } from "lucide-react";

const SEVERITY_STYLE = {
  low: "bg-blue-50 text-blue-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-orange-50 text-orange-700",
  critical: "bg-red-50 text-red-700",
};

export default function CyberExposure() {
  const [companyId, setCompanyId] = useState(null);
  const [cyber, setCyber] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    setCyber(null);
    api.getCyber(companyId).then(setCyber).catch((e) => setError(e.message));
  }, [companyId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Cyber Exposure</h2>
          <p className="text-slate-500 text-sm mt-1">Open ports, SSL status, and known CVEs</p>
        </div>
        <CompanyPicker value={companyId} onChange={setCompanyId} />
      </div>

      {error && <ErrorBox message={error} />}
      {!cyber && !error && <Loading />}

      {cyber && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card title="Exposure Score">
            <div className="text-4xl font-bold text-slate-900">{cyber.exposure_score}</div>
            <div className="text-xs text-slate-400 mt-1">0 = no exposure, 100 = critical exposure</div>
          </Card>

          <Card title="SSL Certificate">
            <div className="flex items-center gap-2">
              {cyber.ssl_valid ? (
                <Lock className="text-green-600" size={20} />
              ) : (
                <Unlock className="text-red-600" size={20} />
              )}
              <span className="font-medium text-slate-800">{cyber.ssl_valid ? "Valid" : "Invalid / Missing"}</span>
            </div>
            {cyber.ssl_expiry && (
              <div className="text-xs text-slate-400 mt-1">
                Expires {new Date(cyber.ssl_expiry).toLocaleDateString()}
              </div>
            )}
          </Card>

          <Card title="Last Scanned">
            <div className="font-medium text-slate-800">{new Date(cyber.scanned_at).toLocaleString()}</div>
          </Card>

          <Card title="Open Ports" className="lg:col-span-1">
            <div className="space-y-2">
              {(cyber.open_ports || []).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-slate-700">{p.port}</span>
                  <span className="text-slate-500">{p.service}</span>
                </div>
              ))}
              {(!cyber.open_ports || cyber.open_ports.length === 0) && (
                <div className="text-sm text-slate-400">No open ports detected.</div>
              )}
            </div>
          </Card>

          <Card title="Known CVEs" className="lg:col-span-2">
            {cyber.cves && cyber.cves.length > 0 ? (
              <div className="space-y-2">
                {cyber.cves.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
                    <span className="font-mono text-slate-700">{c.id}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${SEVERITY_STYLE[c.severity]}`}>
                      {c.severity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <ShieldCheck size={18} /> No known CVEs found.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
