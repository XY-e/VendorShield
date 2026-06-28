import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Search, PieChart, Newspaper, ShieldAlert, ScrollText,
  Sparkles, TrendingUp, Bell, Settings, MessageSquare, GitCompareArrows,
  FlaskConical, MapPin, AlertTriangle, Brain, Network, ArrowLeftRight,
  Bot, DollarSign,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "/",       label: "Dashboard",          icon: LayoutDashboard, end: true },
      { to: "/search", label: "Company Search",      icon: Search },
      { to: "/alerts", label: "Alert Center",        icon: Bell },
      { to: "/map",    label: "Risk Map",            icon: MapPin },
    ],
  },
  {
    label: "Risk Analysis",
    items: [
      { to: "/risk",       label: "Risk Breakdown",     icon: PieChart },
      { to: "/trends",     label: "Historical Trends",  icon: TrendingUp },
      { to: "/scenario",   label: "Scenario Simulation",icon: FlaskConical },
      { to: "/compare",    label: "Compare Vendors",    icon: ArrowLeftRight },
      { to: "/similar",    label: "Similar Companies",  icon: GitCompareArrows },
    ],
  },
  {
    label: "Fintech & AML",
    items: [
      { to: "/aml",     label: "AML Red Flag Engine", icon: AlertTriangle },
      { to: "/fraud",   label: "ML Fraud Score",      icon: Brain },
      { to: "/network", label: "Relationship Network",icon: Network },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { to: "/news",       label: "News Feed",          icon: Newspaper },
      { to: "/cyber",      label: "Cyber Exposure",     icon: ShieldAlert },
      { to: "/compliance", label: "Compliance",         icon: ScrollText },
    ],
  },
  {
    label: "AI Features",
    items: [
      { to: "/agent",    label: "AI Agent",           icon: Bot },
      { to: "/insights", label: "AI Insights",        icon: Sparkles },
      { to: "/chat",     label: "AI Chat Assistant",  icon: MessageSquare },
    ],
  },
  {
    label: "Other",
    items: [
      { to: "/admin", label: "Admin Settings",  icon: Settings },
    ],
  },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-200 flex flex-col overflow-y-auto">
        <div className="px-5 py-5 border-b border-slate-800">
          <h1 className="text-base font-bold text-white leading-tight">VendorShield</h1>
          <p className="text-xs text-indigo-400 font-medium mt-0.5">AI Risk Intelligence</p>
        </div>

        <nav className="flex-1 px-2 py-3">
          {NAV_SECTIONS.map(({ label, items }) => (
            <div key={label} className="mb-4">
              <div className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {label}
              </div>
              {items.map(({ to, label: itemLabel, icon: Icon, end }) => (
                <NavLink
                  key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mb-0.5 ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`
                  }
                >
                  <Icon size={15} />
                  {itemLabel}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 text-[10px] text-slate-600 border-t border-slate-800">
          NexHack 2026 · Track 2 · Mock data mode
        </div>
      </aside>

      <main className="flex-1 bg-slate-50 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
