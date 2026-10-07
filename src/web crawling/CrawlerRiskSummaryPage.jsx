import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portalInstance } from "../Services/instance";
import {
  Shield,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  Lock,
  LockOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import StatusBadge from "./common/StatusBadge";
import SectionHeader from "./common/SectionHeader";
import EmptyState from "./common/EmptyState";

/* ── Expandable issue card ── */
function IssueCard({ issue }) {
  const [expanded, setExpanded] = useState(false);

  const borderColor =
    issue.severity === "HIGH"   ? "var(--wi-danger)"  :
    issue.severity === "MEDIUM" ? "var(--wi-warning)" : "var(--wi-success)";

  const iconColor =
    issue.severity === "HIGH"   ? "var(--wi-danger)"  :
    issue.severity === "MEDIUM" ? "var(--wi-warning)" : "var(--wi-success)";

  return (
    <div
      className="wi-issue-card"
      style={{ borderLeftColor: borderColor, marginBottom: "0.75rem" }}
    >
      {/* Header row */}
      <div
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", cursor: "pointer" }}
        onClick={() => setExpanded(e => !e)}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
          {issue.severity === "HIGH" ? (
            <AlertTriangle size={16} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
          ) : (
            <Info size={16} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--wi-text-primary)", marginBottom: 4 }}>
              {issue.title}
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--wi-text-secondary)", margin: 0, lineHeight: 1.5 }}>
              {issue.description}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <StatusBadge status={issue.severity} />
          {expanded ? <ChevronUp size={14} style={{ color: "var(--wi-text-muted)" }} /> : <ChevronDown size={14} style={{ color: "var(--wi-text-muted)" }} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <>
          {issue.recommendation && (
            <div className="wi-recommendation-box">
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6 }}>
                Remediation Guideline
              </div>
              {issue.recommendation}
            </div>
          )}
          {issue.affectedUrls && issue.affectedUrls.length > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--wi-text-muted)", marginBottom: 6 }}>
                Affected URLs ({issue.affectedUrls.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {issue.affectedUrls.map((url, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.78rem", color: "var(--wi-info)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {url}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function CrawlerRiskSummaryPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [report, setReport]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [activeFilter, setActiveFilter] = useState("ALL");

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await portalInstance.get(`/web/crawler/reports/${id}`);
        if (res.data?.success) setReport(res.data.report);
        else setError("Failed to fetch report records.");
      } catch (err) {
        console.error("Error loading report:", err);
        setError("Connection timeout querying risk engine.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="wi-loading-page">
        <div className="wi-loading-card">
          <div className="wi-spinner mx-auto mb-4" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--wi-text-primary)" }}>
            Loading Risk Analysis
          </h2>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="wi-loading-page">
        <div className="wi-loading-card">
          <AlertTriangle size={40} style={{ color: "var(--wi-danger)", marginBottom: 16 }} />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--wi-text-primary)", marginBottom: 8 }}>
            Unable to Load Report
          </h2>
          <button className="wi-btn wi-btn-primary" onClick={() => navigate("/")}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const threatCategories = ["risk", "security", "ssl"];
  const allThreats       = (report.issues || []).filter(i => threatCategories.includes(i.category));
  const filteredThreats  = allThreats.filter(i => activeFilter === "ALL" || i.severity === activeFilter);

  const counts = {
    ALL:    allThreats.length,
    HIGH:   allThreats.filter(i => i.severity === "HIGH").length,
    MEDIUM: allThreats.filter(i => i.severity === "MEDIUM").length,
    LOW:    allThreats.filter(i => i.severity === "LOW").length,
  };

  const riskScore = report.scores?.risk ?? 0;
  const riskColor =
    riskScore <= 30 ? "var(--wi-success)" :
    riskScore <= 60 ? "var(--wi-warning)" : "var(--wi-danger)";

  return (
    <div>
      {/* Back */}
      <button
        className="wi-btn wi-btn-secondary"
        onClick={() => navigate(`/crawler/report/${id}`)}
        style={{ marginBottom: "1.25rem" }}
      >
        <ArrowLeft size={14} />
        Back to Report
      </button>

      {/* Header Card */}
      <div className="wi-page-header" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, background: "var(--wi-danger-bg)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={18} style={{ color: "var(--wi-danger)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--wi-text-primary)", margin: 0 }}>
              Risk Analysis
            </h1>
            <div style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)" }}>{report.url}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          {/* Score pill */}
          <div style={{ display: "flex", flex: "0 0 auto", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: "2.5rem", fontWeight: 800, color: riskColor, lineHeight: 1 }}>
              {riskScore}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)" }}>/ 100 risk score</span>
          </div>

          <div>
            <StatusBadge status={report.riskSeverity} label={`${report.riskSeverity} Severity`} />
            <p style={{ fontSize: "0.825rem", color: "var(--wi-text-secondary)", margin: "0.5rem 0 0", maxWidth: 480 }}>
              Calculated by penalties for critical exposures. High-severity threats trigger automated regulatory alerts.
            </p>
          </div>

          {/* Quick stats */}
          <div className="wi-risk-quick-stats" style={{ display: "flex", gap: "1rem", marginLeft: "auto", flexWrap: "wrap" }}>
            {[
              { label: "High", count: counts.HIGH, color: "var(--wi-danger)" },
              { label: "Medium", count: counts.MEDIUM, color: "var(--wi-warning)" },
              { label: "Low", count: counts.LOW, color: "var(--wi-success)" },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color, lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Understanding Risk Scores ── */}
      <div className="wi-card" style={{ marginBottom: "1.5rem" }}>
        <SectionHeader
          icon={Shield}
          title="Understanding Risk Scores"
          description="How we calculate and categorize website risk levels"
        />
        <div style={{ marginTop: "0.875rem", display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            {
              emoji: "", label: "DANGER", range: "61% – 100%", color: "var(--wi-danger)",
              bg: "var(--wi-danger-bg)", border: "var(--wi-danger-border)",
              desc: "Severely broken or actively malicious. No HTTPS, missing Privacy/Terms, data leaks, phishing forms.",
            },
            {
              emoji: "", label: "MODERATE", range: "31% – 60%", color: "var(--wi-warning)",
              bg: "var(--wi-warning-bg)", border: "var(--wi-warning-border)",
              desc: "Mostly functional but has significant security or legal blind spots — usually one major unresolved flaw.",
            },
            {
              emoji: "", label: "SAFE", range: "0% – 30%", color: "var(--wi-success)",
              bg: "var(--wi-success-bg)", border: "var(--wi-success-border)",
              desc: "Core security, legal, and structural foundations are solid. HTTPS active, no phishing, no data leaks.",
            },
          ].map(({ emoji, label, range, color, bg, border, desc }) => (
            <div key={label} className="wi-risk-tier-row" style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "0.6rem 1rem", borderRadius: "var(--wi-radius-sm)",
              background: bg, border: `1px solid ${border}`,
            }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>{emoji}</span>
              <span style={{ fontWeight: 700, fontSize: "0.8rem", color, minWidth: 76, flexShrink: 0 }}>{label}</span>
              <span style={{
                fontSize: "0.7rem", fontWeight: 600, color,
                background: "rgba(255,255,255,0.6)", borderRadius: 999,
                padding: "0.1rem 0.5rem", flexShrink: 0, whiteSpace: "nowrap",
              }}>{range}</span>
              <span style={{ fontSize: "0.8rem", color: "var(--wi-text-secondary)", lineHeight: 1.4 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Score Improvement Guide ── */}
      {riskScore > 0 ? (
        <div className="wi-card">
          <SectionHeader
            icon={AlertTriangle}
            title="Score Improvement Guide"
            description="Actionable steps to reduce your risk score and improve security"
          />
          <div style={{ marginTop: "1rem" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--wi-text-secondary)", marginBottom: "1.25rem" }}>
              Your Risk score is currently <strong>{riskScore}</strong>. To lower your risk score to 0, please address the following security threats and vulnerabilities:
            </p>
            {allThreats.map((threat, idx) => (
              <div key={idx} style={{
                padding: "1rem",
                borderRadius: "var(--wi-radius-sm)",
                border: "1px solid var(--wi-border)",
                borderLeft: `4px solid ${threat.severity === "HIGH" ? "var(--wi-danger)" : threat.severity === "MEDIUM" ? "var(--wi-warning)" : "var(--wi-info)"}`,
                marginBottom: "0.875rem",
                background: "var(--wi-surface)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--wi-text-primary)" }}>{threat.title}</span>
                  <StatusBadge status={threat.severity} />
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--wi-text-secondary)", marginBottom: 10 }}>
                  <strong>Vulnerability:</strong> {threat.description}
                </div>
                {threat.recommendation && (
                  <div className="wi-recommendation-box" style={{ marginTop: 0 }}>
                    <strong>How to fix it:</strong> {threat.recommendation}
                  </div>
                )}
                {threat.affectedUrls && threat.affectedUrls.length > 0 && (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.8rem" }}>
                    <strong>Affected URLs:</strong>
                    <ul style={{ margin: "4px 0 0", paddingLeft: "1.5rem" }}>
                      {threat.affectedUrls.slice(0, 5).map((url, i) => (
                        <li key={i}><a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--wi-info)", textDecoration: "none" }}>{url}</a></li>
                      ))}
                      {threat.affectedUrls.length > 5 && (
                        <li><span style={{ color: "var(--wi-text-muted)" }}>+ {threat.affectedUrls.length - 5} more</span></li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="wi-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <CheckCircle size={48} style={{ color: "var(--wi-success)", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--wi-text-primary)", marginBottom: "0.5rem" }}>
            Perfect Risk Score!
          </h3>
          <p style={{ color: "var(--wi-text-secondary)", maxWidth: 500, margin: "0 auto", fontSize: "0.9rem" }}>
            Excellent job! Your website has no detected security threats or vulnerabilities.
          </p>
        </div>
      )}
    </div>
  );
}
