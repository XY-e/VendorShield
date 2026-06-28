import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Card, Loading, ErrorBox } from "../components/Shared";
import { ExternalLink } from "lucide-react";

const SENTIMENT_STYLE = {
  positive: "bg-green-50 text-green-700",
  neutral: "bg-slate-100 text-slate-600",
  negative: "bg-red-50 text-red-700",
};

export default function NewsFeed() {
  const [news, setNews] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.getGlobalNews(100).then(setNews).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!news) return <Loading label="Loading news..." />;

  const filtered = filter === "all" ? news : news.filter((n) => n.sentiment_label === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">News Feed</h2>
          <p className="text-slate-500 text-sm mt-1">Latest negative-news monitoring across all vendors</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="all">All sentiment</option>
          <option value="negative">Negative only</option>
          <option value="neutral">Neutral only</option>
          <option value="positive">Positive only</option>
        </select>
      </div>

      <Card>
        <div className="divide-y divide-slate-100">
          {filtered.map((n) => (
            <div key={n.id} className="py-3.5 flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-slate-800 text-sm">{n.title}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>{n.source}</span>
                  <span>·</span>
                  <span>{new Date(n.published_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span className="capitalize">{n.category}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${SENTIMENT_STYLE[n.sentiment_label]}`}>
                  {n.sentiment_label}
                </span>
                {n.url && (
                  <a href={n.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600">
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-sm text-slate-400 py-6 text-center">No articles match this filter.</div>}
        </div>
      </Card>
    </div>
  );
}
