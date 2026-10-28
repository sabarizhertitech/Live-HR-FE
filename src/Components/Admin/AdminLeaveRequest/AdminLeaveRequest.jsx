import React, { useState, useMemo, useRef, useEffect } from "react";
import Sidebar from "../../HeaderSidebar/Sidebar";
import "./AdminLeaveRequest.css";
import FilterIconImg from "../../../../public/Filter.svg";
import DropdownIcon from "../../../../public/Down Arrow.svg";
import AdminLeaveRequestModal from "./AdminLeaveRequestModal";
import { portalInstance } from "../../../Services/instance";
import Pagination from "../../Employee/Pagination/Pagination";
import { ToastContainer } from "react-toastify";

const PAGE_SIZE = 5;

const AdminLeaveRequest = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [allEmployees, setAllEmployees] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [leaveCategories, setLeaveCategories] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);
  const [showInnerEmployeeDropdown, setShowInnerEmployeeDropdown] = useState(false);

  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedRequestType, setSelectedRequestType] = useState("leave");

  // Controls the custom request type dropdown open/close
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef(null);

  // Pending counts for leave, wfh, and permission
  const [pendingCounts, setPendingCounts] = useState({ leave: 0, wfh: 0, permission: 0 });
  const [allLeaveRequests, setAllLeaveRequests] = useState([]);
  const [allWfhRequests, setAllWfhRequests] = useState([]);
  const [allPermissionRequests, setAllPermissionRequests] = useState([]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) => (currentYear - i).toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState("All");

  // Year/Month dropdowns
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const yearRef = useRef(null);
  const monthRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequestData, setSelectedRequestData] = useState(null);

  const allMonthsList = [
    { label: "January", value: "01" },
    { label: "February", value: "02" },
    { label: "March", value: "03" },
    { label: "April", value: "04" },
    { label: "May", value: "05" },
    { label: "June", value: "06" },
    { label: "July", value: "07" },
    { label: "August", value: "08" },
    { label: "September", value: "09" },
    { label: "October", value: "10" },
    { label: "November", value: "11" },
    { label: "December", value: "12" },
  ];

  const availableMonths = useMemo(() => {
    return [{ label: "All Months", value: "All" }, ...allMonthsList];
  }, [allMonthsList]);

  const statusOptions = ["Pending", "Approved", "Rejected", "Cancelled"];

  const requestTypeOptions = [
    { value: "leave", label: "Leave Requests" },
    { value: "wfh", label: "Work From Home" },
    { value: "permission", label: "Permission Requests" },
  ];

  // Fetch all requests
  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [leaveRes, wfhRes, permissionRes, catRes] = await Promise.all([
        portalInstance.get("/api/leaves/admin/all"),
        portalInstance.get("/api/leaves/admin/wfh"),
        portalInstance.get("/api/leaves/admin/permission"),
        portalInstance.get("/leave-categories"),
      ]);

      const leaveData = leaveRes.data?.data || [];
      const wfhData = wfhRes.data?.data || [];

      const permissionData =
        (permissionRes.data?.data || []).map((item) => ({
          ...item,
          requestType: "permission",
          fromDate: item.from,
          toDate: item.to,
          reasonType:
            item.permissionType || "Permission",
          permissionType:
            item.permissionType || "",
          detailedReason:
            item.reason || "",
          dayType: "Permission",
          employee: item.employee || {},
          isExcess: !!item.isExcess,
          monthlyIndex: item.monthlyIndex,
          allowedFreeCount: item.allowedFreeCount,
          leaveDaysToDeduct: item.leaveDaysToDeduct,
          deductCategoryName: item.deductCategoryName,
          intimationNotice: item.intimationNotice,
        }));

      setAllLeaveRequests(leaveData);
      setAllWfhRequests(wfhData);
      setAllPermissionRequests(permissionData);
      setLeaveCategories(catRes.data?.data || []);

      const leavePending = leaveData.filter((i) => i.status?.toLowerCase() === "pending").length;
      const wfhPending = wfhData.filter((i) => i.status?.toLowerCase() === "pending").length;
      const permissionPending = permissionData.filter((i) => i.status?.toLowerCase() === "pending").length;

      setPendingCounts({
        leave: leavePending,
        wfh: wfhPending,
        permission: permissionPending,
      });

      setEmployeeLoading(true);
      const empRes = await portalInstance.get("/data/employees/basic", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (empRes.data?.success) {
        setAllEmployees(empRes.data.employees || []);
        setDepartmentOptions(empRes.data.departments || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      if (showLoading) setLoading(false);
      setEmployeeLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  // Sync requests when type changes
  useEffect(() => {
    setRequests(
      selectedRequestType === "leave"
        ? allLeaveRequests
        : selectedRequestType === "wfh"
          ? allWfhRequests
          : allPermissionRequests
    );
  }, [selectedRequestType, allLeaveRequests, allWfhRequests, allPermissionRequests]);

  // Close all dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setIsTypeDropdownOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(e.target)) {
        setShowYearDropdown(false);
      }
      if (monthRef.current && !monthRef.current.contains(e.target)) {
        setShowMonthDropdown(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterMenu(false);
        setShowInnerEmployeeDropdown(false);
        setEmployeeSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    let filtered = allEmployees;
    if (selectedDepartments.length > 0) {
      filtered = filtered.filter((emp) =>
        selectedDepartments.some(
          (dept) => dept.toLowerCase() === (emp.department || "").toLowerCase()
        )
      );
    }
    if (employeeSearchTerm.trim() !== "") {
      filtered = filtered.filter((emp) =>
        emp.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [allEmployees, selectedDepartments, employeeSearchTerm]);

  useEffect(() => {
    if (selectedEmployeeId) {
      const deptFiltered =
        selectedDepartments.length === 0
          ? allEmployees
          : allEmployees.filter((emp) =>
            selectedDepartments.some(
              (d) => d.toLowerCase() === (emp.department || "").toLowerCase()
            )
          );
      const exists = deptFiltered.find((e) => e._id === selectedEmployeeId);
      if (!exists) setSelectedEmployeeId("");
    }
  }, [selectedDepartments, allEmployees]);

  const handleCheckboxChange = (e, type) => {
    const { value, checked } = e.target;
    if (type === "status") {
      setSelectedStatuses((prev) =>
        checked ? [...prev, value] : prev.filter((item) => item !== value)
      );
    } else if (type === "dept") {
      setSelectedDepartments((prev) =>
        checked ? [...prev, value] : prev.filter((item) => item !== value)
      );
    }
    setCurrentPage(1);
  };

  const handleInnerEmployeeSelect = (id) => {
    setSelectedEmployeeId(id);
    setShowInnerEmployeeDropdown(false);
    setEmployeeSearchTerm("");
    setCurrentPage(1);
  };

  const handleRequestTypeSelect = (type) => {
    setSelectedRequestType(type);
    setIsTypeDropdownOpen(false);
    setCurrentPage(1);
    setSelectedStatuses([]);
  };

  const getSelectedEmployeeLabel = () => {
    if (!selectedEmployeeId) return "All Employees";
    const emp = allEmployees.find((e) => e._id === selectedEmployeeId);
    return emp ? emp.name : "All Employees";
  };

  const getSelectedTypeLabel = () => {
    const found = requestTypeOptions.find((o) => o.value === selectedRequestType);
    return found ? found.label : "Select Type";
  };



  const filteredData = useMemo(() => {
    if (!requests) return [];
    return requests.filter((req) => {
      const dateObj = new Date(req.fromDate);
      const year = dateObj.getFullYear().toString();
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");

      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(req.status);
      const empDept = req.employee?.department?.toLowerCase() || "";
      const matchesDept =
        selectedDepartments.length === 0 ||
        selectedDepartments.some((d) => d.toLowerCase() === empDept);
      const empId = req.employee?._id || req.employeeId || "";
      const matchesEmployee = selectedEmployeeId === "" || empId === selectedEmployeeId;
      const matchesYear = year === selectedYear;
      const matchesMonth = selectedMonth === "All" || month === selectedMonth;

      return matchesStatus && matchesDept && matchesEmployee && matchesYear && matchesMonth;
    });
  }, [requests, selectedStatuses, selectedDepartments, selectedEmployeeId, selectedYear, selectedMonth]);

  const paginatedData = useMemo(
    () => filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredData, currentPage]
  );

  const handlePageChange = (page) => setCurrentPage(page);

  const formatTableDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  };

  const getPageTitle = () =>
    selectedRequestType === "leave"
      ? "Leave Requests Overview"
      : selectedRequestType === "wfh"
        ? "WFH Requests Overview"
        : "Permission Requests Overview";

  // Total = leave pending + wfh pending + permission pending
  const totalPendingCount = (pendingCounts.leave || 0) + (pendingCounts.wfh || 0) + (pendingCounts.permission || 0);

  return (
    <>
      <Sidebar />
      <div className="adminLeaveRequest-wrapper">
          <div className="adminLeaveRequest-panel">
            <div className="adminLeaveRequest-header-row">
              <h4 className="assign-task__members-title m-0">{getPageTitle()}</h4>

              <div className="adminLeaveRequest-filters-group">

                {/* ====================================================
                    REQUEST TYPE CUSTOM DROPDOWN
                    
                    CLOSED state:
                      - Shows selected label + arrow
                      - Green circle badge top-right = leave+wfh total
                      - Badge hidden when total is 0
                    
                    OPEN state:
                      - Corner badge disappears
                      - Each option shows its own green circle badge on right
                      - Per-option badge hidden when count is 0
                    ==================================================== */}
                <div className="alr-type-wrapper" ref={typeDropdownRef}>

                  {/* Trigger */}
                  <button
                    className={`alr-type-trigger ${isTypeDropdownOpen ? "open" : ""}`}
                    onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                  >
                    <span className="alr-type-trigger-label">{getSelectedTypeLabel()}</span>
                    <img
                      src={DropdownIcon}
                      alt="arrow"
                      className={`alr-type-arrow ${isTypeDropdownOpen ? "open" : ""}`}
                    />
                  </button>

                  {/* Corner badge: total pending. Shown only when dropdown is CLOSED and count > 0 */}
                  {!isTypeDropdownOpen && totalPendingCount > 0 && (
                    <span className="alr-corner-badge">{totalPendingCount}</span>
                  )}

                  {/* Dropdown options */}
                  {isTypeDropdownOpen && (
                    <div className="alr-type-menu">
                      {requestTypeOptions.map((option) => {
                        const count =
                          option.value === "leave"
                            ? pendingCounts.leave
                            : option.value === "wfh"
                              ? pendingCounts.wfh
                              : pendingCounts.permission;
                        return (
                          <div
                            key={option.value}
                            className={`alr-type-option ${selectedRequestType === option.value ? "alr-type-option--active" : ""
                              }`}
                            onClick={() => handleRequestTypeSelect(option.value)}
                          >
                            <span className="alr-type-option-label">{option.label}</span>
                            {/* Per-option circle badge — only shown when count > 0 */}
                            {count > 0 && (
                              <span className="alr-option-badge">{count}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>


                {/* YEAR DROPDOWN */}
                <div className="adminLeaveRequest-customSelect" ref={yearRef}>
                  <div
                    className="adminLeaveRequest-customSelectTrigger"
                    onClick={() => setShowYearDropdown((p) => !p)}
                  >
                    <span>{selectedYear}</span>
                    <img
                      src={DropdownIcon}
                      alt="arrow"
                      className={`adminLeaveRequest-dropdownArrow ${showYearDropdown ? "rotate" : ""}`}
                    />
                  </div>
                  {showYearDropdown && (
                    <div className="adminLeaveRequest-customSelectMenu">
                      {years.map((y) => (
                        <div
                          key={y}
                          className={`adminLeaveRequest-customSelectItem ${selectedYear === y ? "active" : ""
                            }`}
                          onClick={() => {
                            setSelectedYear(y);
                            setSelectedMonth("All");
                            setCurrentPage(1);
                            setShowYearDropdown(false);
                          }}
                        >
                          {y}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* MONTH DROPDOWN */}
                <div
                  className="adminLeaveRequest-customSelect adminLeaveRequest-customSelect--month"
                  ref={monthRef}
                >
                  <div
                    className="adminLeaveRequest-customSelectTrigger"
                    onClick={() => setShowMonthDropdown((p) => !p)}
                  >
                    <span>
                      {selectedMonth === "All"
                        ? "All Months"
                        : allMonthsList.find((m) => m.value === selectedMonth)?.label ||
                        "All Months"}
                    </span>
                    <img
                      src={DropdownIcon}
                      alt="arrow"
                      className={`adminLeaveRequest-dropdownArrow ${showMonthDropdown ? "rotate" : ""
                        }`}
                    />
                  </div>
                  {showMonthDropdown && (
                    <div className="adminLeaveRequest-customSelectMenu">
                      {availableMonths.map((m) => (
                        <div
                          key={m.value}
                          className={`adminLeaveRequest-customSelectItem ${selectedMonth === m.value ? "active" : ""
                            }`}
                          onClick={() => {
                            setSelectedMonth(m.value);
                            setCurrentPage(1);
                            setShowMonthDropdown(false);
                          }}
                        >
                          {m.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FILTER ICON + POPUP */}
                <div className="adminLeaveRequest-filterWrapper" ref={filterRef}>
                  <button
                    className={`dwu-employee-filter-icon ${showFilterMenu ? "active" : ""}`}
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                  >
                    <img src={FilterIconImg} alt="filter" className="adminbtn" />
                  </button>

                  {showFilterMenu && (
                    <div className="adminLeaveRequest-filterPopup">
                      <span className="filter-group-label">Status</span>
                      <div className="filter-checkbox-list adminLeaveRequest-headerCell">
                        {statusOptions.map((status) => (
                          <label key={status} className="adminLeaveRequest-checkboxLabel">
                            <input
                              type="checkbox"
                              value={status}
                              checked={selectedStatuses.includes(status)}
                              onChange={(e) => handleCheckboxChange(e, "status")}
                            />
                            {status}
                          </label>
                        ))}
                      </div>

                      <div className="filter-divider"></div>

                      <span className="filter-group-label">Department</span>
                      <div className="filter-checkbox-list adminLeaveRequest-headerCell">
                        {departmentOptions.length > 0 ? (
                          departmentOptions.map((dept) => (
                            <label
                              key={dept}
                              className="adminLeaveRequest-checkboxLabel text-capitalize"
                            >
                              <input
                                type="checkbox"
                                value={dept}
                                checked={selectedDepartments.includes(dept)}
                                onChange={(e) => handleCheckboxChange(e, "dept")}
                              />
                              {dept}
                            </label>
                          ))
                        ) : (
                          <div
                            className="text-muted"
                            style={{ fontSize: "11px", padding: "5px" }}
                          >
                            No departments found
                          </div>
                        )}
                      </div>

                      <div className="filter-divider"></div>

                      <span className="filter-group-label">Employee</span>
                      <div className="filter-inner-dropdown-container">
                        <div
                          className="filter-inner-dropdown-trigger"
                          onClick={() =>
                            setShowInnerEmployeeDropdown(!showInnerEmployeeDropdown)
                          }
                        >
                          <span className="text-truncate">{getSelectedEmployeeLabel()}</span>
                          <img
                            src={DropdownIcon}
                            alt="arrow"
                            className={`adminLeaveRequest-dropdownArrow ${showInnerEmployeeDropdown ? "rotate" : ""
                              }`}
                          />
                        </div>

                        {showInnerEmployeeDropdown && (
                          <div className="filter-inner-dropdown-menu">
                            <div
                              className="filter-search-container"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                className="filter-search-input"
                                placeholder="Search employee..."
                                value={employeeSearchTerm}
                                onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="filter-inner-dropdown-scroll">
                              <div
                                className={`filter-inner-dropdown-item ${selectedEmployeeId === "" ? "active" : ""
                                  }`}
                                onClick={() => handleInnerEmployeeSelect("")}
                              >
                                All Employees
                              </div>
                              {employeeLoading ? (
                                <div className="filter-inner-dropdown-item loading">
                                  Loading...
                                </div>
                              ) : filteredEmployees.length > 0 ? (
                                filteredEmployees.map((emp) => (
                                  <div
                                    key={emp._id}
                                    className={`filter-inner-dropdown-item ${selectedEmployeeId === emp._id ? "active" : ""
                                      }`}
                                    onClick={() => handleInnerEmployeeSelect(emp._id)}
                                  >
                                    {emp.name}
                                  </div>
                                ))
                              ) : (
                                <div className="filter-inner-dropdown-item empty">
                                  No employees found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div className="adminLeaveRequest-tableCard">
              {selectedRequestType === "permission" && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 1px",
                  backgroundColor: "#ffffff",
                  fontSize: "12px",
                  color: "#64748b"
                }}>
                  <span style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#ffedd5",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <span style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "#f97316",
                      display: "inline-block"
                    }} />
                  </span>
                  <span>
                    Monthly permission limit exceeded. Employee can still submit a request.
                  </span>
                </div>
              )}
              <div className="table-responsive">
                <div className="commonTableLayout adminLeaveRequest-table">
                  <div className="adminLeaveRequest-tableHeader">
                    <div className="adminLeaveRequest-headerCell">S.No</div>
                    <div className="adminLeaveRequest-headerCell">Employee</div>
                    <div className="adminLeaveRequest-headerCell">Department</div>
                    <div className="adminLeaveRequest-headerCell">
                      {selectedRequestType === "permission" ? "Date & Time" : "Date Range"}
                    </div>
                    <div className="adminLeaveRequest-headerCell">
                      {selectedRequestType === "permission" ? "Duration" : "Total Days"}
                    </div>
                    <div className="adminLeaveRequest-headerCellstart">
                      {selectedRequestType === "leave" ? "Leave Type" : selectedRequestType === "permission" ? "Type" : "Reason"}
                    </div>
                    <div className="adminLeaveRequest-headerCellstart">Reason</div>
                    <div className="adminLeaveRequest-headerCell">Status</div>
                    <div className="adminLeaveRequest-headerCell adminLeaveRequest-headerCell--center">
                      Action
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-5 text-center adminLeaveRequest-headerCell">
                      Loading...
                    </div>
                  ) : paginatedData.length > 0 ? (
                    paginatedData.map((item, index) => {
                      const serialNumber = (currentPage - 1) * PAGE_SIZE + index + 1;
                      const statusClass = item.status.replace(/\s+/g, "").toLowerCase();
                      const isExcess = selectedRequestType === "permission" && !!item.isExcess;
                      return (
                        <div
                          key={item._id}
                          className="adminLeaveRequest-tableRow"
                          onClick={() => {
                            setSelectedRequestData(item);
                            setIsModalOpen(true);
                          }}
                        >
                          <div className="adminLeaveRequest-tableCell">
                            {isExcess ? (
                              <span className="adminLeaveRequest-sno-excess">
                                {serialNumber < 10 ? `0${serialNumber}` : serialNumber}
                              </span>
                            ) : (
                              <span>
                                {serialNumber < 10 ? `0${serialNumber}` : serialNumber}
                              </span>
                            )}
                          </div>
                          <div className="adminLeaveRequest-tableCell">
                            <span className="adminLeaveRequest-empName">
                              {item.employee?.name || "Unknown"}
                            </span>
                          </div>
                          <div className="adminLeaveRequest-tableCell text-capitalize">
                            {item.employee?.department || "-"}
                          </div>
                          <div className="adminLeaveRequest-tableCell">
                            {selectedRequestType === "permission" ? (
                              <span>
                                {new Date(item.fromDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                <br />
                                <small style={{ color: "#6b7280" }}>
                                  {new Date(item.fromDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} - {new Date(item.toDate).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                </small>
                              </span>
                            ) : (
                              `${formatTableDate(item.fromDate)} - ${formatTableDate(item.toDate)}`
                            )}
                          </div>
                          <div className="adminLeaveRequest-tableCell">
                            {selectedRequestType === "permission" ? (
                              (() => {
                                const diffMs = new Date(item.toDate) - new Date(item.fromDate);
                                const diffMins = Math.ceil(diffMs / 60000);
                                const hrs = Math.floor(diffMins / 60);
                                const mins = diffMins % 60;
                                return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                              })()
                            ) : (
                              `${Number(item.noOfDays)} ${Number(item.noOfDays) > 1 ? "days" : "day"}`
                            )}
                          </div>
                          <div className="adminLeaveRequest-tableCellstart">
                            {selectedRequestType === "leave"
                              ? (
                                {
                                  AL: "Annual Leave",
                                  SL: "Sick Leave",
                                  CL: "Casual Leave",
                                  ML: "Maternity Leave",
                                  PL: "Paternity Leave",
                                  COMP_OFF: "Comp Off",
                                }[item.leaveType] || item.leaveType || "Leave"
                              )
                              : (
                                <span>{item.reasonType === "AFTERNOON" ? "Out & Return" : item.reasonType || "Permission"}</span>
                              )}
                          </div>
                          <div className="adminLeaveRequest-tableCellstart adminLeaveRequest-reasonCell">
                            {item.detailedReason || "No reason"}
                          </div>
                          <div className="adminLeaveRequest-tableCell">
                            <span
                              className={`adminLeaveRequest-badge adminLeaveRequest-badge--${statusClass}`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <div className="adminLeaveRequest-tableCell adminLeaveRequest-tableCell--center">
                            <button
                              className="adminLeaveRequest-previewBtn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequestData(item);
                                setIsModalOpen(true);
                              }}
                            >
                              Preview
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-5 text-center text-muted adminLeaveRequest-tableCell">
                      No data found.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!loading && filteredData.length > 0 && (
              <Pagination
                totalItems={filteredData.length}
                pageSize={PAGE_SIZE}
                currentPage={currentPage}
                onPageChange={handlePageChange}
                maxPagesInGroup={5}
              />
            )}
          </div>

      </div>

      <AdminLeaveRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={selectedRequestData}
        leaveCategories={leaveCategories}
        requestType={selectedRequestType}
        onStatusUpdate={() => {
          fetchData(false);
        }}
      />
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default AdminLeaveRequest;