import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Loading, ErrorBox } from "../components/Shared";
import { AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  info: { icon: AlertTriangle, color: "text-blue-600", bg: "bg-blue-50" },
};

export default function AlertCenter() {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = () => api.listAlerts().then(setAlerts).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await api.markAlertRead(id);
    load();
  };

  if (error) return <ErrorBox message={error} />;
  if (!alerts) return <Loading label="Loading alerts..." />;

  const filtered = filter === "all" ? alerts : alerts.filter((a) => !a.read);
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Alert Center</h2>
          <p className="text-slate-500 text-sm mt-1">{unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="all">All alerts</option>
          <option value="unread">Unread only</option>
        </select>
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {filtered.map((a) => {
            const cfg = SEVERITY_CONFIG[a.severity] || SEVERITY_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className={`py-4 flex items-start gap-3 ${!a.read ? cfg.bg + " -mx-5 px-5" : ""}`}>
                <Icon className={cfg.color} size={20} />
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{a.message}</p>
                  <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
                </div>
                {!a.read && (
                  <button
                    onClick={() => markRead(a.id)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline shrink-0"
                  >
                    <CheckCircle2 size={14} /> Mark read
                  </button>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-sm text-slate-400 py-8 text-center">No alerts to show.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
