import { RISK_COLORS } from "../api/client";

export function RiskBadge({ level }) {
  const color = RISK_COLORS[level] || "#64748b";
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: color }} />
      {level}
    </span>
  );
}

export function RiskGauge({ score, level, size = 180 }) {
  const color = RISK_COLORS[level] || "#64748b";
  const radius = size / 2 - 14;
  const circumference = Math.PI * radius; // semicircle
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const dash = circumference * pct;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path
          d={`M 14 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 14} ${size / 2}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M 14 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 14} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fontSize="28" fontWeight="700" fill="#0f172a">
          {score}
        </text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="11" fill="#64748b">
          / 100
        </text>
      </svg>
      <RiskBadge level={level} />
    </div>
  );
}

export function Card({ title, children, className = "", action }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Loading({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
      {label}
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
      {message}
    </div>
  );
}
