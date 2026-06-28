import { useState } from "react";
import { Card } from "../components/Shared";
import { Building2, ShieldCheck, TrendingUp, Users, DollarSign, Clock, CheckCircle2, ChevronRight } from "lucide-react";

const PAIN_POINTS = [
  { icon: Clock, title: "Manual KYC takes days", desc: "Compliance analysts spend 4–8 hours per vendor screening manually across OFAC, EU, UN watchlists and news sources." },
  { icon: DollarSign, title: "Fines are catastrophic", desc: "BNM imposed RM3.4B in fines for AML breaches in 2023. A single missed PEP or sanctions hit can cost millions." },
  { icon: Users, title: "No unified risk view", desc: "Risk data is siloed across spreadsheets, email, and point-solution tools with no portfolio-level visibility." },
  { icon: ShieldCheck, title: "Regulators want proof", desc: "BNM AML/CFT Policy requires documented, repeatable CDD processes — pen-and-paper doesn't pass audit." },
];

const CUSTOMERS = [
  { segment: "Banks & Financial Institutions", pain: "Correspondent banking KYC, AML compliance, credit risk", willingness: "RM 15,000–80,000/yr" },
  { segment: "Fintech Platforms (e-wallets, P2P)", pain: "Merchant onboarding, fraud prevention, regulatory licence compliance", willingness: "RM 8,000–40,000/yr" },
  { segment: "Corporate Procurement / SCM", pain: "Vendor due diligence, supply chain risk, ESG compliance", willingness: "RM 5,000–25,000/yr" },
  { segment: "Insurance Underwriting", pain: "SME risk profiling, fraud detection, claims fraud prevention", willingness: "RM 10,000–50,000/yr" },
];

const PRICING = [
  { plan: "Starter", price: "RM 999/mo", vendors: "Up to 25 vendors", features: ["Risk scoring dashboard", "Sanctions + news monitoring", "Basic AML flags", "PDF reports", "Email alerts"], highlight: false },
  { plan: "Professional", price: "RM 3,499/mo", vendors: "Up to 200 vendors", features: ["Everything in Starter", "ML Fraud probability scoring", "Full AML red flag engine", "KYC checklist generator", "AI Chat Assistant", "API access"], highlight: true },
  { plan: "Enterprise", price: "Custom", vendors: "Unlimited vendors", features: ["Everything in Professional", "Custom risk weight tuning", "Real-time API integrations", "White-label option", "Dedicated compliance support", "BNM audit trail export"], highlight: false },
];

const ROADMAP = [
  { phase: "Phase 1 (Now)", items: ["Portfolio risk dashboard", "AML red flag engine", "ML fraud scoring", "KYC checklist", "Network graph", "RAG AI assistant"] },
  { phase: "Phase 2 (3 months)", items: ["SSM Malaysia live integration", "BNM STR auto-generation", "Real-time Shodan/news APIs", "Transaction monitoring module", "Mobile app"] },
  { phase: "Phase 3 (6 months)", items: ["Bank-grade audit trail", "Open Banking API", "Cross-bank AML intelligence sharing", "ISO 37001 compliance module", "Southeast Asia expansion"] },
];

export default function BusinessPitch() {
  const [vendors, setVendors] = useState(50);
  const analystHours = vendors * 6;
  const analystCost = Math.round(analystHours * 85);
  const platformCost = 3499;
  const saving = analystCost - platformCost;
  const roi = Math.round((saving / platformCost) * 100);

  return (
    <div className="space-y-10">
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <div className="text-indigo-300 text-sm font-semibold uppercase tracking-widest mb-3">NexHack 2026 · Track 2: Fintech Risk & Fraud Intelligence</div>
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">VendorShield</h1>
          <p className="text-xl text-indigo-200 mb-2">AI-Powered Vendor Risk Intelligence for Malaysian Financial Institutions</p>
          <p className="text-indigo-300 text-base leading-relaxed">
            Replace 6-hour manual KYC processes with 30-second automated risk assessments.
            Catch fraud, AML red flags, and sanctions violations before they cost you millions.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            {["BNM AML/CFT Aligned", "FATF 40 Recommendations", "ML Fraud Detection", "Real-time Monitoring"].map((tag) => (
              <span key={tag} className="bg-indigo-700/50 text-indigo-200 text-xs font-medium px-3 py-1.5 rounded-full border border-indigo-600">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">The Problem</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PAIN_POINTS.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <Icon className="text-red-500 mb-3" size={22} />
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500">{desc}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Target Customers</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {CUSTOMERS.map((c) => (
            <Card key={c.segment}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{c.segment}</h3>
                  <p className="text-sm text-slate-500">{c.pain}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-xs text-slate-400">Willingness to pay</div>
                  <div className="text-sm font-semibold text-indigo-600">{c.willingness}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">ROI Calculator</h2>
        <Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">How many vendors do you screen per month?</label>
              <input type="range" min="10" max="500" step="10" value={vendors}
                onChange={(e) => setVendors(Number(e.target.value))} className="w-full accent-indigo-600 mb-2" />
              <div className="text-2xl font-bold text-slate-900">{vendors} vendors/month</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-xs text-red-600 font-semibold uppercase tracking-wide">Manual Process Cost</div>
                <div className="text-2xl font-bold text-red-600 mt-1">RM {analystCost.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">{analystHours} analyst hours @ RM 85/hr</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-xs text-green-600 font-semibold uppercase tracking-wide">VendorShield Cost</div>
                <div className="text-2xl font-bold text-green-600 mt-1">RM {platformCost.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Professional plan/month</div>
              </div>
              <div className="bg-indigo-50 rounded-xl p-4">
                <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">Monthly Saving</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">RM {Math.max(saving, 0).toLocaleString()}</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <div className="text-xs text-purple-600 font-semibold uppercase tracking-wide">ROI</div>
                <div className="text-2xl font-bold text-purple-600 mt-1">{Math.max(roi, 0)}%</div>
                <div className="text-xs text-slate-500 mt-1">return on investment</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Pricing</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PRICING.map((p) => (
            <div key={p.plan} className={`rounded-xl border p-6 ${p.highlight ? "border-indigo-500 shadow-lg shadow-indigo-100 bg-indigo-50" : "border-slate-200 bg-white"}`}>
              {p.highlight && <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">Most Popular</div>}
              <h3 className="text-lg font-bold text-slate-900">{p.plan}</h3>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">{p.price}</div>
              <div className="text-sm text-slate-400 mb-5">{p.vendors}</div>
              <ul className="space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 size={15} className={p.highlight ? "text-indigo-500" : "text-green-500"} />{f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Product Roadmap</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {ROADMAP.map((r, i) => (
            <Card key={r.phase}>
              <div className={`text-xs font-bold uppercase tracking-wide mb-3 ${i === 0 ? "text-green-600" : i === 1 ? "text-indigo-600" : "text-purple-600"}`}>{r.phase}</div>
              <ul className="space-y-1.5">
                {r.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                    <ChevronRight size={13} className="text-slate-400 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
