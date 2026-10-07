import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInstance } from "../Services/instance";
import {
  Globe,
  Settings,
  Play,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Info,
  Clock,
  Layers,
  Zap,
  Activity,
  ChevronRight,
} from "lucide-react";
import SectionHeader from "./common/SectionHeader";

/* ── Step progress indicator ── */
const STEPS = [
  { id: "pending", label: "Initialize" },
  { id: "crawling", label: "Crawl" },
  { id: "analyzing", label: "Analyze" },
  { id: "completed", label: "Done" },
];

function Stepper({ auditStatus }) {
  const order = ["idle", "pending", "crawling", "analyzing", "completed"];
  const currentIdx = order.indexOf(auditStatus);
  const isFailed = auditStatus === "failed" || auditStatus === "cancelled";

  return (
    <div className="wi-stepper">
      {STEPS.map((step, idx) => {
        const stepIdx = order.indexOf(step.id);
        let state = "waiting";
        if (isFailed) state = "waiting";
        else if (currentIdx > stepIdx) state = "done";
        else if (currentIdx === stepIdx) state = "active";

        return (
          <div key={step.id} className={`wi-step ${state}`}>
            <div className="wi-step-dot">
              {state === "done" ? <CheckCircle size={12} /> : idx + 1}
            </div>
            <div className="wi-step-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function WebsiteAnalyzeForm() {
  const navigate = useNavigate();
  const terminalEndRef = useRef(null);
  const { jobIdParam } = useParams();

  useEffect(() => {
    if (jobIdParam) {
      setJobId(jobIdParam);
      setAuditStatus("crawling");
      setLogs([{ message: "Resuming live scan monitor...", level: "info", timestamp: new Date().toISOString() }]);

      const fetchInitialInfo = async () => {
        try {
          const res = await portalInstance.get(`/web/crawler/status/${jobIdParam}`);
          if (res.data?.success) {
            setAuditStatus(res.data.status);
            setLogs(res.data.logs || []);
            setTotalPagesScanned(res.data.totalPagesScanned || 0);
          }
        } catch (err) {
          console.error("Error fetching initial status:", err);
        }
      };
      fetchInitialInfo();
    }
  }, [jobIdParam]);

  const [url, setUrl] = useState("");
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(25);
  const [concurrency, setConcurrency] = useState(2);
  const [timeout, setTimeoutVal] = useState(30);

  const [jobId, setJobId] = useState(null);
  const [auditStatus, setAuditStatus] = useState("idle");
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [totalPagesScanned, setTotalPagesScanned] = useState(0);

  const scrollToBottom = () => terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scrollToBottom(); }, [logs]);

  useEffect(() => {
    if (!jobId || ["completed", "failed", "cancelled"].includes(auditStatus)) return;
    const interval = setInterval(async () => {
      try {
        const res = await portalInstance.get(`/web/crawler/status/${jobId}`);
        if (res.data?.success) {
          setAuditStatus(res.data.status);
          setLogs(res.data.logs || []);
          setTotalPagesScanned(res.data.totalPagesScanned || 0);
          if (res.data.status === "completed") {
            clearInterval(interval);
          } else if (res.data.status === "failed" || res.data.status === "cancelled") {
            clearInterval(interval);
            setError(res.data.error || (res.data.status === "cancelled" ? "Crawl cancelled by user." : "Crawl job failed unexpectedly."));
          }
        }
      } catch (err) {
        console.error("Error polling crawl status:", err);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [jobId, auditStatus]);

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      const res = await portalInstance.delete(`/web/crawler/crawl/${jobId}`);
      if (res.data?.success) {
        setAuditStatus("cancelled");
        setError("Crawl cancelled by user.");
        setLogs(prev => [
          ...prev,
          {
            message: "Crawl cancelled by user.",
            level: "warn",
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        setError(res.data?.message || "Failed to cancel crawl.");
      }
    } catch (err) {
      console.error("Cancel crawl error:", err);
      setError(err.response?.data?.message || err.message || "Error cancelling crawl.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    setError(null);
    setLogs([]);
    setJobId(null);
    setTotalPagesScanned(0);
    setAuditStatus("pending");

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = "https://" + targetUrl;

    try {
      const res = await portalInstance.post("/web/crawler/crawl", {
        url: targetUrl,
        maxDepth,
        maxPages,
        concurrency,
        timeout: timeout * 1000,
      });

      if (res.data?.success) {
        setJobId(res.data.jobId);
        setAuditStatus("crawling");
        setLogs([{ message: "Crawl job initialized successfully.", level: "info", timestamp: new Date().toISOString() }]);
      } else {
        setError(res.data?.message || "Failed to trigger backend crawling.");
        setAuditStatus("failed");
      }
    } catch (err) {
      console.error("Submit crawl error:", err);
      setError(err.response?.data?.message || err.message || "Network error launching crawl job.");
      setAuditStatus("failed");
    }
  };

  const isIdle = ["idle", "completed", "failed", "cancelled"].includes(auditStatus);
  const isRunning = !isIdle && auditStatus !== "idle";

  const logLevelClass = (level) => {
    if (level === "warn") return "wi-log-warn";
    if (level === "error") return "wi-log-error";
    return "wi-log-info";
  };

  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      {/* Page header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <button
          className="wi-btn wi-btn-secondary"
          onClick={() => navigate("/")}
          style={{ marginBottom: "1rem" }}
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>

        <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--wi-text-primary)", margin: 0, letterSpacing: "-0.3px" }}>
          New Compliance Scan
        </h1>
        <p style={{ color: "var(--wi-text-muted)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
          Configure and launch a website intelligence audit
        </p>
      </div>

      <div className="row g-3" style={{ margin: 0, maxWidth: "100%" }}>
        {/* ─── Settings Panel ─── */}
        <div className="col-12" style={{ padding: 0 }}>
          <div className="wi-card" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
            <SectionHeader
              icon={Settings}
              title="Scan Parameters"
              description="Configure the audit depth and speed"
            />

            <form onSubmit={handleSubmit}>
              {/* URL input */}
              <div style={{ marginBottom: "1.25rem" }}>
                <label className="wi-form-label">
                  <Globe size={13} />
                  Target URL / Domain
                </label>
                <div className="wi-input-group">
                  <div className="wi-input-group-icon">
                    <Globe size={15} />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. website url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    disabled={!isIdle}
                    required
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", color: "var(--wi-text-muted)", marginTop: 6 }}>
                  <Info size={11} />
                  Crawler restricts sweeps to internal pages of the seed domain.
                </div>
              </div>

              {/* Parameters Grid */}
              <div className="row g-3 mb-4">
                <div className="col-6">
                  <label className="wi-form-label">
                    <Layers size={13} />
                    Crawl Depth
                  </label>
                  <select
                    className="wi-input"
                    value={maxDepth}
                    onChange={e => setMaxDepth(Number(e.target.value))}
                    disabled={!isIdle}
                  >
                    <option value={1}>1 — Homepage</option>
                    <option value={2}>2 — Standard</option>
                    <option value={3}>3 — Deep Audit</option>
                    <option value={4}>4 — Full Sweep</option>
                  </select>
                </div>

                <div className="col-6">
                  <label className="wi-form-label">
                    <Globe size={13} />
                    Max Pages
                  </label>
                  <input
                    type="number"
                    className="wi-input"
                    min={5}
                    max={100}
                    value={maxPages}
                    onChange={e => setMaxPages(Number(e.target.value))}
                    disabled={!isIdle}
                  />
                </div>

                <div className="col-6">
                  <label className="wi-form-label">
                    <Zap size={13} />
                    Concurrency
                  </label>
                  <select
                    className="wi-input"
                    value={concurrency}
                    onChange={e => setConcurrency(Number(e.target.value))}
                    disabled={!isIdle}
                  >
                    <option value={1}>1 — Conservative</option>
                    <option value={2}>2 — Optimal</option>
                    <option value={3}>3 — Fast</option>
                    <option value={4}>4 — Aggressive</option>
                  </select>
                </div>

                <div className="col-6">
                  <label className="wi-form-label">
                    <Clock size={13} />
                    Page Timeout
                  </label>
                  <select
                    className="wi-input"
                    value={timeout}
                    onChange={e => setTimeoutVal(Number(e.target.value))}
                    disabled={!isIdle}
                  >
                    <option value={10}>10 seconds</option>
                    <option value={20}>20 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={45}>45 seconds</option>
                    <option value={60}>60 seconds</option>
                  </select>
                </div>
              </div>

              {/* Submit / Status */}
              {isIdle ? (
                <button type="submit" className="wi-btn wi-btn-primary wi-btn-lg" style={{ width: "100%", justifyContent: "center" }}>
                  <Play size={15} />
                  Start Compliance Audit
                </button>
              ) : (
                <div style={{
                  padding: "0.875rem",
                  background: "var(--wi-surface-2)",
                  borderRadius: "var(--wi-radius-sm)",
                  border: "1px solid var(--wi-border)",
                  textAlign: "center",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
                    <div className="wi-spinner" style={{ width: 16, height: 16 }} />
                    <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--wi-text-primary)", textTransform: "capitalize" }}>
                      {auditStatus}…
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--wi-text-muted)", marginBottom: 8 }}>
                    {totalPagesScanned > 0 && `${totalPagesScanned} pages processed`}
                    {totalPagesScanned === 0 && "Initializing audit pipeline…"}
                  </div>
                  {jobId && ["pending", "crawling", "analyzing"].includes(auditStatus) && (
                    <button
                      type="button"
                      className="wi-btn wi-btn-danger wi-btn-sm"
                      onClick={handleCancel}
                      style={{ width: "100%", justifyContent: "center", gap: 6 }}
                    >
                      <AlertTriangle size={13} />
                      Cancel Scan
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* ─── Progress Panel ─── */}
        <div className="col-12" style={{ minWidth: 0, maxWidth: "100%", padding: 0 }}>
          <div className="wi-card" style={{ width: "100%", maxWidth: "100%", overflow: "hidden", boxSizing: "border-box" }}>
            {/* Header row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={15} style={{ color: "var(--wi-text-muted)" }} />
                <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--wi-text-primary)" }}>
                  Audit Progress
                </span>
              </div>
              {auditStatus !== "idle" && (
                <span className={`wi-badge ${auditStatus === "completed" ? "wi-badge-success" :
                    auditStatus === "failed" || auditStatus === "cancelled" ? "wi-badge-danger" : "wi-badge-info"
                  }`}>
                  {auditStatus.toUpperCase()}
                </span>
              )}
            </div>

            {/* Step indicator */}
            <div style={{ marginBottom: "1.5rem" }}>
              <Stepper auditStatus={auditStatus} />
            </div>

            {/* Log stream */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>
                Live Log Stream
              </div>
              <div className="wi-log-stream" style={{ overflowX: "hidden", overflowY: "auto", width: "100%", maxWidth: "100%" }}>
                {logs.length === 0 ? (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--wi-text-muted)", fontSize: "0.825rem" }}>
                    Enter a URL above to begin the audit…
                  </div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="wi-log-line">
                      <span className="wi-log-time">
                        [{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--:--:--"}]
                      </span>
                      <span className={logLevelClass(log.level) + " wi-log-msg"}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>

            {/* Success banner */}
            {auditStatus === "completed" && (
              <div className="wi-alert wi-alert-success" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle size={18} />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>Audit Complete</div>
                    <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>Report compiled successfully.</div>
                  </div>
                </div>
                <button
                  className="wi-btn wi-btn-primary wi-btn-sm"
                  onClick={() => navigate(`/crawler/report/${jobId}`)}
                  style={{ flexShrink: 0 }}
                >
                  View Report <ChevronRight size={13} />
                </button>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="wi-alert wi-alert-danger">
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>Audit Failed</div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>{error}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
