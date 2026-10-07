import React, { useState, useEffect, useRef } from "react";
import { portalInstance } from "../../../Services/instance";
import Sidebar from "../../HeaderSidebar/Sidebar";
import "./HolidayAssignmentAdmin.css";
import Pagination from "../../Employee/Pagination/Pagination";
import GovHolidayEditPopup from "../editgov/Editgovholiday";
import CustomDropdown from "../../Common/CustomDropdown";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HolidayAssignmentBanner from "./HolidayAssignmentBanner";
import "../../../Globel/Layout.css"
import "../AttendanceReport/AttendanceOverview.css";
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const monthNamesShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const weekDaysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const getCurrentYear = () => new Date().getFullYear();
const PAST_YEARS_COUNT = 3;

const isValidYear = (year) => year >= getCurrentYear() - PAST_YEARS_COUNT;

const getValidYears = () => {
  const y = getCurrentYear();
  const arr = [];
  for (let i = -PAST_YEARS_COUNT; i <= 10; i++) {
    arr.push(y + i);
  }
  return arr;
};

const getDaySuffix = (day) => {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

const getSecondSaturday = (year, month) => {
  const f = new Date(year, month, 1).getDay();
  return 1 + (f === 6 ? 0 : (6 - f + 7) % 7) + 7;
};

const getFourthSaturday = (year, month) => {
  const f = new Date(year, month, 1).getDay();
  const d = 1 + (f === 6 ? 0 : (6 - f + 7) % 7) + 21;
  return d <= new Date(year, month + 1, 0).getDate() ? d : null;
};

const getSundaysInMonth = (year, month) => {
  const s = [];
  const dim = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= dim; d++) {
    if (new Date(year, month, d).getDay() === 0) s.push(d);
  }
  return s;
};

const getWeekdayName = (year, month, day) =>
  weekDaysFull[new Date(year, month, day).getDay()];

const generateCalendarGrid = (monthIndex, year) => {
  const first = new Date(year, monthIndex, 1).getDay();
  const dim = new Date(year, monthIndex + 1, 0).getDate();
  const prev = new Date(year, monthIndex, 0).getDate();
  const grid = [];
  for (let i = first - 1; i >= 0; i--) grid.push({ day: prev - i, type: "prev" });
  for (let i = 1; i <= dim; i++) grid.push({ day: i, type: "current" });
  for (let i = 1; i <= 42 - grid.length; i++) grid.push({ day: i, type: "next" });
  return grid;
};

const CloseButton = ({ onClick, variant = "default" }) => (
  <button
    type="button"
    className="hrms-common-close-btn"
    onClick={onClick}
    aria-label="Close"
  >
    ✕
  </button>
);

