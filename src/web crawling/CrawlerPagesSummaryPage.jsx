import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portalInstance } from "../Services/instance";
import {
  ArrowLeft,
  Layers,
  ExternalLink,
  AlertTriangle,
  Globe,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import SectionHeader from "./common/SectionHeader";
import StatusBadge from "./common/StatusBadge";
import EmptyState from "./common/EmptyState";

export default function CrawlerPagesSummaryPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [report, setReport] = useState(null);
  const [pages, setPages]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [hoveredPage, setHoveredPage] = useState(null);

  // Pagination calculations
  const totalPages = Math.ceil(pages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPages = pages.slice(startIndex, endIndex);

  // Reset current page if totalPages changes and page is out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [itemsPerPage, totalPages, currentPage]);

  const getPageNumbers = () => {
    const delta = 1; // Number of page numbers to show around current page
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l > 2) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

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
          setError("Failed to fetch pages.");
        }
      } catch (err) {
        console.error("Error loading pages:", err);
        setError("Database communication failure loading pages.");
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
            Loading Pages Audit
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
            Unable to Load Pages
          </h2>
          <button className="wi-btn wi-btn-primary" onClick={() => navigate("/")}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
          <div style={{ width: 38, height: 38, background: "var(--wi-accent-light)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Layers size={18} style={{ color: "var(--wi-accent)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--wi-text-primary)", margin: 0 }}>
              Crawled Pages Directory
            </h1>
            <div style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)" }}>{report.url}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--wi-text-primary)", lineHeight: 1 }}>
              {pages.length}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)" }}>total pages discovered</span>
          </div>
          <div>
            <p style={{ fontSize: "0.825rem", color: "var(--wi-text-secondary)", margin: 0, maxWidth: 480 }}>
              Comprehensive list of internal URLs successfully mapped within the target domain.
            </p>
          </div>
        </div>
      </div>

      {/* Pages Table */}
      <div className="wi-card" style={{ marginTop: "1rem" }}>
        <SectionHeader
          icon={Globe}
          title={`Website Architecture (${pages.length})`}
          description="Click a page link to open it in a new tab"
        />

        {pages.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="No pages found"
            description="The crawler didn't index any internal pages."
          />
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className="wi-table">
                <thead>
                  <tr>
                    <th>Page Title / Address</th>
                    <th>Status</th>
                    <th>Depth</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPages.map((page, idx) => (
                    <tr key={startIndex + idx}>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: "0.85rem", color: "var(--wi-text-primary)", marginBottom: 2 }}>
                          {page.title || "Untitled Page"}
                        </div>
                        <div className="wi-mono wi-truncate" style={{ maxWidth: 400, fontSize: "0.78rem", color: "var(--wi-text-secondary)" }}>
                          {page.url}
                        </div>
                      </td>
                      <td>
                        <span className={`wi-badge ${page.statusCode === 200 ? "wi-badge-success" : "wi-badge-warning"}`}>
                          {page.statusCode || "—"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "var(--wi-text-muted)" }}>
                          Level {page.depth}
                        </span>
                      </td>
                      <td>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wi-btn wi-btn-ghost wi-btn-sm"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          Open <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Control */}
            <div className="wi-pages-pagination-footer" style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1.25rem",
              paddingTop: "1.25rem",
              borderTop: "1px solid var(--wi-border)",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              {/* Left Controls: Summary & Items Per Page selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--wi-text-secondary)" }}>
                  Showing <strong style={{ color: "var(--wi-text-primary)" }}>{pages.length > 0 ? startIndex + 1 : 0}</strong> to <strong style={{ color: "var(--wi-text-primary)" }}>{Math.min(endIndex, pages.length)}</strong> of <strong style={{ color: "var(--wi-text-primary)" }}>{pages.length}</strong> pages
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--wi-text-secondary)" }}>
                  <span>Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "var(--wi-radius-sm)",
                      border: "1px solid var(--wi-border)",
                      background: "var(--wi-surface)",
                      color: "var(--wi-text-primary)",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      outline: "none"
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span>entries</span>
                </div>
              </div>

              {/* Right Controls: Navigation Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <button
                  className="wi-btn wi-btn-secondary wi-btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  style={{
                    padding: "0.35rem 0.5rem",
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer"
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                
                {getPageNumbers().map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <span
                        key={`dot-${idx}`}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.8rem",
                          color: "var(--wi-text-muted)"
                        }}
                      >
                        ...
                      </span>
                    );
                  }
                  const isCurrent = pageNum === currentPage;
                  const isHovered = hoveredPage === pageNum;
                  return (
                    <button
                      key={`page-${pageNum}`}
                      onClick={() => setCurrentPage(pageNum)}
                      onMouseEnter={() => setHoveredPage(pageNum)}
                      onMouseLeave={() => setHoveredPage(null)}
                      style={{
                        minWidth: "30px",
                        height: "30px",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "var(--wi-radius-sm)",
                        fontSize: "0.8rem",
                        fontWeight: isCurrent ? 600 : 500,
                        cursor: "pointer",
                        border: "1px solid",
                        borderColor: isCurrent 
                          ? "var(--wi-accent)" 
                          : isHovered 
                            ? "var(--wi-border-strong)" 
                            : "var(--wi-border)",
                        background: isCurrent 
                          ? "var(--wi-accent)" 
                          : isHovered 
                            ? "var(--wi-surface-2)" 
                            : "var(--wi-surface)",
                        color: isCurrent 
                          ? "var(--wi-text-inverse)" 
                          : "var(--wi-text-primary)",
                        transition: "var(--wi-transition)"
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  className="wi-btn wi-btn-secondary wi-btn-sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  style={{
                    padding: "0.35rem 0.5rem",
                    opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1,
                    cursor: (currentPage === totalPages || totalPages === 0) ? "not-allowed" : "pointer"
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
