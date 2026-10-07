// CheckerDashboard.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "../../HeaderSidebar/Sidebar";
import "./Checkerdashboard.css";
import "../../Employee/Secure/Security.css";
import { portalInstance } from "../../../Services/instance";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import SecurityModels from "../../Employee/Secure/SecurityModels";
import "react-toastify/dist/ReactToastify.css";
import Pagination from "../../Employee/Pagination/Pagination";
import CustomDropdown from "../../Common/CustomDropdown";
import { Download, X } from "lucide-react";
import Dropdown from "../../../assets/dropdown.png";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TABS = ["All", "Pending Approval", "Staff Approvals", "Approved", "Rejected"];

const STATUS_MAP = {
  "All": null,
  "Pending Approval": "PENDING_APPROVAL",
  "Staff Approvals": "STAFF_APPROVALS",
  "Approved": "APPROVED",
  "Rejected": "REJECTED",
};

const STATUS_STYLE = {
  PENDING_APPROVAL: { background: "#FFF3CD", color: "#856404" },
  APPROVED: { background: "#D1FAE5", color: "#065F46" },
  REJECTED: { background: "#FFE4E4", color: "#B91C1C" },
};

const TYPE_STYLE = {
  CODE: { background: "#EDE9FE", color: "#6D28D9" },
  GIT: { background: "#FEF3C7", color: "#D97706" },
  SERVER: { background: "#DBEAFE", color: "#2563EB" },
  AWS: { background: "#FFF7ED", color: "#EA580C" },
  MONGODB: { background: "#DCFCE7", color: "#166534" },
  OTHER: { background: "#F3F4F6", color: "#374151" },
};

const SUMMARY_CARDS = [
  {
    label: "Pending Approval",
    key: "PENDING_APPROVAL",
    color: "#7A7FA6",
    bg: "#FFFFFF",
  },
  {
    label: "Approved",
    key: "APPROVED",
    color: "#7A7FA6",
    bg: "#FFFFFF",
  },
  {
    label: "Rejected",
    key: "REJECTED",
    color: "#7A7FA6",
    bg: "#FFFFFF",
  },
];



// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return (
    dt.toLocaleDateString("en-GB").replace(/\//g, "-") +
    "  " +
    dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
};

const isPastDue = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);

  return (
    now.getFullYear() > due.getFullYear() ||
    (now.getFullYear() === due.getFullYear() &&
      now.getMonth() > due.getMonth()) ||
    (now.getFullYear() === due.getFullYear() &&
      now.getMonth() === due.getMonth() &&
      now.getDate() > due.getDate())
  );
};

// ─── Badge Components ─────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = STATUS_STYLE[status] || { background: "#F3F4F6", color: "#374151" };
  return (
    <span style={{
      ...s, padding: "3px 10px", borderRadius: "6px",
      fontSize: "0.68rem", fontWeight: 500, whiteSpace: "nowrap",
      display: "inline-block",
    }}>
      {status?.replace(/_/g, " ") || "-"}
    </span>
  );
};

const TypeBadge = ({ type }) => {
  const s = TYPE_STYLE[type] || TYPE_STYLE.OTHER;
  return (
    <span style={{
      ...s, padding: "3px 10px", borderRadius: "6px",
      fontSize: "0.68rem", fontWeight: 600, whiteSpace: "nowrap",
      display: "inline-block",
    }}>
      {type || "-"}
    </span>
  );
};

// ─── Log Timeline ─────────────────────────────────────────────────────────────
const LOG_COLOR = {
  CREATED: "#5977f8",
  APPROVED: "#059669",
  REJECTED: "#DC2626",
};

