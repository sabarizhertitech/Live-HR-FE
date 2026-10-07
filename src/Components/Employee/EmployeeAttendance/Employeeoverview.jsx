import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../Admin/AttendanceReport/AttendanceOverview.css";
import "../../Common/CustomDropdown.css";
import Sidebar from "../../HeaderSidebar/Sidebar";
import { Icon } from "@iconify/react";
import { portalInstance } from "../../../Services/instance";
import CustomDropdown from "../../Common/CustomDropdown";

/* =============================
   STATIC FALLBACK DATA
============================= */
const fallbackEmployee = {
    name: "Employee",
    designation: "Employee",
    avatar: "/avatar.png",
};

const fallbackStats = {
    workingDays: 0,
    daysPresent: 0,
    leavesTaken: 0,
    absentDays: 0,
    totalLeave: 0,
    permissions: 0,
    attendancePercentage: "0%",
    policyTotal: 0,
    policyUsed: 0,
    policyRemaining: 0,
};

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = [
    "April", "May", "June", "July",
    "August", "September", "October", "November",
    "December", "January", "February", "March"
];

const CALENDAR_MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

/* =============================
   MINI CALENDAR
============================= */
function MiniCalendar({ month, calendarData = [], year }) {
    const realMonthIndexMap = {
        January: 0,
        February: 1,
        March: 2,
        April: 3,
        May: 4,
        June: 5,
        July: 6,
        August: 7,
        September: 8,
        October: 9,
        November: 10,
        December: 11,
    };

    const monthIndex = realMonthIndexMap[month];
    const actualYear = year;

    const daysInMonth = new Date(actualYear, monthIndex + 1, 0).getDate();
    const firstDayWeekday = new Date(actualYear, monthIndex, 1).getDay();
    const calendarMap = new Map(calendarData.map(d => [d.day, d]));
    const cells = [];

    // ─── PREVIOUS MONTH PADDING ───
    for (let i = 0; i < firstDayWeekday; i++) {
        cells.push({ type: "empty" });
    }

    // ─── CURRENT MONTH DAYS ───
    for (let day = 1; day <= daysInMonth; day++) {
        const record = calendarMap.get(day);

        const dateObj = new Date(actualYear, monthIndex, day);
        const weekday = dateObj.getDay();

        const isSunday = weekday === 0;
        const isSecondSaturday = weekday === 6 && Math.ceil(day / 7) === 2;
        const isFourthSaturday = weekday === 6 && Math.ceil(day / 7) === 4;

        let status = record?.status || null;

        if (!status) {
            if (isSunday || isSecondSaturday || isFourthSaturday) {
                status = "weekend";
            }
        }

        cells.push({
            type: "day",
            day,
            status,
            isToday: record?.isToday || false,
        });
    }

    // ─── NEXT MONTH PADDING — FORCE 42 CELLS ───
    let nextMonthDay = 1;
    while (cells.length < 42) {
        cells.push({
            type: "next",
            day: nextMonthDay++,
            status: "inactive",
        });
    }

    return (
        <div className="attendanceoverview-month-card">
            <div className="attendanceoverview-month-header">
                <h3>{month} <strong>{actualYear}</strong></h3>
                <div className="header-underline"></div>
            </div>

            <div className="attendanceoverview-weekdays">
                {WEEKDAYS.map(d => (
                    <span key={d}>{d}</span>
                ))}
            </div>

            <div className="attendanceoverview-days">
                {cells.map((cell, i) => {
                    if (cell.type === "empty" || cell.type === "next") {
                        return (
                            <div
                                key={i}
                                className="attendanceoverview-day inactive"
                            >
                                {cell.day || ""}
                            </div>
                        );
                    }

                    const normalizedStatus = cell.status?.toLowerCase();
                    let cls = "attendanceoverview-day";
                    if (normalizedStatus === "present" || normalizedStatus === "wfh") cls += " present";
                    if (normalizedStatus === "absent") cls += " absent";
                    if (normalizedStatus === "holiday") cls += " holiday";
                    if (normalizedStatus === "weekend") cls += " weekend";
                    if (normalizedStatus === "leave") cls += " leave";
                    if (["half-day-leave", "half-day", "half_day"].includes(normalizedStatus)) cls += " half-day";
                    if (cell.isToday) cls += " today";

                    return (
                        <div key={i} className={cls}>
                            <span className={`day-number ${cell.isToday ? "today-highlight" : ""} ${normalizedStatus === "holiday" ? "holiday-highlight" : ""}`}>
                                {cell.day}
                            </span>
                            {/* Dots for status */}
                            {["present", "wfh", "absent", "leave", "holiday"].includes(normalizedStatus) && (
                                <span className={`status-dot ${normalizedStatus === "wfh" ? "present" : normalizedStatus}`}></span>
                            )}
                            {["half-day-leave", "half-day", "half_day"].includes(normalizedStatus) && (
                                <span className="status-dot half-day-leave"></span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* =============================
   MAIN COMPONENT
============================= */
function EmployeeOverview() {
    const getCurrentFinancialYear = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        return m >= 3 ? y : y - 1;
    };

    const formatFinancialYear = (y) => {
        if (typeof y !== "number") return y;
        return `${y}`;
    };

    const generateFinancialYears = () => {
        const startYear = 2024;
        const currentFY = getCurrentFinancialYear();
        const years = [];
        for (let y = startYear; y <= currentFY; y++) {
            years.push(y);
        }
        return years;
    };

    const [year, setYear] = useState(getCurrentFinancialYear());
    const [employee, setEmployee] = useState(fallbackEmployee);
    const [stats, setStats] = useState(fallbackStats);
    const [monthlyData, setMonthlyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const [fromMonth, setFromMonth] = useState("April");
    const [toMonth, setToMonth] = useState("March");
    const [fromYear, setFromYear] = useState(getCurrentFinancialYear());
    const [toYear, setToYear] = useState(getCurrentFinancialYear() + 1);

    const [fromMonthDropdownOpen, setFromMonthDropdownOpen] = useState(false);
    const [toMonthDropdownOpen, setToMonthDropdownOpen] = useState(false);
    const [fromYearDropdownOpen, setFromYearDropdownOpen] = useState(false);
    const [toYearDropdownOpen, setToYearDropdownOpen] = useState(false);

    // ✅ VALIDATION: Disable "To" months before "From" month strictly based on CALENDAR_MONTHS array
    const getDisabledToMonths = () => {
        if (toYear > fromYear) return [];
        if (toYear < fromYear) return CALENDAR_MONTHS;
        const fromIdx = CALENDAR_MONTHS.indexOf(fromMonth);
        return CALENDAR_MONTHS.filter((_, idx) => idx < fromIdx);
    };

    // ✅ Effect to reset invalid toMonth
    useEffect(() => {
        if (toYear < fromYear) {
            setToMonth(fromMonth);
        } else if (toYear === fromYear) {
            const fromIdx = CALENDAR_MONTHS.indexOf(fromMonth);
            const toIdx = CALENDAR_MONTHS.indexOf(toMonth);
            if (toIdx < fromIdx) {
                setToMonth(fromMonth);
            }
        }
    }, [fromMonth, toMonth, fromYear, toYear]);

    // ✅ Close all dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest(".custom-dropdown-container")) {
                setFromMonthDropdownOpen(false);
                setToMonthDropdownOpen(false);
                setFromYearDropdownOpen(false);
                setToYearDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const ReusableDropdown = ({
        value,
        options,
        isOpen,
        setIsOpen,
        onChange,
        showCustomOption = false,
        onCustomClick = () => { },
        disabledOptions = [],
    }) => {
        return (
            <div className="custom-dropdown-container">
                <div
                    className={`custom-dropdown-trigger ${isOpen ? "open" : ""}`}
                    onClick={() => {
                        // Close others before toggling this one
                        if (!isOpen) {
                            setFromMonthDropdownOpen(false);
                            setToMonthDropdownOpen(false);
                            setFromYearDropdownOpen(false);
                            setToYearDropdownOpen(false);
                        }
                        setIsOpen(!isOpen);
                    }}
                >
                    <span>
                        {value
                            ? (typeof value === "number" ? formatFinancialYear(value) : value)
                            : "Select"}
                    </span>
                    <Icon
                        icon="iconamoon:arrow-down-2-fill"
                        className={`dropdown-arrow-icon ${isOpen ? "rotate" : ""}`}
                    />
                </div>

                {isOpen && (
                    <div className="custom-dropdown-menu">
                        {options.map((opt) => {
                            const label = typeof opt === "object" ? opt.label : opt;
                            const val = typeof opt === "object" ? opt.value : opt;
                            const isDisabled = disabledOptions.includes(val);
                            return (
                                <div
                                    key={val}
                                    className={`custom-dropdown-option ${value === val ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isDisabled) return;
                                        onChange(val);
                                        setIsOpen(false);
                                    }}
                                >
                                    {label}
                                </div>
                            );
                        })}

                        {showCustomOption && (
                            <div
                                className="custom-dropdown-option custom-btn-option"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCustomClick();
                                    setIsOpen(false);
                                }}
                            >
                                Custom
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            try {
                const monthIndexMap = {
                    January: 0,
                    February: 1,
                    March: 2,
                    April: 3,
                    May: 4,
                    June: 5,
                    July: 6,
                    August: 7,
                    September: 8,
                    October: 9,
                    November: 10,
                    December: 11,
                };

                if (!fromMonth || !toMonth) {
                    setLoading(false);
                    return;
                }

                const res = await portalInstance.get("/portal/employee/attendance-overview", {
                    params: {
                        year: fromYear,
                        fromMonth: monthIndexMap[fromMonth],
                        toMonth: monthIndexMap[toMonth],
                    }
                });

                const data = res.data?.data || {};

                if (data.employee) setEmployee(data.employee);
                if (data.summary) {
                    setStats({
                        workingDays: data.summary.workingDays || 0,
                        daysPresent: data.summary.daysPresent || 0,
                        leavesTaken: data.summary.leavesTaken ?? data.summary.leaves ?? 0,
                        absentDays: data.summary.absentDays || 0,
                        totalLeave: data.summary.totalLeave || 0,
                        permissions: data.summary.permissions || 0,
                        attendancePercentage: data.summary.attendancePercentage || "0%",

                        policyTotal: data.summary.policyTotal || 0,
                        policyUsed: data.summary.policyUsed || 0,
                        policyRemaining: data.summary.policyRemaining || 0,
                    });
                }
                if (data.calendar && typeof data.calendar === "object") {
                    // Build month indices from fromMonth → toMonth (handles wrap-around)
                    const fm = monthIndexMap[fromMonth];
                    const tm = monthIndexMap[toMonth];

                    const orderedMonthIndices = [];
                    let cur = fm;
                    while (true) {
                        orderedMonthIndices.push(cur);
                        if (cur === tm) break;
                        cur = (cur + 1) % 12;
                        if (orderedMonthIndices.length > 12) break;
                    }

                    const orderedMonths = orderedMonthIndices.map(
                        (monthIndex) => data.calendar[monthIndex] || []
                    );

                    setMonthlyData(orderedMonths);
                }

            } catch (err) {
                console.error("Failed to load attendance:", err);
                // keep fallback data
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [fromYear, fromMonth, toMonth]);

    return (
        <>
            <Sidebar />

            <div className="attendanceoverview">

                {/* ===== SUMMARY CARD ===== */}
                <div className="attendanceoverview-summary">

                    <div className="attendanceoverview-header">
                        <div className="attendanceoverview-profile">
                            <div className="attendanceoverview-avatar">
                                <img
                                    src={employee.avatar || "/avatar.png"}
                                    alt={employee.name}
                                    onError={(e) => {
                                        e.target.src = "/avatar.png";
                                    }}
                                />
                            </div>

                            <div className="attendanceoverview-info">
                                <h2>{employee.name}</h2>
                                <p>{employee.designation}</p>
                            </div>
                        </div>

                        {/* ✅ NEW 4-SELECTOR FILTER UI */}
                        <div className="attendanceoverview-filters">

                            {/* FROM SECTION */}
                            <div className="range-group">
                                <span className="range-label">From</span>
                                <ReusableDropdown
                                    value={fromMonth}
                                    options={CALENDAR_MONTHS}
                                    isOpen={fromMonthDropdownOpen}
                                    setIsOpen={setFromMonthDropdownOpen}
                                    onChange={setFromMonth}
                                />
                                <ReusableDropdown
                                    value={fromYear}
                                    options={generateFinancialYears()}
                                    isOpen={fromYearDropdownOpen}
                                    setIsOpen={setFromYearDropdownOpen}
                                    onChange={(v) => {
                                        setFromYear(Number(v));
                                        setToYear(Number(v) + 1);
                                    }}
                                />
                            </div>

                            {/* TO SECTION */}
                            <div className="range-group">
                                <span className="range-label">To</span>
                                <ReusableDropdown
                                    value={toMonth}
                                    options={CALENDAR_MONTHS}
                                    isOpen={toMonthDropdownOpen}
                                    setIsOpen={setToMonthDropdownOpen}
                                    onChange={setToMonth}
                                    disabledOptions={getDisabledToMonths()}
                                />
                                <ReusableDropdown
                                    value={toYear}
                                    options={generateFinancialYears()}
                                    isOpen={toYearDropdownOpen}
                                    setIsOpen={setToYearDropdownOpen}
                                    onChange={(v) => setToYear(Number(v))}
                                />
                            </div>

                        </div>
                    </div>

                    {loading ? (
                        <div className="attendanceoverview-stats">
                            <p>Loading attendance data...</p>
                        </div>
                    ) : isMobile ? (
                        <div className="attendanceoverview-stats">
                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Working Days</p>
                                <p className="stat-value">{stats.workingDays ?? "-"}</p>
                            </div>

                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Days Present</p>
                                <p className="stat-value">{stats.daysPresent ?? "-"}</p>
                            </div>

                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Leave</p>
                                <p className="stat-value">{stats.leavesTaken ?? "-"}</p>
                            </div>

                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Absent</p>
                                <p className="stat-value">{stats.absentDays ?? 0}</p>
                            </div>

                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Total Leave</p>
                                <p className="stat-value">{stats.totalLeave ?? 0}</p>
                            </div>

                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Permissions</p>
                                <p className="stat-value">{stats.permissions ?? "-"}</p>
                            </div>

                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Attendance %</p>
                                <p className="stat-value">{stats.attendancePercentage ?? "-"}</p>
                            </div>

                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Available Leave</p>
                                <p className="stat-value">{stats.policyTotal ?? 0}</p>
                            </div>

                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Leave Taken</p>
                                <p className="stat-value">{stats.policyUsed ?? 0}</p>
                            </div>

                            <div className="attendanceoverview-stat-item">
                                <p className="stat-label">Remaining Leaves</p>
                                <p className="stat-value">{stats.policyRemaining ?? 0}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* ===== FIRST ROW ===== */}
                            <div className="attendanceoverview-stats">
                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Working Days</p>
                                    <p className="stat-value">{stats.workingDays ?? "-"}</p>
                                </div>

                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Days Present</p>
                                    <p className="stat-value">{stats.daysPresent ?? "-"}</p>
                                </div>

                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Leave</p>
                                    <p className="stat-value">{stats.leavesTaken ?? "-"}</p>
                                </div>

                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Absent</p>
                                    <p className="stat-value">{stats.absentDays ?? 0}</p>
                                </div>

                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Total Leave</p>
                                    <p className="stat-value">{stats.totalLeave ?? 0}</p>
                                </div>

                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Permissions</p>
                                    <p className="stat-value">{stats.permissions ?? "-"}</p>
                                </div>

                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Attendance %</p>
                                    <p className="stat-value">{stats.attendancePercentage ?? "-"}</p>
                                </div>
                            </div>

                            {/* ===== SECOND ROW : LEAVE POLICY ===== */}
                            <div
                                className="attendanceoverview-stats policy-row"
                                style={{
                                    marginTop: "24px",
                                    borderTop: "1px solid rgba(255,255,255,0.1)",
                                    paddingTop: "20px",
                                }}
                            >
                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Available Leave</p>
                                    <p className="stat-value">{stats.policyTotal ?? 0}</p>
                                </div>

                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Leave Taken</p>
                                    <p className="stat-value">{stats.policyUsed ?? 0}</p>
                                </div>

                                <div className="attendanceoverview-stat-item">
                                    <p className="stat-label">Remaining Leaves</p>
                                    <p className="stat-value">{stats.policyRemaining ?? 0}</p>
                                </div>

                                {/* Empty columns for alignment */}
                                <div className="attendanceoverview-stat-item"></div>
                                <div className="attendanceoverview-stat-item"></div>
                                <div className="attendanceoverview-stat-item"></div>
                                <div className="attendanceoverview-stat-item"></div>
                            </div>
                        </>
                    )}

                </div>

                {/* ===== CALENDAR CARD WRAPPER ===== */}
                <div className="attendanceoverview-calendar-card">
                    {/* ── Attendance Legend ── */}
                    <div className="emp-attendance-overview-legend">
                        <div className="emp-attendance-legend-item">
                            <span className="emp-attendance-legend-pill emp-attendance-present"></span>
                            <span className="emp-attendance-legend-label">Present</span>
                        </div>
                        <div className="emp-attendance-legend-item">
                            <span className="emp-attendance-legend-pill emp-attendance-absent"></span>
                            <div className="emp-attendance-legend-text-group">
                                <span className="emp-attendance-legend-label">Absent</span>
                                <small className="emp-attendance-legend-subtext">( No Intimation)</small>
                            </div>
                        </div>
                        <div className="emp-attendance-legend-item">
                            <span className="emp-attendance-legend-pill emp-attendance-approved"></span>
                            <div className="emp-attendance-legend-text-group">
                                <span className="emp-attendance-legend-label">Leave</span>
                                <small className="emp-attendance-legend-subtext">( Leave Approved )</small>
                            </div>
                        </div>
                        <div className="emp-attendance-legend-item">
                            <span className="emp-attendance-legend-pill emp-attendance-half-day"></span>
                            <div className="emp-attendance-legend-text-group">
                                <span className="emp-attendance-legend-label">Half Day</span>
                                <small className="emp-attendance-legend-subtext">( Half Day Leave )</small>
                            </div>
                        </div>
                        <div className="emp-attendance-legend-item">
                            <span className="emp-attendance-legend-pill emp-attendance-holiday"></span>
                            <span className="emp-attendance-legend-label">Holidays</span>
                        </div>
                    </div>

                    {/* ===== CALENDAR GRID ===== */}
                    <div className="attendanceoverview-calendar-grid">
                        {(() => {
                            if (!fromMonth || !toMonth) {
                                return (
                                    <div className="no-range-selected">
                                        <p>Please select a month range to view attendance data.</p>
                                    </div>
                                );
                            }

                            const monthNames = [
                                "January",
                                "February",
                                "March",
                                "April",
                                "May",
                                "June",
                                "July",
                                "August",
                                "September",
                                "October",
                                "November",
                                "December",
                            ];

                            const fromMonthIndex = monthNames.indexOf(fromMonth);
                            const toMonthIndex = monthNames.indexOf(toMonth);

                            const calendars = [];

                            let currentMonth = fromMonthIndex;
                            let currentYear = fromYear;
                            let dataIndex = 0;

                            while (
                                currentYear < toYear ||
                                (currentYear === toYear && currentMonth <= toMonthIndex)
                            ) {
                                calendars.push(
                                    <MiniCalendar
                                        key={`${monthNames[currentMonth]}-${currentYear}`}
                                        month={monthNames[currentMonth]}
                                        year={currentYear}
                                        calendarData={monthlyData[dataIndex] || []}
                                    />
                                );

                                dataIndex++;

                                currentMonth++;

                                if (currentMonth > 11) {
                                    currentMonth = 0;
                                    currentYear++;
                                }
                            }

                            return calendars;
                        })()}
                    </div>
                </div>

            </div>
        </>
    );
}

export default EmployeeOverview;