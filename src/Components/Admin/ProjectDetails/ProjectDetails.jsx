import React, { useEffect, useState, useRef } from "react";
import { portalInstance } from "../../../Services/instance";
import Sidebar from "../../HeaderSidebar/Sidebar";
import { Button, Spinner, Modal } from "react-bootstrap";
import { FaChevronDown } from "react-icons/fa";
import { Icon } from "@iconify/react";
import Pagination from "../../Employee/Pagination/Pagination";
import CustomDropdown from "../../Common/CustomDropdown";
import "../AdminDashboard/DashBoard.css";
import "./ProjectDetails.css";
import "../../../Globel/Layout.css";

const buildFileUrl = (fileUrl) => {
  if (!fileUrl) return null;
  if (fileUrl === "avatar.png") return "/avatar.png";
  if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
    return fileUrl;
  }
  const base = (portalInstance.defaults.baseURL || "").replace(/\/+$/, "");
  const path = fileUrl.replace(/^\/+/, "");
  return `${base}/${path}`;
};

const DATE_RANGE_OPTIONS = [
  { value: "All", label: "All Time" },
  { value: "Today", label: "Today" },
  { value: "This Week", label: "This Week" },
  { value: "This Month", label: "This Month" },
  { value: "Custom", label: "Custom Date Range" },
];

const STATUS_OPTIONS = [
  { value: "All", label: "All Statuses" },
  { value: "Completed", label: "Completed" },
  { value: "In Progress", label: "In Progress" },
  { value: "Pending", label: "Pending" },
  { value: "Blocked", label: "Blocked" },
];

