import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FiFileText,
  FiSearch,
  FiEye,
  FiInfo,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiLayers,
  FiX,
  FiChevronRight,
  FiUser,
  FiEdit
} from "react-icons/fi";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Sidebar from "../../HeaderSidebar/Sidebar";
import Pagination from "../../Employee/Pagination/Pagination";
import CustomDropdown from "../../Common/CustomDropdown";
import { portalInstance } from "../../../Services/instance";
import { useUser } from "../../UserContext";
import { canHrDeleteRequests, canHrProcessRequests } from "../../../utils/hrAccessHelper";
import FilterIconImg from "../../../../public/Filter.svg?url";
import "../../../Globel/Layout.css";
import "./HrRequestsPage.css";

const DEFAULT_AVATAR = "/avatar.png";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const TARGET_MODULES = [
  { label: "All Modules", value: "ALL" },
  { label: "Employees", value: "EMPLOYEE" },
  { label: "Leave Management", value: "LEAVE_CATEGORY" },
  { label: "Holidays", value: "HOLIDAY" },
  { label: "Salary Slip", value: "SALARY_SLIP" },
];

const DATE_RANGE_OPTIONS = [
  "All Time",
  "Today",
  "This Week",
  "This Month",
  "Monthly",
  "Custom Date Range"
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const DEFAULT_ACTION_TYPES = [
  { label: "All Actions", value: "ALL" },
  { label: "Add Employee", value: "ADD_EMPLOYEE" },
  { label: "Edit Employee", value: "EDIT_EMPLOYEE" },
  { label: "Delete Employee", value: "DELETE_EMPLOYEE" },
  { label: "Delete Document", value: "DELETE_DOCUMENT" },
  { label: "Update Salary", value: "UPDATE_SALARY" },
  { label: "Update Bank", value: "UPDATE_BANK" },
  { label: "Create Leave Category", value: "CREATE_LEAVE_CATEGORY" },
  { label: "Update Leave Category", value: "UPDATE_LEAVE_CATEGORY" },
  { label: "Delete Leave Category", value: "DELETE_LEAVE_CATEGORY" },
  { label: "Add Holiday", value: "ADD_HOLIDAY" },
  { label: "Edit Holiday", value: "EDIT_HOLIDAY" },
  { label: "Delete Holiday", value: "DELETE_HOLIDAY" },
  { label: "Generate Salary Slip", value: "GENERATE_SALARY_SLIP" },
];

const PAGE_SIZE_OPTIONS = [
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 }
];