const LogTimeline = ({ logs }) => {
  if (!logs?.length) return <p style={{ fontSize: "12px", color: "#9ca3af" }}>No activity yet.</p>;
  return (
    <div style={{ paddingLeft: "18px" }}>
      {logs.map((log, idx) => (
        <div key={idx} style={{ position: "relative", marginBottom: idx < logs.length - 1 ? "16px" : 0 }}>
          {idx < logs.length - 1 && (
            <div style={{
              position: "absolute", left: "-13px", top: "18px",
              width: "1px", height: "calc(100% + 4px)", background: "#e5e7eb",
            }} />
          )}
          <div style={{
            position: "absolute", left: "-18px", top: "4px",
            width: "10px", height: "10px", borderRadius: "50%",
            background: LOG_COLOR[log.action] || "#6B7280",
            border: "2px solid #fff",
            boxShadow: `0 0 0 2px ${LOG_COLOR[log.action] || "#6B7280"}33`,
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: LOG_COLOR[log.action] || "#374151" }}>
              {log.action}
            </span>
            <span style={{ fontSize: "10px", color: "#9ca3af" }}>{formatDateTime(log.timestamp)}</span>
          </div>
          <p style={{ fontSize: "11px", color: "#6b7280", margin: "0 0 2px" }}>
            By: <strong style={{ color: "#3A466D" }}>{log.by?.name || "System"}</strong>
          </p>
          {log.remark && (
            <p style={{
              fontSize: "11px", color: "#374151",
              background: "#f9fafb", borderRadius: "4px",
              padding: "4px 8px", margin: "4px 0 0",
              border: "1px solid #e5e7eb",
            }}>
              "{log.remark}"
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Request Detail Slide Panel ───────────────────────────────────────────────
const DetailPanel = ({ request, onClose, onActionDone }) => {
  const [rejectRemark, setRejectRemark] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const currentUserId = useMemo(() => {
    try {
      const sessionData = sessionStorage.getItem("Erti-Portal");
      const token = sessionData ? JSON.parse(sessionData)?.token : "";
      if (!token) return null;
      const decoded = jwtDecode(token);
      return decoded?.id || decoded?._id || decoded?.userId || null;
    } catch {
      return null;
    }
  }, []);

  const isChecker = useMemo(() => {
    if (!currentUserId || !request?.checkerId) return false;
    return Array.isArray(request.checkerId)
      ? request.checkerId.some(c => String(c?._id || c) === String(currentUserId))
      : String(request.checkerId?._id || request.checkerId) === String(currentUserId);
  }, [currentUserId, request]);

  const isCC = useMemo(() => {
    if (!currentUserId || !request?.ccId) return false;
    return Array.isArray(request.ccId)
      ? request.ccId.some(c => String(c?._id || c) === String(currentUserId))
      : String(request.ccId?._id || request.ccId) === String(currentUserId);
  }, [currentUserId, request]);

  const currentApprover = request?.approvers?.find(
    a => String(a.employee?._id || a.employee) === String(currentUserId)
  );
  const hasNotProcessed = currentApprover ? currentApprover.status === "PENDING" : true;

  const canApproveReject = isChecker && request?.status === "PENDING_APPROVAL" && hasNotProcessed;

  const handleApprove = async () => {
    try {
      setActionLoading("approve");
      await portalInstance.post(`/security/approve/${request._id}`);
      toast.success("Request approved!");
      onActionDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed");
    } finally {
      setActionLoading("");
    }
  };

  const handleReject = async () => {
    if (!rejectRemark.trim()) { toast.error("Remark is required"); return; }
    try {
      setActionLoading("reject");
      await portalInstance.post(`/security/reject/${request._id}`, { remark: rejectRemark });
      toast.success("Request rejected.");
      onActionDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed");
    } finally {
      setActionLoading("");
    }
  };



  const renderRequestData = (type, data) => {
    if (!data || !Object.keys(data).length) return null;
    const labels = { repo: "Repository", branch: "Branch", commitId: "Commit ID", serverName: "Server Name" };
    return (
      <div className="checker__detail-data-box">
        <p className="checker__detail-data-label">{type} DETAILS</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
          {Object.entries(data).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="checker__field-label" style={{ margin: 0 }}>{labels[k] || k}</span>
              <code className="checker__code-pill" style={{ margin: 0 }}>{v}</code>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="checker__panel-overlay">
      <div className="checker__panel" onClick={(e) => e.stopPropagation()}>

        {/* Panel Header */}
        <div className="checker__panel-header">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3 className="checker__panel-title">Request Details</h3>
              <TypeBadge type={request.requestType} />
              <StatusBadge status={request.status} />
            </div>
          </div>
          <button className="checker__panel-close" onClick={onClose}>✕</button>
        </div>

        <div className="checker__panel-body">
          {isCC && (
            <div style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span style={{ fontSize: "14px" }}>ℹ</span>
              This request is CC'd to you.
            </div>
          )}

          {/* Info Grid */}
          <div className="checker__info-grid">
            <div className="checker__info-item">
              <span className="checker__field-label">Title</span>
              <span className="checker__field-value checker__request-title">{request.title}</span>
            </div>
            <div className="checker__info-item">
              <span className="checker__field-label">Maker</span>
              <span className="checker__field-value">{request.makerId?.name || "-"}</span>
            </div>
            <div className="checker__info-item">
              <span className="checker__field-label">Due Date</span>
              <span className="checker__field-value" style={{
                color: isPastDue(request.dueDate) && request.status === "PENDING_APPROVAL"
                  ? "#DC2626" : "#3A466D",
              }}>
                {formatDate(request.dueDate)}
                {isPastDue(request.dueDate) && request.status === "PENDING_APPROVAL" && (
                  <span style={{ marginLeft: "6px", fontSize: "10px", background: "#FFE4E4", color: "#DC2626", padding: "1px 6px", borderRadius: "4px" }}>
                    OVERDUE
                  </span>
                )}
              </span>
            </div>
            <div className="checker__info-item">
              <span className="checker__field-label">Created</span>
              <span className="checker__field-value">{formatDate(request.createdAt)}</span>
            </div>
          </div>

          {/* Description */}
          {request.description && (
            <div className="checker__section">
              <span className="checker__field-label">Description</span>
              <p className="checker__description">{request.description}</p>
            </div>
          )}

          {/* Request-type specific data */}
          {renderRequestData(request.requestType, request.requestData)}

          {/* Reject remark input */}
          {showRejectBox && (
            <div className="checker__reject-box">
              <span className="checker__field-label">Rejection Reason *</span>
              <textarea
                className="checker__reject-textarea"
                placeholder="Provide reason for rejection..."
                value={rejectRemark}
                onChange={(e) => setRejectRemark(e.target.value)}
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button
                  className="checker__btn checker__btn--reject-confirm"
                  onClick={handleReject}
                  disabled={actionLoading === "reject"}
                >
                  {actionLoading === "reject" ? "Rejecting..." : "Confirm Reject"}
                </button>
                <button
                  className="checker__btn checker__btn--ghost"
                  onClick={() => { setShowRejectBox(false); setRejectRemark(""); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Activity Log */}
          <div className="checker__section">
            <span className="checker__field-label" style={{ display: "block", marginBottom: "12px" }}>
              Activity Log
            </span>
            <LogTimeline logs={request.logs} />
          </div>
        </div>

        {/* Panel Footer Actions */}
        <div className="checker__panel-footer">
          <button className="checker__btn checker__btn--ghost" onClick={onClose}>Cancel</button>

          {canApproveReject && !showRejectBox && (
            <>
              <button
                className="checker__btn checker__btn--reject"
                onClick={() => setShowRejectBox(true)}
                disabled={!!actionLoading}
              >
                Reject
              </button>
              <button
                className="checker__btn checker__btn--approve"
                onClick={handleApprove}
                disabled={actionLoading === "approve"}
              >
                {actionLoading === "approve" ? "Approving..." : " Approve"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CheckerDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dateMode, setDateMode] = useState("Today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applySearch, setApplySearch] = useState(true);
  const [shouldFetch, setShouldFetch] = useState(true);

  // Pagination page size state
  const [pageSize, setPageSize] = useState(5);

  // Custom dropdown states
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const [isDateModeOpen, setIsDateModeOpen] = useState(false);
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);
  const [selectedDownloadTypes, setSelectedDownloadTypes] = useState([]);

  // Collapsible multi-filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterTicketId, setFilterTicketId] = useState("");
  const [filterTitleDesc, setFilterTitleDesc] = useState("");
  const [filterMakerId, setFilterMakerId] = useState("");
  const [filterCheckerId, setFilterCheckerId] = useState("");
  const [filterRequestType, setFilterRequestType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCreatedFrom, setFilterCreatedFrom] = useState("");
  const [filterCreatedTo, setFilterCreatedTo] = useState("");
  const [filterDueFrom, setFilterDueFrom] = useState("");
  const [filterDueTo, setFilterDueTo] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    ticketId: "",
    titleDesc: "",
    makerId: "",
    checkerId: "",
    requestType: "",
    status: "",
    createdFrom: "",
    createdTo: "",
    dueFrom: "",
    dueTo: ""
  });

  const todayStr = new Date().toISOString().split("T")[0];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setIsPageSizeOpen(false);
      setIsDateModeOpen(false);
      setShowDownloadPanel(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch employees for Maker and Approver selectors
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await portalInstance.get("/data/employees");
      setEmployees(res.data.data || []);
    } catch (err) {
      console.error("Employee fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const uniqueMakers = employees;
  const uniqueCheckers = employees;

  // ─── Get current user id from token ───────────────────────────────────
  const currentUserId = useMemo(() => {
    try {
      const sessionData = sessionStorage.getItem("Erti-Portal");
      const token = sessionData ? JSON.parse(sessionData)?.token : "";
      if (!token) return null;
      const decoded = jwtDecode(token);
      return decoded?.id || decoded?._id || decoded?.userId || null;
    } catch {
      return null;
    }
  }, []);

  const getDisplayStatus = (req) => {
    if (req.status !== "PENDING_APPROVAL") return req.status;
    const currentApprover = req.approvers?.find(a => String(a.employee?._id || a.employee) === String(currentUserId));
    if (currentApprover && currentApprover.status !== "PENDING") {
      return currentApprover.status;
    }
    return req.status;
  };

  // ─── Build query params ────────────────────────────────────────────────
  const buildQuery = () => {
    const params = [];

    // Add committed appliedFilters search query parameters
    if (appliedFilters.ticketId) params.push(`ticketId=${encodeURIComponent(appliedFilters.ticketId)}`);
    if (appliedFilters.titleDesc) params.push(`titleDesc=${encodeURIComponent(appliedFilters.titleDesc)}`);
    if (appliedFilters.makerId) params.push(`makerId=${appliedFilters.makerId}`);
    if (appliedFilters.checkerId) params.push(`checkerId=${appliedFilters.checkerId}`);
    if (appliedFilters.requestType) params.push(`requestType=${appliedFilters.requestType}`);
    if (appliedFilters.status) params.push(`status=${appliedFilters.status}`);

    if (appliedFilters.createdFrom && appliedFilters.createdTo) {
      params.push(`fromDate=${appliedFilters.createdFrom}`);
      params.push(`toDate=${appliedFilters.createdTo}`);
    } else if (applySearch) {
      switch (dateMode) {
        case "Today": params.push("today=true"); break;
        case "Yesterday": params.push("yesterday=true"); break;
        case "This Month": params.push("thisMonth=true"); break;
        case "Custom":
          if (fromDate && toDate) {
            params.push(`fromDate=${fromDate}`);
            params.push(`toDate=${toDate}`);
          }
          break;
        default: break;
      }
    }

    if (appliedFilters.dueFrom && appliedFilters.dueTo) {
      params.push(`dueFrom=${appliedFilters.dueFrom}`);
      params.push(`dueTo=${appliedFilters.dueTo}`);
    }

    return params.length ? "?" + params.join("&") : "";
  };

  // ─── Fetch requests assigned to this checker ──────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const query = buildQuery();
      const res = await portalInstance.get(`/security/requests${query}`);

      setRequests(res.data.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error("Fetch checker requests error:", err);
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, dateMode, fromDate, toDate, applySearch, appliedFilters]);

  useEffect(() => {
    if (shouldFetch) {
      fetchRequests();
      setShouldFetch(false);
    }
  }, [shouldFetch, fetchRequests]);

  // ─── Summary counts ────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { PENDING_APPROVAL: 0, APPROVED: 0, REJECTED: 0, STAFF_APPROVALS: 0 };
    requests.forEach(r => {
      if (r.status === "APPROVED") c.APPROVED++;
      else if (r.status === "REJECTED") c.REJECTED++;
      else if (r.status === "PENDING_APPROVAL") c.PENDING_APPROVAL++;

      // If checker is an employee, it's a staff approval regardless of status
      if (r.checkerId?.role === "employee") {
        c.STAFF_APPROVALS++;
      }
    });
    return c;
  }, [requests]);

  // ─── Filter by tab & Dynamic Multi-filters ────────────────────────────
  const displayRequests = useMemo(() => {
    let list = requests;

    // 1. Status tab filter
    if (activeTab !== "All") {
      if (activeTab === "Staff Approvals") {
        list = list.filter(r => r.checkerId?.role === "employee");
      } else if (activeTab === "Pending Approval") {
        list = list.filter((r) => {
          if (r.status !== "PENDING_APPROVAL") return false;

          const checkers = Array.isArray(r.checkerId)
            ? r.checkerId
            : [r.checkerId];

          return checkers.some(
            (checker) =>
              String(checker?._id || checker) === String(currentUserId)
          );
        });
      } else {
        const statusKey = STATUS_MAP[activeTab];
        list = list.filter(r => r.status === statusKey);
      }
    }

    // 2. Dynamic multi-filters (using committed appliedFilters)
    return list.filter((req) => {
      if (appliedFilters.ticketId) {
        const ticketStr = String(req.ticketId || "");
        if (!ticketStr.toLowerCase().includes(appliedFilters.ticketId.toLowerCase())) return false;
      }

      if (appliedFilters.titleDesc) {
        const search = appliedFilters.titleDesc.toLowerCase();
        const titleMatch = req.title?.toLowerCase().includes(search);
        const descMatch = req.description?.toLowerCase().includes(search);
        if (!titleMatch && !descMatch) return false;
      }

      if (appliedFilters.makerId) {
        const mId = req.makerId?._id || req.makerId;
        if (String(mId) !== String(appliedFilters.makerId)) return false;
      }

      if (appliedFilters.checkerId) {
        const checkers = Array.isArray(req.checkerId) ? req.checkerId : [req.checkerId];
        const match = checkers.some(c => {
          const id = c?._id || c;
          return String(id) === String(appliedFilters.checkerId);
        });
        if (!match) return false;
      }

      if (appliedFilters.requestType && req.requestType !== appliedFilters.requestType) return false;
      if (appliedFilters.status && req.status !== appliedFilters.status) return false;

      if (appliedFilters.createdFrom && new Date(req.createdAt) < new Date(appliedFilters.createdFrom)) return false;
      if (appliedFilters.createdTo && new Date(req.createdAt) > new Date(appliedFilters.createdTo + "T23:59:59")) return false;

      if (appliedFilters.dueFrom && new Date(req.dueDate) < new Date(appliedFilters.dueFrom)) return false;
      if (appliedFilters.dueTo && new Date(req.dueDate) > new Date(appliedFilters.dueTo + "T23:59:59")) return false;

      return true;
    });
  }, [requests, activeTab, currentUserId, appliedFilters]);

  const paginatedRequests = displayRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleSearch = () => {
    if (dateMode === "Custom" && (!fromDate || !toDate)) {
      alert("Please select both From and To dates"); return;
    }
    setApplySearch(true);
    setCurrentPage(1);
    setShouldFetch(true);
  };

  const handleFilterSearch = () => {
    setAppliedFilters({
      ticketId: filterTicketId,
      titleDesc: filterTitleDesc,
      makerId: filterMakerId,
      checkerId: filterCheckerId,
      requestType: filterRequestType,
      status: filterStatus,
      createdFrom: filterCreatedFrom,
      createdTo: filterCreatedTo,
      dueFrom: filterDueFrom,
      dueTo: filterDueTo
    });
    setCurrentPage(1);
    setShouldFetch(true);
  };

  const handleClearFilters = () => {
    setFilterTicketId("");
    setFilterTitleDesc("");
    setFilterMakerId("");
    setFilterCheckerId("");
    setFilterRequestType("");
    setFilterStatus("");
    setFilterCreatedFrom("");
    setFilterCreatedTo("");
    setFilterDueFrom("");
    setFilterDueTo("");

    setAppliedFilters({
      ticketId: "",
      titleDesc: "",
      makerId: "",
      checkerId: "",
      requestType: "",
      status: "",
      createdFrom: "",
      createdTo: "",
      dueFrom: "",
      dueTo: ""
    });

    setCurrentPage(1);
    setShouldFetch(true);
  };

  const handleReset = () => {
    setActiveTab("All");
    setDateMode("Today");
    setFromDate("");
    setToDate("");
    setApplySearch(false);
    handleClearFilters();
    setCurrentPage(1);
    setShouldFetch(true);
  };

  const getApproverNames = (req) => {
    const checkerArray = Array.isArray(req.checkerId) ? req.checkerId : [req.checkerId].filter(Boolean);
    if (checkerArray.length === 0) return "-";
    return checkerArray.map(c => {
      const cId = String(c?._id || c);
      const checkerObj = employees.find(emp => String(emp._id) === cId) || (c && typeof c === "object" ? c : null);
      return checkerObj?.name || cId;
    }).join(", ");
  };

  const handleDownloadExcel = (e) => {
    if (e) e.stopPropagation();

    if (displayRequests.length === 0) {
      toast.error("No records to download.");
      return;
    }

    let headers = [];
    let rows = [];

    const isAllGIT = displayRequests.every(req => req.requestType === "GIT");
    const isAllAWS = displayRequests.every(req => req.requestType === "AWS");

    if (appliedFilters.requestType === "GIT" || isAllGIT) {
      headers = [
        "S.No", "Ticket ID", "Date", "Repository", "Commit ID", "Category", "Change Type", "Requested By",
        "Affected System", "Changes Summary", "Risk Level", "Done By", "Reviewed & Approved By",
        "Reviewed & Approved Date", "Status"
      ];
      rows = displayRequests.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatDateTime(req.createdAt)}"`,
        `"${req.requestData?.repo || "-"}"`,
        `"${req.requestData?.commitId || "-"}"`,
        `"${req.requestData?.category || "-"}"`,
        `"${req.requestData?.changeType || "-"}"`,
        `"${req.requestData?.requestedBy || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.riskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${getApproverNames(req)}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatDateTime(req.updatedAt) : "-"}"`,
        `"${req.status || "-"}"`
      ]);
    } else if (appliedFilters.requestType === "AWS" || isAllAWS) {
      headers = [
        "S.No", "Ticket ID", "Date", "Environment", "Platform / Services", "Category", "Change Summary (Brief)",
        "Description", "Type", "Risk", "Done By", "Reviewed & Approved By", "Reviewed & Approved Date", "Status"
      ];
      rows = displayRequests.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatDateTime(req.createdAt)}"`,
        `"${req.requestData?.environment || "-"}"`,
        `"${req.requestData?.platformService || "AWS"}"`,
        `"${req.requestData?.awsCategory || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.awsType || "-"}"`,
        `"${req.requestData?.awsRiskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${getApproverNames(req)}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatDateTime(req.updatedAt) : "-"}"`,
        `"${req.status || "-"}"`
      ]);
    } else {
      headers = ["S.No", "Ticket ID", "Created At", "Maker", "Approver", "Title", "Request Type", "Due Date", "Status"];
      rows = displayRequests.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatDateTime(req.createdAt)}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${getApproverNames(req)}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${req.requestType || "-"}"`,
        `"${formatDate(req.dueDate)}"`,
        `"${req.status || "-"}"`
      ]);
    }

    const htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid black; padding: 5px; }
          .text-col { mso-number-format: "\\@"; }
        </style>
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map(h => `<th style="background-color: #f2f2f2; font-weight: bold;">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr>${r.map((cell, idx) => {
      const cleanCell = String(cell).replace(/^"|"$/g, '');
      if (idx === 1 && cleanCell.match(/^\\d+$/)) {
        return `<td class="text-col">${cleanCell}</td>`;
      }
      return `<td>${cleanCell}</td>`;
    }).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlTable], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = "Security_Requests_Export.xls";
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleDownloadType = (val) => {
    if (val === "all") {
      if (selectedDownloadTypes.length === 6) {
        setSelectedDownloadTypes([]);
      } else {
        setSelectedDownloadTypes(["CODE", "GIT", "SERVER", "AWS", "MONGODB", "OTHER"]);
      }
    } else {
      if (selectedDownloadTypes.includes(val)) {
        setSelectedDownloadTypes(selectedDownloadTypes.filter(t => t !== val));
      } else {
        setSelectedDownloadTypes([...selectedDownloadTypes, val]);
      }
    }
  };

  const handleExportSelected = (e) => {
    if (e) e.stopPropagation();
    if (selectedDownloadTypes.length === 0) {
      toast.error("Please select at least one type to export.");
      return;
    }

    const filteredToExport = displayRequests.filter(req =>
      selectedDownloadTypes.includes(req.requestType)
    );

    if (filteredToExport.length === 0) {
      toast.error("No records found for the selected types.");
      return;
    }

    let headers = [];
    let rows = [];

    const isAllGIT = filteredToExport.every(req => req.requestType === "GIT");
    const isAllAWS = filteredToExport.every(req => req.requestType === "AWS");

    if (selectedDownloadTypes.length === 1 && selectedDownloadTypes[0] === "GIT") {
      headers = [
        "S.No", "Ticket ID", "Date", "Repository", "Commit ID", "Category", "Change Type", "Requested By",
        "Affected System", "Changes Summary", "Risk Level", "Done By", "Reviewed & Approved By",
        "Reviewed & Approved Date", "Status"
      ];
      rows = filteredToExport.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatDateTime(req.createdAt)}"`,
        `"${req.requestData?.repo || "-"}"`,
        `"${req.requestData?.commitId || "-"}"`,
        `"${req.requestData?.category || "-"}"`,
        `"${req.requestData?.changeType || "-"}"`,
        `"${req.requestData?.requestedBy || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.riskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${getApproverNames(req)}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatDateTime(req.updatedAt) : "-"}"`,
        `"${req.status || "-"}"`
      ]);
    } else if (selectedDownloadTypes.length === 1 && selectedDownloadTypes[0] === "AWS") {
      headers = [
        "S.No", "Ticket ID", "Date", "Environment", "Platform / Services", "Category", "Change Summary (Brief)",
        "Description", "Type", "Risk", "Done By", "Reviewed & Approved By", "Reviewed & Approved Date", "Status"
      ];
      rows = filteredToExport.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatDateTime(req.createdAt)}"`,
        `"${req.requestData?.environment || "-"}"`,
        `"${req.requestData?.platformService || "AWS"}"`,
        `"${req.requestData?.awsCategory || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.awsType || "-"}"`,
        `"${req.requestData?.awsRiskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${getApproverNames(req)}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatDateTime(req.updatedAt) : "-"}"`,
        `"${req.status || "-"}"`
      ]);
    } else {
      headers = ["S.No", "Ticket ID", "Created At", "Maker", "Approver", "Title", "Request Type", "Due Date", "Status"];
      rows = filteredToExport.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatDateTime(req.createdAt)}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${getApproverNames(req)}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${req.requestType || "-"}"`,
        `"${formatDate(req.dueDate)}"`,
        `"${req.status || "-"}"`
      ]);
    }

    const htmlTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; }
          th, td { border: 1px solid black; padding: 5px; }
          .text-col { mso-number-format: "\\@"; }
        </style>
      </head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map(h => `<th style="background-color: #f2f2f2; font-weight: bold;">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr>${r.map((cell, idx) => {
      const cleanCell = String(cell).replace(/^"|"$/g, '');
      if (idx === 1 && cleanCell.match(/^\\d+$/)) {
        return `<td class="text-col">${cleanCell}</td>`;
      }
      return `<td>${cleanCell}</td>`;
    }).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlTable], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Security_Requests_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowDownloadPanel(false);
  };

  const handleTabChange = (tab) => { setActiveTab(tab); setCurrentPage(1); };

  const handleActionDone = () => {
    setSelectedRequest(null);
    setShouldFetch(true);
  };

  // ─── Refresh selected request after action ────────────────────────────
  const openRequest = async (id) => {
    try {
      const res = await portalInstance.get(`/security/request/${id}`);
      setSelectedRequest(res.data.data);
    } catch {
      toast.error("Failed to load request details");
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────
  return (
    <>
      <Sidebar />
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      <div className="adminTaskPageWrapper">

          {/* ── Page Title ──────────────────────────────────────────────── */}
          {/* ── Summary Cards ────────────────────────────────────────────── */}
          <div className="checker__summary-row mb-3">
            {SUMMARY_CARDS.map((card) => (
              <div
                key={card.key}
                className="checker__summary-card"
                style={{ background: card.bg }}
                onClick={() => { handleTabChange(Object.keys(STATUS_MAP).find(k => STATUS_MAP[k] === card.key) || "All"); }}
              >
                <div className="checker__summary-content">
                  <div className="checker__summary-count">
                    {counts[card.key]}
                  </div>
                  <div className="checker__summary-label">{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Filter + Table ───────────────────────────────────────────── */}
          <div className="row">
            <div className="col-12">
              <section className="adminTaskPage__panel">

                {/* Filters Row */}
                <div className="security-maker-filtersRow">
                  {/* Page Size Selector */}
                  <div className="security-maker-filterCol" style={{ width: "100px", flexShrink: 0 }}>
                    <div className="custom-dropdown-container" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`custom-dropdown-trigger ${isPageSizeOpen ? "open" : ""}`}
                        onClick={() => {
                          setIsPageSizeOpen(!isPageSizeOpen);
                          setIsDateModeOpen(false);
                        }}
                      >
                        <span>{pageSize} page</span>
                        <img
                          src={Dropdown}
                          alt="arrow"
                          className={`dropdown-arrow-icon ${isPageSizeOpen ? "rotate" : ""}`}
                        />
                      </div>
                      {isPageSizeOpen && (
                        <div className="custom-dropdown-menu">
                          {[5, 10, 20, 30, 50, 100].map((size) => (
                            <div
                              key={size}
                              className={`custom-dropdown-option ${pageSize === size ? "selected" : ""}`}
                              onClick={() => {
                                setPageSize(size);
                                setCurrentPage(1);
                                setIsPageSizeOpen(false);
                              }}
                            >
                              {size} per page
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date Mode Selector */}
                  <div className="security-maker-filterCol" style={{ width: "100px", flexShrink: 0 }}>
                    <div className="custom-dropdown-container" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`custom-dropdown-trigger ${isDateModeOpen ? "open" : ""}`}
                        onClick={() => {
                          setIsDateModeOpen(!isDateModeOpen);
                          setIsPageSizeOpen(false);
                        }}
                      >
                        <span>{dateMode}</span>
                        <img
                          src={Dropdown}
                          alt="arrow"
                          className={`dropdown-arrow-icon ${isDateModeOpen ? "rotate" : ""}`}
                        />
                      </div>
                      {isDateModeOpen && (
                        <div className="custom-dropdown-menu">
                          {["Today", "Yesterday", "This Month", "Custom"].map((mode) => (
                            <div
                              key={mode}
                              className={`custom-dropdown-option ${dateMode === mode ? "selected" : ""}`}
                              onClick={() => {
                                setDateMode(mode);
                                if (mode !== "Custom") {
                                  setFromDate("");
                                  setToDate("");
                                  setApplySearch(true);
                                  setShouldFetch(true);
                                } else {
                                  setApplySearch(false);
                                }
                                setIsDateModeOpen(false);
                              }}
                            >
                              {mode}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {dateMode === "Custom" && (
                    <>
                      <div className="security-maker-filterCol" style={{ minWidth: "120px", display: "flex", flexDirection: "row", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#77728E", fontWeight: "600" }}>From</span>
                        <div
                          className="security-custom-date-picker"
                          onClick={(e) => e.currentTarget.querySelector('input').showPicker()}
                        >
                          <input type="date" className="security-date-input"
                            max={todayStr} value={fromDate}
                            onChange={(e) => {
                              setFromDate(e.target.value);
                              setToDate("");
                              setApplySearch(false);
                            }} />
                          <span className="security-date-text">
                            {fromDate ? new Date(fromDate).toLocaleDateString("en-GB").replace(/\//g, "-") : "dd-mm-yyyy"}
                          </span>
                          <img src="/Calander.svg" alt="calendar" className="security-calendar-icon" />
                        </div>
                      </div>
                      <div className="security-maker-filterCol" style={{ minWidth: "120px", display: "flex", flexDirection: "row", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "#77728E", fontWeight: "600" }}>To</span>
                        <div
                          className={`security-custom-date-picker ${!fromDate ? 'disabled' : ''}`}
                          onClick={(e) => {
                            if (fromDate) e.currentTarget.querySelector('input').showPicker();
                          }}
                        >
                          <input type="date" className="security-date-input"
                            disabled={!fromDate} min={fromDate} max={todayStr}
                            value={toDate}
                            onChange={(e) => {
                              setToDate(e.target.value);
                              if (e.target.value) {
                                setApplySearch(true);
                                setShouldFetch(true);
                              }
                            }} />
                          <span className="security-date-text">
                            {toDate ? new Date(toDate).toLocaleDateString("en-GB").replace(/\//g, "-") : "dd-mm-yyyy"}
                          </span>
                          <img src="/Calander.svg" alt="calendar" className="security-calendar-icon" />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="security-maker-filterCol security-maker-filter-toggle-col">
                    <button
                      type="button"
                      onClick={() => {
                        if (showFilters) {
                          handleClearFilters();
                        }
                        setShowFilters(!showFilters);
                      }}
                      className={`btn-filter-toggle ${showFilters ? "active" : ""}`}
                      title="Toggle Filter Options"
                    >
                      <img src="/Filter.svg" alt="Filter" className="filter-icon" />
                    </button>
                  </div>

                  <div className="security-maker-filterCol" style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDownloadPanel(!showDownloadPanel);
                      }}
                      className="security-download-btn"
                      title="Download Records as CSV"
                    >
                      Download
                    </button>
                    {showDownloadPanel && (
                      <div className="download-dropdown-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="download-dropdown-title">SELECT TYPES:</div>

                        <label className="download-checkbox-label">
                          <input
                            type="checkbox"
                            className="download-checkbox"
                            checked={selectedDownloadTypes.length === 6}
                            onChange={() => handleToggleDownloadType("all")}
                          />
                          <span className="download-checkbox-text">All</span>
                        </label>

                        <label className="download-checkbox-label">
                          <input
                            type="checkbox"
                            className="download-checkbox"
                            checked={selectedDownloadTypes.includes("CODE")}
                            onChange={() => handleToggleDownloadType("CODE")}
                          />
                          <span className="download-checkbox-text">Code</span>
                        </label>

                        <label className="download-checkbox-label">
                          <input
                            type="checkbox"
                            className="download-checkbox"
                            checked={selectedDownloadTypes.includes("GIT")}
                            onChange={() => handleToggleDownloadType("GIT")}
                          />
                          <span className="download-checkbox-text">GIT</span>
                        </label>

                        <label className="download-checkbox-label">
                          <input
                            type="checkbox"
                            className="download-checkbox"
                            checked={selectedDownloadTypes.includes("SERVER")}
                            onChange={() => handleToggleDownloadType("SERVER")}
                          />
                          <span className="download-checkbox-text">Server</span>
                        </label>

                        <label className="download-checkbox-label">
                          <input
                            type="checkbox"
                            className="download-checkbox"
                            checked={selectedDownloadTypes.includes("AWS")}
                            onChange={() => handleToggleDownloadType("AWS")}
                          />
                          <span className="download-checkbox-text">AWS</span>
                        </label>

                        <label className="download-checkbox-label">
                          <input
                            type="checkbox"
                            className="download-checkbox"
                            checked={selectedDownloadTypes.includes("MONGODB")}
                            onChange={() => handleToggleDownloadType("MONGODB")}
                          />
                          <span className="download-checkbox-text">MongoDB</span>
                        </label>

                        <label className="download-checkbox-label">
                          <input
                            type="checkbox"
                            className="download-checkbox"
                            checked={selectedDownloadTypes.includes("OTHER")}
                            onChange={() => handleToggleDownloadType("OTHER")}
                          />
                          <span className="download-checkbox-text">Others</span>
                        </label>

                        <button
                          type="button"
                          className="download-export-btn"
                          onClick={(e) => handleExportSelected(e)}
                        >
                          Export
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collapsible dynamic multi-filter panel */}
                {showFilters && (
                  <div className="security-filter-panel mt-3 mb-2">
                    <div className="security-filter-grid">
                      {/* Ticket ID search */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Ticket ID</label>
                        <input
                          type="text"
                          className="security-filter-input"
                          placeholder="Search Ticket ID..."
                          value={filterTicketId}
                          onChange={(e) => setFilterTicketId(e.target.value)}
                        />
                      </div>

                      {/* Title & Description search */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Title / Description</label>
                        <input
                          type="text"
                          className="security-filter-input"
                          placeholder="Search Title or Description..."
                          value={filterTitleDesc}
                          onChange={(e) => setFilterTitleDesc(e.target.value)}
                        />
                      </div>

                      {/* Maker dropdown */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Maker</label>
                        <CustomDropdown
                          value={filterMakerId}
                          onChange={(val) => setFilterMakerId(val)}
                          placeholder="All Makers"
                          options={[
                            { label: "All Makers", value: "" },
                            ...uniqueMakers.map((maker) => ({ label: maker.name, value: maker._id }))
                          ]}
                        />
                      </div>

                      {/* Approver dropdown */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Approver</label>
                        <CustomDropdown
                          value={filterCheckerId}
                          onChange={(val) => setFilterCheckerId(val)}
                          placeholder="All Approvers"
                          options={[
                            { label: "All Approvers", value: "" },
                            ...uniqueCheckers.map((checker) => ({ label: checker.name, value: checker._id }))
                          ]}
                        />
                      </div>

                      {/* Request Type dropdown */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Request Type</label>
                        <CustomDropdown
                          value={filterRequestType}
                          onChange={(val) => setFilterRequestType(val)}
                          placeholder="All Types"
                          options={[
                            { label: "All Types", value: "" },
                            { label: "CODE", value: "CODE" },
                            { label: "GIT", value: "GIT" },
                            { label: "SERVER", value: "SERVER" },
                            { label: "AWS", value: "AWS" },
                            { label: "MONGODB", value: "MONGODB" },
                            { label: "OTHER", value: "OTHER" }
                          ]}
                        />
                      </div>

                      {/* Status Dropdown */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Status</label>
                        <CustomDropdown
                          value={filterStatus}
                          onChange={(val) => setFilterStatus(val)}
                          placeholder="All Statuses"
                          options={[
                            { label: "All Statuses", value: "" },
                            { label: "Pending Approval", value: "PENDING_APPROVAL" },
                            { label: "Approved", value: "APPROVED" },
                            { label: "Rejected", value: "REJECTED" }
                          ]}
                        />
                      </div>

                      {/* Created At From Date */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Created From</label>
                        <div className="security-filter-custom-date-picker">
                          <input
                            type="date"
                            className="security-date-input"
                            value={filterCreatedFrom}
                            onChange={(e) => setFilterCreatedFrom(e.target.value)}
                          />
                          <img
                            src="/Calander.svg"
                            alt="calendar"
                            className="security-calendar-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.currentTarget.parentElement.querySelector('input').showPicker();
                            }}
                          />
                        </div>
                      </div>

                      {/* Created At To Date */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Created To</label>
                        <div className="security-filter-custom-date-picker">
                          <input
                            type="date"
                            className="security-date-input"
                            value={filterCreatedTo}
                            onChange={(e) => setFilterCreatedTo(e.target.value)}
                          />
                          <img
                            src="/Calander.svg"
                            alt="calendar"
                            className="security-calendar-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.currentTarget.parentElement.querySelector('input').showPicker();
                            }}
                          />
                        </div>
                      </div>

                      {/* Due Date From */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Due From</label>
                        <div className="security-filter-custom-date-picker">
                          <input
                            type="date"
                            className="security-date-input"
                            value={filterDueFrom}
                            onChange={(e) => setFilterDueFrom(e.target.value)}
                          />
                          <img
                            src="/Calander.svg"
                            alt="calendar"
                            className="security-calendar-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.currentTarget.parentElement.querySelector('input').showPicker();
                            }}
                          />
                        </div>
                      </div>

                      {/* Due Date To */}
                      <div className="security-filter-field">
                        <label className="security-filter-label">Due To</label>
                        <div className="security-filter-custom-date-picker">
                          <input
                            type="date"
                            className="security-date-input"
                            value={filterDueTo}
                            onChange={(e) => setFilterDueTo(e.target.value)}
                          />
                          <img
                            src="/Calander.svg"
                            alt="calendar"
                            className="security-calendar-icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.currentTarget.parentElement.querySelector('input').showPicker();
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="security-filter-actions">
                      <button
                        type="button"
                        className="common-modal-btn btn-small-cancel"
                        onClick={() => {
                          handleClearFilters();
                          setShowFilters(false);
                        }}
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        className="common-modal-btn btn-update"
                        onClick={handleFilterSearch}
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        Search
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Tabs */}
                <div className="adminTaskPage__statusTabsWrapper mt-3">
                  <div className="adminTaskPage__statusTabs d-flex flex-nowrap gap-3">
                    {STATUS_TABS.map((tab) => (
                      <button key={tab}
                        className={"adminTaskPage__statusTab" + (activeTab === tab ? " adminTaskPage__statusTab--active" : "")}
                        onClick={() => handleTabChange(tab)}
                      >
                        {tab}
                        {STATUS_MAP[tab] && tab !== "Approved" && tab !== "Rejected" && counts[STATUS_MAP[tab]] > 0 && (
                          <span className="checker__tab-count">{counts[STATUS_MAP[tab]]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="adminTaskPage__tableCard mt-3">
                  <div className="table-responsive">
                    {loading ? (
                      <div className="adminTaskPage__tableEmpty" >
                        Fetching requests...
                      </div>
                    ) : paginatedRequests.length === 0 ? (
                      <div className="adminTaskPage__tableEmpty ">
                        No requests found for this filter.
                      </div>
                    ) : (
                      <div style={{ minWidth: "min-content" }}>
                        {/* Table Header */}
                        <div className="checker__table-header">
                          <div>S.No</div>
                          <div>Ticket ID</div>
                          <div style={{ textAlign: "center", width: "100%" }}>Created</div>
                          <div>Maker</div>
                          <div>Approver</div>
                          <div>Title</div>
                          <div>Type</div>
                          <div style={{ textAlign: "center", width: "100%" }}>Due Date</div>
                          <div style={{ textAlign: "center", width: "100%" }}>Status</div>
                          <div style={{ textAlign: "center", width: "100%" }}>Action</div>
                        </div>

                        {/* Rows */}
                        {paginatedRequests.map((req, idx) => (
                          <div
                            key={req._id}
                            className="checker__table-row"
                            onClick={() => openRequest(req._id)}
                          >
                            <div>{(currentPage - 1) * pageSize + idx + 1}</div>
                            <div style={{ fontWeight: 600, color: "#5977F8" }}>{req.ticketId || "-"}</div>
                            <div style={{ fontSize: "11px", display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
                              {formatDateTime(req.createdAt)}
                            </div>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {req.makerId?.name || "-"}
                            </div>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {(() => {
                                const checkerArray = Array.isArray(req.checkerId) ? req.checkerId : [req.checkerId].filter(Boolean);
                                if (checkerArray.length === 0) return <span>-</span>;

                                const isMe = checkerArray.some(c => String(c?._id || c) === String(currentUserId));

                                const displayNames = checkerArray.map(c => {
                                  const cId = String(c?._id || c);
                                  const checkerObj = employees.find(emp => String(emp._id) === cId) || c;
                                  return checkerObj?.name || c?.name || "-";
                                }).join(", ");

                                const displayRoles = [...new Set(checkerArray.map(c => {
                                  const cId = String(c?._id || c);
                                  const checkerObj = employees.find(emp => String(emp._id) === cId) || c;
                                  return checkerObj?.role || "";
                                }).filter(Boolean))].join(", ");

                                return (
                                  <>
                                    <span style={{
                                      color: isMe ? "#059669" : "#3A466D",
                                      fontWeight: isMe ? 600 : 400
                                    }} title={displayNames}>
                                      {displayNames}
                                    </span>
                                    {displayRoles && <div style={{ fontSize: '9px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis' }} title={displayRoles}>{displayRoles}</div>}
                                  </>
                                );
                              })()}
                            </div>
                            <div style={{ overflow: "hidden" }}>
                              <strong style={{
                                display: "block", maxWidth: "320px",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {req.title}
                              </strong>
                              <span style={{
                                fontSize: "0.7rem", color: "#A29CC1",
                                display: "block", maxWidth: "320px",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {req.description}
                              </span>
                            </div>
                            <div><TypeBadge type={req.requestType} /></div>
                            <div style={{
                              color: isPastDue(req.dueDate) && req.status === "PENDING_APPROVAL"
                                ? "#DC2626" : "#3A466D",
                              fontSize: "12px", fontWeight:
                                isPastDue(req.dueDate) && req.status === "PENDING_APPROVAL" ? 600 : 400,
                              display: "flex", justifyContent: "center", alignItems: "center", width: "100%"
                            }}>
                              {formatDate(req.dueDate)}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", textAlign: "center" }}>
                              <StatusBadge status={getDisplayStatus(req)} />
                              {getDisplayStatus(req) === "REJECTED" && (
                                <div style={{ fontSize: "10px", color: "#DC2626", marginTop: "4px", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={req.approvers?.find(a => a.status === "REJECTED")?.remark || req.logs?.slice().reverse().find(l => l.action === "REJECTED")?.remark || ""}>
                                  {req.approvers?.find(a => a.status === "REJECTED")?.remark || req.logs?.slice().reverse().find(l => l.action === "REJECTED")?.remark || ""}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", gap: "6px", flexWrap: "wrap" }}>
                              {/* View */}
                              <button className="checker__action-btn checker__action-btn--view"
                                onClick={() => openRequest(req._id)}>
                                View
                              </button>
                              {/* Quick Approve */}
                              {getDisplayStatus(req) === "PENDING_APPROVAL" && (() => {
                                const isChecker = req.checkerId && (
                                  Array.isArray(req.checkerId)
                                    ? req.checkerId.some(c => String(c?._id || c) === String(currentUserId))
                                    : String(req.checkerId?._id || req.checkerId) === String(currentUserId)
                                );
                                const currentApprover = req.approvers?.find(
                                  a => String(a.employee?._id || a.employee) === String(currentUserId)
                                );
                                const hasNotProcessed = currentApprover ? currentApprover.status === "PENDING" : true;

                                return isChecker && hasNotProcessed && (
                                  <button className="checker__action-btn checker__action-btn--approve"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await portalInstance.post(`/security/approve/${req._id}`);
                                        toast.success("Approved!");
                                        setShouldFetch(true);
                                      } catch (err) {
                                        toast.error(err.response?.data?.message || "Failed");
                                      }
                                    }}>
                                    ✓
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pagination */}
                {!loading && displayRequests.length > 0 && (
                  <Pagination
                    totalItems={displayRequests.length}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    onPageChange={(p) => setCurrentPage(p)}
                    maxPagesInGroup={5}
                  />
                )}
              </section>
            </div>
          </div>
        
      </div>

      {/* ── Detail Slide Panel ──────────────────────────────────────────── */}
      {selectedRequest && (
        <SecurityModels
          requestId={selectedRequest._id}
          onClose={handleActionDone}
        />
      )}
    </>
  );
};

export default CheckerDashboard;