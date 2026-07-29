import { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Home,
  ListChecks,
  Inbox,
  BarChart3,
  ClipboardCheck,
  BookOpen,
  Settings as SettingsIcon,
  Search,
  Bell,
  MoreHorizontal,
  ChevronRight,
  Sparkles,
  Send,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Play,
  Target,
  Zap,
  ShieldCheck,
  FileText,
  Tag,
  CheckCircle2,
  XCircle,
  Save,
} from "lucide-react";

const TICKETS = [
  { id: "DD-01", category: "Discount Approval", text: "Can I approve a 22% discount on this $180K deal? Standard cap is 20%.", expected: "escalate" },
  { id: "DD-02", category: "Discount Approval", text: "What's my standard discount authority at my level for a 1-year deal?", expected: "auto_resolve" },
  { id: "DD-03", category: "Payment Terms", text: "Customer wants Net 60 instead of our standard Net 30 — can I offer that?", expected: "escalate" },
  { id: "DD-04", category: "Payment Terms", text: "What are our standard payment terms for enterprise deals?", expected: "auto_resolve" },
  { id: "DD-05", category: "Custom SLA", text: "Prospect is asking for a 99.99% uptime SLA with financial penalties. Can we commit to that?", expected: "escalate" },
  { id: "DD-06", category: "Multi-Year Ramp", text: "Can I structure a 3-year deal with a ramped discount — 15% Y1, 10% Y2, 5% Y3?", expected: "escalate" },
  { id: "DD-07", category: "Renewal Pricing", text: "What's the standard uplift percentage on renewals this fiscal year?", expected: "auto_resolve" },
  { id: "DD-08", category: "Churn Risk", text: "Customer is threatening to churn unless we match a competitor's price 30% below list. Can I approve that?", expected: "escalate" },
  { id: "DD-09", category: "Contract Redline", text: "Legal is asking why the customer struck our indemnification clause — can I just accept the redline to close this week?", expected: "escalate" },
  { id: "DD-10", category: "CPQ/Quoting", text: "My quote is showing the wrong list price for this SKU bundle — is that a known issue?", expected: "auto_resolve" },
  { id: "DD-11", category: "Partner Conflict", text: "Two reps both registered this deal through different partners — who gets credit?", expected: "escalate" },
  { id: "DD-12", category: "Free Trial", text: "Can I extend this customer's trial another 30 days past the standard 14?", expected: "auto_resolve" },
  { id: "DD-13", category: "Security Review", text: "Customer's security questionnaire is blocking close — can we skip it given the deal size?", expected: "escalate" },
  { id: "DD-14", category: "Co-Termination", text: "Can I co-term this new add-on to the customer's existing contract end date?", expected: "auto_resolve" },
  { id: "DD-15", category: "Mid-Term Downgrade", text: "Customer wants to downgrade seats mid-contract — what's our policy?", expected: "auto_resolve" },
  { id: "DD-16", category: "RFP Price Match", text: "Customer's RFP requires us to match a competitor's published government pricing — can I quote that?", expected: "escalate" },
  { id: "DD-17", category: "Discount Approval", text: "Need 22% discount", expected: "escalate" },
  { id: "DD-18", category: "Discount Approval", text: "I need a call ASAP. I'm about to lose a deal. I need an override.", expected: "escalate" },
];

const CATEGORY_COLORS = {
  "Discount Approval": "#F59E0B",
  "Payment Terms": "#2F6FED",
  "Custom SLA": "#2F6FED",
  "Multi-Year Ramp": "#2F6FED",
  "Renewal Pricing": "#F59E0B",
  "Churn Risk": "#F59E0B",
  "Contract Redline": "#EF4444",
  "CPQ/Quoting": "#10B981",
  "Partner Conflict": "#EC4899",
  "Free Trial": "#7C5CFC",
  "Security Review": "#EF4444",
  "Co-Termination": "#2F6FED",
  "Mid-Term Downgrade": "#2F6FED",
  "RFP Price Match": "#F59E0B",
};

