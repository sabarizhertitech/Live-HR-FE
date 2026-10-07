import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Sidebar from "../../HeaderSidebar/Sidebar";
import { portalInstance } from "../../../Services/instance";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import EmployeePerformanceModal from "./EmployeePerformanceModal";
import TaskDetailsModal from "../../Employee/Task/TaskDetailsModal";
import Pagination from "../../Employee/Pagination/Pagination";
import "../../Employee/Pagination/Pagination.css";
import CustomDropdown from "../../Common/CustomDropdown";
import "../../Common/CustomDropdown.css";
import "../../../Globel/Layout.css";
import "./TaskAnalytics.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const PERIOD_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last 1 Month", value: "last_month" },
  { label: "Custom", value: "custom" },
];

const EMP_SORT_OPTIONS = [
  { label: "Due Date", value: "dueDate" },
  { label: "Assigned Date", value: "assignedDate" },
  { label: "Priority", value: "priority" },
  // { label: "Task Name", value: "taskName" },
];

const EMP_PAGE_SIZE_OPTIONS = [
  { label: "5 / page", value: 5 },
  { label: "10 / page", value: 10 },
  { label: "20 / page", value: 20 },
  { label: "50 / page", value: 50 },
];

const RECENT_TASKS_PAGE_SIZE_OPTIONS = [
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "15", value: 15 },
  { label: "20", value: 20 },
];

const EMP_TREND_OPTIONS = [
  { label: "Last 14 Days", value: "Last 14 Days" },
  { label: "Last 7 Days", value: "Last 7 Days" },
  { label: "This Month", value: "This Month" },
];

