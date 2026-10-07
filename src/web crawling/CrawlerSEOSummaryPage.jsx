import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portalInstance } from "../Services/instance";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  AlertTriangle,
  Image,
  Heading1,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import StatusBadge from "./common/StatusBadge";
import SectionHeader from "./common/SectionHeader";
import EmptyState from "./common/EmptyState";

const SEO_CHECKS = [
  {
    id: "title",
    label: "Page Title Tags",
    desc: "Audits meta title existence and character length (30–65 chars).",
    match: (issues) => issues.some(i => i.title?.toLowerCase().includes("title")),
  },
  {
    id: "meta",
    label: "Meta Descriptions",
    desc: "Audits page snippets and length boundaries (100–160 chars).",
    match: (issues) => issues.some(i => i.title?.toLowerCase().includes("description") || i.title?.toLowerCase().includes("meta")),
  },
  {
    id: "h1",
    label: "H1 Heading Structure",
    desc: "Audits H1 element presence — ideally exactly one per page.",
    match: (issues) => issues.some(i => i.title?.includes("H1")),
  },
  {
    id: "canonical",
    label: "Canonical URLs",
    desc: "Ensures robots index the correct authority URL nodes.",
    match: (issues) => issues.some(i => i.title?.toLowerCase().includes("canonical")),
  },
  {
    id: "alt",
    label: "Image Alt Attributes",
    desc: "Checks if static image elements lack descriptive alt labels.",
    match: (issues, report) => (report?.summary?.brokenLinksCount || 0) > 0,
  },
];

export default function CrawlerSEOSummaryPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [report, setReport] = useState(null);
  const [pages, setPages]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [headingsExpanded, setHeadingsExpanded] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await portalInstance.get(`/web/crawler/reports/${id}`);
        if (res.data?.success) {
          setReport(res.data.report);
          setPages(res.data.pages || []);
        } else {
          setError("Failed to fetch SEO profiles.");
        }
      } catch (err) {
        console.error("Error loading report:", err);
        setError("Database communication failure loading SEO metrics.");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [id]);

  if (loading) {
    return (
      <div className="wi-loading-page">
        <div className="wi-loading-card">
          <div className="wi-spinner mx-auto mb-4" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--wi-text-primary)" }}>
            Loading SEO Audit
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
            Unable to Load SEO Data
          </h2>
          <button className="wi-btn wi-btn-primary" onClick={() => navigate("/")}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const seoIssues      = (report.issues || []).filter(i => i.category === "seo" || i.category === "broken_link");
  const homePage       = pages.find(p => p.depth === 0) || pages[0];
  const imagesMissing  = pages.flatMap((page) =>
    (page.images || [])
      .filter(img => !img.alt || img.alt.trim() === "")
      .map(img => ({ pageUrl: page.url, imgUrl: img.url }))
  );

  const seoScore = report.scores?.seo ?? 0;
  const seoColor = seoScore >= 70 ? "var(--wi-success)" : seoScore >= 40 ? "var(--wi-warning)" : "var(--wi-danger)";

  const passedChecks = SEO_CHECKS.filter(c => !c.match(seoIssues, report)).length;

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

      {/* Header */}
      <div className="wi-page-header" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, background: "var(--wi-info-bg)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Search size={18} style={{ color: "var(--wi-info)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--wi-text-primary)", margin: 0 }}>
              SEO Audit
            </h1>
            <div style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)" }}>{report.url}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: "2.5rem", fontWeight: 800, color: seoColor, lineHeight: 1 }}>{seoScore}%</span>
            <span style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)" }}>SEO health score</span>
          </div>
          <div>
            <p style={{ fontSize: "0.825rem", color: "var(--wi-text-secondary)", margin: 0, maxWidth: 480 }}>
              Evaluates crawlability, index metadata limits, and structural page setup.
            </p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "0.625rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--wi-success)", fontWeight: 600 }}>{passedChecks} passed</span>
              <span style={{ fontSize: "0.8rem", color: "var(--wi-danger)", fontWeight: 600 }}>{SEO_CHECKS.length - passedChecks} warnings</span>
              <span style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)" }}>{seoIssues.length} total issues</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Understanding SEO Scores ── */}
      <div className="wi-card" style={{ marginBottom: "1.5rem" }}>
        <SectionHeader
          icon={Search}
          title="Understanding SEO Scores"
          description="How we grade your search engine optimization readiness"
        />
        <div className="row g-3" style={{ marginTop: "1rem" }}>
          
          {/* Poor */}
          <div className="col-12 col-lg-4">
            <div style={{ padding: "1.25rem", borderRadius: "var(--wi-radius)", border: "1px solid var(--wi-border)", borderTop: "4px solid var(--wi-danger)", background: "var(--wi-surface)", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.2rem" }}></span>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--wi-danger)", margin: 0 }}>
                  POOR
                </h4>
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>High Risk: 0% - 40%</div>
              <p style={{ fontSize: "0.85rem", color: "var(--wi-text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
                Completely lacks fundamental search engine visibility structures.
              </p>
              <div style={{ fontSize: "0.8rem", color: "var(--wi-text-secondary)" }}>
                <strong style={{ color: "var(--wi-text-primary)", display: "block", marginBottom: "0.25rem" }}>Common Reasons:</strong>
                <ul style={{ margin: "0", paddingLeft: "1.2rem", lineHeight: 1.5 }}>
                  <li style={{ marginBottom: "0.5rem" }}>Missing a title tag entirely.</li>
                  <li style={{ marginBottom: "0.5rem" }}>Missing a meta description tag.</li>
                  <li>Missing an H1 tag, making it impossible for bots to understand the page topic.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Moderate */}
          <div className="col-12 col-lg-4">
            <div style={{ padding: "1.25rem", borderRadius: "var(--wi-radius)", border: "1px solid var(--wi-border)", borderTop: "4px solid var(--wi-warning)", background: "var(--wi-surface)", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.2rem" }}></span>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--wi-warning)", margin: 0 }}>
                  MODERATE
                </h4>
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>Medium Risk: 41% - 79%</div>
              <p style={{ fontSize: "0.85rem", color: "var(--wi-text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
                Has basic tags, but is missing critical optimizations or violating best practices.
              </p>
              <div style={{ fontSize: "0.8rem", color: "var(--wi-text-secondary)" }}>
                <strong style={{ color: "var(--wi-text-primary)", display: "block", marginBottom: "0.25rem" }}>Common Scenarios:</strong>
                <ul style={{ margin: "0", paddingLeft: "1.2rem", lineHeight: 1.5 }}>
                  <li style={{ marginBottom: "0.5rem" }}>Title or Meta Descriptions are significantly too short or too long.</li>
                  <li style={{ marginBottom: "0.5rem" }}>Multiple H1 tags are used on a single page, breaking thematic hierarchy.</li>
                  <li style={{ marginBottom: "0.5rem" }}>Missing canonical tags (causes duplicate content penalties).</li>
                  <li>A large percentage of images are missing alternative text (alt tags).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Excellent */}
          <div className="col-12 col-lg-4">
            <div style={{ padding: "1.25rem", borderRadius: "var(--wi-radius)", border: "1px solid var(--wi-border)", borderTop: "4px solid var(--wi-success)", background: "var(--wi-surface)", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "1.2rem" }}></span>
                <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--wi-success)", margin: 0 }}>
                  EXCELLENT
                </h4>
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>Low Risk: 80% - 100%</div>
              <p style={{ fontSize: "0.85rem", color: "var(--wi-text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
                Perfectly optimized for search engine crawlers and accessibility.
              </p>
              <div style={{ fontSize: "0.8rem", color: "var(--wi-text-secondary)" }}>
                <strong style={{ color: "var(--wi-text-primary)", display: "block", marginBottom: "0.25rem" }}>What it contains:</strong>
                <ul style={{ margin: "0", paddingLeft: "1.2rem", lineHeight: 1.5 }}>
                  <li style={{ marginBottom: "0.5rem" }}>Titles between 30-60 characters and descriptions between 110-160 characters.</li>
                  <li style={{ marginBottom: "0.5rem" }}>Exactly one H1 tag per page.</li>
                  <li style={{ marginBottom: "0.5rem" }}>Proper self-referencing canonical links.</li>
                  <li>Alt text provided for every single image.</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Score Improvement Guide ── */}
      {seoScore < 100 ? (
        <div className="wi-card">
          <SectionHeader
            icon={AlertTriangle}
            title="Score Improvement Guide"
            description="Actionable steps to increase your SEO score"
          />
          <div style={{ marginTop: "1rem" }}>
            <p style={{ fontSize: "0.85rem", color: "var(--wi-text-secondary)", marginBottom: "1.25rem" }}>
              Your SEO score is currently <strong>{seoScore}%</strong>. To reach 100%, please address the following missing optimizations:
            </p>
            {seoIssues.map((issue, idx) => (
              <div key={idx} style={{
                padding: "1rem",
                borderRadius: "var(--wi-radius-sm)",
                border: "1px solid var(--wi-border)",
                borderLeft: `4px solid ${issue.severity === "HIGH" ? "var(--wi-danger)" : "var(--wi-warning)"}`,
                marginBottom: "0.875rem",
                background: "var(--wi-surface)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--wi-text-primary)" }}>{issue.title}</span>
                  <StatusBadge status={issue.severity} />
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--wi-text-secondary)", marginBottom: 10 }}>
                  <strong>What is missing:</strong> {issue.description}
                </div>
                {issue.recommendation && (
                  <div className="wi-recommendation-box" style={{ marginTop: 0 }}>
                    <strong>How to fix it:</strong> {issue.recommendation}
                  </div>
                )}
              </div>
            ))}
            
            {imagesMissing.length > 0 && (
              <div style={{
                padding: "1rem",
                borderRadius: "var(--wi-radius-sm)",
                border: "1px solid var(--wi-border)",
                borderLeft: "4px solid var(--wi-warning)",
                marginBottom: "0.875rem",
                background: "var(--wi-surface)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--wi-text-primary)" }}>Missing Image Alt Attributes</span>
                  <span className="wi-badge wi-badge-warning">Medium</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--wi-text-secondary)", marginBottom: 10 }}>
                  <strong>What is missing:</strong> {imagesMissing.length} image(s) on your website do not have alternative text (alt="").
                </div>
                <div className="wi-recommendation-box" style={{ marginTop: 0 }}>
                  <strong>How to fix it:</strong> Add descriptive `alt` attributes to all `&lt;img&gt;` tags to improve accessibility and image SEO.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="wi-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <CheckCircle size={48} style={{ color: "var(--wi-success)", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--wi-text-primary)", marginBottom: "0.5rem" }}>
            Perfect SEO Score!
          </h3>
          <p style={{ color: "var(--wi-text-secondary)", maxWidth: 500, margin: "0 auto", fontSize: "0.9rem" }}>
            Excellent job! Your website meets all the technical SEO parameters we audited. No further optimizations required at this time.
          </p>
        </div>
      )}
    </div>
  );
}
