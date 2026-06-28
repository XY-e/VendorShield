import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CompanySearch from "./pages/CompanySearch";
import RiskBreakdown from "./pages/RiskBreakdown";
import NewsFeed from "./pages/NewsFeed";
import CyberExposure from "./pages/CyberExposure";
import Compliance from "./pages/Compliance";
import AIInsights from "./pages/AIInsights";
import HistoricalTrends from "./pages/HistoricalTrends";
import AlertCenter from "./pages/AlertCenter";
import Admin from "./pages/Admin";
import Chatbot from "./pages/Chatbot";
import SimilarCompanies from "./pages/SimilarCompanies";
import ScenarioSimulation from "./pages/ScenarioSimulation";
import RiskMap from "./pages/RiskMap";
import AMLDashboard from "./pages/AMLDashboard";
import FraudScore from "./pages/FraudScore";
import NetworkGraph from "./pages/NetworkGraph";
import CompareCompanies from "./pages/CompareCompanies";
import AgentMonitor from "./pages/AgentMonitor";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="search" element={<CompanySearch />} />
          <Route path="risk" element={<RiskBreakdown />} />
          <Route path="news" element={<NewsFeed />} />
          <Route path="cyber" element={<CyberExposure />} />
          <Route path="compliance" element={<Compliance />} />
          <Route path="insights" element={<AIInsights />} />
          <Route path="trends" element={<HistoricalTrends />} />
          <Route path="alerts" element={<AlertCenter />} />
          <Route path="chat" element={<Chatbot />} />
          <Route path="similar" element={<SimilarCompanies />} />
          <Route path="scenario" element={<ScenarioSimulation />} />
          <Route path="map" element={<RiskMap />} />
          <Route path="aml" element={<AMLDashboard />} />
          <Route path="fraud" element={<FraudScore />} />
          <Route path="network" element={<NetworkGraph />} />
          <Route path="compare" element={<CompareCompanies />} />
          <Route path="agent" element={<AgentMonitor />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
