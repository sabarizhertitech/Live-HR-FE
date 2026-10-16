import React, { useState, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";
import { Chart as ChartJS, registerables } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { portalInstance } from "../../../Services/instance";
import CustomDropdown from "../../Common/CustomDropdown";
import "../../Common/CustomDropdown.css";

ChartJS.register(...registerables);

const RECENT_TASKS_LIMIT_OPTIONS = [
  { value: 2, label: "2" },
  { value: 5, label: "5" },
  { value: 10, label: "10" },
];

export default function EmployeePerformanceModal({
  isOpen,
  onClose,
  employee,
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [trendRange, setTrendRange] = useState("15days");
  const [taskFilterStatus, setTaskFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentTasksLimit, setRecentTasksLimit] = useState(2);

  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);

  const empId = employee?._id || employee?.memberId || employee?.id || "";

  // Fetch 100% real DB-calculated employee analytics from Backend
  useEffect(() => {
    if (!isOpen || !empId) return;

    let isMounted = true;
    const fetchEmployeeAnalytics = async () => {
      try {
        setLoading(true);
        const res = await portalInstance.get(`/creat/tasks/analytics/employee/${empId}?trendRange=${trendRange}`);
        if (res.data?.success && isMounted) {
          setAnalyticsData(res.data);
        }
      } catch (err) {
        console.error("Error fetching employee performance details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEmployeeAnalytics();

    return () => {
      isMounted = false;
    };
  }, [isOpen, empId, trendRange]);

  // Profile info from backend response or passed prop fallback
  const profile = analyticsData?.profile || {};
  const empName = profile.name || employee?.name || employee?.employeeName || "Employee";
  const empRole = profile.role || employee?.role || employee?.designation || "Team Member";
  const empDept = profile.department || employee?.department || "General";
  const empCode = profile.empId || employee?.empCode || employee?.empId || "EMP";
  const empEmail = profile.email || employee?.email || "";
  const avatarUrl = profile.avatarUrl || employee?.avatarUrl || "/avatar.png";
  const isActive = profile.isActive !== undefined ? profile.isActive : true;

  // Overview metrics from backend
  const overview = analyticsData?.overview || {};
  const totalTasks = overview.totalTasks || 0;
  const completedTasks = overview.completed || 0;
  const inProgressTasks = overview.inProgress || 0;
  const pendingTasks = overview.pending || 0;
  const onHoldTasks = overview.onHold || 0;
  const rejectedTasks = overview.rejected || 0;
  const completionRate = overview.completionRate !== undefined ? overview.completionRate : 0;
  const avgCompletionTime = overview.avgCompletionTime || "0d 0h";
  const totalWorkDuration = overview.totalWorkDuration || "0d 0h";
  const completionRateDelta = overview.completionRateDelta || 0;
  const avgTimeDelta = overview.avgTimeDelta || 0;

  // Real backend tasks
  const tasks = analyticsData?.tasks || [];

  // Team tasks from backend
  const teamTasks = analyticsData?.teamTasks || [];

  // Time tracking from backend
  const timeTracking = analyticsData?.timeTracking || {
    totalLogged: "0h 00m",
    dailyAverage: "0h 00m",
    slaEfficiency: "100%",
  };

  // Activity log from backend
  const activityLog = analyticsData?.activityLog || [];

  // Chart 1: Real Task Performance Trend (Backend calculated)
  const trendLabels = analyticsData?.trendChart?.labels || [];
  const trendAssigned = analyticsData?.trendChart?.tasksAssigned || [];
  const trendCompleted = analyticsData?.trendChart?.tasksCompleted || [];
  const trendAvgTime = analyticsData?.trendChart?.avgTime || [];

  const trendChartData = useMemo(() => {
    return {
      labels: trendLabels.length > 0 ? trendLabels : ["No Data"],
      datasets: [
        {
          type: "bar",
          label: "Tasks Assigned",
          data: trendAssigned.length > 0 ? trendAssigned : [0],
          backgroundColor: "#3b82f6",
          borderRadius: 4,
          barPercentage: 0.5,
          categoryPercentage: 0.6,
          yAxisID: "y",
        },
        {
          type: "bar",
          label: "Tasks Completed",
          data: trendCompleted.length > 0 ? trendCompleted : [0],
          backgroundColor: "#10b981",
          borderRadius: 4,
          barPercentage: 0.5,
          categoryPercentage: 0.6,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Avg. Time (hrs)",
          data: trendAvgTime.length > 0 ? trendAvgTime : [0],
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b",
          pointBackgroundColor: "#f59e0b",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          borderWidth: 2.5,
          tension: 0.4,
          yAxisID: "y1",
        },
      ],
    };
  }, [trendLabels, trendAssigned, trendCompleted, trendAvgTime]);

  const maxTaskCount = Math.max(...trendAssigned, ...trendCompleted, 5);
  const maxAvgTime = Math.max(...trendAvgTime, 5);

  const trendChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "center",
          labels: {
            font: { family: "Inter", size: 11, weight: "500" },
            color: "#475569",
            usePointStyle: true,
            boxWidth: 8,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: "#0f172a",
          padding: 8,
          cornerRadius: 6,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "Inter", size: 9.5 },
            color: "#64748b",
            maxRotation: 0,
            minRotation: 0,
            autoSkip: false,
          },
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          min: 0,
          max: maxTaskCount + 2,
          ticks: { stepSize: 1, font: { family: "Inter", size: 10 }, color: "#64748b" },
          grid: { color: "#f1f5f9" },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          min: 0,
          max: Math.ceil(maxAvgTime) + 1,
          ticks: {
            stepSize: 1,
            callback: (value) => `${value}h`,
            font: { family: "Inter", size: 10 },
            color: "#64748b",
          },
          grid: { display: false },
        },
      },
    };
  }, [maxTaskCount, maxAvgTime]);

  // Chart 2: Real Category Breakdown Donut Chart (Backend calculated)
  const catLabels = analyticsData?.categoryBreakdown?.labels || [];
  const catData = analyticsData?.categoryBreakdown?.data || [];
  const catColors = analyticsData?.categoryBreakdown?.colors || ["#3b82f6", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899"];
  const catBreakdown = analyticsData?.categoryBreakdown?.breakdown || [];
  const catTotal = analyticsData?.categoryBreakdown?.totalTasks || 0;

  const categoryDonutData = useMemo(() => {
    return {
      labels: catLabels.length > 0 ? catLabels : ["No Tasks"],
      datasets: [
        {
          data: catData.length > 0 ? catData : [1],
          backgroundColor: catData.length > 0 ? catColors : ["#e2e8f0"],
          borderWidth: 0,
        },
      ],
    };
  }, [catLabels, catData, catColors]);

  const categoryDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 8,
        cornerRadius: 6,
        enabled: catData.length > 0,
      },
    },
  };

  // Filtered Task Details list
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch = searchQuery
        ? (t.taskTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.project || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.category || "").toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchStatus = taskFilterStatus === "all"
        ? true
        : (t.status || "").toLowerCase().replace(/[-_\s]/g, "") === taskFilterStatus.toLowerCase().replace(/[-_\s]/g, "");

      return matchSearch && matchStatus;
    });
  }, [tasks, searchQuery, taskFilterStatus]);

  if (!isOpen || !employee) return null;

  return (
    <div className="ep-modal-backdrop" onClick={onClose}>
      <div className="ep-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ep-modal-header">
          <h2 className="ep-modal-title">Employee Performance Details</h2>
          <button className="common-modal-close-x" onClick={onClose} title="Close modal">
            ✕
          </button>
        </div>

        <div className="ep-modal-content">
          {/* Profile Card */}
          <div className="ep-profile-card">
            <div className="ep-profile-left">
              <img
                src={avatarUrl}
                alt={empName}
                className="ep-profile-avatar"
                onError={(e) => {
                  e.target.src = "/avatar.png";
                }}
              />
              <div className="ep-profile-info">
                <div className="ep-profile-name-row">
                  <span className="ep-profile-name">{empName}</span>
                  <span className={`ep-status-pill ${isActive ? "" : "inactive"}`}>
                    <span className="ep-status-dot" /> {isActive ? "Active" : "Relieved"}
                  </span>
                </div>
                <div className="ep-profile-role">{empRole}</div>
                <div className="ep-profile-meta-row">
                  <span className="ep-meta-item">
                    <Icon icon="solar:buildings-2-bold" /> {empDept}
                  </span>
                  <span className="ep-meta-divider">•</span>
                  <span className="ep-meta-item">
                    <Icon icon="solar:card-2-bold" /> {empCode}
                  </span>
                  {empEmail && (
                    <>
                      <span className="ep-meta-divider">•</span>
                      <span className="ep-meta-item">
                        <Icon icon="solar:letter-bold" /> {empEmail}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="ep-tab-nav">
            <button
              className={`ep-tab-btn ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`ep-tab-btn ${activeTab === "task_details" ? "active" : ""}`}
              onClick={() => setActiveTab("task_details")}
            >
              Task Details
            </button>
            <button
              className={`ep-tab-btn ${activeTab === "team_tasks" ? "active" : ""}`}
              onClick={() => setActiveTab("team_tasks")}
            >
              Team Tasks ({teamTasks.length})
            </button>
            <button
              className={`ep-tab-btn ${activeTab === "time_tracking" ? "active" : ""}`}
              onClick={() => setActiveTab("time_tracking")}
            >
              Time Tracking
            </button>
            <button
              className={`ep-tab-btn ${activeTab === "activity_log" ? "active" : ""}`}
              onClick={() => setActiveTab("activity_log")}
            >
              Activity Log
            </button>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <Icon icon="solar:refresh-circle-bold" className="spin-icon" style={{ fontSize: "32px", color: "#3b82f6", marginBottom: "10px" }} />
              <div>Calculating employee performance metrics from database...</div>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="ep-tab-body">
                  {/* Mini Metric Boxes */}
                  <div className="ep-metric-row">
                    <div className="ep-metric-box">
                      <span className="ep-metric-lbl">Total Tasks</span>
                      <span className="ep-metric-val dark">{totalTasks}</span>
                    </div>
                    <div className="ep-metric-box">
                      <span className="ep-metric-lbl">Completed</span>
                      <span className="ep-metric-val green">{completedTasks}</span>
                    </div>
                    <div className="ep-metric-box">
                      <span className="ep-metric-lbl">In Progress</span>
                      <span className="ep-metric-val orange">{inProgressTasks}</span>
                    </div>
                    <div className="ep-metric-box">
                      <span className="ep-metric-lbl">Pending</span>
                      <span className="ep-metric-val pink">{pendingTasks}</span>
                    </div>
                    <div className="ep-metric-box">
                      <span className="ep-metric-lbl">On Hold</span>
                      <span className="ep-metric-val purple">{onHoldTasks}</span>
                    </div>
                    <div className="ep-metric-box">
                      <span className="ep-metric-lbl">Rejected</span>
                      <span className="ep-metric-val red">{rejectedTasks}</span>
                    </div>
                  </div>

                  {/* 3 Summary Cards */}
                  <div className="ep-summary-grid">
                    <div className="ep-summary-card">
                      <div className="ep-radial-wrapper">
                        <svg className="ep-radial-svg" viewBox="0 0 36 36">
                          <path
                            className="ep-radial-bg"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className="ep-radial-fill"
                            strokeDasharray={`${completionRate}, 100`}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div className="ep-radial-content">
                          <span className="ep-radial-title">Completion Rate</span>
                          <span className="ep-radial-num">{completionRate}%</span>
                          <span className={`ep-radial-sub ${completionRateDelta >= 0 ? "green" : "red"}`}>
                            {completionRateDelta >= 0 ? `↑ ${completionRateDelta}%` : `↓ ${Math.abs(completionRateDelta)}%`} vs last month
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="ep-summary-card">
                      <div className="ep-summary-icon-box blue">
                        <Icon icon="solar:clock-circle-bold" />
                      </div>
                      <div className="ep-summary-details">
                        <span className="ep-summary-lbl">Average Completion Time</span>
                        <span className="ep-summary-val">{avgCompletionTime}</span>
                        <span className={`ep-summary-sub ${avgTimeDelta <= 0 ? "green" : "orange"}`}>
                          {avgTimeDelta !== 0 ? `${avgTimeDelta < 0 ? "↓" : "↑"} ${Math.abs(avgTimeDelta)}% vs last month` : "Calculated from completed tasks"}
                        </span>
                      </div>
                    </div>

                    <div className="ep-summary-card">
                      <div className="ep-summary-icon-box purple">
                        <Icon icon="solar:stopwatch-bold" />
                      </div>
                      <div className="ep-summary-details">
                        <span className="ep-summary-lbl">Total Work Duration</span>
                        <span className="ep-summary-val">{totalWorkDuration}</span>
                        <span className="ep-summary-sub gray">Last 30 days active work</span>
                      </div>
                    </div>
                  </div>

                  {/* Task Performance Trend Chart */}
                  <div className="ep-chart-panel">
                    <div className="ep-panel-head">
                      <span className="ep-panel-heading">Task Performance Trend</span>
                      <select
                        className="ep-select-sm"
                        value={trendRange}
                        onChange={(e) => setTrendRange(e.target.value)}
                      >
                        <option value="15days">Last 15 Days</option>
                        <option value="7days">Last 7 Days</option>
                        <option value="30days">Last 30 Days</option>
                      </select>
                    </div>
                    <div className="ep-trend-chart-box">
                      <Bar data={trendChartData} options={trendChartOptions} />
                    </div>
                  </div>

                  {/* Bottom 2-Column Split: Category Breakdown + Recent Tasks */}
                  <div className="ep-bottom-split">
                    {/* Left: Task Category Breakdown */}
                    <div className="ep-card-split">
                      <div className="ep-panel-head">
                        <span className="ep-panel-heading">Task Category Breakdown</span>
                      </div>
                      <div className="ep-cat-container">
                        <div className="ep-cat-donut-wrapper">
                          <Doughnut data={categoryDonutData} options={categoryDonutOptions} />
                          <div className="ep-donut-center">
                            <span className="ep-center-num">{catTotal}</span>
                            <span className="ep-center-lbl">Tasks</span>
                          </div>
                        </div>
                        <div className="ep-cat-legend">
                          {catBreakdown.length === 0 ? (
                            <div style={{ color: "#94a3b8", fontSize: "12px", padding: "10px 0" }}>No category records found</div>
                          ) : (
                            catBreakdown.map((c) => (
                              <div key={c.name} className="ep-cat-legend-row">
                                <span className="ep-cat-dot" style={{ backgroundColor: c.color }} />
                                <span className="ep-cat-name">{c.name}</span>
                                <span className="ep-cat-stat">{c.count} ({c.percent}%)</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Recent Tasks by Employee */}
                    <div className="ep-card-split">
                      <div className="ep-panel-head">
                        <span className="ep-panel-heading">Recent Tasks by {empName}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <CustomDropdown
                            options={RECENT_TASKS_LIMIT_OPTIONS}
                            value={recentTasksLimit}
                            onChange={(val) => setRecentTasksLimit(Number(val))}
                            placeholder="2"
                            className="ep-recent-tasks-dropdown"
                            style={{ width: "60px", minWidth: "60px", maxWidth: "60px" }}
                          />
                          {tasks.length > recentTasksLimit && (
                            <button className="ep-link-viewall" onClick={() => setActiveTab("task_details")}>
                              View All
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="ep-mini-table-wrapper">
                        <table className="ep-mini-table">
                          <thead>
                            <tr>
                              <th>Task Name</th>
                              <th>Status</th>
                              <th>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.length === 0 ? (
                              <tr>
                                <td colSpan={3} style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
                                  No tasks assigned yet
                                </td>
                              </tr>
                            ) : (
                              tasks.slice(0, recentTasksLimit).map((t, idx) => {
                                const status = t.status || "Pending";
                                const isComp = status.toLowerCase() === "completed";
                                const isProg = status.toLowerCase().includes("progress");
                                const isHold = status.toLowerCase().includes("hold");
                                const isRej = status.toLowerCase().includes("reject") || status.toLowerCase().includes("ignore");
                                const pillClass = isComp ? "completed" : isProg ? "inprogress" : isHold ? "onhold" : isRej ? "rejected" : "pending";
                                return (
                                  <tr key={t._id || idx}>
                                    <td className="ep-task-name-cell">{t.taskTitle || t.taskName || "Task"}</td>
                                    <td>
                                      <span className={`ep-pill ${pillClass}`}>
                                        {status}
                                      </span>
                                    </td>
                                    <td className="ep-task-dur">{t.duration?.daysHours || t.duration?.formatted || "0d 0h"}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TASK DETAILS */}
              {activeTab === "task_details" && (
                <div className="ep-tab-body">
                  <div className="ep-tab-filter-bar">
                    <div className="ep-search-box">
                      <Icon icon="solar:magnifer-linear" />
                      <input
                        type="text"
                        placeholder="Search tasks by title, project, or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="ep-filter-pills">
                      {["all", "completed", "in progress", "pending", "on hold", "rejected"].map((st) => (
                        <button
                          key={st}
                          className={`ep-filter-btn ${taskFilterStatus === st ? "active" : ""}`}
                          onClick={() => setTaskFilterStatus(st)}
                        >
                          {st.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="ep-full-table-wrapper">
                    <table className="ep-full-table">
                      <thead>
                        <tr>
                          <th>Task Title</th>
                          <th>Project</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Due Date</th>
                          <th>Time Taken</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTasks.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                              No matching tasks found
                            </td>
                          </tr>
                        ) : (
                          filteredTasks.map((t, idx) => (
                            <tr key={t._id || idx}>
                              <td className="ep-task-title-bold">{t.taskTitle || t.taskName || "Task"}</td>
                              <td style={{ color: "#64748b", fontSize: "12px" }}>{t.project || t.category || "General"}</td>
                              <td>
                                <span className={`ep-priority-tag ${(t.priority || "Mid").toLowerCase()}`}>
                                  {t.priority || "Mid"}
                                </span>
                              </td>
                              <td>
                                <span className={`ep-pill ${(t.status || "Pending").toLowerCase().replace(/[-_\s]/g, "")}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td>
                                {t.dueDate
                                  ? new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                                  : "N/A"}
                              </td>
                              <td>{t.duration?.daysHours || t.duration?.formatted || "0d 0h"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: TEAM TASKS */}
              {activeTab === "team_tasks" && (
                <div className="ep-tab-body">
                  <div className="ep-team-tasks-grid">
                    {teamTasks.length === 0 ? (
                      <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        No collaborative team tasks found for this employee
                      </div>
                    ) : (
                      teamTasks.map((item, i) => {
                        const title = item.taskTitle || item.taskName || "Team Task";
                        const team = item.project || item.category || "Project Collaboration";
                        const membersCount = Array.isArray(item.assignedMembers) ? item.assignedMembers.length : 1;
                        const progress = item.progress !== undefined ? item.progress : 0;
                        const status = item.status || "Pending";
                        const isComp = status.toLowerCase() === "completed";
                        const isProg = status.toLowerCase().includes("progress");
                        const isHold = status.toLowerCase().includes("hold");
                        const isRej = status.toLowerCase().includes("reject") || status.toLowerCase().includes("ignore");
                        const pillClass = isComp ? "completed" : isProg ? "inprogress" : isHold ? "onhold" : isRej ? "rejected" : "pending";

                        return (
                          <div key={item._id || i} className="ep-team-task-card">
                            <div className="ep-tt-header">
                              <span className="ep-tt-title">{title}</span>
                              <span className={`ep-pill ${pillClass}`}>
                                {status}
                              </span>
                            </div>
                            <div className="ep-tt-meta">
                              <span>🏢 {team}</span>
                              <span>👥 {membersCount} Collaborators</span>
                            </div>
                            <div className="ep-tt-progress-track">
                              <div className="ep-tt-progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="ep-tt-progress-text">{progress}% Completed</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: TIME TRACKING */}
              {activeTab === "time_tracking" && (
                <div className="ep-tab-body">
                  <div className="ep-time-summary-cards">
                    <div className="ep-time-card">
                      <span className="ep-time-num">{timeTracking.totalLogged}</span>
                      <span className="ep-time-lbl">Total Logged (30 Days)</span>
                    </div>
                    <div className="ep-time-card">
                      <span className="ep-time-num">{timeTracking.dailyAverage}</span>
                      <span className="ep-time-lbl">Daily Average</span>
                    </div>
                    <div className="ep-time-card">
                      <span className="ep-time-num">{timeTracking.slaEfficiency}</span>
                      <span className="ep-time-lbl">SLA Efficiency</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: ACTIVITY LOG */}
              {activeTab === "activity_log" && (
                <div className="ep-tab-body">
                  <div className="ep-timeline">
                    {activityLog.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                        No recent activity recorded for this employee
                      </div>
                    ) : (
                      activityLog.map((act, i) => (
                        <div key={i} className="ep-timeline-item">
                          <div className={`ep-timeline-bullet ${act.type || "inprogress"}`} />
                          <div className="ep-timeline-text">
                            <span className="ep-timeline-title">{act.title}</span>
                            <span className="ep-timeline-time">{act.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="ep-modal-footer">
          <button className="ep-btn-close-footer" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