const ProjectDetails = () => {
  // ── States ────────────────────────────────────────────────────────
  const [projectList, setProjectList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // ── Filter States ────────────────────────────────────────────────
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDateRange, setFilterDateRange] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Applied filter values (applied on clicking "Search")
  const [appliedFilters, setAppliedFilters] = useState({
    category: "All",
    status: "All",
    dateRange: "All",
    fromDate: "",
    toDate: "",
  });

  const fromDateRef = useRef(null);
  const toDateRef = useRef(null);

  // ── Modal & Drill-down States ────────────────────────────────────
  const [selectedProjectInfo, setSelectedProjectInfo] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectUpdates, setProjectUpdates] = useState([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);
  const [projSelectedEmpId, setProjSelectedEmpId] = useState(null);
  const [projExpandedCards, setProjExpandedCards] = useState({});
  const [selectedEmpUpdates, setSelectedEmpUpdates] = useState(null);
  const [selectedUpdate, setSelectedUpdate] = useState(null);
  const [showUpdateDetailModal, setShowUpdateDetailModal] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth <= 1024);

  // ── Pagination States ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth <= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Fetch Projects ───────────────────────────────────────────────
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await portalInstance.get("/creat/task-meta");
      if (res.data?.success && res.data?.data?.fullProjects) {
        setProjectList(res.data.data.fullProjects || []);
      }
    } catch (err) {
      console.error("❌ Failed to fetch project list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // ── Handle Filter Search & Reset ─────────────────────────────────
  const handleApplyFilters = () => {
    setAppliedFilters({
      category: filterCategory,
      status: filterStatus,
      dateRange: filterDateRange,
      fromDate,
      toDate,
    });
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterCategory("All");
    setFilterStatus("All");
    setFilterDateRange("All");
    setFromDate("");
    setToDate("");
    setSearchTerm("");
    setAppliedFilters({
      category: "All",
      status: "All",
      dateRange: "All",
      fromDate: "",
      toDate: "",
    });
    setCurrentPage(1);
  };

  // ── Handle Project Click / Open Modal ────────────────────────────
  const handleProjectClick = async (proj) => {
    try {
      const projectName = proj.name;
      const categoryName = proj.categoryId?.name || "";

      setSelectedProjectInfo(`${categoryName} - ${projectName}`);
      setProjectUpdates([]);
      setShowProjectModal(true);
      setUpdatesLoading(true);
      setProjSelectedEmpId(null);
      setProjExpandedCards({});

      const params = { project: projectName, category: categoryName };
      if (appliedFilters.employee && appliedFilters.employee !== "All") {
        params.empId = appliedFilters.employee;
      }

      const res = await portalInstance.get("/creat/daily-update/standalone-updates", { params });

      if (res.data?.success) {
        setProjectUpdates(res.data.data || []);
      }
    } catch (err) {
      console.error("❌ Fetch project updates error:", err);
    } finally {
      setUpdatesLoading(false);
    }
  };

  // ── Export to Excel ──────────────────────────────────────────────
  const exportToExcel = (data, filename) => {
    if (!data || data.length === 0) return;

    const headers = ["S.No", "Employee Name", "Emp ID", "Task Title", "Date", "Status", "Work Description"];
    const baseWidth = 7;
    const colWidths = [40, 150, 80, 180, 100, 100, 400];

    data.forEach((u) => {
      const name = u.employeeDetails?.name || "N/A";
      const title = u.displayTitle || u.task?.taskTitle || u.standaloneTitle || "Work Summary";
      const desc = u.description || u.phase || u.details || u.note || "No details provided";

      if (name.length * baseWidth > colWidths[1]) colWidths[1] = Math.min(name.length * baseWidth, 250);
      if (title.length * baseWidth > colWidths[3]) colWidths[3] = Math.min(title.length * baseWidth, 300);
      if (desc.length * (baseWidth * 0.4) > colWidths[6]) colWidths[6] = Math.min(desc.length * (baseWidth * 0.4), 500);
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#000000"/>
   </Borders>
  </Style>
  <Style ss:ID="Data">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Project Updates">
  <Table>
   ${colWidths.map((w) => `<Column ss:Width="${w}"/>`).join("\n   ")}
   <Row ss:Height="25">
    ${headers.map((h) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>`).join("")}
   </Row>`;

    data.forEach((u, i) => {
      const name = (u.employeeDetails?.name || "N/A").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const empId = (u.employeeDetails?.empId || "N/A").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const title = (u.displayTitle || u.task?.taskTitle || u.standaloneTitle || "Work Summary").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const date = u.completionDate ? new Date(u.completionDate).toLocaleDateString("en-GB") : "—";
      const status = (u.phaseStatus || "Pending").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const desc = (u.description || u.phase || u.details || u.note || "No details provided").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      xml += `
   <Row ss:Height="30">
    <Cell ss:StyleID="Data"><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${name}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${empId}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${title}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${date}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${status}</Data></Cell>
    <Cell ss:StyleID="Data"><Data ss:Type="String">${desc}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename || "Project_Details_Export"}.xls`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // ── Dropdown Options ─────────────────────────────────────────────
  const categoryOptions = [
    { value: "All", label: "All Categories" },
    ...Array.from(new Set(projectList.map((p) => p.categoryId?.name).filter(Boolean))).map((cat) => ({
      value: cat,
      label: cat,
    })),
  ];

  const employeeOptions = [
    { value: "All", label: "All Employees" },
    ...employeesList.map((emp) => ({
      value: emp.empId || emp._id,
      label: `${emp.name || emp.employeeName} (${emp.empId || "—"})`,
    })),
  ];

  // ── Filtered Projects ────────────────────────────────────────────
  const filteredProjects = projectList.filter((proj) => {
    const catName = proj.categoryId?.name || "Uncategorized";
    const matchesCategory =
      appliedFilters.category === "All" || catName.toLowerCase() === appliedFilters.category.toLowerCase();
    const matchesSearch =
      proj.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      catName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const paginatedProjects = filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <Sidebar />
      <div className="common-page-container">
        <div className="project-details-container">
          {/* Header */}
          <div className="project-details-page-header">
            <div>
              <p className="project-details-page-subtitle">
                Overview of all company projects and employee working status updates
              </p>
            </div>
            <div className="project-details-stats-badge">
              Total Projects: <strong>{filteredProjects.length}</strong>
            </div>
          </div>

          {/* Top Search & Filter Toggle Control */}
          <div className="project-details-top-controls">
            <div className="project-details-search-box">
              <Icon icon="solar:magnifer-linear" width="18" color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by project name or category..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchTerm && (
                <Icon
                  icon="solar:close-circle-bold"
                  width="16"
                  color="#94a3b8"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSearchTerm("")}
                />
              )}
            </div>

            <div className="project-details-right-actions">
              <button
                type="button"
                className={`dwu-employee-filter-icon ${showFilterMenu ? "active" : ""}`}
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                title="Toggle Filters"
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  border: showFilterMenu ? "1px solid #5977f8" : "1px solid #cbd5e1",
                  background: showFilterMenu ? "#eff6ff" : "#ffffff",
                  transition: "all 0.2s ease",
                }}
              >
                <img src="/Filter.svg" alt="filter" style={{ width: "20px", height: "20px" }} />
              </button>
            </div>
          </div>

          {/* Expandable Filter Panel */}
          {showFilterMenu && (
            <div className="project-details-filter-panel">
              <div className="project-details-filter-grid">
                {/* 1. Category */}
                <div className="project-filter-field">
                  <label className="project-filter-label">Category</label>
                  <CustomDropdown
                    options={categoryOptions}
                    value={filterCategory}
                    onChange={setFilterCategory}
                    placeholder="All Categories"
                    style={{ height: "38px" }}
                  />
                </div>

                {/* 2. Status */}
                <div className="project-filter-field">
                  <label className="project-filter-label">Status</label>
                  <CustomDropdown
                    options={STATUS_OPTIONS}
                    value={filterStatus}
                    onChange={setFilterStatus}
                    placeholder="All Statuses"
                    style={{ height: "38px" }}
                  />
                </div>

                {/* 3. Date Range */}
                <div className="project-filter-field">
                  <label className="project-filter-label">Date Range</label>
                  <CustomDropdown
                    options={DATE_RANGE_OPTIONS}
                    value={filterDateRange}
                    onChange={setFilterDateRange}
                    placeholder="All Time"
                    style={{ height: "38px" }}
                  />
                </div>

                {/* Custom Dates */}
                {filterDateRange === "Custom" && (
                  <>
                    <div className="project-filter-field">
                      <label className="project-filter-label">From Date</label>
                      <div className="project-filter-date-wrap">
                        <input
                          ref={fromDateRef}
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                        />
                        <img
                          src="/Calander.svg"
                          alt="calendar"
                          className="project-filter-calendar-icon"
                          onClick={() => (fromDateRef.current?.showPicker ? fromDateRef.current.showPicker() : fromDateRef.current?.focus())}
                        />
                      </div>
                    </div>
                    <div className="project-filter-field">
                      <label className="project-filter-label">To Date</label>
                      <div className="project-filter-date-wrap">
                        <input
                          ref={toDateRef}
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                        />
                        <img
                          src="/Calander.svg"
                          alt="calendar"
                          className="project-filter-calendar-icon"
                          onClick={() => (toDateRef.current?.showPicker ? toDateRef.current.showPicker() : toDateRef.current?.focus())}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="project-filter-actions">
                <button
                  type="button"
                  className="common-modal-btn btn-small-cancel"
                  onClick={handleResetFilters}
                  style={{ minWidth: "90px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="common-modal-btn btn-update"
                  onClick={handleApplyFilters}
                  style={{ minWidth: "90px" }}
                >
                  Search
                </button>
              </div>
            </div>
          )}

          {/* Projects Table Card */}
          <div className="admin-to-do-list-card content-card p-3 mb-4">
            <div className="table-responsive">
              <table className="project-details-table">
                <thead>
                  <tr className="admin-dash-table-header">
                    <th style={{ width: "80px" }}>S.No</th>
                    <th style={{ width: "220px" }}>Category</th>
                    <th>Project Name</th>
                    <th style={{ width: "160px" }}>Project Status</th>
                    <th style={{ width: "160px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5">
                        <Spinner animation="border" size="sm" variant="primary" />
                        <span className="ms-2 text-muted" style={{ fontSize: "13px" }}>Loading projects...</span>
                      </td>
                    </tr>
                  ) : paginatedProjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        No projects found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedProjects.map((proj, idx) => (
                      <tr
                        key={proj._id || idx}
                        className="project-row-hover"
                        style={{ cursor: "pointer" }}
                        onClick={() => handleProjectClick(proj)}
                      >
                        <td>{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                        <td className="proj-cat-cell">
                          <span className="project-category-tag">
                            {proj.categoryId?.name || "Uncategorized"}
                          </span>
                        </td>
                        <td className="proj-name-cell">
                          <span className="project-name-text">{proj.name}</span>
                        </td>
                        <td className="proj-status-cell">
                          <span className={`project-status-tag ${proj.status ? proj.status.toLowerCase().replace(/\s+/g, "-") : "active"}`}>
                            {proj.status || "Active"}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="common-modal-btn btn-update"
                            style={{ minWidth: "110px", padding: "6px 14px", fontSize: "12px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProjectClick(proj);
                            }}
                          >
                            View Updates
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredProjects.length > itemsPerPage && (
              <div className="admin-dash-pagination-container">
                <Pagination
                  totalItems={filteredProjects.length}
                  pageSize={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PROJECT DETAILS 2-PANEL MODAL ── */}
      <Modal
        show={showProjectModal}
        onHide={() => {
          setShowProjectModal(false);
          setProjSelectedEmpId(null);
          setProjExpandedCards({});
        }}
        centered
        size="xl"
        className="project-phases-modal-custom project-phases-modal-custom-admin"
      >
        <Modal.Header className="project-details-modal-header border-0 pb-0 d-flex flex-column align-items-stretch">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="common-modal-title m-0">Project Details</h4>
            <button
              type="button"
              className="common-modal-close-x"
              onClick={() => {
                setShowProjectModal(false);
                setProjSelectedEmpId(null);
                setProjExpandedCards({});
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Subheader: Category/Project on Left, Export Excel on Right */}
          <div className="d-flex justify-content-between align-items-center w-100 mb-3 mt-3 project-details-modal-subheader-row">
            <div className="project-details-modal-header-content d-flex align-items-center">
              <div className="project-details-modal-item">
                <span className="dwu-work-card__label">Project</span>
                <span className="dwu-work-card__value">
                  {selectedProjectInfo?.split(" - ")[1] || "Project Details"}
                </span>
              </div>
              <div className="project-details-modal-item">
                <span className="dwu-work-card__label">Category</span>
                <span className="dwu-work-card__value">
                  {selectedProjectInfo?.split(" - ")[0] || "General"}
                </span>
              </div>
            </div>

            <Button
              variant="outline-primary"
              size="sm"
              className="excel-export-btn"
              onClick={() =>
                exportToExcel(
                  projectUpdates,
                  `Project_Details_${selectedProjectInfo?.replace(/\s+/g, "_") || "Export"}`
                )
              }
            >
              Export Excel
            </Button>
          </div>
        </Modal.Header>

        <Modal.Body className="project-details-modal-body">
          {updatesLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted" style={{ fontSize: "13px" }}>
                Analyzing project data...
              </p>
            </div>
          ) : projectUpdates.length === 0 ? (
            <div className="project-details-no-work-container">
              <h5 className="project-details-no-work-title">No Work Recorded</h5>
              <p className="text-muted small">
                No specific work summaries have been logged for this project yet.
              </p>
            </div>
          ) : (() => {
            const empMap = {};
            projectUpdates.forEach((u) => {
              const empId = u.employeeDetails?.empId || u.employeeDetails?.name || "unknown";
              if (!empMap[empId]) {
                empMap[empId] = {
                  empId,
                  name: u.employeeDetails?.name || "N/A",
                  designation: u.employeeDetails?.designation || "",
                  photo: buildFileUrl(u.employeeDetails?.photo),
                  latestDate: u.completionDate,
                  updates: [],
                };
              }
              empMap[empId].updates.push(u);
              if (new Date(u.completionDate) > new Date(empMap[empId].latestDate)) {
                empMap[empId].latestDate = u.completionDate;
              }
            });

            const empList = Object.values(empMap);
            if (empList.length > 1) {
              const allLatestDate = projectUpdates.reduce((max, u) => {
                const d = new Date(u.completionDate);
                return d > max ? d : max;
              }, new Date(0));
              empList.unshift({
                empId: "all",
                name: "All Employees",
                designation: "Project Overview",
                photo: null,
                latestDate: allLatestDate,
                updates: projectUpdates,
                isAll: true,
              });
            }

            const activeEmpId = projSelectedEmpId || empList[0]?.empId;
            const activeEmp =
              activeEmpId === "all" ? { name: "All Employees", updates: projectUpdates } : empMap[activeEmpId];

            return (
              <div className="project-details-two-panel">
                {/* ════ LEFT PANEL: Employee List ════ */}
                <div className="project-details-left-panel">
                  <div className="project-details-left-header">
                    <span style={{ width: "40px" }}>S.No</span>
                    <span style={{ flex: 1 }}>Employee Name</span>
                  </div>
                  <div className="project-details-left-list">
                    {empList.map((emp, idx) => (
                      <div
                        key={emp.empId}
                        onClick={() => {
                          if (isMobileOrTablet) {
                            setSelectedEmpUpdates(emp);
                          } else {
                            setProjSelectedEmpId(emp.empId);
                            setProjExpandedCards({});
                          }
                        }}
                        className={`project-details-emp-item ${activeEmpId === emp.empId ? "active" : ""}`}
                      >
                        <span className="project-details-emp-index">{String(idx + 1).padStart(2, "0")}</span>
                        <div className="project-details-emp-avatar-box">
                          {emp.isAll ? (
                            <div
                              className="project-details-emp-initials"
                              style={{ background: "#5977f8", color: "white" }}
                            >
                              <Icon icon="solar:users-group-rounded-bold" width={20} />
                            </div>
                          ) : emp.photo ? (
                            <img
                              src={emp.photo}
                              alt=""
                              className="project-details-emp-photo"
                              onError={(e) => {
                                e.target.src = "/avatar.png";
                              }}
                            />
                          ) : (
                            <div className="project-details-emp-initials">{emp.name?.charAt(0) || "?"}</div>
                          )}
                          <div className="project-details-emp-info">
                            <span className="project-details-emp-name">{emp.name}</span>
                            <span className="project-details-emp-designation">{emp.designation}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ════ RIGHT PANEL: Work Details ════ */}
                {!isMobileOrTablet && (
                  <div className="project-details-right-panel">
                    {activeEmp ? (
                      <>
                        <div className="project-details-right-header">
                          <span className="project-details-right-header-title">
                            {activeEmp.name} Working Status
                          </span>
                        </div>
                        <div className="project-details-right-list">
                          {activeEmp.updates.map((u, idx) => {
                            const cardKey = `${activeEmpId}-${idx}`;
                            const isExpanded = !!projExpandedCards[cardKey];
                            return (
                              <div
                                key={idx}
                                className={`dwu-work-card ${isExpanded ? "expanded" : ""}`}
                                style={{ cursor: "pointer", margin: "10px" }}
                                onClick={() =>
                                  setProjExpandedCards((prev) => ({ ...prev, [cardKey]: !isExpanded }))
                                }
                              >
                                <div
                                  className="dwu-work-card__header"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "16px",
                                    padding: "12px 12px",
                                  }}
                                >
                                  <div
                                    className="dwu-work-card__field dwu-field-title"
                                    style={{ flex: 1, minWidth: 0 }}
                                  >
                                    <span className="dwu-work-card__label">
                                      {activeEmpId === "all"
                                        ? u.employeeDetails?.name || "Employee"
                                        : "Task"}
                                    </span>
                                    <span
                                      className="dwu-work-card__value"
                                      title={u.displayTitle || u.task?.taskTitle || "Task Title"}
                                      style={{
                                        display: "block",
                                        wordBreak: "break-word",
                                        whiteSpace: "normal",
                                      }}
                                    >
                                      {u.displayTitle || u.task?.taskTitle || "Task Title"}
                                    </span>
                                  </div>
                                  <div
                                    className="dwu-work-card__field dwu-field-date"
                                    style={{ width: "70px", flexShrink: 0, textAlign: "left" }}
                                  >
                                    <span className="dwu-work-card__label dwu-label-hide-mobile">Date</span>
                                    <span className="dwu-work-card__value">
                                      {u.completionDate
                                        ? new Date(u.completionDate).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "short",
                                          })
                                        : "—"}
                                    </span>
                                  </div>

                                  <div
                                    className="dwu-work-card__field dwu-field-status"
                                    style={{ width: "95px", flexShrink: 0, textAlign: "left" }}
                                  >
                                    <span className="dwu-work-card__label dwu-label-hide-mobile">Status</span>
                                    <span
                                      className={`dwu-admin__statusBadge dwu-admin__statusBadge--${(
                                        u.phaseStatus || "pending"
                                      )
                                        .toLowerCase()
                                        .replace(/\s+/g, "")}`}
                                    >
                                      {u.phaseStatus || "Pending"}
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      width: "20px",
                                      marginBottom: "none",
                                      flexShrink: 0,
                                      display: "flex",
                                      justifyContent: "flex-start",
                                      alignItems: "start",
                                    }}
                                  >
                                    <FaChevronDown
                                      className="project-task-card-chevron"
                                      style={{
                                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                        transition: "transform 0.2s",
                                      }}
                                    />
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="dwu-work-card__section_phase">
                                    <span className="dwu-work-card__label mt-0 d-block mb-1">
                                      Description
                                    </span>
                                    <p
                                      className="dwu-work-card__text"
                                      style={{
                                        cursor: "pointer",
                                        wordBreak: "break-word",
                                        overflowWrap: "anywhere",
                                        whiteSpace: "pre-wrap",
                                        margin: 0,
                                        paddingRight: "8px",
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedUpdate(u);
                                        setShowUpdateDetailModal(true);
                                      }}
                                    >
                                      {u.description ||
                                        u.phase ||
                                        u.details ||
                                        u.note ||
                                        "No additional description provided."}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="project-details-select-emp-placeholder">
                        <p>Select an employee to view updates.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-3 pb-0 pe-0 project-details-modal-footer-custom">
          <Button
            variant="light"
            onClick={() => {
              setShowProjectModal(false);
              setProjSelectedEmpId(null);
              setProjExpandedCards({});
            }}
            className="project-details-modal-cancel-btn"
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Employee specific updates modal for mobile/tablet screen ── */}
      <Modal
        show={!!selectedEmpUpdates}
        onHide={() => setSelectedEmpUpdates(null)}
        centered
        size="md"
        className="project-phases-modal-custom project-phases-modal-custom-admin"
      >
        <Modal.Header className="project-details-modal-header border-0 pb-0 d-flex flex-column align-items-stretch">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="assign-task__members-title m-0">
              {selectedEmpUpdates?.name} Updates
            </h4>
            <button
              type="button"
              className="common-modal-close-x"
              onClick={() => setSelectedEmpUpdates(null)}
              aria-label="Close"
              style={{
                background: "none",
                border: "none",
                fontSize: "16px",
                cursor: "pointer",
                color: "#6b7280",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ borderBottom: "1px solid #f1f5f9" }}></div>
        </Modal.Header>
        <Modal.Body
          className="project-details-modal-body px-4 pt-0 pb-4"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          {selectedEmpUpdates && (
            <div className="project-details-right-list">
              {selectedEmpUpdates.updates.map((u, idx) => {
                const cardKey = `popup-${selectedEmpUpdates.empId}-${idx}`;
                const isExpanded = !!projExpandedCards[cardKey];
                return (
                  <div
                    key={idx}
                    className={`dwu-work-card ${isExpanded ? "expanded" : ""}`}
                    style={{ cursor: "pointer", margin: "10px 0" }}
                    onClick={() =>
                      setProjExpandedCards((prev) => ({
                        ...prev,
                        [cardKey]: !isExpanded,
                      }))
                    }
                  >
                    <div
                      className="dwu-work-card__header"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "12px 12px",
                      }}
                    >
                      <div
                        className="dwu-work-card__field dwu-field-title"
                        style={{ flex: 1, minWidth: 0 }}
                      >
                        <span className="dwu-work-card__label">
                          {selectedEmpUpdates.isAll
                            ? u.employeeDetails?.name || "Employee"
                            : "Task"}
                        </span>
                        <span
                          className="dwu-work-card__value"
                          title={u.displayTitle || u.task?.taskTitle || "Task Title"}
                          style={{
                            display: "block",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                          }}
                        >
                          {u.displayTitle || u.task?.taskTitle || "Task Title"}
                        </span>
                      </div>
                      <div
                        className="dwu-work-card__field dwu-field-date"
                        style={{ width: "70px", flexShrink: 0, textAlign: "left" }}
                      >
                        <span className="dwu-work-card__label">Date</span>
                        <span className="dwu-work-card__value">
                          {u.completionDate
                            ? new Date(u.completionDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })
                            : "—"}
                        </span>
                      </div>

                      <div
                        className="dwu-work-card__field dwu-field-status"
                        style={{ width: "95px", flexShrink: 0, textAlign: "left" }}
                      >
                        <span className="dwu-work-card__label">Status</span>
                        <span
                          className={`dwu-admin__statusBadge dwu-admin__statusBadge--${(
                            u.phaseStatus || "pending"
                          )
                            .toLowerCase()
                            .replace(/\s+/g, "")}`}
                        >
                          {u.phaseStatus || "Pending"}
                        </span>
                      </div>
                      <div
                        style={{
                          width: "20px",
                          marginBottom: "none",
                          flexShrink: 0,
                          display: "flex",
                          justifyContent: "flex-start",
                          alignItems: "start",
                        }}
                      >
                        <FaChevronDown
                          className="project-task-card-chevron"
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s",
                          }}
                        />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="dwu-work-card__section_phase">
                        <span className="dwu-work-card__label mt-0 d-block mb-1">
                          Description
                        </span>
                        <p
                          className="dwu-work-card__text"
                          style={{
                            cursor: "pointer",
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            whiteSpace: "pre-wrap",
                            margin: 0,
                            paddingRight: "8px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUpdate(u);
                            setShowUpdateDetailModal(true);
                          }}
                        >
                          {u.description ||
                            u.phase ||
                            u.details ||
                            u.note ||
                            "No additional description provided."}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="light"
            onClick={() => setSelectedEmpUpdates(null)}
            className="common-modal-btn btn-small-cancel w-100"
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Work Update Deep-Dive Details Modal ── */}
      <Modal
        show={showUpdateDetailModal}
        onHide={() => setShowUpdateDetailModal(false)}
        centered
        size="lg"
        className="project-phases-modal-custom project-phases-modal-custom-admin"
      >
        <Modal.Header className="project-details-modal-header border-0 pb-0 d-flex justify-content-between align-items-center">
          <h4 className="common-modal-title m-0">Work Update Details</h4>
          <button
            type="button"
            className="common-modal-close-x"
            onClick={() => setShowUpdateDetailModal(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </Modal.Header>
        <Modal.Body className="project-details-modal-body px-4 py-3">
          {selectedUpdate && (
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 p-3 bg-light rounded-3">
                <div>
                  <span className="dwu-work-card__label d-block">Employee</span>
                  <span className="fw-semibold text-dark">
                    {selectedUpdate.employeeDetails?.name || "N/A"} ({selectedUpdate.employeeDetails?.empId || "—"})
                  </span>
                </div>
                <div>
                  <span className="dwu-work-card__label d-block">Completion Date</span>
                  <span className="fw-semibold text-dark">
                    {selectedUpdate.completionDate
                      ? new Date(selectedUpdate.completionDate).toLocaleDateString("en-GB")
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="dwu-work-card__label d-block">Phase Status</span>
                  <span
                    className={`dwu-admin__statusBadge dwu-admin__statusBadge--${(
                      selectedUpdate.phaseStatus || "pending"
                    )
                      .toLowerCase()
                      .replace(/\s+/g, "")}`}
                  >
                    {selectedUpdate.phaseStatus || "Pending"}
                  </span>
                </div>
              </div>

              <div>
                <span className="dwu-work-card__label d-block mb-1">Task Title</span>
                <p className="fw-medium text-dark m-0">
                  {selectedUpdate.displayTitle ||
                    selectedUpdate.task?.taskTitle ||
                    selectedUpdate.standaloneTitle ||
                    "—"}
                </p>
              </div>

              <div>
                <span className="dwu-work-card__label d-block mb-1">Detailed Description</span>
                <div
                  className="p-3 border rounded-3 bg-white"
                  style={{
                    maxHeight: "300px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    color: "#334155",
                  }}
                >
                  {selectedUpdate.description ||
                    selectedUpdate.phase ||
                    selectedUpdate.details ||
                    selectedUpdate.note ||
                    "No detailed description provided."}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="light"
            onClick={() => setShowUpdateDetailModal(false)}
            className="common-modal-btn btn-small-cancel"
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ProjectDetails;
