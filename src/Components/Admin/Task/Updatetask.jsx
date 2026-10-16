import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./TaskDetailsModal.css";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import attachIcon from "../../../assets/ant-design_file-add-filled.png";
import { portalInstance } from "../../../Services/instance";
import Updatetask from "./Adminupdate";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Document from "../../../../public/document.svg?url";

// ==========================================
// PHASE STATUS BADGE COMPONENT
// ==========================================
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
      padding: "3px 10px",
      fontSize: 11,
      fontWeight: 600,
    }}>
      <span style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: col.dot,
        display: "inline-block"
      }} />
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

// ==========================================
// PHASE ITEM COMPONENT
// ==========================================
function PhaseItem({ phaseObj, phaseNumber, dailyUpdates }) {
  const phaseName = typeof phaseObj === "object" ? (phaseObj.phaseTitle || phaseObj.phase) : phaseObj;
  const initialStatus = typeof phaseObj === "object" ? phaseObj.phaseStatus : null;

  const phaseUpdates = dailyUpdates?.filter(u =>
    u.phase?.trim().toLowerCase() === phaseName?.trim().toLowerCase()
  ) || [];

  return (
    <div className="td-phase-item">
      <div className="td-phase-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="td-phase-number">Phase {phaseNumber}</span>
          <span className="td-phase-text">
            {phaseName || <em style={{ color: "#9ca3af" }}>—</em>}
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "#2563eb",
              background: "#eff6ff",
              padding: "2px 8px",
              borderRadius: "12px",
              border: "1px solid #bfdbfe",
              marginLeft: "8px",
            }}
          >
            {phaseObj?.workingDays || 0} {(phaseObj?.workingDays === 1 ? "Working Day" : "Working Days")}
          </span>
        </div>
        {/* If no daily updates yet, show the initial status set during task creation */}
        {phaseUpdates.length === 0 && initialStatus && (
          <StatusBadge status={initialStatus} />
        )}
      </div>

      {phaseUpdates.length > 0 && (
        <div className="td-phase-updates">
          {phaseUpdates.map((u, i) => (
            <div key={i} className="td-phase-update-row">
              <div className="td-phase-update-top">
                <StatusBadge status={u.phaseStatus} />
                <span className="td-phase-update-by">
                  {(() => {
                    const dateValue = u.updateDate || u.createdAt;
                    if (!dateValue) return "—";
                    const d = new Date(dateValue);
                    if (isNaN(d.getTime())) return "—";

                    return d.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                  })()}
                </span>
              </div>
              {u.note && (
                <div className="td-phase-update-note">
                  {u.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN TASK DETAILS MODAL COMPONENT
// ==========================================
const TaskDetailsModal = ({ taskId, onClose, initialData = null }) => {
  const navigate = useNavigate();
  const [task, setTask] = useState(initialData);
  const [assignedMembers, setAssignedMembers] = useState(initialData?.assignedMembers || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // âœ… NEW: Daily updates state
  const [dailyUpdates, setDailyUpdates] = useState([]);

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

  const isTaskCreator = Boolean(currentUserId) && Boolean(createdById) &&
    String(currentUserId) === String(createdById);

  const isAssignedMember = useMemo(() => {
    if (!currentUserId || !task?.assignedMembers) return false;
    return task.assignedMembers.some(m => {
      const id = typeof m === "string" ? m : m?._id;
      return String(id) === String(currentUserId);
    });
  }, [currentUserId, task?.assignedMembers]);

  const canEditTask = useMemo(() => {
    if ((!isTaskCreator && !isAssignedMember) || !task?.status) return false;
    const status = task.status.toLowerCase().replace(/\s+/g, "");
    const editableStatuses = ["assigned", "pending", "inprocess", "hold"];
    return editableStatuses.includes(status);
  }, [isTaskCreator, isAssignedMember, task]);

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
  }, [taskId, task]);

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
            {/* HEADER */}
            <div className="admin-task-details-header">
              <div className="header-title-group">
                <h2 className="admin-task-details-title">Task Details</h2>
                <span className={`admin-task-details-priority-badge ${task.priority?.toLowerCase()}`}>
                  {task.priority || "High"}
                </span>
              </div>

              {canDeleteTask && (
                <div className="admin-task-details-options-container">
                  <button
                    className="admin-task-details-options-btn"
                    onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
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
            </div>

            {/* BODY */}
            <div className="admin-task-details-body">
              {/* LEFT: Members */}
              <div className="admin-task-details-assigned-panel">
                <h6 className="admin-task-details-section-label">Assigned Members</h6>
                <div className="admin-task-details-members-list">
                  {assignedMembers.map((emp) => (
                    <div key={emp?._id} className="admin-task-details-member-card">
                      <img
                        src={emp?.avatar || "/avatar.png"}
                        alt={emp?.name}
                        className="admin-task-details-avatar"
                        onError={(e) => { e.target.src = "/avatar.png"; }}
                      />
                      <div className="admin-task-details-member-info">
                        <div className="admin-task-details-member-name">{emp?.name}</div>
                        <div className="admin-task-details-member-role">
                          {emp?.designation || "Team Member"}
                        </div>
                      </div>
                    </div>
                  ))}
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
                    <div className="admin-task-details-value">
                      <span className="td-val-text-bold">{formatDate(task?.startDate)}</span>
                    </div>
                  </div>

                  <div className="admin-task-details-info-stat" style={{ minWidth: 0 }}>
                    <label className="admin-task-details-section-label">End Date</label>
                    <div className="admin-task-details-value">
                      <span className="td-val-text-bold">{formatDate(task?.endDate)}</span>
                    </div>
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
                    <div className="admin-task-details-value">
                      <span className={`td-val-status-pill ${(task?.status || "pending").toLowerCase()}`}>
                        {task?.status || "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-task-details-horizontal-divider"></div>

                <div className="admin-task-details-content">
                  <h5 className="admin-task-details-task-title">{task?.taskTitle}</h5>
                  <p className="admin-task-details-task-desc">{task?.taskDetails}</p>
                </div>

                {/* PHASES SECTION */}
                {phases.length > 0 && (
                  <div className="td-phases-section">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <h6 className="admin-task-details-section-label" style={{ margin: 0 }}>
                        Phases
                      </h6>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#16a34a",
                          background: "#dcfce7",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          border: "1px solid #bbf7d0",
                        }}
                      >
                        {(() => {
                          const overallDays = calculateOverallTaskDays(task);
                          return `Overall Task: ${overallDays} ${overallDays === 1 ? "Working Day" : "Working Days"}`;
                        })()}
                      </span>
                    </div>
                    <div className="td-phases-list">
                      {phases.map((phaseObj, idx) => (
                        <PhaseItem
                          key={idx}
                          phaseObj={phaseObj}
                          phaseNumber={idx + 1}
                          dailyUpdates={dailyUpdates}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* DOCUMENTS */}
                <div className="admin-task-details-docs-section">
                  <label className="admin-task-details-section-label">Documents</label>

                  {task?.documents && task.documents.length > 0 ? (
                    <div className="admin-task-details-files-list" style={{ marginBottom: '10px' }}>
                      {task.documents.map((doc, idx) => (
                        <div
                          key={doc._id || idx}
                          className="admin-task-details-file-item"
                          onClick={() => handleDownload(doc.fileUrl)}
                        >
                          <img src={Document} alt="doc" className="employee-task-details-attach-icon" />
                          <span style={{ flex: 1 }}>{doc.fileName || "Document"}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-docs-text">No documents added</p>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="admin-task-details-footer">
              <button className="admin-task-details-btn-cancel" onClick={onClose}>
                {canEditTask ? "Cancel" : "Close"}
              </button>

              {canEditTask && (
                <button className="admin-task-details-btn-edit" onClick={handleEditPopup}>
                  Edit Task
                </button>
              )}
            </div>

            {/* UPDATE POPUP */}
            {showUpdatePopup && (
              <div className="admin-task-details-popup-backdrop" onClick={() => setShowUpdatePopup(false)}>
                <div className="admin-task-details-popup-overlay">
                  <div className="admin-task-details-popup-container" onClick={(e) => e.stopPropagation()}>
                    <Updatetask
                      taskId={taskId}
                      onClose={() => {
                        setShowUpdatePopup(false);
                        fetchTask();
                        fetchDailyUpdates(); // âœ… Refresh daily updates after edit
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DELETE CONFIRMATION */}
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

      {/* PHASES STYLING */}
      <style>{`
        .header-title-group { 
          display: flex; 
          align-items: center; 
          gap: 15px; 
        }

        /* PHASES SECTION STYLES */
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
         
        }
        
        .td-phase-number {
          font-size: 10px;
          font-weight: 700;
          
          
          border-radius: 6px;
          padding: 4px 10px;
   
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        
        .td-phase-text {
          font-size: 13px;
          color: #3a466d;
          font-weight: 500;
          line-height: 1.4;
          flex: 1;
        }

        /* â”€â”€ Daily Updates Under Phase â”€â”€ */
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