const KNOWLEDGE_BASE = {
  escalate: [
    ["Discount authority", "Any discount request above the sales exec's standard approval threshold."],
    ["Payment terms", "Anything other than standard Net 30 (e.g. Net 60, milestone billing)."],
    ["Custom SLAs", "SLA commitments carrying financial penalties or non-standard uptime guarantees."],
    ["Non-standard structures", "Ramped, multi-year, or otherwise bespoke discount schedules."],
    ["Competitive/churn discounting", "Price-matching a competitor or retention discounting tied to churn risk."],
    ["Legal/contract redlines", "Any change to standard contract language (indemnification, liability, etc.)."],
    ["Security & compliance", "Requests to skip or shortcut security questionnaires or compliance review."],
    ["Comp/credit disputes", "Conflicts between reps or partners over deal credit."],
    ["Revenue-impacting amendments", "Mid-term downgrades or other changes that reduce contracted revenue."],
  ],
  autoResolve: [
    ["Policy lookups", "Standard discount authority, payment terms, or renewal uplift percentages."],
    ["Pre-approved ranges", "Trial extensions and similar actions within documented limits."],
    ["Documented CPQ processes", "Co-termination and other standard, tooling-supported actions."],
    ["Tooling/data issues", "Incorrect list prices or other CPQ display bugs, not policy exceptions."],
  ],
};

// The escalation policy prompt now lives server-side in pages/api/classify.js

async function classifyTicket(ticketId) {
  const response = await fetch("/api/classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticketId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || "Classification failed");
  }
  return data;
}

const NAV_ITEMS = [
  { key: "console", icon: Home, label: "Console" },
  { key: "queue", icon: Inbox, label: "Queue" },
  { key: "tickets", icon: ListChecks, label: "Tickets" },
  { key: "analytics", icon: BarChart3, label: "Analytics" },
  { key: "evaluations", icon: ClipboardCheck, label: "Evaluations" },
  { key: "knowledge", icon: BookOpen, label: "Knowledge" },
  { key: "settings", icon: SettingsIcon, label: "Settings" },
];

const PAGE_META = {
  console: { title: "deal-desk-agent", subtitle: "Live agent triaging sales exec deal questions and scoring itself against a held-out eval set" },
  queue: { title: "Deal question queue", subtitle: "Every question in the held-out eval set, filterable by status" },
  tickets: { title: "Tickets", subtitle: "Full data view of the eval set and the agent's live classifications" },
  analytics: { title: "Analytics", subtitle: "Category volume, accuracy trends, and per-category performance" },
  evaluations: { title: "Evaluations", subtitle: "Run history for the held-out eval set" },
  knowledge: { title: "Knowledge base", subtitle: "The escalation policy the agent is prompted to follow" },
  settings: { title: "Settings", subtitle: "Agent configuration for this demo" },
};

function Sparkline({ data, color }) {
  const points = data && data.length >= 2 ? data : [{ v: 0 }, { v: 0 }];
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace("#", "")})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MetricCard({ icon: Icon, label, value, color, sparkData }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #E6E9F2", borderRadius: 14, padding: "16px 18px", boxShadow: "0 1px 2px rgba(15,27,51,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}1A`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 13, color: "#5B6478", fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: "#0F1B33" }}>{value}</span>
      </div>
      <Sparkline data={sparkData} color={color} />
    </div>
  );
}