const formatDateTime = (dateVal) => {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate().toString().padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${day} ${month} ${year}, ${time}`;
};

const formatActionName = (action) => {
  if (!action) return "Update Action";
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatSummary = (summaryStr) => {
  if (!summaryStr) return "-";
  return summaryStr.replace(/_/g, " ");
};

const buildAvatarUrl = (photoPath) => {
  if (!photoPath || photoPath === "avatar.png" || photoPath === "/avatar.png") return DEFAULT_AVATAR;
  if (photoPath.startsWith("http://") || photoPath.startsWith("https://") || photoPath.startsWith("data:")) {
    return photoPath;
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  return `${baseUrl}/${photoPath.replace(/^\/+/, "")}`;
};

const HrRequestsPage = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();

  // Determine admin state from prop or route
  const effectiveIsAdmin = isAdmin || location.pathname.startsWith("/admin");
  const isAdminUser = effectiveIsAdmin || user?.role === "admin";
  const isHrUser = Boolean(user?.isHr);
  const canDeleteRequests = canHrDeleteRequests(user);

  // Restrict access: Only HR and Admin users can access this page
  useEffect(() => {
    if (user && !isAdminUser && !isHrUser) {
      toast.error("Access denied. HR Requests are only accessible to HR and Admin users.");
      navigate("/emp/dashboard", { replace: true });
    }
  }, [user, isAdminUser, isHrUser, navigate]);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Search
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, PENDING, APPROVED, REJECTED
  const [searchTerm, setSearchTerm] = useState("");

  // Expandable Filter Drawer State
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterDateMode, setFilterDateMode] = useState("All Time");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterModule, setFilterModule] = useState("ALL");
  const [filterActionType, setFilterActionType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Committed filter state (applied when clicking Search)
  const [committedFilters, setCommittedFilters] = useState({
    dateMode: "All Time",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    fromDate: "",
    toDate: "",
    targetModule: "ALL",
    actionType: "ALL",
    status: "ALL",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editSummary, setEditSummary] = useState("");
  const [editPayloadJson, setEditPayloadJson] = useState("");

  // View Info Modal (simple read-only popup for View button)
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTargetReq, setViewTargetReq] = useState(null);

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = effectiveIsAdmin ? "/hr-approval/requests" : "/hr-approval/my-requests";
      const res = await portalInstance.get(endpoint);
      if (res.data?.success) {
        setRequests(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error("Fetch HR Requests error:", err);
      toast.error(err.response?.data?.message || "Failed to fetch HR requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveIsAdmin]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Dynamic Options for Filters
  const uniqueActionTypes = useMemo(() => {
    const map = new Map();
    DEFAULT_ACTION_TYPES.forEach((opt) => map.set(opt.value, opt));
    requests.forEach((r) => {
      if (r.actionType && !map.has(r.actionType)) {
        map.set(r.actionType, { label: formatActionName(r.actionType), value: r.actionType });
      }
    });
    return Array.from(map.values());
  }, [requests]);

  const yearOptions = useMemo(() => {
    const curYear = new Date().getFullYear();
    const years = [];
    for (let y = curYear; y >= curYear - 5; y--) {
      years.push(y);
    }
    return years;
  }, []);

  // Real-Time Metric Counters
  const metrics = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [requests]);

  // Tab Filtering & Search Filtering Logic
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Status Filter (Tab status or Filter Drawer status)
      const effectiveStatus = committedFilters.status !== "ALL" ? committedFilters.status : activeTab;
      if (effectiveStatus !== "ALL" && r.status !== effectiveStatus) {
        return false;
      }

      // 2. Target Module Filter
      if (committedFilters.targetModule !== "ALL") {
        const mod = committedFilters.targetModule;
        if (mod === "LEAVE_CATEGORY" && !(r.targetModule === "LEAVE_CATEGORY" || r.targetModule === "LEAVE_MANAGEMENT")) {
          return false;
        } else if (mod === "HOLIDAY" && !(r.targetModule === "HOLIDAY" || r.targetModule === "GOV_HOLIDAY")) {
          return false;
        } else if (mod !== "LEAVE_CATEGORY" && mod !== "HOLIDAY" && r.targetModule !== mod) {
          return false;
        }
      }

      // 3. Action Type Filter
      if (committedFilters.actionType !== "ALL" && r.actionType !== committedFilters.actionType) {
        return false;
      }

      // 4. Date Filter
      const reqDate = new Date(r.createdAt || r.submittedAt || Date.now());
      if (committedFilters.dateMode === "Today") {
        const today = new Date();
        if (
          reqDate.getDate() !== today.getDate() ||
          reqDate.getMonth() !== today.getMonth() ||
          reqDate.getFullYear() !== today.getFullYear()
        ) {
          return false;
        }
      } else if (committedFilters.dateMode === "This Week") {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        if (reqDate < startOfWeek) return false;
      } else if (committedFilters.dateMode === "This Month") {
        const now = new Date();
        if (reqDate.getMonth() !== now.getMonth() || reqDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (committedFilters.dateMode === "Monthly") {
        if (
          reqDate.getMonth() + 1 !== Number(committedFilters.month) ||
          reqDate.getFullYear() !== Number(committedFilters.year)
        ) {
          return false;
        }
      } else if (committedFilters.dateMode === "Custom Date Range") {
        if (committedFilters.fromDate) {
          const from = new Date(committedFilters.fromDate);
          from.setHours(0, 0, 0, 0);
          if (reqDate < from) return false;
        }
        if (committedFilters.toDate) {
          const to = new Date(committedFilters.toDate);
          to.setHours(23, 59, 59, 999);
          if (reqDate > to) return false;
        }
      }

      // 5. Instant Search Keyword Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const refId = `#HR-${(r._id || "").slice(-6)}`.toLowerCase();
        const hrName = (r.hrName || r.hrId?.name || "").toLowerCase();
        const hrIdStr = (r.hrId?.empId || "").toLowerCase();
        const action = (r.actionType || "").toLowerCase();
        const summary = (r.summary || "").toLowerCase();
        const moduleName = (r.targetModule || "").toLowerCase();

        return (
          refId.includes(q) ||
          hrName.includes(q) ||
          hrIdStr.includes(q) ||
          action.includes(q) ||
          summary.includes(q) ||
          moduleName.includes(q)
        );
      }

      return true;
    });
  }, [requests, activeTab, committedFilters, searchTerm, effectiveIsAdmin]);

  // Paginated Slices
  const totalItems = filteredRequests.length;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Handle Tab Switch
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setFilterStatus(tabKey);
    setCommittedFilters((prev) => ({ ...prev, status: tabKey }));
    setCurrentPage(1);
  };

  // Commit Filter Search
  const handleApplyFilter = () => {
    if (filterStatus !== "ALL") {
      setActiveTab(filterStatus);
    } else {
      setActiveTab("ALL");
    }
    setCommittedFilters({
      dateMode: filterDateMode,
      month: filterMonth,
      year: filterYear,
      fromDate: filterFromDate,
      toDate: filterToDate,
      targetModule: filterModule,
      actionType: filterActionType,
      status: filterStatus,
    });
    setCurrentPage(1);
    setShowFilterDrawer(false);
  };

  // Reset Filters
  const handleResetFilter = () => {
    setFilterDateMode("All Time");
    setFilterMonth(new Date().getMonth() + 1);
    setFilterYear(new Date().getFullYear());
    setFilterFromDate("");
    setFilterToDate("");
    setFilterModule("ALL");
    setFilterActionType("ALL");
    setFilterStatus("ALL");
    setActiveTab("ALL");
    setCommittedFilters({
      dateMode: "All Time",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      fromDate: "",
      toDate: "",
      targetModule: "ALL",
      actionType: "ALL",
      status: "ALL",
    });
    setCurrentPage(1);
  };

  // View button — opens a lightweight info popup (does NOT navigate away)
  const handleViewTarget = (req) => {
    setViewTargetReq(req);
    setShowViewModal(true);
  };

  // Open Details Modal
  const handleOpenDetails = (req) => {
    setSelectedRequest(req);
    setAdminNote(req.adminNote || "");
    setShowDetailsModal(true);
  };

  // Approve Request (Admin only)
  const handleApprove = async () => {
    if (!selectedRequest?._id) return;
    try {
      setActionLoading(true);
      const res = await portalInstance.post(`/hr-approval/approve/${selectedRequest._id}`, {
        adminNote: adminNote.trim() || "Approved by Admin",
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Request approved and changes published successfully!");
        setShowDetailsModal(false);
        fetchRequests();
      }
    } catch (err) {
      console.error("Approve error:", err);
      toast.error(err.response?.data?.message || "Failed to approve request");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Request (Admin only)
  const handleReject = async () => {
    if (!selectedRequest?._id) return;
    if (!adminNote.trim()) {
      toast.warning("Please provide a rejection reason / remarks before rejecting.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await portalInstance.post(`/hr-approval/reject/${selectedRequest._id}`, {
        adminNote: adminNote.trim(),
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Request rejected successfully.");
        setShowDetailsModal(false);
        fetchRequests();
      }
    } catch (err) {
      console.error("Reject error:", err);
      toast.error(err.response?.data?.message || "Failed to reject request");
    } finally {
      setActionLoading(false);
    }
  };

  // Delete / Cancel Request
  const handleConfirmDelete = async () => {
    if (!deleteTarget?._id) return;
    if (!canDeleteRequests) {
      toast.error("You are not authorized to delete HR requests per Portal Configuration.");
      return;
    }
    try {
      setActionLoading(true);
      const res = await portalInstance.delete(`/hr-approval/request/${deleteTarget._id}`);
      if (res.data?.success) {
        toast.success("Request cancelled / deleted successfully.");
        setShowDeleteModal(false);
        setDeleteTarget(null);
        fetchRequests();
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete request");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (req) => {
    setEditTarget(req);
    setEditSummary(req.summary || "");
    setEditPayloadJson(JSON.stringify(req.payload || {}, null, 2));
    setShowEditModal(true);
  };

  // Save Edit & Resubmit
  const handleSaveEdit = async () => {
    if (!editTarget?._id) return;
    try {
      setActionLoading(true);
      let parsedPayload = editTarget.payload;
      try {
        if (editPayloadJson.trim()) {
          parsedPayload = JSON.parse(editPayloadJson);
        }
      } catch (jsonErr) {
        toast.error("Invalid JSON format in payload");
        setActionLoading(false);
        return;
      }

      const res = await portalInstance.put(`/hr-approval/request/${editTarget._id}`, {
        summary: editSummary,
        payload: parsedPayload,
      });

      if (res.data?.success) {
        toast.success("Request updated and resubmitted successfully.");
        setShowEditModal(false);
        setEditTarget(null);
        fetchRequests();
      }
    } catch (err) {
      console.error("Update request error:", err);
      toast.error(err.response?.data?.message || "Failed to update request");
    } finally {
      setActionLoading(false);
    }
  };

  // Render Module Tag
  const renderModuleTag = (moduleKey) => {
    if (moduleKey === "EMPLOYEE") {
      return <span className="hr-req-module-tag mod-employee">Employee</span>;
    } else if (moduleKey === "LEAVE_CATEGORY" || moduleKey === "LEAVE_MANAGEMENT") {
      return <span className="hr-req-module-tag mod-leave">Leave Category</span>;
    } else if (moduleKey === "HOLIDAY" || moduleKey === "GOV_HOLIDAY") {
      return <span className="hr-req-module-tag mod-holiday">Holiday</span>;
    } else if (moduleKey === "SALARY_SLIP") {
      return <span className="hr-req-module-tag mod-salary">Salary Slip</span>;
    }
    return <span className="hr-req-module-tag mod-employee">{moduleKey}</span>;
  };

  // Render Status Badge with Hover Tooltip for Rejection Reason
  const renderStatusBadge = (status, rejectionReason = "") => {
    const s = (status || "PENDING").toUpperCase();
    if (s === "PENDING") {
      return (
        <span className="hr-req-status-badge pending">
          <span className="hr-req-pulse-dot" />
          Pending
        </span>
      );
    } else if (s === "APPROVED") {
      return (
        <span className="hr-req-status-badge approved">
          <FiCheckCircle />
          Approved
        </span>
      );
    } else if (s === "REJECTED") {
      const reasonText = rejectionReason || "No rejection reason specified.";
      return (
        <div className="hr-req-rejected-tooltip-wrapper">
          <span className="hr-req-status-badge rejected">
            <FiXCircle />
            Rejected
          </span>
          <div className="hr-req-rejected-tooltip">
            <div className="hr-req-tooltip-title">Rejection Reason</div>
            <div className="hr-req-tooltip-body">{reasonText}</div>
          </div>
        </div>
      );
    }
    return <span className="hr-req-status-badge pending">{s}</span>;
  };

  return (
    <div className="hr-requests-page-wrapper">
      <Sidebar />
      <ToastContainer />

      <main className="hr-requests-main-content">
        {/* ===== PAGE HEADER ===== */}
        <div className="hr-req-header-card">
          <div className="hr-req-header-left">
            <div className="hr-req-header-icon-box">
              <FiLayers />
            </div>
            <div>
              <h4 className="hr-req-page-title">
                {effectiveIsAdmin ? "HR Change Requests & Approvals" : "My HR Change Requests"}
              </h4>
              <p className="hr-req-page-subtitle">
                {effectiveIsAdmin
                  ? "Review, approve, and track operational and administrative requests submitted by HR officers."
                  : "Track the real-time status and approvals of administrative requests submitted to Admin."}
              </p>
            </div>
          </div>
        </div>

        {/* ===== 4 SUMMARY METRIC CARDS ===== */}
        <div className="hr-req-metrics-grid">
          <div className="hr-req-metric-card">
            <div className="hr-req-metric-icon total">
              <FiLayers />
            </div>
            <div className="hr-req-metric-info">
              <span className="hr-req-metric-value">{metrics.total}</span>
              <span className="hr-req-metric-label">Total Requests</span>
            </div>
          </div>

          <div className="hr-req-metric-card">
            <div className="hr-req-metric-icon pending">
              <FiClock />
            </div>
            <div className="hr-req-metric-info">
              <span className="hr-req-metric-value">{metrics.pending}</span>
              <span className="hr-req-metric-label">Pending Approval</span>
            </div>
          </div>

          <div className="hr-req-metric-card">
            <div className="hr-req-metric-icon approved">
              <FiCheckCircle />
            </div>
            <div className="hr-req-metric-info">
              <span className="hr-req-metric-value">{metrics.approved}</span>
              <span className="hr-req-metric-label">Approved & Published</span>
            </div>
          </div>

          <div className="hr-req-metric-card">
            <div className="hr-req-metric-icon rejected">
              <FiXCircle />
            </div>
            <div className="hr-req-metric-info">
              <span className="hr-req-metric-value">{metrics.rejected}</span>
              <span className="hr-req-metric-label">Rejected Requests</span>
            </div>
          </div>
        </div>

        {/* ===== CONTROLS: TABS, SEARCH & FILTER DRAWER TOGGLE ===== */}
        <div className="hr-req-control-bar">
          <div className="hr-req-tabs-group">
            <button
              type="button"
              className={`hr-req-tab-btn ${activeTab === "ALL" ? "active" : ""}`}
              onClick={() => handleTabChange("ALL")}
            >
              <span>All Requests</span>
              <span className="hr-req-tab-badge">{metrics.total}</span>
            </button>
            <button
              type="button"
              className={`hr-req-tab-btn ${activeTab === "PENDING" ? "active" : ""}`}
              onClick={() => handleTabChange("PENDING")}
            >
              <span>Pending Approval</span>
              <span className="hr-req-tab-badge">{metrics.pending}</span>
            </button>
            <button
              type="button"
              className={`hr-req-tab-btn ${activeTab === "APPROVED" ? "active" : ""}`}
              onClick={() => handleTabChange("APPROVED")}
            >
              <span>Approved</span>
              <span className="hr-req-tab-badge">{metrics.approved}</span>
            </button>
            <button
              type="button"
              className={`hr-req-tab-btn ${activeTab === "REJECTED" ? "active" : ""}`}
              onClick={() => handleTabChange("REJECTED")}
            >
              <span>Rejected</span>
              <span className="hr-req-tab-badge">{metrics.rejected}</span>
            </button>
          </div>

          <div className="hr-req-search-filter-group">
            {/* Real-time Search Box */}
            <div className="hr-req-search-box">
              <FiSearch className="hr-req-search-icon" />
              <input
                type="text"
                className="hr-req-search-input"
                placeholder="Search by ID, action, summary..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="hr-req-search-clear"
                  onClick={() => setSearchTerm("")}
                >
                  <FiX />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              className={`hr-req-filter-toggle-btn ${showFilterDrawer ? "active" : ""}`}
              onClick={() => setShowFilterDrawer((prev) => !prev)}
              title="Toggle Filters"
            >
              <img src={FilterIconImg} alt="Filter" />
              <span>Filters</span>
            </button>

            {/* Rows Per Page Selector */}
            <div className="hr-req-page-size-selector">
              <label>Per page:</label>
              <CustomDropdown
                className="ta-page-size-dropdown"
                options={PAGE_SIZE_OPTIONS}
                value={pageSize}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                placeholder="10"
              />
            </div>
          </div>
        </div>

        {/* ===== EXPANDABLE MULTI-FILTER DRAWER ===== */}
        {showFilterDrawer && (
          <div className="hr-req-filter-drawer">
            <div className="hr-req-filter-grid">
              {/* Date Range Mode */}
              <div className="hr-req-filter-field">
                <label className="hr-req-filter-label">Date Range</label>
                <CustomDropdown
                  options={DATE_RANGE_OPTIONS.map((opt) => ({ label: opt, value: opt }))}
                  value={filterDateMode}
                  onChange={(val) => setFilterDateMode(val)}
                  placeholder="Select range"
                />
              </div>

              {/* Monthly Dropdowns (if Monthly selected) */}
              {filterDateMode === "Monthly" && (
                <>
                  <div className="hr-req-filter-field">
                    <label className="hr-req-filter-label">Month</label>
                    <CustomDropdown
                      options={MONTH_NAMES.map((name, idx) => ({ label: name, value: idx + 1 }))}
                      value={filterMonth}
                      onChange={(val) => setFilterMonth(val)}
                      placeholder="Select month"
                    />
                  </div>
                  <div className="hr-req-filter-field">
                    <label className="hr-req-filter-label">Year</label>
                    <CustomDropdown
                      options={yearOptions.map((y) => ({ label: String(y), value: y }))}
                      value={filterYear}
                      onChange={(val) => setFilterYear(val)}
                      placeholder="Select year"
                    />
                  </div>
                </>
              )}

              {/* Custom Date Inputs (if Custom Date Range selected) */}
              {filterDateMode === "Custom Date Range" && (
                <div className="hr-req-filter-field hr-req-custom-date-field">
                  <label className="hr-req-filter-label">From & To Date</label>
                  <div className="hr-req-date-inputs">
                    <input
                      type="date"
                      className="hr-req-date-input"
                      value={filterFromDate}
                      onChange={(e) => setFilterFromDate(e.target.value)}
                    />
                    <span className="hr-req-date-to-txt">to</span>
                    <input
                      type="date"
                      className="hr-req-date-input"
                      value={filterToDate}
                      onChange={(e) => setFilterToDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Target Module Filter */}
              <div className="hr-req-filter-field">
                <label className="hr-req-filter-label">Target Module</label>
                <CustomDropdown
                  options={TARGET_MODULES}
                  value={filterModule}
                  onChange={(val) => setFilterModule(val)}
                  placeholder="All Modules"
                />
              </div>

              {/* Action Type Filter */}
              <div className="hr-req-filter-field">
                <label className="hr-req-filter-label">Action Type</label>
                <CustomDropdown
                  options={uniqueActionTypes}
                  value={filterActionType}
                  onChange={(val) => setFilterActionType(val)}
                  placeholder="All Actions"
                />
              </div>

              {/* Status Filter */}
              <div className="hr-req-filter-field">
                <label className="hr-req-filter-label">Status</label>
                <CustomDropdown
                  options={STATUS_OPTIONS}
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val)}
                  placeholder="All Status"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="hr-req-filter-actions">
              <button
                type="button"
                className="hrms-common-btn-cancel"
                onClick={handleResetFilter}
              >
                Reset
              </button>
              <button
                type="button"
                className="hrms-common-btn-primary"
                onClick={handleApplyFilter}
              >
                Search
              </button>
            </div>
          </div>
        )}

        {/* ===== TABLE PANEL CARD ===== */}
        <div className="hr-req-table-card">
          <div className="hr-req-table-wrapper">
            <table className="hr-req-table">
              <thead>
                <tr>
                  <th style={{ width: "60px" }}>S.NO</th>
                  {effectiveIsAdmin && <th style={{ width: "200px" }}>HR REQUESTER</th>}
                  <th style={{ width: "140px" }}>MODULE</th>
                  <th style={{ width: "170px" }}>ACTION</th>
                  <th>SUMMARY</th>
                  <th style={{ width: "120px" }}>STATUS</th>
                  <th style={{ width: "160px" }}>SUBMITTED AT</th>
                  <th style={{ width: "160px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={effectiveIsAdmin ? 8 : 7} style={{ textAlign: "center", padding: "40px" }}>
                      <div className="spinner-border text-primary" role="status" />
                      <div style={{ marginTop: "10px", color: "#64748b", fontSize: "13px" }}>
                        Loading HR Requests...
                      </div>
                    </td>
                  </tr>
                ) : paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={effectiveIsAdmin ? 8 : 7}>
                      <div className="hr-req-empty-state">
                        <FiFileText className="hr-req-empty-icon" />
                        <div className="hr-req-empty-title">No HR Requests Found</div>
                        <div className="hr-req-empty-desc">
                          {searchTerm || activeTab !== "ALL"
                            ? "No requests matching the selected filters or search keyword."
                            : "There are no administrative change requests recorded at this time."}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((req, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const requesterName = req.hrName || req.hrId?.name || "HR Officer";
                    const requesterId = req.hrId?.empId || req.hrId?.email || "";
                    const requesterPhoto = buildAvatarUrl(req.hrId?.photo);

                    return (
                      <tr key={req._id || idx} className="hr-req-table-row">
                        <td className="hr-req-sno">{rowNumber}</td>
                        {effectiveIsAdmin && (
                          <td>
                            <div className="hr-req-requester-cell">
                              <img
                                src={requesterPhoto}
                                alt={requesterName}
                                className="hr-req-avatar"
                                onError={(e) => {
                                  e.target.src = DEFAULT_AVATAR;
                                }}
                              />
                              <div className="hr-req-requester-meta">
                                <span className="hr-req-requester-name">{requesterName}</span>
                                {requesterId && <span className="hr-req-requester-id">{requesterId}</span>}
                              </div>
                            </div>
                          </td>
                        )}

                        <td>{renderModuleTag(req.targetModule)}</td>
                        <td>
                          <span className="hr-req-action-title">{formatActionName(req.actionType)}</span>
                        </td>
                        <td>
                          <div className="hr-req-summary-cell" title={formatSummary(req.summary)}>
                            {formatSummary(req.summary)}
                          </div>
                        </td>
                        <td>{renderStatusBadge(req.status, req.adminNote || req.decisionReason || req.rejectionReason)}</td>
                        <td className="hr-req-date-cell">{formatDateTime(req.createdAt || req.submittedAt)}</td>
                        <td>
                          <div className="hr-req-action-btn-group" style={{ justifyContent: "flex-end" }}>
                            {/* View Button */}
                            <button
                              type="button"
                              className="hr-req-row-btn view-btn"
                              onClick={() => handleViewTarget(req)}
                              title="Navigate to target section"
                            >
                              <FiEye />
                              <span>View</span>
                            </button>

                            {/* Delete Button - available when authorized */}
                            {canDeleteRequests && (
                              <button
                                type="button"
                                className="hr-req-row-btn delete-btn"
                                onClick={() => {
                                  setDeleteTarget(req);
                                  setShowDeleteModal(true);
                                }}
                                title="Delete / Cancel Request"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ===== CENTERED STANDARD PAGINATION ===== */}
          {totalItems > 0 && (
            <div className="hr-req-pagination-section">
              <div className="hr-req-pagination-info-row">
                <span>
                  Showing {(currentPage - 1) * pageSize + 1} to{" "}
                  {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
                </span>
              </div>

              <Pagination
                totalItems={totalItems}
                pageSize={pageSize}
                currentPage={currentPage}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      </main>

      {/* ===== REVIEW & DETAILS MODAL ===== */}
      {showDetailsModal && selectedRequest && (
        <div className="hr-req-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="hr-req-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hr-req-modal-header">
              <h5 className="hr-req-modal-title">
                <FiFileText />
                <span>Request Details: #HR-{(selectedRequest._id || "").slice(-6).toUpperCase()}</span>
              </h5>
              <button
                type="button"
                className="hr-req-modal-close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="hr-req-modal-body">
              {/* Metadata Banner */}
              <div className="hr-req-meta-banner">
                <div className="hr-req-meta-item">
                  <span className="hr-req-meta-lbl">Target Module</span>
                  <span className="hr-req-meta-val">{selectedRequest.targetModule}</span>
                </div>
                <div className="hr-req-meta-item">
                  <span className="hr-req-meta-lbl">Action Type</span>
                  <span className="hr-req-meta-val">{formatActionName(selectedRequest.actionType)}</span>
                </div>
                <div className="hr-req-meta-item">
                  <span className="hr-req-meta-lbl">Submitted By</span>
                  <span className="hr-req-meta-val">{selectedRequest.hrName || selectedRequest.hrId?.name || "HR Officer"}</span>
                </div>
                <div className="hr-req-meta-item">
                  <span className="hr-req-meta-lbl">Submission Date</span>
                  <span className="hr-req-meta-val">{formatDateTime(selectedRequest.createdAt || selectedRequest.submittedAt)}</span>
                </div>
                <div className="hr-req-meta-item">
                  <span className="hr-req-meta-lbl">Current Status</span>
                  <span className="hr-req-meta-val">{renderStatusBadge(selectedRequest.status)}</span>
                </div>
                {selectedRequest.actionAt && (
                  <div className="hr-req-meta-item">
                    <span className="hr-req-meta-lbl">Decision At</span>
                    <span className="hr-req-meta-val">{formatDateTime(selectedRequest.actionAt)}</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div>
                <label className="hr-req-filter-label" style={{ marginBottom: "4px" }}>
                  Summary / Objective
                </label>
                <p style={{ margin: 0, fontSize: "13px", color: "#334155", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  {selectedRequest.summary || "No description provided."}
                </p>
              </div>

              {/* Payload Diff Breakdown */}
              <div className="hr-req-diff-container">
                <div className="hr-req-diff-header">
                  Requested Changes & Payload Inspection
                </div>

                {Array.isArray(selectedRequest.payload?.changes) && selectedRequest.payload.changes.length > 0 ? (
                  <table className="hr-req-diff-table">
                    <thead>
                      <tr>
                        <th style={{ width: "25%" }}>Field</th>
                        <th style={{ width: "35%" }}>Original Value</th>
                        <th style={{ width: "40%" }}>Requested Update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRequest.payload.changes.map((ch, cIdx) => (
                        <tr key={cIdx}>
                          <td style={{ fontWeight: "600", color: "#1e293b" }}>{ch.fieldName || ch.field}</td>
                          <td>
                            <del className="hr-req-diff-del">{String(ch.from ?? "-")}</del>
                          </td>
                          <td>
                            <ins className="hr-req-diff-ins">{String(ch.to ?? "-")}</ins>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: "14px" }}>
                    <pre className="hr-req-raw-payload-box">
                      {JSON.stringify(selectedRequest.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Admin Note / Remarks */}
              <div className="hr-req-remarks-box">
                <label className="hr-req-filter-label">
                  {effectiveIsAdmin && selectedRequest.status === "PENDING"
                    ? "Admin Decision Remarks (Mandatory for rejection)"
                    : "Admin Notes & Feedback"}
                </label>
                {effectiveIsAdmin && selectedRequest.status === "PENDING" ? (
                  <textarea
                    className="hr-req-remarks-textarea"
                    placeholder="Enter approval note or mandatory rejection reason..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                ) : (
                  <div style={{ fontSize: "13px", color: "#334155", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    {selectedRequest.adminNote || "No remarks added."}
                  </div>
                )}
              </div>
            </div>

            <div className="hr-req-modal-footer">
              <button
                type="button"
                className="hrms-common-btn-cancel"
                onClick={() => setShowDetailsModal(false)}
                disabled={actionLoading}
              >
                Close
              </button>

              {/* Approve / Reject buttons for Admin when Pending */}
              {effectiveIsAdmin && selectedRequest.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    className="hrms-common-btn-danger"
                    onClick={handleReject}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "✕ Reject"}
                  </button>
                  <button
                    type="button"
                    className="hrms-common-btn-primary"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "✓ Approve & Apply"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT REQUEST MODAL ===== */}
      {showEditModal && editTarget && (
        <div className="hr-req-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="hr-req-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="hr-req-modal-header">
              <h5 className="hr-req-modal-title">
                <FiEdit />
                <span>Edit Request: #HR-{(editTarget._id || "").slice(-6).toUpperCase()}</span>
              </h5>
              <button
                type="button"
                className="hr-req-modal-close-btn"
                onClick={() => setShowEditModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="hr-req-modal-body">
              <div className="hr-req-meta-banner">
                <div className="hr-req-meta-item">
                  <span className="hr-req-meta-lbl">Target Module</span>
                  <span className="hr-req-meta-val">{editTarget.targetModule}</span>
                </div>
                <div className="hr-req-meta-item">
                  <span className="hr-req-meta-lbl">Action Type</span>
                  <span className="hr-req-meta-val">{formatActionName(editTarget.actionType)}</span>
                </div>
                <div className="hr-req-meta-item">
                  <span className="hr-req-meta-lbl">Current Status</span>
                  <span className="hr-req-meta-val">{renderStatusBadge(editTarget.status, editTarget.adminNote || editTarget.decisionReason)}</span>
                </div>
                {editTarget.adminNote && (
                  <div className="hr-req-meta-item">
                    <span className="hr-req-meta-lbl">Rejection / Admin Note</span>
                    <span className="hr-req-meta-val" style={{ color: "#dc2626" }}>{editTarget.adminNote}</span>
                  </div>
                )}
              </div>

              <div className="hrms-common-form-group">
                <label className="hr-req-filter-label" style={{ marginBottom: "6px" }}>
                  Request Summary / Description
                </label>
                <textarea
                  className="hrms-common-textarea"
                  style={{ minHeight: "70px", width: "100%" }}
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="Enter updated request summary..."
                />
              </div>

              <div className="hrms-common-form-group">
                <label className="hr-req-filter-label" style={{ marginBottom: "6px" }}>
                  Payload Data (JSON)
                </label>
                <textarea
                  className="hrms-common-textarea"
                  style={{ minHeight: "140px", fontFamily: "monospace", fontSize: "12px", width: "100%" }}
                  value={editPayloadJson}
                  onChange={(e) => setEditPayloadJson(e.target.value)}
                  placeholder="Enter JSON payload..."
                />
              </div>
            </div>

            <div className="hr-req-modal-footer">
              <button
                type="button"
                className="hrms-common-btn-cancel"
                onClick={() => setShowEditModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="hrms-common-btn-primary"
                onClick={handleSaveEdit}
                disabled={actionLoading}
              >
                {actionLoading ? "Saving..." : "Save & Resubmit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE / CANCEL CONFIRMATION MODAL ===== */}
      {showDeleteModal && deleteTarget && (
        <div className="hr-req-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="hr-req-modal-card" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="hr-req-modal-header">
              <h5 className="hr-req-modal-title" style={{ color: "#dc2626" }}>
                <FiTrash2 />
                <span>Confirm Deletion</span>
              </h5>
              <button
                type="button"
                className="hr-req-modal-close-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="hr-req-modal-body">
              <p style={{ margin: 0, fontSize: "14px", color: "#334155" }}>
                Are you sure you want to cancel / delete request{" "}
                <strong>#HR-{(deleteTarget._id || "").slice(-6).toUpperCase()}</strong>?
              </p>
              <div style={{ fontSize: "12px", color: "#64748b", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong>Summary:</strong> {formatSummary(deleteTarget.summary)}
              </div>
            </div>

            <div className="hr-req-modal-footer">
              <button
                type="button"
                className="hrms-common-btn-cancel"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="hrms-common-btn-danger"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW INFO MODAL (Read-only quick summary popup) ===== */}
      {showViewModal && viewTargetReq && (
        <div className="hr-req-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div
            className="hr-req-modal-card"
            style={{ maxWidth: "500px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="hr-req-modal-header">
              <h5 className="hr-req-modal-title">
                <FiInfo />
                <span>Request Info</span>
              </h5>
              <button
                type="button"
                className="hr-req-modal-close-btn"
                onClick={() => setShowViewModal(false)}
              >
                <FiX />
              </button>
            </div>

            {/* Body */}
            <div className="hr-req-modal-body hr-req-view-modal-body">

              {/* Purpose */}
              <div className="hr-req-view-info-row">
                <span className="hr-req-view-info-label">Purpose</span>
                <span className="hr-req-view-info-value">
                  <strong>{formatActionName(viewTargetReq.actionType)}</strong>
                  {viewTargetReq.targetModule ? (
                    <span style={{ color: "#64748b", fontWeight: 400, marginLeft: "6px" }}>
                      ({viewTargetReq.targetModule})
                    </span>
                  ) : null}
                </span>
              </div>

              {/* Description / Summary */}
              <div className="hr-req-view-info-row hr-req-view-info-row--block">
                <span className="hr-req-view-info-label">Description</span>
                <p className="hr-req-view-info-desc">
                  {formatSummary(viewTargetReq.summary) || "No description provided."}
                </p>
              </div>

              {/* Status */}
              <div className="hr-req-view-info-row">
                <span className="hr-req-view-info-label">Status</span>
                <span className="hr-req-view-info-value">
                  {renderStatusBadge(viewTargetReq.status, viewTargetReq.adminNote || viewTargetReq.decisionReason)}
                </span>
              </div>

              {/* Submitted Date */}
              <div className="hr-req-view-info-row">
                <span className="hr-req-view-info-label">Request Sent Date</span>
                <span className="hr-req-view-info-value">
                  {formatDateTime(viewTargetReq.createdAt || viewTargetReq.submittedAt)}
                </span>
              </div>

              {/* Approved Date */}
              {viewTargetReq.status === "APPROVED" && viewTargetReq.actionAt && (
                <div className="hr-req-view-info-row">
                  <span className="hr-req-view-info-label" style={{ color: "#059669" }}>Approved Date</span>
                  <span className="hr-req-view-info-value" style={{ color: "#059669", fontWeight: 600 }}>
                    {formatDateTime(viewTargetReq.actionAt)}
                  </span>
                </div>
              )}

              {/* Rejected Date */}
              {viewTargetReq.status === "REJECTED" && viewTargetReq.actionAt && (
                <div className="hr-req-view-info-row">
                  <span className="hr-req-view-info-label" style={{ color: "#dc2626" }}>Rejected Date</span>
                  <span className="hr-req-view-info-value" style={{ color: "#dc2626", fontWeight: 600 }}>
                    {formatDateTime(viewTargetReq.actionAt)}
                  </span>
                </div>
              )}

              {/* Rejection Reason (if rejected) */}
              {viewTargetReq.status === "REJECTED" &&
                (viewTargetReq.adminNote || viewTargetReq.decisionReason || viewTargetReq.rejectionReason) && (
                  <div className="hr-req-view-info-row hr-req-view-info-row--block">
                    <span className="hr-req-view-info-label" style={{ color: "#dc2626" }}>Rejection Reason</span>
                    <p className="hr-req-view-info-desc" style={{ color: "#dc2626", borderColor: "#fecaca", background: "#fef2f2" }}>
                      {viewTargetReq.adminNote || viewTargetReq.decisionReason || viewTargetReq.rejectionReason}
                    </p>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="hr-req-modal-footer">
              <button
                type="button"
                className="hrms-common-btn-cancel"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrRequestsPage;
