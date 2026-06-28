import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api, RISK_COLORS } from "../api/client";
import { Card, Loading, ErrorBox, RiskBadge } from "../components/Shared";

export default function RiskMap() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getGeoRiskMap().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Loading label="Loading risk map..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Geographic Risk Map</h2>
        <p className="text-slate-500 text-sm mt-1">Average vendor risk by country</p>
      </div>

      <Card className="p-0 overflow-hidden">
        <MapContainer center={[15, 20]} zoom={2} minZoom={2} style={{ height: "480px", width: "100%" }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.map((d) => (
            <CircleMarker
              key={d.country}
              center={[d.lat, d.lng]}
              radius={10 + d.average_score / 5}
              pathOptions={{
                color: RISK_COLORS[d.risk_level],
                fillColor: RISK_COLORS[d.risk_level],
                fillOpacity: 0.55,
                weight: 2,
              }}
            >
              <Tooltip direction="top">
                <span className="font-medium">{d.country}</span> — avg {d.average_score} ({d.risk_level})
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold mb-1">{d.country}</div>
                  <div className="text-slate-500 mb-2">
                    Average score {d.average_score} · {d.company_count} vendor{d.company_count !== 1 ? "s" : ""}
                  </div>
                  <ul className="space-y-1">
                    {d.companies.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3">
                        <span>{c.name}</span>
                        <span className="text-xs font-medium" style={{ color: RISK_COLORS[c.risk_level] }}>
                          {c.overall}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </Card>

      <Card title="Country Risk Summary" className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-4">Country</th>
              <th className="py-2 pr-4">Vendors</th>
              <th className="py-2 pr-4">Average Score</th>
              <th className="py-2 pr-4">Risk Level</th>
            </tr>
          </thead>
          <tbody>
            {[...data].sort((a, b) => b.average_score - a.average_score).map((d) => (
              <tr key={d.country} className="border-b border-slate-100">
                <td className="py-2.5 pr-4 font-medium text-slate-800">{d.country}</td>
                <td className="py-2.5 pr-4 text-slate-500">{d.company_count}</td>
                <td className="py-2.5 pr-4">{d.average_score}</td>
                <td className="py-2.5 pr-4"><RiskBadge level={d.risk_level} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
