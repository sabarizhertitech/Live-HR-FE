import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { portalInstance } from "../../Services/instance";
import "./TaskBanner.css";

/**
 * Helper to extract loggedInUserId from JWT token in sessionStorage
 */
const getUserIdFromSession = () => {
  try {
    const sessionData = sessionStorage.getItem("Erti-Portal");
    if (!sessionData) return null;
    const authData = JSON.parse(sessionData);
    const token = authData?.token;
    if (!token) return null;
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));
    return (payload?.id || payload?._id || "").toString();
  } catch {
    return null;
  }
};

const TaskBanner = ({ loggedInUserId: propUserId }) => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState(() => {
    try {
      const stored = sessionStorage.getItem("dismissed_task_banners");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const currentUserId = useMemo(() => {
    return (propUserId || getUserIdFromSession() || "").toString();
  }, [propUserId]);

  // Fetch tasks assigned to the current employee
  const fetchTasks = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const res = await portalInstance.get("/creat/tasks/dashboard?limit=100");
      if (res.data?.success || Array.isArray(res.data?.data)) {
        setTasks(res.data.data || []);
      }
    } catch (err) {
      console.error("TaskBanner fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle temporary dismiss for this session
  const handleDismiss = (bannerKey) => {
    setDismissedKeys((prev) => {
      const updated = [...prev, bannerKey];
      try {
        sessionStorage.setItem("dismissed_task_banners", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save dismissed banner to sessionStorage:", e);
      }
      return updated;
    });
  };

  const handleNavigateToTasks = () => {
    navigate("/emp/tasks");
  };

  // Helper date formatter
  const formatDueDisplay = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // Compute all qualifying banners for the logged-in employee
  const banners = useMemo(() => {
    if (!currentUserId || !Array.isArray(tasks) || tasks.length === 0) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = [];

    tasks.forEach((task) => {
      if (!task || !task._id) return;

      // ── 1. Check if this task is assigned to the current logged-in employee ──
      const isAssignedToMe =
        Array.isArray(task.assignedMembers) &&
        task.assignedMembers.some((m) => {
          const mId = typeof m === "object" ? (m?._id || m?.id) : m;
          return mId && mId.toString() === currentUserId;
        });

      // The banner must be visible ONLY to the employee who is assigned the task
      if (!isAssignedToMe) return;

      // Check if task was assigned by an admin or another employee (not self-created)
      const createdById =
        typeof task.createdBy === "object"
          ? (task.createdBy?._id || task.createdBy?.id)
          : task.createdBy;
      const isCreatedByMe = createdById && createdById.toString() === currentUserId;

      // Member specific status
      const myMemberStatus = Array.isArray(task.memberStatuses)
        ? task.memberStatuses.find((ms) => {
            const msId =
              typeof ms.employeeId === "object"
                ? (ms.employeeId?._id || ms.employeeId?.id)
                : ms.employeeId;
            return msId && msId.toString() === currentUserId;
          })
        : null;

      const assignedStatus = (
        myMemberStatus?.assignedStatus ||
        task.assignedStatus ||
        "Allocated"
      )
        .toLowerCase()
        .trim();

      const workStatus = (
        myMemberStatus?.status ||
        task.status ||
        "Assigned"
      )
        .toLowerCase()
        .trim();

      const isAccepted = assignedStatus === "accepted";
      const isRejected =
        assignedStatus === "rejected" ||
        workStatus === "rejected" ||
        workStatus === "ignored";
      const isCompleted = workStatus === "completed" || workStatus === "complete";

      // ── 2. Task Assignment Banner ──
      // Visible until the assigned employee accepts or rejects the task
      const assignmentKey = `task_assignment_${task._id}`;
      const isNewAssignment =
        !isCreatedByMe &&
        !isAccepted &&
        !isRejected &&
        !isCompleted &&
        (assignedStatus === "allocated" || assignedStatus === "assigned");

      if (isNewAssignment && !dismissedKeys.includes(assignmentKey)) {
        result.push({
          key: assignmentKey,
          taskId: task._id,
          type: "assignment",
          variantClass: "task-banner--assignment",
          icon: "solar:clipboard-add-bold-duotone",
          title: "A new task is assigned to you",
          taskTitle: task.taskTitle,
          message: `Task: "${task.taskTitle}"`,
          subtext: task.dueDate
            ? `Due Date: ${formatDueDisplay(task.dueDate)}`
            : (task.category ? `Category: ${task.category}` : ""),
          assignedBy:
            task.createdBy?.name ||
            task.createdBy?.employeeName ||
            "Admin/Lead"
        });
      }

      // ── 3. Task Due-Date Reminder Banner (Working Hours, Holiday & Leave adjusted) ──
      // Visible on the dashboard of the specific assigned employee until task is completed.
      // Source of truth: backend-calculated bannerState
      if (task.dueDate && !isCompleted && !isRejected) {
        if (task.bannerState && task.bannerState.show) {
          if (task.bannerState.type === "OVERDUE") {
            const overdueKey = `task_overdue_${task._id}`;
            if (!dismissedKeys.includes(overdueKey)) {
              result.push({
                key: overdueKey,
                taskId: task._id,
                type: "overdue",
                badgeText: "Overdue",
                variantClass: "task-banner--overdue",
                icon: "solar:danger-triangle-bold-duotone",
                title: task.bannerState.message || "Your assigned task is past its due date. Please complete it as soon as possible.",
                taskTitle: task.taskTitle,
                message: `Task: "${task.taskTitle}"`,
                subtext: `Was due on ${formatDueDisplay(task.dueDate)}`,
                isOverdue: true
              });
            }
          } else if (task.bannerState.type === "DUE_SOON" || task.bannerState.type === "DUE_TODAY") {
            const reminderKey = `task_approaching_${task._id}`;
            if (!dismissedKeys.includes(reminderKey)) {
              const badgeLabel = task.bannerState.type === "DUE_TODAY" ? "Due Today" : "Due Soon";
              const subLabel = task.bannerState.type === "DUE_TODAY"
                ? `Due today (${formatDueDisplay(task.dueDate)})`
                : `Due on ${formatDueDisplay(task.dueDate)}`;

              let bannerTitle = task.bannerState.type === "DUE_TODAY"
                ? "Task is due today. Please complete your task before the due date."
                : (task.bannerState.message || "Task deadline is approaching. Please complete your task before the due date.");

              // Ensure no time (e.g. "before 7:00 PM", "7:00 PM", "(final 4 working hours)") is shown
              bannerTitle = bannerTitle
                .replace(/before\s+\d{1,2}:\d{2}\s*(?:AM|PM)/i, "before the due date")
                .replace(/\(final\s+\d+\s+working\s+hours\)/i, "")
                .trim();

              result.push({
                key: reminderKey,
                taskId: task._id,
                type: "approaching",
                badgeText: badgeLabel,
                variantClass: "task-banner--approaching",
                icon: "solar:clock-circle-bold-duotone",
                title: bannerTitle,
                taskTitle: task.taskTitle,
                message: `Task: "${task.taskTitle}"`,
                subtext: subLabel,
                isApproaching: true
              });
            }
          }
        }
      }
    });

    return result;
  }, [tasks, currentUserId, dismissedKeys]);

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="task-banner-container">
      {banners.map((b) => (
        <div key={b.key} className={`task-banner ${b.variantClass}`}>
          <div className="task-banner__left">
            <div className="task-banner__icon-wrap">
              <Icon icon={b.icon} />
            </div>
            <div className="task-banner__text-group">
              <div className="task-banner__title-row">
                <h5 className="task-banner__title">{b.title}</h5>
                {b.type === "assignment" && (
                  <span className="task-banner__badge">New Assignment</span>
                )}
                {b.type === "approaching" && (
                  <span className="task-banner__badge">Due Soon</span>
                )}
                {b.type === "overdue" && (
                  <span className="task-banner__badge">Overdue</span>
                )}
              </div>
              <p className="task-banner__subtitle">
                <strong>{b.taskTitle}</strong>
                {b.subtext ? ` • ${b.subtext}` : ""}
              </p>
            </div>
          </div>

          <div className="task-banner__right">
            <button
              type="button"
              className="task-banner__view-btn"
              onClick={handleNavigateToTasks}
              title="View Tasks"
            >
              <span>View</span>
              <Icon icon="solar:arrow-right-linear" width={14} height={14} />
            </button>
            <button
              type="button"
              className="task-banner__close-btn"
              onClick={() => handleDismiss(b.key)}
              title="Close temporarily"
              aria-label="Close banner"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskBanner;
