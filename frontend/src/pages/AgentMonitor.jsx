import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { Card, ErrorBox, RiskBadge } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import {
  Search, Shield, Newspaper, ShieldAlert, TrendingUp, AlertTriangle,
  Brain, Globe, Scroll, ClipboardCheck, CheckCircle2, AlertOctagon,
  Play, Loader2, Bot, Sparkles,
} from "lucide-react";

const STEP_ICONS = {
  search: Search, shield: Shield, newspaper: Newspaper,
  "shield-alert": ShieldAlert, "trending-up": TrendingUp,
  "alert-triangle": AlertTriangle, brain: Brain, globe: Globe,
  scroll: Scroll, "clipboard-check": ClipboardCheck,
};

const STATUS_CONFIG = {
  clear:    { color: "text-green-600",  bg: "bg-green-50  border-green-200",  icon: CheckCircle2,  label: "Clear"    },
  flagged:  { color: "text-amber-600",  bg: "bg-amber-50  border-amber-200",  icon: AlertTriangle, label: "Flagged"  },
  critical: { color: "text-red-600",    bg: "bg-red-50    border-red-200",    icon: AlertOctagon,  label: "Critical" },
  running:  { color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200", icon: Loader2,       label: "Running…" },
  pending:  { color: "text-slate-400",  bg: "bg-slate-50  border-slate-100",  icon: null,          label: "Pending"  },
};

const LEVEL_COLOR = { Low: "text-green-600", Medium: "text-amber-600", High: "text-orange-600", Critical: "text-red-600" };

export default function AgentMonitor() {
  const [companyId, setCompanyId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [currentlyRunning, setCurrentlyRunning] = useState(null);
  const bottomRef = useRef(null);

  // Animate steps appearing one by one after result arrives
  useEffect(() => {
    if (!result) return;
    setVisibleSteps(0);
    setCurrentlyRunning(1);
    const total = result.steps.length;
    let i = 0;
    const tick = () => {
      i++;
      setCurrentlyRunning(i < total ? i + 1 : null);
      setVisibleSteps(i);
      if (i < total) setTimeout(tick, 500);
    };
    setTimeout(tick, 400);
  }, [result]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [visibleSteps]);

  const investigate = async () => {
    if (!companyId) return;
    setRunning(true); setResult(null); setError(null); setVisibleSteps(0);
    try {
      const data = await api.agentInvestigate(companyId);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const allVisible = result && visibleSteps >= result.steps.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="text-indigo-600" size={28} /> Autonomous AI Agent
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Watch the AI independently investigate a company across 10 risk dimensions — sanctions, AML, fraud, cyber, financial, and more
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CompanyPicker value={companyId} onChange={setCompanyId} />
          <button
            onClick={investigate}
            disabled={!companyId || running}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {running ? "Investigating…" : "Run Investigation"}
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      {/* Idle state */}
      {!result && !running && (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <div className="bg-indigo-50 rounded-full p-5 mb-4">
              <Bot className="text-indigo-400" size={40} />
            </div>
            <h3 className="font-semibold text-slate-700 mb-2">Ready to investigate</h3>
            <p className="text-slate-400 text-sm max-w-md">
              Select a vendor and click Run Investigation. The AI agent will autonomously
              screen sanctions, analyse news, check cyber exposure, run AML screening,
              compute fraud probability, and generate a full compliance verdict.
            </p>
          </div>
        </Card>
      )}

      {/* Running placeholder */}
      {running && (
        <Card>
          <div className="flex items-center gap-3 py-6 justify-center text-indigo-600">
            <Loader2 size={24} className="animate-spin" />
            <span className="font-medium">Agent is investigating…</span>
          </div>
        </Card>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Header summary card */}
          <Card>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="text-indigo-500" size={18} />
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Investigation Complete — {result.investigated_at?.slice(0, 10)}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{result.company_name}</h3>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Pill label="Overall" value={result.overall_score} sublabel={result.overall_risk}
                  color={LEVEL_COLOR[result.overall_risk]} />
                <Pill label="AML Risk" value={result.aml_risk} sublabel="" color={
                  result.aml_risk === "Critical" ? "text-red-600" :
                  result.aml_risk === "High" ? "text-orange-600" :
                  result.aml_risk === "Medium" ? "text-amber-600" : "text-green-600"
                } />
                <Pill label="Fraud Prob." value={`${result.fraud_probability}%`} sublabel="" color={
                  result.fraud_probability >= 70 ? "text-red-600" :
                  result.fraud_probability >= 40 ? "text-amber-600" : "text-green-600"
                } />
                <Pill label="Steps Flagged" value={`${result.flagged_steps}/${result.total_steps}`} sublabel="" color={
                  result.flagged_steps >= 4 ? "text-red-600" :
                  result.flagged_steps >= 2 ? "text-amber-600" : "text-green-600"
                } />
              </div>
            </div>
          </Card>

          {/* Step-by-step investigation timeline */}
          <div className="space-y-3">
            {result.steps.slice(0, visibleSteps).map((step, idx) => {
              const cfg = STATUS_CONFIG[step.status] || STATUS_CONFIG.clear;
              const StatusIcon = cfg.icon;
              const StepIcon = STEP_ICONS[step.icon] || Search;
              const isRunning = currentlyRunning === step.step + 1 && idx === visibleSteps - 1;
              return (
                <div
                  key={step.step}
                  className={`border rounded-xl p-4 transition-all duration-300 ${cfg.bg}`}
                  style={{ animation: "fadeSlideIn 0.3s ease-out" }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border ${
                      step.status === "clear" ? "border-green-200" :
                      step.status === "critical" ? "border-red-300" : "border-amber-300"
                    }`}>
                      <StepIcon size={15} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-400">STEP {step.step}</span>
                        <h4 className="font-semibold text-slate-900 text-sm">{step.title}</h4>
                        <div className={`ml-auto flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
                          {StatusIcon && <StatusIcon size={13} className={isRunning ? "animate-spin" : ""} />}
                          {cfg.label}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{step.finding}</p>
                      {step.detail && (
                        <p className="mt-1.5 text-xs text-slate-500 font-mono bg-white/60 px-2 py-1 rounded">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Currently-running step indicator */}
            {currentlyRunning && visibleSteps < result.steps.length && (
              <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 size={18} className="text-indigo-500 animate-spin shrink-0" />
                  <span className="text-sm text-indigo-700 font-medium">
                    Running: {result.steps[visibleSteps]?.title}…
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Executive summary */}
          {allVisible && (
            <Card>
              <div className="flex items-start gap-3">
                <div className="bg-indigo-100 rounded-xl p-2.5 shrink-0">
                  <Sparkles className="text-indigo-600" size={20} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 mb-1.5">Executive Summary</div>
                  <p className="text-slate-700 leading-relaxed text-sm">{result.executive_summary}</p>
                  <div className="mt-4">
                    <a href={api.reportUrl(companyId)}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline">
                      Download full PDF report →
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Pill({ label, value, sublabel, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-center min-w-[90px]">
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      {sublabel && <div className="text-xs text-slate-400">{sublabel}</div>}
    </div>
  );
}
