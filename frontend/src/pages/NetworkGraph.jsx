import { useEffect, useRef, useState } from "react";
import { api, RISK_COLORS } from "../api/client";
import { Card, Loading, ErrorBox } from "../components/Shared";
import { Building2, User, AlertTriangle } from "lucide-react";

const TYPE_COLOR = {
  company: (node) => RISK_COLORS[node.risk_level] || "#6366f1",
  person: (node) => node.pep ? "#dc2626" : "#64748b",
};
const EDGE_COLOR = { director: "#94a3b8", shared_director: "#f59e0b", subsidiary: "#6366f1" };

function useForceLayout(nodes, edges, width, height) {
  const [positions, setPositions] = useState({});
  const rafRef = useRef(null);
  const posRef = useRef({});
  const velRef = useRef({});

  useEffect(() => {
    if (!nodes.length) return;
    const pos = {};
    const vel = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const r = Math.min(width, height) * 0.35;
      pos[n.id] = { x: width / 2 + r * Math.cos(angle), y: height / 2 + r * Math.sin(angle) };
      vel[n.id] = { x: 0, y: 0 };
    });
    posRef.current = pos;
    velRef.current = vel;

    const edgeMap = {};
    edges.forEach(e => {
      (edgeMap[e.source] = edgeMap[e.source] || []).push(e.target);
      (edgeMap[e.target] = edgeMap[e.target] || []).push(e.source);
    });

    let iter = 0;
    const step = () => {
      if (iter++ > 200) { setPositions({ ...posRef.current }); return; }
      const p = posRef.current;
      const v = velRef.current;
      const k = 60;

      // Repulsion
      nodes.forEach(a => nodes.forEach(b => {
        if (a.id === b.id) return;
        const dx = p[a.id].x - p[b.id].x, dy = p[a.id].y - p[b.id].y;
        const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
        const f = (k * k) / dist;
        v[a.id].x += dx / dist * f * 0.1;
        v[a.id].y += dy / dist * f * 0.1;
      }));

      // Attraction along edges
      edges.forEach(e => {
        const dx = p[e.source]?.x - p[e.target]?.x;
        const dy = p[e.source]?.y - p[e.target]?.y;
        if (dx === undefined) return;
        const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 1);
        const f = (dist * dist) / (k * 4);
        const fx = dx / dist * f * 0.08;
        const fy = dy / dist * f * 0.08;
        if (v[e.source]) { v[e.source].x -= fx; v[e.source].y -= fy; }
        if (v[e.target]) { v[e.target].x += fx; v[e.target].y += fy; }
      });

      // Center gravity
      nodes.forEach(n => {
        v[n.id].x += (width / 2 - p[n.id].x) * 0.005;
        v[n.id].y += (height / 2 - p[n.id].y) * 0.005;
        v[n.id].x *= 0.85; v[n.id].y *= 0.85;
        p[n.id].x = Math.max(30, Math.min(width - 30, p[n.id].x + v[n.id].x));
        p[n.id].y = Math.max(30, Math.min(height - 30, p[n.id].y + v[n.id].y));
      });

      if (iter % 20 === 0) setPositions({ ...p });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [nodes.length, edges.length, width, height]);

  return positions;
}

export default function NetworkGraph() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const W = 900, H = 560;

  useEffect(() => {
    api.getNetwork().then(setData).catch((e) => setError(e.message));
  }, []);

  const filteredNodes = data?.nodes.filter(n =>
    filterType === "all" ? true : filterType === "pep" ? n.pep : filterType === "companies" ? n.type === "company" : true
  ) || [];
  const nodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = data?.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target)) || [];

  const positions = useForceLayout(filteredNodes, filteredEdges, W, H);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading label="Building relationship network..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Relationship Network Graph</h2>
        <p className="text-slate-500 text-sm mt-1">Company–director–beneficial owner connections · Shared directors and subsidiary links highlighted</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {[["all","All"], ["companies","Companies only"], ["pep","PEP Persons only"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilterType(v)}
              className={`text-xs px-3 py-1.5 rounded-full border ${filterType === v ? "bg-indigo-600 text-white border-indigo-600" : "text-slate-600 border-slate-200 bg-white"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-4 text-xs text-slate-500 ml-auto flex-wrap">
          {Object.entries(EDGE_COLOR).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className="w-5 h-0.5 inline-block" style={{ backgroundColor: color }} />
              {type.replace("_"," ")}
            </span>
          ))}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-600 inline-block" /> PEP person</span>
        </div>
      </div>

      <Card className="p-2 overflow-hidden">
        <div className="relative bg-slate-50 rounded-lg overflow-hidden">
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: "560px" }}>
            {filteredEdges.map((e, i) => {
              const sp = positions[e.source], tp = positions[e.target];
              if (!sp || !tp) return null;
              return (
                <line key={i} x1={sp.x} y1={sp.y} x2={tp.x} y2={tp.y}
                  stroke={EDGE_COLOR[e.type] || "#94a3b8"}
                  strokeWidth={e.type === "shared_director" ? 2.5 : 1.5}
                  strokeDasharray={e.type === "subsidiary" ? "6 3" : undefined}
                  opacity={0.7}
                />
              );
            })}
            {filteredNodes.map((n) => {
              const p = positions[n.id];
              if (!p) return null;
              const isCompany = n.type === "company";
              const color = isCompany ? (RISK_COLORS[n.risk_level] || "#6366f1") : (n.pep ? "#dc2626" : "#64748b");
              const r = isCompany ? 20 : 12;
              const isHovered = hovered === n.id;
              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: "pointer" }}>
                  <circle r={r} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={isHovered ? 3 : 2} />
                  {isCompany
                    ? <text textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill={color}>B</text>
                    : <text textAnchor="middle" dominantBaseline="middle" fontSize="8" fill={color}>P</text>
                  }
                  <text textAnchor="middle" y={r + 12} fontSize="9" fill="#1e293b" fontWeight={isHovered ? "700" : "500"}>
                    {n.name.length > 16 ? n.name.slice(0, 14) + "…" : n.name}
                  </text>
                  {n.pep && <circle cx={r - 4} cy={-r + 4} r={5} fill="#dc2626" />}
                  {isHovered && (
                    <g>
                      <rect x={-80} y={-50} width={160} height={38} rx={4} fill="white" stroke="#e2e8f0" filter="url(#shadow)" />
                      <text x={0} y={-36} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">{n.name}</text>
                      <text x={0} y={-22} textAnchor="middle" fontSize="9" fill="#64748b">
                        {isCompany ? `${n.risk_level} risk · ${n.overall_score}` : `${n.role || ""} ${n.pep ? "· PEP" : ""}`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
            <defs>
              <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" /></filter>
            </defs>
          </svg>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ["Companies", data.stats.total_companies, "text-indigo-600"],
          ["Directors / Persons", data.stats.total_persons, "text-slate-600"],
          ["PEP-linked Persons", data.stats.pep_persons, "text-red-600"],
          ["Shared Director Links", data.stats.shared_director_links, "text-amber-600"],
        ].map(([label, value, cls]) => (
          <Card key={label}>
            <div className={`text-2xl font-bold ${cls}`}>{value}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
