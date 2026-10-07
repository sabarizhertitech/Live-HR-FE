import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portalInstance } from "../Services/instance";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Scale,
  FileText,
  ShieldAlert,
  Building2,
  Mail,
  Phone,
  MapPin,
  Lock,
  Shield,
  Truck,
  Cookie,
  RotateCcw,
  CreditCard,
  Gavel,
  AlertCircle,
  BadgeCheck,
} from "lucide-react";
import SectionHeader from "./common/SectionHeader";
import StatusBadge from "./common/StatusBadge";
import EmptyState from "./common/EmptyState";

/* ─── Full 8-policy list with backend keys (null = not tracked by backend) ─── */
const ALL_POLICIES = [
  { key: "hasPrivacyPolicy",   name: "Privacy Policy",                icon: Lock,      mandatory: true,  backendTracked: true,  desc: "Required by DPDP Act, GDPR, and all payment gateways." },
  { key: "hasTermsOfService",  name: "Terms & Conditions",            icon: Scale,     mandatory: true,  backendTracked: true,  desc: "Governs the merchant-user relationship and limits liability." },
  { key: "hasRefundPolicy",    name: "Refund & Return Policy",        icon: RotateCcw, mandatory: true,  backendTracked: true,  desc: "Mandatory for all payment gateway approvals (Razorpay, Stripe, etc.)." },
  { key: null,                 name: "Cancellation Policy",           icon: XCircle,   mandatory: true,  backendTracked: false, desc: "Specifies how and when users can cancel orders or subscriptions." },
  { key: null,                 name: "Shipping & Delivery Policy",    icon: Truck,     mandatory: false, backendTracked: false, desc: "Required for physical goods merchants — delivery timelines and methods." },
  { key: null,                 name: "Cookie Policy",                 icon: Cookie,    mandatory: false, backendTracked: false, desc: "Required under DPDP Act 2023 and GDPR for cookie-using websites." },
];

const LEGAL_CLAUSES = [
  { policyKey: "hasPrivacyPolicy",  title: "Data Collection & Cookie Consent",     desc: "Disclosures defining what user data is collected (IPs, cookies, emails)." },
  { policyKey: "hasTermsOfService", title: "Limitation of Liability",               desc: "Waivers shifting transaction or platform risks away from the company." },
  { policyKey: "hasRefundPolicy",   title: "Refund & Chargeback Parameters",        desc: "Timelines, cancel periods, or chargeback fee descriptions." },
  { policyKey: "hasTermsOfService", title: "Client Obligations & Prohibited Use",   desc: "Terms establishing user account care and blocking prohibited acts." },
  { policyKey: "hasPrivacyPolicy",  title: "Governing Law & Jurisdiction",          desc: "Identifies which country's courts and law will govern disputes." },
];

/* ─── Onboarding-specific fix data for each missing policy ─── */
const ONBOARDING_FIXES = [
  {
    policy: "Privacy Policy",
    whyNeeded: "Automatic gateway rejection without it.",
    gatewayImpact: "Blocks: Razorpay, PayU, Cashfree, Stripe",
    regulatoryRef: "DPDP Act 2023 · RBI PA-PG",
    steps: [
      "Publish /privacy-policy linked in footer.",
      "Detail data collection, usage, and retention.",
      "Add Grievance Officer contact details."
    ],
    content: "Data usage, Cookie disclosure, User rights, Grievance Officer.",
  },
  {
    policy: "Terms & Conditions",
    whyNeeded: "Required legal contract before processing payments.",
    gatewayImpact: "Blocks: All Payment Gateways",
    regulatoryRef: "Indian Contract Act",
    steps: [
      "Publish /terms-and-conditions linked in footer.",
      "Add Limitation of Liability and Governing Law.",
      "Define account suspension/termination terms."
    ],
    content: "Governing law, Liability limits, Prohibited acts, Dispute resolution.",
  },
  {
    policy: "Refund & Return Policy",
    whyNeeded: "The #1 checked document to prevent chargebacks.",
    gatewayImpact: "Blocks: All Gateways & Card Networks",
    regulatoryRef: "RBI Chargeback Framework",
    steps: [
      "Publish dedicated /refund-policy.",
      "State refund timeline (e.g., 5-7 business days).",
      "Define non-refundable conditions."
    ],
    content: "Eligibility, Timeline, Dispute handling.",
  },
];