const AlertPopup = ({ config, onClose }) => {
  if (!config) return null;
  const {
    type = "confirm", title, message, detail,
    confirmLabel = "Confirm", cancelLabel = "Cancel",
    onConfirm, onCancel,
  } = config;

  const handleConfirm = () => { onClose(); if (onConfirm) onConfirm(); };
  const handleCancel = () => { onClose(); if (onCancel) onCancel(); };

  const typeStyles = {
    confirm: { confirmBg: "#5977f8" },
    warning: { confirmBg: "#f59e0b" },
    danger: { confirmBg: "#ef4444" },
    alert: { confirmBg: "#16a34a" },
    success: { confirmBg: "#16a34a" },
  };
  const s = typeStyles[type] || typeStyles.confirm;

  const getConfirmClass = () => {
    if (type === "danger") return "btn-reject";
    if (type === "success" || type === "alert") return "btn-confirm-success";
    return "btn-update";
  };

  return (
    <div className="ha-alert-overlay">
      <div className="ha-alert-popup">
        <div className="dwu-modal-header d-flex justify-content-between align-items-center w-100">
          <h3 className="common-modal-title">{title}</h3>
          <button className="common-modal-close-x" onClick={handleCancel}>✕</button>
        </div>
        <div className="ha-alert-content common-modal-body">
          {message && <p className="ha-alert-message">{message}</p>}
          {detail && <div className="ha-alert-detail">{detail}</div>}
        </div>
        <div className="ha-alert-actions">
          {type !== "alert" && type !== "success" ? (
            <button className="ha-alert-btn ha-alert-btn--cancel common-modal-btn btn-small-cancel" onClick={handleCancel}>
              {cancelLabel}
            </button>
          ) : (
            <button className="ha-alert-btn ha-alert-btn--cancel common-modal-btn btn-small-cancel" onClick={handleCancel}>
              Close
            </button>
          )}
          <button
            className={`ha-alert-btn ha-alert-btn--confirm common-modal-btn ${getConfirmClass()}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    pending: { cls: "badge--pending", label: "Pending" },
    "in-progress": { cls: "badge--progress", label: "In Progress" },
    submitted: { cls: "badge--submitted", label: "Submitted" },
    approved: { cls: "badge--approved", label: "Approved" },
    rejected: { cls: "badge--rejected", label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return <span className={`ha-badge ${s.cls}`}>{s.label}</span>;
};

const AssignmentActions = ({ assignment, onView, onEdit, onReassign, onDelete, isMobile = false }) => {
  const isApproved = assignment.status === "approved";
  return (
    <div className={isMobile ? "ha-assignment-card__footer" : "ha-actions"}>
      {!isApproved && (
        <button className="ha-icon-btn ha-icon-btn--view" onClick={() => onView(assignment)} title="View Details">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {isMobile && <span>View</span>}
        </button>
      )}
      {isApproved && (
        <button className="ha-icon-btn ha-icon-btn--edit" onClick={() => onEdit(assignment)} title="Edit Approved Calendar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {isMobile && <span>Edit</span>}
        </button>
      )}
      {!isApproved && (
        <button className="ha-icon-btn ha-icon-btn--delete" onClick={() => onDelete(assignment._id)} title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          {isMobile && <span>Delete</span>}
        </button>
      )}
    </div>
  );
};

const HolidayCard = ({ holiday, monthIndex, year, onRemove, onEdit, canEdit }) => {
  const weekday = getWeekdayName(year, monthIndex, holiday.date);
  return (
    <div className={`ha-holiday-card ${holiday.type === "special" ? "ha-holiday-card--special" : ""}`}>
      <div className="ha-holiday-card__date-section">
        <span className="ha-holiday-card__day">{holiday.date}</span>
        <span className="ha-holiday-card__month">{monthNamesShort[monthIndex]}</span>
        {holiday.type === "special" && <span className="ha-holiday-card__type">Special</span>}
      </div>
      <div className="ha-holiday-card__info">
        <span className="ha-holiday-card__name">{holiday.name}</span>
        <span className="ha-holiday-card__weekday">{weekday}</span>
      </div>
      {canEdit && (
        <div className="ha-holiday-card__actions">
          {onEdit && (
            <button className="ha-holiday-card__edit" onClick={onEdit} title="Edit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onRemove && (
            <button className="ha-holiday-card__remove" onClick={onRemove} title="Remove">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const GovHolidayListView = ({ govHolidays, specialDays, year, onRemoveHoliday, onEditHoliday, canEdit }) => {
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const getAllHolidays = () => {
    const all = [];
    for (let m = 0; m < 12; m++) {
      (govHolidays[m] || []).forEach((h) =>
        all.push({ ...h, type: "government", monthIndex: m, monthName: monthNames[m], weekday: getWeekdayName(year, m, h.date) })
      );
      (specialDays[m] || []).forEach((h) =>
        all.push({ ...h, type: "special", monthIndex: m, monthName: monthNames[m], weekday: getWeekdayName(year, m, h.date) })
      );
    }
    return all.sort((a, b) => a.monthIndex !== b.monthIndex ? a.monthIndex - b.monthIndex : a.date - b.date);
  };

  const filtered = getAllHolidays().filter((h) => {
    const mOk = selectedMonth === "all" || h.monthIndex === parseInt(selectedMonth);
    const sOk = !searchTerm || h.name.toLowerCase().includes(searchTerm.toLowerCase()) || h.monthName.toLowerCase().includes(searchTerm.toLowerCase());
    return mOk && sOk;
  });

  const grouped = filtered.reduce((acc, h) => {
    if (!acc[h.monthIndex]) acc[h.monthIndex] = [];
    acc[h.monthIndex].push(h);
    return acc;
  }, {});

  const monthDropdownOptions = [
    { value: "all", label: "All Months" },
    ...monthNames.map((m, i) => ({ value: String(i), label: m })),
  ];

  return (
    <div className="ha-gov-holiday-list-view">
      <div className="ha-holiday-filter-bar">
        <div className="ha-holiday-filter-bar__left">
          <CustomDropdown options={monthDropdownOptions} style={{ height: "35px" }} value={selectedMonth} onChange={setSelectedMonth} placeholder="All Months" className="ha-custom-dropdown--sm" />
          <input type="text" placeholder="Search holidays..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="ha-input ha-input--search" />
        </div>
        <span className="ha-holiday-count">{filtered.length} holiday{filtered.length !== 1 ? "s" : ""}</span>
      </div>
      {filtered.length > 0 ? (
        <div className="ha-holiday-cards-container">
          {Object.keys(grouped).map((mIdx) => (
            <div key={mIdx} className="ha-holiday-month-group">
              <div className="ha-holiday-month-header">
                <span className="ha-holiday-month-name">{monthNames[mIdx]}</span>
              </div>
              <div className="ha-holiday-cards-grid">
                {grouped[mIdx].map((h, idx) => (
                  <HolidayCard
                    key={`${mIdx}-${h.date}-${idx}`}
                    holiday={h}
                    monthIndex={parseInt(mIdx)}
                    year={year}
                    canEdit={canEdit}
                    onRemove={() => onRemoveHoliday(parseInt(mIdx), h.date)}
                    onEdit={() => onEditHoliday && onEditHoliday(parseInt(mIdx), h)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ha-no-holidays">
          <p>No government holidays found</p>
        </div>
      )}
    </div>
  );
};

const MiniCalendarCard = ({ monthIndex, year, governmentHolidays = [], specialDays = [], onClick, isActive, hasUnsaved, onHolidayClick }) => {
  const grid = generateCalendarGrid(monthIndex, year);
  const secSat = getSecondSaturday(year, monthIndex);
  const fourSat = getFourthSaturday(year, monthIndex);

  const handleCellClick = (e, holiday) => {
    e.stopPropagation();
    if (holiday && onHolidayClick) {
      const rect = e.target.getBoundingClientRect();
      onHolidayClick(holiday, monthIndex, { top: rect.bottom + 5, left: rect.left });
    }
  };

  const cells = grid.map((cell, idx) => {
    if (cell.type !== "current") {
      return (
        <div key={idx} className="attendanceoverview-day inactive">
          {""}
        </div>
      );
    }

    const isGov = (governmentHolidays || []).find((h) => Number(h.date) === cell.day);
    const isSpecial = (specialDays || []).find((h) => Number(h.date) === cell.day);
    const isSec = cell.day === secSat;
    const isFour = cell.day === fourSat;
    const isSun = idx % 7 === 0;

    let titleText = "";
    if (isGov && isSpecial) {
      titleText = `${isGov.name} / ${isSpecial.name}`;
    } else if (isGov) {
      titleText = isGov.name;
    } else if (isSpecial) {
      titleText = isSpecial.name;
    } else if (isSec) {
      titleText = "2nd Saturday";
    } else if (isFour) {
      titleText = "4th Saturday";
    } else if (isSun) {
      titleText = "Sunday";
    }

    return (
      <div
        key={idx}
        className={`attendanceoverview-day ${isSun || isSec || isFour ? "weekend" : ""}`}
        title={titleText || undefined}
        onClick={(e) => (isGov || isSpecial) && handleCellClick(e, isGov || isSpecial)}
        style={{ cursor: (isGov || isSpecial) ? "pointer" : "default" }}
      >
        <span
          className={`day-number ${isGov ? "holiday-highlight" : ""} ${isSpecial ? "today-highlight" : ""}`}
          title={titleText || undefined}
        >
          {cell.day}
        </span>
      </div>
    );
  });

  return (
    <div
      className={`attendanceoverview-month-card ${isActive ? "sidebar-mini-calendar--current" : ""}`}
      onClick={onClick}
      style={{
        cursor: "pointer",
        border: isActive ? "1px solid #5977f8" : hasUnsaved ? "1px dashed #f59e0b" : undefined,
        boxShadow: isActive ? "0 4px 20px rgba(89, 119, 248, 0.12)" : undefined
      }}
    >
      {/* ── Month/Year Header ── */}
      <div className="attendanceoverview-month-header">
        <h3 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
          {monthNames[monthIndex]} <strong>{year}</strong>
          {hasUnsaved && <span className="sidebar-calendar-unsaved-dot" style={{ width: "6px", height: "6px", backgroundColor: "#ef4444", borderRadius: "50%", display: "inline-block" }} />}
        </h3>
        <div className="header-underline"></div>
      </div>

      {/* ── Weekday Headers ── */}
      <div className="attendanceoverview-weekdays">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      {/* ── Day Cells ── */}
      <div className="attendanceoverview-days">
        {cells}
      </div>
    </div>
  );
};

const EditHolidayModal = ({ holiday, monthIndex, year, onClose, onSave, saving }) => {
  const [editedName, setEditedName] = useState(holiday?.name || "");
  const [editedDate, setEditedDate] = useState(holiday?.date || "");
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const handleSave = async () => {
    if (!editedName.trim()) { toast.warning("Please enter holiday name", { containerId: "holiday-admin-toast" }); return; }
    if (!editedDate || editedDate < 1 || editedDate > daysInMonth) { toast.warning(`Please enter valid day (1-${daysInMonth})`, { containerId: "holiday-admin-toast" }); return; }
    const success = await onSave({ oldDate: holiday.date, newDate: parseInt(editedDate), name: editedName.trim() });
    if (success) onClose();
  };

  return (
    <div className="ha-edit-modal-overlay">
      <div className="ha-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ha-edit-modal__header">
          <h3 className="common-modal-title">Edit Holiday</h3>
          <button className="common-modal-close-x" onClick={onClose}>✕</button>
        </div>
        <div className="ha-edit-modal__body common-modal-body">
          <div className="ha-edit-form-group">
            <label>Holiday Name </label>
            <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} placeholder="Enter holiday name" className="ha-edit-input" />
          </div>
          <div className="ha-edit-form-group">
            <label>Day <span className="ha-req">*</span></label>
            <input type="number" value={editedDate} onChange={(e) => setEditedDate(e.target.value)} min="1" max={daysInMonth} placeholder={`1-${daysInMonth}`} className="ha-edit-input ha-edit-input--day" />
          </div>
        </div>
        <div className="ha-edit-modal__footer">
          <button className="common-modal-btn btn-small-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="common-modal-btn btn-update" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
//  MAIN COMPONENT
// ============================================================
const HolidayAssignmentAdmin = () => {
  const storedUser = JSON.parse(sessionStorage.getItem("Erti-Portal") || "{}");
  const isAdmin = storedUser?.role === "admin";

  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");

  const currentYear = getCurrentYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [assigning, setAssigning] = useState(false);

  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [approving, setApproving] = useState(false);

  const [selectedDetailMonth, setSelectedDetailMonth] = useState(0);
  const [govHolidays, setGovHolidays] = useState({});
  const [specialDays, setSpecialDays] = useState({});
  const [originalGovHolidays, setOriginalGovHolidays] = useState({});
  const [savingMonth, setSavingMonth] = useState(null);
  const [unsavedMonths, setUnsavedMonths] = useState(new Set());

  const [showMonthModal, setShowMonthModal] = useState(false);
  const [activeMonthIndex, setActiveMonthIndex] = useState(null);
  const [monthHolidayInput, setMonthHolidayInput] = useState({ date: "", name: "" });

  const [holidayPopup, setHolidayPopup] = useState({ show: false, holiday: null, monthIndex: null, position: { top: 0, left: 0 } });
  const [holidayViewMode, setHolidayViewMode] = useState("calendar");

  const [showEditHolidayModal, setShowEditHolidayModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editingMonthIndex, setEditingMonthIndex] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [showGovEditPopup, setShowGovEditPopup] = useState(false);
  const [govEditYear, setGovEditYear] = useState(null);

  const [alertConfig, setAlertConfig] = useState(null);
  const showAlert = (cfg) => setAlertConfig(cfg);
  const closeAlert = () => setAlertConfig(null);

  const [fetchedGovYears, setFetchedGovYears] = useState({});

  // ── FIX 1: Track globally approved years (approved in gov-holidays API) ──────
  const [globallyApprovedYears, setGloballyApprovedYears] = useState(new Set());

  const validYears = getValidYears();

  // ── Per-employee assigned years map ──────────────────────────────────────────
  const [employeeAssignedYears, setEmployeeAssignedYears] = useState({});
  const [bannerRefreshKey, setBannerRefreshKey] = useState(0);

  useEffect(() => { return () => { toast.dismiss(); }; }, []);

  useEffect(() => {
    fetchEmployees();
    fetchAssignments();
  }, []);

  useEffect(() => { fetchAssignments(); }, [filterYear, filterStatus, filterDept]);

  useEffect(() => { setCurrentPage(1); }, [filterYear, filterStatus, filterDept]);

  useEffect(() => {
    const hide = () => {
      if (holidayPopup.show)
        setHolidayPopup({ show: false, holiday: null, monthIndex: null, position: { top: 0, left: 0 } });
    };
    document.addEventListener("click", hide);
    return () => document.removeEventListener("click", hide);
  }, [holidayPopup.show]);

  // ── When employee changes → reset year selection to first available year ──────
  useEffect(() => {
    if (!selectedEmployee) {
      setSelectedYear(currentYear);
      return;
    }
    const firstAvailable = getYearsAvailableForEmployee(selectedEmployee).find(
      (y) => !getAssignedYearsForEmployee(selectedEmployee).has(y)
    );
    if (firstAvailable) {
      setSelectedYear(firstAvailable);
    } else {
      setSelectedYear("");
    }
  }, [selectedEmployee, employeeAssignedYears, globallyApprovedYears]);

  // ── Build per-employee assigned years map from assignments list ───────────────
  const buildEmployeeAssignedYears = (assignmentList) => {
    const map = {};
    assignmentList.forEach((a) => {
      const empId = a.assignedTo?._id;
      if (!empId) return;
      if (!map[empId]) map[empId] = new Set();
      map[empId].add(a.year);
    });
    setEmployeeAssignedYears(map);
  };

  const getAssignedYearsForEmployee = (empId) => {
    return employeeAssignedYears[empId] || new Set();
  };

  // ── FIX 1: Available years = not assigned to employee AND not globally approved ─
  const getYearsAvailableForEmployee = (empId) => {
    const alreadyAssigned = getAssignedYearsForEmployee(empId);
    return validYears.filter(
      (y) => y >= 2024 && isValidYear(y) && !alreadyAssigned.has(y) && !globallyApprovedYears.has(y)
    );
  };

  const isYearAssignedToSelectedEmployee = (year) => {
    if (!selectedEmployee) return false;
    return getAssignedYearsForEmployee(selectedEmployee).has(year);
  };

  const fetchEmployees = async () => {
    try {
      const res = await portalInstance.get("data/employees/basic");
      if (res.data.success) {
        setEmployees(res.data.employees);
        setDepartments(res.data.departments || []);
      }
    } catch {
      toast.error("Failed to load employees", { containerId: "holiday-admin-toast" });
    }
  };

  // ── FIX 2: Parallel API loading — all gov-holiday year fetches run together ───
  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterYear) params.append("year", filterYear);
      if (filterStatus) params.append("status", filterStatus);
      if (filterDept) params.append("department", filterDept);

      const res = await portalInstance.get(`holiday-assignments/all?${params}`);
      if (!res.data.success) return;

      let list = res.data.data.filter((a) => a.year >= currentYear - PAST_YEARS_COUNT);

      // Collect all unique years that have approved assignments
      const approvedYears = new Set(list.filter((a) => a.status === "approved").map((a) => a.year));
      const allYearsInList = [...new Set(list.map((a) => a.year))];

      // ── FIX 2: Fetch ALL gov-holiday year data in PARALLEL (not sequential loop) ─
      const govFetches = await Promise.all(
        allYearsInList.map((y) =>
          portalInstance
            .get(`holiday-assignments/gov-holidays/${y}`)
            .then((r) => ({
              year: y,
              count: r.data.success ? (r.data.data?.length || 0) : 0,
            }))
            .catch(() => ({ year: y, count: 0 }))
        )
      );

      // Build lookup map: year → count
      const govCountByYear = {};
      govFetches.forEach(({ year, count }) => {
        govCountByYear[year] = count;
      });

      // ── FIX 1: Determine globally approved years ──────────────────────────────
      // A year is globally approved when ALL assignments for that year are approved.
      // Such years should not be assignable to any new employee.
      const newGloballyApproved = new Set();
      allYearsInList.forEach((y) => {
        const yearAssignments = list.filter((a) => a.year === y);
        if (yearAssignments.length > 0 && yearAssignments.every((a) => a.status === "approved")) {
          newGloballyApproved.add(y);
        }
      });
      setGloballyApprovedYears(newGloballyApproved);

      // Patch approved assignments with gov holiday counts from parallel fetch
      list = list.map((a) => {
        if (a.status === "approved") {
          a.summary = {
            ...a.summary,
            totalGovHolidays: govCountByYear[a.year] || 0,
            monthsCompleted: 12,
          };
        }
        return a;
      });

      setAssignments(list);
      setCurrentPage(1);
      buildEmployeeAssignedYears(list);
      setBannerRefreshKey((k) => k + 1);
    } catch {
      toast.error("Failed to load assignments", { containerId: "holiday-admin-toast" });
    } finally {
      setLoading(false);
    }
  };

  const fetchGovHolidaysForMonth = async (year, monthIndex) => {
    if ((govHolidays[monthIndex] || []).length > 0) return;
    try {
      let yearData = fetchedGovYears[year];
      if (!yearData) {
        const res = await portalInstance.get(`gov-holidays/${year}`);
        if (!res.data.success) return;
        yearData = res.data.data;
        setFetchedGovYears((prev) => ({ ...prev, [year]: yearData }));
      }
      const monthData = yearData.find((m) => m.month === monthIndex + 1);
      if (monthData?.holidays?.length) {
        const sorted = [...monthData.holidays].sort((a, b) => a.date - b.date);
        setGovHolidays((prev) => ({ ...prev, [monthIndex]: sorted }));
      }
    } catch { }
  };

  const handleEmployeeChange = (empId) => {
    setSelectedEmployee(empId);
  };

  const handleDepartmentChange = (dept) => {
    setSelectedDepartment(dept);
    setSelectedEmployee("");
  };

  // ── FIX 1: Block year selection if globally approved OR already assigned ───────
  const handleYearChange = (val) => {
    const y = parseInt(val);
    if (!isValidYear(y)) {
      toast.warning("Cannot select this year.", { containerId: "holiday-admin-toast" });
      return;
    }
    if (globallyApprovedYears.has(y)) {
      toast.warning(`Year ${y} is already approved and cannot be assigned to any employee.`, {
        containerId: "holiday-admin-toast",
      });
      return;
    }
    if (isYearAssignedToSelectedEmployee(y)) {
      const empName = employees.find((e) => e._id === selectedEmployee)?.name || "this employee";
      toast.warning(`Year ${y} is already assigned to ${empName}.`, { containerId: "holiday-admin-toast" });
      return;
    }
    setSelectedYear(y);
  };

  const handleAssign = () => {
    if (!selectedEmployee) {
      toast.warning("Please select an employee", { containerId: "holiday-admin-toast" });
      return;
    }
    if (!selectedYear) {
      toast.warning("Please select a year", { containerId: "holiday-admin-toast" });
      return;
    }
    if (!isValidYear(selectedYear)) {
      toast.error("Cannot assign for this year.", { containerId: "holiday-admin-toast" });
      return;
    }
    // ── FIX 1: Guard — block globally approved years ──────────────────────────
    if (globallyApprovedYears.has(selectedYear)) {
      toast.error(`Year ${selectedYear} is already approved and locked for all employees.`, {
        containerId: "holiday-admin-toast",
      });
      return;
    }
    if (isYearAssignedToSelectedEmployee(selectedYear)) {
      const empName = employees.find((e) => e._id === selectedEmployee)?.name || "this employee";
      toast.error(`Year ${selectedYear} is already assigned to ${empName}.`, { containerId: "holiday-admin-toast" });
      return;
    }

    const empObj = employees.find((e) => e._id === selectedEmployee);
    const empName = empObj?.name || "Unknown";

    showAlert({
      type: "confirm",
      title: "Assign Holiday Calendar",
      message: `Assign holiday calendar for year ${selectedYear} to ${empName}?`,
      detail: (
        <div style={{ fontSize: 13, color: "#374151" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span>Employee</span><strong>{empName}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Year</span><strong>{selectedYear}</strong>
          </div>
        </div>
      ),
      confirmLabel: "Assign Calendar",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          setAssigning(true);
          const res = await portalInstance.post("holiday-assignments/assign", {
            employeeId: selectedEmployee,
            year: parseInt(selectedYear),
          });
          if (res.data.success) {
            toast.success(res.data.message || `Calendar ${selectedYear} assigned to ${empName}!`, { containerId: "holiday-admin-toast" });
            setSelectedEmployee("");
            setSelectedDepartment("");
            fetchAssignments();
          }
        } catch (err) {
          const msg = err.response?.data?.message || "Error assigning calendar";
          toast.error(msg, { containerId: "holiday-admin-toast" });
          if (msg.toLowerCase().includes("already")) fetchAssignments();
        } finally {
          setAssigning(false);
        }
      },
    });
  };

  const handleViewClick = (assignment) => viewDetail(assignment._id);

  const openGovEditPopup = (assignment) => {
    setGovEditYear(assignment.year);
    setShowGovEditPopup(true);
  };

  const closeGovEditPopup = () => {
    setShowGovEditPopup(false);
    setGovEditYear(null);
    fetchAssignments();
  };

  const viewDetail = async (id) => {
    try {
      const res = await portalInstance.get(`holiday-assignments/detail/${id}`);
      if (res.data.success) {
        const a = res.data.data;
        setSelectedAssignment(a);
        setShowDetailModal(true);
        setSelectedDetailMonth(new Date().getMonth());
        setHolidayViewMode("calendar");
        const obj = {};
        const specObj = {};
        for (let i = 0; i < 12; i++) {
          obj[i] = [];
          specObj[i] = [];
        }
        (a.months || []).forEach((m) => {
          obj[m.month - 1] = m.governmentHolidays || [];
          specObj[m.month - 1] = m.specialDays || [];
        });
        setGovHolidays(obj);
        setOriginalGovHolidays(JSON.parse(JSON.stringify(obj)));
        setSpecialDays(specObj);
        setUnsavedMonths(new Set());
        setFetchedGovYears({});
      }
    } catch {
      toast.error("Error loading assignment details", { containerId: "holiday-admin-toast" });
    }
  };

  const closeDetailModal = () => {
    if (unsavedMonths.size > 0) {
      showAlert({
        type: "warning",
        title: "Unsaved Changes",
        message: `You have ${unsavedMonths.size} unsaved month${unsavedMonths.size > 1 ? "s" : ""}. Close without saving?`,
        confirmLabel: "Close Anyway",
        cancelLabel: "Stay & Save",
        onConfirm: () => {
          setShowDetailModal(false); setSelectedAssignment(null);
          setUnsavedMonths(new Set()); setGovHolidays({}); setOriginalGovHolidays({});
          setShowMonthModal(false); setActiveMonthIndex(null); setFetchedGovYears({});
        },
      });
      return;
    }
    setShowDetailModal(false); setSelectedAssignment(null);
    setUnsavedMonths(new Set()); setGovHolidays({}); setOriginalGovHolidays({});
    setShowMonthModal(false); setActiveMonthIndex(null); setFetchedGovYears({});
  };

  const handleDelete = (id) => {
    showAlert({
      type: "danger",
      title: "Delete Assignment",
      message: "Are you sure you want to permanently delete this holiday assignment? This action cannot be undone.",
      confirmLabel: "Yes, Delete",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          const toastId = toast.loading("Deleting...", { containerId: "holiday-admin-toast" });
          const res = await portalInstance.delete(`holiday-assignments/delete/${id}`);
          toast.dismiss(toastId);
          if (res.data.success) {
            toast.success("Assignment deleted!", { containerId: "holiday-admin-toast" });
            fetchAssignments();
          }
        } catch {
          toast.error("Error deleting assignment", { containerId: "holiday-admin-toast" });
        }
      },
    });
  };

  const checkMonthChanges = (mi, newData) => {
    const orig = originalGovHolidays[mi] || [];
    const curr = newData || [];
    if (orig.length !== curr.length) return true;
    for (let i = 0; i < orig.length; i++) {
      if (orig[i].date !== curr[i].date || orig[i].name !== curr[i].name) return true;
    }
    return false;
  };

  const openMonthModal = (mi) => {
    setActiveMonthIndex(mi);
    setSelectedDetailMonth(mi);
    setMonthHolidayInput({ date: "", name: "" });
    setShowMonthModal(true);
    if (selectedAssignment?.year) fetchGovHolidaysForMonth(selectedAssignment.year, mi);
  };

  const closeMonthModal = () => {
    if (unsavedMonths.has(activeMonthIndex)) {
      showAlert({
        type: "warning",
        title: "Unsaved Changes",
        message: `${monthNames[activeMonthIndex]} has unsaved changes. Close without saving?`,
        confirmLabel: "Close Anyway",
        cancelLabel: "Stay",
        onConfirm: () => { setShowMonthModal(false); setActiveMonthIndex(null); setMonthHolidayInput({ date: "", name: "" }); },
      });
      return;
    }
    setShowMonthModal(false); setActiveMonthIndex(null); setMonthHolidayInput({ date: "", name: "" });
  };

  const addHolidayInModal = () => {
    if (!monthHolidayInput.date || !monthHolidayInput.name.trim()) { toast.warning("Enter both day and name", { containerId: "holiday-admin-toast" }); return; }
    const dayNum = parseInt(monthHolidayInput.date);
    const daysInM = new Date(selectedAssignment.year, activeMonthIndex + 1, 0).getDate();
    if (dayNum < 1 || dayNum > daysInM) { toast.error(`Invalid day.`, { containerId: "holiday-admin-toast" }); return; }
    const list = govHolidays[activeMonthIndex] || [];
    if (list.find((h) => h.date === dayNum)) { toast.warning(`Holiday already exists on date ${dayNum} for ${monthNames[activeMonthIndex]}`, { containerId: "holiday-admin-toast" }); return; }
    const updated = [...list, { date: dayNum, name: monthHolidayInput.name.trim() }].sort((a, b) => a.date - b.date);
    setGovHolidays({ ...govHolidays, [activeMonthIndex]: updated });
    if (checkMonthChanges(activeMonthIndex, updated)) setUnsavedMonths((prev) => new Set([...prev, activeMonthIndex]));
    setMonthHolidayInput({ date: "", name: "" });
    toast.success("Holiday added!", { containerId: "holiday-admin-toast" });
  };

  const removeHolidayInModal = (idx) => {
    const list = govHolidays[activeMonthIndex] || [];
    const removed = list[idx];
    const filtered = list.filter((_, i) => i !== idx);
    setGovHolidays({ ...govHolidays, [activeMonthIndex]: filtered });
    if (checkMonthChanges(activeMonthIndex, filtered))
      setUnsavedMonths((prev) => new Set([...prev, activeMonthIndex]));
    else
      setUnsavedMonths((prev) => { const s = new Set(prev); s.delete(activeMonthIndex); return s; });
    toast.info(`Removed: ${removed.name}`, { containerId: "holiday-admin-toast" });
  };

  const removeHolidayFromList = (mi, date) => {
    const list = govHolidays[mi] || [];
    const removed = list.find((h) => h.date === date);
    const filtered = list.filter((h) => h.date !== date);
    setGovHolidays({ ...govHolidays, [mi]: filtered });
    if (checkMonthChanges(mi, filtered))
      setUnsavedMonths((prev) => new Set([...prev, mi]));
    else
      setUnsavedMonths((prev) => { const s = new Set(prev); s.delete(mi); return s; });
    if (removed) toast.info(`Removed: ${removed.name}`, { containerId: "holiday-admin-toast" });
  };

  const openEditHolidayModal = (mi, holiday) => { setEditingMonthIndex(mi); setEditingHoliday(holiday); setShowEditHolidayModal(true); };
  const closeEditHolidayModal = () => { setShowEditHolidayModal(false); setEditingHoliday(null); setEditingMonthIndex(null); };

  const saveEditedHoliday = async ({ oldDate, newDate, name }) => {
    try {
      setSavingEdit(true);
      const list = govHolidays[editingMonthIndex] || [];
      if (oldDate !== newDate && list.find((h) => h.date === newDate)) { toast.error("Another holiday exists on this date", { containerId: "holiday-admin-toast" }); setSavingEdit(false); return false; }
      const updated = list.map((h) => (h.date === oldDate ? { date: newDate, name } : h)).sort((a, b) => a.date - b.date);
      setGovHolidays({ ...govHolidays, [editingMonthIndex]: updated });
      if (checkMonthChanges(editingMonthIndex, updated)) setUnsavedMonths((prev) => new Set([...prev, editingMonthIndex]));
      toast.success("Holiday updated!", { containerId: "holiday-admin-toast" });
      setSavingEdit(false);
      return true;
    } catch { toast.error("Failed to update", { containerId: "holiday-admin-toast" }); setSavingEdit(false); return false; }
  };

  const clearMonthHolidays = () => {
    showAlert({
      type: "danger",
      title: "Clear All Holidays",
      message: `Remove all government holidays for ${monthNames[activeMonthIndex]}?`,
      confirmLabel: "Yes, Clear All",
      cancelLabel: "Cancel",
      onConfirm: () => {
        setGovHolidays({ ...govHolidays, [activeMonthIndex]: [] });
        if (checkMonthChanges(activeMonthIndex, []))
          setUnsavedMonths((prev) => new Set([...prev, activeMonthIndex]));
        else
          setUnsavedMonths((prev) => { const s = new Set(prev); s.delete(activeMonthIndex); return s; });
        toast.info(`Cleared holidays from ${monthNames[activeMonthIndex]}`, { containerId: "holiday-admin-toast" });
      },
    });
  };

  const saveMonth = async (mi) => {
    try {
      setSavingMonth(mi);
      const res = await portalInstance.post("holiday-assignments/save-month", {
        assignmentId: selectedAssignment._id,
        month: mi + 1,
        governmentHolidays: govHolidays[mi] || [],
        specialDays: specialDays[mi] || [],
      });
      if (res.data.success) {
        setOriginalGovHolidays((prev) => ({ ...prev, [mi]: [...(govHolidays[mi] || [])] }));
        setUnsavedMonths((prev) => { const n = new Set(prev); n.delete(mi); return n; });
        toast.success(`${monthNames[mi]} saved!`, { containerId: "holiday-admin-toast" });
        const rr = await portalInstance.get(`holiday-assignments/detail/${selectedAssignment._id}`);
        if (rr.data.success) setSelectedAssignment(rr.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Error saving ${monthNames[mi]}`, { containerId: "holiday-admin-toast" });
    } finally { setSavingMonth(null); }
  };

  const saveAllMonths = async () => {
    if (unsavedMonths.size === 0) { toast.info("No unsaved changes", { containerId: "holiday-admin-toast" }); return; }
    const list = Array.from(unsavedMonths);
    let saved = 0; let errors = 0;
    const tid = toast.loading(`Saving ${list.length} month(s)...`, { containerId: "holiday-admin-toast" });
    for (const mi of list) {
      try {
        const res = await portalInstance.post("holiday-assignments/save-month", {
          assignmentId: selectedAssignment._id, month: mi + 1,
          governmentHolidays: govHolidays[mi] || [], specialDays: specialDays[mi] || [],
        });
        if (res.data.success) { setOriginalGovHolidays((prev) => ({ ...prev, [mi]: [...(govHolidays[mi] || [])] })); saved++; }
      } catch { errors++; }
    }
    setUnsavedMonths(new Set());
    toast.dismiss(tid);
    if (errors === 0) toast.success(`All ${saved} month(s) saved!`, { containerId: "holiday-admin-toast" });
    else toast.warning(`Saved ${saved}. ${errors} failed.`, { containerId: "holiday-admin-toast" });
    viewDetail(selectedAssignment._id);
  };

  const handleApprove = () => {
    if (!selectedAssignment) return;
    const totalGov = Object.values(govHolidays).reduce((a, c) => a + (c?.length || 0), 0);
    showAlert({
      type: "alert",
      title: "Approve Holiday Calendar",
      message: `Approve the holiday calendar for ${selectedAssignment.assignedTo?.name || "this employee"}?`,
      detail: (
        <div style={{ fontSize: 13, color: "#374151" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Employee</span><strong>{selectedAssignment.assignedTo?.name || "N/A"}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span>Year</span><strong>{selectedAssignment.year}</strong></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span>Gov Holidays</span><strong>{totalGov}</strong></div>
          <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>The employee will not be able to modify the calendar after approval.</div>
        </div>
      ),
      confirmLabel: "Approve Calendar",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          setApproving(true);
          const toastId = toast.loading("Approving calendar...", { containerId: "holiday-admin-toast" });
          const res = await portalInstance.put(`holiday-assignments/approve/${selectedAssignment._id}`, { status: "approved" });
          toast.dismiss(toastId);
          if (res.data.success) {
            toast.success(`Approved holiday calendar for ${selectedAssignment.assignedTo?.name || "Employee"} (${selectedAssignment.year})`, { autoClose: 3000, containerId: "holiday-admin-toast" });
            setSelectedAssignment((prev) => ({ ...prev, status: "approved" }));
            setTimeout(() => { setShowDetailModal(false); fetchAssignments(); }, 400);
          } else {
            toast.error("Failed to approve calendar.", { containerId: "holiday-admin-toast" });
          }
        } catch (error) {
          toast.error(error.response?.data?.message || "Error approving calendar", { containerId: "holiday-admin-toast" });
        } finally { setApproving(false); }
      },
    });
  };

  const getWeekendConflict = (yr, m, date) => {
    if (!yr || m === undefined || !date) return null;
    const d = new Date(yr, m, parseInt(date));
    if (isNaN(d.getTime())) return null;
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0) return "Falls on Sunday";
    if (dayOfWeek === 6) {
      const ss = getSecondSaturday(yr, m);
      const fs = getFourthSaturday(yr, m);
      if (parseInt(date) === ss) return "Falls on 2nd Sat";
      if (parseInt(date) === fs) return "Falls on 4th Sat";
    }
    return null;
  };

  const handleReject = () => {
    if (!selectedAssignment) return;
    const remarks = window.prompt("Enter rejection reason/note for HR (Mandatory):");
    if (remarks === null) return;
    if (!remarks.trim()) {
      toast.warning("Rejection remarks are required to reject the calendar.", { containerId: "holiday-admin-toast" });
      return;
    }
    showAlert({
      type: "danger",
      title: "Reject Holiday Calendar",
      message: `Reject the holiday calendar for ${selectedAssignment.assignedTo?.name || "this employee"}?`,
      detail: (
        <div style={{ fontSize: 13, color: "#374151", marginTop: 4 }}>
          <strong>Reason for Rejection:</strong> "{remarks.trim()}"
        </div>
      ),
      confirmLabel: "Reject Calendar",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        try {
          setApproving(true);
          const toastId = toast.loading("Rejecting calendar...", { containerId: "holiday-admin-toast" });
          const res = await portalInstance.post(`holiday-assignments/review/${selectedAssignment._id}`, { action: "rejected", remarks: remarks.trim() });
          toast.dismiss(toastId);
          if (res.data.success) {
            toast.success("Rejected holiday calendar.", { autoClose: 3000, containerId: "holiday-admin-toast" });
            setSelectedAssignment((prev) => ({ ...prev, status: "rejected", adminRemarks: remarks.trim() }));
            setTimeout(() => { setShowDetailModal(false); fetchAssignments(); }, 400);
          } else {
            toast.error("Failed to reject calendar.", { containerId: "holiday-admin-toast" });
          }
        } catch (error) {
          toast.error(error.response?.data?.message || "Error rejecting calendar", { containerId: "holiday-admin-toast" });
        } finally { setApproving(false); }
      },
    });
  };

  const handleSubmitToAdmin = async () => {
    if (!selectedAssignment) return;
    const totalGov = Object.values(govHolidays).reduce((a, c) => a + (c?.length || 0), 0);
    const totalSpecial = Object.values(specialDays).reduce((a, c) => a + (c?.length || 0), 0);
    if (totalGov + totalSpecial === 0) {
      toast.warning("Cannot submit an empty holiday calendar. Please add at least one holiday before submitting to Admin.", { containerId: "holiday-admin-toast" });
      return;
    }
    try {
      setApproving(true);
      const toastId = toast.loading("Submitting to Admin...", { containerId: "holiday-admin-toast" });
      const res = await portalInstance.post("holiday-assignments/submit", { assignmentId: selectedAssignment._id });
      toast.dismiss(toastId);
      if (res.data.success) {
        toast.success("Submitted holiday calendar to Admin for approval!", { autoClose: 3000, containerId: "holiday-admin-toast" });
        setSelectedAssignment((prev) => ({ ...prev, status: "submitted" }));
        setTimeout(() => { setShowDetailModal(false); fetchAssignments(); }, 400);
      } else {
        toast.error(res.data.message || "Failed to submit.", { containerId: "holiday-admin-toast" });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error submitting calendar", { containerId: "holiday-admin-toast" });
    } finally { setApproving(false); }
  };

  const handleHolidayClick = (holiday, mi, position) =>
    setHolidayPopup({ show: true, holiday, monthIndex: mi, position });

  const getMonthData = (i) => govHolidays[i] || [];

  const getAllMonthsData = () => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      result.push({
        monthIndex: i,
        governmentHolidays: getMonthData(i),
        specialDays: specialDays[i] || [],
        totalCount: getMonthData(i).length,
        hasUnsaved: unsavedMonths.has(i),
      });
    }
    return result;
  };

  const getTotalHolidays = () => { let t = 0; for (let i = 0; i < 12; i++) t += (govHolidays[i] || []).length; return t; };

  const getHolidayCounts = () => {
    if (!selectedAssignment) return { total: 0, gov: 0, saturdays: 0, sundays: 0 };
    const yr = selectedAssignment.year;
    let gov = 0; let sat = 0; let sun = 0;
    for (let m = 0; m < 12; m++) gov += (govHolidays[m] || []).length;
    for (let m = 0; m < 12; m++) {
      const ss = getSecondSaturday(yr, m); const fs = getFourthSaturday(yr, m);
      if (!(govHolidays[m] || []).find((h) => h.date === ss)) sat++;
      if (fs && !(govHolidays[m] || []).find((h) => h.date === fs)) sat++;
      for (let d = 1; d <= new Date(yr, m + 1, 0).getDate(); d++) {
        if (new Date(yr, m, d).getDay() === 0 && !(govHolidays[m] || []).find((h) => h.date === d)) sun++;
      }
    }
    return { total: gov + sat + sun, gov, saturdays: sat, sundays: sun };
  };

  const getSubmittedHolidaysList = () => {
    const list = [];
    const yr = selectedAssignment?.year || currentYear;
    for (let m = 0; m < 12; m++) {
      (govHolidays[m] || []).forEach((h) => {
        list.push({
          monthName: monthNames[m],
          monthIndex: m,
          date: h.date,
          name: h.name,
          type: "government",
          weekday: getWeekdayName(yr, m, h.date),
          conflict: getWeekendConflict(yr, m, h.date),
        });
      });
      (specialDays[m] || []).forEach((h) => {
        list.push({
          monthName: monthNames[m],
          monthIndex: m,
          date: h.date,
          name: h.name,
          type: "special",
          weekday: getWeekdayName(yr, m, h.date),
          conflict: getWeekendConflict(yr, m, h.date),
        });
      });
    }
    return list.sort((a, b) => (a.monthIndex !== b.monthIndex ? a.monthIndex - b.monthIndex : a.date - b.date));
  };

  // ── FIX 1: Year dropdown — excludes globally approved years + per-employee assigned years ──
  const yearsForSelectedEmployee = selectedEmployee
    ? getYearsAvailableForEmployee(selectedEmployee)
    : validYears.filter((y) => y >= 2024 && isValidYear(y) && !globallyApprovedYears.has(y));

  const noYearsAvailableForEmployee = selectedEmployee && yearsForSelectedEmployee.length === 0;

  const yearAssignOptions = noYearsAvailableForEmployee
    ? [{ value: "", label: "All years assigned" }]
    : yearsForSelectedEmployee.map((y) => ({ value: String(y), label: String(y) }));

  const filteredEmployeesForAssign = selectedDepartment
    ? employees.filter((e) => e.department === selectedDepartment)
    : employees;

  const hrEmployeesList = filteredEmployeesForAssign.filter(
    (emp) =>
      emp.isHr ||
      emp.role === "hr" ||
      (emp.department && emp.department.toUpperCase() === "HR") ||
      (emp.designation && emp.designation.toUpperCase().includes("HR"))
  );

  const displayEmployeesForAssign = hrEmployeesList.length > 0 ? hrEmployeesList : filteredEmployeesForAssign;

  const paginatedAssignments = assignments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const handlePageChange = (page) => setCurrentPage(page);

  const departmentOptions = [
    { value: "", label: "All Departments" },
    ...departments.map((d) => ({ value: d, label: d })),
  ];

  const employeeOptions = [
    { value: "", label: "Select Employee" },
    ...displayEmployeesForAssign.map((emp) => ({ value: emp._id, label: emp.name })),
  ];

  const filterYearOptions = validYears.filter((y) => y >= 2024).map((y) => ({ value: String(y), label: String(y) }));

  const filterStatusOptions = [
    { value: "", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "in-progress", label: "In Progress" },
    { value: "submitted", label: "Submitted" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <>
      <Sidebar />
      <AlertPopup config={alertConfig} onClose={closeAlert} />

      <ToastContainer
        containerId="holiday-admin-toast"
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        limit={5}
        theme="light"
        style={{ zIndex: 99999 }}
      />

      <div className="common-page-container">
        <HolidayAssignmentBanner
          refreshTrigger={bannerRefreshKey}
          onAssignClick={(targetYear) => {
            if (targetYear) {
              setSelectedYear(parseInt(targetYear));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        />

        <div className="ha-page-header" style={{ justifyContent: "flex-start" }}>
          <div className="ha-page-header__stats">
            {[
              { label: "Total", val: assignments.length },
              { label: "Submitted", val: assignments.filter((a) => a.status === "submitted").length, cls: "stat--submitted" },
              { label: "Approved", val: assignments.filter((a) => a.status === "approved").length, cls: "stat--approved" },
              { label: "Pending", val: assignments.filter((a) => a.status === "pending").length, cls: "stat--pending" },
            ].map((s) => (
              <div key={s.label} className={`ha-stat-pill ${s.cls || ""}`}>
                <span className="ha-stat-pill__num">{s.val}</span>
                <span className="ha-stat-pill__lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── ASSIGN SECTION (ADMIN ONLY) ─────────────────────────────────── */}
        {isAdmin && (
          <div className="ha-card">
            <div className="ha-card__header">
              <h4 className="assign-task__members-title">Assign Holiday Calendar</h4>
            </div>
            <div className="ha-assign-row">

              {/* Department */}
              {/* <div className="ha-field">
                <label className="ha-label">Department</label>
                <CustomDropdown
                  options={departmentOptions}
                  value={selectedDepartment}
                  onChange={handleDepartmentChange}
                  placeholder="All Departments"
                  className="ha-custom-dropdown"
                  style={{ height: "35px" }}
                />
              </div> */}

              {/* Employee */}
              <div className="ha-field ha-field--wide">
                <label className="ha-label">Employee</label>
                <CustomDropdown
                  options={employeeOptions}
                  value={selectedEmployee}
                  onChange={handleEmployeeChange}
                  placeholder="Select Employee"
                  className="ha-custom-dropdown"
                  style={{ height: "35px" }}
                />
              </div>

              {/* Year — only shows years NOT approved globally AND NOT assigned to this employee */}
              <div className="ha-field ha-field--year">
                <label className="ha-label">Year</label>
                <CustomDropdown
                  options={yearAssignOptions}
                  value={noYearsAvailableForEmployee ? "" : String(selectedYear)}
                  onChange={handleYearChange}
                  style={{ height: "35px" }}
                  placeholder={
                    !selectedEmployee
                      ? "Year"
                      : noYearsAvailableForEmployee
                        ? "All years assigned"
                        : "Select Year"
                  }
                  className={`ha-custom-dropdown ha-custom-dropdown--year ${noYearsAvailableForEmployee ? "ha-custom-dropdown--disabled" : ""}`}
                />
              </div>

              <button
                className="ha-btn ha-btn--primary"
                onClick={handleAssign}
                disabled={assigning || !selectedEmployee || noYearsAvailableForEmployee || !selectedYear}
              >
                {assigning
                  ? "Assigning..."
                  : noYearsAvailableForEmployee
                    ? "All Years Assigned"
                    : "Assign Calendar"}
              </button>
            </div>

            {/* Warning when all years assigned for selected employee */}
            {noYearsAvailableForEmployee && (
              <div className="ha-all-assigned-warning">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                  All available years are already assigned to{" "}
                  <strong>{employees.find((e) => e._id === selectedEmployee)?.name || "this employee"}</strong>.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── ASSIGNMENTS TABLE ──────────────────────────────────────────── */}
        <div className="ha-card">
          <div className="ha-card__header">
            <h4 className="assign-task__members-title">All Assignments</h4>
            <div className="ha-filter-row">
              <CustomDropdown
                options={filterYearOptions}
                value={filterYear}
                onChange={(val) => setFilterYear(val)}
                placeholder="All Years"
                style={{ height: "35px" }}
                className="ha-custom-dropdown ha-custom-dropdown--sm ha-custom-dropdown--year"
              />
              <CustomDropdown
                options={filterStatusOptions}
                value={filterStatus}
                onChange={(val) => setFilterStatus(val)}
                placeholder="All Status"
                style={{ height: "35px" }}
                className="ha-custom-dropdown ha-custom-dropdown--sm ha-custom-dropdown--status"
              />
            </div>
          </div>

          <div className="ha-table-wrap">
            {loading ? (
              <div className="ha-state ha-state--loading"><span className="ha-spinner" />Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="ha-state ha-state--empty">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                <span>No assignments found</span>
              </div>
            ) : (
              <>
                <div className="ha-table-scroll-container">
                  <table className="ha-table ha-table--desktop">
                    <thead>
                      <tr>
                        <th>S.NO</th><th>Assigned by</th><th>Department</th><th>Year</th>
                        <th>Status</th><th>Gov Holidays</th><th>Months</th><th>Assigned</th><th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAssignments.map((a, idx) => (
                        <tr key={a._id} className={`ha-tr--${a.status}`}>
                          <td className="ha-td--num">{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                          <td className="ha-td--name">{a.assignedTo?.name || "N/A"}</td>
                          <td className="ha-td--dept">{a.assignedTo?.department || "—"}</td>
                          <td className="ha-td--year">{a.year}</td>
                          <td><StatusBadge status={a.status} /></td>
                          <td className="ha-td--center">{a.summary?.totalGovHolidays || 0}</td>
                          <td className="ha-td--center">
                            <span className={`ha-month-pill ${a.summary?.monthsCompleted >= 12 ? "ha-month-pill--full" : ""}`}>
                              {a.summary?.monthsCompleted || 0}/12
                            </span>
                          </td>
                          <td className="ha-td--date">{new Date(a.assignedDate).toLocaleDateString()}</td>
                          <td>
                            <AssignmentActions
                              assignment={a}
                              onView={handleViewClick}
                              onEdit={openGovEditPopup}
                              onReassign={() => { }}
                              onDelete={handleDelete}
                              isMobile={false}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ha-cards-grid ha-cards-grid--mobile">
                  {paginatedAssignments.map((a, idx) => (
                    <div key={a._id} className={`ha-assignment-card ha-assignment-card--${a.status}`}>
                      <div className="ha-assignment-card__header">
                        <div className="ha-assignment-card__num">{(currentPage - 1) * PAGE_SIZE + idx + 1}</div>
                        <div className="ha-assignment-card__name">{a.assignedTo?.name || "N/A"}</div>
                        <StatusBadge status={a.status} />
                      </div>
                      <div className="ha-assignment-card__body">
                        {[
                          { lbl: "Department", val: a.assignedTo?.department || "—" },
                          { lbl: "Year", val: a.year },
                          { lbl: "Gov Holidays", val: a.summary?.totalGovHolidays || 0 },
                          { lbl: "Months", val: <span className={`ha-month-pill ${a.summary?.monthsCompleted >= 12 ? "ha-month-pill--full" : ""}`}>{a.summary?.monthsCompleted || 0}/12</span> },
                          { lbl: "Assigned", val: new Date(a.assignedDate).toLocaleDateString() },
                        ].map((r, i) => (
                          <div key={i} className="ha-assignment-card__row">
                            <span className="ha-assignment-card__label">{r.lbl}</span>
                            <span className="ha-assignment-card__value">{r.val}</span>
                          </div>
                        ))}
                      </div>
                      <AssignmentActions assignment={a} onView={handleViewClick} onEdit={openGovEditPopup} onReassign={() => { }} onDelete={handleDelete} isMobile={true} />
                    </div>
                  ))}
                </div>

                <Pagination totalItems={assignments.length} pageSize={PAGE_SIZE} currentPage={currentPage} onPageChange={handlePageChange} maxPagesInGroup={5} />
              </>
            )}
          </div>
        </div>

        {/* ── DETAIL MODAL ────────────────────────────────────────────────── */}
        {showDetailModal && selectedAssignment && (
          <div className="ha-overlay">
            <div className="ha-modal ha-modal--xl" onClick={(e) => e.stopPropagation()}>
              <div className="ha-modal__head">
                <h3 className="common-modal-title">{selectedAssignment.assignedTo?.name} — {selectedAssignment.year}</h3>
                <div className="ha-modal__head-right">
                  <div className="ha-view-toggle">
                    <button className={`ha-view-toggle__btn ${holidayViewMode === "calendar" ? "active" : ""}`} onClick={() => setHolidayViewMode("calendar")}>Calendar</button>
                    <button className={`ha-view-toggle__btn ${holidayViewMode === "list" ? "active" : ""}`} onClick={() => setHolidayViewMode("list")}>Holiday List</button>
                  </div>
                  {unsavedMonths.size > 0 && (
                    <button className="ha-btn ha-btn--sm ha-btn--primary" onClick={saveAllMonths}>Save All ({unsavedMonths.size})</button>
                  )}
                </div>
                <button className="common-modal-close-x" onClick={closeDetailModal}>✕</button>
              </div>
              <div className="ha-modal__body">
                {/* ── ADMIN REJECTION NOTE BANNER FOR HR ────────────────────────────── */}
                {selectedAssignment.status === "rejected" && selectedAssignment.adminRemarks && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0, marginTop: "2px" }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700", color: "#991b1b", marginBottom: "2px" }}>
                        Calendar Rejected by Admin
                      </div>
                      <div style={{ fontSize: "13px", color: "#7f1d1d" }}>
                        <strong>Reason for Rejection:</strong> "{selectedAssignment.adminRemarks}"
                      </div>
                      <div style={{ fontSize: "11px", color: "#991b1b", marginTop: "4px" }}>
                        Please update the holiday calendar entries for this year and click <strong>Submit to Admin</strong> to re-submit for approval.
                      </div>
                    </div>
                  </div>
                )}

                <div className="ha-info-grid">
                  {[
                    { lbl: "Employee", val: selectedAssignment.assignedTo?.name || "N/A" },
                    { lbl: "Department", val: selectedAssignment.assignedTo?.department || "—" },
                    { lbl: "Year", val: selectedAssignment.year },
                    { lbl: "Status", val: <StatusBadge status={selectedAssignment.status} /> },
                    { lbl: "Assigned By", val: selectedAssignment.assignedBy?.name || "N/A" },
                    { lbl: "Assigned On", val: new Date(selectedAssignment.assignedDate).toLocaleDateString() },
                  ].map((item, i) => (
                    <div key={i} className="ha-info-cell">
                      <span className="ha-info-cell__lbl">{item.lbl}</span>
                      <span className="ha-info-cell__val">{item.val}</span>
                    </div>
                  ))}
                </div>

                {/* ── HR SUBMITTED HOLIDAYS SUMMARY FOR ADMIN REVIEW ───────────────────── */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 18px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5977f8" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Holidays & Special Days Submitted by HR ({selectedAssignment.year})
                    </div>
                    <span style={{ fontSize: "12px", background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>
                      {getSubmittedHolidaysList().length} Item(s)
                    </span>
                  </div>

                  {getSubmittedHolidaysList().length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", maxHeight: "180px", overflowY: "auto", paddingRight: "4px" }}>
                      {getSubmittedHolidaysList().map((item, idx) => (
                        <div key={idx} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "8px 12px", display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "11px", fontWeight: "700", color: item.type === "special" ? "#7c3aed" : "#15803d" }}>
                              {item.monthName} {item.date}
                            </span>
                            <span style={{ fontSize: "10px", background: item.type === "special" ? "#f3e8ff" : "#dcfce7", color: item.type === "special" ? "#6b21a8" : "#166534", padding: "1px 6px", borderRadius: "4px" }}>
                              {item.type === "special" ? "Special Day" : "Gov Holiday"}
                            </span>
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.name}
                          </span>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>{item.weekday}</span>
                            {item.conflict && (
                              <span style={{ fontSize: "10px", background: "#fff7ed", color: "#c2410c", border: "1px solid #ffedd5", padding: "1px 5px", borderRadius: "4px", fontWeight: "600" }}>
                                {item.conflict}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>No holidays or special days added by HR yet for this year.</p>
                  )}
                </div>

                <div className="ha-summary-strip ha-summary-strip--detail">
                  {[
                    { num: getTotalHolidays(), lbl: "Gov Holidays" },
                    { num: getHolidayCounts().saturdays, lbl: "2nd & 4th Sat" },
                    { num: getHolidayCounts().sundays, lbl: "Sundays" },
                    { num: getHolidayCounts().total, lbl: "Total Holidays" },
                  ].map((s, i) => (
                    <div key={i} className="ha-strip-item">
                      <span className="ha-strip-item__num">{s.num}</span>
                      <span className="ha-strip-item__lbl">{s.lbl}</span>
                    </div>
                  ))}
                  {unsavedMonths.size > 0 && (
                    <div className="ha-strip-item strip--unsaved">
                      <span className="ha-strip-item__num">{unsavedMonths.size}</span>
                      <span className="ha-strip-item__lbl">Unsaved</span>
                    </div>
                  )}
                </div>

                {holidayViewMode === "calendar" && (
                  <div className="ha-yearly-calendar-grid">
                    {getAllMonthsData().map((md) => (
                      <MiniCalendarCard
                        key={md.monthIndex}
                        monthIndex={md.monthIndex}
                        year={selectedAssignment.year}
                        governmentHolidays={md.governmentHolidays}
                        specialDays={md.specialDays}
                        isActive={selectedDetailMonth === md.monthIndex}
                        hasUnsaved={md.hasUnsaved}
                        onClick={() => openMonthModal(md.monthIndex)}
                        onHolidayClick={handleHolidayClick}
                      />
                    ))}
                  </div>
                )}

                {holidayViewMode === "list" && (
                  <GovHolidayListView
                    govHolidays={govHolidays}
                    specialDays={specialDays}
                    year={selectedAssignment.year}
                    onRemoveHoliday={removeHolidayFromList}
                    onEditHoliday={openEditHolidayModal}
                    canEdit={selectedAssignment.status !== "approved"}
                  />
                )}

                <div className="ha-approve-section">
                  {isAdmin ? (
                    selectedAssignment.status !== "approved" ? (
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                        <button className="hrms-common-btn-primary" style={{ height: "33px" }} onClick={handleApprove} disabled={approving}>
                          {approving ? <><span className="ha-spinner-sm" />Approving...</> : "Approve Calendar"}
                        </button>
                        <button className="hrms-common-btn-delete" style={{ height: "33px", minWidth: "100px" }} onClick={handleReject} disabled={approving}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="ha-approved-message"><span>Approved</span></div>
                    )
                  ) : (
                    selectedAssignment.status === "submitted" ? (
                      <div className="ha-approved-message" style={{ background: "#fef3c7", color: "#d97706" }}>
                        <span>Submitted to Admin — Pending Approval</span>
                      </div>
                    ) : selectedAssignment.status === "approved" ? (
                      <div className="ha-approved-message"><span>Approved by Admin</span></div>
                    ) : (
                      <button className="hrms-common-btn-primary" style={{ height: "33px" }} onClick={handleSubmitToAdmin} disabled={approving}>
                        {approving ? "Submitting..." : "Submit to Admin"}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showMonthModal && activeMonthIndex !== null && selectedAssignment && (
          <div className="ha-overlay ha-overlay--month">
            <div className="ha-modal ha-modal--month" onClick={(e) => e.stopPropagation()}>
              <div className="ha-modal__head">
                <h3 className="common-modal-title">
                  {monthNames[activeMonthIndex]} {selectedAssignment.year}
                  {unsavedMonths.has(activeMonthIndex) && <span className="ha-modal__unsaved-badge">Unsaved</span>}
                </h3>
                <button className="common-modal-close-x" onClick={closeMonthModal}>✕</button>
              </div>
              <div className="ha-modal__body common-modal-body">
                <div className="ha-month-edit-section">
                  <div className="ha-month-edit-section__header">
                    <h4 className="ha-month-edit-section__title">
                      Government Holidays
                      <span className="ha-month-edit-section__count">{(govHolidays[activeMonthIndex] || []).length}</span>
                    </h4>
                    {(govHolidays[activeMonthIndex] || []).length > 0 && (
                      <button className="ha-btn ha-btn--sm ha-btn--outline ha-btn--danger" onClick={clearMonthHolidays}>Clear All</button>
                    )}
                  </div>
                  <div className="ha-month-edit-form">
                    <input type="number" className="ha-input ha-input--day" placeholder="Day" min="1"
                      max={new Date(selectedAssignment.year, activeMonthIndex + 1, 0).getDate()}
                      value={monthHolidayInput.date}
                      onChange={(e) => setMonthHolidayInput({ ...monthHolidayInput, date: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addHolidayInModal()}
                    />
                    <input type="text" className="ha-input ha-input--name" placeholder="Holiday name..."
                      value={monthHolidayInput.name}
                      onChange={(e) => setMonthHolidayInput({ ...monthHolidayInput, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && addHolidayInModal()}
                    />
                    <button className="ha-btn ha-btn--add" onClick={addHolidayInModal}>+ Add</button>
                  </div>
                  <div className="ha-month-holiday-cards">
                    {(govHolidays[activeMonthIndex] || []).length > 0 ? (
                      <div className="ha-month-holiday-cards-grid">
                        {(govHolidays[activeMonthIndex] || []).map((h, i) => (
                          <HolidayCard key={i} holiday={h} monthIndex={activeMonthIndex} year={selectedAssignment.year}
                            canEdit={true}
                            onRemove={() => removeHolidayInModal(i)}
                            onEdit={() => openEditHolidayModal(activeMonthIndex, h)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="ha-no-data-sm">No holidays. Add one above.</p>
                    )}
                  </div>
                </div>
                <div className="ha-month-modal-footer" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "12px", marginTop: "16px" }}>
                  <button
                    type="button"
                    className="common-modal-btn btn-small-cancel"
                    onClick={closeMonthModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="common-modal-btn btn-update"
                    onClick={() => saveMonth(activeMonthIndex)}
                    disabled={savingMonth === activeMonthIndex}
                  >
                    {savingMonth === activeMonthIndex ? "Saving..." : `Save ${monthNames[activeMonthIndex]}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEditHolidayModal && editingHoliday && editingMonthIndex !== null && selectedAssignment && (
          <EditHolidayModal
            holiday={editingHoliday} monthIndex={editingMonthIndex} year={selectedAssignment.year}
            onClose={closeEditHolidayModal} onSave={saveEditedHoliday} saving={savingEdit}
          />
        )}

        {showGovEditPopup && govEditYear && (
          <GovHolidayEditPopup year={govEditYear} onClose={closeGovEditPopup} />
        )}
      </div>
    </>
  );
};

export default HolidayAssignmentAdmin;