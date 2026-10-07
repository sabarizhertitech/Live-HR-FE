import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portalInstance } from "../Services/instance";
import html2pdf from "html2pdf.js";
import {
  Globe,
  Clock,
  FileText,
  ExternalLink,
  ArrowLeft,
  Download,
  Mail,
  Phone,
  MapPin,
  Server,
  Lock,
  Shield,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Layers,
  Copy,
  CheckCheck,
  AlertCircle,
  TrendingUp,
  Building2,
  ShieldCheck,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Info,
  BadgeCheck,
  Gavel,
  CreditCard,
  Truck,
  HelpCircle,
  Star,
  CheckSquare,
} from "lucide-react";
import StatusBadge from "./common/StatusBadge";
import SectionHeader from "./common/SectionHeader";
import InfoCard from "./common/InfoCard";
import EmptyState from "./common/EmptyState";

/* ── Copy button ── */
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button className="wi-copy-btn" onClick={copy} title="Copy">
      {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

/* ── Score bar ── */
function ScoreBar({ label, score, color }) {
  const colorMap = {
    risk:       score <= 30 ? "green" : score <= 60 ? "amber" : "red",
    seo:        score >= 70 ? "green" : score >= 40 ? "amber" : "red",
    security:   score >= 70 ? "green" : score >= 40 ? "amber" : "red",
    compliance: score >= 70 ? "green" : score >= 40 ? "amber" : "red",
  };
  const cls = colorMap[color] || "indigo";
  const textColor = {
    green: "var(--wi-success)",
    amber: "var(--wi-warning)",
    red:   "var(--wi-danger)",
    indigo:"var(--wi-accent)",
  }[cls];
  return (
    <div className="wi-score-card">
      <div className="wi-score-label">{label}</div>
      <div className="wi-score-value" style={{ color: textColor }}>{score}%</div>
      <div className="wi-score-bar-track">
        <div className={`wi-score-bar-fill ${cls}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

/* ── Checklist row ── */
function ChecklistItem({ label, sub, state }) {
  // state: "found" | "missing" | "unverified" | "warn" | "warning"
  const icons = {
    found:      <CheckCircle size={16} />,
    missing:    <XCircle size={16} />,
    unverified: <HelpCircle size={16} />,
    warn:       <AlertTriangle size={16} />,
    warning:    <AlertTriangle size={16} />,
  };
  const labels = {
    found:      "✓ Found",
    missing:    "✗ Missing",
    unverified: "⚠ Not Verified",
    warn:       "⚠ Warning",
    warning:    "⚠ Warning",
  };
  return (
    <div className="wi-checklist-item">
      <div className={`wi-checklist-dot ${state}`}>{icons[state] || icons.unverified}</div>
      <div style={{ flex: 1 }}>
        <div className="wi-checklist-name">{label}</div>
        {sub && <div className="wi-checklist-sub">{sub}</div>}
      </div>
      <span className={`wi-checklist-status ${state}`}>{labels[state] || labels.unverified}</span>
    </div>
  );
}

/* ── Free / Generic Email Detection ── */
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.in",
  "yahoo.co.uk",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "protonmail.com",
  "proton.me",
  "rediffmail.com",
  "gmx.com",
]);

function isGenericEmail(email = "") {
  if (!email || typeof email !== "string") return false;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return false;
  return FREE_EMAIL_DOMAINS.has(parts[1]);
}

/* ── Merchant verdict calculation ── */
function getMerchantVerdict(report, allEmails, allPhones) {
  const compliance  = report.scores?.compliance ?? 0;
  const risk        = report.scores?.risk ?? 0;
  const hasSSL      = report.ssl?.isValid;
  const hasPrivacy  = report.complianceSummary?.hasPrivacyPolicy;
  const hasTerms    = report.complianceSummary?.hasTermsOfService;
  const hasRefund   = report.complianceSummary?.hasRefundPolicy;
  const hasContact  = allEmails.length > 0 || allPhones.length > 0;
  const isAllGenericEmail = allEmails.length > 0 && allEmails.every(isGenericEmail);

  const reasons = [];

  if (!hasSSL)                         reasons.push({ text: "No valid SSL / HTTPS certificate detected.", sev: "HIGH" });
  if (risk >= 70)                      reasons.push({ text: `Risk score is critically high (${risk}/100).`, sev: "HIGH" });
  if (!hasPrivacy)                     reasons.push({ text: "Privacy Policy page not detected.", sev: "HIGH" });
  if (!hasTerms)                       reasons.push({ text: "Terms & Conditions page not detected.", sev: "HIGH" });
  if (!hasRefund)                      reasons.push({ text: "Refund & Cancellation Policy not detected.", sev: "MEDIUM" });
  if (!hasContact)                     reasons.push({ text: "No contact information (email/phone) found.", sev: "MEDIUM" });
  if (isAllGenericEmail)               reasons.push({ text: "Contact email uses a generic provider (@gmail.com) instead of a corporate domain.", sev: "MEDIUM" });
  if (compliance < 40)                 reasons.push({ text: `Compliance score is too low (${compliance}%).`, sev: "HIGH" });

  // Hard rejections
  if (!hasSSL || risk >= 70 || compliance < 25) {
    return { verdict: "Rejected", cls: "rejected", color: "var(--wi-danger)", emoji: "", reasons };
  }
  // High risk
  if (risk >= 50 || compliance < 45 || (!hasPrivacy && !hasTerms)) {
    return { verdict: "High Risk", cls: "high-risk", color: "var(--wi-orange)", emoji: "", reasons };
  }
  // Needs review
  if (compliance < 65 || !hasRefund || risk >= 30 || !hasContact || isAllGenericEmail) {
    return { verdict: "Needs Review", cls: "review", color: "var(--wi-warning)", emoji: "", reasons };
  }
  // Approved
  return { verdict: "Approved", cls: "approved", color: "var(--wi-success)", emoji: "", reasons };
}

/* ── Missing items builder ── */
function buildMissingItems(report, pages, allEmails, allPhones, allAddresses) {
  const compSum = report.complianceSummary || {};
  const issues  = report.issues || [];
  const groups  = [];

  /* ── 1. Missing Pages ── */
  const missingPages = [];
  if (!compSum.hasPrivacyPolicy)  missingPages.push({ name: "Privacy Policy",         sev: "high",   fix: "Create a dedicated /privacy-policy page and link it in the footer." });
  if (!compSum.hasTermsOfService) missingPages.push({ name: "Terms & Conditions",     sev: "high",   fix: "Create a /terms-and-conditions page with governing law and liability clauses." });
  if (!compSum.hasRefundPolicy)   missingPages.push({ name: "Refund & Return Policy", sev: "medium", fix: "Create a /refund-policy page specifying timelines, process, and contact." });
  if (missingPages.length > 0) {
    groups.push({ title: "Missing Policy Documents", icon: FileText, items: missingPages });
  }

  /* ── 2. Missing Contact Information ── */
  const missingContact = [];
  if (allEmails.length === 0) {
    missingContact.push({ name: "Business Email Address",  sev: "high",   fix: "Add a business email address to your Contact Us page and footer." });
  } else if (allEmails.every(isGenericEmail)) {
    missingContact.push({
      name: "Corporate Domain Email (@domain.com)",
      sev: "medium",
      fix: `The website uses a generic email ('${allEmails[0]}'). Update to an official corporate email domain (e.g. contact@${report?.url ? new URL(report.url).hostname.replace(/^www\./, '') : 'yourdomain.com'}) to enhance trust.`
    });
  }
  if (allPhones.length === 0)    missingContact.push({ name: "Business Phone Number",   sev: "medium", fix: "Display a customer support phone number prominently on the Contact Us page." });
  if (allAddresses.length === 0) missingContact.push({ name: "Business Address",        sev: "medium", fix: "Include a registered business/office address on the Contact Us or About Us page." });
  if (missingContact.length > 0) {
    groups.push({ title: "Missing Contact Information", icon: Mail, items: missingContact });
  }

  /* ── 3. Missing Legal Information ── */
  const missingLegal = [];
  const rawText = pages.map(p => (p.rawText || "").toLowerCase()).join(" ");
  const allGstin = [...new Set([
    ...(compSum.extractedEntities?.gstin || []),
    ...(compSum.gstin || []),
    ...pages.flatMap(p => p.gstin || [])
  ])].filter(Boolean);

  const hasGST = allGstin.length > 0 ||
    /\bgst[n|in]*\s*[:\-–]?\s*[0-9]{2}[A-Z]/i.test(rawText) ||
    /gstin|gstn/i.test(rawText) ||
    /\b[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]\b/i.test(rawText);

  if (!hasGST) missingLegal.push({ name: "GST Number (GSTIN)",        sev: "high",   fix: "Display your GST registration number (GSTIN) on the About Us or Contact page." });
  if (missingLegal.length > 0) {
    groups.push({ title: "Missing Legal & Regulatory Info", icon: Gavel, items: missingLegal });
  }

  /* ── 4. Compliance Issues from backend ── */
  const compIssues = issues
    .filter(i => i.category === "compliance" && !i.title?.includes("KYC") && !i.title?.includes("AML"))
    .map(i => ({
      name: i.title,
      sev: i.severity?.toLowerCase() || "medium",
      fix: i.recommendation || i.description,
      desc: i.description,
    }));
  if (compIssues.length > 0) {
    groups.push({ title: "Compliance Issues Detected", icon: AlertTriangle, items: compIssues });
  }

  /* ── 5. Security Issues ── */
  const secIssues = issues
    .filter(i => ["risk", "security", "ssl"].includes(i.category))
    .slice(0, 5)
    .map(i => ({
      name: i.title,
      sev: i.severity?.toLowerCase() || "medium",
      fix: i.recommendation || i.description,
    }));
  if (secIssues.length > 0) {
    groups.push({ title: "Security & Risk Issues", icon: ShieldAlert, items: secIssues });
  }

  return groups;
}

/* ─────────────────────────────────────────────── */
export default function CrawlerReportPage() {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const [report, setReport]   = useState(null);
  const [pages, setPages]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const fetchReportDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await portalInstance.get(`/web/crawler/reports/${id}`);
        if (res.data?.success) {
          setReport(res.data.report);
          setPages(res.data.pages || []);
        } else {
          setError("Failed to load audit records.");
        }
      } catch (err) {
        console.error("Error loading report details:", err);
        setError("Error communicating with servers. Make sure your backend is active.");
      } finally {
        setLoading(false);
      }
    };
    fetchReportDetails();
  }, [id]);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showRawFormTests, setShowRawFormTests] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById("report-content");
    if (!element || downloadingPdf) return;
    setDownloadingPdf(true);

    const prevScrollX = window.scrollX;
    const prevScrollY = window.scrollY;
    window.scrollTo(0, 0);

    const noPrintEls = element.querySelectorAll(".no-print");
    const prevDisplays = [];
    noPrintEls.forEach(el => { prevDisplays.push(el.style.display); el.style.display = "none"; });

    element.classList.add("pdf-export-mode");

    const opt = {
      margin: [0.4, 0.4, 0.4, 0.4],
      filename: `MerchantReport-${report?.url?.replace(/[^a-zA-Z0-9]/g, "_") || "website"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
        scrollY: 0,
      },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      pagebreak: {
        mode: ['css', 'legacy'],
        avoid: [
          '.pdf-avoid-break',
          '.row',
          '.wi-card',
          '.wi-checklist-item',
          '.wi-contact-row',
          '.wi-info-cell',
          '.wi-missing-item',
          '.wi-verdict-banner',
          '.wi-final-recommendation',
          '.wi-score-card',
          'table',
          'tr'
        ]
      }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      element.classList.remove("pdf-export-mode");
      noPrintEls.forEach((el, i) => { el.style.display = prevDisplays[i]; });
      window.scrollTo(prevScrollX, prevScrollY);
      setDownloadingPdf(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="wi-loading-page">
        <div className="wi-loading-card">
          <div className="wi-spinner mx-auto mb-4" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--wi-text-primary)", marginBottom: 6 }}>
            Loading Compliance Report
          </h2>
          <p style={{ color: "var(--wi-text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Compiling merchant onboarding audit…
          </p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !report) {
    return (
      <div className="wi-loading-page">
        <div className="wi-loading-card">
          <AlertTriangle size={40} style={{ color: "var(--wi-danger)", marginBottom: 16 }} />
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--wi-text-primary)", marginBottom: 6 }}>
            Report Not Found
          </h2>
          <p style={{ color: "var(--wi-text-muted)", fontSize: "0.875rem", marginBottom: 20 }}>
            {error || "Could not retrieve this compliance profile."}
          </p>
          <button className="wi-btn wi-btn-primary" onClick={() => navigate("/")}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /* ── Aggregate contact data ── */
  const rawEmailsList = pages.flatMap(p => p.emails || []).map(e => e.toLowerCase().trim());
  const cleanedEmailsList = rawEmailsList.map(e => {
    const atIdx = e.indexOf("@");
    if (atIdx === -1) return null;
    const local = e.substring(0, atIdx).replace(/^\d+/, "");
    const domain = e.substring(atIdx + 1).replace(/\.$/, "");
    return local ? `${local}@${domain}` : null;
  }).filter(Boolean);
  const allEmails = [...new Set(cleanedEmailsList)].filter(e => {
    const parts = e.split("@");
    return parts.length === 2 && /^[a-zA-Z]/.test(parts[0]) && parts[0].length >= 1 && parts[1].includes(".") && parts[1].length >= 4;
  });

  const rawPhones = pages.flatMap(p => p.phones || []);
  const phoneDedupeMap = new Map();
  for (const p of rawPhones) {
    let digits = p.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length >= 12) digits = digits.substring(2);
    if (digits.startsWith("0")) digits = digits.substring(1);
    let key = /^1[89]00/.test(digits) ? digits : digits.length >= 10 ? digits.slice(-10) : digits;
    if (!phoneDedupeMap.has(key) || (p.includes("+") && !phoneDedupeMap.get(key).includes("+"))) {
      phoneDedupeMap.set(key, p);
    }
  }
  const allPhones    = [...phoneDedupeMap.values()];
  const allAddresses = report?.complianceSummary?.addresses || [];
  const allCopyrights = report?.complianceSummary?.copyrights || [];
  const compSum      = report.complianceSummary || {};

  /* ── Derived verdicts ── */
  const verdict     = getMerchantVerdict(report, allEmails, allPhones);
  const missingGroups = buildMissingItems(report, pages, allEmails, allPhones, allAddresses);

  /* ── Page presence heuristics ── */
  const rawText = pages.map(p => (p.rawText || "").toLowerCase()).join(" ");
  const allUrls = pages.map(p => (p.url || "").toLowerCase());
  const allHeadings = pages.flatMap(p => (p.headings || []).map(h => (h.text || "").toLowerCase()));
  const allLinks = pages.flatMap(p => p.links || []);

  const hasAboutUs =
    compSum.hasAboutUs === true ||
    allUrls.some(u => /about|about-us|aboutus|who-we-are|our-story|our-team|our-company/i.test(u)) ||
    pages.some(p => p.pageType === "about") ||
    pages.some(p => /about\s*(us|the\s*company|our\s*company|me)?|who\s*we\s*are|our\s*story/i.test(p.title || "") || /about\s*(us|the\s*company|our\s*company|me)?|who\s*we\s*are|our\s*story/i.test(p.metaDescription || "")) ||
    allHeadings.some(h => /about\s*(us|the\s*company|our\s*company|me)?|who\s*we\s*are|our\s*story|our\s*mission/i.test(h)) ||
    allLinks.some(l => /about\s*(us)?|who\s*we\s*are|our\s*story/i.test(l.text || "") || /#about/i.test(l.url || "")) ||
    /\babout\s+(us|the\s+company|our\s+company|our\s+team|our\s+mission|me)\b/i.test(rawText) ||
    /\bwho\s+we\s+are\b/i.test(rawText) ||
    /\bour\s+story\b/i.test(rawText);

  const hasContactUs =
    allUrls.some(u => /contact|contact-us|contactus|reach-us/i.test(u)) ||
    allEmails.length > 0 ||
    allPhones.length > 0 ||
    allHeadings.some(h => /contact\s*(us)?|get\s*in\s*touch|reach\s*us|support/i.test(h)) ||
    allLinks.some(l => /contact\s*(us)?/i.test(l.text || "") || /#contact/i.test(l.url || ""));

  const hasFAQ = allUrls.some(u => /faq|faqs|frequently-asked/.test(u)) || allHeadings.some(h => /faq|frequently\s*asked/i.test(h)) || /frequently asked questions/i.test(rawText);
  const hasSitemap = allUrls.some(u => /sitemap/.test(u));

  /* ── Legal info ── */
  const allGstin = [...new Set([
    ...(compSum.extractedEntities?.gstin || []),
    ...(compSum.gstin || []),
    ...pages.flatMap(p => p.gstin || [])
  ])].filter(Boolean);

  const hasGST = allGstin.length > 0 ||
    /\bgst[n|in]*\s*[:\-–]?\s*[0-9]{2}[A-Z]/i.test(rawText) ||
    /gstin|gstn/i.test(rawText) ||
    /\b[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z][Zz][0-9A-Za-z]\b/i.test(rawText);

  /* ── E-commerce indicators ── */
  const hasCart = allUrls.some(u => /cart|basket|checkout/.test(u)) || /add to cart|shopping cart|checkout/i.test(rawText);
  const hasProductListing = allUrls.some(u => /products?|shop|catalog|store|items?/.test(u)) || /product listing|our products|shop now/i.test(rawText);
  const hasPaymentInfo = /payment method|we accept|visa|mastercard|razorpay|paytm|upi|stripe|paypal/i.test(rawText);

  /* ── Company name ── */
  const companyName = compSum.extractedEntities?.companyNames?.[0] || new URL(report.url).hostname.replace(/^www\./, "");

  /* ── Score ── */
  const complianceScore = report.scores?.compliance ?? 0;

  /* ── Form Validation testing data ── */
  const fvSummary = report.formValidationSummary || {};
  const allPageForms = [
    ...(fvSummary.forms || []),
    ...pages.flatMap(p => p.forms || [])
  ];
  const uniqueFormsMap = new Map();
  for (const f of allPageForms) {
    if (!f) continue;
    const key = `${f.pageUrl || ""}_${f.formId || f.formName || ""}`;
    if (!uniqueFormsMap.has(key)) {
      uniqueFormsMap.set(key, f);
    }
  }
  const uniqueForms = [...uniqueFormsMap.values()];
  const formValidationRows = fvSummary.reportRows && fvSummary.reportRows.length > 0
    ? fvSummary.reportRows
    : uniqueForms.flatMap(form => {
        const fields = form.fields || [];
        return fields.flatMap(field => {
          const tests = field.tests || [];
          if (tests.length > 0) {
            return tests.map(test => ({
              pageTitle: form.pageTitle || "Page",
              formType: form.formType || form.formId || "form",
              fieldName: field.fieldName || field.name || "field",
              fieldType: field.fieldType || field.type || "text",
              required: field.required ? "Yes" : "No",
              testValue: test.inputValue !== undefined ? String(test.inputValue) : "",
              expected: test.expected || "Accept",
              actual: test.actual || "Accepted",
              status: test.status || (test.passed ? "PASS" : "FAIL"),
            }));
          }
          return [{
            pageTitle: form.pageTitle || "Page",
            formType: form.formType || form.formId || "form",
            fieldName: field.fieldName || field.name || "field",
            fieldType: field.fieldType || field.type || "text",
            required: field.required ? "Yes" : "No",
            testValue: field.validTestValue || "",
            expected: "Accept",
            actual: field.validTestResult || "Accepted",
            status: field.overallFieldStatus || "PASS",
          }];
        });
      });

  /* ── Form Validation Field-Level Diagnostics ── */
  const inferFieldSemanticRole = (name = "", label = "", type = "") => {
    const t = (type || "").toLowerCase().trim();
    const meta = `${name} ${label}`.toLowerCase().replace(/[-_.:]/g, " ");
    if (t === "email" || /\b(email|mail)\b/i.test(meta)) return "email";
    if (t === "tel" || /\b(phone|mobile|cell|telephone|contact num|whatsapp|tel)\b/i.test(meta)) return "phone";
    if (t === "password" || /\b(password|pwd)\b/i.test(meta)) return "password";
    if (t === "url" || /\b(website|url|homepage)\b/i.test(meta)) return "url";
    if (t === "number" || /\b(number|age|qty|quantity|amount|zip|postal|pincode)\b/i.test(meta)) return "number";
    if (t === "textarea" || /\b(message|comment|feedback|query|enquiry|description|details|notes|body|problem)\b/i.test(meta)) return "message";
    if (/\b(name|fullname|firstname|lastname|username|first name|last name|full name|user name|contact name)\b/i.test(meta)) return "name";
    if (/\b(subject|topic|title|heading)\b/i.test(meta)) return "subject";
    return "text";
  };

  const rawFormFields = [];
  const fieldKeySet = new Set();

  if (uniqueForms && uniqueForms.length > 0) {
    for (const form of uniqueForms) {
      const pTitle = form.pageTitle || "Page";
      const fName = form.formType || form.formName || form.formId || "Contact Form";
      for (const field of (form.fields || [])) {
        const fieldName = field.fieldName || field.name || "field";
        const key = `${pTitle}_${fName}_${fieldName}`.toLowerCase();
        if (fieldKeySet.has(key)) continue;
        fieldKeySet.add(key);

        const fieldType = (field.fieldType || field.type || "text").toLowerCase();
        const label = field.label || fieldName;
        const required = field.required === true || field.required === "Yes";
        const semanticType = field.semanticType || inferFieldSemanticRole(fieldName, label, fieldType);
        const tests = field.tests || [];
        rawFormFields.push({
          pageTitle: pTitle,
          formName: fName,
          fieldName,
          label,
          fieldType,
          required,
          semanticType,
          tests,
          overallFieldStatus: field.overallFieldStatus || field.validationStatus,
        });
      }
    }
  }

  // Fallback: Group from formValidationRows if rawFormFields is empty
  if (rawFormFields.length === 0 && formValidationRows.length > 0) {
    const grouped = new Map();
    for (const row of formValidationRows) {
      const pTitle = row.pageTitle || row.page || "Page";
      const fName = row.formType || row.formId || "Contact Form";
      const fieldName = row.fieldName || row.field || "field";
      const key = `${pTitle}_${fName}_${fieldName}`.toLowerCase();

      if (!grouped.has(key)) {
        grouped.set(key, {
          pageTitle: pTitle,
          formName: fName,
          fieldName,
          label: fieldName,
          fieldType: (row.fieldType || row.type || "text").toLowerCase(),
          required: row.required === "Yes" || row.required === true,
          semanticType: inferFieldSemanticRole(fieldName, fieldName, row.fieldType || "text"),
          tests: [],
          overallFieldStatus: row.overallFieldStatus || (row.status === "FAIL" ? "FAIL" : "PASS"),
        });
      }
      grouped.get(key).tests.push({
        testName: row.testName || "",
        inputValue: row.testValue !== undefined ? row.testValue : row.testVal,
        expected: row.expected || (row.status === "PASS" ? "Accept" : "Reject"),
        actual: row.actual || (row.status === "PASS" ? "Accepted" : "Accepted"),
        status: row.status,
        passed: row.status === "PASS",
        description: row.testDescription || "",
      });
    }
    rawFormFields.push(...grouped.values());
  }

  const cleanPageTitle = (str = "") => {
    if (!str) return "Page";
    let cleaned = str.replace(/Scroll to top/gi, "").trim();
    if (cleaned.includes(" | ")) cleaned = cleaned.split(" | ")[0].trim();
    else if (cleaned.includes(" - ")) cleaned = cleaned.split(" - ")[0].trim();
    if (cleaned.length > 25) cleaned = cleaned.slice(0, 25) + "…";
    return cleaned || "Page";
  };

  // Evaluate field diagnostics
  const evaluatedFields = rawFormFields.map((f, idx) => {
    const tests = f.tests || [];
    const failedTests = tests.filter(t => t.passed === false || t.status === "FAIL");
    let isFailed = f.overallFieldStatus === "FAIL" || failedTests.length > 0;

    let expectedRule = "Standard Text";
    let issueMessage = "";
    let recommendation = "";
    let findingSummary = "";

    switch (f.semanticType) {
      case "phone":
        expectedRule = "Numbers Only (0-9)";
        if (isFailed) {
          const badAlpha = failedTests.find(t => 
            t.testName?.includes("alpha") || 
            t.testName?.includes("phone") || 
            /[a-zA-Z]/.test(String(t.inputValue || ""))
          );
          const acceptedVal = badAlpha ? badAlpha.inputValue : "letters";
          issueMessage = `Phone field accepts letters ('${acceptedVal}'). Must allow numbers only.`;
          recommendation = 'Add pattern="[0-9]{10}" and inputmode="numeric" to <input type="tel">';
          findingSummary = `❌ Accepts letters ('${acceptedVal}') — numbers only required.`;
        } else {
          findingSummary = "✅ Enforces numeric phone digits only (0-9).";
          recommendation = "Properly configured.";
        }
        break;

      case "name":
        expectedRule = "Letters Only (a-z, A-Z)";
        if (isFailed) {
          const badInputs = failedTests.map(t => `'${t.inputValue}'`).filter(Boolean).slice(0, 2).join(", ") || "numbers/symbols";
          issueMessage = `Name field accepts numbers/symbols (${badInputs}). Must allow letters only.`;
          recommendation = 'Add pattern="[a-zA-Z\\s]+" to <input type="text">';
          findingSummary = `❌ Accepts numbers/symbols (${badInputs}) — letters only required.`;
        } else {
          findingSummary = "✅ Enforces alphabetical letters only.";
          recommendation = "Properly configured.";
        }
        break;

      case "email":
        expectedRule = "Valid Email (name@domain.com)";
        if (isFailed) {
          const badEmail = failedTests.find(t => t.testName?.includes("invalid") || !String(t.inputValue || "").includes("@"));
          const acceptedVal = badEmail ? badEmail.inputValue : "invalid email";
          issueMessage = `Email field accepts invalid format ('${acceptedVal}').`;
          recommendation = 'Use <input type="email"> and enforce standard email regex validation.';
          findingSummary = `❌ Accepts invalid format ('${acceptedVal}') — email format required.`;
        } else {
          findingSummary = "✅ Enforces valid email format.";
          recommendation = "Properly configured.";
        }
        break;

      case "message":
        expectedRule = "Freeform Text";
        if (f.required && failedTests.some(t => t.testName === "empty_required" || t.inputValue === "")) {
          isFailed = true;
          issueMessage = "Required message field allowed empty submission.";
          recommendation = "Add the 'required' attribute to the <textarea> element.";
          findingSummary = "❌ Allows empty submission on required field.";
        } else {
          isFailed = false;
          findingSummary = "✅ Accepts valid multiline message.";
          recommendation = "Properly configured.";
        }
        break;

      default:
        expectedRule = "Standard Text";
        if (isFailed) {
          issueMessage = "Field failed constraint validation.";
          recommendation = "Review input field validation attributes.";
          findingSummary = "❌ Field failed validation checks.";
        } else {
          findingSummary = "✅ Passed validation checks.";
          recommendation = "Properly configured.";
        }
        break;
    }

    if (f.required && failedTests.some(t => t.testName === "empty_required" || (t.inputValue === "" && t.actual === "Accepted"))) {
      isFailed = true;
      if (!issueMessage.includes("empty")) {
        issueMessage = issueMessage ? `${issueMessage} (Allows empty)` : "Allows empty submission on required field.";
        findingSummary = `${findingSummary} (Allows empty)`;
        recommendation = `${recommendation} Add 'required' attribute.`.trim();
      }
    }

    return {
      id: `field-${idx}-${f.fieldName}`,
      pageTitle: cleanPageTitle(f.pageTitle),
      formName: f.formName,
      fieldName: f.fieldName,
      fieldLabel: f.label || f.fieldName,
      fieldType: f.fieldType,
      semanticType: f.semanticType,
      required: f.required ? "Yes" : "No",
      expectedRule,
      status: isFailed ? "FAIL" : "PASS",
      issueMessage,
      recommendation,
      findingSummary,
      tests,
    };
  });

  const validFieldsCount = evaluatedFields.filter(f => f.status === "PASS").length;
  const invalidFieldsCount = evaluatedFields.filter(f => f.status === "FAIL").length;
  const failedFieldsList = evaluatedFields.filter(f => f.status === "FAIL");
  const overallFormHealth = evaluatedFields.length === 0 ? "NOT_TESTED" : (invalidFieldsCount > 0 ? "FAIL" : "PASS");
  const formOverallStatus = fvSummary.overallStatus || (overallFormHealth !== "NOT_TESTED" ? overallFormHealth : "NOT_TESTED");
  const formTotalCount = fvSummary.totalForms || uniqueForms.length;
  const fieldsTestedCount = evaluatedFields.length || fvSummary.totalFieldsTested || 0;
  const testsRunCount = fvSummary.totalTestsRun || formValidationRows.length;
  const testsPassedCount = fvSummary.passedCount || formValidationRows.filter(r => r.status === "PASS").length;
  const testsFailedCount = fvSummary.failedCount || formValidationRows.filter(r => r.status === "FAIL").length;

  return (
    <div id="report-content">

      {/* ─── Action bar ─── */}
      <div className="no-print wi-report-action-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <button className="wi-btn wi-btn-secondary" onClick={() => navigate("/")}>
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <button className="wi-btn wi-btn-primary" onClick={handleDownloadPDF} disabled={downloadingPdf}>
          {downloadingPdf ? (
            <>
              <div className="wi-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              Generating PDF...
            </>
          ) : (
            <>
              <Download size={14} /> Download PDF
            </>
          )}
        </button>
      </div>

      {/* ─── VERDICT BANNER ─── */}
      <div className={`wi-verdict-banner ${verdict.cls}`}>
        <div className="wi-verdict-banner-inner" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="wi-verdict-icon">
            {verdict.cls === "approved"  && <ShieldCheck size={28} />}
            {verdict.cls === "review"    && <Search size={28} />}
            {verdict.cls === "high-risk" && <AlertTriangle size={28} />}
            {verdict.cls === "rejected"  && <ShieldAlert size={28} />}
          </div>
          <div>
            <div className="wi-verdict-title">{verdict.verdict}</div>
            <div className="wi-verdict-sub">
              {verdict.cls === "approved"  && "This website meets the minimum onboarding requirements."}
              {verdict.cls === "review"    && "This website needs to address a few issues before onboarding."}
              {verdict.cls === "high-risk" && "Significant compliance gaps detected — review before proceeding."}
              {verdict.cls === "rejected"  && "Critical compliance failures — cannot proceed with onboarding."}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                <strong>{companyName}</strong> · {report.url}
              </span>
            </div>
          </div>
        </div>
        <div className="wi-verdict-score-pill">
          <div className="wi-verdict-score-num">{complianceScore}</div>
          <div className="wi-verdict-score-label">Onboarding Score / 100</div>
        </div>
      </div>

      {/* ─── Scan metadata ─── */}
      <div className="wi-page-meta" style={{ marginBottom: "1.5rem" }}>
        <span className="wi-meta-item"><Calendar size={13} />{new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        <span className="wi-meta-item"><Clock size={13} />Scan Duration: {Math.round((report.crawlTimeMs || 0) / 1000)}s</span>
        <span className="wi-meta-item"><FileText size={13} />{report.totalPagesScanned} pages scanned</span>
        <span className="wi-meta-item"><Layers size={13} />Depth: {report.depthReached}</span>
        <a href={report.url} target="_blank" rel="noopener noreferrer" className="wi-meta-item" style={{ color: "var(--wi-accent)", textDecoration: "none" }}>
          <ExternalLink size={13} />Open Website
        </a>
      </div>

      {/* ─── Score Overview ─── */}
      <div className="row g-3 mb-4 pdf-avoid-break">
        <div className="col-6 col-md-3">
          <ScoreBar label="Onboarding Score"  score={report.scores?.compliance ?? 0} color="compliance" />
        </div>
        <div className="col-6 col-md-3">
          <ScoreBar label="Risk Score"         score={report.scores?.risk ?? 0}        color="risk" />
        </div>
        <div className="col-6 col-md-3">
          <ScoreBar label="Security Score"     score={report.scores?.security ?? 0}    color="security" />
        </div>
        <div className="col-6 col-md-3">
          <ScoreBar label="SEO Score"          score={report.scores?.seo ?? 0}         color="seo" />
        </div>
      </div>

      {/* ─── Main Grid: Checklists ─── */}
      <div className="row g-3 mb-4 pdf-avoid-break">

        {/* ── Mandatory Pages Checklist ── */}
        <div className="col-lg-6">
          <div className="wi-card pdf-card" style={{ padding: 0 }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--wi-border)" }}>
              <SectionHeader
                icon={FileText}
                title="Mandatory Pages Checklist"
                description="Required pages for merchant onboarding"
              />
            </div>
            <div className="wi-checklist">
              <ChecklistItem label="Privacy Policy"         sub="Required by law for all merchants"          state={compSum.hasPrivacyPolicy  ? "found" : "missing"} />
              <ChecklistItem label="Terms & Conditions"     sub="Governs merchant-user relationship"          state={compSum.hasTermsOfService ? "found" : "missing"} />
              <ChecklistItem label="Refund & Return Policy" sub="Mandatory for payment gateway approval"      state={compSum.hasRefundPolicy   ? "found" : "missing"} />
              <ChecklistItem label="About Us"               sub="Business identity and credibility"           state={hasAboutUs    ? "found" : "missing"} />
              <ChecklistItem label="Contact Us"             sub="Customer support reachability"               state={hasContactUs  ? "found" : "missing"} />
              <ChecklistItem label="Cancellation Policy"    sub="Verified separately or within refund policy" state={compSum.hasRefundPolicy ? "found" : "unverified"} />
              <ChecklistItem label="Shipping & Delivery"    sub="Required for e-commerce merchants"           state="unverified" />
              <ChecklistItem label="Cookie Policy"          sub="Required under DPDP / GDPR"                  state="unverified" />
              <ChecklistItem label="FAQ Page"               sub="Improves customer trust"                     state={hasFAQ ? "found" : "unverified"} />
              <ChecklistItem label="Sitemap"                sub="SEO & crawlability signal"                   state={hasSitemap ? "found" : "unverified"} />
            </div>
          </div>
        </div>

        {/* ── Website Trust & Security ── */}
        <div className="col-lg-6">
          <div className="wi-card pdf-card" style={{ padding: 0, height: "100%" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--wi-border)" }}>
              <SectionHeader
                icon={Shield}
                title="Website Trust & Security"
                description="SSL, HTTPS, and security verification"
              />
            </div>
            <div className="wi-checklist">
              <ChecklistItem
                label="HTTPS / SSL Certificate"
                sub={
                  !report.ssl?.isValid
                    ? "No valid SSL detected"
                    : report.ssl.daysRemaining < 180
                    ? `Warning: Expiring in ${report.ssl.daysRemaining} days (Below 180 days) · ${report.ssl.issuer}`
                    : `Valid · ${report.ssl.daysRemaining} days remaining · ${report.ssl.issuer}`
                }
                state={
                  !report.ssl?.isValid
                    ? "missing"
                    : report.ssl.daysRemaining < 180
                    ? "warn"
                    : "found"
                }
              />
              <ChecklistItem
                label="Secure Connection"
                sub="Website served over HTTPS protocol"
                state={report.url?.startsWith("https") ? "found" : "missing"}
              />
              <ChecklistItem
                label="No High-Risk Content"
                sub="No gambling, adult or prohibited content"
                state={(report.scores?.risk ?? 0) < 50 ? "found" : "missing"}
              />
              <ChecklistItem
                label="No Phishing Indicators"
                sub="No suspicious forms or misleading claims"
                state={(report.issues || []).some(i => /phishing|suspicious/i.test(i.title)) ? "missing" : "found"}
              />
            </div>

            {/* SSL Details */}
            {report.ssl?.isValid && (
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--wi-border)" }}>
                {report.ssl.daysRemaining < 180 && (
                  <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "var(--wi-radius-sm)", padding: "0.6rem 0.85rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "var(--wi-warning)" }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    <span><strong>SSL Expiry Warning:</strong> SSL certificate has only <strong>{report.ssl.daysRemaining} days</strong> remaining (below 180 days). Please renew your certificate soon.</span>
                  </div>
                )}
                <div style={{ background: "var(--wi-surface-2)", borderRadius: "var(--wi-radius-sm)", overflow: "hidden", border: "1px solid var(--wi-border)" }}>
                  <InfoCard label="Certificate Authority" value={report.ssl.issuer} />
                  <InfoCard label="Days Remaining" value={
                    <span style={{ 
                      color: report.ssl.daysRemaining >= 180 ? "var(--wi-success)" : "var(--wi-warning)", 
                      fontWeight: 700 
                    }}>
                      {report.ssl.daysRemaining} days {report.ssl.daysRemaining < 180 ? "⚠️ (Expiring Soon)" : ""}
                    </span>
                  } />
                  <div className="wi-info-cell" style={{ borderBottom: "none" }}>
                    <div className="wi-info-key">Valid Until</div>
                    <span className="wi-info-value">{new Date(report.ssl.validTo).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Contact + Legal info ─── */}
      <div className="row g-3 mb-4 pdf-avoid-break">

        {/* Contact Information */}
        <div className="col-lg-6">
          <div className="wi-card pdf-card" style={{ padding: 0 }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--wi-border)" }}>
              <SectionHeader icon={Mail} title="Contact Information" description="Customer-reachable contact details" />
            </div>

            {/* Email */}
            <div className="wi-contact-row" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Mail size={15} style={{ color: "var(--wi-text-muted)", flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Email</div>
                    {allEmails.length > 0 ? (
                      allEmails.slice(0, 3).map((e, i) => (
                        <div key={i} style={{ fontSize: "0.85rem", color: "var(--wi-text-primary)", fontWeight: 500, marginTop: 2 }}>
                          {e}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "var(--wi-text-muted)", marginTop: 2 }}>Not found</div>
                    )}
                  </div>
                </div>
                <div className={
                  allEmails.length === 0
                    ? "wi-contact-missing"
                    : allEmails.every(isGenericEmail)
                    ? "wi-contact-warning"
                    : "wi-contact-present"
                } style={
                  allEmails.length > 0 && allEmails.every(isGenericEmail)
                    ? { background: "var(--wi-warning-bg)", color: "var(--wi-warning)", border: "1px solid var(--wi-warning-border)", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }
                    : {}
                }>
                  {allEmails.length === 0 ? (
                    <><XCircle size={14} />Missing</>
                  ) : allEmails.every(isGenericEmail) ? (
                    <><AlertTriangle size={14} />Non-Corporate Email</>
                  ) : (
                    <><CheckCircle size={14} />Corporate Email</>
                  )}
                </div>
              </div>

              {/* Non-Corporate Email Warning Notice */}
              {allEmails.length > 0 && allEmails.every(isGenericEmail) && (
                <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.28)", borderRadius: "var(--wi-radius-sm)", padding: "0.55rem 0.75rem", display: "flex", alignItems: "center", gap: 8, fontSize: "0.78rem", color: "var(--wi-warning)", marginTop: "0.25rem" }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Non-Corporate Email Detected:</strong> Contact email uses generic <code>@{allEmails[0].split('@')[1] || "gmail.com"}</code>. Please update to an official company email (e.g. <code>contact@{report?.url ? new URL(report.url).hostname.replace(/^www\./, "") : "yourcompany.com"}</code>) for merchant onboarding compliance.
                  </div>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="wi-contact-row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Phone size={15} style={{ color: "var(--wi-text-muted)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Phone</div>
                  {allPhones.length > 0
                    ? allPhones.slice(0, 3).map((p, i) => <div key={i} style={{ fontSize: "0.85rem", color: "var(--wi-text-primary)", marginTop: 2 }}>{p}</div>)
                    : <div style={{ fontSize: "0.85rem", color: "var(--wi-text-muted)", marginTop: 2 }}>Not found</div>
                  }
                </div>
              </div>
              <div className={allPhones.length > 0 ? "wi-contact-present" : "wi-contact-missing"}>
                {allPhones.length > 0 ? <><CheckCircle size={14} />Found</> : <><XCircle size={14} />Missing</>}
              </div>
            </div>

            {/* Address */}
            <div className="wi-contact-row" style={{ borderBottom: "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <MapPin size={15} style={{ color: "var(--wi-text-muted)", flexShrink: 0, marginTop: 3 }} />
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Business Address</div>
                  {allAddresses.length > 0
                    ? allAddresses.slice(0, 2).map((a, i) => <div key={i} style={{ fontSize: "0.82rem", color: "var(--wi-text-primary)", marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{a}</div>)
                    : <div style={{ fontSize: "0.85rem", color: "var(--wi-text-muted)", marginTop: 2 }}>Not found</div>
                  }
                </div>
              </div>
              <div className={allAddresses.length > 0 ? "wi-contact-present" : "wi-contact-missing"}>
                {allAddresses.length > 0 ? <><CheckCircle size={14} />Found</> : <><XCircle size={14} />Missing</>}
              </div>
            </div>
          </div>
        </div>

        {/* Legal & Regulatory */}
        <div className="col-lg-6">
          <div className="wi-card pdf-card" style={{ padding: 0, height: "100%" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--wi-border)" }}>
              <SectionHeader icon={Gavel} title="Legal & Regulatory Information" description="Business registration and compliance identifiers" />
            </div>

            <div className="wi-contact-row">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BadgeCheck size={15} style={{ color: "var(--wi-text-muted)", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>GST Number (GSTIN)</div>
                  <div style={{ fontSize: "0.85rem", color: hasGST ? "var(--wi-text-primary)" : "var(--wi-text-muted)", marginTop: 2 }}>
                    {hasGST ? (allGstin[0] ? `${allGstin[0]} (Detected on website)` : "Detected on website") : "Not detected on website"}
                  </div>
                </div>
              </div>
              <div className={hasGST ? "wi-contact-present" : "wi-contact-missing"}>
                {hasGST ? <><CheckCircle size={14} />Found</> : <><XCircle size={14} />Missing</>}
              </div>
            </div>


            {allAddresses.length > 0 && (
              <div className="wi-contact-row" style={{ borderBottom: "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <MapPin size={15} style={{ color: "var(--wi-text-muted)", flexShrink: 0, marginTop: 3 }} />
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>Registered Address</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--wi-text-primary)", marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {allAddresses[0]}
                    </div>
                  </div>
                </div>
                <div className="wi-contact-present"><CheckCircle size={14} />Found</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── E-Commerce & Technology ─── */}
      <div className="row g-3 mb-4 pdf-avoid-break">

        {/* E-Commerce Verification */}
        <div className="col-lg-6">
          <div className="wi-card pdf-card" style={{ padding: 0 }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--wi-border)" }}>
              <SectionHeader icon={CreditCard} title="E-Commerce Verification" description="Online store and payment capability checks" />
            </div>
            <div className="wi-checklist">
              <ChecklistItem label="Product / Service Catalog"   sub="Products or services clearly listed"   state={hasProductListing ? "found" : "unverified"} />
              <ChecklistItem label="Shopping Cart / Checkout"    sub="E-commerce transaction capability"      state={hasCart ? "found" : "unverified"} />
              <ChecklistItem label="Payment Methods Displayed"   sub="Accepted payment options shown"         state={hasPaymentInfo ? "found" : "unverified"} />
              <ChecklistItem label="Order Tracking"              sub="Post-purchase tracking available"       state="unverified" />
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="col-lg-6">
          <div className="wi-card pdf-card" style={{ padding: 0, height: "100%" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--wi-border)" }}>
              <SectionHeader icon={Server} title="Technology Stack" description="Detected frameworks, platforms, and hosting" />
            </div>
            <div style={{ padding: "1.25rem 1.5rem" }}>
              {(() => {
                const techSum = report.technologySummary || {};
                const allLangs = techSum.languages || [];
                const feLangs  = ["HTML5","CSS3","JavaScript","TypeScript"];
                const feItems  = [...allLangs.filter(l => feLangs.includes(l)), ...(techSum.frontendFrameworks||[]), ...(techSum.cssFrameworks||[])];
                const beItems  = [...allLangs.filter(l => !feLangs.includes(l)), ...(techSum.backendFrameworks||[]), ...(techSum.webServers||[])];
                const groups   = [
                  { label: "Frontend",  items: [...new Set(feItems)] },
                  { label: "Backend",   items: [...new Set(beItems)] },
                  { label: "CMS",       items: techSum.cms       || [] },
                  { label: "Libraries", items: techSum.libraries || [] },
                  { label: "Hosting",   items: techSum.hosting   || [] },
                ].filter(g => g.items.length > 0);

                if (groups.length === 0) return <EmptyState icon={Server} title="No technologies detected" description="No specific frameworks matched." />;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {groups.map(({ label, items }) => (
                      <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--wi-text-muted)", textTransform: "uppercase", minWidth: 72, paddingTop: 3 }}>{label}</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {items.map((t, i) => <span key={i} className="wi-tech-pill" style={{ background: "var(--wi-accent-light)", color: "var(--wi-accent)", borderColor: "var(--wi-accent)", fontWeight: 600 }}>{t}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ─── FORM VALIDATION TESTING ─── */}
      <div className="wi-card mb-4 pdf-avoid-break" id="form-validation-section">
        <div className="wi-form-validation-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem", paddingBottom: "0.875rem", borderBottom: "1px solid var(--wi-border)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckSquare size={18} style={{ color: "var(--wi-accent)" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--wi-text-primary)", margin: 0 }}>
                Form Validation Testing
              </h3>
            </div>
            <p style={{ color: "var(--wi-text-muted)", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>
              Automated input constraint validation, format verification, and security testing
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)" }}>
              Overall Status:
            </span>
            <span className={`wi-badge ${
              overallFormHealth === "PASS" ? "wi-badge-success" :
              overallFormHealth === "FAIL" ? "wi-badge-danger" : "wi-badge-neutral"
            }`} style={{ fontWeight: 700, letterSpacing: "0.5px" }}>
              {overallFormHealth}
            </span>
          </div>
        </div>

        {/* Overview metric pill chips */}
        <div className="wi-form-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div style={{ padding: "0.75rem 1rem", background: "var(--wi-surface-2)", borderRadius: "var(--wi-radius-sm)", border: "1px solid var(--wi-border)" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--wi-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Forms Detected</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--wi-text-primary)", marginTop: 2 }}>{formTotalCount}</div>
          </div>
          <div style={{ padding: "0.75rem 1rem", background: "var(--wi-surface-2)", borderRadius: "var(--wi-radius-sm)", border: "1px solid var(--wi-border)" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--wi-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Fields Tested</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--wi-text-primary)", marginTop: 2 }}>{fieldsTestedCount}</div>
          </div>
          <div style={{ padding: "0.75rem 1rem", background: "var(--wi-surface-2)", borderRadius: "var(--wi-radius-sm)", border: "1px solid var(--wi-border)" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--wi-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Valid Fields</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--wi-success)", marginTop: 2 }}>{validFieldsCount}</div>
          </div>
          <div style={{ padding: "0.75rem 1rem", background: "var(--wi-surface-2)", borderRadius: "var(--wi-radius-sm)", border: "1px solid var(--wi-border)" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--wi-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Fields with Issues</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: invalidFieldsCount > 0 ? "var(--wi-danger)" : "var(--wi-text-muted)", marginTop: 2 }}>{invalidFieldsCount}</div>
          </div>
          <div style={{ padding: "0.75rem 1rem", background: "var(--wi-surface-2)", borderRadius: "var(--wi-radius-sm)", border: "1px solid var(--wi-border)" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--wi-text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Audit Result</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: overallFormHealth === "FAIL" ? "var(--wi-danger)" : "var(--wi-success)", marginTop: 4 }}>
              {overallFormHealth === "FAIL" ? "Action Required" : "All Passed"}
            </div>
          </div>
        </div>

        {/* Action Required Alert Box for Invalid Fields */}
        {failedFieldsList.length > 0 && (
          <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "var(--wi-radius-sm)", padding: "0.9rem 1rem", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--wi-danger)", fontWeight: 700, fontSize: "0.92rem", marginBottom: "0.35rem" }}>
              <AlertCircle size={17} />
              <span>Action Required: {failedFieldsList.length} Form Field{failedFieldsList.length > 1 ? "s" : ""} Accept Invalid Data</span>
            </div>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "var(--wi-text-secondary)", lineHeight: 1.4 }}>
              The crawler tested interactive forms and found fields allowing invalid input formats. Please apply the validation rules below:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {failedFieldsList.map((field) => (
                <div key={field.id} style={{ background: "var(--wi-surface)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "6px", padding: "0.75rem 0.9rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 700, color: "var(--wi-text-primary)", fontSize: "0.88rem" }}>
                        {field.fieldLabel}
                      </span>
                      <code style={{ fontSize: "0.72rem", background: "var(--wi-surface-2)", padding: "1px 5px", borderRadius: 4, color: "var(--wi-text-secondary)" }}>
                        &lt;input type="{field.fieldType}"&gt;
                      </code>
                      {field.required === "Yes" && (
                        <span style={{ fontSize: "0.7rem", color: "var(--wi-warning)", fontWeight: 600 }}>(Required)</span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "var(--wi-text-muted)" }}>
                      Form: <strong>{field.formName}</strong> ({field.pageTitle})
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--wi-danger)", marginBottom: "0.3rem" }}>
                    <strong>❌ Issue:</strong> {field.issueMessage}
                  </div>
                  <div style={{ fontSize: "0.78rem", background: "var(--wi-surface-2)", padding: "0.4rem 0.65rem", borderRadius: 4, borderLeft: "3px solid var(--wi-accent)", color: "var(--wi-text-primary)" }}>
                    <strong style={{ color: "var(--wi-accent)" }}>💡 Fix:</strong> {field.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clean Field-by-Field Validation Summary Table */}
        {evaluatedFields.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--wi-text-muted)", fontSize: "0.85rem", background: "var(--wi-surface-2)", borderRadius: "var(--wi-radius-sm)" }}>
            ℹ️ No interactive input forms were detected across the scanned pages of this website.
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid var(--wi-border)", borderRadius: "var(--wi-radius-sm)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--wi-surface-2)", borderBottom: "2px solid var(--wi-border)", color: "var(--wi-text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "0.65rem 0.75rem", fontWeight: 600, borderTop: "1px solid var(--wi-border)" }}>Field & Form</th>
                  <th style={{ padding: "0.65rem 0.75rem", fontWeight: 600, borderTop: "1px solid var(--wi-border)" }}>Input Type</th>
                  <th style={{ padding: "0.65rem 0.75rem", fontWeight: 600, borderTop: "1px solid var(--wi-border)" }}>Required</th>
                  <th style={{ padding: "0.65rem 0.75rem", fontWeight: 600, borderTop: "1px solid var(--wi-border)" }}>Allowed Data Rule</th>
                  <th style={{ padding: "0.65rem 0.75rem", fontWeight: 600, borderTop: "1px solid var(--wi-border)" }}>Status</th>
                  <th style={{ padding: "0.65rem 0.75rem", fontWeight: 600, borderTop: "1px solid var(--wi-border)" }}>Audit Finding & Recommended Fix</th>
                </tr>
              </thead>
              <tbody>
                {evaluatedFields.map((field, idx) => (
                  <tr key={field.id || idx} style={{ borderTop: "1px solid var(--wi-border)", borderBottom: "1px solid var(--wi-border)", background: idx % 2 === 0 ? "transparent" : "var(--wi-surface-2)", breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <td style={{ padding: "0.65rem 0.75rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--wi-text-primary)" }}>{field.fieldLabel}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--wi-text-muted)", textTransform: "capitalize" }}>
                        {field.formName} • {field.pageTitle}
                      </div>
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", padding: "2px 6px", background: "var(--wi-surface)", borderRadius: 4, border: "1px solid var(--wi-border)" }}>
                        &lt;{field.fieldType}&gt;
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem" }}>
                      <span style={{ fontWeight: 600, color: field.required === "Yes" ? "var(--wi-warning)" : "var(--wi-text-muted)" }}>
                        {field.required}
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem", fontWeight: 500, color: "var(--wi-text-primary)" }}>
                      {field.expectedRule}
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem" }}>
                      <span className={`wi-badge ${field.status === "PASS" ? "wi-badge-success" : "wi-badge-danger"}`} style={{ fontWeight: 700, fontSize: "0.7rem", padding: "2px 8px" }}>
                        {field.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.65rem 0.75rem", lineHeight: 1.4 }}>
                      {field.status === "FAIL" ? (
                        <div>
                          <div style={{ color: "var(--wi-danger)", fontWeight: 600, fontSize: "0.78rem" }}>
                            {field.findingSummary}
                          </div>
                          <div style={{ color: "var(--wi-text-muted)", fontSize: "0.74rem", marginTop: 2 }}>
                            Fix: <code style={{ fontSize: "0.72rem", background: "var(--wi-surface)", padding: "1px 4px", borderRadius: 3 }}>{field.recommendation}</code>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: "var(--wi-success)", fontSize: "0.78rem", fontWeight: 500 }}>
                          {field.findingSummary}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Collapsible raw test matrix for technical debugging */}
        {formValidationRows.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="wi-btn wi-btn-secondary"
                style={{ fontSize: "0.75rem", padding: "0.3rem 0.75rem", display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => setShowRawFormTests(!showRawFormTests)}
              >
                <Info size={13} />
                {showRawFormTests ? "Hide Technical Test Execution Log" : `Show Detailed Test Execution Log (${formValidationRows.length} raw tests)`}
              </button>
            </div>

            {showRawFormTests && (
              <div style={{ marginTop: "0.75rem", overflowX: "auto", border: "1px solid var(--wi-border)", borderRadius: "var(--wi-radius-sm)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--wi-surface-2)", borderBottom: "2px solid var(--wi-border)", color: "var(--wi-text-muted)", textTransform: "uppercase", fontSize: "0.68rem" }}>
                      <th style={{ padding: "0.5rem 0.65rem" }}>Page / Form</th>
                      <th style={{ padding: "0.5rem 0.65rem" }}>Field</th>
                      <th style={{ padding: "0.5rem 0.65rem" }}>Type</th>
                      <th style={{ padding: "0.5rem 0.65rem" }}>Required</th>
                      <th style={{ padding: "0.5rem 0.65rem" }}>Test Input Value</th>
                      <th style={{ padding: "0.5rem 0.65rem" }}>Expected</th>
                      <th style={{ padding: "0.5rem 0.65rem" }}>Actual</th>
                      <th style={{ padding: "0.5rem 0.65rem" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formValidationRows.map((row, idx) => (
                      <tr key={idx} style={{ borderTop: "1px solid var(--wi-border)", background: idx % 2 === 0 ? "transparent" : "var(--wi-surface-2)" }}>
                        <td style={{ padding: "0.5rem 0.65rem" }}>{row.pageTitle || row.page || "Page"}</td>
                        <td style={{ padding: "0.5rem 0.65rem", fontWeight: 600 }}>{row.fieldName || row.field}</td>
                        <td style={{ padding: "0.5rem 0.65rem" }}>{row.fieldType || row.type || "text"}</td>
                        <td style={{ padding: "0.5rem 0.65rem" }}>{row.required}</td>
                        <td style={{ padding: "0.5rem 0.65rem" }}>
                          <code>{row.testValue !== undefined && row.testValue !== "" ? row.testValue : '"" (empty)'}</code>
                        </td>
                        <td style={{ padding: "0.5rem 0.65rem" }}>{row.expected}</td>
                        <td style={{ padding: "0.5rem 0.65rem" }}>{row.actual}</td>
                        <td style={{ padding: "0.5rem 0.65rem" }}>
                          <span className={`wi-badge ${row.status === "PASS" ? "wi-badge-success" : "wi-badge-danger"}`} style={{ fontSize: "0.68rem" }}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MISSING ITEMS REPORT ─── */}
      {missingGroups.length > 0 && (
        <div className="wi-card mb-4 pdf-avoid-break">
          <SectionHeader
            icon={AlertTriangle}
            title="Missing Items Report"
            description="All compliance gaps identified — address these before onboarding"
          />
          <div style={{ marginTop: "1rem" }}>
            {missingGroups.map((group, gi) => (
              <div key={gi} className="wi-missing-group">
                <div className="wi-missing-group-title">
                  <group.icon size={13} />
                  {group.title}
                  <span className="wi-badge wi-badge-neutral" style={{ marginLeft: 4 }}>{group.items.length}</span>
                </div>
                {group.items.map((item, ii) => (
                  <div key={ii} className="wi-missing-item" style={{
                    borderLeft: `3px solid ${item.sev === "high" ? "var(--wi-danger)" : item.sev === "medium" ? "var(--wi-warning)" : "var(--wi-info)"}`,
                  }}>
                    <div className={`wi-missing-item-icon ${item.sev}`}>
                      {item.sev === "high"   ? <XCircle size={14} /> : <AlertCircle size={14} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="wi-missing-item-name">{item.name}</div>
                      {item.desc && <div className="wi-missing-item-desc">{item.desc}</div>}
                      {item.fix && (
                        <div className="wi-missing-item-fix">
                          🔧 <strong>How to fix:</strong> {item.fix}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.5rem",
                      borderRadius: 999, textTransform: "uppercase",
                      background: item.sev === "high" ? "var(--wi-danger-bg)" : item.sev === "medium" ? "var(--wi-warning-bg)" : "var(--wi-info-bg)",
                      color: item.sev === "high" ? "var(--wi-danger)" : item.sev === "medium" ? "var(--wi-warning)" : "var(--wi-info)",
                      border: `1px solid ${item.sev === "high" ? "var(--wi-danger-border)" : item.sev === "medium" ? "var(--wi-warning-border)" : "var(--wi-info-border)"}`,
                      flexShrink: 0,
                    }}>
                      {item.sev}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Quick Navigation to sub-reports ─── */}
      <div className="row g-3 mb-4 no-print">
        {[
          { label: "Risk Analysis",     desc: "Security threats, phishing flags, vulnerabilities",     icon: Shield,       path: `/crawler/report/${id}/risk`,       color: "var(--wi-danger)" },
          { label: "SEO Audit",         desc: "Headings, meta tags, canonical links, alt attributes",  icon: Search,       path: `/crawler/report/${id}/seo`,        color: "var(--wi-info)" },
          { label: "Compliance Review", desc: "Full policy document and clause analysis",              icon: CheckCircle,  path: `/crawler/report/${id}/compliance`,  color: "var(--wi-success)" },
          { label: "Pages Map",         desc: "All crawled pages and their URLs",                      icon: Layers,       path: `/crawler/report/${id}/pages`,       color: "var(--wi-accent)" },
        ].map(({ label, desc, icon: Icon, path, color }) => (
          <div className="col-md-6 col-lg-3" key={label}>
            <div className="wi-card" style={{ cursor: "pointer", padding: "1.25rem" }} onClick={() => navigate(path)}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--wi-text-primary)" }}>{label}</span>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)", margin: 0, lineHeight: 1.5 }}>{desc}</p>
              <div style={{ marginTop: 12, fontSize: "0.8rem", fontWeight: 600, color, display: "flex", alignItems: "center", gap: 4 }}>
                View Details <ExternalLink size={11} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── FINAL RECOMMENDATION ─── */}
      <div className={`wi-final-recommendation ${verdict.cls} pdf-avoid-break`}>
        <div className="wi-final-rec-header">
          <div style={{ fontSize: "2rem", lineHeight: 1 }}>{verdict.emoji}</div>
          <div>
            <div className="wi-final-rec-title" style={{ color: verdict.color }}>
              Final Recommendation: {verdict.verdict}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--wi-text-secondary)", marginTop: 4 }}>
              Merchant Onboarding Score: <strong>{complianceScore}/100</strong> · Risk Level: <strong>{report.riskSeverity}</strong>
            </div>
          </div>
        </div>

        {verdict.reasons.length > 0 ? (
          <>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
              Issues Affecting This Decision:
            </div>
            <div className="wi-final-rec-issues">
              {verdict.reasons.map((r, i) => (
                <div key={i} className="wi-final-rec-issue">
                  {r.sev === "HIGH" ? <XCircle size={15} style={{ color: "var(--wi-danger)", flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={15} style={{ color: "var(--wi-warning)", flexShrink: 0, marginTop: 1 }} />}
                  {r.text}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ fontSize: "0.9rem", color: "var(--wi-text-secondary)" }}>
            ✅ This website meets all minimum onboarding requirements. No blocking issues detected.
          </div>
        )}
      </div>

    </div>
  );
}