/* ─── Fix card component ─── */
function OnboardingFixCard({ fix }) {
  return (
    <div style={{
      padding: "0.875rem 1.25rem", borderRadius: "var(--wi-radius-sm)",
      border: "1px solid var(--wi-danger-border)", borderLeft: "4px solid var(--wi-danger)",
      marginBottom: "0.75rem", background: "var(--wi-surface)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--wi-danger)" }}>
          {fix.policy} — Missing
        </span>
        <span style={{ fontSize: "0.7rem", color: "var(--wi-text-muted)", background: "var(--wi-surface-2)", padding: "2px 6px", borderRadius: 4 }}>
          {fix.gatewayImpact}
        </span>
      </div>

      <div style={{ fontSize: "0.8rem", color: "var(--wi-text-secondary)", marginBottom: 12 }}>
        <strong>Why:</strong> {fix.whyNeeded}
      </div>

      <div style={{
        background: "var(--wi-surface-2)", borderRadius: "var(--wi-radius-sm)",
        padding: "0.75rem 1rem", borderLeft: "2px solid var(--wi-border-strong)",
      }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--wi-text-primary)", marginBottom: 4 }}>
          Action Required:
        </div>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--wi-text-secondary)" }}>
          {fix.steps.map((step, i) => <li key={i} style={{ marginBottom: 2 }}>{step}</li>)}
        </ul>
      </div>
    </div>
  );
}

/* ─── Checklist row ─── */
function PolicyRow({ policy, compSum }) {
  const Icon = policy.icon;

  let state;
  if (!policy.backendTracked) {
    state = "unverified";
  } else {
    state = compSum[policy.key] ? "found" : "missing";
  }

  const stateConfig = {
    found:      { label: "✓ Found",        colorCls: "found",      bg: "var(--wi-success-bg)",  color: "var(--wi-success)", border: "var(--wi-success-border)" },
    missing:    { label: "✗ Missing",       colorCls: "missing",    bg: "var(--wi-danger-bg)",   color: "var(--wi-danger)",  border: "var(--wi-danger-border)"  },
    unverified: { label: "⚠ Not Verified",  colorCls: "unverified", bg: "var(--wi-warning-bg)", color: "var(--wi-warning)", border: "var(--wi-warning-border)" },
  }[state];

  return (
    <div className="wi-policy-row" style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "1rem",
      padding: "1rem 1.25rem",
      borderBottom: "1px solid var(--wi-border)",
      transition: "background 0.15s ease",
    }}
    onMouseEnter={e => e.currentTarget.style.background = "var(--wi-surface-2)"}
    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: stateConfig.bg,
        color: stateConfig.color,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--wi-text-primary)" }}>{policy.name}</span>
          {policy.mandatory && (
            <span style={{
              fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.45rem",
              borderRadius: 999, background: "var(--wi-danger-bg)", color: "var(--wi-danger)",
              border: "1px solid var(--wi-danger-border)", textTransform: "uppercase", letterSpacing: "0.3px",
            }}>Required</span>
          )}
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)", lineHeight: 1.5 }}>{policy.desc}</div>
        {state === "unverified" && (
          <div style={{ fontSize: "0.75rem", color: "var(--wi-warning)", marginTop: 4, fontWeight: 500 }}>
            Scanner cannot automatically detect this policy — verify manually.
          </div>
        )}
      </div>
      <span style={{
        fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.75rem",
        borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.3px",
        background: stateConfig.bg, color: stateConfig.color,
        border: `1px solid ${stateConfig.border}`, flexShrink: 0, marginTop: 4,
      }}>
        {stateConfig.label}
      </span>
    </div>
  );
}

export default function CrawlerComplianceSummaryPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [report, setReport]   = useState(null);
  const [pages, setPages]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const fetchComplianceData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await portalInstance.get(`/web/crawler/reports/${id}`);
        if (res.data?.success) {
          setReport(res.data.report);
          setPages(res.data.pages || []);
        } else {
          setError("Failed to fetch compliance profiles.");
        }
      } catch (err) {
        console.error("Error loading report:", err);
        setError("Network error fetching legal policy checklist.");
      } finally {
        setLoading(false);
      }
    };
    fetchComplianceData();
  }, [id]);

  if (loading) {
    return (
      <div className="wi-loading-page">
        <div className="wi-loading-card">
          <div className="wi-spinner mx-auto mb-4" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--wi-text-primary)" }}>
            Loading Compliance Data
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
            Unable to Load Compliance Data
          </h2>
          <button className="wi-btn wi-btn-primary" onClick={() => navigate("/")}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const compSum          = report.complianceSummary || {};
  const complianceScore  = report.scores?.compliance ?? 0;
  const complianceIssues = (report.issues || []).filter(i =>
    i.category === "compliance" && !i.title?.includes("KYC") && !i.title?.includes("AML")
  );

  const scoreColor =
    complianceScore >= 70 ? "var(--wi-success)" :
    complianceScore >= 40 ? "var(--wi-warning)" : "var(--wi-danger)";

  const verdictLabel =
    complianceScore >= 70 ? "Compliant" :
    complianceScore >= 40 ? "Partially Compliant" : "Non-Compliant";

  const detectedCount  = ALL_POLICIES.filter(p => p.backendTracked && compSum[p.key]).length;
  const trackedTotal   = ALL_POLICIES.filter(p => p.backendTracked).length;
  const missingCount   = ALL_POLICIES.filter(p => p.backendTracked && !compSum[p.key]).length;

  /* Clause status: a clause is "covered" if its parent policy was found */
  const clauseStatus = (clause) => compSum[clause.policyKey];

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

      {/* ─── Merchant Onboarding Summary ─── */}
      <div className={`wi-verdict-banner ${complianceScore >= 70 ? "approved" : complianceScore >= 40 ? "review" : "rejected"}`} style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="wi-verdict-icon">
            <Scale size={28} />
          </div>
          <div>
            <div className="wi-verdict-title">{verdictLabel}</div>
            <div className="wi-verdict-sub">Regulatory Compliance Review · {report.url}</div>
            <div style={{ marginTop: 8, display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, opacity: 0.85 }}>
                {detectedCount}/{trackedTotal} tracked policies found
              </span>
              {missingCount > 0 && (
                <span style={{ fontSize: "0.82rem", fontWeight: 600, opacity: 0.85 }}>
                  {missingCount} missing
                </span>
              )}
              {complianceIssues.length > 0 && (
                <span style={{ fontSize: "0.82rem", fontWeight: 600, opacity: 0.85 }}>
                  {complianceIssues.length} compliance issues
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="wi-verdict-score-pill">
          <div className="wi-verdict-score-num">{complianceScore}</div>
          <div className="wi-verdict-score-label">Compliance Score / 100</div>
        </div>
      </div>

      {/* ─── Stat counters ─── */}
      <div className="row g-3 mb-4">
        {[
          { label: "Policies Detected",  value: detectedCount,           color: "var(--wi-success)", bg: "var(--wi-success-bg)" },
          { label: "Policies Missing",   value: missingCount,            color: "var(--wi-danger)",  bg: "var(--wi-danger-bg)"  },
          { label: "Not Verified",       value: ALL_POLICIES.filter(p => !p.backendTracked).length, color: "var(--wi-warning)", bg: "var(--wi-warning-bg)" },
          { label: "Issues Found",       value: complianceIssues.length, color: "var(--wi-info)",    bg: "var(--wi-info-bg)"    },
        ].map(({ label, value, color, bg }) => (
          <div className="col-6 col-md-3" key={label}>
            <div style={{ background: bg, border: `1px solid ${color}25`, borderRadius: "var(--wi-radius)", padding: "1rem 1.25rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.4px", marginTop: 4 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Full Policy Checklist ─── */}
      <div className="wi-card" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--wi-border)" }}>
          <SectionHeader
            icon={FileText}
            title="Complete Policy Verification"
            description="All required and recommended legal documents for merchant onboarding"
          />
        </div>
        <div>
          {ALL_POLICIES.map((policy, i) => (
            <div key={i} style={{ borderBottom: i === ALL_POLICIES.length - 1 ? "none" : undefined }}>
              <PolicyRow policy={policy} compSum={compSum} />
            </div>
          ))}
        </div>
      </div>

      {/* ─── Legal Clause Coverage ─── */}
      <div className="wi-card" style={{ marginBottom: "1.5rem" }}>
        <SectionHeader
          icon={Scale}
          title="Legal Clause Coverage"
          description="Key legal clauses required inside policy documents"
        />
        <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {LEGAL_CLAUSES.map((clause, i) => {
            const covered = clauseStatus(clause);
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "0.875rem 1rem",
                borderRadius: "var(--wi-radius-sm)",
                background: covered ? "var(--wi-success-bg)" : "var(--wi-surface-2)",
                border: `1px solid ${covered ? "var(--wi-success-border)" : "var(--wi-border)"}`,
              }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  {covered
                    ? <CheckCircle size={16} style={{ color: "var(--wi-success)" }} />
                    : <HelpCircle size={16} style={{ color: "var(--wi-text-muted)" }} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--wi-text-primary)", marginBottom: 2 }}>{clause.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)", lineHeight: 1.5 }}>{clause.desc}</div>
                </div>
                <span style={{
                  fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem",
                  borderRadius: 999, textTransform: "uppercase",
                  background: covered ? "var(--wi-success-bg)" : "var(--wi-surface-3)",
                  color: covered ? "var(--wi-success)" : "var(--wi-text-muted)",
                  border: `1px solid ${covered ? "var(--wi-success-border)" : "var(--wi-border)"}`,
                  flexShrink: 0,
                }}>
                  {covered ? "Likely Covered" : "Unverified"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Understanding Compliance Scores ─── */}
      <div className="wi-card" style={{ marginBottom: "1.5rem" }}>
        <SectionHeader
          icon={FileText}
          title="Understanding Compliance Scores"
          description="How we grade your legal and regulatory readiness"
        />
        <div style={{ marginTop: "0.875rem", display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            {
              emoji: "", label: "NON-COMPLIANT", range: "0% – 39%", color: "var(--wi-danger)",
              bg: "var(--wi-danger-bg)", border: "var(--wi-danger-border)",
              desc: "Completely lacks fundamental legal protection (Privacy, Terms, Refund). Will be rejected by payment gateways.",
            },
            {
              emoji: "", label: "PARTIAL", range: "40% – 69%", color: "var(--wi-warning)",
              bg: "var(--wi-warning-bg)", border: "var(--wi-warning-border)",
              desc: "Has basic policy pages, but missing mandatory clauses (e.g. Data Retention, Limitation of Liability, Grievance Officer).",
            },
            {
              emoji: "", label: "COMPLIANT", range: "70% – 100%", color: "var(--wi-success)",
              bg: "var(--wi-success-bg)", border: "var(--wi-success-border)",
              desc: "Provides comprehensive legal documents that protect both the business and consumer, meeting RBI/DPDP standards.",
            },
          ].map(({ emoji, label, range, color, bg, border, desc }) => (
            <div key={label} className="wi-compliance-tier-row" style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "0.6rem 1rem", borderRadius: "var(--wi-radius-sm)",
              background: bg, border: `1px solid ${border}`,
            }}>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>{emoji}</span>
              <span style={{ fontWeight: 700, fontSize: "0.8rem", color, minWidth: 104, flexShrink: 0 }}>{label}</span>
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

      {/* ─── Merchant Onboarding Improvement Guide ─── */}
      <div className="wi-card">
        <SectionHeader
          icon={AlertTriangle}
          title="Merchant Onboarding Improvement Guide"
          description="Step-by-step fixes required to pass payment gateway and compliance review"
        />

        {complianceScore >= 100 ? (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <CheckCircle size={48} style={{ color: "var(--wi-success)", margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--wi-text-primary)", marginBottom: "0.5rem" }}>
              All Detected Policies Pass — Onboarding Ready!
            </h3>
            <p style={{ color: "var(--wi-text-secondary)", maxWidth: 500, margin: "0 auto", fontSize: "0.875rem" }}>
              Your website meets all auto-detected compliance criteria. Manually verify the "Not Verified" policies above before final onboarding submission.
            </p>
          </div>
        ) : (
          <div style={{ marginTop: "1rem" }}>

            {/* ── PHASE 1: Blocking Issues ── */}
            {ALL_POLICIES.filter(p => p.backendTracked && !compSum[p.key]).length > 0 && (
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: "0.875rem",
                  padding: "0.5rem 0.875rem", background: "var(--wi-danger-bg)",
                  borderRadius: "var(--wi-radius-sm)", border: "1px solid var(--wi-danger-border)",
                }}>
                  <XCircle size={15} style={{ color: "var(--wi-danger)", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--wi-danger)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Phase 1 — Blocking Issues · Must Fix Before Applying
                  </span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)", marginBottom: "1rem", paddingLeft: "0.25rem" }}>
                  Missing these policies causes <strong>automatic rejection</strong> by payment aggregators.
                </p>

                {ONBOARDING_FIXES.filter(fix =>
                  ALL_POLICIES.some(p => p.backendTracked && !compSum[p.key] && p.name === fix.policy)
                ).map((fix, i) => (
                  <OnboardingFixCard key={i} fix={fix} severity="blocking" />
                ))}
              </div>
            )}

            {/* ── PHASE 2: Compliance Issues from Backend ── */}
            {complianceIssues.length > 0 && (
              <div style={{ marginBottom: "1.75rem" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: "0.875rem",
                  padding: "0.5rem 0.875rem", background: "var(--wi-warning-bg)",
                  borderRadius: "var(--wi-radius-sm)", border: "1px solid var(--wi-warning-border)",
                }}>
                  <AlertTriangle size={15} style={{ color: "var(--wi-warning)", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--wi-warning)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Phase 2 — Policy Clause Gaps · Fix to Avoid Review Delays
                  </span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)", marginBottom: "1rem", paddingLeft: "0.25rem" }}>
                  Policies exist but lack mandatory clauses. Payment gateways will flag these during manual review.
                </p>
                {complianceIssues.map((issue, idx) => (
                  <div key={idx} style={{
                    padding: "1rem 1.25rem", borderRadius: "var(--wi-radius-sm)",
                    border: "1px solid var(--wi-border)",
                    borderLeft: `4px solid ${issue.severity === "HIGH" ? "var(--wi-danger)" : "var(--wi-warning)"}`,
                    marginBottom: "0.75rem", background: "var(--wi-surface)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--wi-text-primary)" }}>{issue.title}</span>
                      <StatusBadge status={issue.severity} />
                    </div>
                    <div style={{ fontSize: "0.83rem", color: "var(--wi-text-secondary)", marginBottom: 8, lineHeight: 1.55 }}>
                      <strong>Gap detected:</strong> {issue.description}
                    </div>
                      <div style={{
                        background: "var(--wi-surface-2)", borderRadius: "var(--wi-radius-sm)",
                        padding: "0.6rem 0.875rem", fontSize: "0.8rem", color: "var(--wi-text-secondary)",
                        borderLeft: "2px solid var(--wi-warning)", lineHeight: 1.4,
                      }}>
                        <strong>Action:</strong> {issue.recommendation}
                      </div>
                  </div>
                ))}
              </div>
            )}


            {/* ── Onboarding Submission Checklist ── */}
            <div style={{
              padding: "1.25rem 1.5rem", borderRadius: "var(--wi-radius)",
              background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
              border: "1px solid var(--wi-success-border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "0.875rem" }}>
                <CheckCircle size={18} style={{ color: "var(--wi-success)" }} />
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--wi-success)" }}>
                  Final Onboarding Submission Checklist
                </span>
              </div>
              <div className="wi-checklist-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.5rem" }}>
                {[
                  "Privacy Policy page linked in footer",
                  "Terms & Conditions page accessible",
                  "Refund & Cancellation policy published",
                  "Contact Us page with email + phone",
                  "HTTPS / SSL certificate active",
                  "Business address displayed on site",
                  "About Us page present",
                  "No prohibited content (gambling/adult)",
                  "GST/CIN visible (for registered entities)",
                  "Grievance officer contact available",
                  "Shipping policy (if physical goods)",
                  "Cookie consent banner (if applicable)",
                ].map((item, i) => {
                  const isDone =
                    (item.includes("Privacy") && compSum.hasPrivacyPolicy) ||
                    (item.includes("Terms") && compSum.hasTermsOfService) ||
                    (item.includes("Refund") && compSum.hasRefundPolicy) ||
                    (item.includes("About Us") && (compSum.hasAboutUs || !!compSum.policyUrls?.about)) ||
                    (item.includes("Contact Us") && (compSum.extractedEntities?.supportEmails?.length > 0 || (compSum.supportEmails?.length > 0))) ||
                    (item.includes("HTTPS") && report?.ssl?.isValid) ||
                    (item.includes("address") && (compSum.addresses?.length > 0 || compSum.extractedEntities?.addresses?.length > 0)) ||
                    (item.includes("GST/CIN") && (compSum.gstin?.length > 0 || compSum.cin?.length > 0)) ||
                    (item.includes("No prohibited") && (report?.scores?.risk ?? 0) < 50) ||
                    false;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "var(--wi-text-secondary)" }}>
                      <span style={{ color: isDone ? "var(--wi-success)" : "var(--wi-text-muted)", flexShrink: 0 }}>
                        {isDone ? "✅" : "☐"}
                      </span>
                      {item}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
