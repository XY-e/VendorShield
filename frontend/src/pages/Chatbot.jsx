import { useState, useRef, useEffect } from "react";
import { api } from "../api/client";
import { Card } from "../components/Shared";
import CompanyPicker from "../components/CompanyPicker";
import { Send, Bot, User, Sparkles } from "lucide-react";

const SUGGESTIONS = [
  "Why is this company high risk?",
  "Summarize the recent issues.",
  "Which companies have known vulnerabilities?",
  "Are there any sanctions concerns?",
];

export default function Chatbot() {
  const [companyId, setCompanyId] = useState(null);
  const [scoped, setScoped] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Ask me anything about your vendor portfolio — e.g. \"Why is Nvidia high risk?\" I'll search across news, sanctions, cyber, and financial data to answer." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chat(question, scoped ? companyId : null);
      setMessages((m) => [...m, { role: "assistant", text: res.answer, sources: res.sources }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-96px)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI Chat Assistant</h2>
          <p className="text-slate-500 text-sm mt-1">RAG-powered Q&A over your risk knowledge base</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={scoped} onChange={(e) => setScoped(e.target.checked)} />
            Focus on one company
          </label>
          {scoped && <CompanyPicker value={companyId} onChange={setCompanyId} />}
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                m.role === "user" ? "bg-slate-200" : "bg-indigo-100"
              }`}>
                {m.role === "user" ? <User size={16} className="text-slate-600" /> : <Bot size={16} className="text-indigo-600" />}
              </div>
              <div className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"
              }`}>
                {m.text}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                    <Sparkles size={12} /> Sources: {m.sources.join(", ")}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <Bot size={16} className="text-indigo-600" />
              </div>
              <div className="bg-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-400">Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100">
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask a question about your vendors..."
              className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => send()}
              disabled={loading}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
