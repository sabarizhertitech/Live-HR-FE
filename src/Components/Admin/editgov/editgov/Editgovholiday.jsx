import React, { useState, useEffect, useRef } from "react";
import { portalInstance } from "../../../Services/instance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Editgovholiday.css";

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const weekLabels = ["S","M","T","W","T","F","S"];

const Editgovholiday = ({ year, onClose }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("calendar");
  const [page, setPage] = useState("main");
  const [selectedMonth, setSelectedMonth] = useState(null);

  const [formMode, setFormMode] = useState("add");
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [deletingHoliday, setDeletingHoliday] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [inlineDay, setInlineDay] = useState("");
  const [inlineName, setInlineName] = useState("");
  const [inlineAdding, setInlineAdding] = useState(false);
  const [inlineChanged, setInlineChanged] = useState(false);

  const [dayClickPopup, setDayClickPopup] = useState(null);
  const [dayClickName, setDayClickName] = useState("");
  const [dayClickAdding, setDayClickAdding] = useState(false);

  const [stats, setStats] = useState({
    govHolidays: 0, govOnSaturday: 0, govOnSunday: 0,
    pureSaturdays: 0, pureSundays: 0, totalOffDays: 0, workingDays: 0,
  });

  const nameInputRef = useRef(null);

  const showToast = {
    success: (msg) => toast.success(msg, { position: "top-right", autoClose: 3000 }),
    error: (msg) => toast.error(msg, { position: "top-right", autoClose: 4000 }),
    warning: (msg) => toast.warning(msg, { position: "top-right", autoClose: 3000 }),
    info: (msg) => toast.info(msg, { position: "top-right", autoClose: 3000 }),
  };

  useEffect(() => { fetchHolidays(); }, [year]);
  useEffect(() => { calculateStats(); }, [holidays]);

  useEffect(() => {
    setInlineDay("");
    setInlineName("");
    setInlineChanged(false);
    setDeletingHoliday(null);
  }, [selectedMonth]);

  useEffect(() => {
    if (dayClickPopup && !dayClickPopup.holidayData && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
  }, [dayClickPopup]);

  /* ── Helpers ── */
  const toDateString = (yr, m, d) => `${yr}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const findHoliday = (yr, m, d) => holidays.find(h => h.date === toDateString(yr, m, d));

  const getSecondAndFourthSaturdays = (yr, month) => {
    const sats = [];
    const dim = new Date(yr, month + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) if (new Date(yr, month, d).getDay() === 6) sats.push(d);
    const r = [];
    if (sats.length >= 2) r.push(sats[1]);
    if (sats.length >= 4) r.push(sats[3]);
    return r;
  };

  const getSundaysInMonth = (yr, month) => {
    const suns = [];
    const dim = new Date(yr, month + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) if (new Date(yr, month, d).getDay() === 0) suns.push(d);
    return suns;
  };

  const formatDate = (s) => new Date(s).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const getDay = (s) => new Date(s).getDate();
  const getDayName = (s) => new Date(s).toLocaleDateString("en-US", { weekday: "long" });

  const getMonthHolidays = (mi) => holidays.filter(h => {
    const d = new Date(h.date);
    return d.getMonth() === mi && d.getFullYear() === year;
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  /* ── API Calls ── */
  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const res = await portalInstance.get(`/holiday-assignments/gov-holidays/${year}`);
      if (res.data.success) setHolidays(res.data.data);
    } catch (err) {
      showToast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!holidayName.trim()) return showToast.warning("Please enter a holiday name");
    if (!holidayDate) return showToast.warning("Please select a date");
    
    setSubmitError(null);

    if (formMode === "add") {
      try {
        setSubmitLoading(true);
        const res = await portalInstance.post(`/holiday-assignments/gov-holidays`, { name: holidayName.trim(), date: holidayDate });
        if (res.data.success) {
          setHolidays(prev => [...prev, res.data.data]);
          setSubmitSuccess(true);
          showToast.success(`"${holidayName.trim()}" holiday added!`);
          setTimeout(() => goBack(), 800);
        }
      } catch (err) {
        setSubmitError(err.response?.data?.message || err.message);
      } finally {
        setSubmitLoading(false);
      }
    } else {
      const updated = holidays.map(h => h._id === editingHoliday?._id ? { ...h, name: holidayName.trim(), date: holidayDate } : h);
      await saveGovHolidayList(updated);
      setSubmitSuccess(true);
      showToast.success(`"${holidayName.trim()}" holiday updated!`);
      setTimeout(() => goBack(), 800);
    }
  };

  const handleDelete = async () => {
    if (!deletingHoliday) return;
    setDeleteLoading(true);
    try {
      const res = await portalInstance.delete(`/holiday-assignments/gov-holiday/${deletingHoliday._id}`);
      if (res.data.success) {
        setHolidays(prev => prev.filter(h => h._id !== deletingHoliday._id));
        showToast.success(`"${deletingHoliday.name}" deleted successfully!`);
        setDeletingHoliday(null);
        setInlineChanged(true);
      }
    } catch (err) {
      showToast.error(err.response?.data?.message || "Failed to delete holiday");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleInlineAdd = async () => {
    if (!inlineName.trim()) return showToast.warning("Please enter a holiday name");
    const dayNum = parseInt(inlineDay);
    const maxDay = new Date(year, selectedMonth + 1, 0).getDate();
    if (isNaN(dayNum) || dayNum < 1 || dayNum > maxDay) return showToast.error(`Enter a valid day (1–${maxDay})`);
    
    setInlineAdding(true);
    try {
      const res = await portalInstance.post(`/holiday-assignments/gov-holidays`, { name: inlineName.trim(), date: toDateString(year, selectedMonth, dayNum) });
      if (res.data.success) {
        setHolidays(prev => [...prev, res.data.data]);
        setInlineDay(""); setInlineName(""); setInlineChanged(true);
        showToast.success(`"${inlineName.trim()}" added!`);
      }
    } catch (err) {
      showToast.error("Failed to add holiday");
    } finally {
      setInlineAdding(false);
    }
  };

  const saveGovHolidayList = async (newHolidays) => {
    try {
      setSubmitLoading(true);
      const res = await portalInstance.put(`/holiday-assignments/gov-holidays/${year}`, { holidays: newHolidays });
      if (res.data.success) setHolidays(newHolidays);
      return true;
    } catch (err) {
      showToast.error("Failed to update holidays");
      return false;
    } finally {
      setSubmitLoading(false);
    }
  };

  /* ── Day Click Popup ── */
  const handleDayClick = (e, day, monthIndex) => {
    e.stopPropagation();
    setDayClickPopup({ day, monthIndex, holidayData: findHoliday(year, monthIndex, day) });
    setDayClickName("");
  };

  const closeDayClickPopup = () => { setDayClickPopup(null); setDayClickName(""); };

  const handleDayClickAdd = async () => {
    if (!dayClickName.trim()) return showToast.warning("Please enter a holiday name");
    setDayClickAdding(true);
    try {
      const res = await portalInstance.post(`/holiday-assignments/gov-holidays`, { name: dayClickName.trim(), date: toDateString(year, dayClickPopup.monthIndex, dayClickPopup.day) });
      if (res.data.success) {
        setHolidays(prev => [...prev, res.data.data]);
        showToast.success(`Added holiday!`);
        closeDayClickPopup();
      }
    } catch (err) {
      showToast.error("Failed to add holiday");
    } finally {
      setDayClickAdding(false);
    }
  };

  const handleDayClickDelete = async () => {
    if (!dayClickPopup?.holidayData) return;
    setDayClickAdding(true);
    try {
      const res = await portalInstance.delete(`/holiday-assignments/gov-holiday/${dayClickPopup.holidayData._id}`);
      if (res.data.success) {
        setHolidays(prev => prev.filter(h => h._id !== dayClickPopup.holidayData._id));
        showToast.success(`Deleted successfully!`);
        closeDayClickPopup();
      }
    } catch (err) {
      showToast.error("Failed to delete holiday");
    } finally {
      setDayClickAdding(false);
    }
  };

  /* ── Stats ── */
  const calculateStats = () => {
    const govDates = new Set(holidays.map(h => h.date));
    const allOff = new Set([...govDates]);
    let pureSun = 0, pureSat = 0, govSun = 0, govSat = 0, totalDays = 0;

    holidays.forEach(h => {
      const d = new Date(h.date);
      if (d.getDay() === 0) govSun++;
      else if (d.getDay() === 6 && getSecondAndFourthSaturdays(d.getFullYear(), d.getMonth()).includes(d.getDate())) govSat++;
    });

    for (let m = 0; m < 12; m++) {
      totalDays += new Date(year, m + 1, 0).getDate();
      getSecondAndFourthSaturdays(year, m).forEach(d => {
        const ds = toDateString(year, m, d);
        if (!govDates.has(ds)) pureSat++;
        allOff.add(ds);
      });
      getSundaysInMonth(year, m).forEach(d => {
        const ds = toDateString(year, m, d);
        if (!govDates.has(ds)) pureSun++;
        allOff.add(ds);
      });
    }
    setStats({ govHolidays: holidays.length, govOnSaturday: govSat, govOnSunday: govSun, pureSaturdays: pureSat, pureSundays: pureSun, totalOffDays: allOff.size, workingDays: totalDays - allOff.size });
  };

  /* ── Navigation ── */
  const goBack = () => { page === "form" && selectedMonth !== null ? setPage("monthDetail") : goToMain(); resetForm(); };
  const goToMain = () => { setPage("main"); setSelectedMonth(null); resetForm(); setDeletingHoliday(null); };
  const goToMonthDetail = (mi) => { setSelectedMonth(mi); setPage("monthDetail"); resetForm(); setDeletingHoliday(null); };
  
  const goToAddForm = (dateStr = "") => {
    setFormMode("add"); setEditingHoliday(null); setHolidayName("");
    setHolidayDate(dateStr || (selectedMonth !== null ? `${year}-${String(selectedMonth + 1).padStart(2, "0")}-01` : `${year}-01-01`));
    setPage("form");
  };

  const goToEditForm = (holiday) => {
    setFormMode("edit"); setEditingHoliday(holiday); setHolidayName(holiday.name); setHolidayDate(holiday.date);
    closeDayClickPopup(); setPage("form");
  };

  const resetForm = () => { setEditingHoliday(null); setHolidayName(""); setHolidayDate(""); setSubmitError(null); setSubmitSuccess(false); };

  /* ── Calendar Month Render ── */
  const renderCalendarMonth = (mi) => {
    const firstDay = new Date(year, mi, 1).getDay();
    const dim = new Date(year, mi + 1, 0).getDate();
    const specSats = new Set(getSecondAndFourthSaturdays(year, mi));
    const cells = [];

    for (let i = 0; i < firstDay; i++) cells.push(<div key={`prev-${i}`} className="gep-cal-day gep-cal-other">-</div>);

    for (let d = 1; d <= dim; d++) {
      const hData = findHoliday(year, mi, d);
      const isSun = new Date(year, mi, d).getDay() === 0;
      const isSpecSat = specSats.has(d);
      
      let cls = "gep-cal-day gep-cal-current";
      if (hData && (isSun || isSpecSat)) cls += " gep-cal-holiday gep-cal-overlap";
      else if (hData) cls += " gep-cal-holiday";
      else if (isSun || isSpecSat) cls += " gep-cal-weekend";

      cells.push(
        <div key={`day-${d}`} className={cls} onClick={(e) => handleDayClick(e, d, mi)}>
          <span className="gep-day-num">{d}</span>
          {hData && <span className="gep-day-dot" />}
        </div>
      );
    }
    return (
      <div className="gep-cal-month" key={mi} onClick={() => goToMonthDetail(mi)}>
        <div className="gep-cal-month-head"><span className="gep-cal-month-title">{months[mi]}</span></div>
        <div className="gep-cal-weekrow">{weekLabels.map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="gep-cal-daysgrid">{cells}</div>
      </div>
    );
  };

  /* ── Month Detail Render ── */
  const renderMonthDetail = () => {
    const monthHols = getMonthHolidays(selectedMonth);
    return (
      <>
        <div className="gep-md-head">
          <div className="gep-md-head-left">
            <button className="gep-back-btn" onClick={goToMain}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg></button>
            <span className="gep-md-title">{months[selectedMonth]} {year}</span>
          </div>
          <button className="gep-md-close" onClick={goToMain}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
        </div>

        <div className="gep-md-body">
          <div className="gep-md-section">
            <div className="gep-md-section-header">
              <span className="gep-md-section-title">Government Holidays</span>
              <span className="gep-md-count">{monthHols.length}</span>
            </div>

            <div className="gep-md-add-row">
              <input type="number" className="gep-md-input gep-md-input-day" placeholder="Day" value={inlineDay} onChange={(e) => setInlineDay(e.target.value)} disabled={inlineAdding} />
              <input type="text" className="gep-md-input gep-md-input-name" placeholder="Holiday name..." value={inlineName} onChange={(e) => setInlineName(e.target.value)} disabled={inlineAdding} />
              <button className="gep-md-add-btn" onClick={handleInlineAdd} disabled={inlineAdding || !inlineName.trim() || !inlineDay}>Add</button>
            </div>

            <div className="gep-md-list-area">
              {monthHols.length === 0 ? <p className="gep-md-empty">No holidays added yet.</p> : (
                <div className="gep-md-list">
                  {monthHols.map((h, i) => (
                    <div key={h._id || i} className="gep-md-item">
                      <div className="gep-md-item-date">
                        <span className="gep-md-item-day">{getDay(h.date)}</span>
                        <span className="gep-md-item-mon">{months[selectedMonth].substring(0, 3)}</span>
                      </div>
                      <div className="gep-md-item-info">
                        <span className="gep-md-item-name">{h.name}</span>
                        <span className="gep-md-item-wkd">{getDayName(h.date)}</span>
                      </div>
                      <div className="gep-md-item-actions">
                        <button className="gep-icon-btn gep-ib-edit" onClick={() => goToEditForm(h)} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                        <button className="gep-icon-btn gep-ib-del" onClick={() => setDeletingHoliday(h)} title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="gep-overlay" onClick={() => { if(page === "monthDetail") goToMain(); else onClose(); }}>
      <ToastContainer />

      <div className={`gep-popup ${page === "monthDetail" ? "gep-popup-month" : ""} ${page === "form" ? "gep-popup-form" : ""}`} onClick={(e) => e.stopPropagation()}>

        {/* ═══ DAY CLICK POPUP ═══ */}
        {dayClickPopup && (
          <div className="gep-day-popup-overlay" onClick={closeDayClickPopup}>
            <div className="gep-day-popup-container" onClick={(e) => e.stopPropagation()}>
              <div className="gep-day-popup-header">
                <div className="gep-day-popup-title">
                  <span className="gep-day-popup-day">{dayClickPopup.day}</span>
                  <div className="gep-day-popup-meta">
                    <span className="gep-day-popup-month">{months[dayClickPopup.monthIndex]}</span>
                    <span className="gep-day-popup-year">{year}</span>
                  </div>
                </div>
                <button className="gep-day-popup-close" onClick={closeDayClickPopup}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              <div className="gep-day-popup-body">
                {dayClickPopup.holidayData ? (
                  <div className="gep-day-popup-existing">
                    <div className="gep-day-info-box">
                      <span className="gep-day-info-label">Holiday</span>
                      <span className="gep-day-info-name">{dayClickPopup.holidayData.name}</span>
                      <span className="gep-day-info-weekday">{getDayName(dayClickPopup.holidayData.date)}</span>
                    </div>
                    <div className="gep-day-popup-actions">
                      <button className="gep-day-btn gep-day-btn-edit" onClick={() => goToEditForm(dayClickPopup.holidayData)}>Edit Holiday</button>
                      <button className="gep-day-btn gep-day-btn-delete" onClick={handleDayClickDelete} disabled={dayClickAdding}>
                        {dayClickAdding ? "Deleting..." : "Delete Holiday"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="gep-day-popup-add">
                    <div className="gep-day-popup-input-group">
                      <label className="gep-day-popup-label">Holiday Name *</label>
                      <input ref={nameInputRef} type="text" className="gep-day-popup-input" placeholder="e.g., Independence Day" value={dayClickName} onChange={(e) => setDayClickName(e.target.value)} disabled={dayClickAdding} />
                    </div>
                    <div className="gep-day-popup-actions gep-day-popup-actions--row">
                      <button className="gep-day-btn gep-day-btn-cancel" onClick={closeDayClickPopup}>Cancel</button>
                      <button className="gep-day-btn gep-day-btn-add" onClick={handleDayClickAdd} disabled={dayClickAdding || !dayClickName.trim()}>
                        {dayClickAdding ? "Adding..." : "Add Holiday"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ GLOBAL DELETE CONFIRMATION POPUP (NO INLINE STYLES) ═══ */}
        {deletingHoliday && (
          <div className="gep-day-popup-overlay" onClick={() => setDeletingHoliday(null)}>
            <div className="gep-day-popup-container" onClick={(e) => e.stopPropagation()}>
              <div className="gep-day-popup-header gep-delete-header">
                <div className="gep-day-popup-title">
                  <span className="gep-day-popup-month">Delete Holiday</span>
                </div>
                <button className="gep-day-popup-close" onClick={() => setDeletingHoliday(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              
              {/* Added dedicated classes instead of inline styles */}
              <div className="gep-day-popup-body gep-delete-body">
                <div className="gep-delete-content">
                  <svg className="gep-delete-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <h3 className="gep-delete-title">Are you sure?</h3>
                  <p className="gep-delete-text">
                    Do you really want to delete <strong>{deletingHoliday.name}</strong> on {formatDate(deletingHoliday.date)}?
                  </p>
                </div>
                <div className="gep-day-popup-actions gep-day-popup-actions--row" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "16px" }}>
                  <button className="gep-day-btn gep-day-btn-cancel" onClick={() => setDeletingHoliday(null)} disabled={deleteLoading}>
                    Cancel
                  </button>
                  <button className="gep-day-btn gep-day-btn-delete" onClick={handleDelete} disabled={deleteLoading}>
                    {deleteLoading ? <><span className="gep-spin-sm" /> Deleting...</> : "Yes, Delete"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ═══ MONTH DETAIL ═══ */}
        {page === "monthDetail" && selectedMonth !== null && renderMonthDetail()}

        {/* ═══ MAIN + FORM ═══ */}
        {page !== "monthDetail" && (
          <>
            <div className="gep-head">
              <div className="gep-head-left">
                {page !== "main" && <button className="gep-back-btn" onClick={goBack}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg></button>}
                <h2 className="gep-head-title">{page === "form" ? (formMode === "add" ? "Add New Holiday" : "Edit Holiday") : `Government Holidays — ${year}`}</h2>
              </div>
              <div className="gep-head-right">
                {page === "main" && (
                  <div className="gep-head-toggle">
                    <button className={`gep-toggle-btn ${viewMode === "calendar" ? "active" : ""}`} onClick={() => setViewMode("calendar")}>Calendar</button>
                    <button className={`gep-toggle-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>List</button>
                  </div>
                )}
                <button className="gep-close-x" onClick={onClose}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
              </div>
            </div>

            {page === "main" && (
              <div className="gep-stats-bar">
                <div className="gep-s-card gep-s-gov"><span className="gep-s-num">{stats.govHolidays}</span><span className="gep-s-lbl">Gov Holidays</span></div>
                <div className="gep-s-card"><span className="gep-s-num">{stats.pureSaturdays + stats.govOnSaturday}</span><span className="gep-s-lbl">2nd & 4th Sat</span></div>
                <div className="gep-s-card"><span className="gep-s-num">{stats.pureSundays + stats.govOnSunday}</span><span className="gep-s-lbl">Sundays</span></div>
                <div className="gep-s-card gep-s-off"><span className="gep-s-num">{stats.totalOffDays}</span><span className="gep-s-lbl">Total Off</span></div>
                <div className="gep-s-card gep-s-work"><span className="gep-s-num">{stats.workingDays}</span><span className="gep-s-lbl">Working Days</span></div>
              </div>
            )}

            <div className="gep-content">
              {loading && <div className="gep-center-msg"><span className="gep-spin" /><p>Loading holidays...</p></div>}

              {!loading && page === "main" && viewMode === "calendar" && (
                <div className="gep-cal-grid">{months.map((_, idx) => renderCalendarMonth(idx))}</div>
              )}

              {!loading && page === "main" && viewMode === "list" && (
                <div className="gep-list-wrap">
                  {holidays.length === 0 ? <div className="gep-center-msg"><p>No holidays found for {year}</p></div> : (
                    months.map((month, mi) => {
                      const group = getMonthHolidays(mi);
                      if (group.length === 0) return null;
                      return (
                        <div key={month} className="gep-list-month">
                          <div className="gep-list-mhead">
                            <h3>{month}</h3><span className="gep-list-mcount">{group.length} holiday{group.length !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="gep-list-cards">
                            {group.map((h, idx) => (
                              <div key={h._id || idx} className="gep-list-card">
                                <div className="gep-lc-date">
                                  <span className="gep-lc-day">{getDay(h.date)}</span>
                                  <span className="gep-lc-mon">{month.substring(0, 3)}</span>
                                </div>
                                <div className="gep-lc-info">
                                  <h4>{h.name}</h4><span>{getDayName(h.date)}</span>
                                </div>
                                <div className="gep-lc-actions">
                                  <button className="gep-icon-btn gep-ib-edit" onClick={() => goToEditForm(h)} title="Edit">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                  </button>
                                  <button className="gep-icon-btn gep-ib-del" onClick={() => setDeletingHoliday(h)} title="Delete">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {!loading && page === "form" && (
                <div className="gep-form-page">
                  <div className="gep-form-fields">
                    <div className="gep-field">
                      <label>Holiday Name <span className="gep-req">*</span></label>
                      <input type="text" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g., Independence Day" className="gep-input" disabled={submitLoading} autoFocus />
                    </div>
                    <div className="gep-field">
                      <label>Date <span className="gep-req">*</span></label>
                      <input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} className="gep-input" disabled={submitLoading} />
                      {holidayDate && <span className="gep-date-preview">{formatDate(holidayDate)}</span>}
                    </div>
                  </div>
                  <div className="gep-form-btns">
                    <button className="gep-btn gep-btn-outline" onClick={goBack} disabled={submitLoading}>Cancel</button>
                    <button className={`gep-btn ${formMode === "add" ? "gep-btn-success" : "gep-btn-primary"}`} onClick={handleSubmit} disabled={submitLoading || !holidayName.trim() || !holidayDate}>
                      {submitLoading ? <><span className="gep-spin-sm" /> {formMode === "add" ? "Adding..." : "Saving..."}</> : (formMode === "add" ? "Add Holiday" : "Save Changes")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Editgovholiday;