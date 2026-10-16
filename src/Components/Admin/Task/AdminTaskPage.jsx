// AdminTaskPage.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { jwtDecode } from "jwt-decode";
import Sidebar from "../../HeaderSidebar/Sidebar";
import TaskDetailsModal from "../Task/TaskDetailsModal";
import AssignTask from "../../Admin/Task/AssignTask";
import "./AdminTaskPage.css";
import adminImage from "../../../assets/img.png";
import { portalInstance } from "../../../Services/instance";
import Pagination from "../../Employee/Pagination/Pagination";
import CustomDropdown from "../../Common/CustomDropdown";
import { toast, ToastContainer } from "react-toastify"; // ✅ Added
import "react-toastify/dist/ReactToastify.css"; // ✅ Added CSS
import FilterIconImg from "../../../../public/Filter.svg?url";
import "../../../Globel/Layout.css";

// Format date for display (Month DD)
const formatDateToMonDD = (dateValue) => {
  if (!dateValue) return "-";
  const dateObj =
    typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (isNaN(dateObj)) return "-";
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// Format Date with Time (e.g., 03-02-2025 | 4:34 PM)
const formatFullDateWithTime = (dateValue) => {
  if (!dateValue) return "-";
  const dateObj =
    typeof dateValue === "string" ? new Date(dateValue) : dateValue;
  if (isNaN(dateObj)) return "-";

  const date = dateObj.toLocaleDateString("en-GB").replace(/\//g, "-");
  const time = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return `${date}  ${time}`;
};

const calculateOverallTaskDays = (task) => {
  if (!task) return 0;
  const startRaw = task.startDate || task.createdDate || task.createdAt;
  if (!startRaw) {
    return (task.phases || []).reduce((sum, p) => sum + (Number(p.workingDays) || 0), 0) || 1;
  }
  const startDate = new Date(startRaw);
  if (isNaN(startDate.getTime())) return 1;

  const isCompleted = (task.status || "").toLowerCase() === "completed";
  const endRaw = isCompleted
    ? (task.endDate || task.dueDate || startRaw)
    : (task.endDate || new Date());

  const endDate = new Date(endRaw);
  if (isNaN(endDate.getTime())) return 1;

  const getLocalDateStr = (d) => {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "";
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
  };

  const startStr = getLocalDateStr(startDate);
  const endStr = getLocalDateStr(endDate);

  if (!startStr || !endStr || startStr > endStr) return 1;

  const d1 = new Date(startStr + "T00:00:00");
  const d2 = new Date(endStr + "T00:00:00");
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const STATUS_TABS = [
  { label: "Assigned", value: ["Assigned", "assigned", "pending", "Pending", "inprocess", "In Process", "in-progress", "hold", "Hold", "ignored", "Rejected", "rejected", "Completed", "completed"] },
  { label: "Pending", value: ["pending", "Pending"] },
  { label: "In Process", value: ["inprocess", "In Process", "in-progress", "inprogress"] },
  { label: "Hold", value: ["hold", "Hold", "on hold", "on-hold"] },
  { label: "Ignored", value: ["ignored", "Rejected", "rejected"] },
  { label: "Completed", value: ["Completed", "completed"] },
];

const PAGE_SIZE = 5;

const AdminTaskPage = () => {
  const [status, setStatus] = useState("Assigned");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskData, setSelectedTaskData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [employeeId, setEmployeeId] = useState("");
  const [dateMode, setDateMode] = useState("All Time");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [applySearch, setApplySearch] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(true);
  const [taskView, setTaskView] = useState("all"); // "byAdmin", "byEmployee", or "all"

  // NEW: Category & Project filter
  const [filterCategory, setFilterCategory] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [metaCategories, setMetaCategories] = useState([]);
  const [metaProjects, setMetaProjects] = useState([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);

  const sessionData = sessionStorage.getItem("Erti-Portal");
  const authData = sessionData ? JSON.parse(sessionData) : null;
  const token = authData?.token || "";

  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded?.id || decoded?._id || decoded?.userId || null;
    } catch {
      return authData?.user?._id || authData?.user?.id || null;
    }
  }, [token, authData]);

  const todayStr = new Date().toISOString().split("T")[0];

  // ✅ Toast helper methods
  const showToast = {
    success: (msg) =>
      toast.success(msg, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }),
    error: (msg) =>
      toast.error(msg, {
        position: "top-right",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }),
    warning: (msg) =>
      toast.warning(msg, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }),
    info: (msg) =>
      toast.info(msg, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }),
  };

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await portalInstance.get("/data/employees");
      const fetched = res.data.data || [];
      const activeEmployees = fetched.filter(
        (emp) =>
          emp &&
          emp.employmentStatus !== "relieved" &&
          emp.employmentStatus !== "relived" &&
          emp.status !== "relieved" &&
          emp.status !== "relived"
      );
      setEmployees(activeEmployees);
    } catch (error) {
      console.error("EMPLOYEE FETCH ERROR:", error);
      showToast.error("Failed to load employees");
    }
  }, []);

  // Fetch task meta (categories + projects) for filter dropdowns
  useEffect(() => {
    portalInstance.get("/creat/task-meta")
      .then((r) => {
        if (r.data?.success) {
          setMetaCategories(r.data.data.categories || []);
          setMetaProjects(r.data.data.projects || []);
        }
      })
      .catch(() => { }); // silent — not critical
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // ── LOCK BODY SCROLL WHEN POPUP IS OPEN ─────────────────────
  useEffect(() => {
    if (showAssignPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAssignPopup]);

  const buildQueryParams = () => {
    const params = [];
    if (employeeId) params.push(`employeeId=${employeeId}`);
    const currentTab = STATUS_TABS.find(t => t.label === status);
    if (currentTab && status !== "Assigned") {
      currentTab.value.forEach(v => params.push(`status=${v}`));
    }
    if (filterCategory) params.push(`category=${encodeURIComponent(filterCategory)}`);
    if (filterProject) params.push(`project=${encodeURIComponent(filterProject)}`);
    if (applySearch) {
      switch (dateMode) {
        case "Today":
          params.push("today=true");
          break;
        case "Yesterday":
          params.push("yesterday=true");
          break;
        case "This Week":
          params.push("thisWeek=true");
          break;
        case "This Month":
          params.push("thisMonth=true");
          break;
        case "This Year":
          params.push(`year=${new Date().getFullYear()}`);
          break;
        case "Custom":
          if (fromDate && toDate) {
            params.push(`fromDate=${fromDate}`);
            params.push(`toDate=${toDate}`);
          }
          break;
        default:
          // "All Time" sends no date flags
          break;
      }
    }
    return params.length ? "?" + params.join("&") : "";
  };

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const query = buildQueryParams();
      const res = await portalInstance.get(
        `/creat/tasks/admin-dashboard${query}`
      );
      const fetchedTasks = res.data.data || [];
      setTasks(fetchedTasks);
      setCurrentPage(1);

      // ✅ Result counting logic updated
      if (applySearch) {
        // No toast shown here as per user request
      }
    } catch (error) {
      console.error("FETCH TASK ERROR:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to fetch tasks";
      showToast.error(msg); // ✅ Toast
    } finally {
      setLoading(false);
    }
  }, [employeeId, status, dateMode, fromDate, toDate, applySearch, filterCategory, filterProject]);

  useEffect(() => {
    if (shouldFetch) {
      fetchTasks();
      setShouldFetch(false);
    }
  }, [shouldFetch, fetchTasks]);

  const handleSearch = () => {
    // ✅ Validation with toast instead of alert
    if (dateMode === "Custom" && !fromDate) {
      showToast.warning("Please select a From date");
      return;
    }
    if (dateMode === "Custom" && !toDate) {
      showToast.warning("Please select a To date");
      return;
    }
    if (dateMode === "Custom" && fromDate > toDate) {
      showToast.error("From date cannot be after To date");
      return;
    }

    setApplySearch(true);
    setCurrentPage(1);
    setShouldFetch(true);
    setShowFilterMenu(false);
  };

  const handleReset = () => {
    setStatus("Assigned");
    setEmployeeId("");
    setDateMode("All Time");
    setFromDate("");
    setToDate("");
    setApplySearch(true);
    setFilterCategory("");
    setFilterProject("");
    setCurrentPage(1);
    setShouldFetch(true);
    setShowFilterMenu(false);
  };

  const displayTasks = useMemo(() => {
    const rows = [];

    tasks.forEach((task) => {
      const creatorId = typeof task.createdBy === "string"
        ? task.createdBy
        : task.createdBy?._id || task.createdBy?.id || null;

      const viewMatch =
        taskView === "all"
          ? true
          : taskView === "byAdmin"
            ? String(creatorId) === String(currentUserId)
            : String(creatorId) !== String(currentUserId);

      if (!viewMatch) return;

      const members = Array.isArray(task.assignedMembers) && task.assignedMembers.length > 0
        ? task.assignedMembers
        : [null];

      members.forEach((emp) => {
        const empIdStr = emp ? (emp._id || emp).toString() : null;

        // If employee filter is active
        if (employeeId) {
          const isAssigned = empIdStr && empIdStr === employeeId;
          const isCreator = String(creatorId) === employeeId;
          if (!isAssigned && !isCreator) return;
        }

        const mStatus = empIdStr && Array.isArray(task.memberStatuses)
          ? task.memberStatuses.find(ms => (ms.employeeId?._id || ms.employeeId || "").toString() === empIdStr)
          : null;

        const rowStatus = mStatus?.status || task.status || "Assigned";
        const rowAssignedStatus = mStatus?.assignedStatus || task.assignedStatus || "Allocated";

        rows.push({
          ...task,
          assignedMember: emp,
          startDate: mStatus?.startDate !== undefined ? mStatus.startDate : task.startDate,
          endDate: mStatus?.endDate !== undefined ? mStatus.endDate : (task.endDate || null),
          status: rowStatus,
          assignedStatus: rowAssignedStatus,
          rowKey: empIdStr ? `${task._id}_${empIdStr}` : `${task._id}_none`,
        });
      });
    });

    return rows;
  }, [tasks, employeeId, taskView, currentUserId]);

  const paginatedTasks = displayTasks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleStatusChange = (tab) => {
    setStatus(tab);
    setCurrentPage(1);
    setShouldFetch(true); // Trigger backend fetch for new status
  };

  const handleDateModeChange = (val) => {
    setDateMode(val);
    if (val !== "Custom") {
      setFromDate("");
      setToDate("");
    }
  };



  // ✅ Task assignment success handler
  const handleAssignSuccess = () => {
    setShowAssignPopup(false);
    fetchTasks();
  };

  // ✅ Task details close handler
  const handleTaskDetailClose = () => {
    setSelectedTaskId(null);
    setSelectedTaskData(null);
    fetchTasks();
  };

  const dateModeOptions = [
    { value: "All Time", label: "All Time" },
    { value: "Today", label: "Today" },
    { value: "Yesterday", label: "Yesterday" },
    { value: "This Week", label: "This Week" },
    { value: "This Month", label: "This Month" },
    { value: "This Year", label: "This Year" },
    { value: "Custom", label: "Custom" },
  ];

  const employeeOptions = [
    { value: "", label: "Select Employee" },
    ...employees.map((emp) => ({
      value: emp._id,
      label: emp.name,
    })),
  ];

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...metaCategories.filter(c => c && c.toLowerCase() !== "add").map((c) => ({ value: c, label: c })),
  ];

  const projectOptions = [
    { value: "", label: "All Projects" },
    ...metaProjects.filter(p => p && p.toLowerCase() !== "add").map((p) => ({ value: p, label: p })),
  ];

  return (
    <>
      <Sidebar />

      {/* ✅ ToastContainer — REQUIRED for toasts to render */}
      <ToastContainer
      />

      <div className="common-page-container">
        <div className="adminTaskPage">
          <div className="row">
            <div className="col-12 col-lg-6  mt-lg-0">
              <div className="adminTaskPage__assignCard mt-0 d-flex justify-content-between align-items-center">
                <div className="adminTaskPage__assignCard-body">
                  <h3 className="adminTaskPage__assignCard-title">
                    Assign Task
                  </h3>
                  <p className="adminTaskPage__assignCard-text">
                    Need to assign a new task to your team? <br /> Click below
                    to add all the details!
                  </p>
                  <button
                    className="adminTaskPage__button adminTaskPage__button--primary mt-3"
                    onClick={() => setShowAssignPopup(true)}
                  >
                    Assign Task
                  </button>
                </div>
                <div className="adminTaskPage__assignCard-illustration d-none d-md-block">
                  <img
                    src={adminImage}
                    alt="illustration"
                    className="img-fluid"
                    style={{ maxWidth: "130px" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12  mb-4 g-4">
              <section className="adminTaskPage__panel">

                <div className="row g-3 align-items-center mb-4">
                  {/* VIEW TOGGLE & FILTER ICON - Pushed to opposite ends */}
                  <div className="col-12 adminTaskPage__viewToggleRow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'rgb(58, 70, 109)', margin: 0 }}>Task Overview</h3>
                    </div>

                    <div className="adminTaskPage__filterIconContainer" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {/* View selector dropdown on the left side of the filter icon */}

                      <CustomDropdown
                        options={[
                          { value: "byAdmin", label: "Assigned by Me" },
                          { value: "byEmployee", label: "Assigned to Employees" },
                          { value: "all", label: "All Tasks" }
                        ]}
                        value={taskView}
                        onChange={(val) => {
                          setTaskView(val);
                          setCurrentPage(1);
                        }}
                        placeholder="Select View"
                        className="adminTaskPage__taskViewDropdown"
                        style={{ height: "35px" }}
                      />


                      <div
                        className={`dwu-employee-filter-icon ${showFilterMenu ? "active" : ""}`}
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        title="Filter Tasks"
                      >
                        <img src={FilterIconImg} alt="filter" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLLAPSIBLE FILTER MENU (Daily Work Update Style) */}
                {showFilterMenu && (
                  <div className="dwu-filter-row animate-slide-down mb-4" ref={filterRef} style={{ padding: '20px', borderRadius: '12px', background: '#f6f6f6', marginTop: '20px' }}>
                    <div className="row g-3 align-items-end">
                      {/* 1. Date Range */}
                      <div className="col-12 col-md-4 col-lg">
                        <label className="dwu-filter-label">Date Range</label>
                        <CustomDropdown
                          options={dateModeOptions}
                          value={dateMode}
                          onChange={handleDateModeChange}
                          placeholder="Today"
                        />
                      </div>

                      {/* 1b. Custom Dates */}
                      {dateMode === "Custom" && (
                        <>
                          <div className="col-12 col-md-4 col-lg">
                            <label className="dwu-filter-label">From</label>
                            <input
                              type="date"
                              className="form-control dwu-date-input"
                              max={todayStr}
                              value={fromDate}
                              onChange={(e) => setFromDate(e.target.value)}
                            />
                          </div>
                          <div className="col-12 col-md-4 col-lg">
                            <label className="dwu-filter-label">To</label>
                            <input
                              type="date"
                              className="form-control dwu-date-input"
                              min={fromDate}
                              max={todayStr}
                              value={toDate}
                              onChange={(e) => setToDate(e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {/* 2. Employee */}
                      <div className="col-12 col-md-4 col-lg">
                        <label className="dwu-filter-label">Select Employee</label>
                        <CustomDropdown
                          options={employeeOptions}
                          value={employeeId}
                          onChange={setEmployeeId}
                          placeholder="Select Employee"
                        />
                      </div>

                      {/* 3. Category */}
                      <div className="col-12 col-md-4 col-lg">
                        <label className="dwu-filter-label">All Category</label>
                        <CustomDropdown
                          options={categoryOptions}
                          value={filterCategory}
                          onChange={setFilterCategory}
                          placeholder="All Categories"
                        />
                      </div>

                      {/* 4. Project */}
                      <div className="col-12 col-md-4 col-lg">
                        <label className="dwu-filter-label">All Project</label>
                        <CustomDropdown
                          options={projectOptions}
                          value={filterProject}
                          onChange={setFilterProject}
                          placeholder="All Projects"
                        />
                      </div>

                      {/* 5. Buttons */}
                      <div className="col-12 d-flex justify-content-end mt-2">
                        <div className="d-flex mt-2" style={{ gap: "12px" }}>
                          <button
                            className="hrms-common-btn-cancel "
                            onClick={handleReset}
                          >
                            Cancel
                          </button>
                          <button
                            className="hrms-common-btn-primary"
                            onClick={handleSearch}
                          >
                            Search
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


                <div className="adminTaskPage__statusTabsWrapper mt-2">
                  <div className="adminTaskPage__statusTabs d-flex flex-nowrap gap-4">
                    {STATUS_TABS.map((tab) => (
                      <button
                        key={tab.label}
                        className={
                          "adminTaskPage__statusTab" +
                          (status === tab.label
                            ? " adminTaskPage__statusTab--active"
                            : "")
                        }
                        onClick={() => handleStatusChange(tab.label)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="adminTaskPage__tableCard mt-3">
                  <div className="table-responsive">
                    <div className="commonTableLayout">
                      <div className="adminTaskPage__tableHeaderWrapper adminTaskPage__tableHeader">
                        <div className="adminTaskPage__tableHeaderCell" style={{ textAlign: "center" }}>
                          S.No
                        </div>
                        <div
                          className="adminTaskPage__tableHeaderCelldate"
                          style={{ minWidth: "160px" }}
                        >
                          Create Date
                        </div>
                        <div className="adminTaskPage__tableHeaderCell">
                          Assigned By
                        </div>
                        <div className="adminTaskPage__tableHeaderCell">
                          Assigned To
                        </div>
                        <div className="adminTaskPage__tableHeaderCell">
                          Category
                        </div>
                        <div className="adminTaskPage__tableHeaderCell">
                          Project
                        </div>
                        <div className="adminTaskPage__tableHeaderCell adminTaskPage__tableHeaderCell--details" style={{ minWidth: "260px" }}>
                          Task Details
                        </div>
                        <div className="adminTaskPage__tableHeaderCelldate">
                          Start Date
                        </div>
                        <div className="adminTaskPage__tableHeaderCelldate">
                          Due Dateperpose
                        </div>
                        <div className="adminTaskPage__tableHeaderCelldate">
                          End Date
                        </div>
                        <div className="adminTaskPage__tableHeaderCelldate">
                          Status
                        </div>
                        <div className="adminTaskPage__tableHeaderCelldate">
                          Assigned Status
                        </div>
                        <div className="adminTaskPage__tableHeaderCelldate">
                          Priority
                        </div>
                        <div className="adminTaskPage__tableHeaderCelldate" style={{ textAlign: "center" }}>
                          Working Days
                        </div>
                      </div>

                      {loading ? (
                        <div className="adminTaskPage__tablecenter">
                          Fetching data...
                        </div>
                      ) : paginatedTasks.length === 0 ? (
                        <div className="adminTaskPage__tablecenter"

                        >
                          No tasks found.
                        </div>

                      ) : (
                        paginatedTasks.map((task, index) => (
                          <div
                            key={task.rowKey || task._id}
                            className="adminTaskPage__tableRow"
                            onClick={() => {
                              setSelectedTaskId(task._id);
                              setSelectedTaskData(task);
                            }}
                          >
                            <div className="adminTaskPage__tableCell" style={{ textAlign: "center" }}>
                              {(currentPage - 1) * PAGE_SIZE + index + 1}
                            </div>
                            <div
                              className="adminTaskPage__tableCelldate"
                              style={{ minWidth: "160px", fontSize: "12px" }}
                            >
                              {formatFullDateWithTime(task.createdDate || task.createdAt)}
                            </div>
                            <div className="adminTaskPage__tableCell">
                              {task.createdBy?.name || "System"}
                            </div>
                            <div className="adminTaskPage__tableCell">
                              {task.assignedMember ? (
                                <div className="d-flex align-items-center gap-1">
                                  <span>{task.assignedMember.name}</span>
                                </div>
                              ) : (
                                "Myself"
                              )}
                            </div>
                            <div className="adminTaskPage__tableCell">
                              {task.category ? (
                                <span className="adminTaskPage__metaTag adminTaskPage__metaTag--cat">{task.category}</span>
                              ) : (
                                <span className="text-muted" style={{ fontSize: "11px" }}>—</span>
                              )}
                            </div>
                            <div className="adminTaskPage__tableCell">
                              {task.project ? (
                                <div className="d-flex align-items-center flex-wrap gap-1">
                                  <span className="adminTaskPage__metaTag adminTaskPage__metaTag--proj">{task.project}</span>
                                  {task.workType && (
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: "600",
                                        color: "#5977f8",
                                        background: "#eef2ff",
                                        border: "1px solid #c7d2fe",
                                        borderRadius: "4px",
                                        padding: "0px 4px"
                                      }}
                                      title={`Work Type: ${task.workType}`}
                                    >
                                      {task.workType}
                                    </span>
                                  )}
                                  {task.pages && task.pages.length > 0 && task.pages.map((p, pIdx) => (
                                    <span
                                      key={pIdx}
                                      style={{
                                        fontSize: "10px",
                                        fontWeight: "500",
                                        color: "#475569",
                                        background: "#f1f5f9",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "4px",
                                        padding: "0px 4px"
                                      }}
                                      title={`Page: ${p}`}
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted" style={{ fontSize: "11px" }}>—</span>
                              )}
                            </div>
                            <div className="adminTaskPage__tableCell" style={{ minWidth: "260px", whiteSpace: "normal", wordBreak: "break-word" }}>
                              <strong
                                className="d-block employeeTaskPage__taskTitle "
                              >
                                {task.taskTitle}
                              </strong>
                              <p
                                className="text-truncate employeeTaskPage__taskDescription  m-0"
                                style={{ maxWidth: "250px" }}
                              >
                                {task.taskDetails}
                              </p>
                            </div>
                            <div className="adminTaskPage__tableCelldate">
                              {formatDateToMonDD(task.startDate)}
                            </div>
                            <div className="adminTaskPage__tableCelldate">
                              {formatDateToMonDD(task.dueDate)}
                            </div>
                            <div className="adminTaskPage__tableCelldate">
                              {formatDateToMonDD(task.endDate)}
                            </div>
                            <div className="adminTaskPage__tableCelldate">
                              <span
                                className={
                                  "adminTaskPage__statusBadge adminTaskPage__statusBadge--" +
                                  (task.status || "default")
                                    .toLowerCase()
                                    .replace(" ", "")
                                }
                              >
                                {task.status}
                              </span>
                            </div>
                            <div className="adminTaskPage__tableCelldate">
                              <span
                                className={
                                  "adminTaskPage__assignedBadge adminTaskPage__assignedBadge--" +
                                  (task.assignedStatus || "Pending")
                                    .toLowerCase()
                                    .replace(" ", "")
                                }
                              >
                                {task.assignedStatus || "Pending"}
                              </span>
                            </div>
                            <div className="adminTaskPage__tableCelldate">
                              <span
                                className={
                                  "adminTaskPage__priorityBadge adminTaskPage__priorityBadge--" +
                                  (task.priority || "low").toLowerCase()
                                }
                              >
                                {task.priority}
                              </span>
                            </div>
                            <div className="adminTaskPage__tableCelldate" style={{ textAlign: "center" }}>
                              {(() => {
                                const totalDays = calculateOverallTaskDays(task);
                                return (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      fontSize: "12px",
                                      fontWeight: "600",
                                      color: "#16a34a",
                                      background: "#dcfce7",
                                      padding: "2px 8px",
                                      borderRadius: "10px",
                                      border: "1px solid #bbf7d0",
                                    }}
                                  >
                                    {totalDays} {totalDays === 1 ? "day" : "days"}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {!loading && displayTasks.length > 0 && (
                  <Pagination
                    totalItems={displayTasks.length}
                    pageSize={PAGE_SIZE}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    maxPagesInGroup={5}
                  />
                )}
              </section>
            </div>
          </div>
        </div >
      </div >

      {selectedTaskId && (
        <TaskDetailsModal
          taskId={selectedTaskId}
          initialData={selectedTaskData}
          onClose={handleTaskDetailClose}
        />
      )}

      {
        showAssignPopup && (
          <div
            className="adminTaskPage__popupBackdrop"
          >
            <div className="adminTaskPage__popupOverlay">
              <div
                className="adminTaskPage__popupContainer"
                onClick={(e) => e.stopPropagation()}
              >
                <AssignTask
                  onClose={handleAssignSuccess} // ✅ Updated
                />
              </div>
            </div>
          </div>
        )
      }
    </>
  );
};

export default AdminTaskPage;
