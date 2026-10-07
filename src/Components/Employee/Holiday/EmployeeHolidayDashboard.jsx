import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { portalInstance } from "../../../Services/instance";
import Sidebar from "../../HeaderSidebar/Sidebar";
import "./HolidayDashbord.css";
import "../../../Globel/Layout.css";
import CustomDropdown from "../../Common/CustomDropdown";

/* ─────────────────── CONSTANTS ─────────────────── */
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const monthNamesShort = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const weekDaysFull = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

const getWeekdayName = (year, month, day) =>
  weekDaysFull[new Date(year, month, day).getDay()];

const getSecondAndFourthSaturdays = (year, month) => {
  const saturdays = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === 6) {
      saturdays.push(d);
    }
  }
  return [saturdays[1], saturdays[3]].filter(Boolean);
};

const isSecondOrFourthSaturday = (year, month, day) =>
  getSecondAndFourthSaturdays(year, month).includes(day);

const generateGrid = (monthIdx, yr) => {
  const first = new Date(yr, monthIdx, 1).getDay();
  const daysInMon = new Date(yr, monthIdx + 1, 0).getDate();
  const daysInPrev = new Date(yr, monthIdx, 0).getDate();
  const grid = [];
  for (let i = first - 1; i >= 0; i--)
    grid.push({ day: daysInPrev - i, type: "prev" });
  for (let i = 1; i <= daysInMon; i++)
    grid.push({ day: i, type: "current" });
  for (let i = 1; i <= 42 - grid.length; i++)
    grid.push({ day: i, type: "next" });
  return grid;
};

const STATUS_MAP = {
  pending: {
    color: "#c2410c",
    canEdit: true,
    canSubmit: true,
    showModifyOptions: true,
  },
  "in-progress": {
    color: "#1d4ed8",
    canEdit: true,
    canSubmit: true,
    showModifyOptions: true,
  },
  submitted: {
    color: "#7c3aed",
    canEdit: true,
    canSubmit: true,
    showModifyOptions: true,
  },
  approved: {
    color: "#15803d",
    canEdit: true,
    canSubmit: true,
    showModifyOptions: true,
  },
  rejected: {
    color: "#be123c",
    canEdit: true,
    canSubmit: true,
    showModifyOptions: true,
  },
};

const canEditStatus = (s) => STATUS_MAP[s]?.canEdit ?? false;
const canSubmitStatus = (s) => STATUS_MAP[s]?.canSubmit ?? false;
const showModifyOptionsStatus = (s) => STATUS_MAP[s]?.showModifyOptions ?? false;

/* ─────────────────── ICONS ─────────────────── */
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

  const getCardButtonLabel = (status) => {
    switch (status) {
      case "pending": case "in-progress": case "rejected": return "Edit Holidays";
      case "submitted": case "approved": return "Edit / Update Holidays";
      default: return "View Calendar";
    }
  };
  const getCardButtonClass = (status) => {
    switch (status) {
      case "pending": case "in-progress": case "rejected": case "submitted": case "approved": return "ehd-card__btn--edit";
      default: return "ehd-card__btn--view";
    }
  };
const JsonIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const ChevronUpIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);
const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const WarnIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/* ─────────────────── ALERT POPUP ─────────────────── */
const AlertPopup = ({ config, onClose }) => {
  if (!config) return null;
  const { type = "confirm", title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel } = config;
  const handleConfirm = () => { onClose(); if (onConfirm) onConfirm(); };
  const handleCancel = () => { onClose(); if (onCancel) onCancel(); };
  const typeStyles = {
    confirm: { confirmBg: "#5977f8" },
    warning: { confirmBg: "#f59e0b" },
    danger: { confirmBg: "#ef4444" },
    alert: { confirmBg: "#16a34a" },
  };
  const s = typeStyles[type] || typeStyles.confirm;
  return (
    <div className="ehd-alert-overlay">
      <div className="ehd-alert-popup">
        <div className="ehd-alert-content">
          <h3 className="ehd-alert-title">{title}</h3>
          {message && <p className="ehd-alert-message">{message}</p>}
        </div>
        <div className="ehd-alert-actions">
          {type !== "alert" && (
            <button className="ehd-alert-btn ehd-alert-btn--cancel" onClick={handleCancel}>{cancelLabel}</button>
          )}
          <button className="ehd-alert-btn ehd-alert-btn--confirm" style={{ background: s.confirmBg }} onClick={handleConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────── STATUS BADGE ─────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    pending: { cls: "ehd-badge--pending", label: "Pending" },
    "in-progress": { cls: "ehd-badge--progress", label: "In Progress" },
    submitted: { cls: "ehd-badge--submitted", label: "Submitted" },
    approved: { cls: "ehd-badge--approved", label: "Approved" },
    rejected: { cls: "ehd-badge--rejected", label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return <span className={`ehd-badge ${s.cls}`}>{s.label}</span>;
};

/* ─────────────────── HOLIDAY CARD ─────────────────── */
const HolidayCard = ({ holiday, monthIndex, year, type, onRemove, canEdit: cardCanEdit }) => {
  const weekday = getWeekdayName(year, monthIndex, holiday.date);
  return (
    <div className="ehd-holiday-card">
      <div className={`ehd-holiday-card__date-section ehd-holiday-card__date-section--${type}`}>
        <span className="ehd-holiday-card__day">{holiday.date}</span>
        <span className="ehd-holiday-card__month">{monthNamesShort[monthIndex]}</span>
      </div>
      <div className="ehd-holiday-card__info">
        <span className="ehd-holiday-card__name">{holiday.name}</span>
        <span className="ehd-holiday-card__weekday">{weekday}</span>
      </div>
      {cardCanEdit && onRemove && (
        <button className="ehd-holiday-card__remove" onClick={onRemove} title="Remove" style={{ display: "grid" }}>
          ✕
        </button>
      )}
    </div>
  );
};

/* ─────────────────── HOLIDAY LIST VIEW ─────────────────── */
const HolidayListView = ({ govHolidays, specialDays, year, onRemoveHoliday, canEdit: listCanEdit }) => {
  const [activeTab, setActiveTab] = useState("gov");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [searchTerm, setSearchTerm] = useState("");
  const listContainerRef = useRef(null);

  useEffect(() => {
    // When user selects a month, scroll that month section into view at top.
    if (selectedMonth === "all") {
      listContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const monthElem = document.getElementById(`ehd-month-group-${selectedMonth}`);
      if (monthElem) {
        monthElem.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        listContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [selectedMonth, activeTab]);

  const buildList = (type) => {
    const src = type === "gov" ? govHolidays : specialDays;
    const all = [];
    for (let m = 0; m < 12; m++) {
      (src[m] || []).forEach((h) => all.push({ ...h, monthIndex: m, monthName: monthNames[m], type }));
    }
    return all.sort((a, b) => a.monthIndex !== b.monthIndex ? a.monthIndex - b.monthIndex : a.date - b.date);
  };

  const govCount = buildList("gov").length;
  const specialCount = buildList("special").length;

  const filtered = buildList(activeTab).filter((h) => {
    const matchMonth = selectedMonth === "all" || h.monthIndex === parseInt(selectedMonth);
    const matchSearch = !searchTerm || h.name.toLowerCase().includes(searchTerm.toLowerCase()) || h.monthName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchMonth && matchSearch;
  });

  const grouped = filtered.reduce((acc, h) => {
    if (!acc[h.monthIndex]) acc[h.monthIndex] = [];
    acc[h.monthIndex].push(h);
    return acc;
  }, {});

  return (
    <div className="ehd-gov-holiday-list-view">
      <div style={{ display: "flex", marginBottom: 20 }}>
        {[
          { key: "gov", label: "Government Holidays", count: govCount, color: "#15803d", light: "#dcfce7" },
          { key: "special", label: "Special Days", count: specialCount, color: "#7c3aed", light: "#f5f3ff" },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedMonth("all"); setSearchTerm(""); }}
              style={{ padding: "10px 22px", border: "none", marginBottom: -2, background: "none", cursor: "pointer", fontWeight: active ? 700 : 400, color: active ? tab.color : "#77728E", fontSize: 13, display: "flex", alignItems: "center", gap: 8, transition: "all 0.18s" }}>
              {tab.label}
              <span style={{ background: active ? tab.light : "#f1f5f9", color: active ? tab.color : "#94a3b8", borderRadius: 12, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{tab.count}</span>
            </button>
          );
        })}
      </div>
      <CustomDropdown
        options={[
          { label: "All Months", value: "all" },
          ...monthNames.map((m, idx) => ({ label: m, value: String(idx) })),
        ]}
        value={selectedMonth}
        onChange={(val) => setSelectedMonth(val)}
        placeholder="All Months"
        className="ehd-custom-dropdown--sm"
        style={{ height: "35px", width: "200px", marginBottom: "20px" }}
      />
      {filtered.length > 0 ? (
        <div ref={listContainerRef} className="ehd-holiday-cards-container">
          {Object.keys(grouped).map((monthIdx) => (
            <div id={`ehd-month-group-${monthIdx}`} key={monthIdx} className="ehd-holiday-month-group">
              <div className="ehd-holiday-month-header">
                <span className="ehd-holiday-month-name">{monthNames[monthIdx]} {year}</span>
              </div>
              <div className="ehd-holiday-cards-grid">
                {grouped[monthIdx].map((h, idx) => (
                  <HolidayCard key={`${activeTab}-${monthIdx}-${h.date}-${idx}`} holiday={h} monthIndex={parseInt(monthIdx)} year={year} type={activeTab} canEdit={listCanEdit} onRemove={() => onRemoveHoliday(parseInt(monthIdx), h.date, activeTab)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ehd-no-holidays">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p>No {activeTab === "gov" ? "government holidays" : "special days"} found</p>
          {searchTerm && <p className="ehd-no-holidays__hint">Try a different search term</p>}
        </div>
      )}
    </div>
  );
};

/* ─────────────────── MINI CALENDAR CARD ─────────────────── */
const MiniCalendarCard = ({ monthIndex, year, govHolidays = [], specialDays = [], onClick, onDoubleClick, isActive, hasUnsaved, editable }) => {
  const grid = generateGrid(monthIndex, year);

  const cells = grid.map((cell, idx) => {
    if (cell.type !== "current") {
      return (
        <span key={idx} className="sidebar-calendar-day sidebar-not-current-month">
          -
        </span>
      );
    }

    const hData = govHolidays.find((h) => h.date === cell.day);
    const sData = specialDays.find((h) => h.date === cell.day);
    const isSun = idx % 7 === 0;
    const isSpecSat = isSecondOrFourthSaturday(year, monthIndex, cell.day);

    let cellClass = "sidebar-calendar-day";
    let titleText = "";

    if (hData && sData) {
      cellClass += " sidebar-holiday-circle";
      titleText = `${hData.name} / ${sData.name}`;
    } else if (hData) {
      cellClass += " sidebar-holiday-circle";
      titleText = hData.name;
    } else if (sData) {
      cellClass += " sidebar-special-circle";
      titleText = sData.name;
    } else if (isSun || isSpecSat) {
      cellClass += " sidebar-weekend-red";
      titleText = isSun ? "Sunday" : "2nd/4th Saturday";
    }

    return (
      <span
        key={idx}
        className={cellClass}
        title={titleText}
      >
        {cell.day}
      </span>
    );
  });

  return (
    <div
      className={`sidebar-mini-calendar ${isActive ? "sidebar-mini-calendar--active" : ""} ${hasUnsaved ? "sidebar-mini-calendar--unsaved" : ""}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{ cursor: "pointer", border: isActive ? "1.5px solid #5977f8" : hasUnsaved ? "1.5px dashed #f59e0b" : undefined, boxShadow: isActive ? "0 4px 20px rgba(89, 119, 248, 0.12)" : undefined }}
    >
      <div className="sidebar-calendar-month-header" style={{ marginBottom: "2px" }}>
        <h3 style={{ margin: "0", padding: "6px 0", fontSize: "12px", color: "#374151", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
          {monthNames[monthIndex]}
          {hasUnsaved && <span className="sidebar-calendar-unsaved-dot" style={{ width: "6px", height: "6px", backgroundColor: "#ef4444", borderRadius: "50%", display: "inline-block" }} />}
        </h3>
        <div className="sidebar-header-underline"></div>
      </div>
      <div className="sidebar-calendar-weekdays" style={{ marginBottom: "2px", padding: "4px 0" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} style={{ fontSize: "8px", fontWeight: "500", color: "#9ca3af", textTransform: "uppercase" }}>
            {d}
          </span>
        ))}
      </div>
      <div className="sidebar-calendar-grid" style={{ padding: "4px" }}>
        {cells}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MONTH EDIT MODAL
══════════════════════════════════════════════════════ */
const MonthEditModal = ({ monthIndex, year, govHolidays = {}, specialDays = {}, onAdd, onRemove, onClear, onSave, onClose, isSaving, hasUnsaved }) => {
  const [activeTab, setActiveTab] = useState("gov");
  const [dayInput, setDayInput] = useState("");
  const [nameInput, setNameInput] = useState("");

  const isGov = activeTab === "gov";
  const maxDay = new Date(year, monthIndex + 1, 0).getDate();
  const currentList = isGov ? (govHolidays[monthIndex] || []) : (specialDays[monthIndex] || []);

  const handleAdd = () => {
    if (!dayInput || !nameInput.trim()) return;
    onAdd && onAdd(activeTab, { date: dayInput, name: nameInput }, (ok) => {
      if (ok) { setDayInput(""); setNameInput(""); }
    });
  };

  return (
    <div className="mem-overlay" onClick={onClose}>
      <div className="mem-popup" onClick={(e) => e.stopPropagation()}>
        <div className="mem-header">
          <h3 className="mem-title">
            {monthNames[monthIndex]} {year}
            {hasUnsaved && <span className="mem-unsaved-badge">Unsaved</span>}
          </h3>
          <button className="hrms-common-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="mem-tabs">
          <button className={`mem-tab mem-tab--gov ${isGov ? "mem-tab--active-gov" : ""}`} onClick={() => setActiveTab("gov")}>
            Government Holidays
            {govHolidays[monthIndex]?.length > 0 && <span className="mem-tab-badge mem-tab-badge--gov">{govHolidays[monthIndex].length}</span>}
          </button>
          <button className={`mem-tab mem-tab--special ${!isGov ? "mem-tab--active-special" : ""}`} onClick={() => setActiveTab("special")}>
            Special Days
            {specialDays[monthIndex]?.length > 0 && <span className="mem-tab-badge mem-tab-badge--special">{specialDays[monthIndex].length}</span>}
          </button>
        </div>
        <div className="mem-body">
          <div className="mem-add-row">
            <CustomDropdown
              options={[
                ...Array.from({ length: maxDay }, (_, i) => ({
                  label: String(i + 1),
                  value: i + 1,
                })),
              ]}
              value={dayInput}
              onChange={(val) => setDayInput(val)}
              placeholder="Day"
              className="ehd-custom-dropdown--day"
              style={{ height: "35px" }}
            />
            <input
              className="mem-name-input"
              style={{ height: "35px" }}
              placeholder={isGov ? "Holiday Name...." : "Special Day / Event Name...."}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button className={`mem-add-btn ${isGov ? "mem-add-btn--gov" : "mem-add-btn--special"}`} onClick={handleAdd}>
              Add <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          </div>
          <div className="mem-cards-list">
            {currentList.length === 0 ? (
              <p className="mem-empty">No {isGov ? "government holidays" : "special days"} — add one above.</p>
            ) : (
              currentList.map((h, idx) => {
                const weekday = getWeekdayName(year, monthIndex, h.date);
                return (
                  <div key={idx} className="mem-card">
                    <div className={`mem-card-square ${isGov ? "mem-card-square--gov" : "mem-card-square--special"}`}>
                      <span className="mem-card-day">{h.date}</span>
                      <span className="mem-card-month">{monthNamesShort[monthIndex]}</span>
                    </div>
                    <div className="mem-card-info">
                      <span className="mem-card-name">{h.name}</span>
                      <span className="mem-card-weekday">{weekday}</span>
                    </div>
                    <button className="mem-remove-btn" onClick={() => onRemove && onRemove(activeTab, idx)} title="Remove">✕</button>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div className="mem-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="button"
            className="common-modal-btn btn-update"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   ✅ BULK IMPORT MODAL — with Load Sample from API
══════════════════════════════════════════════════════ */
const BulkImportModal = ({ onClose, onImport, activeAssignment }) => {
  const [bulkJsonInput, setBulkJsonInput] = useState("");
  const [loadingSample, setLoadingSample] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * ✅ LOAD SAMPLE LOGIC:
   * 1. Call holiday-assignments/my API
   * 2. Find the assignment matching activeAssignment._id
   * 3. Build JSON with status: "approved" from its months data
   * 4. Fill the textarea with this real data
   */
  const handleLoadSample = async () => {
    try {
      setLoadingSample(true);
      const res = await portalInstance.get("holiday-assignments/my");

      if (!res.data.success) {
        toast.error("Failed to fetch holiday data");
        return;
      }

      const assignments = res.data.data;

      // Find current assignment's data
      const match = assignments.find((a) => a._id === activeAssignment._id);

      if (!match) {
        toast.warning("No matching assignment found. Loading static sample.");
        // fallback to static sample if not found
        setBulkJsonInput(JSON.stringify(getStaticSample(), null, 2));
        return;
      }

      // Build JSON from real data — mark as approved so import works
      const jsonData = buildJsonFromAssignment(match);
      setBulkJsonInput(JSON.stringify(jsonData, null, 2));
      toast.success("Loaded your current holiday data. You can edit and re-import.");

    } catch (err) {
      console.error("Load sample error:", err);
      toast.error("Failed to load data. Loading static sample instead.");
      // fallback
      setBulkJsonInput(JSON.stringify(getStaticSample(), null, 2));
    } finally {
      setLoadingSample(false);
    }
  };

  /**
   * ✅ Converts API assignment data into import-ready JSON format
   * Forces status: "approved" so the import logic accepts it
   */
  const buildJsonFromAssignment = (assignment) => {
    const months = (assignment.months || [])
      .filter((m) => (m.governmentHolidays?.length || 0) + (m.specialDays?.length || 0) > 0)
      .map((m) => ({
        month: m.month,
        monthName: monthNames[m.month - 1],
        governmentHolidays: (m.governmentHolidays || []).map((h) => ({
          date: h.date,
          name: h.name,
        })),
        specialDays: (m.specialDays || []).map((h) => ({
          date: h.date,
          name: h.name,
        })),
      }))
      .sort((a, b) => a.month - b.month);

    return {
      status: "approved",          // ✅ Required by import logic
      year: assignment.year,
      employee: assignment.assignedTo?.name || "Unknown",
      exportedAt: new Date().toISOString(),
      months,
    };
  };

  /** Static fallback sample */
  const getStaticSample = () => ({
    status: "approved",
    year: activeAssignment?.year || new Date().getFullYear(),
    months: [
      {
        month: 1,
        monthName: "January",
        governmentHolidays: [
          { date: 1, name: "New Year's Day" },
          { date: 26, name: "Republic Day" },
        ],
        specialDays: [
          { date: 14, name: "Pongal" },
        ],
      },
      {
        month: 8,
        monthName: "August",
        governmentHolidays: [
          { date: 15, name: "Independence Day" },
        ],
        specialDays: [],
      },
    ],
  });
  const samplePlaceholder = `{\n  "year": 2026,\n  "months": [\n    {\n      "month": 1,\n      "governmentHolidays": [\n        { "date": 15, "name": "Pongal" },\n        { "date": 26, "name": "Republic Day" }\n      ],\n      "specialDays": [\n        { "date": 12, "name": "National Youth Day" }\n      ]\n    }\n  ]\n}`;

  const handleCopy = async () => {
    const textToCopy = bulkJsonInput || samplePlaceholder;

    const copySuccess = () => {
      setCopied(true);
      toast.success("Copied to clipboard!", {
        position: "top-right",
        autoClose: 2000,
      });
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        copySuccess();
        return;
      } catch (err) {
        console.warn("Clipboard API failed, falling back to execCommand", err);
      }
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      textArea.remove();
      if (successful) {
        copySuccess();
      } else {
        toast.error("Failed to copy!");
      }
    } catch (e) {
      console.error("Fallback copy error:", e);
      toast.error("Failed to copy!");
    }
  };

  return (
    <div className="ehd-overlay ehd-overlay--month" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="ehd-modal ehd-modal--month" onClick={(e) => e.stopPropagation()}>
        <div className="ehd-modal__head">
          <h3 className="ehd-modal__title">Bulk Import — All Months</h3>
          <button className="hrms-common-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ehd-modal__body">


          <div className="json-container">
            <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={handleCopy}>
              {copied ? "Copied" : "Copy"}
            </button>

            <textarea
              className="ehd-json-textarea"
              rows="12"
              value={bulkJsonInput}
              onChange={(e) => setBulkJsonInput(e.target.value)}
              placeholder={samplePlaceholder}
            />
          </div>
          <div className="ehd-modal__footer-btns">
            {/* ✅ Load Sample now fetches real API data */}
            <button
              className="ehd-btn ehd-btn--outline"
              onClick={handleLoadSample}
              disabled={loadingSample}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              {loadingSample ? (
                <>
                  <span className="ehd-spinner-inline" />
                  Loading...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Load My Data
                </>
              )}
            </button>

            <button
              className="ehd-btn ehd-btn--primary"
              onClick={() => onImport(bulkJsonInput)}
              disabled={!bulkJsonInput.trim()}
            >
              Import All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
const EmployeeHolidayDashboard = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [showCalendarPopup, setShowCalendarPopup] = useState(false);
  const [govHolidays, setGovHolidays] = useState({});
  const [specialDays, setSpecialDays] = useState({});
  const [unsavedMonths, setUnsavedMonths] = useState(new Set());
  const [activeMonth, setActiveMonth] = useState(null);
  const [savingMonth, setSavingMonth] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewMonth, setViewMonth] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [viewMode, setViewMode] = useState("calendar");
  const [alertConfig, setAlertConfig] = useState(null);
  const [initLoading, setInitLoading] = useState(false);

  const location = useLocation();
  const targetYear = location.state?.targetYear;
  const autoOpenedRef = useRef(false);

  const clickTimerRef = useRef(null);

  const showAlert = (config) => setAlertConfig(config);
  const closeAlert = () => setAlertConfig(null);

  const fetchMyAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await portalInstance.get("holiday-assignments/my");
      if (res.data.success) {
        const unique = [];
        const seen = new Set();
        for (const a of res.data.data) {
          if (!seen.has(a.year)) {
            seen.add(a.year);
            unique.push(a);
          }
        }
        const sorted = unique.sort((a, b) => a.year - b.year);
        setAssignments(sorted);

        if (targetYear && !autoOpenedRef.current) {
          const match = sorted.find((a) => a.year === Number(targetYear));
          if (match) {
            autoOpenedRef.current = true;
            openAssignment(match);
          }
        }
      }
    } catch {
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [targetYear]);

  const handleInitDraft = async (yearToInit) => {
    try {
      setInitLoading(true);
      const res = await portalInstance.post("holiday-assignments/init-draft", { year: yearToInit });
      if (res.data?.success && res.data?.data) {
        toast.success(`Draft calendar for ${yearToInit} initialized.`);
        await fetchMyAssignments();
        openAssignment(res.data.data);
      } else {
        toast.error(res.data?.message || "Failed to initialize calendar");
      }
    } catch (err) {
      console.error("Failed to initialize draft:", err);
      toast.error(err.response?.data?.message || "Failed to initialize draft.");
    } finally {
      setInitLoading(false);
    }
  };

  useEffect(() => { fetchMyAssignments(); }, [fetchMyAssignments]);
  useEffect(() => { return () => clearTimeout(clickTimerRef.current); }, []);

  const isEditable = activeAssignment ? canEditStatus(activeAssignment.status) : false;
  const isSubmittable = activeAssignment ? canSubmitStatus(activeAssignment.status) : false;
  const showModify = activeAssignment ? showModifyOptionsStatus(activeAssignment.status) : false;

  const openAssignment = (assignment) => {
    setActiveAssignment(assignment);
    setActiveMonth(null);
    setShowMonthModal(false);
    setShowViewModal(false);
    setUnsavedMonths(new Set());
    setViewMode("calendar");
    const g = {}, s = {};
    assignment.months.forEach((m) => {
      g[m.month - 1] = m.governmentHolidays || [];
      s[m.month - 1] = m.specialDays || [];
    });
    setGovHolidays(g);
    setSpecialDays(s);
    setShowCalendarPopup(true);
  };

  const doCloseCalendar = () => {
    setShowCalendarPopup(false);
    setActiveAssignment(null);
    setShowMonthModal(false);
    setShowViewModal(false);
    setActiveMonth(null);
    setViewMonth(null);
    setShowBulkModal(false);
    setViewMode("calendar");
  };

  const closeCalendarPopup = () => {
    if (unsavedMonths.size > 0) {
      showAlert({
        type: "warning",
        title: "Unsaved Changes",
        message: `You have ${unsavedMonths.size} unsaved month${unsavedMonths.size > 1 ? "s" : ""}. Are you sure you want to close without saving?`,
        confirmLabel: "Close Anyway",
        cancelLabel: "Stay & Save",
        onConfirm: doCloseCalendar,
      });
      return;
    }
    doCloseCalendar();
  };

  const openMonthModal = (mi) => { setActiveMonth(mi); setShowMonthModal(true); };
  const closeMonthModal = () => { setShowMonthModal(false); setActiveMonth(null); };
  const openViewModal = (mi) => { setViewMonth(mi); setShowViewModal(true); };
  const closeViewModal = () => { setShowViewModal(false); setViewMonth(null); };
  const markUnsaved = (mi) => setUnsavedMonths((prev) => new Set([...prev, mi]));

  const validateAndMerge = (incoming, existing, mi, year) => {
    const maxDay = new Date(year, mi + 1, 0).getDate();
    const valid = incoming
      .filter((h) => h.name?.trim() && !isNaN(parseInt(h.date)) && parseInt(h.date) >= 1 && parseInt(h.date) <= maxDay)
      .map((h) => ({ date: parseInt(h.date), name: h.name.trim() }));
    const merged = [...(existing || [])];
    valid.forEach((item) => {
      if (!merged.find((e) => e.date === item.date && e.name === item.name)) merged.push(item);
    });
    return merged.sort((a, b) => a.date - b.date);
  };

  const handleAdd = (type, input, cb) => {
    if (!input.date || !input.name.trim()) { toast.warning("Enter both day and name."); return; }
    const dayNum = parseInt(input.date);
    const yr = activeAssignment.year;
    const maxDay = new Date(yr, activeMonth + 1, 0).getDate();
    if (dayNum < 1 || dayNum > maxDay) { toast.error(`Invalid day. ${monthNames[activeMonth]} has ${maxDay} days.`); cb(false); return; }

    // Check if dayNum is already used within the same type
    if (type === "gov") {
      const govList = govHolidays[activeMonth] || [];
      if (govList.find((h) => h.date === dayNum)) {
        toast.warning(`A government holiday already exists on date ${dayNum} for ${monthNames[activeMonth]}`);
        cb(false);
        return;
      }
    } else {
      const specList = specialDays[activeMonth] || [];
      if (specList.find((h) => h.date === dayNum)) {
        toast.warning(`A special day already exists on date ${dayNum} for ${monthNames[activeMonth]}`);
        cb(false);
        return;
      }
    }

    const data = type === "gov" ? govHolidays : specialDays;
    const setData = type === "gov" ? setGovHolidays : setSpecialDays;
    const list = data[activeMonth] || [];
    const updated = [...list, { date: dayNum, name: input.name.trim() }].sort((a, b) => a.date - b.date);
    setData({ ...data, [activeMonth]: updated });
    markUnsaved(activeMonth);
    cb(true);
    toast.success(`"${input.name.trim()}" added`);
  };

  const handleRemove = (type, idx) => {
    const data = type === "gov" ? govHolidays : specialDays;
    const setData = type === "gov" ? setGovHolidays : setSpecialDays;
    const removed = data[activeMonth][idx];
    setData({ ...data, [activeMonth]: data[activeMonth].filter((_, i) => i !== idx) });
    markUnsaved(activeMonth);
    toast.info(`Removed "${removed.name}"`);
  };

  const handleClear = (type) => {
    const label = type === "gov" ? "Government Holidays" : "Special Days";
    showAlert({
      type: "danger",
      title: `Clear All ${label}`,
      message: `This will remove all ${label.toLowerCase()} for ${monthNames[activeMonth]}. This action cannot be undone.`,
      confirmLabel: "Yes, Clear All",
      cancelLabel: "Cancel",
      onConfirm: () => {
        const setData = type === "gov" ? setGovHolidays : setSpecialDays;
        setData((prev) => ({ ...prev, [activeMonth]: [] }));
        markUnsaved(activeMonth);
        toast.info(`${label} cleared`);
      },
    });
  };

  const handleJsonImport = (type, jsonText, cb) => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) { toast.error("Provide a JSON array"); cb(false); return; }
      const yr = activeAssignment.year;
      const data = type === "gov" ? govHolidays : specialDays;
      const setData = type === "gov" ? setGovHolidays : setSpecialDays;
      const merged = validateAndMerge(parsed, data[activeMonth], activeMonth, yr);
      setData({ ...data, [activeMonth]: merged });
      markUnsaved(activeMonth);
      toast.success(`Imported for ${monthNames[activeMonth]}!`);
      cb(true);
    } catch { toast.error("Invalid JSON format."); cb(false); }
  };

  const removeHolidayFromList = (monthIdx, date, type) => {
    if (!isEditable) return;
    const data = type === "gov" ? govHolidays : specialDays;
    const setData = type === "gov" ? setGovHolidays : setSpecialDays;
    const removed = (data[monthIdx] || []).find((h) => h.date === date);
    setData({ ...data, [monthIdx]: (data[monthIdx] || []).filter((h) => h.date !== date) });
    markUnsaved(monthIdx);
    if (removed) toast.info(`Removed "${removed.name}"`);
  };

  /* ══════════════════════════════════════════
     ✅ BULK IMPORT HANDLER
     Called when user clicks "Import All" in BulkImportModal
  ══════════════════════════════════════════ */
  const saveImportedMonths = async (monthIndices, govSnapshot, specSnapshot) => {
    if (!monthIndices.length || !activeAssignment) return;

    const toastId = toast.loading(`Saving imported data for ${monthIndices.length} month(s)...`);
    let ok = 0;
    let fail = 0;

    for (const mi of monthIndices) {
      try {
        await portalInstance.post("holiday-assignments/save-month", {
          assignmentId: activeAssignment._id,
          month: mi + 1,
          governmentHolidays: govSnapshot[mi] || [],
          specialDays: specSnapshot[mi] || [],
        });
        ok++;
      } catch (err) {
        console.error(`Save month ${mi + 1} failed`, err);
        fail++;
      }
    }

    // Refresh assignment state from server after partial/full save
    try {
      const res = await portalInstance.get(`holiday-assignments/detail/${activeAssignment._id}`);
      if (res.data.success) {
        const updated = res.data.data;
        const g = {}, s = {};
        updated.months.forEach((m) => {
          g[m.month - 1] = m.governmentHolidays || [];
          s[m.month - 1] = m.specialDays || [];
        });
        setActiveAssignment(updated);
        setGovHolidays(g);
        setSpecialDays(s);
        setAssignments((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
        setUnsavedMonths((prev) => {
          const n = new Set(prev);
          monthIndices.forEach((mi) => n.delete(mi));
          return n;
        });
      }
    } catch (err) {
      console.error("Failed refreshing assignment after import", err);
    }

    toast.dismiss(toastId);
    if (fail === 0) {
      toast.success(`Imported and saved ${ok} month(s).`);
    } else {
      toast.warning(`Imported ${monthIndices.length}; saved ${ok}, failed ${fail}.`);
    }
  };

  const handleBulkImport = async (bulkJsonInput) => {
    try {
      const parsed = JSON.parse(bulkJsonInput);

      if (!parsed.months || !Array.isArray(parsed.months)) {
        toast.error('JSON must have a "months" array.');
        return;
      }

      if (!activeAssignment) {
        toast.error("No active assignment selected.");
        return;
      }

      const yr = activeAssignment.year;
      const newGov = { ...govHolidays };
      const newSpec = { ...specialDays };
      const changedMonths = new Set();

      parsed.months.forEach((md) => {
        const mi = Number(md.month) - 1;
        if (Number.isNaN(mi) || mi < 0 || mi > 11) return;

        const govList = Array.isArray(md.governmentHolidays) ? md.governmentHolidays : [];
        const specList = Array.isArray(md.specialDays) ? md.specialDays : [];

        const validatedGov = validateAndMerge(govList, [], mi, yr);
        const validatedSpec = validateAndMerge(specList, [], mi, yr);

        // Replace month content with imported content (supports add/update/delete by JSON payload)
        newGov[mi] = validatedGov;
        newSpec[mi] = validatedSpec;

        if (validatedGov.length || validatedSpec.length) {
          changedMonths.add(mi);
        }
      });

      setGovHolidays(newGov);
      setSpecialDays(newSpec);
      setShowBulkModal(false);

      if (changedMonths.size === 0) {
        toast.info("No valid months found in import payload.");
        return;
      }

      await saveImportedMonths(Array.from(changedMonths), newGov, newSpec);
    } catch (err) {
      console.error("handleBulkImport error", err);
      toast.error("Invalid JSON format.");
    }
  };

  const saveMonth = async (mi) => {
    try {
      setSavingMonth(mi);
      const res = await portalInstance.post("holiday-assignments/save-month", {
        assignmentId: activeAssignment._id,
        month: mi + 1,
        governmentHolidays: govHolidays[mi] || [],
        specialDays: specialDays[mi] || [],
      });
      if (res.data.success) {
        const updated = res.data.data;
        setActiveAssignment(updated);
        setUnsavedMonths((prev) => { const n = new Set(prev); n.delete(mi); return n; });
        const g = {}, s = {};
        updated.months.forEach((m) => { g[m.month - 1] = m.governmentHolidays || []; s[m.month - 1] = m.specialDays || []; });
        setGovHolidays(g);
        setSpecialDays(s);
        setAssignments((prev) => prev.map((a) => a._id === updated._id ? updated : a));
        toast.success(`${monthNames[mi]} saved!`);
        closeMonthModal();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Error saving ${monthNames[mi]}`);
    } finally {
      setSavingMonth(null);
    }
  };

  const saveAllUnsaved = async () => {
    if (!unsavedMonths.size) { toast.info("No unsaved changes."); return; }
    const monthsList = Array.from(unsavedMonths);
    const toastId = toast.loading(`Saving ${monthsList.length} month(s)...`);
    let ok = 0, fail = 0;
    for (const mi of monthsList) {
      try {
        const res = await portalInstance.post("holiday-assignments/save-month", {
          assignmentId: activeAssignment._id,
          month: mi + 1,
          governmentHolidays: govHolidays[mi] || [],
          specialDays: specialDays[mi] || [],
        });
        if (res.data.success) ok++;
      } catch { fail++; }
    }
    try {
      const r = await portalInstance.get(`holiday-assignments/detail/${activeAssignment._id}`);
      if (r.data.success) {
        const u = r.data.data;
        setActiveAssignment(u);
        const g = {}, s = {};
        u.months.forEach((m) => { g[m.month - 1] = m.governmentHolidays || []; s[m.month - 1] = m.specialDays || []; });
        setGovHolidays(g);
        setSpecialDays(s);
        setUnsavedMonths(new Set());
        setAssignments((prev) => prev.map((a) => a._id === u._id ? u : a));
      }
    } catch { }
    toast.dismiss(toastId);
    fail === 0 ? toast.success(`All ${ok} month(s) saved!`) : toast.warning(`Saved ${ok}. ${fail} failed.`);
  };

  const handleSubmit = () => {
    if (unsavedMonths.size > 0) {
      toast.warning(`Please save all months before submitting. You have ${unsavedMonths.size} unsaved month${unsavedMonths.size > 1 ? "s" : ""}.`);
      return;
    }
    const totalGov = Object.values(govHolidays).reduce((a, c) => a + (c?.length || 0), 0);
    const totalSpecial = Object.values(specialDays).reduce((a, c) => a + (c?.length || 0), 0);
    if (totalGov + totalSpecial === 0) {
      toast.warning("Cannot submit an empty calendar to Admin.");
      return;
    }
    const isResubmit = activeAssignment.status === "submitted";
    showAlert({
      type: "confirm",
      title: isResubmit ? "Re-Submit Holiday Calendar" : "Submit Holiday Calendar",
      message: isResubmit ? "Are you sure you want to re-submit this updated calendar to admin?" : "Are you sure you want to submit this calendar to admin for review?",
      confirmLabel: isResubmit ? "Re-Submit to Admin" : "Submit to Admin",
      cancelLabel: "Cancel",
      onConfirm: async () => {
        const toastId = toast.loading(isResubmit ? "Re-submitting..." : "Submitting...");
        try {
          setSubmitting(true);
          const res = await portalInstance.post("holiday-assignments/submit", { assignmentId: activeAssignment._id });
          if (res.data.success) {
            toast.update(toastId, { render: isResubmit ? " Re-submitted!" : " Submitted to admin!", type: "success", isLoading: false, autoClose: 3000 });
            const updatedAssignment = res.data.data;
            setAssignments((prev) => prev.map((a) => a._id === updatedAssignment._id ? updatedAssignment : a));
            setActiveAssignment(updatedAssignment);
          } else {
            toast.update(toastId, { render: res.data.message || "Submission failed.", type: "error", isLoading: false, autoClose: 5000 });
          }
        } catch (err) {
          toast.update(toastId, { render: err.response?.data?.message || "Error submitting.", type: "error", isLoading: false, autoClose: 5000 });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const getTotals = () => {
    const gov = Object.values(govHolidays).reduce((a, c) => a + (c?.length || 0), 0);
    const special = Object.values(specialDays).reduce((a, c) => a + (c?.length || 0), 0);
    return { gov, special, total: gov + special };
  };

  const getCardButtonLabel = (status) => {
    switch (status) {
      case "pending": case "in-progress": case "rejected": return "Edit Holidays";
      case "submitted": case "approved": return "Edit / Update Holidays";
      default: return "View Calendar";
    }
  };
  const getCardButtonClass = (status) => {
    switch (status) {
      case "pending": case "in-progress": case "rejected": case "submitted": return "ehd-card__btn--edit";
      case "approved": return "ehd-card__btn--approved";
      default: return "ehd-card__btn--view";
    }
  };

  /* ══════════ RENDER ══════════ */
  return (
    <>
      <Sidebar />
      <ToastContainer position="top-right" autoClose={3000} />
      <AlertPopup config={alertConfig} onClose={closeAlert} />

      <div className="common-page-container">
        {loading ? (
          <div className="ehd-loading" style={{ minHeight: "350px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span className="ehd-spinner" />
            <span style={{ marginTop: "12px", color: "#64748b", fontSize: "14px" }}>Loading your assignments...</span>
          </div>
        ) : (
          <>
            <div className="ehd-page-header">
          <div className="ehd-page-header__left">
            <div>
              <h1 className="ehd-page-header__title">Holiday Requests</h1>
              <p className="ehd-page-header__sub">View, edit, and update Government Holidays & Special Days, and submit to Admin for approval.</p>
            </div>
          </div>
          <div className="ehd-page-header__actions">
            {assignments.length > 0 &&
              !assignments.some((a) => a.year === (Number(targetYear) || new Date().getFullYear())) && (
                <button
                  className="ehd-init-year-btn"
                  onClick={() => handleInitDraft(targetYear || new Date().getFullYear())}
                  disabled={initLoading}
                  title={`Click to initialize ${targetYear || new Date().getFullYear()} holiday calendar`}
                >
                  <span className="ehd-init-pulse-dot" />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>{initLoading ? "Initializing..." : `Initialize ${targetYear || new Date().getFullYear()} Calendar`}</span>
                </button>
              )}
          </div>
        </div>

        <div className="ehd-page-header__stats" style={{ marginBottom: "24px" }}>
          {[
            { label: "Total", val: assignments.length },
            { label: "Pending", val: assignments.filter((a) => a.status === "pending").length, cls: "stat--pending" },
            { label: "Submitted", val: assignments.filter((a) => a.status === "submitted").length, cls: "stat--submitted" },
            { label: "Approved", val: assignments.filter((a) => a.status === "approved").length, cls: "stat--approved" },
          ].map((s) => (
            <div key={s.label} className={`ehd-stat-pill ${s.cls || ""}`}>
              <span className="ehd-stat-pill__num">{s.val}</span>
              <span className="ehd-stat-pill__lbl">{s.label}</span>
            </div>
          ))}
        </div>

        {assignments.length === 0 ? (
          <div className="ehd-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>No holiday calendar draft found for {targetYear || new Date().getFullYear()}.</span>
            <p>Upload and configure the holiday calendar draft and submit to Admin for approval.</p>
            <button
              className="ehd-init-year-btn"
              style={{ marginTop: 16, padding: "10px 24px", height: "40px", fontSize: "13.5px" }}
              onClick={() => handleInitDraft(targetYear || new Date().getFullYear())}
              disabled={initLoading}
            >
              <span className="ehd-init-pulse-dot" />
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>{initLoading ? "Initializing..." : `Upload / Initialize ${targetYear || new Date().getFullYear()} Calendar`}</span>
            </button>
          </div>
        ) : (
          <div className="ehd-cards">
            {assignments.map((a) => {
              const totalGov = a.months.reduce((s, m) => s + (m.governmentHolidays?.length || 0), 0);
              const totalSpecial = a.months.reduce((s, m) => s + (m.specialDays?.length || 0), 0);
              const sm = STATUS_MAP[a.status] || STATUS_MAP.pending;
              return (
                <div key={a._id} className={`ehd-card  ehd-card--${a.status}`}>
                  <div className="ehd-card__top-row">
                    <div className="ehd-card__year">{a.year}</div>

                    <div className="ehd-card__status-row">
                      <StatusBadge status={a.status} />
                      <span
                        className="ehd-card__status-info"
                        style={{ color: sm.color }}
                      >
                        {sm.info}
                      </span>
                    </div>
                  </div>

                  <div className="ehd-card__meta">
                    <span>Assigned by {a.assignedBy?.name || "Admin"}</span>
                    <span>{new Date(a.assignedDate).toLocaleDateString()}</span>
                  </div>
                  <div className="ehd-card__stats">
                    <div className="ehd-stat-box">
                      <span className="ehd-stat-box__num" style={{ color: "#15803d" }}>{totalGov}</span>
                      <span className="ehd-stat-box__lbl">Gov Holidays</span>
                    </div>
                    <div className="ehd-stat-box">
                      <span className="ehd-stat-box__num" style={{ color: "#7c3aed" }}>{totalSpecial}</span>
                      <span className="ehd-stat-box__lbl">Special Days</span>
                    </div>
                    <div className="ehd-stat-box">
                      <span className="ehd-stat-box__num">{a.months.length}</span>
                      <span className="ehd-stat-box__lbl">Months</span>
                    </div>
                  </div>
                  {a.adminRemarks && <div className="ehd-card__remarks"><strong>Admin:</strong> {a.adminRemarks}</div>}
                  <button className={`ehd-card__btn ${getCardButtonClass(a.status)}`} onClick={() => openAssignment(a)}>
                    {getCardButtonLabel(a.status)}
                  </button>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </div>

      {/* ══════════ CALENDAR POPUP ══════════ */}
      {showCalendarPopup && activeAssignment && (
        <div className="ehd-overlay" onClick={closeCalendarPopup}>
          <div className="ehd-modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="ehd-modal__head">
              <h3 className="ehd-modal__title">Holiday Calendar — {activeAssignment.year}</h3>
              <div className="ehd-modal__head-right">
                <StatusBadge status={activeAssignment.status} />
                <div className="ehd-view-toggle">
                  <button className={`ehd-view-toggle__btn ${viewMode === "calendar" ? "active" : ""}`} onClick={() => setViewMode("calendar")}>Calendar</button>
                  <button className={`ehd-view-toggle__btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>Holiday List</button>
                </div>
                {showModify && (
                  <>
                    <button className="ehd-btn ehd-btn--outline ehd-btn--sm" onClick={() => setShowBulkModal(true)}>
                      Import JSON
                    </button>
                    {unsavedMonths.size > 0 && (
                      <button className="ehd-btn ehd-btn--primary ehd-btn--sm" onClick={saveAllUnsaved}>
                        Save All ({unsavedMonths.size})
                      </button>
                    )}
                  </>
                )}
                <button className="hrms-common-close-btn" onClick={closeCalendarPopup}>✕</button>
              </div>
            </div>

            {/* Summary Strip */}
            <div className="ehd-summary-strip">
              <div className="ehd-strip-item">
                <span className="ehd-strip-item__num" style={{ color: "#15803d" }}>{getTotals().gov}</span>
                <span className="ehd-strip-item__lbl">Gov Holidays</span>
              </div>
              <div className="ehd-strip-item">
                <span className="ehd-strip-item__num" style={{ color: "#7c3aed" }}>{getTotals().special}</span>
                <span className="ehd-strip-item__lbl">Special Days</span>
              </div>
              <div className="ehd-strip-item">
                <span className="ehd-strip-item__num">{getTotals().total}</span>
                <span className="ehd-strip-item__lbl">Total Events</span>
              </div>
              {isEditable && unsavedMonths.size > 0 && (
                <div className="ehd-strip-item strip--unsaved">
                  <span className="ehd-strip-item__num">{unsavedMonths.size}</span>
                  <span className="ehd-strip-item__lbl">Unsaved</span>
                </div>
              )}
            </div>

            <div className="ehd-modal__body">
              {viewMode === "calendar" && (
                <div className="ehd-yearly-calendar-grid">
                  {monthNames.map((name, mi) => (
                    <MiniCalendarCard
                      key={name} monthIndex={mi} year={activeAssignment.year}
                      govHolidays={govHolidays[mi] || []} specialDays={specialDays[mi] || []}
                      isActive={activeMonth === mi} hasUnsaved={unsavedMonths.has(mi)} editable={isEditable}
                      onClick={() => {
                        if (isEditable) {
                          clearTimeout(clickTimerRef.current);
                          clickTimerRef.current = setTimeout(() => openMonthModal(mi), 250);
                        }
                      }}
                      onDoubleClick={() => { clearTimeout(clickTimerRef.current); openViewModal(mi); }}
                    />
                  ))}
                </div>
              )}
              {viewMode === "list" && (
                <HolidayListView govHolidays={govHolidays} specialDays={specialDays} year={activeAssignment.year} onRemoveHoliday={removeHolidayFromList} canEdit={isEditable} />
              )}
            </div>

            {/* Footer */}
            {isEditable && isSubmittable && (
              <div className="ehd-approve-section" style={{ display: "flex", gap: "16px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                {activeAssignment.status === "approved" && unsavedMonths.size === 0 ? (
                  <div className="ehd-status-footer-banner ehd-status-footer-banner--approved" style={{ margin: 0 }}>
                    <div className="ehd-status-footer-content">
                      <strong className="ehd-status-footer-title ehd-status-footer-title--approved">Calendar Approved</strong>
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                <button
                  className="hrms-common-btn-primary"
                  style={{ height: "34px", width: "auto", minWidth: "140px", padding: "0 18px", fontSize: "13px", whiteSpace: "nowrap" }}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : (activeAssignment.status === "submitted" || activeAssignment.status === "approved")
                    ? "Re-Submit to Admin"
                    : "Submit to Admin"}
                </button>
              </div>
            )}
          </div>

          {/* Month Edit Modal */}
          {showMonthModal && activeMonth !== null && isEditable && (
            <div onClick={(e) => e.stopPropagation()}>
              <MonthEditModal
                monthIndex={activeMonth} year={activeAssignment.year}
                govHolidays={govHolidays} specialDays={specialDays}
                onAdd={handleAdd} onRemove={handleRemove} onClear={handleClear}
                onJsonImport={handleJsonImport}
                onSave={() => saveMonth(activeMonth)} onClose={closeMonthModal}
                isSaving={savingMonth === activeMonth} hasUnsaved={unsavedMonths.has(activeMonth)}
              />
            </div>
          )}

          {/* ✅ BULK IMPORT MODAL — now a separate component with Load My Data */}
          {showBulkModal && isEditable && (
            <div onClick={(e) => e.stopPropagation()}>
              <BulkImportModal
                activeAssignment={activeAssignment}
                onClose={() => setShowBulkModal(false)}
                onImport={handleBulkImport}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default EmployeeHolidayDashboard;