export default function TaskAnalytics({ isAdmin = true }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Filter Toggle State
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterRef = useRef(null);

  // Cascading Filter States (for Admin)
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedDesignation, setSelectedDesignation] = useState("all");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedProject, setSelectedProject] = useState("all");
  const [trendGranularity, setTrendGranularity] = useState("daily");

  // Employee-Specific Interactive States
  const [empActiveTab, setEmpActiveTab] = useState("all");
  const [empSortBy, setEmpSortBy] = useState("dueDate");
  const [empCurrentPage, setEmpCurrentPage] = useState(1);
  const [empPageSize, setEmpPageSize] = useState(5);
  const [empSelectedDateRange, setEmpSelectedDateRange] = useState("All Time");
  const [selectedViewTaskId, setSelectedViewTaskId] = useState(null);
  const [empTrendRange, setEmpTrendRange] = useState("Last 14 Days");

  // Raw fetched metadata & employees for cascading filters
  const [rawEmployees, setRawEmployees] = useState([]);
  const [metaProjects, setMetaProjects] = useState([]);

  // Pagination for Recent Team Tasks (default: 5 per page for Admin)
  const [recentTasksCurrentPage, setRecentTasksCurrentPage] = useState(1);
  const [recentTasksPageSize, setRecentTasksPageSize] = useState(5);

  // Pagination for Top Performing Employees table
  const [topEmpCurrentPage, setTopEmpCurrentPage] = useState(1);
  const TOP_EMP_PAGE_SIZE = 5;

  // Pagination for Team-wise Task Overview table
  const [teamOverviewCurrentPage, setTeamOverviewCurrentPage] = useState(1);
  const TEAM_OVERVIEW_PAGE_SIZE = 5;

  // Employee Detail Modal State (Admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModalEmployee, setSelectedModalEmployee] = useState(null);

  // 1. Department Options
  const departmentOptions = useMemo(() => {
    const depts = Array.from(
      new Set(rawEmployees.map((e) => e.department).filter(Boolean))
    ).sort();
    return [
      { label: "All Departments", value: "all" },
      ...depts.map((d) => ({ label: d, value: d })),
    ];
  }, [rawEmployees]);

  // 2. Designation Options (Cascading: Filtered by selected department)
  const designationOptions = useMemo(() => {
    let list = rawEmployees;
    if (selectedDepartment && selectedDepartment !== "all") {
      list = list.filter(
        (e) => (e.department || "").toLowerCase() === selectedDepartment.toLowerCase()
      );
    }
    const desgs = Array.from(
      new Set(list.map((e) => e.designation || e.role).filter(Boolean))
    ).sort();
    return [
      { label: "All Designations", value: "all" },
      ...desgs.map((d) => ({ label: d, value: d })),
    ];
  }, [rawEmployees, selectedDepartment]);

  // 3. Employee Options (Cascading: Filtered by selected department & designation)
  const employeeDropdownOptions = useMemo(() => {
    let list = rawEmployees;
    if (selectedDepartment && selectedDepartment !== "all") {
      list = list.filter(
        (e) => (e.department || "").toLowerCase() === selectedDepartment.toLowerCase()
      );
    }
    if (selectedDesignation && selectedDesignation !== "all") {
      list = list.filter(
        (e) =>
          (e.designation || e.role || "").toLowerCase() === selectedDesignation.toLowerCase()
      );
    }
    return [
      { label: "All Employees", value: "all" },
      ...list.map((e) => ({
        label: e.name || e.employeeName || `${e.firstName || ""} ${e.lastName || ""}`.trim() || e.email || "Employee",
        value: String(e._id || e.id),
      })),
    ];
  }, [rawEmployees, selectedDepartment, selectedDesignation]);

  // 4. Project Options
  const projectDropdownOptions = useMemo(() => {
    return [
      { label: "All Projects", value: "all" },
      ...metaProjects.map((p) => ({ label: p, value: p })),
    ];
  }, [metaProjects]);

  const handleDepartmentChange = (val) => {
    setSelectedDepartment(val);
    setSelectedDesignation("all");
    setSelectedEmployee("all");
  };

  const handleDesignationChange = (val) => {
    setSelectedDesignation(val);
    setSelectedEmployee("all");
  };

  // Fetch Analytics from Backend with active filter params
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (!isAdmin) params.scope = "employee";
      if (selectedPeriod !== "all") params.period = selectedPeriod;
      if (selectedPeriod === "custom" && startDate) {
        params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      if (selectedDepartment !== "all") params.department = selectedDepartment;
      if (selectedDesignation !== "all") params.designation = selectedDesignation;
      if (selectedEmployee !== "all") params.employeeId = selectedEmployee;
      if (selectedProject !== "all") params.project = selectedProject;

      const res = await portalInstance.get("/creat/tasks/analytics", { params });
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Fetch Task Analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedPeriod, startDate, endDate, selectedDepartment, selectedDesignation, selectedEmployee, selectedProject]);

  useEffect(() => {
    const fetchMetaAndEmployees = async () => {
      try {
        const [metaRes, empRes] = await Promise.all([
          portalInstance.get("/creat/task-meta").catch(() => ({ data: { success: false } })),
          portalInstance.get("/data/employees").catch(() => portalInstance.get("/data/getalluser")).catch(() => ({ data: { data: [] } })),
        ]);

        if (metaRes.data?.success) {
          const projs = metaRes.data.data?.projects || [];
          setMetaProjects(projs);
        }

        const emps = empRes.data?.data || [];
        if (emps.length > 0) {
          const activeEmps = emps.filter(
            (e) =>
              e &&
              e.employmentStatus !== "relieved" &&
              e.employmentStatus !== "relived" &&
              e.status !== "relieved" &&
              e.status !== "relived"
          );
          setRawEmployees(activeEmps.length > 0 ? activeEmps : emps);
        }
      } catch (_) {}
    };

    fetchMetaAndEmployees();
    fetchAnalytics();
  }, []);

  // Compute Metrics strictly from backend response
  const summary = useMemo(() => {
    const s = data?.summary || {};
    const tot = s.totalTasks !== undefined ? s.totalTasks : (s.total !== undefined ? s.total : 0);
    const comp = s.completedTasks !== undefined ? s.completedTasks : (s.completed !== undefined ? s.completed : 0);
    const inProg = s.inProgressTasks !== undefined ? s.inProgressTasks : (s.inProgress !== undefined ? s.inProgress : 0);
    const pend = s.pendingTasks !== undefined ? s.pendingTasks : (s.pending !== undefined ? s.pending : 0);
    const hold = s.onHoldTasks !== undefined ? s.onHoldTasks : (s.onHold !== undefined ? s.onHold : (s.holdTasks !== undefined ? s.holdTasks : 0));
    const rej = s.rejectedTasks !== undefined ? s.rejectedTasks : (s.rejected !== undefined ? s.rejected : (s.ignoredTasks !== undefined ? s.ignoredTasks : 0));
    const overdue = s.overdueTasks !== undefined ? s.overdueTasks : (s.overdue !== undefined ? s.overdue : 0);
    const rate = s.completionRate !== undefined ? s.completionRate : (tot > 0 ? Math.round((comp / tot) * 100) : 0);
    return {
      total: tot,
      completed: comp,
      inProgress: inProg,
      pending: pend,
      onHold: hold,
      rejected: rej,
      overdue: overdue,
      completionRate: rate,
    };
  }, [data]);

  // Helper to format duration to Days and Hours (with minutes if < 1h)
  const formatDaysHoursOnly = (item) => {
    if (!item) return "0d 0h";
    if (typeof item === "object") {
      if (item.days === 0 && item.hours === 0 && item.minutes > 0) {
        return `${item.minutes}m`;
      }
      if (item.daysHours) return item.daysHours;
      if (item.days !== undefined || item.hours !== undefined) {
        return `${item.days || 0}d ${item.hours || 0}h`;
      }
    }
    const str = String(item?.daysHours || item?.compact || item?.formatted || item || "");
    const dayMatch = str.match(/(\d+)\s*(?:d|day|days)/i);
    const hourMatch = str.match(/(\d+)\s*(?:h|hr|hour|hours)/i);
    const minMatch = str.match(/(\d+)\s*(?:m|min|minute|minutes)/i);
    const d = dayMatch ? parseInt(dayMatch[1], 10) : 0;
    const h = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const m = minMatch ? parseInt(minMatch[1], 10) : 0;
    if (d === 0 && h === 0 && m > 0) return `${m}m`;
    return `${d}d ${h}h`;
  };

  // Helper to format duration to Days ONLY (no hours, minutes, or seconds)
  const formatDaysOnly = (item) => {
    if (!item) return "0d";
    if (typeof item === "object") {
      if (item.days !== undefined) {
        return `${item.days || 0}d`;
      }
    }
    const str = String(item?.daysHours || item?.compact || item?.formatted || item || "");
    const dayMatch = str.match(/(\d+)\s*(?:d|day|days)/i);
    const d = dayMatch ? parseInt(dayMatch[1], 10) : 0;
    return `${d}d`;
  };

  // Helper to format duration to Hours and Mins (e.g., 9h 40m, 2h 15m)
  const formatHoursMins = (item) => {
    if (!item) return "0h 00m";
    if (typeof item === "object") {
      const h = Number(item.hours) || 0;
      const m = Number(item.minutes) || 0;
      return `${h}h ${String(m).padStart(2, "0")}m`;
    }
    const str = String(item || "");
    const hourMatch = str.match(/(\d+)\s*(?:h|hr|hour|hours)/i);
    const minMatch = str.match(/(\d+)\s*(?:m|min|minute|minutes)/i);
    const h = hourMatch ? hourMatch[1] : "0";
    const m = minMatch ? minMatch[1].padStart(2, "0") : "00";
    return `${h}h ${m}m`;
  };

  const topEmployees = useMemo(() => {
    if (data?.memberAnalytics && Array.isArray(data.memberAnalytics)) {
      return data.memberAnalytics.map((m, idx) => {
        const matchedRaw = rawEmployees.find(
          (e) => String(e._id || e.id) === String(m.memberId || m._id) || e.name === m.name
        );
        const rawAvatarCandidate =
          (m.avatarUrl && typeof m.avatarUrl === "string" ? m.avatarUrl : null) ||
          matchedRaw?.avatar ||
          matchedRaw?.photo ||
          matchedRaw?.picture ||
          matchedRaw?.profileImage ||
          "";

        let resolvedAvatar = "/avatar.png";
        if (
          rawAvatarCandidate &&
          rawAvatarCandidate !== "avatar.png" &&
          rawAvatarCandidate !== "/avatar.png" &&
          rawAvatarCandidate !== "null" &&
          rawAvatarCandidate !== "undefined"
        ) {
          if (
            rawAvatarCandidate.startsWith("http://") ||
            rawAvatarCandidate.startsWith("https://") ||
            rawAvatarCandidate.startsWith("blob:") ||
            rawAvatarCandidate.startsWith("data:")
          ) {
            resolvedAvatar = rawAvatarCandidate;
          } else if (rawAvatarCandidate.startsWith("/")) {
            resolvedAvatar = rawAvatarCandidate;
          } else {
            resolvedAvatar = "/" + rawAvatarCandidate;
          }
        }

        return {
          _id: m.memberId || matchedRaw?._id || matchedRaw?.id || m._id || `emp_${idx}`,
          name: m.name || matchedRaw?.name || "Employee",
          role: m.role || matchedRaw?.designation || matchedRaw?.role || "Team Member",
          department: m.department || matchedRaw?.department || "General",
          empCode: m.empCode || matchedRaw?.empId || matchedRaw?.empCode || `EMP${String(idx + 1).padStart(3, "0")}`,
          email: m.email || matchedRaw?.email || "",
          avatarUrl: resolvedAvatar,
          photo: resolvedAvatar,
          totalTasks: m.totalAssigned || 0,
          completed: m.completed || 0,
          inProgress: m.inProgress || 0,
          pending: m.pending || 0,
          onHold: m.onHold || 0,
          overdue: m.overdue || 0,
          completionRate: m.completionRate || 0,
          avgDuration: formatDaysHoursOnly(m.averageCompletionTime || m.avgCompletionSpeed),
          performanceScore: m.performanceScore !== undefined ? m.performanceScore : null,
          rank: m.rank !== undefined ? m.rank : null,
          rankingEligible: m.rankingEligible !== undefined ? m.rankingEligible : true,
          confidence: m.confidence || "MODERATE",
          confidenceLabel: m.confidenceLabel || "",
        };
      });
    }
    return [];
  }, [data, rawEmployees]);

  const teamOverview = useMemo(() => {
    return Array.isArray(data?.teamOverview) ? data.teamOverview : [];
  }, [data]);

  // Paginated slices for the two admin tables
  const paginatedTopEmployees = useMemo(() => {
    const start = (topEmpCurrentPage - 1) * TOP_EMP_PAGE_SIZE;
    return topEmployees.slice(start, start + TOP_EMP_PAGE_SIZE);
  }, [topEmployees, topEmpCurrentPage]);

  const paginatedTeamOverview = useMemo(() => {
    const start = (teamOverviewCurrentPage - 1) * TEAM_OVERVIEW_PAGE_SIZE;
    return teamOverview.slice(start, start + TEAM_OVERVIEW_PAGE_SIZE);
  }, [teamOverview, teamOverviewCurrentPage]);

  const recentTasks = useMemo(() => {
    return Array.isArray(data?.recentTasks) ? data.recentTasks : [];
  }, [data]);

  const totalRecentTasks = recentTasks.length;
  const paginatedRecentTasks = useMemo(() => {
    const start = (recentTasksCurrentPage - 1) * recentTasksPageSize;
    return recentTasks.slice(start, start + recentTasksPageSize);
  }, [recentTasks, recentTasksCurrentPage, recentTasksPageSize]);

  const avgStats = useMemo(() => {
    const stats = data?.averageCompletionStats || {};
    const totalComp = summary.completed || 0;
    if (totalComp === 0) {
      return {
        fastest: "0d 0h",
        slowest: "0d 0h",
        teamAverage: "0d 0h",
      };
    }
    const fallbackAvg = data?.summary?.avgCompletionTime || "1d 0h";
    const fVal = formatDaysHoursOnly(stats.fastest);
    const sVal = formatDaysHoursOnly(stats.slowest);
    const tVal = formatDaysHoursOnly(stats.teamAverage);
    return {
      fastest: fVal !== "0d 0h" ? fVal : fallbackAvg,
      slowest: sVal !== "0d 0h" ? sVal : fallbackAvg,
      teamAverage: tVal !== "0d 0h" ? tVal : fallbackAvg,
    };
  }, [data, summary.completed]);

  // Handle open employee popup (Admin)
  const handleOpenEmployeeModal = (emp) => {
    setSelectedModalEmployee(emp);
    setIsModalOpen(true);
  };

  // ── Employee Tasks & Analytics Calculations strictly from backend ──
  const employeeTasksList = useMemo(() => {
    if (data?.tasks && Array.isArray(data.tasks)) {
      return data.tasks.map((t, idx) => {
        let assignedFormatted = "-";
        if (t.createdAt) {
          try {
            assignedFormatted = new Date(t.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            });
          } catch (_) {}
        }
        let dueFormatted = "-";
        if (t.dueDate) {
          try {
            dueFormatted = new Date(t.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            });
          } catch (_) {}
        }

        const rawStatus = (t.status || "Pending").toLowerCase();
        let normalizedStatus = "Pending";
        if (rawStatus === "completed") normalizedStatus = "Completed";
        else if (rawStatus.includes("progress") || rawStatus.includes("process")) normalizedStatus = "In Progress";
        else if (rawStatus.includes("hold")) normalizedStatus = "On Hold";
        else if (rawStatus.includes("reject") || rawStatus.includes("ignore") || t.isRejected || (t.assignedStatus && t.assignedStatus.toLowerCase() === "rejected")) normalizedStatus = "Rejected";

        return {
          _id: t._id || `task_${idx}`,
          taskName: t.taskTitle || t.title || "Task Item",
          taskDetails: t.taskDetails || "",
          project: t.project || "General",
          priority: t.priority ? t.priority.charAt(0).toUpperCase() + t.priority.slice(1) : "Medium",
          status: normalizedStatus,
          assignedDate: assignedFormatted,
          dueDate: dueFormatted,
          timeSpent: t.duration?.compact || t.duration?.formatted || t.timeSpent || "-",
        };
      });
    }
    return [];
  }, [data]);

  // Tab counts for employee tasks
  const empCounts = useMemo(() => {
    const all = employeeTasksList.length;
    const completed = employeeTasksList.filter((t) => (t.status || "").toLowerCase() === "completed").length;
    const inProgress = employeeTasksList.filter((t) => (t.status || "").toLowerCase().includes("progress") || (t.status || "").toLowerCase().includes("process")).length;
    const pending = employeeTasksList.filter((t) => (t.status || "").toLowerCase().includes("pending") || (t.status || "").toLowerCase().includes("hold")).length;
    return { all, completed, inProgress, pending };
  }, [employeeTasksList]);

  // Filtered employee tasks
  const filteredEmployeeTasks = useMemo(() => {
    let list = employeeTasksList;
    if (empActiveTab === "completed") {
      list = list.filter((t) => (t.status || "").toLowerCase() === "completed");
    } else if (empActiveTab === "in_progress") {
      list = list.filter((t) => (t.status || "").toLowerCase().includes("progress") || (t.status || "").toLowerCase().includes("process"));
    } else if (empActiveTab === "pending") {
      list = list.filter((t) => (t.status || "").toLowerCase().includes("pending") || (t.status || "").toLowerCase().includes("hold"));
    }

    return [...list].sort((a, b) => {
      if (empSortBy === "dueDate") {
        return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
      }
      if (empSortBy === "assignedDate") {
        return new Date(b.assignedDate || 0) - new Date(a.assignedDate || 0);
      }
      if (empSortBy === "priority") {
        const pWeights = { high: 3, medium: 2, mid: 2, low: 1 };
        return (pWeights[(b.priority || "").toLowerCase()] || 0) - (pWeights[(a.priority || "").toLowerCase()] || 0);
      }
      if (empSortBy === "taskName") {
        return (a.taskName || "").localeCompare(b.taskName || "");
      }
      return 0;
    });
  }, [employeeTasksList, empActiveTab, empSortBy]);

  const totalFilteredEmpTasks = filteredEmployeeTasks.length;
  const paginatedEmployeeTasks = useMemo(() => {
    const start = (empCurrentPage - 1) * empPageSize;
    return filteredEmployeeTasks.slice(start, start + empPageSize);
  }, [filteredEmployeeTasks, empCurrentPage, empPageSize]);

  // Employee Activities derived from real tasks
  const employeeActivities = useMemo(() => {
    if (data?.tasks && data.tasks.length > 0) {
      return data.tasks.slice(0, 8).map((t) => {
        const isComp = (t.status || "").toLowerCase() === "completed";
        const isProg = (t.status || "").toLowerCase().includes("progress") || (t.status || "").toLowerCase().includes("process");
        const title = t.taskTitle || t.title || "Task";
        const action = isComp
          ? `Marked task "${title}" as Completed`
          : isProg
          ? `Updated task "${title}"`
          : `Assigned task "${title}"`;
        const dateObj = t.updatedAt ? new Date(t.updatedAt) : t.createdAt ? new Date(t.createdAt) : new Date();
        return {
          id: t._id,
          action,
          date: dateObj.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
          time: dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          color: isComp ? "#10b981" : isProg ? "#3b82f6" : "#f97316",
          icon: isComp ? "solar:check-circle-bold" : isProg ? "solar:pen-new-square-bold" : "solar:clock-circle-bold",
        };
      });
    }
    return [];
  }, [data]);

  // ── Employee Chart 1: Status Donut ──
  const empStatusDonutData = useMemo(() => ({
    labels: ["Completed", "In Progress", "Pending", "On Hold", "Rejected"],
    datasets: [
      {
        data: [summary.completed, summary.inProgress, summary.pending, summary.onHold, summary.rejected],
        backgroundColor: ["#10b981", "#f97316", "#f43f5e", "#a855f7", "#ef4444"],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }), [summary]);

  // ── Employee Chart 2: Completion Trend ──
  const empTrendChartData = useMemo(() => {
    const rawTrends = Array.isArray(data?.trendData) ? data.trendData : [];
    const labels = rawTrends.map((t) => t.date);
    const createdArr = rawTrends.map((t) => t.created || 0);
    const completedArr = rawTrends.map((t) => t.completed || 0);

    return {
      labels,
      datasets: [
        {
          label: "Tasks Assigned",
          data: createdArr,
          backgroundColor: "#3b82f6",
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
        {
          label: "Tasks Completed",
          data: completedArr,
          backgroundColor: "#14b8a6",
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    };
  }, [data]);

  const empTrendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          font: { family: "Inter", size: 12, weight: "500" },
          color: "#64748b",
          usePointStyle: true,
          boxWidth: 8,
          padding: 14,
        },
      },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "Inter", size: 11 },
          color: "#64748b",
          maxRotation: 0,
          minRotation: 0,
          autoSkip: true,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: { font: { family: "Inter", size: 11 }, color: "#64748b", stepSize: 1, precision: 0 },
      },
    },
  };

  // ── Category Time Spent Donut / Breakdown ──
  const categoryBreakdownList = useMemo(() => {
    return Array.isArray(data?.categoryBreakdown) ? data.categoryBreakdown : [];
  }, [data]);

  const totalCategoryDurationFormatted = useMemo(() => {
    return formatHoursMins(data?.averageCompletionStats?.teamAverage || data?.summary?.avgCompletionTime);
  }, [data]);

  const empCategoryTimeData = useMemo(() => {
    const labels = categoryBreakdownList.map((c) => c.category);
    const totals = categoryBreakdownList.map((c) => c.total || 0);

    return {
      labels: labels.length > 0 ? labels : ["No Tasks"],
      datasets: [
        {
          data: totals.length > 0 ? totals : [1],
          backgroundColor: ["#3b82f6", "#14b8a6", "#f97316", "#8b5cf6", "#f43f5e", "#64748b"],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };
  }, [categoryBreakdownList]);

  const empCategoryTimeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 8,
        cornerRadius: 6,
      },
    },
  };

  // ── Admin Chart 1: Task Status Distribution Donut ──
  const statusDonutData = useMemo(() => ({
    labels: ["Completed", "In Progress", "Pending", "On Hold", "Rejected"],
    datasets: [
      {
        data: [summary.completed, summary.inProgress, summary.pending, summary.onHold, summary.rejected],
        backgroundColor: ["#10b981", "#f97316", "#f43f5e", "#a855f7", "#ef4444"],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  }), [summary]);

  const statusDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "74%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 8,
        cornerRadius: 6,
      },
    },
  };

  // ── Admin Chart 2: Task Trends Grouped Bar Chart ──
  const trendChartData = useMemo(() => {
    const rawTrends = Array.isArray(data?.trendData) ? data.trendData : [];
    const labels = rawTrends.map((t) => t.date);
    const createdArr = rawTrends.map((t) => t.created || 0);
    const completedArr = rawTrends.map((t) => t.completed || 0);

    return {
      labels,
      datasets: [
        {
          label: "Tasks Created",
          data: createdArr,
          backgroundColor: "#3b82f6",
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
        {
          label: "Tasks Completed",
          data: completedArr,
          backgroundColor: "#10b981",
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.7,
        },
      ],
    };
  }, [data]);

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          font: { family: "Inter", size: 12, weight: "500" },
          color: "#64748b",
          usePointStyle: true,
          boxWidth: 8,
          padding: 14,
        },
      },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 10,
        cornerRadius: 6,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { family: "Inter", size: 11 },
          color: "#64748b",
          maxRotation: 0,
          minRotation: 0,
          autoSkip: true,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9" },
        ticks: { font: { family: "Inter", size: 11 }, color: "#64748b", stepSize: 1, precision: 0 },
      },
    },
  };

  // ── Admin Chart 3: Category Completion Time Horizontal Bar ──
  const categoryTimeData = useMemo(() => {
    const labels = categoryBreakdownList.map((c) => c.category);
    const days = categoryBreakdownList.map((c) => {
      const dur = c.avgDuration || {};
      const d = dur.days !== undefined ? Number(dur.days) : 0;
      return d;
    });

    return {
      labels,
      datasets: [
        {
          axis: "y",
          label: "Avg Duration (days)",
          data: days,
          backgroundColor: ["#3b82f6", "#06b6d4", "#f97316", "#a855f7", "#ec4899", "#10b981", "#6366f1", "#0ea5e9"],
          borderRadius: 4,
          barThickness: 14,
        },
      ],
    };
  }, [categoryBreakdownList]);

  const categoryTimeOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        callbacks: {
          label: (ctx) => {
            const cat = categoryBreakdownList[ctx.dataIndex];
            const dStr = formatDaysOnly(cat?.avgDuration);
            return `Avg Duration: ${dStr}`;
          },
        },
      },
    },
    scales: {
      x: {
        min: 0,
        grid: { color: "#f8fafc" },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
          callback: (val) => `${val}d`,
          font: { family: "Inter", size: 11 },
          color: "#94a3b8",
        },
      },
      y: {
        grid: { display: false },
        ticks: { font: { family: "Inter", size: 12, weight: "500" }, color: "#334155" },
      },
    },
  };

  // =========================================================================
  //                         EMPLOYEE VIEW RENDER
  // =========================================================================
  if (!isAdmin) {
    return (
      <>
        <Sidebar />
        <div className="common-page-container">
          <div className="ta-dashboard-layout">
            {/* ═════════ 1. TOP HEADER & FILTER PANEL (MY TASK ANALYTICS WITH FILTER ICON) ═════════ */}
            <div className="ta-overview-header-card mb-4" ref={filterRef}>
              <div className="ta-overview-bar">
                <h3 className="ta-overview-title">My Task Analytics</h3>

                <div className="ta-overview-right-controls">
                  <div
                    className={`dwu-employee-filter-icon ${showFilterMenu ? "active" : ""}`}
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    title="Filter Tasks"
                    style={{ cursor: "pointer" }}
                  >
                    <img src="/Filter.svg" alt="filter" />
                  </div>
                </div>
              </div>

              {/* Collapsible Filter Panel */}
              {showFilterMenu && (
                <div className="dwu-filter-row animate-slide-down">
                  <div className="row g-3 align-items-end">
                    {/* 1. Date Range */}
                    <div className="col-12 col-md-4 col-lg">
                      <label className="dwu-filter-label">Date Range</label>
                      <CustomDropdown
                        options={PERIOD_OPTIONS}
                        value={selectedPeriod}
                        onChange={(val) => {
                          setSelectedPeriod(val);
                          if (val !== "custom") {
                            setStartDate("");
                            setEndDate("");
                          }
                        }}
                        placeholder="All Time"
                      />
                    </div>

                    {/* 1b. Custom Dates (If selected) */}
                    {selectedPeriod === "custom" && (
                      <>
                        <div className="col-12 col-md-4 col-lg">
                          <label className="dwu-filter-label">From</label>
                          <input
                            type="date"
                            className="form-control dwu-date-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div className="col-12 col-md-4 col-lg">
                          <label className="dwu-filter-label">To</label>
                          <input
                            type="date"
                            className="form-control dwu-date-input"
                            min={startDate}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </>
                    )}

                    {/* 2. Department */}
                    <div className="col-12 col-md-4 col-lg">
                      <label className="dwu-filter-label">Department</label>
                      <CustomDropdown
                        options={departmentOptions}
                        value={selectedDepartment}
                        onChange={handleDepartmentChange}
                        placeholder="All Departments"
                      />
                    </div>

                    {/* 3. Designation */}
                    <div className="col-12 col-md-4 col-lg">
                      <label className="dwu-filter-label">Designation</label>
                      <CustomDropdown
                        options={designationOptions}
                        value={selectedDesignation}
                        onChange={handleDesignationChange}
                        placeholder="All Designations"
                      />
                    </div>

                    {/* 4. Select Employee */}
                    <div className="col-12 col-md-4 col-lg">
                      <label className="dwu-filter-label">Select Employee</label>
                      <CustomDropdown
                        options={employeeDropdownOptions}
                        value={selectedEmployee}
                        onChange={setSelectedEmployee}
                        placeholder="Select Employee"
                      />
                    </div>

                    {/* 5. All Project */}
                    <div className="col-12 col-md-4 col-lg">
                      <label className="dwu-filter-label">All Project</label>
                      <CustomDropdown
                        options={projectDropdownOptions}
                        value={selectedProject}
                        onChange={setSelectedProject}
                        placeholder="All Projects"
                      />
                    </div>

                    {/* 6. Action Buttons */}
                    <div className="col-12 d-flex justify-content-end mt-2">
                      <div className="d-flex mt-2" style={{ gap: "12px" }}>
                        <button
                          type="button"
                          className="hrms-common-btn-cancel"
                          onClick={() => {
                            setSelectedPeriod("all");
                            setStartDate("");
                            setEndDate("");
                            setSelectedDepartment("all");
                            setSelectedDesignation("all");
                            setSelectedEmployee("all");
                            setSelectedProject("all");
                            setShowFilterMenu(false);
                            setTimeout(() => fetchAnalytics(), 50);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="hrms-common-btn-primary"
                          onClick={() => {
                            fetchAnalytics();
                          }}
                          disabled={loading}
                        >
                          {loading ? "Searching..." : "Search"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── 2. Top Metric KPI Cards (4 Cards) ── */}
            <div className="ta-emp-kpi-row">
              {/* Card 1: Total Assigned Tasks */}
              <div className="ta-kpi-card-v2">
                <div className="ta-kpi-top">
                  <div className="ta-kpi-icon-box blue">
                    <Icon icon="solar:clipboard-check-bold" />
                  </div>
                  <div className="ta-kpi-data">
                    <span className="ta-kpi-label">Total Assigned Tasks</span>
                    <span className="ta-kpi-number">{summary.total}</span>
                  </div>
                </div>
                <div className="ta-kpi-bottom">
                  <div className="ta-kpi-trend">
                    <span className="ta-trend-text green">↑ 100%</span>
                    <span className="ta-trend-sub">assigned tasks</span>
                  </div>
                  <svg className="ta-sparkline" viewBox="0 0 60 20">
                    <path d="M 0 15 Q 15 5, 30 14 T 60 4" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Completed */}
              <div className="ta-kpi-card-v2">
                <div className="ta-kpi-top">
                  <div className="ta-kpi-icon-box green">
                    <Icon icon="solar:check-circle-bold" />
                  </div>
                  <div className="ta-kpi-data">
                    <span className="ta-kpi-label">Completed</span>
                    <span className="ta-kpi-number">{summary.completed}</span>
                  </div>
                </div>
                <div className="ta-kpi-bottom">
                  <div className="ta-kpi-trend">
                    <span className="ta-trend-text green">{summary.completionRate}% completion rate</span>
                  </div>
                  <svg className="ta-sparkline" viewBox="0 0 60 20">
                    <path d="M 0 16 Q 15 12, 30 8 T 60 2" fill="none" stroke="#10b981" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>

              {/* Card 3: In Progress */}
              <div className="ta-kpi-card-v2">
                <div className="ta-kpi-top">
                  <div className="ta-kpi-icon-box orange">
                    <Icon icon="solar:hourglass-bold" />
                  </div>
                  <div className="ta-kpi-data">
                    <span className="ta-kpi-label">In Progress</span>
                    <span className="ta-kpi-number">{summary.inProgress}</span>
                  </div>
                </div>
                <div className="ta-kpi-bottom">
                  <div className="ta-kpi-trend">
                    <span className="ta-trend-sub">
                      {summary.total > 0 ? Math.round((summary.inProgress / summary.total) * 100) : 0}% of total
                    </span>
                  </div>
                  <svg className="ta-sparkline" viewBox="0 0 60 20">
                    <path d="M 0 8 Q 15 16, 30 10 T 60 14" fill="none" stroke="#f97316" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>

              {/* Card 4: Pending */}
              <div className="ta-kpi-card-v2">
                <div className="ta-kpi-top">
                  <div className="ta-kpi-icon-box pink">
                    <Icon icon="solar:clock-circle-bold" />
                  </div>
                  <div className="ta-kpi-data">
                    <span className="ta-kpi-label">Pending</span>
                    <span className="ta-kpi-number">{summary.pending}</span>
                  </div>
                </div>
                <div className="ta-kpi-bottom">
                  <div className="ta-kpi-trend">
                    <span className="ta-trend-sub">
                      {summary.total > 0 ? Math.round((summary.pending / summary.total) * 100) : 0}% of total
                    </span>
                  </div>
                  <svg className="ta-sparkline" viewBox="0 0 60 20">
                    <path d="M 0 10 Q 15 6, 30 14 T 60 16" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* ── 3. Row 3: 2 Cards Grid (Status Distribution & Avg Completion Time) ── */}
            <div className="ta-grid-2">
              {/* Card 1: Task Status Distribution */}
              <div className="ta-card-panel">
                <div className="ta-panel-header-simple">
                  <h3 className="ta-panel-title-v2">Task Status Distribution</h3>
                  <span className="ta-panel-subtitle-v2">Your task status overview</span>
                </div>

                <div className="ta-status-dist-container">
                  <div className="ta-donut-box">
                    <Doughnut data={empStatusDonutData} options={statusDonutOptions} />
                    <div className="ta-donut-center-v2">
                      <span className="ta-donut-num">{summary.total}</span>
                      <span className="ta-donut-lbl">Total Tasks</span>
                    </div>
                  </div>

                  <div className="ta-donut-legend">
                    <div className="ta-legend-row">
                      <span className="ta-leg-dot green" />
                      <span className="ta-leg-label">Completed</span>
                      <span className="ta-leg-value">{summary.completed}</span>
                    </div>
                    <div className="ta-legend-row">
                      <span className="ta-leg-dot orange" />
                      <span className="ta-leg-label">In Progress</span>
                      <span className="ta-leg-value">{summary.inProgress}</span>
                    </div>
                    <div className="ta-legend-row">
                      <span className="ta-leg-dot pink" />
                      <span className="ta-leg-label">Pending</span>
                      <span className="ta-leg-value">{summary.pending}</span>
                    </div>
                    <div className="ta-legend-row">
                      <span className="ta-leg-dot purple" />
                      <span className="ta-leg-label">On Hold</span>
                      <span className="ta-leg-value">{summary.onHold}</span>
                    </div>
                    <div className="ta-legend-row">
                      <span className="ta-leg-dot red" />
                      <span className="ta-leg-label">Rejected</span>
                      <span className="ta-leg-value">{summary.rejected}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Average Completion Time */}
              <div className="ta-card-panel">
                <div className="ta-panel-header-simple">
                  <h3 className="ta-panel-title-v2">Average Completion Time</h3>
                  <span className="ta-panel-subtitle-v2">Time taken to complete your tasks</span>
                </div>

                <div className="ta-avg-time-section">
                  <div className="ta-main-time-row">
                    <span className="ta-big-duration">{avgStats.teamAverage}</span>
                    <span className="ta-badge-pill green">
                      <Icon icon="solar:arrow-down-linear" /> 18%
                    </span>
                  </div>
                  <span className="ta-time-caption">Average time per task</span>

                  <div className="ta-sub-time-grid">
                    <div className="ta-time-subcard orange-tint">
                      <div className="ta-subcard-icon yellow">
                        <Icon icon="solar:bolt-bold" />
                      </div>
                      <span className="ta-subcard-val">{avgStats.fastest}</span>
                      <span className="ta-subcard-lbl">Fastest</span>
                    </div>

                    <div className="ta-time-subcard pink-tint">
                      <div className="ta-subcard-icon pink">
                        <Icon icon="solar:stopwatch-bold" />
                      </div>
                      <span className="ta-subcard-val">{avgStats.slowest}</span>
                      <span className="ta-subcard-lbl">Slowest</span>
                    </div>

                    <div className="ta-time-subcard purple-tint">
                      <div className="ta-subcard-icon purple">
                        <Icon icon="solar:clock-circle-bold" />
                      </div>
                      <span className="ta-subcard-val">{avgStats.teamAverage}</span>
                      <span className="ta-subcard-lbl">Average</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 4. Row 4: 2 Cards Grid (Task Completion Trend & Recent Activity) ── */}
            <div className="ta-grid-2">
              {/* Card 1: Task Completion Trend */}
              <div className="ta-card-panel">
                <div className="ta-panel-header-flex">
                  <div>
                    <h3 className="ta-panel-title-v2">Task Completion Trend</h3>
                    <span className="ta-panel-subtitle-v2">Your task progress over time</span>
                  </div>
                  <div className="ta-emp-custom-dropdown" style={{ minWidth: "140px" }}>
                    <CustomDropdown
                      options={EMP_TREND_OPTIONS}
                      value={empTrendRange}
                      onChange={(val) => setEmpTrendRange(val)}
                      placeholder="Select Range"
                    />
                  </div>
                </div>

                <div className="ta-trend-chart-wrapper" style={{ height: "180px", width: "100%", marginTop: "8px" }}>
                  <Bar data={empTrendChartData} options={empTrendChartOptions} />
                </div>
              </div>

              {/* Card 2: Recent Activity */}
              <div className="ta-card-panel">
                <div className="ta-panel-header-simple">
                  <h3 className="ta-panel-title-v2">Recent Activity</h3>
                  <span className="ta-panel-subtitle-v2">Your latest task updates</span>
                </div>

                <div className="ta-emp-activity-list">
                  {employeeActivities.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "12.5px" }}>
                      No recent activity recorded
                    </div>
                  ) : (
                    employeeActivities.map((act) => (
                      <div key={act.id} className="ta-emp-activity-item">
                        <div className="ta-emp-act-icon-box" style={{ color: act.color, backgroundColor: `${act.color}15` }}>
                          <Icon icon={act.icon} />
                        </div>
                        <div className="ta-emp-act-content">
                          <span className="ta-emp-act-title">{act.action}</span>
                          <span className="ta-emp-act-time">{act.date} {act.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── 5. Row 5: My Tasks Table in a Separate Full-Width Container ── */}
            <div className="ta-card-panel ta-section-single ta-emp-tasks-panel">
              <div className="ta-panel-header-flex ta-emp-table-header">
                <div>
                  <h3 className="ta-panel-title-v2">My Tasks</h3>
                  <span className="ta-panel-subtitle-v2">All tasks assigned to you</span>
                </div>
                <div className="ta-emp-filter-controls">
                  <div className="ta-emp-tabs-group">
                    <button
                      type="button"
                      className={`ta-emp-tab-btn ${empActiveTab === "all" ? "active" : ""}`}
                      onClick={() => { setEmpActiveTab("all"); setEmpCurrentPage(1); }}
                    >
                      All ({empCounts.all})
                    </button>
                    <button
                      type="button"
                      className={`ta-emp-tab-btn ${empActiveTab === "completed" ? "active" : ""}`}
                      onClick={() => { setEmpActiveTab("completed"); setEmpCurrentPage(1); }}
                    >
                      Completed ({empCounts.completed})
                    </button>
                    <button
                      type="button"
                      className={`ta-emp-tab-btn ${empActiveTab === "in_progress" ? "active" : ""}`}
                      onClick={() => { setEmpActiveTab("in_progress"); setEmpCurrentPage(1); }}
                    >
                      In Progress ({empCounts.inProgress})
                    </button>
                    <button
                      type="button"
                      className={`ta-emp-tab-btn ${empActiveTab === "pending" ? "active" : ""}`}
                      onClick={() => { setEmpActiveTab("pending"); setEmpCurrentPage(1); }}
                    >
                      Pending ({empCounts.pending})
                    </button>
                  </div>
                  <div className="ta-emp-custom-dropdown" style={{ minWidth: "140px" }}>
                    <CustomDropdown
                      options={EMP_SORT_OPTIONS}
                      value={empSortBy}
                      onChange={(val) => setEmpSortBy(val)}
                      placeholder="Sort by"
                    />
                  </div>
                  <div className="ta-emp-custom-dropdown page-size" style={{ minWidth: "115px" }}>
                    <CustomDropdown
                      options={EMP_PAGE_SIZE_OPTIONS}
                      value={empPageSize}
                      onChange={(val) => {
                        setEmpPageSize(Number(val));
                        setEmpCurrentPage(1);
                      }}
                      placeholder="Page size"
                    />
                  </div>
                </div>
              </div>

              <div className="ta-table-wrap">
                <table className="ta-data-table ta-emp-table">
                  <thead>
                    <tr>
                      <th style={{ width: "30px" }}>#</th>
                      <th>Task Name</th>
                      <th>Project / Module</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assigned Date</th>
                      <th>Due Date</th>
                      <th>Time Spent</th>
                      <th style={{ textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployeeTasks.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                          No tasks found matching current filter
                        </td>
                      </tr>
                    ) : (
                      paginatedEmployeeTasks.map((t, idx) => {
                        const pKey = (t.priority || "Low").toLowerCase();
                        const priorityClass = pKey === "high" ? "high" : pKey === "medium" || pKey === "mid" ? "medium" : "low";

                        const sKey = (t.status || "Pending").toLowerCase();
                        const isCompleted = sKey === "completed";
                        const isInProgress = sKey.includes("progress") || sKey.includes("process");
                        const isRejected = sKey.includes("reject") || sKey.includes("ignore");
                        const statusClass = isCompleted ? "completed" : isInProgress ? "inprogress" : isRejected ? "rejected" : "pending";

                        const globalIdx = (empCurrentPage - 1) * empPageSize + idx + 1;

                        return (
                          <tr key={t._id || idx}>
                            <td className="ta-col-rank">{globalIdx}</td>
                            <td className="ta-task-title-v2">{t.taskName}</td>
                            <td className="ta-col-team">{t.project}</td>
                            <td>
                              <span className={`ta-emp-priority-pill ${priorityClass}`}>
                                {t.priority}
                              </span>
                            </td>
                            <td>
                              <span className={`ta-emp-status-pill ${statusClass}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="ta-col-date">{t.assignedDate}</td>
                            <td className="ta-col-date">{t.dueDate}</td>
                            <td className="ta-col-dur">{t.timeSpent}</td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="ta-emp-btn-view"
                                onClick={() => setSelectedViewTaskId(t._id)}
                                title="View Task Details"
                              >
                                <Icon icon="solar:eye-linear" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {totalFilteredEmpTasks > 0 && (
                <div className="ta-table-pagination-footer">
                  <div className="d-flex align-items-center" style={{ gap: "12px", flexWrap: "wrap" }}>
                    <span className="ta-pagination-info">
                      Showing{" "}
                      <strong>
                        {Math.min((empCurrentPage - 1) * empPageSize + 1, totalFilteredEmpTasks)}
                      </strong>{" "}
                      to{" "}
                      <strong>
                        {Math.min(empCurrentPage * empPageSize, totalFilteredEmpTasks)}
                      </strong>{" "}
                      of <strong>{totalFilteredEmpTasks}</strong> tasks
                    </span>
                    {/* <div className="ta-page-size-selector">
                      <span>Per page:</span>
                      <select
                        className="ta-select-page-size"
                        value={empPageSize}
                        onChange={(e) => {
                          setEmpPageSize(Number(e.target.value));
                          setEmpCurrentPage(1);
                        }}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div> */}
                  </div>
                  <Pagination
                    totalItems={totalFilteredEmpTasks}
                    pageSize={empPageSize}
                    currentPage={empCurrentPage}
                    onPageChange={(page) => setEmpCurrentPage(page)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task Details Modal on View click */}
        {selectedViewTaskId && (
          <TaskDetailsModal
            taskId={selectedViewTaskId}
            onClose={() => setSelectedViewTaskId(null)}
          />
        )}
      </>
    );
  }

  // =========================================================================
  //                          ADMIN VIEW RENDER
  // =========================================================================
  return (
    <>
      <Sidebar />
      <div className="common-page-container">
        <div className="ta-dashboard-layout">
          {/* ═════════ 1. TOP HEADER & FILTER PANEL (TASK OVERVIEW WITH FILTER ICON) ═════════ */}
          <div className="ta-overview-header-card mb-4" ref={filterRef}>
            <div className="ta-overview-bar">
              <h3 className="ta-overview-title">Task Overview</h3>

              <div className="ta-overview-right-controls">
                <div
                  className={`dwu-employee-filter-icon ${showFilterMenu ? "active" : ""}`}
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  title="Filter Tasks"
                  style={{ cursor: "pointer" }}
                >
                  <img src="/Filter.svg" alt="filter" />
                </div>
              </div>
            </div>

            {/* Collapsible Filter Panel matching 2nd image */}
            {showFilterMenu && (
              <div className="dwu-filter-row animate-slide-down">
                <div className="row g-3 align-items-end">
                  {/* 1. Date Range */}
                  <div className="col-12 col-md-4 col-lg">
                    <label className="dwu-filter-label">Date Range</label>
                    <CustomDropdown
                      options={PERIOD_OPTIONS}
                      value={selectedPeriod}
                      onChange={(val) => {
                        setSelectedPeriod(val);
                        if (val !== "custom") {
                          setStartDate("");
                          setEndDate("");
                        }
                      }}
                      placeholder="All Time"
                    />
                  </div>

                  {/* 1b. Custom Dates (If selected) */}
                  {selectedPeriod === "custom" && (
                    <>
                      <div className="col-12 col-md-4 col-lg">
                        <label className="dwu-filter-label">From</label>
                        <input
                          type="date"
                          className="form-control dwu-date-input"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="col-12 col-md-4 col-lg">
                        <label className="dwu-filter-label">To</label>
                        <input
                          type="date"
                          className="form-control dwu-date-input"
                          min={startDate}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* 2. Department */}
                  <div className="col-12 col-md-4 col-lg">
                    <label className="dwu-filter-label">Department</label>
                    <CustomDropdown
                      options={departmentOptions}
                      value={selectedDepartment}
                      onChange={handleDepartmentChange}
                      placeholder="All Departments"
                    />
                  </div>

                  {/* 3. Designation */}
                  <div className="col-12 col-md-4 col-lg">
                    <label className="dwu-filter-label">Designation</label>
                    <CustomDropdown
                      options={designationOptions}
                      value={selectedDesignation}
                      onChange={handleDesignationChange}
                      placeholder="All Designations"
                    />
                  </div>

                  {/* 4. Select Employee */}
                  <div className="col-12 col-md-4 col-lg">
                    <label className="dwu-filter-label">Select Employee</label>
                    <CustomDropdown
                      options={employeeDropdownOptions}
                      value={selectedEmployee}
                      onChange={setSelectedEmployee}
                      placeholder="Select Employee"
                    />
                  </div>

                  {/* 5. All Project */}
                  <div className="col-12 col-md-4 col-lg">
                    <label className="dwu-filter-label">All Project</label>
                    <CustomDropdown
                      options={projectDropdownOptions}
                      value={selectedProject}
                      onChange={setSelectedProject}
                      placeholder="All Projects"
                    />
                  </div>

                  {/* 6. Action Buttons */}
                  <div className="col-12 d-flex justify-content-end mt-2">
                    <div className="d-flex mt-2" style={{ gap: "12px" }}>
                      <button
                        type="button"
                        className="hrms-common-btn-cancel"
                        onClick={() => {
                          setSelectedPeriod("all");
                          setStartDate("");
                          setEndDate("");
                          setSelectedDepartment("all");
                          setSelectedDesignation("all");
                          setSelectedEmployee("all");
                          setSelectedProject("all");
                          setShowFilterMenu(false);
                          setTimeout(() => fetchAnalytics(), 50);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="hrms-common-btn-primary"
                        onClick={() => {
                          fetchAnalytics();
                        }}
                        disabled={loading}
                      >
                        {loading ? "Searching..." : "Search"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═════════ 2. TOP METRIC KPI CARDS (5 CARDS) ═════════ */}
          <div className="ta-kpi-row">
            {/* Card 1: Total Tasks */}
            <div className="ta-kpi-card-v2">
              <div className="ta-kpi-top">
                <div className="ta-kpi-icon-box blue">
                  <Icon icon="solar:document-text-bold" />
                </div>
                <div className="ta-kpi-data">
                  <span className="ta-kpi-label">Total Tasks</span>
                  <span className="ta-kpi-number">{summary.total}</span>
                </div>
              </div>
              <div className="ta-kpi-bottom">
                <div className="ta-kpi-trend">
                  <span className="ta-trend-text green">↑ 100%</span>
                  <span className="ta-trend-sub">all tasks</span>
                </div>
                <svg className="ta-sparkline" viewBox="0 0 60 20">
                  <path d="M 0 15 Q 15 5, 30 14 T 60 4" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                </svg>
              </div>
            </div>

            {/* Card 2: Completed */}
            <div className="ta-kpi-card-v2">
              <div className="ta-kpi-top">
                <div className="ta-kpi-icon-box green">
                  <Icon icon="solar:check-circle-bold" />
                </div>
                <div className="ta-kpi-data">
                  <span className="ta-kpi-label">Completed</span>
                  <span className="ta-kpi-number">{summary.completed}</span>
                </div>
              </div>
              <div className="ta-kpi-bottom">
                <div className="ta-kpi-trend">
                  <span className="ta-trend-text green">{summary.completionRate}% completion rate</span>
                </div>
                <svg className="ta-sparkline" viewBox="0 0 60 20">
                  <path d="M 0 16 Q 15 12, 30 8 T 60 2" fill="none" stroke="#10b981" strokeWidth="2.5" />
                </svg>
              </div>
            </div>

            {/* Card 3: In Progress */}
            <div className="ta-kpi-card-v2">
              <div className="ta-kpi-top">
                <div className="ta-kpi-icon-box orange">
                  <Icon icon="solar:hourglass-bold" />
                </div>
                <div className="ta-kpi-data">
                  <span className="ta-kpi-label">In Progress</span>
                  <span className="ta-kpi-number">{summary.inProgress}</span>
                </div>
              </div>
              <div className="ta-kpi-bottom">
                <div className="ta-kpi-trend">
                  <span className="ta-trend-sub">
                    {summary.total > 0 ? Math.round((summary.inProgress / summary.total) * 100) : 0}% of total
                  </span>
                </div>
                <svg className="ta-sparkline" viewBox="0 0 60 20">
                  <path d="M 0 8 Q 15 16, 30 10 T 60 14" fill="none" stroke="#f97316" strokeWidth="2.5" />
                </svg>
              </div>
            </div>

            {/* Card 4: Pending */}
            <div className="ta-kpi-card-v2">
              <div className="ta-kpi-top">
                <div className="ta-kpi-icon-box pink">
                  <Icon icon="solar:clock-circle-bold" />
                </div>
                <div className="ta-kpi-data">
                  <span className="ta-kpi-label">Pending</span>
                  <span className="ta-kpi-number">{summary.pending}</span>
                </div>
              </div>
              <div className="ta-kpi-bottom">
                <div className="ta-kpi-trend">
                  <span className="ta-trend-sub">
                    {summary.total > 0 ? Math.round((summary.pending / summary.total) * 100) : 0}% of total
                  </span>
                </div>
                <svg className="ta-sparkline" viewBox="0 0 60 20">
                  <path d="M 0 10 Q 15 6, 30 14 T 60 16" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                </svg>
              </div>
            </div>

            {/* Card 5: On Hold */}
            <div className="ta-kpi-card-v2">
              <div className="ta-kpi-top">
                <div className="ta-kpi-icon-box purple">
                  <Icon icon="solar:pause-circle-bold" />
                </div>
                <div className="ta-kpi-data">
                  <span className="ta-kpi-label">On Hold</span>
                  <span className="ta-kpi-number">{summary.onHold}</span>
                </div>
              </div>
              <div className="ta-kpi-bottom">
                <div className="ta-kpi-trend">
                  <span className="ta-trend-sub">
                    {summary.total > 0 ? Math.round((summary.onHold / summary.total) * 100) : 0}% of total
                  </span>
                </div>
                <svg className="ta-sparkline" viewBox="0 0 60 20">
                  <path d="M 0 6 Q 15 16, 30 8 T 60 15" fill="none" stroke="#a855f7" strokeWidth="2.5" />
                </svg>
              </div>
            </div>
          </div>

          {/* ═════════ 3. ANALYTICS ROW 2 (SIDE BY SIDE 2 CARDS) ═════════ */}
          <div className="ta-grid-2">
            {/* Card 1: Task Status Distribution */}
            <div className="ta-card-panel">
              <div className="ta-panel-header-simple">
                <h3 className="ta-panel-title-v2">Task Status Distribution</h3>
                <span className="ta-panel-subtitle-v2">Overall distribution of tasks</span>
              </div>

              <div className="ta-status-dist-container">
                <div className="ta-donut-box">
                  <Doughnut data={statusDonutData} options={statusDonutOptions} />
                  <div className="ta-donut-center-v2">
                    <span className="ta-donut-num">{summary.total}</span>
                    <span className="ta-donut-lbl">Total Tasks</span>
                  </div>
                </div>

                <div className="ta-donut-legend">
                  <div className="ta-legend-row">
                    <span className="ta-leg-dot green" />
                    <span className="ta-leg-label">Completed</span>
                    <span className="ta-leg-value">{summary.completed}</span>
                  </div>
                  <div className="ta-legend-row">
                    <span className="ta-leg-dot orange" />
                    <span className="ta-leg-label">In Progress</span>
                    <span className="ta-leg-value">{summary.inProgress}</span>
                  </div>
                  <div className="ta-legend-row">
                    <span className="ta-leg-dot pink" />
                    <span className="ta-leg-label">Pending</span>
                    <span className="ta-leg-value">{summary.pending}</span>
                  </div>
                  <div className="ta-legend-row">
                    <span className="ta-leg-dot purple" />
                    <span className="ta-leg-label">On Hold</span>
                    <span className="ta-leg-value">{summary.onHold}</span>
                  </div>
                  <div className="ta-legend-row">
                    <span className="ta-leg-dot red" />
                    <span className="ta-leg-label">Rejected</span>
                    <span className="ta-leg-value">{summary.rejected}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Average Completion Time */}
            <div className="ta-card-panel">
              <div className="ta-panel-header-simple">
                <h3 className="ta-panel-title-v2">Average Completion Time</h3>
                <span className="ta-panel-subtitle-v2">Time taken to complete tasks</span>
              </div>

              <div className="ta-avg-time-section">
                <div className="ta-main-time-row">
                  <span className="ta-big-duration">{avgStats.teamAverage}</span>
                  <span className="ta-badge-pill green">
                    <Icon icon="solar:arrow-down-linear" /> Average
                  </span>
                </div>
                <span className="ta-time-caption">Average time per task</span>

                <div className="ta-sub-time-grid">
                  <div className="ta-time-subcard orange-tint">
                    <div className="ta-subcard-icon yellow">
                      <Icon icon="solar:bolt-bold" />
                    </div>
                    <span className="ta-subcard-val">{avgStats.fastest}</span>
                    <span className="ta-subcard-lbl">Fastest</span>
                  </div>

                  <div className="ta-time-subcard pink-tint">
                    <div className="ta-subcard-icon pink">
                      <Icon icon="solar:stopwatch-bold" />
                    </div>
                    <span className="ta-subcard-val">{avgStats.slowest}</span>
                    <span className="ta-subcard-lbl">Slowest</span>
                  </div>

                  <div className="ta-time-subcard purple-tint">
                    <div className="ta-subcard-icon purple">
                      <Icon icon="solar:users-group-rounded-bold" />
                    </div>
                    <span className="ta-subcard-val">{avgStats.teamAverage}</span>
                    <span className="ta-subcard-lbl">Team Average</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═════════ 3. TASK COMPLETION TIME ANALYSIS (REPLACED TASK TRENDS) ═════════ */}
          <div className="ta-section-single" style={{ marginTop: "20px" }}>
            <div className="ta-card-panel">
              <div className="ta-panel-header-simple">
                <h3 className="ta-panel-title-v2">Task Completion Time Analysis</h3>
                <span className="ta-panel-subtitle-v2">Time taken to complete tasks across different categories</span>
              </div>

              <div
                className="ta-horiz-bar-wrap"
                style={{
                  height: `${Math.max(200, categoryBreakdownList.length * 36 + 40)}px`,
                }}
              >
                <div className="ta-horiz-bar-canvas">
                  <Bar data={categoryTimeData} options={categoryTimeOptions} />
                </div>
                <div
                  className="ta-custom-bar-badges"
                  style={{
                    height: `${Math.max(200, categoryBreakdownList.length * 36 + 40)}px`,
                  }}
                >
                  {categoryBreakdownList.map((c, i) => {
                    const badgeClasses = ["dev", "test", "doc", "meet", "oth"];
                    const bClass = badgeClasses[i % badgeClasses.length];
                    return (
                      <span key={c.category} className={`ta-bar-val-badge ${bClass}`}>
                        {formatDaysOnly(c.avgDuration)}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ═════════ 4. ANALYTICS ROW 3 (2 TABLES) ═════════ */}
          <div className="ta-grid-2">
            {/* Table 1: Top Performing Employees */}
            <div className="ta-card-panel">
              <div className="ta-panel-header-flex">
                <div>
                  <h3 className="ta-panel-title-v2">Top Performing Employees</h3>
                  <span className="ta-panel-subtitle-v2">Based on completed tasks and efficiency</span>
                </div>
                {topEmployees.length > 0 && (
                  <button
                    className="ta-btn-link"
                    onClick={() => handleOpenEmployeeModal(topEmployees[0])}
                  >
                    View Top
                  </button>
                )}
              </div>

              <div className="ta-table-wrap">
                <table className="ta-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "30px" }}>#</th>
                      <th>Employee</th>
                      <th>Total Tasks</th>
                      <th>Completed</th>
                      <th>Completion Rate</th>
                      <th>Avg. Duration</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                          No employee performance records found
                        </td>
                      </tr>
                    ) : (
                      paginatedTopEmployees.map((emp, index) => {
                        const globalIdx = (topEmpCurrentPage - 1) * TOP_EMP_PAGE_SIZE + index + 1;
                        return (
                          <tr
                            key={emp._id}
                            className="ta-row-clickable"
                            onClick={() => handleOpenEmployeeModal(emp)}
                            title="Click to view employee performance details"
                          >
                            <td className="ta-col-rank">{globalIdx}</td>
                            <td>
                              <div className="ta-emp-cell">
                                <img
                                  src={emp.avatarUrl || "/avatar.png"}
                                  alt={emp.name}
                                  className="ta-emp-avatar"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/avatar.png";
                                  }}
                                />
                                <span className="ta-emp-name">{emp.name}</span>
                              </div>
                            </td>
                            <td className="ta-col-num">{emp.totalTasks}</td>
                            <td className="ta-col-num">{emp.completed}</td>
                            <td className="ta-col-num">{emp.completionRate}%</td>
                            <td className="ta-col-dur">{emp.avgDuration}</td>
                            <td className="ta-col-num">
                              {emp.performanceScore !== null && emp.performanceScore !== undefined ? (
                                <span
                                  className="ta-score-badge"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "3px 8px",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    backgroundColor: emp.rankingEligible ? "#ecfdf5" : "#f1f5f9",
                                    color: emp.rankingEligible ? "#059669" : "#64748b",
                                    border: `1px solid ${emp.rankingEligible ? "#a7f3d0" : "#cbd5e1"}`,
                                  }}
                                  title={emp.confidenceLabel || (emp.rankingEligible ? "Ranking Eligible" : "Insufficient Data")}
                                >
                                  {emp.performanceScore}/100
                                  {!emp.rankingEligible && (
                                    <span style={{ fontSize: "10px", opacity: 0.8 }}>(low data)</span>
                                  )}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Top Employees Pagination Footer */}
              <div className="ta-table-pagination-footer" style={{ justifyContent: "center" }}>
                {/* <span className="ta-pagination-info">
                  Showing{" "}
                  <strong>
                    {topEmployees.length === 0 ? 0 : (topEmpCurrentPage - 1) * TOP_EMP_PAGE_SIZE + 1}
                  </strong>{" "}
                  to{" "}
                  <strong>
                    {Math.min(topEmpCurrentPage * TOP_EMP_PAGE_SIZE, topEmployees.length)}
                  </strong>{" "}
                  of <strong>{topEmployees.length}</strong> employees
                </span> */}
                <Pagination
                  totalItems={Math.max(1, topEmployees.length)}
                  pageSize={TOP_EMP_PAGE_SIZE}
                  currentPage={topEmpCurrentPage}
                  onPageChange={(page) => setTopEmpCurrentPage(page)}
                />
              </div>
            </div>

            {/* Table 2: Team-wise Task Overview */}
            <div className="ta-card-panel">
              <div className="ta-panel-header-flex">
                <div>
                  <h3 className="ta-panel-title-v2">Team-wise Task Overview</h3>
                  <span className="ta-panel-subtitle-v2">Tasks assigned to multiple team members</span>
                </div>
              </div>

              <div className="ta-table-wrap">
                <table className="ta-data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "35px" }}>#</th>
                      <th>Task Name</th>
                      <th>Team</th>
                      <th>Assignees</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th style={{ textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamOverview.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                          No collaborative team task records found
                        </td>
                      </tr>
                    ) : (
                      paginatedTeamOverview.map((tm, index) => {
                        const globalIdx = (teamOverviewCurrentPage - 1) * TEAM_OVERVIEW_PAGE_SIZE + index + 1;
                        const st = tm.status || "Pending";
                        const isComp = st.toLowerCase() === "completed";
                        const isProg = st.toLowerCase().includes("progress");
                        const isHold = st.toLowerCase().includes("hold");
                        const isRej = st.toLowerCase().includes("reject") || st.toLowerCase().includes("ignore");
                        const pillClass = isComp ? "completed" : isProg ? "inprogress" : isHold ? "onhold" : isRej ? "rejected" : "pending";

                        const taskTitleText = tm.taskName || tm.taskTitle || tm.title || "Task Item";
                        const teamText = tm.team || tm.project || tm.category || tm.department || "General";
                        const assigneesList = (Array.isArray(tm.assignees) && tm.assignees.length > 0)
                          ? tm.assignees
                          : ((Array.isArray(tm.assignedMembers) && tm.assignedMembers.length > 0)
                              ? tm.assignedMembers
                              : []);

                        let dueFormatted = "-";
                        if (tm.dueDate) {
                          try {
                            const d = new Date(tm.dueDate);
                            if (!isNaN(d.getTime())) {
                              dueFormatted = d.toLocaleDateString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              });
                            } else {
                              dueFormatted = String(tm.dueDate);
                            }
                          } catch (_) {
                            dueFormatted = String(tm.dueDate);
                          }
                        }

                        return (
                          <tr
                            key={tm._id || tm.taskId || index}
                            onClick={() => setSelectedViewTaskId(tm._id || tm.taskId)}
                            style={{ cursor: "pointer" }}
                            title="Click to view task details and member statuses"
                          >
                            <td className="ta-col-rank">{globalIdx}</td>
                            <td className="ta-task-title-v2">{taskTitleText}</td>
                            <td className="ta-col-team">{teamText}</td>
                            <td>
                              <div className="ta-avatar-stack">
                                {assigneesList.length === 0 ? (
                                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>
                                ) : (
                                  assigneesList.slice(0, 4).map((a, i) => {
                                    const aAvatar = typeof a === "string" ? a : (a?.avatarUrl || a?.photo || a?.profileImage || a?.avatar || "/avatar.png");
                                    const aName = typeof a === "string" ? a : (a?.name || a?.employeeName || `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || a?.email || "Member");
                                    return (
                                      <img
                                        key={i}
                                        src={aAvatar || "/avatar.png"}
                                        alt={aName}
                                        title={aName}
                                        className="ta-stacked-avatar"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = "/avatar.png";
                                        }}
                                      />
                                    );
                                  })
                                )}
                                {assigneesList.length > 4 && (
                                  <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>
                                    +{assigneesList.length - 4}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`ta-status-pill-v2 ${pillClass}`}>{st}</span>
                            </td>
                            <td className="ta-col-date">{dueFormatted}</td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                className="ta-emp-btn-view"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedViewTaskId(tm._id || tm.taskId);
                                }}
                                title="View Task Details"
                              >
                                <Icon icon="solar:eye-linear" />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Team Overview Pagination Footer */}
              <div className="ta-table-pagination-footer" style={{ justifyContent: "center" }}>
                <Pagination
                  totalItems={Math.max(1, teamOverview.length)}
                  pageSize={TEAM_OVERVIEW_PAGE_SIZE}
                  currentPage={teamOverviewCurrentPage}
                  onPageChange={(page) => setTeamOverviewCurrentPage(page)}
                />
              </div>
            </div>
          </div>

          {/* ═════════ 6. RECENT TEAM TASKS (SEPARATE CONTAINER) ═════════ */}
          <div className="ta-section-single">
            <div className="ta-card-panel">
              <div className="ta-panel-header-flex">
                <div>
                  <h3 className="ta-panel-title-v2">Recent Team Tasks</h3>
                  <span className="ta-panel-subtitle-v2">Latest tasks across the organization</span>
                </div>
                <div className="ta-header-pagination-actions">
                  <div className="ta-page-size-selector">
                    <span className="ta-page-size-label">Show:</span>
                    <div className="ta-compact-custom-dropdown">
                      <CustomDropdown
                        options={RECENT_TASKS_PAGE_SIZE_OPTIONS}
                        value={recentTasksPageSize}
                        onChange={(val) => {
                          setRecentTasksPageSize(Number(val));
                          setRecentTasksCurrentPage(1);
                        }}
                        className="ta-page-size-dropdown"
                        placeholder="5"
                      />
                    </div>
                  </div>
                  {/* <button
                    className="ta-btn-link"
                    onClick={() => {
                      setRecentTasksPageSize(totalRecentTasks || 50);
                      setRecentTasksCurrentPage(1);
                    }}
                  >
                    View All
                  </button> */}
                </div>
              </div>

              <div className="ta-table-wrap">
                <table className="ta-data-table">
                  <thead>
                    <tr>
                      <th>Task Name</th>
                      <th>Team</th>
                      <th>Assignees</th>
                      <th>Status</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecentTasks.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                          No team tasks found
                        </td>
                      </tr>
                    ) : (
                      paginatedRecentTasks.map((t) => {
                        const st = t.status || "In Progress";
                        const isComp = st.toLowerCase() === "completed";
                        const isProg = st.toLowerCase().includes("progress");
                        const isHold = st.toLowerCase().includes("hold");
                        const isRej = st.toLowerCase().includes("reject") || st.toLowerCase().includes("ignore");
                        const pillClass = isComp ? "completed" : isProg ? "inprogress" : isHold ? "onhold" : isRej ? "rejected" : "pending";

                        const taskTitleText = t.taskName || t.taskTitle || t.title || t.name || "Task Item";
                        const teamText = t.team || t.project || t.category || t.department || "General";
                        const assigneesList = (Array.isArray(t.assignees) && t.assignees.length > 0)
                          ? t.assignees
                          : ((Array.isArray(t.assignedMembers) && t.assignedMembers.length > 0)
                              ? t.assignedMembers
                              : (t.createdBy ? [t.createdBy] : []));

                        let dueFormatted = "-";
                        if (t.dueDate) {
                          try {
                            const d = new Date(t.dueDate);
                            if (!isNaN(d.getTime())) {
                              dueFormatted = d.toLocaleDateString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                              });
                            } else {
                              dueFormatted = String(t.dueDate);
                            }
                          } catch (_) {
                            dueFormatted = String(t.dueDate);
                          }
                        }

                        return (
                          <tr
                            key={t._id || t.id}
                            onClick={() => setSelectedViewTaskId(t._id || t.id)}
                            style={{ cursor: "pointer" }}
                            title="Click to view task details"
                          >
                            <td className="ta-task-title-v2">{taskTitleText}</td>
                            <td className="ta-col-team">{teamText}</td>
                            <td>
                              <div className="ta-avatar-stack">
                                {assigneesList.length === 0 ? (
                                  <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>
                                ) : (
                                  assigneesList.slice(0, 3).map((a, i) => {
                                    const aAvatar = typeof a === "string" ? a : (a?.avatarUrl || a?.photo || a?.profileImage || a?.avatar || "/avatar.png");
                                    const aName = typeof a === "string" ? a : (a?.name || a?.employeeName || `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || a?.email || "Member");
                                    return (
                                      <img
                                        key={i}
                                        src={aAvatar || "/avatar.png"}
                                        alt={aName}
                                        title={aName}
                                        className="ta-stacked-avatar"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = "/avatar.png";
                                        }}
                                      />
                                    );
                                  })
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`ta-status-pill-v2 ${pillClass}`}>{st}</span>
                            </td>
                            <td className="ta-col-date">{dueFormatted}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Footer */}
              {totalRecentTasks > 0 && (
                <div className="ta-table-pagination-footer">
                  <span className="ta-pagination-info">
                    Showing{" "}
                    <strong>
                      {Math.min((recentTasksCurrentPage - 1) * recentTasksPageSize + 1, totalRecentTasks)}
                    </strong>{" "}
                    to{" "}
                    <strong>
                      {Math.min(recentTasksCurrentPage * recentTasksPageSize, totalRecentTasks)}
                    </strong>{" "}
                    of <strong>{totalRecentTasks}</strong> tasks
                  </span>
                  <Pagination
                    totalItems={totalRecentTasks}
                    pageSize={recentTasksPageSize}
                    currentPage={recentTasksCurrentPage}
                    onPageChange={(page) => setRecentTasksCurrentPage(page)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═════════ TASK DETAILS POPUP MODAL (Admin & Employee) ═════════ */}
      {selectedViewTaskId && (
        <TaskDetailsModal
          taskId={selectedViewTaskId}
          onClose={() => setSelectedViewTaskId(null)}
        />
      )}

      {/* ═════════ EMPLOYEE PERFORMANCE POPUP MODAL (Admin) ═════════ */}
      {selectedModalEmployee && (
        <EmployeePerformanceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          employee={selectedModalEmployee}
          allTasks={data?.tasks || []}
        />
      )}
    </>
  );
}
