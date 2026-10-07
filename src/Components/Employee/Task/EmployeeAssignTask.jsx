import React, { useEffect, useState, useCallback } from "react";
import "./EmployeeTaskPage.css";
import Sidebar from "../../HeaderSidebar/Sidebar";
import TaskDetailsModal from "./TaskDetailsModal";
import AssignTask from "./AssignTask";
import CreatTask from "../../Admin/Task/AssignTask";
import { portalInstance } from "../../../Services/instance";
import Pagination from "../Pagination/Pagination";
import CustomDropdown from "../../Common/CustomDropdown";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const STATUS_TABS = [
  { label: "Assigned", value: ["Assigned", "pending", "inprocess", "hold", "Completed", "ignored"] },
  { label: "Pending", value: ["pending"] },
  { label: "In Process", value: ["inprocess"] },
  { label: "Hold", value: ["hold"] },
  { label: "Completed", value: ["Completed"] },
  { label: "Ignored", value: ["ignored"] },
];
const PAGE_SIZE = 5;

const DATE_MODE_OPTIONS = [
  { value: "Today", label: "Today" },
  { value: "Yesterday", label: "Yesterday" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
  { value: "This Year", label: "This Year" },
  { value: "Custom", label: "Custom" },
];

const STATUS_DROPDOWN_OPTIONS = STATUS_TABS.map((tab) => ({
  value: tab.label,
  label: tab.label,
}));

const EmployeeTaskPage = () => {
  const [status, setStatus] = useState("Assigned");
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [error, setError] = useState(null);
  const [showAssignPopup, setShowAssignPopup] = useState(false);
  const [showCreatPopup, setShowCreatPopup] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [dateMode, setDateMode] = useState("Today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Category & Project filter state
  const [filterCategory, setFilterCategory] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [metaCategories, setMetaCategories] = useState([]);
  const [metaProjects, setMetaProjects] = useState([]);

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

    // Fetch task meta (categories + projects) for filter dropdowns
    portalInstance.get("/creat/task-meta")
      .then((r) => {
        if (r.data?.success) {
          setMetaCategories(r.data.data.categories || []);
          setMetaProjects(r.data.data.projects || []);
        }
      })
      .catch(() => { });
  }, []);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    statusValues.forEach((s) => params.append("status", s));
    if (employeeId) params.append("employeeId", employeeId);
    if (filterCategory) params.append("category", filterCategory);
    if (filterProject) params.append("project", filterProject);
    if (dateMode === "Custom" && fromDate && toDate) {
      params.append("fromDate", fromDate);
      params.append("toDate", toDate);
    }
    return params.toString();
  }, [status, employeeId, filterCategory, filterProject, dateMode, fromDate, toDate]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = buildQueryParams();
      const res = await portalInstance.get(`/creat/tasks/dashboard?${query}`);
      setTasks(res.data.data || []);
      setCurrentPage(1);
    } catch (e) {
      console.error("FETCH TASK ERROR:", e);
      setTasks([]);
      setError("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [buildQueryParams]);

  useEffect(() => {
    fetchTasks();
  }, [status]);

  const handleSearch = () => {
    if (dateMode === "Custom" && (!fromDate || !toDate)) {
      alert("Please select both From and To dates");
      return;
    }
    fetchTasks();
  };

  const handleReset = () => {
    setStatus("Assigned");
    setEmployeeId("");
    setDateMode("Today");
    setFromDate("");
    setToDate("");
    setFilterCategory("");
    setFilterProject("");
    setCurrentPage(1);
  };

  const refreshAfterAction = () => fetchTasks();

  const paginatedTasks = tasks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handlePageChange = (page) => setCurrentPage(page);

  const handleStatusChange = (tabLabel) => {
    setStatus(tabLabel);
    setCurrentPage(1);
  };

  const handleDateModeChange = (val) => {
    setDateMode(val);
    if (val !== "Custom") {
      setFromDate("");
      setToDate("");
    }
  };

  const handleEmployeeChange = (val) => setEmployeeId(val);

  return (
    <>
      <Sidebar />
      <div className="employeeTaskPageWrapper mt-3">
        <div className="employeeTaskPage container-fluid">
          <div className="row mt-2 g-3">
            <div className="col-12 col-md-6 col-lg-4">
              <div className="employeeTaskPage__card p-3 h-100">
                <h3 className="employeeTaskPage__card-title">Assign Task</h3>
                <p className="employeeTaskPage__card-text mt-2">
                  Need to assign a new task to your team? <br />
                  Click below to add all the details!
                </p>
                <button
                  className="employeeTaskPage__button employeeTaskPage__button--primary mt-3"
                  onClick={() => setShowCreatPopup(true)}
                >
                  Assign Task
                </button>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="employeeTaskPage__card p-3 h-100">
                <h3 className="employeeTaskPage__card-title">Create a New Task</h3>
                <p className="employeeTaskPage__card-text mt-2">
                  Need to assign a new task to your team? <br />
                  Click below to add all the details!
                </p>
                <button
                  className="employeeTaskPage__button employeeTaskPage__button--primary mt-3"
                  onClick={() => setShowAssignPopup(true)}
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="employeetask_panel mt-3">
              <div className="row g-3 align-items-end justify-content-end">
                <div className="col-6 col-md-6 col-lg-2">
                  <CustomDropdown
                    options={DATE_MODE_OPTIONS}
                    value={dateMode}
                    onChange={handleDateModeChange}
                    placeholder="Select Date Range"
                    className="employeeTaskPage__customDropdown"
                  />
                </div>

                {dateMode === "Custom" && (
                  <>
                    <div className="col-6 col-md-6 col-lg-2">
                      <label className="employeeTaskPage__filterLabel">From Date</label>
                      <input
                        type="date"
                        className="employeeTaskPage__filterInput form-control"
                        max={todayStr}
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                    </div>
                    <div className="col-6 col-md-6 col-lg-2">
                      <label className="employeeTaskPage__filterLabel">To Date</label>
                      <input
                        type="date"
                        className="employeeTaskPage__filterInput form-control"
                        min={fromDate}
                        max={todayStr}
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="col-6 col-md-6 col-lg-2">
                  <CustomDropdown
                    options={employeeOptions}
                    value={employeeId}
                    onChange={handleEmployeeChange}
                    placeholder="All Employees"
                    className="employeeTaskPage__customDropdown"
                  />
                </div>

                <div className="col-6 col-md-6 col-lg-2">
                  <CustomDropdown
                    options={[
                      { value: "", label: "All Categories" },
                      ...metaCategories.filter(c => c && c.toLowerCase() !== "add").map((c) => ({ value: c, label: c })),
                    ]}
                    value={filterCategory}
                    onChange={(val) => { setFilterCategory(val); fetchTasks(); }}
                    placeholder="All Categories"
                    className="employeeTaskPage__customDropdown"
                  />
                </div>

                <div className="col-6 col-md-6 col-lg-2">
                  <CustomDropdown
                    options={[
                      { value: "", label: "All Projects" },
                      ...metaProjects.filter(p => p && p.toLowerCase() !== "add").map((p) => ({ value: p, label: p })),
                    ]}
                    value={filterProject}
                    onChange={(val) => { setFilterProject(val); fetchTasks(); }}
                    placeholder="All Projects"
                    className="employeeTaskPage__customDropdown"
                  />
                </div>

                <div className="col-6 col-md-6 col-lg-2">
                  <CustomDropdown
                    options={STATUS_DROPDOWN_OPTIONS}
                    value={status}
                    onChange={handleStatusChange}
                    placeholder="Select Status"
                    className="employeeTaskPage__customDropdown"
                  />
                </div>

                <div className="col-12 d-flex justify-content-end gap-2 mt-2">
                  <button
                    className="employeeTaskPage__button employeeTaskPage__button--search"
                    onClick={handleSearch}
                  >
                    Search
                  </button>
                  <button
                    className="employeeTaskPage__button employeeTaskPage__button--cancel"
                    onClick={handleReset}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="employeeTaskPage__statusTabsWrapper d-flex align-items-center justify-content-center mt-4 overflow-auto">
                <div className="employeeTaskPage__statusTabs">
                  {STATUS_TABS.map((tab) => (
                    <button
                      key={tab.label}
                      className={`employeeTaskPage__statusTab${status === tab.label ? " employeeTaskPage__statusTab--active" : ""
                        }`}
                      onClick={() => handleStatusChange(tab.label)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="employeeTaskPage__tableCard mt-3 employeeTaskPage__table">
                <div className="table-responsives">
                  <div className="employeeTaskPage__table">
                    <div className="employeeTaskPage__tableHeader">
                      <div className="employeeTaskPage__tableHeaderCell">S.No</div>
                      <div
                        className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center"
                        style={{ minWidth: "160px" }}
                      >
                        Create Date
                      </div>
                      <div className="employeeTaskPage__tableHeaderCell">Assigned By</div>
                      <div className="employeeTaskPage__tableHeaderCell">Assigned To</div>
                      <div className="employeeTaskPage__tableHeaderCell">Category</div>
                      <div className="employeeTaskPage__tableHeaderCell">Project</div>
                      <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--details">
                        Task Details
                      </div>
                      <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">
                        Start Date
                      </div>
                      <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">
                        Due Date
                      </div>
                      <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">
                        End Date
                      </div>
                      <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">
                        Status
                      </div>
                      <div className="employeeTaskPage__tableHeaderCell">Assigned Status</div>
                      <div className="employeeTaskPage__tableHeaderCell employeeTaskPage__tableHeaderCell--center">
                        Priority
                      </div>
                    </div>

                    {loading ? (
                      <div className="employeeTaskPage__tableEmpty p-4 d-flex align-items-center justify-content-center  text-center">
                        Fetching data...
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="employeeTaskPage__tableEmpty p-4 d-flex align-items-center justify-content-center text-center">
                        No tasks found.
                      </div>
                    ) : (
                      paginatedTasks.map((task, index) => (
                        <div
                          key={task._id}
                          className="employeeTaskPage__tableRow"
                          onDoubleClick={() => setSelectedTaskId(task._id)}
                        >
                          <div className="employeeTaskPage__tableCell">
                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                          </div>
                          <div
                            className="employeeTaskPage__tableCelldate"
                            style={{ minWidth: "160px", fontSize: "12px" }}
                          >
                            {formatFullDateWithTime(task.createdDate || task.createdAt)}
                          </div>
                          <div className="employeeTaskPage__tableCell">
                            {task.createdBy?.name || "System"}
                          </div>
                          <div className="employeeTaskPage__tableCell">
                            {task.assignedMembers?.map((m) => m.name).join(", ") || "Myself"}
                          </div>
                          <div className="employeeTaskPage__tableCell">
                            {task.category ? (
                              <span className="empTask__metaTag empTask__metaTag--cat">{task.category}</span>
                            ) : (
                              <span className="empTask__metaNone">—</span>
                            )}
                          </div>
                          <div className="employeeTaskPage__tableCell">
                            {task.project ? (
                              <span className="empTask__metaTag empTask__metaTag--proj">{task.project}</span>
                            ) : (
                              <span className="empTask__metaNone">—</span>
                            )}
                          </div>
                          <div className="employeeTaskPage__tableCell">
                            <strong
                              className="employeeTaskPage__taskTitle d-block text-truncate"
                              style={{ maxWidth: "150px" }}
                            >
                              {task.taskTitle}
                            </strong>
                            <p
                              className="employeeTaskPage__taskDescription text-truncate m-0"
                              style={{ maxWidth: "150px" }}
                            >
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
                          <div
                            className={`employeeTaskPage__tableCell employeeTaskPage__badge employeeTaskPage__badge--status-${getStatusKey(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </div>
                          <div
                            className={`employeeTaskPage__tableCell employeeTaskPage__badge employeeTaskPage__badge--status-${getStatusKey(
                              task.assignedStatus
                            )}`}
                          >
                            {task.assignedStatus || "Pending"}
                          </div>
                          <div
                            className={`employeeTaskPage__tableCelldate employeeTaskPage__badge employeeTaskPage__badge--priority-${getStatusKey(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {!loading && tasks.length > 0 && (
                <Pagination
                  totalItems={tasks.length}
                  pageSize={PAGE_SIZE}
                  currentPage={currentPage}
                  onPageChange={handlePageChange}
                  maxPagesInGroup={5}
                />
              )}
            </div>
            <br />
          </div>
        </div>
      </div>

      {showAssignPopup && (
        <div className="employeeTaskPage__popupBackdrop">
          <div
            className="employeeTaskPage__popupOverlay"
            onClick={() => setShowAssignPopup(false)}
          >
            <div
              className="employeeTaskPage__popupContainer"
              onClick={(e) => e.stopPropagation()}
            >
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
          <div
            className="employeeTaskPage__popupOverlay"
            onClick={() => setShowCreatPopup(false)}
          >
            <div
              className="employeeTaskPage__popupContainer"
              onClick={(e) => e.stopPropagation()}
            >
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
          onClose={() => {
            setSelectedTaskId(null);
            refreshAfterAction();
          }}
        />
      )}
      <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 9999999 }} />
    </>
  );
};

export default EmployeeTaskPage;
