import React, { useEffect, useState, useCallback, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import { useLocation } from "react-router-dom";

import "./EmployeeTaskPage.css";
import "../../../Globel/Layout.css";
import Sidebar from "../../HeaderSidebar/Sidebar";
import TaskDetailsModal from "./TaskDetailsModal";
import { Icon } from "@iconify/react";
import AssignTask from "../../Admin/Task/AssignTask";
import CreatTask from "./AssignTask";
import closeIcon from "../../../assets/close.png";
import { portalInstance } from "../../../Services/instance";
import Pagination from "../Pagination/Pagination";
import CustomDropdown from "../../Common/CustomDropdown";

import FilterIconImg from "../../../../public/Filter.svg?url";
import sortIcon from "../../../../public/sort-icon.svg?url";

const STATUS_TABS = [
  { label: "Assigned", value: ["Assigned", "assigned", "pending", "Pending", "inprocess", "In Process", "in-progress", "hold", "Hold", "ignored", "Rejected", "rejected", "Completed", "completed"] },
  { label: "Pending", value: ["pending", "Pending"] },
  { label: "In Process", value: ["inprocess", "In Process", "in-progress", "inprogress"] },
  { label: "Hold", value: ["hold", "Hold", "on hold", "on-hold"] },
  { label: "Completed", value: ["Completed", "completed"] },
  { label: "Ignored", value: ["ignored", "Rejected", "rejected"] },
];

const PAGE_SIZE = 5;

const DATE_MODE_OPTIONS = [
  { value: "All", label: "All Time" },
  { value: "Today", label: "Today" },
  { value: "Yesterday", label: "Yesterday" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
  { value: "This Year", label: "This Year" },
  { value: "Custom", label: "Custom" },
];

const TASK_VIEW_OPTIONS = [
  { value: "all", label: "All Tasks" },
  { value: "myTask", label: "My Task" },
  { value: "assignedToMe", label: "Assigned to Me" },
  { value: "assignedByMe", label: "Assigned by Me" },
];

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

const EmployeeTaskPage = () => {
  const [status, setStatus] = useState("Assigned");
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskData, setSelectedTaskData] = useState(null);
  const [error, setError] = useState(null);

  const location = useLocation();

  useEffect(() => {
    const navTaskId = location.state?.selectedTaskId;
    if (navTaskId) {
      setSelectedTaskId(navTaskId);
    }
  }, [location.state]);

  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [showCreatPopup, setShowCreatPopup] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [dateMode, setDateMode] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [category, setCategory] = useState("");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState("");
  const [sortBy, setSortBy] = useState("createdDate"); // "createdDate" or "dueDate"
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [taskView, setTaskView] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [shouldFetch, setShouldFetch] = useState(true);
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [fullMeta, setFullMeta] = useState([]);

  // Custom Confirmation Modal States
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: "",
    message: "",
    type: "confirm", // "confirm" or "prompt"
    inputValue: "",
    onConfirm: () => { },
    isDanger: false
  });

  const filterRef = React.useRef(null);

  const sessionData = sessionStorage.getItem("Erti-Portal");
  const authData = sessionData ? JSON.parse(sessionData) : null;
  const token = authData?.token || "";

  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded?.id || decoded?._id || decoded?.userId || null;
    } catch {
      return null;
    }
  }, [token]);

  const selectedTab = STATUS_TABS.find((tab) => tab.label === status);
  const statusValues = selectedTab ? selectedTab.value : [];
  const todayStr = new Date().toISOString().split("T")[0];

  const employeeOptions = [
    { value: "", label: "All Employees" },
    ...employees.map((emp) => ({
      value: emp._id,
      label: emp.name,
    })),
  ];

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
      : "-";

  const formatFullDateWithTime = (dateValue) => {
    if (!dateValue) return "-";
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj)) return "-";

    const date = dateObj.toLocaleDateString("en-GB").replace(/\//g, "-");
    const time = dateObj.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${date}  ${time}`;
  };

  const getStatusKey = (v) =>
    (v || "").toString().toLowerCase().replace(/\s+/g, "");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await portalInstance.get("/data/employees?role=employee");
        const fetched = res.data.data || [];
        const activeEmployees = fetched.filter(
          (emp) =>
            emp &&
            (emp.role || "").toLowerCase() !== "admin" &&
            emp.employmentStatus !== "relieved" &&
            emp.employmentStatus !== "relived" &&
            emp.status !== "relieved" &&
            emp.status !== "relived"
        );
        setEmployees(activeEmployees);
      } catch (e) {
        console.error("EMPLOYEE FETCH ERROR:", e);
      }
    };
    fetchEmployees();
    fetchFullMeta();
  }, []);

  // ── LOCK BODY SCROLL WHEN POPUP IS OPEN ─────────────────────
  useEffect(() => {
    if (showAssignPopup || showCreatPopup) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAssignPopup, showCreatPopup]);

  const handleDeleteCategory = (catId, catName) => {
    setConfirmModal({
      show: true,
      title: "Delete Category",
      message: `Are you sure you want to delete category "${catName}"? This action cannot be undone.`,
      type: "confirm",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await portalInstance.delete(`/creat/task-meta/category/${catId}`);
          if (res.data?.success) {
            toast.success(`Category "${catName}" deleted`);
            setFullMeta(prev => prev.filter(c => c._id !== catId && c.name !== catName));
            setCategories(prev => prev.filter(c => c !== catName));
            if (category === catName) {
              setCategory("");
            }
            fetchFullMeta();
          }
        } catch (e) {
          toast.error(e.response?.data?.message || "Deletion failed");
        }
      }
    });
  };

  const handleDeleteProject = (catId, projName) => {
    setConfirmModal({
      show: true,
      title: "Delete Project",
      message: `Are you sure you want to remove project "${projName}"?`,
      type: "confirm",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await portalInstance.delete("/creat/task-meta/project", {
            data: { categoryId: catId, projectName: projName }
          });
          if (res.data?.success) {
            toast.success(`Project "${projName}" deleted`);
            setFullMeta(prev => prev.map(cat => {
              if (cat._id === catId) {
                return { ...cat, projects: cat.projects.filter(p => p !== projName) };
              }
              return cat;
            }));
            fetchFullMeta();
          }
        } catch (e) {
          toast.error(e.response?.data?.message || "Deletion failed");
        }
      }
    });
  };

  const handleUpdateProject = (catId, currentProjName) => {
    setConfirmModal({
      show: true,
      title: "Rename Project",
      message: `Please enter the new name for project "${currentProjName}":`,
      type: "prompt",
      inputValue: currentProjName,
      isDanger: false,
      onConfirm: async (newName) => {
        if (!newName || newName.trim() === "" || newName === currentProjName) return;
        try {
          const res = await portalInstance.put("/creat/task-meta/project", {
            categoryId: catId,
            oldProjectName: currentProjName,
            newProjectName: newName.trim()
          });
          if (res.data?.success) {
            toast.success("Project renamed successfully");
            fetchFullMeta();
          }
        } catch (e) {
          toast.error(e.response?.data?.message || "Update failed");
        }
      }
    });
  };

  const handleUpdateCategory = (catId, currentName) => {
    setConfirmModal({
      show: true,
      title: "Rename Category",
      message: "Please enter the new name for this category:",
      type: "prompt",
      inputValue: currentName,
      isDanger: false,
      onConfirm: async (newName) => {
        if (!newName || newName.trim() === "" || newName === currentName) return;
        try {
          const res = await portalInstance.put(`/creat/task-meta/category/${catId}`, { name: newName.trim() });
          if (res.data?.success) {
            toast.success("Category updated");
            fetchFullMeta();
          }
        } catch (e) {
          toast.error(e.response?.data?.message || "Update failed");
        }
      }
    });
  };

  const fetchFullMeta = async () => {
    try {
      const res = await portalInstance.get("/creat/task-meta");
      if (res.data?.success) {
        // Reconstruct a map of Category -> Projects
        const mappings = res.data.data.fullCategories.map(cat => ({
          _id: cat._id,
          name: cat.name,
          projects: res.data.data.fullProjects
            .filter(p => p.categoryId._id === cat._id)
            .map(p => p.name)
        }));
        setFullMeta(mappings);

        // Populate categories for filter
        setCategories(mappings.map(m => m.name));
      }
    } catch (e) {
      console.error("META FETCH ERROR:", e);
    }
  };

  // Sync projects based on selected category
  useEffect(() => {
    if (category) {
      const selectedCat = fullMeta.find(m => m.name === category);
      setProjects(selectedCat ? selectedCat.projects : []);
    } else {
      // If no category, show all projects from all categories
      const allProjects = fullMeta.flatMap(m => m.projects);
      setProjects([...new Set(allProjects)]);
    }
  }, [category, fullMeta]);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    statusValues.forEach((s) => params.append("status", s));

    params.append("taskView", taskView);
    params.append("page", currentPage);
    params.append("limit", PAGE_SIZE);

    if (searchQuery.trim() !== "") {
      params.append("search", searchQuery.trim());
    }

    if (employeeId && employeeId.trim() !== "") {
      params.append("employeeId", employeeId);
    }

    if (dateMode === "Today") params.append("today", "true");
    else if (dateMode === "Yesterday") params.append("yesterday", "true");
    else if (dateMode === "This Week") params.append("thisWeek", "true");
    else if (dateMode === "This Month") params.append("thisMonth", "true");
    else if (dateMode === "This Year") params.append("year", new Date().getFullYear());
    else if (dateMode === "Custom" && fromDate && toDate) {
      params.append("fromDate", fromDate);
      params.append("toDate", toDate);
    }

    if (category) params.append("category", category);
    if (project) params.append("project", project);
    if (priority) params.append("priority", priority);
    if (sortBy) params.append("sortBy", sortBy);

    return params.toString();
  }, [statusValues, taskView, currentPage, searchQuery, employeeId, dateMode, fromDate, toDate, category, project, priority, sortBy]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = buildQueryParams();

      const res = await portalInstance.get(`/creat/tasks/dashboard?${query}`);

      if (res.data?.success) {
        setTasks(res.data.data || []);
        setTotalItems(res.data.total || res.data.count || 0);
      } else {
        setError("Unexpected response from server");
      }
    } catch (e) {
      console.error("FETCH TASK ERROR:", e);
      setTasks([]);
      setTotalItems(0);
      setError(e.response?.data?.message || "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  const refreshAfterAction = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Automatically fetch tasks whenever status, page change, or shouldFetch is triggered
  useEffect(() => {
    fetchTasks();
    setShouldFetch(false);
  }, [status, currentPage, shouldFetch, fetchTasks, taskView, sortBy]);

  const handleSearch = () => {
    if (dateMode === "Custom" && (!fromDate || !toDate)) {
      return alert("Please select both From and To dates");
    }
    setCurrentPage(1);
    setShouldFetch(true);
    setShowFilterMenu(false);
  };

  const handleReset = () => {
    setEmployeeId("");
    setDateMode("All");
    setFromDate("");
    setToDate("");
    setCategory("");
    setProject("");
    setPriority("");
    setSortBy("createdDate");
    setCurrentPage(1);
    setTaskView("all");
    setShouldFetch(true);
    setShowFilterMenu(false);
  };

  const displayTasks = useMemo(() => {
    const rows = [];
    tasks.forEach((task) => {
      const members = Array.isArray(task.assignedMembers) && task.assignedMembers.length > 0
        ? task.assignedMembers
        : [null];

      // If the task is assigned to the logged-in employee, only show the logged-in employee's own row in their table
      const isAssignedToMe = currentUserId && members.some(m => (m?._id || m || "").toString() === String(currentUserId));

      if (isAssignedToMe && (!employeeId || String(employeeId) === String(currentUserId))) {
        const myEmp = members.find(m => (m?._id || m || "").toString() === String(currentUserId));
        const mStatus = Array.isArray(task.memberStatuses)
          ? task.memberStatuses.find(ms => (ms.employeeId?._id || ms.employeeId || "").toString() === String(currentUserId))
          : null;

        rows.push({
          ...task,
          assignedMember: myEmp || null,
          startDate: mStatus?.startDate !== undefined ? mStatus.startDate : task.startDate,
          endDate: mStatus?.endDate !== undefined ? mStatus.endDate : (task.endDate || null),
          status: mStatus?.status || task.status || "Assigned",
          assignedStatus: mStatus?.assignedStatus || task.assignedStatus || "Allocated",
          rowKey: `${task._id}_${currentUserId}`,
        });
        return;
      }

      if (taskView === "assignedToMe" && currentUserId) {
        const myEmp = members.find(m => (m?._id || m || "").toString() === String(currentUserId));
        const mStatus = Array.isArray(task.memberStatuses)
          ? task.memberStatuses.find(ms => (ms.employeeId?._id || ms.employeeId || "").toString() === String(currentUserId))
          : null;

        rows.push({
          ...task,
          assignedMember: myEmp || null,
          startDate: mStatus?.startDate !== undefined ? mStatus.startDate : task.startDate,
          endDate: mStatus?.endDate !== undefined ? mStatus.endDate : (task.endDate || null),
          status: mStatus?.status || task.status || "Assigned",
          assignedStatus: mStatus?.assignedStatus || task.assignedStatus || "Allocated",
          rowKey: `${task._id}_${currentUserId}`,
        });
        return;
      }

      members.forEach((emp) => {
        const empIdStr = emp ? (emp._id || emp).toString() : null;

        if (employeeId && empIdStr && empIdStr !== String(employeeId)) {
          return;
        }

        const mStatus = empIdStr && Array.isArray(task.memberStatuses)
          ? task.memberStatuses.find(ms => (ms.employeeId?._id || ms.employeeId || "").toString() === empIdStr)
          : null;

        rows.push({
          ...task,
          assignedMember: emp,
          startDate: mStatus?.startDate !== undefined ? mStatus.startDate : task.startDate,
          endDate: mStatus?.endDate !== undefined ? mStatus.endDate : (task.endDate || null),
          status: mStatus?.status || task.status || "Assigned",
          assignedStatus: mStatus?.assignedStatus || task.assignedStatus || "Allocated",
          rowKey: empIdStr ? `${task._id}_${empIdStr}` : `${task._id}_none`,
        });
      });
    });
    return rows;
  }, [tasks, taskView, currentUserId, employeeId]);

  const paginatedTasks = displayTasks;

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleStatusChange = (tabLabel) => {
    setStatus(tabLabel);
    setCurrentPage(1);
    setShouldFetch(true);
  };

  const handleDateModeChange = (val) => {
    setDateMode(val);
    if (val !== "Custom") {
      setFromDate("");
      setToDate("");
    }
  };

  const handleEmployeeChange = (val) => {
    setEmployeeId(val);
  };

  return (
    <>
      <Sidebar />
      <div className="common-page-container  ">

        <div className="row g-3">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="employeeTaskPage__card p-3 h-100">
              <h4 className="assign-task__members-title">Assign Task</h4>
              <p className="employeeTaskPage__card-text mt-2">
                Assign a new task to your team members and track their progress efficiently.
              </p>
              <button
                className="employeeTaskPage__button employeeTaskPage__button--primary mt-3"
                onClick={() => setShowAssignPopup(true)}
              >
                Assign Task
              </button>
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-4">
            <div className="employeeTaskPage__card p-3 h-100">
              <h4 className="assign-task__members-title">Create a New Task</h4>
              <p className="employeeTaskPage__card-text mt-2">
                Create a personal task for yourself to organize your daily work schedule.
              </p>
              <button
                className="employeeTaskPage__button employeeTaskPage__button--secondary mt-3"
                onClick={() => setShowCreatPopup(true)}
              >
                Create Task
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 mb-4">
          <div className="employeetask_panel ">
            <div className="row g-3 align-items-center ">
              <div className="col-12 employeeTaskPage__viewToggleRow d-flex flex-wrap align-items-center justify-content-between gap-3">
                <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#3A466D' }}>Task Overview</h3>

                <div className="employeeTaskPage__filterIconContainer d-flex align-items-center ms-sm-auto" style={{ gap: '15px' }}>

                  <CustomDropdown
                    options={TASK_VIEW_OPTIONS}
                    value={taskView}
                    onChange={(val) => {
                      setTaskView(val);
                      setCurrentPage(1);
                      setShouldFetch(true);
                    }}
                    placeholder="Select Task View"
                    className="employeeTaskPage__taskViewDropdown"
                    style={{ height: '34px' }}
                  />


                  <div
                    className="d-flex align-items-center gap-2 px-3"
                    onClick={() => setShowMetaModal(true)}
                    title="View Categories & Projects"
                    style={{
                      cursor: 'pointer',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.2s ease',
                      height: '34px',
                    }}
                  >
                    <Icon icon="solar:folder-favourite-star-bold-duotone" style={{ color: '#77728E', fontSize: '18px' }} />
                    <span className="employeeTaskPage__categoryBtnText" style={{ fontSize: '12px', color: '#475569', fontWeight: '600', letterSpacing: '0.3px' }}>Category</span>
                  </div>

                  <div
                    className="dwu-employee-sort-icon"
                    style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                  >
                    <img
                      src={sortIcon}
                      alt="Sort"
                    />
                    <div className="sort-dropdown-menu">
                      <span className="sort-dropdown-label">Sort by</span>
                      <div
                        className={`sort-dropdown-option ${sortBy === "dueDate" ? "selected" : ""}`}
                        onClick={() => {
                          setSortBy("dueDate");
                          setCurrentPage(1);
                        }}
                      >
                        Due Date
                      </div>
                      <div
                        className={`sort-dropdown-option ${sortBy === "createdDate" ? "selected" : ""}`}
                        onClick={() => {
                          setSortBy("createdDate");
                          setCurrentPage(1);
                        }}
                      >
                        Created Date
                      </div>
                    </div>
                  </div>

                  <div
                    className={`dwu-employee-filter-icon ${showFilterMenu ? "active" : ""}`}
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    title="Filter Tasks"
                    style={{ height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <img
                      src={FilterIconImg}
                    />
                  </div>
                </div>
              </div>
            </div>

            {showFilterMenu && (
              <div className="dwu-filter-row animate-slide-down mb-4" ref={filterRef} style={{ padding: '20px', borderRadius: '12px', background: '#f6f6f6', marginTop: '20px' }}>
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md">
                    <label className="dwu-filter-label">Date Range</label>
                    <CustomDropdown
                      options={DATE_MODE_OPTIONS}
                      value={dateMode}
                      onChange={handleDateModeChange}
                      placeholder="Select Date Range"
                    />
                  </div>

                  {dateMode === "Custom" && (
                    <>
                      <div className="col-12 col-md">
                        <label className="dwu-filter-label">From</label>
                        <input
                          type="date"
                          className="form-control dwu-date-input"
                          max={todayStr}
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                        />
                      </div>
                      <div className="col-12 col-md">
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

                  <div className="col-12 col-md">
                    <label className="dwu-filter-label">Select Employee</label>
                    <CustomDropdown
                      options={employeeOptions}
                      value={employeeId}
                      onChange={handleEmployeeChange}
                      placeholder="All Employees"
                    />
                  </div>

                  <div className="col-12 col-md">
                    <label className="dwu-filter-label">All Category</label>
                    <CustomDropdown
                      options={[
                        { value: "", label: "All Categories" },
                        ...categories.filter(c => c && c.toLowerCase() !== "add").map(c => ({ value: c, label: c }))
                      ]}
                      value={category}
                      onChange={setCategory}
                      placeholder="All Categories"
                    />
                  </div>

                  <div className="col-12 col-md">
                    <label className="dwu-filter-label">All Project</label>
                    <CustomDropdown
                      options={[
                        { value: "", label: "All Projects" },
                        ...projects.filter(p => p && p.toLowerCase() !== "add").map(p => ({ value: p, label: p }))
                      ]}
                      value={project}
                      onChange={setProject}
                      placeholder="All Projects"
                    />
                  </div>

                  <div className="col-12 col-md">
                    <label className="dwu-filter-label">Priority</label>
                    <CustomDropdown
                      options={[
                        { value: "", label: "All Priority" },
                        { value: "High", label: "High" },
                        { value: "Medium", label: "Medium" },
                        { value: "Low", label: "Low" },
                      ]}
                      value={priority}
                      onChange={setPriority}
                      placeholder="All Priority"
                    />
                  </div>

                  <div className="col-12 d-flex justify-content-end mt-2">
                    <div className="d-flex mt-2" style={{ gap: "12px" }}  >
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

            <div className="employeeTaskPage__statusTabsWrapper d-flex align-items-center mt-4 mb-2 overflow-auto">
              <div className="employeeTaskPage__statusTabs">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.label}
                    className={`employeeTaskPage__statusTab${status === tab.label
                      ? " employeeTaskPage__statusTab--active"
                      : ""
                      }`}
                    onClick={() => handleStatusChange(tab.label)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="employeeTaskPage__tableCard ">
              <div className="table-responsives">
                <div className="employeeTaskPage__table">
                  <div className="employeeTaskPage__tableHeader">
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">S.No</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center" style={{ minWidth: "160px" }}>Create Date</div>
                    <div className="employeeTaskPage__tableHeaderCell">Assigned By</div>
                    <div className="employeeTaskPage__tableHeaderCell">Assigned To</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__col--category">Category</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__col--project">Project</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--details" style={{ minWidth: "260px" }}>Task Details</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">Start Date</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">Due Date</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">End Date</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">Work Status</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">Allocation</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">Priority</div>
                    <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">Working Days</div>
                  </div>

                  {loading ? (
                    <div className="employeeTaskPage__tableEmpty">Fetching data...</div>
                  ) : tasks.length === 0 ? (
                    <div className="employeeTaskPage__tableEmpty">No tasks found.</div>
                  ) : (
                    paginatedTasks.map((task, index) => (
                      <div
                        key={task.rowKey || task._id}
                        className="employeeTaskPage__tableRow"
                        onClick={() => {
                          setSelectedTaskId(task._id);
                          setSelectedTaskData(task);
                        }}
                      >
                        <div className="employeeTaskPage__tableCell employeeTaskPage__tableCell--center">
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </div>
                        <div className="employeeTaskPage__tableCelldate" style={{ minWidth: "160px", fontSize: "12px" }}>
                          {formatFullDateWithTime(task.createdDate || task.createdAt)}
                        </div>
                        <div className="employeeTaskPage__tableCell">
                          {task.createdBy?.name || "System"}
                        </div>
                        <div className="employeeTaskPage__tableCell">
                          {task.assignedMember ? (
                            <div className="d-flex align-items-center gap-1">
                              <span>{task.assignedMember.name}</span>
                            </div>
                          ) : (
                            "Myself"
                          )}
                        </div>
                        <div className="employeeTaskPage__tableCell employeeTaskPage__col--category">
                          {task.category ? (
                            <span className="empTask__metaTag empTask__metaTag--cat" style={{ fontSize: "11px" }}>{task.category}</span>
                          ) : (
                            <span className="empTask__metaNone">-</span>
                          )}
                        </div>
                        <div className="employeeTaskPage__tableCell employeeTaskPage__col--project">
                          {task.project ? (
                            <div className="d-flex align-items-center flex-wrap gap-1">
                              <span className="empTask__metaTag empTask__metaTag--proj" style={{ fontSize: "11px" }}>{task.project}</span>
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
                            <span className="empTask__metaNone">-</span>
                          )}
                        </div>
                        <div className="employeeTaskPage__tableCell" style={{ minWidth: "260px", whiteSpace: "normal", wordBreak: "break-word" }}>
                          <strong className="employeeTaskPage__taskTitle d-block">
                            {task.taskTitle}
                          </strong>
                          <p className="employeeTaskPage__taskDescription text-truncate m-0" style={{ maxWidth: "250px" }}>
                            {task.taskDetails}
                          </p>
                        </div>
                        <div className="employeeTaskPage__tableCelldate">
                          {formatDate(task.startDate)}
                        </div>
                        <div className="employeeTaskPage__tableCelldate">
                          {formatDate(task.dueDate)}
                        </div>
                        <div className="employeeTaskPage__tableCelldate">
                          {formatDate(task.endDate)}
                        </div>
                        <div className="employeeTaskPage__tableCelldate">
                          <span className={`employeeTaskPage__statusBadge employeeTaskPage__badge--status-${getStatusKey(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                        <div className="employeeTaskPage__tableCell employeeTaskPage__assignedStatusCell">
                          <span className={`employeeTaskPage__statusBadge employeeTaskPage__badge--status-${getStatusKey(task.assignedStatus)}`}>
                            {task.assignedStatus || "Allocated"}
                          </span>
                        </div>
                        <div className="employeeTaskPage__tableCelldate">
                          <span className={`employeeTaskPage__priorityBadge employeeTaskPage__priorityBadge--${task.priority?.toLowerCase()}`}>
                            {task.priority || "-"}
                          </span>
                        </div>
                        <div className="employeeTaskPage__tableCelldate" style={{ textAlign: "center" }}>
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

            {(!loading && tasks.length > 0) && (
              <div className="employeeTaskPage__paginationSection">
                <Pagination
                  totalItems={totalItems}
                  pageSize={PAGE_SIZE}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>

      </div>

      {showAssignPopup && (
        <div className="employeeTaskPage__popupBackdrop">
          <div className="employeeTaskPage__popupOverlay">
            <div className="employeeTaskPage__popupContainer" onClick={(e) => e.stopPropagation()}>
              <AssignTask
                onSuccess={refreshAfterAction}
                onClose={() => {
                  setShowAssignPopup(false);
                  refreshAfterAction();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showCreatPopup && (
        <div className="employeeTaskPage__popupBackdrop">
          <div className="employeeTaskPage__popupOverlay">
            <div className="employeeTaskPage__createtaskpopupContainer" onClick={(e) => e.stopPropagation()}>
              <CreatTask
                onSuccess={refreshAfterAction}
                onClose={() => {
                  setShowCreatPopup(false);
                  refreshAfterAction();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailsModal
          taskId={selectedTaskId}
          initialData={selectedTaskData}
          onClose={() => {
            setSelectedTaskId(null);
            setSelectedTaskData(null);
            refreshAfterAction();
          }}
        />
      )}

      {showMetaModal && (
        <div className="employeeTaskPage__popupBackdrop" onClick={() => setShowMetaModal(false)}>
          <div className="employeeTaskPage__popupOverlay">
            <div className="employeeTaskPage__popupContainer" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4 className="m-0 assign-task__members-title" >Task Categories</h4>
                  <span className="hrms-common-close-btn" onClick={() => setShowMetaModal(false)}>✕</span>
                </div>

                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
                  {fullMeta.length > 0 ? (
                    fullMeta.map((cat, i) => (
                      <div key={i} className="mb-4 p-3" style={{ background: '#f8f9fa', borderRadius: '12px', position: 'relative' }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="d-flex align-items-center gap-2">
                            <div style={{ width: '6px', height: '24px', borderRadius: '4px' }}></div>
                            <h5 className="m-0" style={{ color: 'rgba(134, 133, 133, 1)', fontWeight: '500', fontSize: '12px' }}>{cat.name}</h5>
                          </div>
                          <div className="d-flex gap-2">

                            <button
                              onClick={() => handleUpdateCategory(cat._id, cat.name)}
                              className="btn btn-sm p-2 d-flex align-items-center justify-content-center"
                              style={{ background: '#f0f4ff', border: 'none', color: 'rgba(134, 133, 133, 1)', borderRadius: '8px' }}
                              title="Rename Category"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat._id, cat.name)}
                              className="btn btn-sm p-2 d-flex align-items-center justify-content-center"
                              style={{ background: '#fff1f0', border: 'none', color: '#ff4d4f', borderRadius: '8px' }}
                              title="Delete Category"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                          </div>
                        </div>
                        <div className="d-flex flex-wrap gap-2 mt-3">
                          {cat.projects.length > 0 ? (
                            cat.projects.map((p, j) => (
                              <div
                                key={j}
                                className="d-flex align-items-center gap-2"
                                style={{
                                  background: '#fff',
                                  padding: '6px 12px',
                                  borderRadius: '10px',
                                  fontSize: '0.85rem',
                                  color: '#3a466d',
                                  fontWeight: '600',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                  border: '1px solid #f0f4f8',
                                }}
                              >
                                {p}
                                <div className="d-flex align-items-center gap-1 border-start ps-2 ms-1" style={{ borderColor: '#eef2f6' }}>
                                  <button
                                    onClick={() => handleUpdateProject(cat._id, p)}
                                    style={{ background: 'none', border: 'none', padding: '0', color: '#5977f8', display: 'flex', cursor: 'pointer' }}
                                    title="Rename"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path></svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProject(cat._id, p)}
                                    style={{ background: 'none', border: 'none', padding: '0', color: '#ff4d4f', display: 'flex', cursor: 'pointer' }}
                                    title="Delete"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted small">No projects assigned</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-5 text-muted">No metadata found</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="employeeTaskPage__popupBackdrop" style={{ zIndex: 3000 }}>
          <div className="employeeTaskPage__popupOverlay" onClick={() => setConfirmModal({ ...confirmModal, show: false })}>
            <div className="employeeTaskPage__popupContainer" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="p-4 text-center">
                <h4 style={{ fontWeight: '400', fontSize: '14px', color: confirmModal.isDanger ? '#dc3545' : 'rgba(134, 133, 133, 1)', marginBottom: '15px' }}>{confirmModal.title}</h4>
                <p className="text-muted mb-4" style={{ fontSize: '15px' }}>{confirmModal.message}</p>
                {confirmModal.type === "prompt" && (
                  <div className="mb-4">
                    <input
                      type="text"
                      className="form-control"
                      value={confirmModal.inputValue}
                      onChange={(e) => setConfirmModal({ ...confirmModal, inputValue: e.target.value })}
                      autoFocus
                      style={{ borderRadius: '8px', padding: '10px 15px' }}
                    />
                  </div>
                )}
                <div className="d-flex gap-3 justify-content-center">
                  <button
                    className="hrms-common-btn-cancel "
                    onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                  >
                    Cancel
                  </button>
                  <button
                    className="hrms-common-btn-primary"
                    onClick={() => {
                      confirmModal.onConfirm(confirmModal.inputValue);
                      setConfirmModal({ ...confirmModal, show: false });
                    }}
                  >
                    {confirmModal.type === "prompt" ? "Save" : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default EmployeeTaskPage;
