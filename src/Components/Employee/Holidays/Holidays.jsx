import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Sidebar from "../../HeaderSidebar/Sidebar";
import { portalInstance } from "../../../Services/instance";
import { Icon } from "@iconify/react";
import CustomDropdown from "../../Common/CustomDropdown";
import "../Holidays/Holidays.css";
import "../../../Globel/Layout.css";
import "../../Admin/AttendanceReport/AttendanceOverview.css";

function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [error, setError] = useState(null);
  const [approvedYears, setApprovedYears] = useState([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [transitionKey, setTransitionKey] = useState(0);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const today = new Date();

  const scrollContainerRef = useRef(null);
  const calendarMonthRefs = useRef({});
  const listMonthRefs = useRef({});

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // ═══════════════════════════════════════════════════════════════
  // ✅ SMOOTH SCROLL UTILITY
  // ═══════════════════════════════════════════════════════════════
  const smoothScrollTo = useCallback((elementRef, options = {}) => {
    const {
      containerRef = scrollContainerRef,
      center = true,
      offset = 0,
      delay = 100,
    } = options;

    const timer = setTimeout(() => {
      const container = containerRef.current;
      const element = elementRef?.current;

      if (!container || !element) return;

      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      let targetScroll = container.scrollTop +
        (elementRect.top - containerRect.top);

      if (center) {
        targetScroll = container.scrollTop +
          (elementRect.top - containerRect.top) -
          (containerRect.height / 2) +
          (elementRect.height / 2);
      }

      targetScroll -= offset;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: "smooth",
      });
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // ✅ AUTO-SCROLL ON VIEW/YEAR CHANGE
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (loading || error || !holidays.length) return;

    const scrollToCurrentMonth = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      requestAnimationFrame(() => {
        if (viewMode === "month") {
          container.scrollTop = 0;
        } else if (viewMode === "calendar" && selectedYear === currentYear) {
          const element = calendarMonthRefs.current[currentMonth];
          if (element) smoothScrollTo({ current: element }, { center: true, delay: 150 });
        } else if (viewMode === "list" && selectedYear === currentYear) {
          // Find target month or next upcoming month
          let targetIdx = currentMonth;
          while (targetIdx < 12 && !listMonthRefs.current[months[targetIdx]]) {
            targetIdx++;
          }

          if (listMonthRefs.current[months[targetIdx]]) {
            setTimeout(() => {
              listMonthRefs.current[months[targetIdx]].scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          }
        } else if (viewMode === "list") {
          container.scrollTop = 0;
        }
      });
    };

    scrollToCurrentMonth();
  }, [viewMode, selectedYear, loading, error, holidays, smoothScrollTo, currentYear, currentMonth, months]);

  // ═══════════════════════════════════════════════════════════════
  // ✅ DATE UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  const getSecondAndFourthSaturdays = useCallback((year, month) => {
    const saturdays = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() === 6) {
        saturdays.push(d);
      }
    }

    return [
      saturdays[1] || null,
      saturdays[3] || null,
    ].filter(Boolean);
  }, []);

  const getSundaysInMonth = useCallback((year, month) => {
    const sundays = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month, d).getDay() === 0) {
        sundays.push(d);
      }
    }

    return sundays;
  }, []);

  const toDateString = useCallback((year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }, []);

  const getMonthName = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", { month: "long" });
  };

  const getDay = (dateString) => new Date(dateString).getDate();

  const getDayName = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", { weekday: "long" });
  };

  const isHoliday = useCallback((dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return holidays.find((h) => h.date === `${y}-${m}-${d}`);
  }, [holidays]);

  const isSecondOrFourthSaturday = useCallback(
    (year, month, day) => getSecondAndFourthSaturdays(year, month).includes(day),
    [getSecondAndFourthSaturdays]
  );

  const isPast = (dateString) => new Date(dateString) < new Date().setHours(0, 0, 0, 0);
  const isUpcoming = (dateString) => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return new Date(dateString) >= t;
  };

  const isToday = (year, month, day) => {
    return (
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate()
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // ✅ CURRENT MONTH HOLIDAYS
  // ═══════════════════════════════════════════════════════════════
  const displayMonth = selectedYear === currentYear ? currentMonth : 0;

  const currentMonthHolidays = useMemo(() => {
    if (!selectedYear || !holidays.length) return [];

    return holidays.filter((h) => {
      const d = new Date(h.date);
      return d.getMonth() === displayMonth && d.getFullYear() === selectedYear;
    });
  }, [holidays, selectedYear, displayMonth]);

  // ═══════════════════════════════════════════════════════════════
  // ✅ STATISTICS
  // ═══════════════════════════════════════════════════════════════
  const stats = useMemo(() => {
    if (!selectedYear || !holidays.length) {
      return {
        govHolidays: 0,
        govOnSaturday: 0,
        govOnSunday: 0,
        pureSaturdays: 0,
        pureSundays: 0,
        saturdayTotal: 0,
        sundayTotal: 0,
        totalOffDays: 0,
        workingDays: 0,
      };
    }

    const govHolidayDates = new Set();
    holidays.forEach((h) => govHolidayDates.add(h.date));

    let pureSundays = 0, pureSaturdays = 0;
    let govOnSaturday = 0, govOnSunday = 0;
    let totalDaysInYear = 0;
    const allOffDays = new Set();

    govHolidayDates.forEach((date) => allOffDays.add(date));

    holidays.forEach((h) => {
      const date = new Date(h.date);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      const m = date.getMonth();
      const y = date.getFullYear();

      if (dayOfWeek === 0) govOnSunday++;
      else if (dayOfWeek === 6) {
        if (getSecondAndFourthSaturdays(y, m).includes(dayOfMonth)) {
          govOnSaturday++;
        }
      }
    });

    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(selectedYear, month + 1, 0).getDate();
      totalDaysInYear += daysInMonth;

      getSecondAndFourthSaturdays(selectedYear, month).forEach((day) => {
        const dateStr = toDateString(selectedYear, month, day);
        if (!govHolidayDates.has(dateStr)) pureSaturdays++;
        allOffDays.add(dateStr);
      });

      getSundaysInMonth(selectedYear, month).forEach((day) => {
        const dateStr = toDateString(selectedYear, month, day);
        if (!govHolidayDates.has(dateStr)) pureSundays++;
        allOffDays.add(dateStr);
      });
    }

    return {
      govHolidays: holidays.length,
      govOnSaturday,
      govOnSunday,
      pureSaturdays,
      pureSundays,
      saturdayTotal: pureSaturdays + govOnSaturday,
      sundayTotal: pureSundays + govOnSunday,
      totalOffDays: allOffDays.size,
      workingDays: totalDaysInYear - allOffDays.size,
    };
  }, [holidays, selectedYear, getSecondAndFourthSaturdays, getSundaysInMonth, toDateString]);

  // ═══════════════════════════════════════════════════════════════
  // ✅ MONTH STATISTICS
  // ═══════════════════════════════════════════════════════════════
  const monthStats = useMemo(() => {
    if (!selectedYear) {
      return {
        totalHolidays: 0,
        weekends: 0,
        workingDays: 0,
        totalDays: 0,
        totalOff: 0,
        upcomingHolidays: 0,
      };
    }

    const daysInMonth = new Date(selectedYear, displayMonth + 1, 0).getDate();
    const govHolidayDates = new Set();
    currentMonthHolidays.forEach((h) => govHolidayDates.add(h.date));

    const allOffDays = new Set();
    govHolidayDates.forEach((d) => allOffDays.add(d));

    const sundays = getSundaysInMonth(selectedYear, displayMonth);
    const specialSats = getSecondAndFourthSaturdays(selectedYear, displayMonth);

    sundays.forEach((day) => {
      allOffDays.add(toDateString(selectedYear, displayMonth, day));
    });

    specialSats.forEach((day) => {
      allOffDays.add(toDateString(selectedYear, displayMonth, day));
    });

    const upcomingCount = currentMonthHolidays.filter((h) => {
      const hDate = new Date(h.date);
      hDate.setHours(0, 0, 0, 0);
      const todayCopy = new Date();
      todayCopy.setHours(0, 0, 0, 0);
      return hDate >= todayCopy;
    }).length;

    return {
      totalHolidays: currentMonthHolidays.length,
      weekends: sundays.length + specialSats.length,
      workingDays: daysInMonth - allOffDays.size,
      totalDays: daysInMonth,
      totalOff: allOffDays.size,
      upcomingHolidays: upcomingCount,
    };
  }, [selectedYear, displayMonth, currentMonthHolidays, getSundaysInMonth, getSecondAndFourthSaturdays, toDateString]);

  // ═══════════════════════════════════════════════════════════════
  // ✅ API CALLS
  // ═══════════════════════════════════════════════════════════════
  const fetchApprovedYears = useCallback(async () => {
    try {
      setLoadingYears(true);
      const res = await portalInstance.get(
        "/holiday-assignments/gov-holidays/years/available"
      );

      if (res.data.success) {
        const years = res.data.data || [];
        setApprovedYears(years);

        if (years.length > 0) {
          const target = years.includes(currentYear)
            ? currentYear
            : years.find((y) => y >= currentYear) || years[years.length - 1];
          setSelectedYear(target);
        }
      }
    } catch {
      setError("Failed to load available years");
    } finally {
      setLoadingYears(false);
    }
  }, [currentYear]);

  const fetchHolidays = useCallback(async () => {
    if (!selectedYear) return;
    try {
      setLoading(true);
      setError(null);
      setTransitionKey((prev) => prev + 1);

      const response = await portalInstance.get(
        `/holiday-assignments/gov-holidays/${selectedYear}`
      );

      if (response.data.success) {
        setHolidays(response.data.data);
      } else {
        setError("Failed to fetch holidays");
      }
    } catch {
      setError("Unable to load holidays.");
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchApprovedYears();
  }, [fetchApprovedYears]);

  useEffect(() => {
    if (selectedYear) fetchHolidays();
  }, [selectedYear, fetchHolidays]);

  // ═══════════════════════════════════════════════════════════════
  // ✅ VIEW MODE CHANGE HANDLER
  // ═══════════════════════════════════════════════════════════════
  const handleViewModeChange = useCallback((newMode) => {
    setViewMode(newMode);
    setTransitionKey((prev) => prev + 1);

    // Scroll to current month when switching to list view
    if (newMode === "list" && selectedYear === currentYear) {
      setTimeout(() => {
        // 1. Find the current month or the closest upcoming month that has holidays
        let targetMonthIndex = currentMonth;
        while (targetMonthIndex < 12 && !listMonthRefs.current[months[targetMonthIndex]]) {
          targetMonthIndex++;
        }

        if (listMonthRefs.current[months[targetMonthIndex]]) {
          listMonthRefs.current[months[targetMonthIndex]].scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    }
  }, [selectedYear, currentYear, currentMonth, months, smoothScrollTo]);

  // ═══════════════════════════════════════════════════════════════
  // ✅ YEAR OPTIONS
  // ═══════════════════════════════════════════════════════════════
  const yearOptions = useMemo(
    () =>
      approvedYears.map((yr) => ({
        value: yr,
        label: yr === currentYear ? `${yr} ` : String(yr),
      })),
    [approvedYears, currentYear]
  );

  // ═══════════════════════════════════════════════════════════════
  // ✅ RENDER SINGLE MONTH CALENDAR
  // ═══════════════════════════════════════════════════════════════
  const renderSingleMonth = (monthIndex, size = "normal") => {
    const firstDay = new Date(selectedYear, monthIndex, 1).getDay();
    const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
    const special2ndAnd4thSats = new Set(
      getSecondAndFourthSaturdays(selectedYear, monthIndex)
    );
    const isCurrentMon = selectedYear === currentYear && monthIndex === currentMonth;

    const days = [];

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className={`hol-cal__day hol-cal__day--empty ${size === "large" ? "hol-cal__day--lg" : ""}`}
        />
      );
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(selectedYear, monthIndex, d);
      const holidayData = isHoliday(currentDate);
      const isSunday = currentDate.getDay() === 0;
      const isSpecialSat = special2ndAnd4thSats.has(d);
      const isTodayDate = isToday(selectedYear, monthIndex, d);

      let className = `hol-cal__day ${size === "large" ? "hol-cal__day--lg" : ""}`;
      let titleText = "";

      if (isTodayDate) className += " hol-cal__day--today";

      if (holidayData && (isSunday || isSpecialSat)) {
        className += " hol-cal__day--holiday hol-cal__day--overlap";
        titleText = `${holidayData.name} (${isSunday ? "Sunday" : "2nd/4th Saturday"})`;
      } else if (holidayData) {
        className += " hol-cal__day--holiday";
        titleText = holidayData.name;
      } else if (isSunday) {
        className += " hol-cal__day--weekend";
        titleText = "Sunday";
      } else if (isSpecialSat) {
        className += " hol-cal__day--weekend";
        titleText = "2nd/4th Saturday";
      }

      days.push(
        <div key={d} className={className} title={titleText}>
          <span className="hol-cal__day-num">{d}</span>
        </div>
      );
    }

    // Fill remaining cells
    let nextDay = 1;
    while (days.length < 42) {
      days.push(
        <div
          key={`next-${nextDay}`}
          className={`hol-cal__day hol-cal__day--next ${size === "large" ? "hol-cal__day--lg" : ""}`}
        >
          <span className="hol-cal__day-num">{nextDay++}</span>
        </div>
      );
    }

    return { days, isCurrentMon };
  };

  // ═══════════════════════════════════════════════════════════════
  // ✅ RENDER CALENDAR MONTH CARD
  // ═══════════════════════════════════════════════════════════════
  const renderCalendarMonth = (monthIndex) => {
    const firstDay = new Date(selectedYear, monthIndex, 1).getDay();
    const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
    const special2ndAnd4thSats = new Set(
      getSecondAndFourthSaturdays(selectedYear, monthIndex)
    );
    const isCurrentMon = selectedYear === currentYear && monthIndex === currentMonth;

    const cells = [];

    // Empty cells for the start of the month
    for (let i = 0; i < firstDay; i++) {
      cells.push({
        type: "empty",
        day: "",
        status: "inactive",
      });
    }

    // Days in the month
    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(selectedYear, monthIndex, d);
      const holidayData = isHoliday(currentDate);
      const isSunday = currentDate.getDay() === 0;
      const isSpecialSat = special2ndAnd4thSats.has(d);
      const isTodayDate = isToday(selectedYear, monthIndex, d);

      let status = "none";
      let titleText = "";
      if (isSunday || isSpecialSat) {
        status = "weekend";
        titleText = isSunday ? "Sunday" : "2nd/4th Saturday";
      }
      if (holidayData) {
        status = "holiday";
        titleText = holidayData.name;
      }

      cells.push({
        type: "current",
        day: d,
        status: status,
        isToday: isTodayDate,
        title: titleText,
      });
    }

    // Fill remaining cells for standard 6-week display
    let nextMonthDay = 1;
    while (cells.length < 42) {
      cells.push({
        type: "next",
        day: nextMonthDay++,
        status: "inactive",
      });
    }

    return (
      <div
        key={monthIndex}
        className={`attendanceoverview-month-card ${isCurrentMon ? "sidebar-mini-calendar--current" : ""}`}
        ref={(el) => {
          if (el) calendarMonthRefs.current[monthIndex] = el;
        }}
      >
        {/* ── Month/Year Header ── */}
        <div className="attendanceoverview-month-header">
          <h3>
            {months[monthIndex]} <strong>{selectedYear}</strong>
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
          {cells.map((cell, i) => {
            if (cell.type === "empty" || cell.type === "next") {
              return (
                <div key={i} className="attendanceoverview-day inactive">
                  {cell.day || ""}
                </div>
              );
            }

            let cls = "attendanceoverview-day";
            if (cell.status === "inactive") cls += " inactive";
            if (cell.status === "weekend") cls += " weekend";

            return (
              <div key={i} className={cls} title={cell.title || undefined}>
                <span
                  className={`day-number ${cell.isToday ? "today-highlight" : ""} ${cell.status === "holiday" ? "holiday-highlight" : ""}`}
                >
                  {cell.day}
                </span>
                {/* Status dot for holiday */}
                {cell.status === "holiday" && (
                  <span className="status-dot holiday"></span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // ✅ GROUP HOLIDAYS BY MONTH
  // ═══════════════════════════════════════════════════════════════
  const groupedHolidays = useMemo(() => {
    const grouped = {};
    holidays.forEach((holiday) => {
      const month = getMonthName(holiday.date);
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(holiday);
    });
    return grouped;
  }, [holidays]);

  // ═══════════════════════════════════════════════════════════════
  // ✅ LOADING STATES
  // ═══════════════════════════════════════════════════════════════
  if (loadingYears) {
    return (
      <>
        <Sidebar />
        <div className="common-page-container">
          <div className="hol-page__inner">
            <div className="hol-sticky-header">
              <div className="hol-topbar">
                <h3 className="hol-topbar__title">Holiday Calendar</h3>
              </div>
            </div>
            <div className="hol-scroll-content">
              <div className="hol-state hol-state--loading">
                <Icon icon="mdi:loading" className="hol-spinner" width={22} />
                Loading approved years...
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!loadingYears && approvedYears.length === 0) {
    return (
      <>
        <Sidebar />
        <div className="hol-page">
          <div className="hol-page__inner">
            <div className="hol-sticky-header">
              <div className="hol-topbar">
                <h1 className="hol-topbar__title">Holiday Calendar</h1>
              </div>
            </div>
            <div className="hol-scroll-content">
              <div className="hol-state hol-state--empty">
                <div className="hol-state__card">
                  <Icon icon="mdi:calendar-remove-outline" width={64} className="hol-state__icon" />
                  <h2 className="hol-state__heading">No Holiday Calendar Found</h2>
                  <p className="hol-state__desc">
                    No holidays have been added yet. Please contact your administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // ✅ MAIN RENDER
  // ═══════════════════════════════════════════════════════════════
  const { days: currentMonthDays } = !loading && !error && selectedYear
    ? renderSingleMonth(displayMonth, "large")
    : { days: [] };

  return (
    <>
      <Sidebar />
      <div className="common-page-container">
        <div className="hol-page__inner">
          {/* STICKY HEADER */}
          <div className="hol-sticky-header">
            <div className="hol-topbar">
              <div className="hol-topbar__left">
                <h1 className="hol-topbar__title">Holiday Calendar – {selectedYear}</h1>
              </div>

              <div className="hol-topbar__actions">
                {/* VIEW TOGGLE */}
                <div className="hol-view-toggle">
                  <button
                    className={`hol-view-toggle__btn ${viewMode === "month" ? "hol-view-toggle__btn--active" : ""}`}
                    onClick={() => handleViewModeChange("month")}
                    title="Current Month View"
                  >
                    <Icon icon="mdi:calendar-today" width={15} />
                    <span className="hol-view-toggle__text">
                      {months[displayMonth].substring(0, 3)}
                    </span>
                  </button>
                  <button
                    className={`hol-view-toggle__btn ${viewMode === "calendar" ? "hol-view-toggle__btn--active" : ""}`}
                    onClick={() => handleViewModeChange("calendar")}
                    title="Full Year Calendar"
                  >
                    <Icon icon="mdi:calendar-month" width={15} />
                    <span className="hol-view-toggle__text">Calendar</span>
                  </button>
                  <button
                    className={`hol-view-toggle__btn ${viewMode === "list" ? "hol-view-toggle__btn--active" : ""}`}
                    onClick={() => handleViewModeChange("list")}
                    title="List View"
                  >
                    <Icon icon="mdi:format-list-bulleted" width={15} />
                    <span className="hol-view-toggle__text">List</span>
                  </button>
                </div>

                {/* YEAR PICKER */}
                <div className="hol-year-picker">
                  <CustomDropdown
                    options={yearOptions}
                    value={selectedYear}
                    onChange={(yr) => setSelectedYear(yr)}
                    placeholder="Select Year"
                    className="hol-year-dropdown"
                    style={{ height: "35px" }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* SCROLLABLE CONTENT */}
          <div className="hol-scroll-content" style={{ padding: "0" }} ref={scrollContainerRef}>

            {/* STATS */}
            {!loading && !error && selectedYear && viewMode === "calendar" && (
              <div className="hol-stats" style={{ marginBottom: "15px", marginTop: "10px" }}>
                <div className="hol-stats__card hol-stats__card--gov">
                  <div className="hol-stats__num">{stats.govHolidays}</div>
                  <div className="hol-stats__label">Gov Holidays</div>
                </div>
                <div className="hol-stats__card hol-stats__card--sat">
                  <div className="hol-stats__num">{stats.saturdayTotal}</div>
                  <div className="hol-stats__label">2nd & 4th Sat</div>
                </div>
                <div className="hol-stats__card hol-stats__card--sun">
                  <div className="hol-stats__num">{stats.sundayTotal}</div>
                  <div className="hol-stats__label">Sundays</div>
                </div>
                <div className="hol-stats__card hol-stats__card--off">
                  <div className="hol-stats__num">{stats.totalOffDays}</div>
                  <div className="hol-stats__label">Total Holidays</div>
                </div>
                <div className="hol-stats__card hol-stats__card--work">
                  <div className="hol-stats__num">{stats.workingDays}</div>
                  <div className="hol-stats__label">Working Days</div>
                </div>
              </div>
            )}

            {/* MONTH STATS */}
            {!loading && !error && selectedYear && viewMode === "month" && (
              <div className="hol-stats" style={{ marginBottom: "15px", marginTop: "10px" }}>
                <div className="hol-stats__card hol-stats__card--gov">
                  <div className="hol-stats__num">{monthStats.totalHolidays}</div>
                  <div className="hol-stats__label">Holidays</div>
                </div>
                <div className="hol-stats__card hol-stats__card--sat">
                  <div className="hol-stats__num">{monthStats.weekends}</div>
                  <div className="hol-stats__label">Weekends</div>
                </div>
                <div className="hol-stats__card hol-stats__card--off">
                  <div className="hol-stats__num">{monthStats.totalOff}</div>
                  <div className="hol-stats__label">Total Off Days</div>
                </div>
                <div className="hol-stats__card hol-stats__card--work">
                  <div className="hol-stats__num">{monthStats.workingDays}</div>
                  <div className="hol-stats__label">Working Days</div>
                </div>
              </div>
            )}

            {/* LOADING / ERROR */}
            {loading && (
              <div className="hol-state hol-state--loading">
                <Icon icon="mdi:loading" className="hol-spinner" width={22} />
                Loading holidays...
              </div>
            )}
            {error && (
              <div className="hol-state hol-state--error">
                <Icon icon="mdi:alert-circle-outline" width={20} />
                <span>{error}</span>
                <button className="hol-retry-btn" onClick={fetchHolidays}>
                  Retry
                </button>
              </div>
            )}

            {/* VIEW 1: CURRENT MONTH */}
            {!loading && !error && selectedYear && viewMode === "month" && (
              <div key={`month-${transitionKey}`} className="hol-month-view mb-4" style={{ margin: "0" }} >
                {/* Calendar */}
                <div className="hol-month-view__calendar">
                  <div className="hol-month-view__head">
                    <h3 className="hol-month-view__title">
                      <span className="hol-month-view__month">
                        {months[displayMonth]}
                      </span>
                      <span className="hol-month-view__month">
                        {selectedYear}
                      </span>
                    </h3>

                  </div>

                  <div className="hol-month-view__weekdays">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d, i) => (
                      <span key={d} className="hol-month-view__weekday">
                        {d}
                      </span>
                    ))}
                  </div>

                  <div className="hol-month-view__days-grid">{currentMonthDays}</div>
                </div>

                {/* Holiday List */}
                <div className="hol-month-view__sidebar">
                  <div className="hol-month-view__sidebar-head">
                    <h3 className="hol-month-view__month">
                      {months[displayMonth]} Holidays
                    </h3>
                    <span className="hol-month-view__sidebar-count">{currentMonthHolidays.length}</span>
                  </div>

                  {currentMonthHolidays.length === 0 ? (
                    <div className="hol-month-view__no-holidays">
                      <Icon icon="mdi:calendar-check-outline" width={40} className="hol-month-view__no-icon" />
                      <p>No holidays this month</p>
                      <span>All working days!</span>
                    </div>
                  ) : (
                    <div className="hol-month-view__holiday-list">
                      {currentMonthHolidays.map((holiday, idx) => {
                        const hDate = new Date(holiday.date);
                        const past = isPast(holiday.date);
                        const upcoming = isUpcoming(holiday.date);
                        const isSun = hDate.getDay() === 0;
                        const isSpecSat = isSecondOrFourthSaturday(
                          hDate.getFullYear(),
                          hDate.getMonth(),
                          hDate.getDate()
                        );

                        return (
                          <div
                            key={idx}
                            className={[
                              "hol-month-view__holiday-item",
                              upcoming && !past ? "hol-month-view__holiday-item--upcoming" : "",
                              past ? "hol-month-view__holiday-item--past" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <div className="hol-month-view__holiday-date">
                              <span className="hol-month-view__holiday-day">{getDay(holiday.date)}</span>
                              <span className="hol-month-view__holiday-dayname">
                                {getDayName(holiday.date).substring(0, 3)}
                              </span>
                            </div>
                            <div className="hol-month-view__holiday-info">
                              <h4 className="hol-month-view__holiday-name">{holiday.name}</h4>
                              <span className="hol-month-view__holiday-weekday">
                                {getDayName(holiday.date)}
                              </span>

                            </div>
                            {upcoming && !past && (
                              <div className="hol-month-view__holiday-badge">Upcoming</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: FULL YEAR CALENDAR */}
            {!loading && !error && selectedYear && viewMode === "calendar" && (
              <div key={`calendar-${transitionKey}`} className="attendanceoverview-calendar-grid mb-4">
                {months.map((_, index) => renderCalendarMonth(index))}
              </div>
            )}

            {/* VIEW 3: LIST VIEW */}
            {!loading && !error && selectedYear && viewMode === "list" && (
              <div key={`list-${transitionKey}`} className="hol-list mb-4">
                {holidays.length === 0 && (
                  <div className="hol-state hol-state--empty-list">
                    <Icon icon="mdi:calendar-blank-outline" width={64} className="hol-state__icon" />
                    <h3 className="hol-state__heading">No Holidays Found</h3>
                    <p className="hol-state__desc">No holidays found for {selectedYear}.</p>
                  </div>
                )}

                {months.map((month) => {
                  if (!groupedHolidays[month]) return null;
                  const monthIndex = months.indexOf(month);
                  const isCurrentMon = selectedYear === currentYear && monthIndex === currentMonth;

                  return (
                    <div
                      key={month}
                      className={`hol-list__month-section ${isCurrentMon ? "hol-list__month-section--current" : ""}`}
                      ref={(el) => {
                        if (el) listMonthRefs.current[month] = el;
                      }}
                    >
                      <div className="hol-list__month-head">
                        <h2 className="hol-list__month-name">
                          {month}
                          {isCurrentMon && <span className="hol-list__current-tag">Current Month</span>}
                        </h2>
                        <span className="hol-list__month-count">
                          {groupedHolidays[month].length}{" "}
                          {groupedHolidays[month].length === 1 ? "holiday" : "holidays"}
                        </span>
                      </div>

                      <div className="hol-list__cards-grid">
                        {groupedHolidays[month].map((holiday, index) => {
                          const hDate = new Date(holiday.date);
                          const isSun = hDate.getDay() === 0;
                          const isSpecSat = isSecondOrFourthSaturday(
                            hDate.getFullYear(),
                            hDate.getMonth(),
                            hDate.getDate()
                          );
                          const hasOverlap = isSun || isSpecSat;
                          const past = isPast(holiday.date);
                          const upcoming = isUpcoming(holiday.date);

                          return (
                            <div
                              key={index}
                              className={[
                                "hol-list__card",
                                upcoming && !past ? "hol-list__card--upcoming" : "",
                                past ? "hol-list__card--past" : "",
                                hasOverlap ? "hol-list__card--overlap" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <div className="hol-list__card-date">
                                <span className="hol-list__card-day">{getDay(holiday.date)}</span>
                                <span className="hol-list__card-mon">{getMonthName(holiday.date).substring(0, 3)}</span>
                              </div>
                              <div className="hol-list__card-info">
                                <h3 className="hol-list__card-title">{holiday.name}</h3>
                                <div className="hol-list__card-weekday">
                                  <Icon icon="mdi:calendar-today" width={14} />
                                  {getDayName(holiday.date)}
                                </div>
                                {hasOverlap && (
                                  <div className="hol-list__card-overlap">
                                    <Icon icon="mdi:alert-circle-outline" width={12} />
                                    {isSun ? "Sunday" : "2nd/4th Saturday"}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Holidays;