function RouteBadge({ route }) {
  const isResolve = route === "auto_resolve";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: isResolve ? "#E7F8F0" : "#FDECEC", color: isResolve ? "#0E9F6E" : "#E02424" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isResolve ? "#0E9F6E" : "#E02424" }} />
      {isResolve ? "Auto-resolve" : "Escalate"}
    </span>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E6E9F2", borderRadius: 14, padding: 20, marginBottom: 18 }}>
      {title && <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1B33", marginBottom: subtitle ? 3 : 12 }}>{title}</div>}
      {subtitle && <div style={{ fontSize: 12.5, color: "#9AA2B4", marginBottom: 14 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

export default function DealDeskConsole() {
  const [page, setPage] = useState("console");
  const [results, setResults] = useState({});
  const [activeId, setActiveId] = useState(TICKETS[0].id);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: TICKETS.length });
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("details");
  const [notes, setNotes] = useState({});
  const [sentIds, setSentIds] = useState({});
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);
  const [agentName, setAgentName] = useState("Deal Desk Triage Agent");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("eval-history");
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {}
    try {
      const savedSettings = localStorage.getItem("agent-settings");
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (typeof parsed.confidenceThreshold === "number") setConfidenceThreshold(parsed.confidenceThreshold);
        if (parsed.agentName) setAgentName(parsed.agentName);
      }
    } catch (e) {}
  }, []);

  async function runEval() {
    setRunning(true);
    setPage("console");
    setProgress({ done: 0, total: TICKETS.length });
    const newResults = {};

    for (let i = 0; i < TICKETS.length; i++) {
      const ticket = TICKETS[i];
      setActiveId(ticket.id);
      try {
        const start = performance.now();
        const result = await classifyTicket(ticket.id);
        const latencyMs = Math.round(performance.now() - start);
        newResults[ticket.id] = { ...result, latencyMs, error: null };
      } catch (e) {
        newResults[ticket.id] = { error: "Could not classify this question." };
      }
      setResults((prev) => ({ ...prev, [ticket.id]: newResults[ticket.id] }));
      setProgress({ done: i + 1, total: TICKETS.length });
    }

    const scored = TICKETS.map((t) => newResults[t.id]).filter((r) => r && !r.error);
    const correct = TICKETS.filter((t) => newResults[t.id]?.route === t.expected).length;
    const accuracy = scored.length ? correct / scored.length : 0;
    const automationRate = scored.length ? scored.filter((r) => r.route === "auto_resolve").length / scored.length : 0;
    const avgConfidence = scored.length ? scored.reduce((a, r) => a + (r.confidence || 0), 0) / scored.length : 0;
    const avgLatency = scored.length ? Math.round(scored.reduce((a, r) => a + (r.latencyMs || 0), 0) / scored.length) : 0;

    const run = { timestamp: new Date().toISOString(), accuracy, automationRate, avgConfidence, avgLatency };
    const updatedHistory = [run, ...history].slice(0, 10);
    setHistory(updatedHistory);
    try {
      localStorage.setItem("eval-history", JSON.stringify(updatedHistory));
    } catch (e) {}

    setRunning(false);
  }

  function saveSettings() {
    try {
      localStorage.setItem("agent-settings", JSON.stringify({ confidenceThreshold, agentName }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {}
  }

  const active = TICKETS.find((t) => t.id === activeId);
  const activeResult = results[activeId];
  const completedScored = TICKETS.filter((t) => results[t.id] && !results[t.id].error);

  const liveAccuracy = completedScored.length
    ? completedScored.filter((t) => results[t.id].route === t.expected).length / completedScored.length
    : 0;
  const liveAutomation = completedScored.length
    ? completedScored.filter((t) => results[t.id].route === "auto_resolve").length / completedScored.length
    : 0;
  const liveConfidence = completedScored.length
    ? completedScored.reduce((a, t) => a + (results[t.id].confidence || 0), 0) / completedScored.length
    : 0;

  const chronHistory = [...history].reverse();
  const sparkFor = (key, fallbackLen = 6) => {
    if (chronHistory.length >= 2) return chronHistory.map((h) => ({ v: h[key] }));
    return Array.from({ length: fallbackLen }, () => ({ v: 0 }));
  };

  const needsReviewIds = TICKETS.filter((t) => {
    const r = results[t.id];
    return r && !r.error && (r.confidence ?? 1) < confidenceThreshold;
  }).map((t) => t.id);
  const escalatedIds = TICKETS.filter((t) => results[t.id]?.route === "escalate").map((t) => t.id);

  const visibleTickets =
    filter === "needsReview" ? TICKETS.filter((t) => needsReviewIds.includes(t.id)) : filter === "escalated" ? TICKETS.filter((t) => escalatedIds.includes(t.id)) : TICKETS;

  const categoryData = useMemo(() => {
    const counts = {};
    TICKETS.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count, color: CATEGORY_COLORS[name] }));
  }, []);

  const categoryAccuracyData = useMemo(() => {
    const byCat = {};
    TICKETS.forEach((t) => {
      if (!byCat[t.category]) byCat[t.category] = { total: 0, correct: 0 };
      const r = results[t.id];
      if (r && !r.error) {
        byCat[t.category].total += 1;
        if (r.route === t.expected) byCat[t.category].correct += 1;
      }
    });
    return Object.entries(byCat)
      .filter(([, v]) => v.total > 0)
      .map(([name, v]) => ({ name, accuracy: Math.round((v.correct / v.total) * 100), color: CATEGORY_COLORS[name] }));
  }, [results]);

  const trendData = chronHistory.map((h, i) => ({ run: `Run ${i + 1}`, Accuracy: Math.round(h.accuracy * 100), Automation: Math.round(h.automationRate * 100) }));

  const meta = PAGE_META[page];

  // Reusable full-width queue row list (used on Console + Queue)
  function QueueList({ onRowClick }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visibleTickets.map((t) => {
          const r = results[t.id];
          const isActive = t.id === activeId;
          const isProcessing = running && isActive && !r;
          return (
            <div
              key={t.id}
              className="row"
              tabIndex={0}
              onClick={() => onRowClick(t.id)}
              onKeyDown={(e) => e.key === "Enter" && onRowClick(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #EEF0F6",
                borderLeft: `3px solid ${CATEGORY_COLORS[t.category]}`,
                background: isActive ? "#F4F7FF" : "#fff",
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#2F6FED", fontWeight: 600, minWidth: 52 }}>{t.id}</span>
              <span style={{ fontSize: 12, color: "#7A8399", minWidth: 140 }}>{t.category}</span>
              <span style={{ flex: 1, fontSize: 13.5, color: "#3A4256" }}>{t.text}</span>
              {isProcessing ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#2F6FED" }}>
                  <span className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#2F6FED" }} />
                  Classifying…
                </span>
              ) : r && !r.error ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <RouteBadge route={r.route} />
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.route === t.expected ? "#10B981" : "#EF4444" }} title={r.route === t.expected ? "matched expected route" : "diverged from expected"} />
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "#C7CCDA" }}>Not yet run</span>
              )}
              <ChevronRight size={14} color="#C7CCDA" />
            </div>
          );
        })}
      </div>
    );
  }

  function QueueFilters() {
    return (
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {[
          { key: "all", label: "All", count: TICKETS.length },
          { key: "needsReview", label: "Needs review", count: needsReviewIds.length },
          { key: "escalated", label: "Escalated", count: escalatedIds.length },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ fontSize: 12, fontWeight: 600, padding: "6px 10px", borderRadius: 8, border: filter === f.key ? "1px solid #2F6FED" : "1px solid #E6E9F2", background: filter === f.key ? "#EAF1FF" : "#fff", color: filter === f.key ? "#2F6FED" : "#7A8399", cursor: "pointer" }}>
            {f.label} {f.count > 0 && <span style={{ opacity: 0.7 }}>{f.count}</span>}
          </button>
        ))}
      </div>
    );
  }

  const runButton = (
    <button onClick={runEval} disabled={running} style={{ display: "flex", alignItems: "center", gap: 8, background: running ? "#C7D2E8" : "#2F6FED", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: running ? "default" : "pointer", whiteSpace: "nowrap" }}>
      <Play size={14} />
      {running ? `Running ${progress.done}/${progress.total}…` : "Run evaluation"}
    </button>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#F4F6FB", minHeight: "100vh", display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        button:focus-visible, .row:focus-visible, .tabbtn:focus-visible, .navitem:focus-visible { outline: 2px solid #2F6FED; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
        .row { cursor: pointer; transition: background 0.15s ease; }
        .row:hover { background: #F4F6FB !important; }
        .navitem { transition: background 0.15s ease, color 0.15s ease; cursor: pointer; }
        .navitem:hover { background: rgba(255,255,255,0.08); }
        .tabbtn { cursor: pointer; transition: color 0.15s ease; background: none; border: none; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #D8DCE8; border-radius: 4px; }
        @keyframes pulseDot { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        .live-dot { animation: pulseDot 1.4s ease-in-out infinite; }
        @keyframes stepIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .step-enter { animation: stepIn 0.35s ease both; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .analytics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        table.dd-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        table.dd-table th { text-align: left; font-size: 11px; color: #9AA2B4; letter-spacing: 0.04em; padding: 8px 10px; border-bottom: 1px solid #EEF0F6; }
        table.dd-table td { padding: 10px 10px; border-bottom: 1px solid #F4F6FB; color: #3A4256; vertical-align: top; }
        table.dd-table tr:last-child td { border-bottom: none; }
        input[type="range"] { accent-color: #2F6FED; }
        @media (max-width: 900px) {
          .metrics-grid { grid-template-columns: repeat(2, 1fr); }
          .analytics-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: 84, background: "linear-gradient(180deg, #0B1E45 0%, #142C5E 100%)", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "#2F6FED", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28 }}>
          <Sparkles size={20} color="#fff" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, width: "100%", alignItems: "center" }}>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.key}
              className="navitem"
              title={item.label}
              onClick={() => setPage(item.key)}
              style={{
                width: 56,
                padding: "9px 0",
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                background: page === item.key ? "#2F6FED" : "transparent",
                color: page === item.key ? "#fff" : "#8DA0CC",
              }}
            >
              <item.icon size={17} />
              <span style={{ fontSize: 9.5, fontWeight: 500 }}>{item.label}</span>
            </div>
          ))}
        </div>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2F6FED", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>
          JN
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "24px 28px 60px", minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginBottom: 22 }}>
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, margin: 0, color: "#0F1B33" }}>{meta.title}</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#7A8399" }}>{meta.subtitle}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E6E9F2", borderRadius: 10, padding: "8px 12px", color: "#9AA2B4", fontSize: 13 }}>
              <Search size={15} />
              <span>Search deal questions…</span>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", border: "1px solid #E6E9F2", display: "flex", alignItems: "center", justifyContent: "center", color: "#5B6478" }}>
              <Bell size={16} />
            </div>
            {/* Run evaluation button, top-right */}
            {runButton}
          </div>
        </div>

        {/* ===================== CONSOLE PAGE ===================== */}
        {page === "console" && (
          <>
            {/* Agent trace */}
            <div style={{ background: "#fff", border: "1px solid #E6E9F2", borderRadius: 16, padding: 22, marginBottom: 20, boxShadow: "0 1px 2px rgba(15,27,51,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#2F6FED", letterSpacing: "0.06em" }}>AGENT TRACE</span>
                  <span style={{ color: "#C7CCDA" }}>•</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#7A8399" }}>{active.id}</span>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: running ? "#2F6FED" : "#10B981", background: running ? "#EAF1FF" : "#E7F8F0", padding: "4px 10px", borderRadius: 999 }}>
                  <span className={running ? "live-dot" : ""} style={{ width: 6, height: 6, borderRadius: "50%", background: running ? "#2F6FED" : "#10B981" }} />
                  {running ? `Running ${progress.done}/${progress.total}` : "Idle"}
                </span>
              </div>
              <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 600, color: "#0F1B33", margin: 0, lineHeight: 1.4 }}>"{active.text}"</p>
            </div>

            {/* Metrics */}
            <div className="metrics-grid" style={{ marginBottom: 20 }}>
              <MetricCard icon={Target} label="Accuracy vs. labeled set" value={`${Math.round(liveAccuracy * 100)}%`} color="#10B981" sparkData={sparkFor("accuracy")} />
              <MetricCard icon={Zap} label="Automation rate" value={`${Math.round(liveAutomation * 100)}%`} color="#F59E0B" sparkData={sparkFor("automationRate")} />
              <MetricCard icon={ShieldCheck} label="Avg. confidence" value={liveConfidence.toFixed(2)} color="#7C5CFC" sparkData={sparkFor("avgConfidence")} />
              <MetricCard icon={FileText} label="Questions scored" value={`${completedScored.length}/${TICKETS.length}`} color="#2F6FED" sparkData={[{ v: 0 }, { v: completedScored.length }]} />
            </div>

            {/* Full-width live queue — the centerpiece */}
            <div style={{ background: "#fff", border: "1px solid #E6E9F2", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0F1B33", marginBottom: 3 }}>Deal question queue</div>
              <div style={{ fontSize: 12.5, color: "#9AA2B4", marginBottom: 14 }}>Watch each question get classified live as the evaluation runs</div>
              <QueueFilters />
              <QueueList onRowClick={(id) => { setActiveId(id); setTab("details"); }} />
            </div>

            {/* Detail panel (below the queue) */}
            <div style={{ background: "#fff", border: "1px solid #E6E9F2", borderRadius: 14, padding: 18, marginBottom: 22, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#0F1B33" }}>{active.id}</span>
                <MoreHorizontal size={16} color="#C7CCDA" />
              </div>

              <div style={{ display: "flex", gap: 18, borderBottom: "1px solid #EEF0F6", marginBottom: 16 }}>
                {["details", "trace", "history", "notes"].map((key) => (
                  <button key={key} className="tabbtn" onClick={() => setTab(key)} style={{ paddingBottom: 10, fontSize: 13, fontWeight: 600, textTransform: "capitalize", color: tab === key ? "#2F6FED" : "#9AA2B4", borderBottom: tab === key ? "2px solid #2F6FED" : "2px solid transparent" }}>
                    {key}
                  </button>
                ))}
              </div>

              {!activeResult && !running && tab !== "history" && <div style={{ color: "#9AA2B4", fontSize: 14, padding: "20px 0" }}>Run the eval set to see this question classified live.</div>}
              {!activeResult && running && tab !== "history" && <div style={{ color: "#2F6FED", fontSize: 14, padding: "20px 0" }}>Classifying…</div>}
              {activeResult?.error && tab !== "history" && <div style={{ color: "#EF4444", fontSize: 14 }}>{activeResult.error}</div>}

              {activeResult && !activeResult.error && tab === "details" && (
                <div className="step-enter">
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7A8399", letterSpacing: "0.05em", marginBottom: 8 }}>CLASSIFICATION</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8F9FC", borderRadius: 10, padding: 12, marginBottom: 14 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: "#EAF1FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Tag size={16} color="#2F6FED" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0F1B33" }}>{activeResult.intent}</div>
                    </div>
                    <RouteBadge route={activeResult.route} />
                    <span style={{ fontSize: 12, color: "#7A8399", fontWeight: 600 }}>{Math.round((activeResult.confidence || 0) * 100)}%</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7A8399", letterSpacing: "0.05em", marginBottom: 6 }}>REASONING</div>
                  <p style={{ fontSize: 13.5, color: "#4A5266", lineHeight: 1.5, marginTop: 0, marginBottom: 16 }}>{activeResult.reasoning}</p>

                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Pencil size={12} color="#7A8399" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#7A8399", letterSpacing: "0.05em" }}>SUGGESTED GUIDANCE DRAFT</span>
                  </div>
                  <div style={{ background: "#F8F9FC", border: "1px solid #EEF0F6", borderRadius: 10, padding: 14, fontSize: 13.5, color: "#3A4256", lineHeight: 1.6, marginBottom: 14 }}>{activeResult.draft_response}</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => setSentIds((p) => ({ ...p, [active.id]: true }))}
                      style={{ display: "flex", alignItems: "center", gap: 7, background: sentIds[active.id] ? "#E7F8F0" : "#2F6FED", color: sentIds[active.id] ? "#0E9F6E" : "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      <Send size={13} />
                      {sentIds[active.id] ? "Sent" : "Send guidance"}
                    </button>
                    <button style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #E6E9F2", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <ThumbsUp size={13} color="#7A8399" />
                    </button>
                    <button style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid #E6E9F2", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <ThumbsDown size={13} color="#7A8399" />
                    </button>
                  </div>
                </div>
              )}

              {activeResult && !activeResult.error && tab === "trace" && (
                <div className="step-enter" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    ["01", "Intent", activeResult.intent],
                    ["02", "Confidence", `${Math.round((activeResult.confidence || 0) * 100)}%`],
                    ["03", "Route", activeResult.route === "auto_resolve" ? "Auto-resolve" : "Escalate"],
                    ["04", "Reasoning", activeResult.reasoning],
                    ["05", "Latency", `${activeResult.latencyMs}ms`],
                  ].map(([n, label, val]) => (
                    <div key={n} style={{ display: "flex", gap: 14 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#C7CCDA", minWidth: 18 }}>{n}</span>
                      <div>
                        <div style={{ fontSize: 11, color: "#9AA2B4", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13.5, color: "#0F1B33" }}>{val}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "history" && (
                <div className="step-enter">
                  {history.length === 0 ? (
                    <div style={{ color: "#9AA2B4", fontSize: 14, padding: "20px 0" }}>No past eval runs yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {history.map((h, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "8px 10px", background: "#F8F9FC", borderRadius: 8, color: "#4A5266" }}>
                          <span>{new Date(h.timestamp).toLocaleString()}</span>
                          <span>acc {Math.round(h.accuracy * 100)}%</span>
                          <span>auto {Math.round(h.automationRate * 100)}%</span>
                          <span>{h.avgLatency}ms</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "notes" && (
                <textarea
                  value={notes[active.id] || ""}
                  onChange={(e) => setNotes((p) => ({ ...p, [active.id]: e.target.value }))}
                  placeholder="Add a note about this deal question…"
                  style={{ width: "100%", minHeight: 140, border: "1px solid #E6E9F2", borderRadius: 10, padding: 12, fontSize: 13.5, fontFamily: "inherit", color: "#0F1B33", resize: "vertical" }}
                />
              )}
            </div>

            {/* Analytics */}
            <div className="analytics-grid" style={{ marginBottom: 22 }}>
              <div style={{ background: "#fff", border: "1px solid #E6E9F2", borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1B33", marginBottom: 4 }}>Question volume by category</div>
                <div style={{ fontSize: 12, color: "#9AA2B4", marginBottom: 10 }}>Across the held-out eval set</div>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={categoryData} margin={{ top: 4, right: 4, left: -20, bottom: 40 }}>
                    <CartesianGrid vertical={false} stroke="#EEF0F6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9AA2B4" }} axisLine={{ stroke: "#EEF0F6" }} tickLine={false} angle={-35} textAnchor="end" height={60} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: "#9AA2B4" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "#F4F6FB" }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E6E9F2" }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {categoryData.map((c, i) => (
                        <Cell key={i} fill={c.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: "#fff", border: "1px solid #E6E9F2", borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0F1B33", marginBottom: 4 }}>Accuracy &amp; automation over time</div>
                <div style={{ fontSize: 12, color: "#9AA2B4", marginBottom: 10 }}>Across saved eval runs</div>
                {trendData.length === 0 ? (
                  <div style={{ color: "#9AA2B4", fontSize: 13, padding: "40px 0", textAlign: "center" }}>Run the eval set to start a trend.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EEF0F6" />
                      <XAxis dataKey="run" tick={{ fontSize: 11, fill: "#9AA2B4" }} axisLine={{ stroke: "#EEF0F6" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#9AA2B4" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E6E9F2" }} />
                      <Line type="monotone" dataKey="Accuracy" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Automation" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {/* ===================== QUEUE PAGE ===================== */}
        {page === "queue" && (
          <SectionCard>
            <QueueFilters />
            <QueueList onRowClick={(id) => { setActiveId(id); setTab("details"); setPage("console"); }} />
          </SectionCard>
        )}

        {/* ===================== TICKETS (TABLE) PAGE ===================== */}
        {page === "tickets" && (
          <SectionCard title="All questions" subtitle="Expected labels vs. the agent's live classifications">
            <div style={{ overflowX: "auto" }}>
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Category</th>
                    <th>Question</th>
                    <th>Expected</th>
                    <th>Agent route</th>
                    <th>Confidence</th>
                    <th>Match</th>
                  </tr>
                </thead>
                <tbody>
                  {TICKETS.map((t) => {
                    const r = results[t.id];
                    const matched = r && !r.error ? r.route === t.expected : null;
                    return (
                      <tr key={t.id}>
                        <td style={{ fontFamily: "'JetBrains Mono', monospace", color: "#2F6FED", fontWeight: 600 }}>{t.id}</td>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: CATEGORY_COLORS[t.category] }} />
                            {t.category}
                          </span>
                        </td>
                        <td style={{ maxWidth: 360 }}>{t.text}</td>
                        <td><RouteBadge route={t.expected} /></td>
                        <td>{r && !r.error ? <RouteBadge route={r.route} /> : <span style={{ color: "#C7CCDA" }}>—</span>}</td>
                        <td>{r && !r.error ? `${Math.round((r.confidence || 0) * 100)}%` : "—"}</td>
                        <td>
                          {matched === null ? (
                            <span style={{ color: "#C7CCDA" }}>—</span>
                          ) : matched ? (
                            <CheckCircle2 size={16} color="#10B981" />
                          ) : (
                            <XCircle size={16} color="#EF4444" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ===================== ANALYTICS PAGE ===================== */}
        {page === "analytics" && (
          <>
            <SectionCard title="Question volume by category" subtitle="Across the held-out eval set">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryData} margin={{ top: 4, right: 4, left: -20, bottom: 50 }}>
                  <CartesianGrid vertical={false} stroke="#EEF0F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9AA2B4" }} axisLine={{ stroke: "#EEF0F6" }} tickLine={false} angle={-35} textAnchor="end" height={70} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "#9AA2B4" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#F4F6FB" }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E6E9F2" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {categoryData.map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <SectionCard title="Accuracy & automation over time" subtitle="Across saved eval runs">
              {trendData.length === 0 ? (
                <div style={{ color: "#9AA2B4", fontSize: 13, padding: "40px 0", textAlign: "center" }}>Run the eval set to start a trend.</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#EEF0F6" />
                    <XAxis dataKey="run" tick={{ fontSize: 11, fill: "#9AA2B4" }} axisLine={{ stroke: "#EEF0F6" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9AA2B4" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E6E9F2" }} />
                    <Line type="monotone" dataKey="Accuracy" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Automation" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            <SectionCard title="Accuracy by category" subtitle="Only categories with at least one scored question">
              {categoryAccuracyData.length === 0 ? (
                <div style={{ color: "#9AA2B4", fontSize: 13, padding: "40px 0", textAlign: "center" }}>Run the eval set to see per-category accuracy.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={categoryAccuracyData} margin={{ top: 4, right: 4, left: -20, bottom: 50 }}>
                    <CartesianGrid vertical={false} stroke="#EEF0F6" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9AA2B4" }} axisLine={{ stroke: "#EEF0F6" }} tickLine={false} angle={-35} textAnchor="end" height={70} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: "#9AA2B4" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: "#F4F6FB" }} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E6E9F2" }} />
                    <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
                      {categoryAccuracyData.map((c, i) => (
                        <Cell key={i} fill={c.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </>
        )}

        {/* ===================== EVALUATIONS PAGE ===================== */}
        {page === "evaluations" && (
          <>
            <div className="metrics-grid" style={{ marginBottom: 18 }}>
              <MetricCard icon={Target} label="Latest accuracy" value={history.length ? `${Math.round(history[0].accuracy * 100)}%` : "—"} color="#10B981" sparkData={sparkFor("accuracy")} />
              <MetricCard icon={Zap} label="Latest automation" value={history.length ? `${Math.round(history[0].automationRate * 100)}%` : "—"} color="#F59E0B" sparkData={sparkFor("automationRate")} />
              <MetricCard icon={ShieldCheck} label="Latest avg. confidence" value={history.length ? history[0].avgConfidence.toFixed(2) : "—"} color="#7C5CFC" sparkData={sparkFor("avgConfidence")} />
              <MetricCard icon={FileText} label="Runs saved" value={history.length} color="#2F6FED" sparkData={[{ v: 0 }, { v: history.length }]} />
            </div>
            <SectionCard title="Run history" subtitle="Last 10 eval runs, most recent first">
              {history.length === 0 ? (
                <div style={{ color: "#9AA2B4", fontSize: 14, padding: "10px 0" }}>No past eval runs yet — run the eval set to start building history.</div>
              ) : (
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Accuracy</th>
                      <th>Automation rate</th>
                      <th>Avg. confidence</th>
                      <th>Avg. latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>{new Date(h.timestamp).toLocaleString()}</td>
                        <td>{Math.round(h.accuracy * 100)}%</td>
                        <td>{Math.round(h.automationRate * 100)}%</td>
                        <td>{h.avgConfidence.toFixed(2)}</td>
                        <td>{h.avgLatency}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
          </>
        )}

        {/* ===================== KNOWLEDGE PAGE ===================== */}
        {page === "knowledge" && (
          <>
            <SectionCard title="Escalate to deal desk / finance / legal" subtitle="The agent routes these to a human reviewer">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {KNOWLEDGE_BASE.escalate.map(([title, desc], i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < KNOWLEDGE_BASE.escalate.length - 1 ? "1px solid #F4F6FB" : "none" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#EF4444", marginTop: 6, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F1B33" }}>{title}</div>
                      <div style={{ fontSize: 13, color: "#7A8399", marginTop: 2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Auto-resolve" subtitle="The agent handles these with a documented policy answer">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {KNOWLEDGE_BASE.autoResolve.map(([title, desc], i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < KNOWLEDGE_BASE.autoResolve.length - 1 ? "1px solid #F4F6FB" : "none" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", marginTop: 6, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0F1B33" }}>{title}</div>
                      <div style={{ fontSize: 13, color: "#7A8399", marginTop: 2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        )}

        {/* ===================== SETTINGS PAGE ===================== */}
        {page === "settings" && (
          <SectionCard title="Agent configuration" subtitle="These settings actually affect the console — try lowering the threshold and re-running the eval">
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#3A4256", display: "block", marginBottom: 6 }}>Agent name</label>
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                style={{ width: "100%", maxWidth: 360, border: "1px solid #E6E9F2", borderRadius: 9, padding: "9px 12px", fontSize: 13.5, fontFamily: "inherit", color: "#0F1B33" }}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#3A4256", display: "block", marginBottom: 6 }}>
                "Needs review" confidence threshold — {Math.round(confidenceThreshold * 100)}%
              </label>
              <div style={{ fontSize: 12, color: "#9AA2B4", marginBottom: 8 }}>
                Questions the agent answers below this confidence get flagged in the Queue's "Needs review" filter.
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                style={{ width: "100%", maxWidth: 360 }}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: "#3A4256", display: "block", marginBottom: 6 }}>Model</label>
              <select disabled style={{ width: "100%", maxWidth: 360, border: "1px solid #E6E9F2", borderRadius: 9, padding: "9px 12px", fontSize: 13.5, color: "#7A8399", background: "#F8F9FC" }}>
                <option>Claude Sonnet 4.6</option>
              </select>
            </div>

            <button
              onClick={saveSettings}
              style={{ display: "flex", alignItems: "center", gap: 8, background: savedFlash ? "#E7F8F0" : "#2F6FED", color: savedFlash ? "#0E9F6E" : "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}
            >
              <Save size={14} />
              {savedFlash ? "Saved" : "Save settings"}
            </button>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
