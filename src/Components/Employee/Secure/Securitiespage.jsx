// AdminTaskPage.jsx — MODIFIED for Security Workflow System
import React, { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "../../HeaderSidebar/Sidebar";
import TaskDetailsModal from "../Secure/SecurityModels";
import AssignTask from "../Secure/StateAssign";
import "./Security.css";
import adminImage from "../../../assets/img.png";
import Dropdown from "../../../assets/dropdown.png";
import { portalInstance } from "../../../Services/instance";
import Pagination from "../Pagination/Pagination";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import operationImg from "/operation.png";
import CustomDropdown from "../../Common/CustomDropdown";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

// ─── Date Helpers ───────────────────────────────────────────────────────────
const formatDateToMonDD = (dateValue) => {
  if (!dateValue) return "-";
  const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (isNaN(d)) return "-";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatFullDateWithTime = (dateValue) => {
  if (!dateValue) return "-";
  const d = typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (isNaN(d)) return "-";
  const date = d.toLocaleDateString("en-GB").replace(/\//g, "-");
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${date}  ${time}`;
};

// ─── Security-specific status tabs ──────────────────────────────────────────
const STATUS_TABS = [
  "All",
  "Pending Approval",
  "Approved",
  "Rejected",
];

// Badge color map
const STATUS_BADGE_STYLE = {
  PENDING_APPROVAL: { background: "#FFF3CD", color: "#856404" },
  APPROVED: { background: "#D1FAE5", color: "#065F46" },
  REJECTED: { background: "#FFE4E4", color: "#B91C1C" },
};

const REQUEST_TYPE_BADGE = {
  CODE: { background: "#EDE9FE", color: "#6D28D9" },
  GIT: { background: "#FEF3C7", color: "#D97706" },
  SERVER: { background: "#DBEAFE", color: "#2563EB" },
  OTHER: { background: "#F3F4F6", color: "#374151" },
};


const Securitiespage = () => {
  const [pageSize, setPageSize] = useState(5);
  const [status, setStatus] = useState("All");
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [employeeId, setEmployeeId] = useState("");
  const [dateMode, setDateMode] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applySearch, setApplySearch] = useState(true);
  const [shouldFetch, setShouldFetch] = useState(true);
  const [editRequestId, setEditRequestId] = useState(null);

  // Dynamic filter states
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

  // ─── Auth ──────────────────────────────────────────────────────────────
  const sessionData = sessionStorage.getItem("Erti-Portal");
  const token = sessionData ? JSON.parse(sessionData)?.token : "";

  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded?.id || decoded?._id || decoded?.userId || null;
    } catch {
      return null;
    }
  }, [token]);

  const getDisplayStatus = (req) => {
    if (req.status !== "PENDING_APPROVAL") return req.status;
    const currentApprover = req.approvers?.find(a => String(a.employee?._id || a.employee) === String(currentUserId));
    if (currentApprover && currentApprover.status !== "PENDING") {
      return currentApprover.status;
    }
    return req.status;
  };

  // Custom dropdown states
  const [isPageSizeOpen, setIsPageSizeOpen] = useState(false);
  const [isDateModeOpen, setIsDateModeOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [selectedDownloadTypes, setSelectedDownloadTypes] = useState([]);

  const todayStr = new Date().toISOString().split("T")[0];

  // ─── Fetch employees ───────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await portalInstance.get("/data/employees");
      setEmployees(res.data.data || []);
    } catch (err) {
      console.error("EMPLOYEE FETCH ERROR:", err);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  // ─── Build query params ────────────────────────────────────────────────
  const buildQueryParams = () => {
    const params = [];
    if (employeeId) params.push(`makerId=${employeeId}`);

    // Add dynamic search query parameters from committed appliedFilters
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

  // ─── Fetch security requests ──────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const query = buildQueryParams();
      const res = await portalInstance.get(`/security/requests${query}`);
      setRequests(res.data.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error("FETCH SECURITY REQUESTS ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [
    employeeId, dateMode, fromDate, toDate, applySearch,
    appliedFilters
  ]);

  useEffect(() => {
    if (shouldFetch) {
      fetchRequests();
      setShouldFetch(false);
    }
  }, [shouldFetch, fetchRequests]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setIsPageSizeOpen(false);
      setIsDateModeOpen(false);
      setIsDownloadOpen(false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // ─── Search / Reset ───────────────────────────────────────────────────
  const handleSearch = () => {
    if (dateMode === "Custom" && (!fromDate || !toDate)) {
      alert("Please select From and To dates");
      return;
    }
    setApplySearch(true);
    setCurrentPage(1);
    setShouldFetch(true);
  };

  const handleReset = () => {
    setStatus("All");
    setEmployeeId("");
    setDateMode("Today");
    setFromDate("");
    setToDate("");
    setApplySearch(false);
    handleClearFilters();
    setCurrentPage(1);
    setShouldFetch(true);
  };

  // Dynamic Makers and Checkers lists
  const uniqueMakers = employees;
  const uniqueCheckers = employees;



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

  // ─── Filter by status tab & Dynamic Multi-filters ─────────────────────
  const displayRequests = requests.filter((req) => {
    // 1. Status tab filter
    if (status !== "All") {
      const tabMap = {
        "Pending Approval": "PENDING_APPROVAL",
        "Approved": "APPROVED",
        "Rejected": "REJECTED",
      };
      if (req.status !== tabMap[status]) return false;
    }

    // 2. Dynamic multi-filters (using committed appliedFilters)
    if (appliedFilters.ticketId) {
      const ticketStr = String(req.ticketId || "");
      if (!ticketStr.toLowerCase().includes(appliedFilters.ticketId.toLowerCase())) return false;
    }

    // Title & Description Search
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

  const paginatedRequests = displayRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const pendingCount = requests.filter(r => r.status === "PENDING_APPROVAL").length;
  const approvedCount = requests.filter(r => r.status === "APPROVED").length;
  const rejectedCount = requests.filter(r => r.status === "REJECTED").length;

  const handlePageChange = (page) => setCurrentPage(page);
  const handleStatusChange = (tab) => { setStatus(tab); setCurrentPage(1); };

  // ─── Status badge ─────────────────────────────────────────────────────
  const StatusBadge = ({ status: s }) => {
    const style = STATUS_BADGE_STYLE[s] || { background: "#F3F4F6", color: "#374151" };
    const label = s?.replace(/_/g, " ") || "-";
    return (
      <span style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 10px",
        borderRadius: "6px",
        fontSize: "0.68rem",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}>
        {label}
      </span>
    );
  };

  const TypeBadge = ({ type }) => {
    const style = REQUEST_TYPE_BADGE[type] || REQUEST_TYPE_BADGE.OTHER;
    return (
      <span style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 10px",
        borderRadius: "6px",
        fontSize: "0.68rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}>
        {type || "-"}
      </span>
    );
  };

  // ─── Download Single Excel ────────────────────────────────────────────
  const handleDownloadSingleExcel = (e, req) => {
    e.stopPropagation();
    let headers = [];
    let rows = [];

    if (req.requestType === "GIT") {
      headers = [
        "S.No", "Ticket ID", "Date", "Repository", "Commit ID", "Category", "Change Type", "Requested By",
        "Affected System", "Changes Summary", "Risk Level", "Done By", "Reviewed & Approved By",
        "Reviewed & Approved Date", "Status"
      ];
      rows = [[
        1,
        `"${req.ticketId || "-"}"`,
        `"${formatFullDateWithTime(req.createdAt)}"`,
        `"${req.requestData?.repo || "-"}"`,
        `"${req.requestData?.commitId || "-"}"`,
        `"${req.requestData?.category || "-"}"`,
        `"${req.requestData?.changeType || "-"}"`,
        `"${req.requestData?.requestedBy || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.riskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatFullDateWithTime(req.updatedAt) : "-"}"`,
        `"${req.status || "-"}"`
      ]];
    } else if (req.requestType === "AWS") {
      headers = [
        "S.No", "Ticket ID", "Date", "Environment", "Platform / Services", "Category", "Change Summary (Brief)",
        "Description", "Type", "Risk", "Done By", "Reviewed & Approved By", "Reviewed & Approved Date", "Status"
      ];
      rows = [[
        1,
        `"${req.ticketId || "-"}"`,
        `"${formatFullDateWithTime(req.createdAt)}"`,
        `"${req.requestData?.environment || "-"}"`,
        `"${req.requestData?.platformService || "AWS"}"`,
        `"${req.requestData?.awsCategory || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.awsType || "-"}"`,
        `"${req.requestData?.awsRiskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatFullDateWithTime(req.updatedAt) : "-"}"`,
        `"${req.status || "-"}"`
      ]];
    } else {
      headers = ["S.No", "Ticket ID", "Created At", "Maker", "Approver", "Title", "Request Type", "Due Date", "Status"];
      rows = [[
        1,
        `"${req.ticketId || "-"}"`,
        `"${formatFullDateWithTime(req.createdAt)}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${req.requestType || "-"}"`,
        `"${formatDateToMonDD(req.dueDate)}"`,
        `"${req.status || "-"}"`
      ]];
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
    const fileName = "Security_Request_" + (req.ticketId || Date.now()) + ".xls";
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ─── Download Excel ───────────────────────────────────────────────────
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
        `"${formatFullDateWithTime(req.createdAt)}"`,
        `"${req.requestData?.repo || "-"}"`,
        `"${req.requestData?.commitId || "-"}"`,
        `"${req.requestData?.category || "-"}"`,
        `"${req.requestData?.changeType || "-"}"`,
        `"${req.requestData?.requestedBy || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.riskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatFullDateWithTime(req.updatedAt) : "-"}"`,
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
        `"${formatFullDateWithTime(req.createdAt)}"`,
        `"${req.requestData?.environment || "-"}"`,
        `"${req.requestData?.platformService || "AWS"}"`,
        `"${req.requestData?.awsCategory || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.awsType || "-"}"`,
        `"${req.requestData?.awsRiskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatFullDateWithTime(req.updatedAt) : "-"}"`,
        `"${req.status || "-"}"`
      ]);
    } else {
      headers = ["S.No", "Ticket ID", "Created At", "Maker", "Approver", "Title", "Request Type", "Due Date", "Status"];
      rows = displayRequests.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatFullDateWithTime(req.createdAt)}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${req.requestType || "-"}"`,
        `"${formatDateToMonDD(req.dueDate)}"`,
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

  const DOWNLOAD_OPTIONS = [
    { value: "CODE", label: "Code" },
    { value: "GIT", label: "GIT" },
    { value: "SERVER", label: "Server" },
    { value: "AWS", label: "AWS" },
    { value: "MONGODB", label: "MongoDB" },
    { value: "OTHER", label: "Others" },
  ];

  const exportSpecificType = (type, filteredReqs) => {
    let headers = [];
    let rows = [];

    if (type === "GIT") {
      headers = [
        "S.No", "Ticket ID", "Date", "Repository", "Commit ID", "Category", "Change Type", "Requested By",
        "Affected System", "Changes Summary", "Risk Level", "Done By", "Reviewed & Approved By",
        "Reviewed & Approved Date", "Status"
      ];
      rows = filteredReqs.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatFullDateWithTime(req.createdAt)}"`,
        `"${req.requestData?.repo || "-"}"`,
        `"${req.requestData?.commitId || "-"}"`,
        `"${req.requestData?.category || "-"}"`,
        `"${req.requestData?.changeType || "-"}"`,
        `"${req.requestData?.requestedBy || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.riskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatFullDateWithTime(req.updatedAt) : "-"}"`,
        `"${req.status || "-"}"`
      ]);
    } else if (type === "AWS") {
      headers = [
        "S.No", "Ticket ID", "Date", "Environment", "Platform / Services", "Category", "Change Summary (Brief)",
        "Description", "Type", "Risk", "Done By", "Reviewed & Approved By", "Reviewed & Approved Date", "Status"
      ];
      rows = filteredReqs.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatFullDateWithTime(req.createdAt)}"`,
        `"${req.requestData?.environment || "-"}"`,
        `"${req.requestData?.platformService || "AWS"}"`,
        `"${req.requestData?.awsCategory || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${String(req.description || "").replace(/"/g, '""')}"`,
        `"${req.requestData?.awsType || "-"}"`,
        `"${req.requestData?.awsRiskLevel || "-"}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}"`,
        `"${(req.status === "APPROVED" || req.status === "REJECTED") ? formatFullDateWithTime(req.updatedAt) : "-"}"`,
        `"${req.status || "-"}"`
      ]);
    } else {
      headers = ["S.No", "Ticket ID", "Created At", "Maker", "Approver", "Title", "Request Type", "Due Date", "Status"];
      rows = filteredReqs.map((req, i) => [
        i + 1,
        `"${req.ticketId || "-"}"`,
        `"${formatFullDateWithTime(req.createdAt)}"`,
        `"${req.makerId?.name || "-"}"`,
        `"${Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}"`,
        `"${String(req.title || "").replace(/"/g, '""')}"`,
        `"${req.requestType || "-"}"`,
        `"${formatDateToMonDD(req.dueDate)}"`,
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
    const fileName = `Security_${type}_Requests_Export.xls`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSelected = (e) => {
    if (e) e.stopPropagation();
    if (selectedDownloadTypes.length === 0) {
      alert("Please select at least one request type to download.");
      return;
    }

    selectedDownloadTypes.forEach((type) => {
      const filteredReqs = displayRequests.filter((r) => r.requestType === type);
      if (filteredReqs.length > 0) {
        exportSpecificType(type, filteredReqs);
      } else {
        toast.info(`No records found for ${type}`);
      }
    });

    setIsDownloadOpen(false);
  };

  return (
    <>
      <Sidebar />
      <div className="security-maker-wrapper">
        <div className="security-maker-container container-fluid">

          {/* ── Header Card ─────────────────────────────────────────────── */}
          <div className="row">
            <div className="col-12">
              <div className="security-maker-assignCard mt-0 d-flex justify-content-between align-items-center">
                <div className="security-maker-assignCard-body">
                  <h3 className="security-maker-assignCard-title">Security Requests</h3>
                  <p className="security-maker-assignCard-text">
                    Submit code review, Git push, or server deployment requests. <br />
                    All requests require approver approval before execution.
                  </p>
                  <div className="mt-3" style={{ visibility: showAssignPopup ? "hidden" : "visible" }}>
                    <button
                      className="common-modal-btn security-responsive-btn btn-update"
                      onClick={() => setShowAssignPopup(true)}
                    >
                      Create Request
                    </button>
                  </div>
                </div>
                <div className="security-maker-assignCard-illustration d-none d-md-block">
                  <img src={operationImg} alt="illustration" className="img-fluid" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Create Request Form Panel (Separate Component) ────────────────── */}
          {showAssignPopup && (
            <div className="row mt-3 security-inline-form-container">
              <div className="col-12">
                <section className="security-maker-panel">
                  <div className="security-maker-assign-task-page inline-mode">
                    <AssignTask onClose={() => { setShowAssignPopup(false); fetchRequests(); }} />
                  </div>
                </section>
              </div>
            </div>
          )}




          {/* ── Summary Cards ────────────────────────────────────────────── */}
          <div className="row mt-3">
            <div className="col-12 d-flex gap-3">
              <div className="security-summary-card security-summary-card--pending">
                <h4>{pendingCount}</h4>
                <p>Pending Approval</p>
              </div>
              <div className="security-summary-card security-summary-card--approved">
                <h4>{approvedCount}</h4>
                <p>Approved</p>
              </div>
              <div className="security-summary-card security-summary-card--rejected">
                <h4>{rejectedCount}</h4>
                <p>Rejected</p>
              </div>
            </div>
          </div>

          {/* ── Filter + Table Panel ──────────────────────────────────────── */}
          <div className="row mt-3">
            <div className="col-12">
              <section className="security-maker-panel">

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
                        <span>{pageSize}</span>
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
                          {["Today", "Yesterday", "This Month", "All", "Custom"].map((mode) => (
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

                  <div className="security-maker-filterCol">
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

                  <div className="security-maker-filterCol" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDownloadOpen(!isDownloadOpen);
                        setIsPageSizeOpen(false);
                        setIsDateModeOpen(false);
                      }}
                      className={`security-download-btn ${isDownloadOpen ? "active" : ""}`}
                      title="Download Selected Types"
                    >
                      Download
                    </button>
                    {isDownloadOpen && (
                      <div className="custom-dropdown-menu" style={{
                        display: "block",
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        left: "auto",
                        zIndex: 1000,
                        minWidth: "150px",
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
                        padding: "12px",
                        marginTop: "4px"
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Select Types:
                          </p>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "#334155", margin: 0, fontWeight: "600" }}>
                            <input
                              type="checkbox"
                              style={{
                                width: "14px",
                                height: "14px",
                                borderRadius: "4px",
                                border: "1px solid #cbd5e1",
                                cursor: "pointer"
                              }}
                              checked={selectedDownloadTypes.length === DOWNLOAD_OPTIONS.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDownloadTypes(DOWNLOAD_OPTIONS.map(opt => opt.value));
                                } else {
                                  setSelectedDownloadTypes([]);
                                }
                              }}
                            />
                            All
                          </label>
                          <hr style={{ margin: "4px 0", borderColor: "#f1f5f9" }} />
                          {DOWNLOAD_OPTIONS.map((opt) => (
                            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "#334155", margin: 0, fontWeight: "500" }}>
                              <input
                                type="checkbox"
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "4px",
                                  border: "1px solid #cbd5e1",
                                  cursor: "pointer"
                                }}
                                checked={selectedDownloadTypes.includes(opt.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDownloadTypes([...selectedDownloadTypes, opt.value]);
                                  } else {
                                    setSelectedDownloadTypes(selectedDownloadTypes.filter((t) => t !== opt.value));
                                  }
                                }}
                              />
                              {opt.label}
                            </label>
                          ))}
                          <hr style={{ margin: "8px 0 4px 0", borderColor: "#f1f5f9" }} />
                          <button
                            type="button"
                            onClick={handleDownloadSelected}
                            className="common-modal-btn btn-update"
                            style={{
                              width: "100%",
                              height: "30px",
                              padding: "0 10px",
                              fontSize: "11px",
                              fontWeight: "600",
                              margin: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            Export
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Styled collapsible dynamic multi-filter panel */}
                {showFilters && (
                  <form
                    className="security-filter-panel mt-3 mb-2"
                    onSubmit={(e) => { e.preventDefault(); handleFilterSearch(); }}
                  >
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
                        type="submit"
                        className="common-modal-btn btn-update"
                        style={{ display: "flex", alignItems: "center", gap: "6px" }}
                      >
                        Search
                      </button>
                    </div>
                  </form>
                )}

                <div className="security-maker-statusTabsWrapper mt-3">
                  <div className="security-maker-statusTabs d-flex flex-nowrap gap-4">
                    {STATUS_TABS.map(tab => (
                      <button key={tab}
                        className={"security-maker-statusTab" + (status === tab ? " security-maker-statusTab-active" : "")}
                        onClick={() => handleStatusChange(tab)}>
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="security-maker-tableCard mt-3">
                  <div className="table-responsive" style={{ overflowX: "auto" }}>
                    <div className="security-maker-table" style={{ minWidth: "1300px" }}>
                      <div className="security-maker-tableHeader">
                        <div>S.No</div>
                        <div>Ticket ID</div>
                        <div style={{ textAlign: "center", width: "100%" }}>Created At</div>
                        <div>Maker</div>
                        <div>Approver</div>
                        <div>Title</div>
                        <div>Request Type</div>
                        <div style={{ textAlign: "center", width: "100%" }}>Due Date</div>
                        <div style={{ textAlign: "center", width: "100%" }}>Status</div>
                        <div style={{ textAlign: "center", width: "100%" }}>Action</div>
                      </div>

                      {loading ? (
                        <div className="security-maker-tableEmpty p-3 text-muted">Fetching data...</div>
                      ) : paginatedRequests.length === 0 ? (
                        <div className="security-maker-tableEmpty p-3 text-muted">No security requests found.</div>
                      ) : (
                        paginatedRequests.map((req, index) => (
                          <div key={req._id}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "40px 95px 130px 110px 110px 295px 90px 80px 85px 125px",
                              gap: "12px",
                              padding: "10px 15px",
                              borderBottom: "1px solid #f3f4fe",
                              backgroundColor: "#fff",
                              fontSize: "0.75rem",
                              color: "#3A466D",
                              alignItems: "center",
                              cursor: "pointer",
                            }}
                            onClick={() => setSelectedRequestId(req._id)}
                          >
                            <div>{(currentPage - 1) * pageSize + index + 1}</div>
                            <div>{req.ticketId || "-"}</div>
                            <div style={{ fontSize: "11px", display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
                              {formatFullDateWithTime(req.createdAt)}
                            </div>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {req.makerId?.name || "-"}
                            </div>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={Array.isArray(req.checkerId) ? req.checkerId.map(c => c.name).join(", ") : req.checkerId?.name || "-"}>
                              {Array.isArray(req.checkerId)
                                ? req.checkerId.map(c => c.name).join(", ")
                                : req.checkerId?.name || "-"}
                            </div>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <strong style={{ display: "block", maxWidth: "355px", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500", whiteSpace: "nowrap" }}>
                                {req.title}
                              </strong>
                              <span style={{ fontSize: "0.7rem", color: "#A29CC1", display: "block", maxWidth: "355px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {req.description}
                              </span>
                            </div>
                            <div><TypeBadge type={req.requestType} /></div>
                            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%" }}>
                              {formatDateToMonDD(req.dueDate)}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%" }}>
                              <StatusBadge status={getDisplayStatus(req)} />
                              {getDisplayStatus(req) === "REJECTED" && (
                                <div style={{ fontSize: "10px", color: "#DC2626", marginTop: "4px", maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={req.approvers?.find(a => a.status === "REJECTED")?.remark || req.logs?.slice().reverse().find(l => l.action === "REJECTED")?.remark || ""}>
                                  {req.approvers?.find(a => a.status === "REJECTED")?.remark || req.logs?.slice().reverse().find(l => l.action === "REJECTED")?.remark || ""}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: "5px", justifyContent: "center", width: "100%" }}>
                              <button
                                style={{
                                  background: "#dbe8ff", color: "#5977F8",
                                  border: "none", borderRadius: "6px",
                                  fontSize: "11px", padding: "4px 12px",
                                  cursor: "pointer", fontWeight: 500,
                                }}
                                onClick={(e) => { e.stopPropagation(); setSelectedRequestId(req._id); }}
                              >
                                View
                              </button>
                              <button
                                style={{
                                  background: "#e0f2e9", color: "#2e7d32",
                                  border: "none", borderRadius: "6px",
                                  fontSize: "11px", padding: "4px 12px",
                                  cursor: "pointer", fontWeight: 500,
                                }}
                                onClick={(e) => handleDownloadSingleExcel(e, req)}
                              >
                                Dwnld
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {!loading && displayRequests.length > 0 && (
                  <div className="emp-attendance-figma-pagination mt-4 d-flex justify-content-center" style={{ gap: '8px' }}>
                    <button
                      className="emp-attendance-arrow"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a29cc1' }}
                    >
                      <ChevronLeft width={16} />
                    </button>
                    {Array.from({ length: Math.ceil(displayRequests.length / pageSize) }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        className={`emp-attendance-page ${currentPage === p ? "emp-attendance-active" : ""}`}
                        onClick={() => setCurrentPage(p)}
                        style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', background: currentPage === p ? '#f1f2f4' : 'transparent', color: currentPage === p ? '#1a2140' : '#a29cc1', fontWeight: currentPage === p ? '600' : 'normal', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      className="emp-attendance-arrow"
                      disabled={currentPage === Math.ceil(displayRequests.length / pageSize) || Math.ceil(displayRequests.length / pageSize) === 0}
                      onClick={() => setCurrentPage((p) => Math.min(Math.ceil(displayRequests.length / pageSize), p + 1))}
                      style={{ width: '28px', height: '28px', borderRadius: '4px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a29cc1' }}
                    >
                      <ChevronRight width={16} />
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>

      {selectedRequestId && (
        <TaskDetailsModal
          requestId={selectedRequestId}
          onClose={() => { setSelectedRequestId(null); fetchRequests(); }}
          onEdit={(id) => {
            setSelectedRequestId(null);
            setEditRequestId(id);
          }}
        />
      )}

      {editRequestId && (
        <div className="security-maker-details-overlay" style={{ zIndex: 10001 }}>
          <div className="security-maker-popup-container" style={{ width: "100%", maxWidth: "800px" }}>
            <AssignTask
              editData={requests.find(r => r._id === editRequestId)}
              onClose={() => { setEditRequestId(null); fetchRequests(); }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default Securitiespage;