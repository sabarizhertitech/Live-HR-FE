import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { portalInstance } from "../Services/instance";
import {
  Globe,
  Shield,
  Activity,
  FileText,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  Search,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  X,
} from "lucide-react";
import StatCard from "./common/StatCard";
import StatusBadge from "./common/StatusBadge";
import EmptyState from "./common/EmptyState";
import SectionHeader from "./common/SectionHeader";
import Pagination from "../Components/Employee/Pagination/Pagination";
import "../Components/Employee/Pagination/Pagination.css";
import CustomDropdown from "../Components/Common/CustomDropdown";
import "../Components/Common/CustomDropdown.css";
import "../Globel/Layout.css";
import FilterIconImg from "../../public/Filter.svg?url";

const STATUS_FILTER_OPTIONS = [
  { label: "All Status", value: "ALL" },
  { label: "Completed", value: "completed" },
  { label: "Crawling", value: "crawling" },
  { label: "Analyzing", value: "analyzing" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
];

const RISK_FILTER_OPTIONS = [
  { label: "All Risk", value: "ALL" },
  { label: "High Risk", value: "HIGH" },
  { label: "Medium Risk", value: "MEDIUM" },
  { label: "Low Risk", value: "LOW" },
];

const PAGE_SIZE_OPTIONS = [
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
];

export default function CrawlerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalWebsitesScanned: 0,
    averageScores: { risk: 0, seo: 0, security: 0, compliance: 0 },
    severityBreakdown: { LOW: 0, MEDIUM: 0, HIGH: 0 },
    topIssues: [],
    complianceRate: 0,
  });
  const [reports, setReports]           = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState(null);

  // Pagination & Server Filters
  const [currentPage, setCurrentPage]         = useState(1);
  const [pageSize, setPageSize]               = useState(5); // Default 5 per record
  const [showFilterMenu, setShowFilterMenu]   = useState(false);

  // Draft filters inside the collapsible panel
  const [draftSearch, setDraftSearch]         = useState("");
  const [draftStatus, setDraftStatus]         = useState("ALL");
  const [draftRisk, setDraftRisk]             = useState("ALL");

  // Applied filters sent to Backend
  const [appliedSearch, setAppliedSearch]     = useState("");
  const [appliedStatus, setAppliedStatus]     = useState("ALL");
  const [appliedRisk, setAppliedRisk]         = useState("ALL");

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    report: null,
    isDeleting: false,
    error: null,
  });

  const handleApplyFilters = () => {
    setAppliedSearch(draftSearch);
    setAppliedStatus(draftStatus);
    setAppliedRisk(draftRisk);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setDraftSearch("");
    setDraftStatus("ALL");
    setDraftRisk("ALL");
    setAppliedSearch("");
    setAppliedStatus("ALL");
    setAppliedRisk("ALL");
    setCurrentPage(1);
  };

  const fetchDashboardStats = async () => {
    try {
      const statsRes = await portalInstance.get("/web/crawler/dashboard/stats");
      if (statsRes.data?.success) setStats(statsRes.data.stats);
    } catch (err) {
      console.error("Dashboard stats loading error:", err);
    }
  };

  const fetchReports = async (page = currentPage, limit = pageSize, sVal = appliedSearch, statusVal = appliedStatus, riskVal = appliedRisk) => {
    setTableLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit,
      };
      if (sVal && sVal.trim()) params.search = sVal.trim();
      if (statusVal && statusVal !== "ALL") params.status = statusVal;
      if (riskVal && riskVal !== "ALL") params.riskSeverity = riskVal;

      const listRes = await portalInstance.get("/web/crawler/reports", { params });
      if (listRes.data?.success) {
        setReports(listRes.data.reports || []);
        if (listRes.data.pagination) {
          setTotalReports(listRes.data.pagination.total ?? 0);
        } else {
          setTotalReports((listRes.data.reports || []).length);
        }
      }
    } catch (err) {
      console.error("Dashboard reports loading error:", err);
      setError("Failed to fetch crawler data. Make sure the backend server is running.");
    } finally {
      setLoading(false);
      setTableLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    fetchReports(currentPage, pageSize, appliedSearch, appliedStatus, appliedRisk);
  }, [currentPage, pageSize, appliedSearch, appliedStatus, appliedRisk]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
    fetchReports(currentPage, pageSize, appliedSearch, appliedStatus, appliedRisk);
  };

  const openDeleteModal = (report, e) => {
    e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      report,
      isDeleting: false,
      error: null,
    });
  };

  const closeDeleteModal = () => {
    if (deleteModal.isDeleting) return;
    setDeleteModal({
      isOpen: false,
      report: null,
      isDeleting: false,
      error: null,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.report?._id || deleteModal.isDeleting) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true, error: null }));
    try {
      const res = await portalInstance.delete(`/web/crawler/reports/${deleteModal.report._id}`);
      if (res.data?.success) {
        fetchReports(currentPage, pageSize, appliedSearch, appliedStatus, appliedRisk);
        fetchDashboardStats();
        setDeleteModal({
          isOpen: false,
          report: null,
          isDeleting: false,
          error: null,
        });
      } else {
        setDeleteModal((prev) => ({
          ...prev,
          isDeleting: false,
          error: res.data?.message || "Failed to delete intelligence report.",
        }));
      }
    } catch (err) {
      console.error("Delete report error:", err);
      setDeleteModal((prev) => ({
        ...prev,
        isDeleting: false,
        error: err.response?.data?.message || err.message || "Failed to delete report.",
      }));
    }
  };

  const riskColor = (score, isRisk) => {
    if (isRisk) {
      if (score <= 30) return "var(--wi-success)";
      if (score <= 60) return "var(--wi-warning)";
      return "var(--wi-danger)";
    } else {
      if (score >= 70) return "var(--wi-success)";
      if (score >= 40) return "var(--wi-warning)";
      return "var(--wi-danger)";
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="wi-loading-page">
        <div className="wi-loading-card">
          <div className="wi-spinner mx-auto mb-4" style={{ width: 36, height: 36, borderWidth: 3 }} />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--wi-text-primary)", marginBottom: 6 }}>
            Loading Dashboard
          </h2>
          <p style={{ color: "var(--wi-text-muted)", fontSize: "0.875rem", margin: 0 }}>
            Fetching intelligence data…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page heading */}
      <div className="wi-dashboard-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--wi-text-primary)", margin: 0, letterSpacing: "-0.3px" }}>
            Website Intelligence Dashboard
          </h1>
          <p style={{ color: "var(--wi-text-muted)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
            Enterprise website risk, compliance &amp; vulnerability analysis
          </p>
        </div>

        <div className="wi-dashboard-actions" style={{ display: "flex", gap: "0.625rem" }}>
          <button
            className="wi-btn wi-btn-secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? "wi-spin-icon" : ""} style={{ animation: refreshing ? "wi-spin 0.7s linear infinite" : "none" }} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className="wi-btn wi-btn-primary"
            onClick={() => navigate("/crawler/analyze")}
          >
            <Plus size={14} />
            New Scan
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="wi-alert wi-alert-danger" style={{ marginBottom: "1.25rem" }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <StatCard
            icon={Globe}
            label="Websites Scanned"
            value={stats.totalWebsitesScanned}
            sub="Total indexed profiles"
            color="indigo"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon={Shield}
            label="Avg Risk Score"
            value={`${stats.averageScores.risk}%`}
            sub="Lower is better"
            color="red"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon={Activity}
            label="Avg Compliance"
            value={`${stats.averageScores.compliance}%`}
            sub="Legal policy index"
            color="green"
          />
        </div>
        <div className="col-6 col-lg-3">
          <StatCard
            icon={CheckCircle}
            label="Highly Compliant"
            value={`${stats.complianceRate}%`}
            sub="Score ≥ 70%"
            color="amber"
          />
        </div>
      </div>

      {/* Main grid */}
      <div className="row g-3">
        {/* Domain table */}
        <div className="col-lg-12">
          <div className="wi-card" style={{ padding: 0 }}>
            {/* Card header with Per-Page on left of Filter Icon */}
            <div className="wi-dashboard-table-header">
              <div className="wi-dashboard-table-title">
                <Globe size={16} style={{ color: "var(--wi-accent)" }} />
                <span>Scanned Domains</span>
                <span className="wi-badge wi-badge-neutral">{totalReports}</span>
              </div>

              {/* Top controls: Page per record on the left side of the filter icon */}
              <div className="wi-dashboard-table-controls">
                <div className="wc-page-size-wrap">
                  <CustomDropdown
                    options={PAGE_SIZE_OPTIONS}
                    value={pageSize}
                    onChange={(val) => {
                      setPageSize(Number(val));
                      setCurrentPage(1);
                    }}
                    className="ta-page-size-dropdown wc-page-size-select"
                    placeholder="5"
                  />
                </div>

                {/* Filter Icon button (placed on the right side of Page per record dropdown) */}
                <div
                  className={`wc-filter-icon-btn dwu-employee-filter-icon ${showFilterMenu ? "active" : ""}`}
                  onClick={() => setShowFilterMenu((prev) => !prev)}
                  title={showFilterMenu ? "Hide Filters" : "Filter Options"}
                  role="button"
                  tabIndex={0}
                >
                  <img src={FilterIconImg || "/Filter.svg"} alt="filter" />
                </div>
              </div>
            </div>

            {/* COLLAPSIBLE FILTER MENU (Task Page Style) */}
            {showFilterMenu && (
              <div className="wc-filter-row">
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md">
                    <label className="wc-filter-label">Domain Search</label>
                    <input
                      type="text"
                      className="wc-filter-input"
                      placeholder="Search domain..."
                      value={draftSearch}
                      onChange={(e) => setDraftSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleApplyFilters();
                      }}
                    />
                  </div>

                  <div className="col-12 col-md">
                    <label className="wc-filter-label">Status</label>
                    <CustomDropdown
                      options={STATUS_FILTER_OPTIONS}
                      value={draftStatus}
                      onChange={setDraftStatus}
                      placeholder="All Status"
                    />
                  </div>

                  <div className="col-12 col-md">
                    <label className="wc-filter-label">Risk Level</label>
                    <CustomDropdown
                      options={RISK_FILTER_OPTIONS}
                      value={draftRisk}
                      onChange={setDraftRisk}
                      placeholder="All Risk"
                    />
                  </div>

                  <div className="col-12">
                    <div className="wc-filter-btn-container">
                      <button
                        type="button"
                        className="hrms-common-btn-cancel"
                        onClick={handleResetFilters}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="hrms-common-btn-primary"
                        onClick={handleApplyFilters}
                      >
                        Search
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {reports.length === 0 ? (
              <EmptyState
                icon={Globe}
                title={appliedSearch || appliedStatus !== "ALL" || appliedRisk !== "ALL" ? "No matching scans found" : "No scans yet"}
                description={appliedSearch || appliedStatus !== "ALL" || appliedRisk !== "ALL" ? "Try adjusting your search or filters." : "Run your first scan to see results here."}
                action={
                  (!appliedSearch && appliedStatus === "ALL" && appliedRisk === "ALL") && (
                    <button className="wi-btn wi-btn-primary" onClick={() => navigate("/crawler/analyze")}>
                      <Plus size={14} /> Start First Scan
                    </button>
                  )
                }
              />
            ) : (
              <>
                <div style={{ overflowX: "auto", opacity: tableLoading ? 0.6 : 1, transition: "opacity 0.2s ease", padding: "10px" }}>
                  <table className="wi-table">
                    <thead>
                      <tr>
                        <th>Domain</th>
                        <th style={{ textAlign: "center" }}>Pages</th>
                        <th style={{ textAlign: "center" }}>Risk</th>
                        <th style={{ textAlign: "center" }}>Compliance</th>
                        <th style={{ textAlign: "center" }}>Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr
                          key={report._id}
                          onClick={() => {
                            if (["completed", "failed", "cancelled"].includes(report.status)) {
                              navigate(`/crawler/report/${report._id}`);
                            } else {
                              navigate(`/crawler/analyze/${report._id}`);
                            }
                          }}
                        >
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                background: "var(--wi-accent-light)",
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}>
                                <Globe size={12} style={{ color: "var(--wi-accent)" }} />
                              </div>
                              <div>
                                <div className="wi-truncate" style={{ maxWidth: 220, fontWeight: 500, fontSize: "0.875rem", color: "var(--wi-text-primary)" }}>
                                  {report.url}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--wi-text-muted)" }}>
                                  {new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 500 }}>
                            {report.totalPagesScanned ?? "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {report.status === "completed" ? (
                              <span style={{ fontWeight: 700, fontSize: "0.875rem", color: riskColor(report.scores?.risk, true) }}>
                                {report.scores?.risk ?? "—"}%
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {report.status === "completed" ? (
                              <span style={{ fontWeight: 700, fontSize: "0.875rem", color: riskColor(report.scores?.compliance, false) }}>
                                {report.scores?.compliance ?? "—"}%
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <StatusBadge status={report.status} label={report.status?.toUpperCase()} />
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                              <button
                                className="wi-btn wi-btn-ghost wi-btn-icon"
                                title={["completed", "failed", "cancelled"].includes(report.status) ? "View Report" : "View Live Progress"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (["completed", "failed", "cancelled"].includes(report.status)) {
                                    navigate(`/crawler/report/${report._id}`);
                                  } else {
                                    navigate(`/crawler/analyze/${report._id}`);
                                  }
                                }}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className="wi-btn wi-btn-danger wi-btn-icon"
                                title="Delete"
                                onClick={(e) => openDeleteModal(report, e)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with Centered Pagination */}
                <div
                  className="wi-table-pagination-footer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "12px 1.4rem",
                    borderTop: "1px solid var(--wi-border)",
                    background: "var(--wi-surface, #ffffff)",
                  }}
                >
                  <Pagination
                    totalItems={totalReports}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    onPageChange={(page) => setCurrentPage(page)}
                    maxPagesInGroup={5}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Popup Form ── */}
      {deleteModal.isOpen && (
        <div className="wi-modal-overlay" onClick={closeDeleteModal}>
          <div className="wi-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="wi-modal-header">
              <div className="wi-modal-title-wrap">
                {/* <div className="wi-modal-icon-badge danger">
                  <Trash2 size={18} />
                </div> */}
                <h3 className="wi-modal-title">Delete Report</h3>
              </div>
              <button
                type="button"
                className="wi-modal-close-btn"
                onClick={closeDeleteModal}
                disabled={deleteModal.isDeleting}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="wi-modal-body">

              {deleteModal.report?.url && (
                <div className="wi-modal-target-card">
                  <Globe size={15} style={{ color: "var(--wi-accent)", flexShrink: 0 }} />
                  <span className="wi-truncate" style={{ fontSize: "0.85rem" }}>
                    {deleteModal.report.url}
                  </span>
                </div>
              )}

              <p style={{ fontSize: "12px", color: "var(--wi-text-muted)", marginTop: "0.75rem", marginBottom: 0 , fontWeight: "400" }}>
                This action permanently purges this report, crawled pages, audit history, and associated logs from both the database and dashboard.
              </p>

              {deleteModal.error && (
                <div className="wi-alert wi-alert-danger" style={{ marginTop: "0.85rem", padding: "0.55rem 0.75rem", fontSize: "0.82rem" }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{deleteModal.error}</span>
                </div>
              )}
            </div>

            <div className="wi-modal-footer">
              <button
                type="button"
                className="common-modal-btn btn-small-cancel"
                onClick={closeDeleteModal}
                disabled={deleteModal.isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="common-modal-btn btn-reject"
                onClick={handleConfirmDelete}
                disabled={deleteModal.isDeleting}
              >
                {deleteModal.isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
