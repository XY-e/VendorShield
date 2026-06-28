import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Loading, ErrorBox } from "../components/Shared";
import { Save } from "lucide-react";

const LABELS = {
  compliance: "Compliance Risk", cyber: "Cyber Risk", news: "News Risk",
  financial: "Financial Risk", esg: "ESG Risk", domain: "Domain Reputation", social: "Social Sentiment",
};

export default function Admin() {
  const [weights, setWeights] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getWeights().then(setWeights).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!weights) return <Loading label="Loading settings..." />;

  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  const update = (key, value) => {
    setSaved(false);
    setWeights({ ...weights, [key]: Number(value) });
  };

  const save = async () => {
    try {
      const updated = await api.updateWeights(weights);
      setWeights(updated);
      setSaved(true);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Admin Settings</h2>
        <p className="text-slate-500 text-sm mt-1">Tune the weights used in the risk scoring formula</p>
      </div>

      <Card title="Risk Category Weights">
        <div className="space-y-5">
          {Object.keys(LABELS).map((key) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">{LABELS[key]}</label>
                <span className="text-sm text-slate-500">{(weights[key] * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={weights[key]}
                onChange={(e) => update(key, e.target.value)}
                className="w-full accent-indigo-600"
              />
            </div>
          ))}

          <div className={`text-sm font-medium ${Math.abs(total - 1) > 0.01 ? "text-red-600" : "text-green-600"}`}>
            Total: {(total * 100).toFixed(0)}% {Math.abs(total - 1) > 0.01 && "(must equal 100%)"}
          </div>

          <button
            onClick={save}
            disabled={Math.abs(total - 1) > 0.01}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={16} /> Save Weights
          </button>
          {saved && <span className="ml-3 text-sm text-green-600">Saved!</span>}
        </div>
      </Card>
    </div>
  );
}
