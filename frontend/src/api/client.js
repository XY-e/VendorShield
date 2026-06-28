const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  return res;
}

export const api = {
  dashboardSummary: () => request("/api/dashboard/summary"),
  listCompanies: (q = "") => request(`/api/companies${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createCompany: (payload) =>
    request("/api/companies", { method: "POST", body: JSON.stringify(payload) }),
  getCompany: (id) => request(`/api/companies/${id}`),
  getProfile: (id) => request(`/api/companies/${id}/profile`),
  getRisk: (id) => request(`/api/companies/${id}/risk`),
  getNews: (id) => request(`/api/companies/${id}/news`),
  getGlobalNews: (limit = 50) => request(`/api/news/feed?limit=${limit}`),
  getCyber: (id) => request(`/api/companies/${id}/cyber`),
  getCompliance: (id) => request(`/api/companies/${id}/compliance`),
  getDomain: (id) => request(`/api/companies/${id}/domain`),
  getAIInsight: (id) => request(`/api/companies/${id}/ai-insight`),
  getHistory: (id) => request(`/api/companies/${id}/history`),
  listAlerts: (unreadOnly = false) => request(`/api/alerts${unreadOnly ? "?unread_only=true" : ""}`),
  markAlertRead: (id) => request(`/api/alerts/${id}/read`, { method: "POST" }),
  getWeights: () => request("/api/admin/weights"),
  updateWeights: (payload) =>
    request("/api/admin/weights", { method: "PUT", body: JSON.stringify(payload) }),
  reportUrl: (id) => `${BASE_URL}/api/companies/${id}/report.pdf`,

  chat: (question, companyId = null) =>
    request("/api/chat", { method: "POST", body: JSON.stringify({ question, company_id: companyId }) }),
  getSimilar: (id, topN = 5) => request(`/api/companies/${id}/similar?top_n=${topN}`),
  runScenario: (id, category, deltaPct) =>
    request(`/api/companies/${id}/scenario`, {
      method: "POST", body: JSON.stringify({ category, delta_pct: deltaPct }),
    }),
  getGeoRiskMap: () => request("/api/geo/risk-map"),

  getAML: (id) => request(`/api/companies/${id}/aml`),
  getAMLPortfolio: () => request("/api/aml/portfolio"),
  getFraudScore: (id) => request(`/api/companies/${id}/fraud-score`),
  getFraudPortfolio: () => request("/api/fraud/portfolio"),
  getNetwork: () => request("/api/network"),
  compareCompanies: (idA, idB) => request(`/api/compare?id_a=${idA}&id_b=${idB}`),
  getKYCChecklist: (id) => request(`/api/companies/${id}/kyc-checklist`),
  agentInvestigate: (id) => request(`/api/companies/${id}/agent-investigate`),
};

export const RISK_COLORS = {
  Low: "#16a34a",
  Medium: "#ca8a04",
  High: "#ea580c",
  Critical: "#dc2626",
};
