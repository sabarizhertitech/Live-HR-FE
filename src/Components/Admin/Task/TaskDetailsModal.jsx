import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./TaskDetailsModal.css";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import attachIcon from "../../../assets/ant-design_file-add-filled.png";
import { portalInstance } from "../../../Services/instance";
import Updatetask from "./Adminupdate";
import EditAssignedTask from "./EditAssignedTask";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Document from "../../../../public/document.svg?url";
import "../../../Globel/Layout.css";
import closeIcon from "../../../assets/close.png";
/* ═══════════════════════════════════════════════════════════════
   PHASE STATUS BADGE COMPONENT
═══════════════════════════════════════════════════════════════ */
const STATUS_COLORS = {
  pending: { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
  inprocess: { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  hold: { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  completed: { bg: "#dcfce7", text: "#166534", dot: "#22c55e" },
};

function StatusBadge({ status = "pending" }) {
  const key = status.toLowerCase().replace(/\s+/g, "");
  const col = STATUS_COLORS[key] || STATUS_COLORS.pending;
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      background: col.bg,
      color: col.text,
      borderRadius: 20,
      padding: "3px 12px",
      fontSize: 11,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

const calculateOverallTaskDays = (task) => {
  if (!task) return 0;
  const startRaw = task.startDate || task.createdDate || task.createdAt;
  if (!startRaw) {
    return (task.phases || []).reduce((sum, p) => sum + (Number(p.workingDays) || 0), 0) || 1;
  }
  const startDate = new Date(startRaw);
  if (isNaN(startDate.getTime())) return 1;

  const isCompleted = (task.status || "").toLowerCase() === "completed";
  const endRaw = isCompleted
    ? (task.endDate || task.dueDate || startRaw)
    : (task.endDate || new Date());

  const endDate = new Date(endRaw);
  if (isNaN(endDate.getTime())) return 1;

  const getLocalDateStr = (d) => {
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "";
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
  };

  const startStr = getLocalDateStr(startDate);
  const endStr = getLocalDateStr(endDate);

  if (!startStr || !endStr || startStr > endStr) return 1;

  const d1 = new Date(startStr + "T00:00:00");
  const d2 = new Date(endStr + "T00:00:00");
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
};

const renderDescription = (desc) => {
  if (!desc || !desc.trim()) return null;

  // Split by newlines first
  const rawLines = desc.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // If any line contains multiple bullet points (e.g. "• Point 1 • Point 2"), split them into separate lines
  const lines = [];
  rawLines.forEach(l => {
    if ((l.match(/•/g) || []).length > 1) {
      const sub = l.split(/(?=(?:^|\s+)•\s+)/).map(s => s.trim()).filter(Boolean);
      lines.push(...sub);
    } else if (/(?:^|\s+)\d+[\.\)]\s+/.test(l) && (l.match(/\d+[\.\)]/g) || []).length > 1) {
      const sub = l.split(/(?=(?:^|\s+)\d+[\.\)]\s+)/).map(s => s.trim()).filter(Boolean);
      lines.push(...sub);
    } else {
      lines.push(l);
    }
  });

  if (lines.length > 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", textAlign: "left", width: "100%" }}>
        {lines.map((line, i) => (
          <div key={i} style={{ lineHeight: "1.5", wordBreak: "break-word", whiteSpace: "pre-line" }}>
            {line}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ whiteSpace: "pre-line", wordBreak: "break-word", lineHeight: "1.5", textAlign: "left" }}>
      {desc}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PHASE ITEM COMPONENT
═══════════════════════════════════════════════════════════════ */
function PhaseItem({ phaseObj, phaseNumber, dailyUpdates, assignedMembers = [] }) {
  const phaseName = typeof phaseObj === "object" ? (phaseObj.phaseTitle || phaseObj.phase) : phaseObj;
  const initialStatus = typeof phaseObj === "object" ? phaseObj.phaseStatus : null;
  const phaseDesc = typeof phaseObj === "object" ? phaseObj.phaseDescription : null;

  const phaseUpdates = dailyUpdates?.filter(u =>
    u.phase?.trim().toLowerCase() === phaseName?.trim().toLowerCase()
  ) || [];

  // Get owner info
  const phaseOwner = useMemo(() => {
    if (typeof phaseObj !== "object" || !phaseObj.employeeId) return null;
    const ownerIdStr = (phaseObj.employeeId?._id || phaseObj.employeeId || "").toString();
    const found = assignedMembers.find(m => (m?._id || m || "").toString() === ownerIdStr);
    return found || (typeof phaseObj.employeeId === "object" ? phaseObj.employeeId : null);
  }, [phaseObj, assignedMembers]);

  // Get current status and date from latest update
  const latestUpdate = phaseUpdates[0];
  const currentStatus = latestUpdate ? latestUpdate.phaseStatus : initialStatus;
  const displayDate = latestUpdate ? (() => {
    const d = new Date(latestUpdate.updateDate || latestUpdate.createdAt);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  })() : (typeof phaseObj === "object" && phaseObj?.updateDate ? (() => {
    const d = new Date(phaseObj.updateDate);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  })() : null);

  return (
    <div className="td-phase-item">
      <div className="td-phase-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="td-phase-number">Phase {phaseNumber}</span>
          {displayDate && <span className="td-phase-date">{displayDate}</span>}
          {phaseOwner?.name && (
            <span style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#4f46e5",
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              borderRadius: "12px",
              padding: "1px 8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}>
              👤 {phaseOwner.name}
            </span>
          )}
          <span style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#16a34a",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            padding: "1px 8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px"
          }}>
            {phaseObj?.workingDays || 0} {(phaseObj?.workingDays === 1 ? "Working Day" : "Working Days")}
          </span>
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      <div className="td-phase-description" style={{ marginTop: '8px', width: '100%' }}>
        <span className="td-phase-text" style={{ fontSize: '13px', color: '#3a466d', display: 'block', fontWeight: 600, wordBreak: 'break-all', whiteSpace: 'normal' }}>
          {phaseName || <em style={{ color: "#9ca3af" }}>— No details provided —</em>}
        </span>
        {phaseDesc && (
          <div className="td-phase-desc" style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '6px', paddingTop: '6px', wordBreak: 'break-word', fontWeight: 400 }}>
            {renderDescription(phaseDesc)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN TASK DETAILS MODAL COMPONENT
═══════════════════════════════════════════════════════════════ */
const TaskDetailsModal = ({ taskId, onClose, initialData = null }) => {
  const navigate = useNavigate();
  const [task, setTask] = useState(initialData);
  const [assignedMembers, setAssignedMembers] = useState(initialData?.assignedMembers || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ✅ NEW: Daily updates state
  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [showEditAssignedPopup, setShowEditAssignedPopup] = useState(false);
  const [activePhaseMemberFilter, setActivePhaseMemberFilter] = useState("all");

  /* ================= AUTH ================= */
  const sessionData = sessionStorage.getItem("Erti-Portal");
  const authData = sessionData ? JSON.parse(sessionData) : null;
  const token = authData?.token || "";

  /* ================= CURRENT USER ================= */
  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded?.id || decoded?._id || decoded?.userId || null;
    } catch (error) {
      console.error("Token decode failed:", error);
      return null;
    }
  }, [token]);

  /* ================= PERMISSION LOGIC ================= */
  const createdById = task?.createdBy?._id || task?.createdBy?.id || task?.createdBy || null;

  const userRole = (authData?.user?.role || authData?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin" || Boolean(authData?.user?.isHr);
  const isTaskCreator = (Boolean(currentUserId) && Boolean(createdById) &&
    String(currentUserId) === String(createdById)) || isAdmin;

  const isAssignedMember = useMemo(() => {
    if (!currentUserId || !task?.assignedMembers) return false;
    return task.assignedMembers.some(m => {
      const id = typeof m === "string" ? m : m?._id;
      return String(id) === String(currentUserId);
    });
  }, [currentUserId, task?.assignedMembers]);

  const hasAnyAcceptedMember = useMemo(() => {
    if (task?.assignedStatus?.toLowerCase() === "accepted") return true;
    if (Array.isArray(task?.memberStatuses)) {
      return task.memberStatuses.some(ms => (ms.assignedStatus || "").toLowerCase() === "accepted");
    }
    return false;
  }, [task]);

  const canEditTask = useMemo(() => {
    if ((!isTaskCreator && !isAssignedMember) || !task?.status) return false;
    
    // Restriction: Prevent creator from editing/modifying assigned tasks after they have been accepted by any member
    if (isTaskCreator && !isAssignedMember && hasAnyAcceptedMember) {
      return false;
    }

    const status = task.status.toLowerCase().replace(/\s+/g, "");
    const editableStatuses = ["assigned", "pending", "inprocess", "hold"];
    return editableStatuses.includes(status);
  }, [isTaskCreator, isAssignedMember, task, hasAnyAcceptedMember]);

  const isAssigner = useMemo(() => {
    if (!currentUserId || !createdById) return false;
    return String(currentUserId) === String(createdById);
  }, [currentUserId, createdById]);

  const canDeleteTask = useMemo(() => {
    if (!isAssigner || !task) return false;

    // Check if assignee has accepted
    if ((task.assignedStatus || "").toLowerCase() === "accepted") return false;
    if (Array.isArray(task.memberStatuses) && task.memberStatuses.length > 0) {
      if (task.memberStatuses.some(ms => (ms.assignedStatus || "").toLowerCase() === "accepted")) {
        return false;
      }
    }

    // Check if task status has moved to In Progress, Completed, Hold or any other subsequent status
    const statusNormalized = (task.status || "").toLowerCase().replace(/[\s\-_]/g, "");
    if (statusNormalized && !["assigned", "pending", "allocated"].includes(statusNormalized)) {
      return false;
    }

    const assignedStatusNormalized = (task.assignedStatus || "").toLowerCase().replace(/[\s\-_]/g, "");
    if (assignedStatusNormalized && !["allocated", "assigned", "pending", "rejected"].includes(assignedStatusNormalized)) {
      return false;
    }

    return true;
  }, [isAssigner, task]);

  /* ================= HELPERS ================= */
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  /* ================= DERIVED: PHASES ARRAY ================= */
  const phases = useMemo(() => {
    if (!task?.phases) return [];
    // Keep the object structure if it exists, otherwise it's an old string
    return task.phases.filter(p => {
      if (typeof p === "object") return (p.phaseTitle || p.phase) && (p.phaseTitle || p.phase).trim() !== "";
      return typeof p === "string" && p.trim() !== "";
    });
  }, [task?.phases]);

  const displayedPhases = useMemo(() => {
    if (activePhaseMemberFilter === "all") return phases;
    return phases.filter(p => {
      const ownerId = (p.employeeId?._id || p.employeeId || "").toString();
      return ownerId === activePhaseMemberFilter;
    });
  }, [phases, activePhaseMemberFilter]);

  /* ================= FETCH TASK ================= */
  /* ================= FETCH ALL DATA PARALLEL ================= */
  const fetchAllData = useCallback(async () => {
    if (!taskId) return;
    try {
      if (!task) setLoading(true);

      const [taskRes, updatesRes] = await Promise.all([
        portalInstance.get(`/creat/tasks/${taskId}`),
        portalInstance.get(`/creat/daily-update/${taskId}`).catch(() => ({ data: { data: [] } }))
      ]);

      const taskData = taskRes.data?.data;
      if (taskData) {
        setTask(taskData);
        setAssignedMembers(taskData.assignedMembers || []);
      }
      setDailyUpdates(updatesRes.data?.data || []);
    } catch (err) {
      console.error("DATA FETCH ERROR:", err);
      if (!task) setError("Failed to load task details.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  /* ================= LOAD DATA ON MOUNT ================= */
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.admin-task-details-options-container')) {
        setShowOptionsDropdown(false);
      }
    };
    if (showOptionsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptionsDropdown]);

  const handleEditPopup = () => setShowUpdatePopup(true);
  const handleDeleteTask = () => {
    setShowOptionsDropdown(false);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTask = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const res = await portalInstance.delete(`/creat/task/${taskId}`);
      if (res.data?.success) {
        toast.success(res.data?.message || "Task deleted successfully");
        onClose();
        return;
      }
      toast.error(res.data?.message || "Failed to delete task");
    } catch (err) {
      console.error("DELETE TASK ERROR:", err);
      toast.error(err.response?.data?.message || "Failed to delete task");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDownload = (fileUrl) => {
    if (!fileUrl) return;
    if (typeof fileUrl === "object") {
      fileUrl = fileUrl.fileUrl || fileUrl.url || fileUrl._id || "";
    }
    fileUrl = String(fileUrl);
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      window.open(fileUrl, "_blank");
    } else {
      const base = (portalInstance.defaults.baseURL || "").replace(/\/+$/, "");
      const path = fileUrl.replace(/^\/+/, "");
      window.open(`${base}/${path}`, "_blank");
    }
  };

  /* ================= UI ================= */
  return (
    <div className="admin-task-details-overlay" onClick={onClose}>
      <div className="admin-task-details-container" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="p-5 text-center">
            <div className="spinner-border text-primary"></div>
            <p className="mt-2">Loading...</p>
          </div>
        ) : error ? (
          <div className="p-5 text-center text-danger">{error}</div>
        ) : task && (
          <>
            {/* ═══════════════════ HEADER ═══════════════════ */}
            <div className="admin-task-details-header">
              <div className="header-title-group">
                <h4 className="admin-task-details-title">Task Details</h4>
                <span className={`admin-task-details-priority-badge ${task.priority?.toLowerCase()}`}>
                  {task.priority || "High"}
                </span>
              </div>

              <div className="admin-task-details-header-actions" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                {canDeleteTask && (
                  <div className="admin-task-details-options-container">
                    <button
                      className="admin-task-details-options-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowOptionsDropdown((prev) => !prev);
                      }}
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px', padding: '4px', display: 'flex', alignItems: 'center' }}
                    >
                      •••
                    </button>

                    {showOptionsDropdown && (
                      <div className="admin-task-details-options-dropdown">
                        {canDeleteTask && (
                          <button
                            className="admin-task-details-option-item admin-task-details-option-delete"
                            onClick={handleDeleteTask}
                          >
                            Delete Task
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button className="hrms-common-close-btn" onClick={onClose} aria-label="Close">
                  ✕
                </button>
              </div>
            </div>

            {/* ═══════════════════ BODY ═══════════════════ */}
            <div className="admin-task-details-body">
              {/* LEFT: Members */}
              <div className="admin-task-details-assigned-panel">
                <h6 className="admin-task-details-section-label">Assigned Members</h6>
                <div className="admin-task-details-members-list">
                  {assignedMembers.map((emp) => {
                    const empIdStr = (emp?._id || emp).toString();
                    const mStatus = (task?.memberStatuses || []).find(
                      ms => (ms.employeeId?._id || ms.employeeId || "").toString() === empIdStr
                    );
                    const memberAssignedStatus = mStatus?.assignedStatus || task?.assignedStatus || "Allocated";
                    const memberWorkStatus = mStatus?.status || task?.status || "Pending";
                    const isAcc = (memberAssignedStatus || "").toLowerCase() === "accepted";
                    const isRej = (memberAssignedStatus || "").toLowerCase() === "rejected";

                    return (
                      <div key={emp?._id} className="admin-task-details-member-card">
                        <img
                          src={emp?.avatar || "/avatar.png"}
                          alt={emp?.name}
                          className="admin-task-details-avatar"
                          onError={(e) => { e.target.src = "/avatar.png"; }}
                        />
                        <div className="admin-task-details-member-info">
                          <div className="admin-task-details-member-name">{emp?.name}</div>
                          <div className="admin-task-details-member-role d-flex align-items-center gap-1 flex-wrap">
                            <span>{emp?.designation || "Team Member"}</span>
                            <span style={{
                              fontSize: "10px",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              fontWeight: "600",
                              background: isAcc ? "#dcfce7" : isRej ? "#fee2e2" : "#fef3c7",
                              color: isAcc ? "#16a34a" : isRej ? "#dc2626" : "#d97706",
                            }}>
                              {memberAssignedStatus}
                            </span>
                            {memberWorkStatus && (
                              <span style={{
                                fontSize: "10px",
                                padding: "1px 6px",
                                borderRadius: "10px",
                                fontWeight: "600",
                                background: (memberWorkStatus.toLowerCase().includes("complete") ? "#dcfce7" : memberWorkStatus.toLowerCase().includes("process") ? "#dbeafe" : "#fef3c7"),
                                color: (memberWorkStatus.toLowerCase().includes("complete") ? "#166534" : memberWorkStatus.toLowerCase().includes("process") ? "#1e40af" : "#92400e"),
                              }}>
                                {memberWorkStatus}
                              </span>
                            )}
                          </div>
                          {isRej && mStatus?.rejectionReason && (
                            <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "2px" }}>
                              Reason: {mStatus.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="admin-task-details-divider"></div>

              {/* RIGHT: Info */}
              <div className="admin-task-details-info-panel">
                {/* ROW 1: Category / Project, Priority, Work Type */}
                <div
                  className="admin-task-details-info-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "16px",
                    marginBottom: "16px",
                    alignItems: "flex-start"
                  }}
                >
                  <div className="admin-task-details-info-stat" style={{ minWidth: 0 }}>
                    <label className="admin-task-details-section-label">Category / Project</label>
                    <div className="admin-task-details-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{(task?.category || "—").toUpperCase()}</span>
                      <span style={{ color: "#c4c4c4" }}>/</span>
                      <span>{task?.project ? (task.project.charAt(0).toUpperCase() + task.project.slice(1).toLowerCase()) : "—"}</span>
                    </div>
                  </div>

                  <div className="admin-task-details-info-stat" style={{ minWidth: 0 }}>
                    <label className="admin-task-details-section-label">Priority</label>
                    <div className="admin-task-details-value">
                      <span className={`td-val-priority-pill ${(task?.priority || "mid").toLowerCase()}`}>
                        {task?.priority || "Mid"}
                      </span>
                    </div>
                  </div>

                  <div className="admin-task-details-info-stat" style={{ minWidth: 0 }}>
                    <label className="admin-task-details-section-label">Work Type</label>
                    <div className="admin-task-details-value" style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                      {task?.workType ? (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            color: "#5977f8",
                            background: "#eef2ff",
                            border: "1px solid #c7d2fe",
                            borderRadius: "4px",
                            padding: "2px 8px",
                            display: "inline-block"
                          }}
                        >
                          {task.workType}
                        </span>
                      ) : (
                        "—"
                      )}
                      {task?.pages && task.pages.length > 0 && task.pages.map((pg, pIdx) => (
                        <span
                          key={pIdx}
                          style={{
                            fontSize: "11px",
                            fontWeight: "500",
                            color: "#334155",
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            padding: "1px 7px"
                          }}
                        >
                          {pg}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ROW 2: Start Date, End Date, Due Date */}
                <div
                  className="admin-task-details-info-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "16px",
                    marginBottom: "16px",
                    alignItems: "flex-start"
                  }}
                >
                  <div className="admin-task-details-info-stat" style={{ minWidth: 0 }}>
                    <label className="admin-task-details-section-label">Start Date</label>
                    {assignedMembers.length > 1 ? (
                      <div className="admin-task-details-value" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {assignedMembers.map(emp => {
                          const empIdStr = (emp?._id || emp).toString();
                          const ms = (task?.memberStatuses || []).find(
                            m => (m.employeeId?._id || m.employeeId || "").toString() === empIdStr
                          );
                          const empStartDate = ms?.startDate !== undefined && ms?.startDate !== null ? ms.startDate : task?.startDate;
                          return (
                            <div key={empIdStr} className="td-member-val-row">
                              <span className="td-val-emp-name">{emp.name || "Member"}:</span>
                              <span className="td-val-text-bold">{formatDate(empStartDate)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="admin-task-details-value">
                        <span className="td-val-text-bold">{formatDate(task?.startDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="admin-task-details-info-stat" style={{ minWidth: 0 }}>
                    <label className="admin-task-details-section-label">End Date</label>
                    {assignedMembers.length > 1 ? (
                      <div className="admin-task-details-value" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {assignedMembers.map(emp => {
                          const empIdStr = (emp?._id || emp).toString();
                          const ms = (task?.memberStatuses || []).find(
                            m => (m.employeeId?._id || m.employeeId || "").toString() === empIdStr
                          );
                          const empEndDate = ms?.endDate !== undefined && ms?.endDate !== null ? ms.endDate : task?.endDate;
                          return (
                            <div key={empIdStr} className="td-member-val-row">
                              <span className="td-val-emp-name">{emp.name || "Member"}:</span>
                              <span className="td-val-text-bold">{formatDate(empEndDate)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="admin-task-details-value">
                        <span className="td-val-text-bold">{formatDate(task?.endDate)}</span>
                      </div>
                    )}
                  </div>

                  <div className="admin-task-details-info-stat" style={{ minWidth: 0 }}>
                    <label className="admin-task-details-section-label">Due Date</label>
                    <div className="admin-task-details-value">
                      <span className="td-val-text-bold">{formatDate(task?.dueDate)}</span>
                    </div>
                  </div>
                </div>

                {/* ROW 3: Status only */}
                <div
                  className="admin-task-details-info-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: "16px",
                    marginBottom: "16px",
                    alignItems: "flex-start"
                  }}
                >
                  <div className="admin-task-details-info-stat" style={{ minWidth: 0 }}>
                    <label className="admin-task-details-section-label">Status</label>
                    {assignedMembers.length > 1 ? (
                      <div className="admin-task-details-value" style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {assignedMembers.map(emp => {
                          const empIdStr = (emp?._id || emp).toString();
                          const ms = (task?.memberStatuses || []).find(
                            m => (m.employeeId?._id || m.employeeId || "").toString() === empIdStr
                          );
                          const empStatusRaw = (ms?.assignedStatus?.toLowerCase() === "rejected" || ms?.status?.toLowerCase() === "ignored" || ms?.status?.toLowerCase() === "rejected")
                            ? "rejected"
                            : (ms?.status || (ms?.assignedStatus === "Accepted" ? "inprocess" : (task?.status || "pending")));
                          const s = String(empStatusRaw || "").toLowerCase().replace(/[-_\s]/g, "");
                          let label = "Pending";
                          let pillClass = "pending";
                          if (s === "completed" || s === "complete") {
                            label = "Completed";
                            pillClass = "completed";
                          } else if (s === "inprocess" || s === "inprogress") {
                            label = "In Process";
                            pillClass = "inprogress";
                          } else if (s === "hold" || s === "onhold") {
                            label = "On Hold";
                            pillClass = "onhold";
                          } else if (s === "assigned") {
                            label = "Assigned";
                            pillClass = "assigned";
                          } else if (s === "rejected" || s === "ignored" || s === "reject") {
                            label = "Rejected";
                            pillClass = "rejected";
                          }
                          return (
                            <div key={empIdStr} className="td-member-val-row">
                              <span className="td-val-emp-name">{emp.name || "Member"}:</span>
                              <span className={`td-val-status-pill ${pillClass}`}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="admin-task-details-value">
                        {(() => {
                          const rawStatus = (task?.assignedStatus?.toLowerCase() === "rejected" || task?.status?.toLowerCase() === "ignored" || task?.status?.toLowerCase() === "rejected")
                            ? "rejected"
                            : (task?.status || "");
                          const s = String(rawStatus || "").toLowerCase().replace(/[-_\s]/g, "");
                          let label = "Pending";
                          let pillClass = "pending";
                          if (s === "completed" || s === "complete") {
                            label = "Completed";
                            pillClass = "completed";
                          } else if (s === "inprocess" || s === "inprogress") {
                            label = "In Process";
                            pillClass = "inprogress";
                          } else if (s === "hold" || s === "onhold") {
                            label = "On Hold";
                            pillClass = "onhold";
                          } else if (s === "assigned") {
                            label = "Assigned";
                            pillClass = "assigned";
                          } else if (s === "rejected" || s === "ignored" || s === "reject") {
                            label = "Rejected";
                            pillClass = "rejected";
                          }
                          return (
                            <span className={`td-val-status-pill ${pillClass}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-task-details-horizontal-divider"></div>

                <div className="admin-task-details-content">
                  <h5 className="admin-task-details-task-title">{task?.taskTitle}</h5>
                  <div className="admin-task-details-task-desc">{renderDescription(task?.taskDetails) || "—"}</div>
                </div>

                {/* ═══════════════════════════════════════════════
                    ✅ PHASES SECTION (NEW)
                ═══════════════════════════════════════════════ */}
                {phases.length > 0 && (
                  <div className="td-phases-section">
                    <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <h6 className="admin-task-details-section-label m-0">
                          Phases
                        </h6>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#2563eb",
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "12px",
                          padding: "2px 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          {(() => {
                            const overallDays = calculateOverallTaskDays(task);
                            return `Overall Task: ${overallDays} ${overallDays === 1 ? "Working Day" : "Working Days"}`;
                          })()}
                        </span>
                      </div>
                      {assignedMembers.length > 1 && (
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setActivePhaseMemberFilter("all")}
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              border: activePhaseMemberFilter === "all" ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                              background: activePhaseMemberFilter === "all" ? "#eff6ff" : "#ffffff",
                              color: activePhaseMemberFilter === "all" ? "#1d4ed8" : "#64748b",
                              cursor: "pointer"
                            }}
                          >
                            All ({phases.length})
                          </button>
                          {assignedMembers.map(m => {
                            const mId = (m?._id || m).toString();
                            const count = phases.filter(p => {
                              const pOwnerId = (p.employeeId?._id || p.employeeId || "").toString();
                              return pOwnerId === mId;
                            }).length;
                            return (
                              <button
                                key={mId}
                                type="button"
                                onClick={() => setActivePhaseMemberFilter(mId)}
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  border: activePhaseMemberFilter === mId ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                                  background: activePhaseMemberFilter === mId ? "#eff6ff" : "#ffffff",
                                  color: activePhaseMemberFilter === mId ? "#1d4ed8" : "#64748b",
                                  cursor: "pointer"
                                }}
                              >
                                {m.name || "Member"} ({count})
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="td-phases-list">
                      {displayedPhases.map((phaseObj, idx) => (
                        <PhaseItem
                          key={idx}
                          phaseObj={phaseObj}
                          phaseNumber={idx + 1}
                          dailyUpdates={dailyUpdates}
                          assignedMembers={assignedMembers}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ═══════════════════ DOCUMENTS ═══════════════════ */}
                <div className="admin-task-details-docs-section">
                  <label className="admin-task-details-section-label">Documents</label>

                  {task?.documents && task.documents.length > 0 ? (
                    <div className="hrms-common-file-list" style={{ marginBottom: '10px' }}>
                      {task.documents.map((doc, idx) => (
                        <div
                          key={doc._id || idx}
                          className="hrms-common-file-item"
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleDownload(doc.fileUrl)}
                        >
                          <div className="d-flex align-items-center gap-2 overflow-hidden">
                            <img src={Document} alt="doc" className="hrms-common-attach-icon" />
                            <span className="hrms-common-file-name">{doc.fileName || "Document"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-docs-text">No documents added</p>
                  )}
                </div>
              </div>
            </div>

            {/* ═══════════════════ FOOTER ═══════════════════ */}
            <div className="admin-task-details-footer">
              <button className="hrms-common-btn-cancel" onClick={onClose}>
                {(!hasAnyAcceptedMember && isTaskCreator) || canEditTask ? "Cancel" : "Close"}
              </button>

              {!hasAnyAcceptedMember && isTaskCreator ? (
                <button className="hrms-common-btn-primary" onClick={() => setShowEditAssignedPopup(true)}>
                  Edit Task
                </button>
              ) : (
                canEditTask && (
                  <button className="hrms-common-btn-primary" onClick={handleEditPopup}>
                    Edit Task
                  </button>
                )
              )}
            </div>

            {/* ═══════════════════ UPDATE POPUP ═══════════════════ */}
            {showUpdatePopup && (
              <div className="admin-task-details-popup-backdrop" onClick={() => setShowUpdatePopup(false)}>
                <div className="admin-task-details-popup-overlay">
                  <div className="admin-task-details-popup-container" onClick={(e) => e.stopPropagation()}>
                    <Updatetask
                      taskId={taskId}
                      onClose={() => {
                        setShowUpdatePopup(false);
                        fetchAllData(); // ✅ Refresh all data after edit
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════ EDIT ASSIGNED TASK POPUP ═══════════════════ */}
            {showEditAssignedPopup && (
              <div className="adminTaskPage__popupBackdrop" onClick={() => setShowEditAssignedPopup(false)}>
                <div className="adminTaskPage__popupOverlay">
                  <div className="adminTaskPage__popupContainer" onClick={(e) => e.stopPropagation()}>
                    <EditAssignedTask
                      task={task}
                      onClose={(shouldRefresh) => {
                        setShowEditAssignedPopup(false);
                        if (shouldRefresh === true) {
                          fetchAllData();
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════ DELETE CONFIRMATION ═══════════════════ */}
            {showDeleteConfirm && (
              <div className="delete-modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
                <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="delete-modal-header">
                    <h3>Delete Task</h3>
                  </div>
                  <div className="delete-modal-body">
                    <p>
                      Are you sure you want to delete this task?<br />
                      <span>This action cannot be undone.</span>
                    </p>
                  </div>
                  <div className="delete-modal-footer">
                    <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </button>
                    <button className="btn-delete" onClick={confirmDeleteTask} disabled={loading}>
                      {loading ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ✅ PHASES STYLING (Add to your CSS or inline style tag)
      ═══════════════════════════════════════════════════════════════ */}
      <style>{`
        .header-title-group { 
          display: flex; 
          align-items: center; 
          gap: 15px; 
        }

        /* ══════════════════════════════════════════════
           PHASES SECTION STYLES
        ══════════════════════════════════════════════ */
        .td-phases-section {
          margin: 20px 0 15px;
          padding: 0;
        }
        
        .td-phases-list { 
          display: flex; 
          flex-direction: column; 
          gap: 15px; 
        }

        .td-phase-item {
          background: #f8fafc;
          border: 1px solid #f0f0f5;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          position: relative;
        }

        
        .td-phase-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .td-phase-date {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
          
          padding: 3px 8px;
          border-radius: 4px;
         
        }
        
        .td-phase-number {
          font-size: 10px;
          font-weight: 500;
          color: #868585;
         
          border-radius: 6px;
          padding: 4px 10px;
       
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        
        .td-phase-text {
          font-size: 13px;
          color: #3a466d;
          font-weight: 600;
          line-height: 1.4;
          flex: 1;
        }

        .td-phase-desc {
          font-size: 12px;
          color: #64748b;
          font-weight: 400;
          line-height: 1.45;
          margin-top: 8px;
          padding-top: 8px;
         
          word-break: break-word;
        }

        /* ── Daily Updates Under Phase ── */
        .td-phase-updates {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-left: 15px;
          border-left: 2px solid #f1f5f9;
          margin-left: 5px;
        }
        
        .td-phase-update-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
        }

        .td-phase-update-row::before {
          content: "";
          position: absolute;
          left: -20px;
          top: 10px;
          width: 8px;
          height: 8px;
          background: #cbd5e1;
          border-radius: 50%;
          border: 2px solid #fff;
        }
        
        .td-phase-update-row:first-child::before {
          background: #5977f8;
        }
        
        .td-phase-update-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
        }

        .td-phase-update-note {
          font-size: 11px;
          color: #64748b;
          line-height: 1.5;
          background: #f8fafc;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
        }
        
        .td-phase-update-by {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </div>
  );
};

export default TaskDetailsModal;
