import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Loading, ErrorBox, RiskBadge } from "../components/Shared";
import { Search as SearchIcon, Globe, Building2, Users, DollarSign } from "lucide-react";

export default function CompanySearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.listCompanies(query).then(setResults).catch((e) => setError(e.message));
  }, [query]);

  const openProfile = (id) => {
    setSelected(id);
    setProfile(null);
    api.getProfile(id).then(setProfile).catch((e) => setError(e.message));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Company Search</h2>
        <p className="text-slate-500 text-sm mt-1">Look up a vendor and view its full risk profile</p>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-2.5 text-slate-400" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or industry..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && <ErrorBox message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title={`Results (${results.length})`} className="lg:col-span-1 max-h-[600px] overflow-y-auto">
          <div className="space-y-1">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => openProfile(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  selected === c.id ? "bg-indigo-50 border border-indigo-200" : "hover:bg-slate-50"
                }`}
              >
                <div className="font-medium text-slate-800">{c.name}</div>
                <div className="text-xs text-slate-500">{c.industry} · {c.country}</div>
              </button>
            ))}
            {results.length === 0 && <div className="text-sm text-slate-400 py-4">No companies found.</div>}
          </div>
        </Card>

        <div className="lg:col-span-2">
          {!selected && (
            <Card><div className="text-sm text-slate-400 py-8 text-center">Select a company to view its profile</div></Card>
          )}
          {selected && !profile && <Loading label="Loading profile..." />}
          {profile && (
            <div className="space-y-4">
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{profile.company.name}</h3>
                    <a href={profile.company.website} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">
                      {profile.company.website}
                    </a>
                  </div>
                  <RiskBadge level={profile.risk.risk_level} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
                  <Stat icon={Building2} label="Industry" value={profile.company.industry} />
                  <Stat icon={Globe} label="Country" value={profile.company.country} />
                  <Stat icon={Users} label="Employees" value={profile.company.employees?.toLocaleString()} />
                  <Stat icon={DollarSign} label="Revenue" value={`$${(profile.company.revenue / 1e6).toFixed(1)}M`} />
                </div>
              </Card>

              <Card title="Risk Score">
                <div className="text-3xl font-bold text-slate-900">{profile.risk.overall} <span className="text-sm font-normal text-slate-400">/ 100</span></div>
                <a
                  href={api.reportUrl(selected)}
                  className="inline-block mt-3 text-xs font-medium text-indigo-600 hover:underline"
                >
                  Download full PDF report →
                </a>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={16} className="text-slate-400 mt-0.5" />
      <div>
        <div className="text-xs text-slate-400">{label}</div>
        <div className="font-medium text-slate-800">{value || "—"}</div>
      </div>
    </div>
  );
}
