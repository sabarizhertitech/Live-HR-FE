import React, { useEffect, useMemo, useState, useCallback } from "react";
import "./TaskDetails.css";
import { jwtDecode } from "jwt-decode";
import attachIcon from "../../../assets/ant-design_file-add-filled.png";
import { portalInstance } from "../../../Services/instance";
import EditAssignedTask from "../../Admin/Task/EditAssignedTask";
import UpdateTask from "./Updatetask";
import { ToastContainer, toast } from "react-toastify";
import closeIcon from "../../../assets/close.png";
import Document from "../../../../public/document.svg?url";
import "react-toastify/dist/ReactToastify.css";
import "../../../Globel/Layout.css";
import CustomDropdown from "../../Common/CustomDropdown";
import { Heading5 } from "lucide-react";

/* â”€â”€â”€ Phase Status Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
      display: "inline-flex", alignItems: "center", gap: 5,
      background: col.bg, color: col.text,
      borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

const PHASE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "inprocess", label: "In Process" },
  { value: "hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
];

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

/* ─── Phase Item (with status editing) ─── */
function PhaseItem({ phase, phaseNumber, dailyUpdates, idx, taskId, onSuccess, assignedMembers = [], currentUserId = null, isTaskCreator = false, isTaskCompleted = false }) {
  const phaseUpdates = dailyUpdates?.filter(u =>
    u.phase?.trim().toLowerCase() === (typeof phase === 'object' ? (phase.phaseTitle || phase.phase) : phase)?.trim().toLowerCase()
  ) || [];

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Filter out redundant updates (Only show LATEST update per day)
  const uniquePhaseUpdates = useMemo(() => {
    const seenDays = new Set();
    return [...phaseUpdates]
      .sort((a, b) => new Date(b.createdAt || b.updateDate) - new Date(a.createdAt || a.updateDate))
      .filter(u => {
        const dateStr = new Date(u.createdAt || u.updateDate).toDateString();
        if (seenDays.has(dateStr)) return false;
        seenDays.add(dateStr);
        return true;
      });
  }, [phaseUpdates]);

  // Trust the status directly from the phase object (The Source of Truth)
  const currentStatus = useMemo(() => {
    return typeof phase === 'object' ? (phase.phaseStatus || "pending") : "pending";
  }, [phase]);

  // Get owner info if assigned to multiple members
  const phaseOwner = useMemo(() => {
    if (typeof phase !== "object" || !phase.employeeId) return null;
    const ownerIdStr = (phase.employeeId?._id || phase.employeeId || "").toString();
    const found = assignedMembers.find(m => (m?._id || m || "").toString() === ownerIdStr);
    return found || (typeof phase.employeeId === "object" ? phase.employeeId : null);
  }, [phase, assignedMembers]);

  // Check if current user is owner of this phase
  const isOwner = useMemo(() => {
    if (!currentUserId) return false;
    if (typeof phase === "object" && phase.employeeId) {
      const ownerIdStr = (phase.employeeId?._id || phase.employeeId || "").toString();
      return ownerIdStr === String(currentUserId);
    }
    return true; // Fallback for legacy phases
  }, [phase, currentUserId]);

  // Get the latest update date for this phase, prioritizing the one from the phase object itself
  const displayDate = useMemo(() => {
    if (typeof phase === 'object' && phase.updateDate) {
      return new Date(phase.updateDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    if (phaseUpdates.length === 0) return null;
    const latest = [...phaseUpdates].sort((a, b) => new Date(b.createdAt || b.updateDate) - new Date(a.createdAt || a.updateDate))[0];
    return new Date(latest.createdAt || latest.updateDate).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }, [phaseUpdates, phase]);

  const [isPointByPoint, setIsPointByPoint] = useState(false);

  useEffect(() => {
    const desc = typeof phase === 'object' ? (phase.phaseDescription || "") : "";
    setEditTitle(typeof phase === 'object' ? (phase.phaseTitle || "") : "");
    setEditDesc(desc);
    setEditStatus(currentStatus.toLowerCase());
    setIsPointByPoint(/^\s*1[\.\)]/m.test(desc));
  }, [phase, currentStatus]);

  const phaseName = typeof phase === 'object' ? (phase.phaseTitle || phase.phase) : phase;
  const phaseDesc = typeof phase === 'object' ? phase.phaseDescription : '';

  const canEdit = !isTaskCompleted && (isOwner || isTaskCreator) && ["pending", "inprocess", "hold"].includes(currentStatus.toLowerCase());

  const formatToNumberedPoints = (text) => {
    if (!text || !text.trim()) return "• ";
    const rawLines = text.split("\n");
    const cleaned = rawLines
      .map(line => line.replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, "").trim())
      .filter(Boolean);

    if (cleaned.length === 0) return "• ";
    return cleaned.map(line => `• ${line}`).join("\n");
  };

  const removeNumberedPoints = (text) => {
    if (!text) return "";
    return text
      .split("\n")
      .map(line => line.replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, "").trim())
      .filter(Boolean)
      .join("\n");
  };

  const handleTogglePointByPoint = () => {
    const nextMode = !isPointByPoint;
    setIsPointByPoint(nextMode);
    if (nextMode) {
      setEditDesc(prev => formatToNumberedPoints(prev));
    } else {
      setEditDesc(prev => removeNumberedPoints(prev));
    }
  };

  const handleDescriptionKeyDown = (e) => {
    if (!isPointByPoint) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const textarea = e.target;
      const { selectionStart, selectionEnd, value } = textarea;

      const textBeforeCursor = value.substring(0, selectionStart);
      const textAfterCursor = value.substring(selectionEnd);

      const linesBefore = textBeforeCursor.split("\n");
      const currentLine = linesBefore[linesBefore.length - 1];

      const match = currentLine.match(/^([•\-\*]|\d+[\.\)])\s*(.*)$/);

      if (match) {
        const content = match[2];

        if (!content.trim()) {
          const newLines = linesBefore.slice(0, -1);
          const newBefore = newLines.length > 0 ? newLines.join("\n") + "\n" : "";
          const newText = newBefore + textAfterCursor;
          setEditDesc(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = newBefore.length;
          }, 0);
          return;
        }

        const insertion = "\n• ";
        const newText = textBeforeCursor + insertion + textAfterCursor;
        const newCursorPos = selectionStart + insertion.length;

        setEditDesc(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        }, 0);
      } else {
        const insertion = "\n• ";
        const newText = textBeforeCursor + insertion + textAfterCursor;
        const newCursorPos = selectionStart + insertion.length;

        setEditDesc(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        }, 0);
      }
    }
  };

  const handleDescriptionPaste = (e) => {
    if (!isPointByPoint) return;

    const pastedText = e.clipboardData?.getData("text");
    if (!pastedText || !pastedText.includes("\n")) return;

    e.preventDefault();
    const textarea = e.target;
    const { selectionStart, selectionEnd, value } = textarea;

    const textBefore = value.substring(0, selectionStart);
    const textAfter = value.substring(selectionEnd);

    const pastedLines = pastedText
      .split(/\r?\n/)
      .map((l) => l.replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, "").trim())
      .filter(Boolean);

    if (pastedLines.length === 0) return;

    const linesBefore = textBefore.split("\n");
    const currentLine = linesBefore[linesBefore.length - 1];
    const match = currentLine.match(/^([•\-\*]|\d+[\.\)])\s*/);

    let formattedPaste = "";
    if (match && (currentLine.trim() === match[1] || currentLine.trim() === `${match[1]}.`)) {
      formattedPaste = pastedLines.map((l, i) => (i === 0 ? l : `• ${l}`)).join("\n");
    } else {
      formattedPaste = pastedLines.map((l) => `• ${l}`).join("\n");
      if (textBefore && !textBefore.endsWith("\n") && !match) {
        formattedPaste = "\n" + formattedPaste;
      }
    }

    const newText = textBefore + formattedPaste + textAfter;
    setEditDesc(newText);
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = (textBefore + formattedPaste).length;
    }, 0);
  };

  const handleSave = async () => {
    if (isTaskCompleted) {
      toast.error("Completed task phases cannot be modified");
      return;
    }
    if ((currentStatus || "").toLowerCase() === "completed") {
      toast.error("Completed phase cannot be modified");
      return;
    }
    if (!editTitle.trim()) {
      toast.error("Phase title cannot be empty");
      return;
    }
    try {
      setIsSaving(true);
      const res = await portalInstance.put(`/creat/tasks/${taskId}/phases/${phase._id}`, {
        phaseTitle: editTitle,
        phaseStatus: editStatus,
        phaseDescription: editDesc
      });
      if (res.data.success || res.status === 200) {
        toast.success("Phase updated successfully!");
        setIsEditing(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error("Failed to update phase");
      }
    } catch (err) {
      console.error("Error updating phase:", err);
      toast.error(err?.response?.data?.message || "Failed to update phase");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`td-phase-item ${isEditing ? "editing" : ""}`}>
      <div className="td-phase-header d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className="td-phase-date">Phase {phaseNumber}</span>
          {displayDate && <span className="td-phase-number">{displayDate}</span>}
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
            {phase?.workingDays || 0} {(phase?.workingDays === 1 ? "Working Day" : "Working Days")}
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          {canEdit && !isEditing && (
            <button
              className="td-phase-edit-btn"
              onClick={() => setIsEditing(true)}
              style={{ background: 'none', border: 'none', padding: 0 }}
              title="Edit Phase"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="td-phase-edit-icon-svg">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
              </svg>
            </button>
          )}
          <StatusBadge status={currentStatus} />
        </div>
      </div>

      {isEditing ? (
        <div className="td-phase-edit-form">
          <div className="td-phase-edit-row">
            <div className="td-phase-edit-field">
              <label className="td-phase-edit-label">Phase Title</label>
              <input
                type="text"
                className="td-phase-edit-input"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Enter phase title..."
              />
            </div>
            <div className="td-phase-edit-status-group">
              <label className="td-phase-edit-label">Status</label>
              <div className="td-phase-dropdown-container">
                <CustomDropdown
                  options={PHASE_STATUS_OPTIONS}
                  value={editStatus}
                  onChange={setEditStatus}
                  className="td-phase-status-dropdown"
                  placeholder="Select Status"
                />
              </div>
            </div>
          </div>
          <div className="td-phase-edit-field" style={{ marginTop: '12px' }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="td-phase-edit-label mb-0">Phase Description</label>
              <label
                className="d-flex align-items-center gap-1"
                onClick={handleTogglePointByPoint}
                style={{
                  fontSize: "11px",
                  fontWeight: "500",
                  color: isPointByPoint ? "#5977f8" : "#77728e",
                  cursor: "pointer",
                  userSelect: "none",
                  margin: 0
                }}
                title="Format description as bullet points (• Point)"
              >
                <input
                  type="radio"
                  name={`editPhasePointByPoint-${idx}`}
                  checked={isPointByPoint}
                  readOnly
                  style={{
                    cursor: "pointer",
                    accentColor: "#5977f8",
                    width: "12px",
                    height: "12px",
                    margin: 0
                  }}
                />
                <span>Point by Point</span>
              </label>
            </div>
            <textarea
              className="td-phase-edit-textarea"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              onKeyDown={handleDescriptionKeyDown}
              onPaste={handleDescriptionPaste}
              placeholder={isPointByPoint ? "• Enter first point..." : "Enter phase description..."}
              rows={3}
            />
          </div>
          <div className="td-phase-edit-actions">
            <button className="hrms-common-btn-cancel" onClick={() => setIsEditing(false)} disabled={isSaving}>
              Cancel
            </button>
            <button className="hrms-common-btn-primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="td-phase-text-container" style={{ width: '100%', wordBreak: 'break-all' }}>
            <div className="td-phase-text" style={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>
              {phaseName || <em style={{ color: "#9ca3af" }}>— No details provided —</em>}
            </div>
            {phaseDesc && (
              <div className="td-phase-desc" style={{ wordBreak: 'break-word', marginTop: '6px' }}>
                {renderDescription(phaseDesc)}
              </div>
            )}
          </div>

          {uniquePhaseUpdates.some(u => u.note) && (
            <div className="td-phase-updates">
              {uniquePhaseUpdates.map((u, i) => (
                u.note && (
                  <div key={i} className="td-phase-update-row">
                    <div className="td-phase-update-note">
                      {u.note}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const TaskDetailsModal = ({ taskId, onClose, initialData = null }) => {
  const [task, setTask] = useState(initialData);
  const [assignedMembers, setAssignedMembers] = useState(initialData?.assignedMembers || []);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [dailyUpdates, setDailyUpdates] = useState([]);
  const [showRejectReasonModal, setShowRejectReasonModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activePhaseMemberFilter, setActivePhaseMemberFilter] = useState("all");

  const sessionData = sessionStorage.getItem("Erti-Portal");
  const authData = sessionData ? JSON.parse(sessionData) : null;
  const token = authData?.token || "";

  const currentUserId = useMemo(() => {
    if (authData?.user?._id) return authData.user._id;
    if (authData?.user?.id) return authData.user.id;
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded?.id || decoded?._id || decoded?.userId || null;
    } catch { return null; }
  }, [authData, token]);

  const createdById = useMemo(() => {
    if (!task?.createdBy) return null;
    return typeof task.createdBy === "string"
      ? task.createdBy
      : task.createdBy._id || task.createdBy.id || null;
  }, [task?.createdBy]);

  const userRole = (authData?.user?.role || authData?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin" || Boolean(authData?.user?.isHr);
  const isTaskCreator = useMemo(() => {
    if (isAdmin) return true;
    if (!currentUserId || !createdById) return false;
    return String(currentUserId) === String(createdById);
  }, [currentUserId, createdById, isAdmin]);

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

  const isAssignedMember = useMemo(() => {
    if (!currentUserId || !task?.assignedMembers) return false;
    return task.assignedMembers.some(m => {
      const id = typeof m === "string" ? m : m?._id;
      return String(id) === String(currentUserId);
    });
  }, [currentUserId, task?.assignedMembers]);

  const isAssignedToOthers = useMemo(() => {
    if (!task?.assignedMembers || !task?.createdBy) return false;
    const creatorId = typeof task.createdBy === "object" ? (task.createdBy._id || task.createdBy.$oid || task.createdBy) : task.createdBy;
    return task.assignedMembers.some((m) => {
      const memberId = typeof m === "object" ? (m._id || m.$oid || m) : m;
      return memberId && String(memberId) !== String(creatorId);
    });
  }, [task?.assignedMembers, task?.createdBy]);

  const myMemberStatus = useMemo(() => {
    if (!currentUserId) return null;
    if (Array.isArray(task?.memberStatuses) && task.memberStatuses.length > 0) {
      const ms = task.memberStatuses.find(
        m => (m.employeeId?._id || m.employeeId || "").toString() === String(currentUserId)
      );
      if (ms) return (ms.assignedStatus || "").toLowerCase();
    }
    return (task?.assignedStatus || "").toLowerCase();
  }, [task, currentUserId]);

  const visibleAssignedMembers = useMemo(() => {
    if (isAssignedMember && !isTaskCreator && currentUserId) {
      return assignedMembers.filter(emp => (emp?._id || emp).toString() === String(currentUserId));
    }
    return assignedMembers;
  }, [assignedMembers, isAssignedMember, isTaskCreator, currentUserId]);

  const currentDisplayStartDate = useMemo(() => {
    if (isAssignedMember && !isTaskCreator && currentUserId && Array.isArray(task?.memberStatuses)) {
      const ms = task.memberStatuses.find(m => (m.employeeId?._id || m.employeeId || "").toString() === String(currentUserId));
      if (ms?.startDate !== undefined && ms?.startDate !== null) return ms.startDate;
    }
    return task?.startDate;
  }, [task, isAssignedMember, isTaskCreator, currentUserId]);

  const currentDisplayEndDate = useMemo(() => {
    if (isAssignedMember && !isTaskCreator && currentUserId && Array.isArray(task?.memberStatuses)) {
      const ms = task.memberStatuses.find(m => (m.employeeId?._id || m.employeeId || "").toString() === String(currentUserId));
      if (ms?.endDate !== undefined && ms?.endDate !== null) return ms.endDate;
    }
    return task?.endDate;
  }, [task, isAssignedMember, isTaskCreator, currentUserId]);

  const currentDisplayStatus = useMemo(() => {
    if (isAssignedMember && !isTaskCreator && currentUserId && Array.isArray(task?.memberStatuses)) {
      const ms = task.memberStatuses.find(m => (m.employeeId?._id || m.employeeId || "").toString() === String(currentUserId));
      if (ms?.assignedStatus?.toLowerCase() === "rejected" || ms?.status?.toLowerCase() === "ignored" || ms?.status?.toLowerCase() === "rejected") {
        return "Rejected";
      }
      if (ms?.status) return ms.status;
    }
    if (task?.assignedStatus?.toLowerCase() === "rejected" || task?.status?.toLowerCase() === "rejected" || task?.status?.toLowerCase() === "ignored") {
      return "Rejected";
    }
    return task?.status;
  }, [task, isAssignedMember, isTaskCreator, currentUserId]);

  const isTaskCompleted = useMemo(() => {
    const s = (task?.status || "").toLowerCase().replace(/[\s\-_]/g, "");
    const ds = (currentDisplayStatus || "").toLowerCase().replace(/[\s\-_]/g, "");
    return s === "completed" || ds === "completed";
  }, [task?.status, currentDisplayStatus]);

  const currentDisplayRejectionReason = useMemo(() => {
    if (isAssignedMember && !isTaskCreator && currentUserId && Array.isArray(task?.memberStatuses)) {
      const ms = task.memberStatuses.find(m => (m.employeeId?._id || m.employeeId || "").toString() === String(currentUserId));
      if (ms?.rejectionReason) return ms.rejectionReason;
    }
    return task?.rejectionReason;
  }, [task, isAssignedMember, isTaskCreator, currentUserId]);

  const showApproveReject = useMemo(() =>
    isAssignedMember && myMemberStatus === "allocated",
    [isAssignedMember, myMemberStatus]);

  const hasAnyAcceptedMember = useMemo(() => {
    if (task?.assignedStatus?.toLowerCase() === "accepted") return true;
    if (Array.isArray(task?.memberStatuses)) {
      return task.memberStatuses.some(ms => (ms.assignedStatus || "").toLowerCase() === "accepted");
    }
    return false;
  }, [task]);

  const showEditCancel = useMemo(() => {
    if (!task?.status || isTaskCompleted) return false;

    // For an assigned member: only allow editing if this member has accepted the task
    if (isAssignedMember) {
      if (myMemberStatus !== "accepted") return false;
    } else if (!isTaskCreator) {
      return false;
    }

    // Restriction: Prevent creator from editing/modifying assigned tasks after they have been accepted by any member
    if (isTaskCreator && !isAssignedMember && hasAnyAcceptedMember) {
      return false;
    }

    const status = task.status.toLowerCase().replace(/\s+/g, "");
    const editableStatuses = ["assigned", "pending", "inprocess", "hold"];
    return editableStatuses.includes(status);
  }, [isTaskCreator, isAssignedMember, task, hasAnyAcceptedMember, myMemberStatus, isTaskCompleted]);

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "N/A";

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

        const project = taskData.project;
        const category = taskData.category;

        if (project && category) {
          try {
            const standaloneRes = await portalInstance.get("/creat/daily-update/standalone-updates", {
              params: { project, category, employeeId: currentUserId }
            });

            if (standaloneRes.data?.success) {
              const regularUpdates = updatesRes.data?.data || [];
              const standaloneUpdates = (standaloneRes.data?.data || []).filter(u => u.task?._id === "standalone");
              setDailyUpdates([...regularUpdates, ...standaloneUpdates]);
            } else {
              setDailyUpdates(updatesRes.data?.data || []);
            }
          } catch (err) {
            console.error("Standalone updates fetch error:", err);
            setDailyUpdates(updatesRes.data?.data || []);
          }
        } else {
          setDailyUpdates(updatesRes.data?.data || []);
        }
      }

    } catch (err) {
      console.error("DATA FETCH ERROR:", err);
      if (!task) setError("Failed to load task details.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const handleDeleteTask = async () => {
    if (!canDeleteTask) { toast.error("No permission to delete."); return; }
    try {
      setLoading(true);
      await portalInstance.delete(`/creat/task/${taskId}`);
      toast.success("Task deleted successfully!");
      setTimeout(onClose, 1500);
    } catch (err) { toast.error(err.response?.data?.message || "Failed to delete task."); }
    finally { setLoading(false); setShowDeleteConfirm(false); }
  };

  const handleStatusUpdate = async (newStatus, assignedStatusValue) => {
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("status", newStatus);
      fd.append("assignedStatus", assignedStatusValue);
      if (selectedFile) fd.append("files", selectedFile);
      await portalInstance.put(`/creat/task/${taskId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Task ${assignedStatusValue} successfully!`);
      setTimeout(onClose, 1500);
    } catch {
      toast.error("Failed to update task status.");
    } finally { setLoading(false); }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      toast.warning("Rejection reason is mandatory");
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("status", "ignored");
      fd.append("assignedStatus", "Rejected");
      fd.append("rejectionReason", rejectionReason.trim());
      await portalInstance.put(`/creat/task/${taskId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Task Rejected successfully!");
      setShowRejectReasonModal(false);
      setTimeout(onClose, 1500);
    } catch {
      toast.error("Failed to reject task.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPopup = () => {
    if (isTaskCompleted) {
      toast.warning("Completed tasks cannot be edited.");
      return;
    }
    setShowUpdatePopup(true);
    setShowOptionsMenu(false);
  };
  const handleDownload = (url) => {
    if (!url) return;
    if (typeof url === "object") {
      url = url.fileUrl || url.url || url._id || "";
    }
    url = String(url);
    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank");
    } else {
      const base = (portalInstance.defaults.baseURL || "").replace(/\/+$/, "");
      const path = url.replace(/^\/+/, "");
      window.open(`${base}/${path}`, "_blank");
    }
  };



  const handleUpdateSuccess = () => { setShowUpdatePopup(false); fetchAllData(); };

  /* ─── Footer buttons ─── */
  const renderFooterButtons = () => {
    if (showApproveReject) return (
      <>
        <button
          className="hrms-common-btn-danger"
          style={{ minWidth: '120px' }}
          onClick={() => {
            setRejectionReason("");
            setShowRejectReasonModal(true);
          }}
          disabled={loading}
        >
          Reject
        </button>
        <button className="hrms-common-btn-primary" style={{ minWidth: '120px' }}
          onClick={() => handleStatusUpdate("pending", "Accepted")} disabled={loading}>Accept Task</button>
      </>
    );
    if (showEditCancel) return (
      <>
        <button className="hrms-common-btn-cancel" style={{ minWidth: '120px' }} onClick={onClose}>Cancel</button>
        <button className="hrms-common-btn-primary" style={{ minWidth: '120px' }} onClick={handleEditPopup} disabled={loading}>Edit Task</button>
      </>
    );
    return <button className="hrms-common-btn-cancel" style={{ minWidth: '120px' }} onClick={onClose}>Close</button>;
  };

  /* ─── Derived: phases array ─── */
  const phases = useMemo(() => {
    if (!task?.phases) return [];
    return task.phases.filter(p => {
      const name = typeof p === 'object' ? (p.phaseTitle || p.phase) : p;
      return name && name.trim() !== "";
    });
  }, [task?.phases]);

  const displayedPhases = useMemo(() => {
    // For assigned members (who didn't create the task), strictly isolate to only their own phases
    if (isAssignedMember && !isTaskCreator && currentUserId) {
      return phases.filter(p => {
        const ownerId = (p.employeeId?._id || p.employeeId || "").toString();
        return ownerId === String(currentUserId) || !ownerId;
      });
    }

    if (activePhaseMemberFilter === "all") return phases;
    return phases.filter(p => {
      const ownerId = (p.employeeId?._id || p.employeeId || "").toString();
      return ownerId === activePhaseMemberFilter;
    });
  }, [phases, activePhaseMemberFilter, isAssignedMember, isTaskCreator, currentUserId]);

  if (!taskId) return null;

  return (
    <>

      <div className="employee-task-details-overlay">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          style={{ zIndex: 20000 }} // Ensure it's above the modal (9999)
        />
        <div className="employee-task-details-container" onClick={e => e.stopPropagation()}>

          {loading && !task ? (
            <div className="emp-details-loading p-5 text-center">
              <div className="spinner-border text-primary" />
              <p className="mt-2">Loading...</p>
            </div>
          ) : error ? (
            <div className="emp-details-error p-5 text-center text-danger">{error}</div>
          ) : task && (
            <>
              {/* ─── HEADER ─── */}
              <div className="employee-task-details-header">
                <div className="header-title-group">
                  <h4 className="assign-task__members-title">Task Details</h4>
                  <span className={`employee-task-details-priority-badge ${(task.priority || "high").toLowerCase()}`}>
                    {task.priority || "High"}
                  </span>
                </div>
                <div className="header-right-actions">
                  {canDeleteTask && (
                    <div className="options-menu-container" onClick={e => e.stopPropagation()}>
                      <button className="employee-task-details-options-btn"
                        onClick={e => { e.stopPropagation(); setShowOptionsMenu(p => !p); }}>
                        ...
                      </button>
                      {showOptionsMenu && (
                        <div className="options-dropdown">
                          <button className="dropdown-item delete-item"
                            onClick={() => { setShowDeleteConfirm(true); setShowOptionsMenu(false); }}>
                            Delete Task
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button className="hrms-common-close-btn" onClick={onClose} aria-label="Close">

                    ✕
                  </button>
                </div>
              </div>

              {/* ─── BODY ─── */}
              <div className="employee-task-details-body">

                {/* Assigned Members */}
                {visibleAssignedMembers.length > 0 && (
                  <>
                    <div className="employee-task-details-assigned-panel">
                      <label className="admin-task-details-section-label">Assigned Members</label>
                      <div className="employee-task-details-members-list">
                        {visibleAssignedMembers.map(emp => {
                          const empIdStr = (emp?._id || emp).toString();
                          const mStatus = (task?.memberStatuses || []).find(
                            ms => (ms.employeeId?._id || ms.employeeId || "").toString() === empIdStr
                          );
                          const memberAssignedStatus = mStatus?.assignedStatus || task?.assignedStatus || "Allocated";
                          const memberWorkStatus = mStatus?.status || task?.status || "Pending";
                          const isAcc = (memberAssignedStatus || "").toLowerCase() === "accepted";
                          const isRej = (memberAssignedStatus || "").toLowerCase() === "rejected";

                          return (
                            <div key={emp?._id || empIdStr} className="employee-task-details-member-card">
                              <img
                                src={emp?.avatar || emp?.photoUrl || emp?.pictureUrl || "/avatar.png"}
                                alt={emp?.name || "Member"} className="employee-task-details-avatar"
                                onError={e => { e.target.src = "/avatar.png"; }}
                              />
                              <div className="employee-task-details-member-info">
                                <div className="employee-task-details-member-name">{emp?.name}</div>
                                <div className="employee-task-details-member-role d-flex align-items-center gap-1 flex-wrap">
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
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="employee-task-details-divider" />
                  </>
                )}

                {/* Task info + docs */}
                <div className="employee-task-details-info-panel">
                  {/* ROW 1: Category / Project, Priority, Work Type */}
                  <div
                    className="employee-task-details-info-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "16px",
                      marginBottom: "16px",
                      alignItems: "flex-start"
                    }}
                  >
                    <div className="employee-task-details-info-stat" style={{ minWidth: 0 }}>
                      <label className="admin-task-details-section-label">Category / Project</label>
                      <div className="admin-task-details-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{(task?.category || "—").toUpperCase()}</span>
                        <span style={{ color: "#c4c4c4" }}>/</span>
                        <span>{task?.project ? (task.project.charAt(0).toUpperCase() + task.project.slice(1).toLowerCase()) : "—"}</span>
                      </div>
                    </div>

                    <div className="employee-task-details-info-stat" style={{ minWidth: 0 }}>
                      <label className="admin-task-details-section-label">Priority</label>
                      <div className="admin-task-details-value">{task?.priority || "Mid"}</div>
                    </div>

                    <div className="employee-task-details-info-stat" style={{ minWidth: 0 }}>
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
                    className="employee-task-details-info-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "16px",
                      marginBottom: "16px",
                      alignItems: "flex-start"
                    }}
                  >
                    <div className="employee-task-details-info-stat" style={{ minWidth: 0 }}>
                      <label className="admin-task-details-section-label">Start Date</label>
                      {isTaskCreator && visibleAssignedMembers.length > 1 ? (
                        <div className="admin-task-details-value" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {visibleAssignedMembers.map(emp => {
                            const empIdStr = (emp?._id || emp).toString();
                            const ms = (task?.memberStatuses || []).find(
                              m => (m.employeeId?._id || m.employeeId || "").toString() === empIdStr
                            );
                            const empStartDate = ms?.startDate !== undefined && ms?.startDate !== null ? ms.startDate : task?.startDate;
                            return (
                              <div key={empIdStr} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", whiteSpace: "nowrap" }}>
                                <span style={{ color: "#64748b", fontWeight: "500" }}>{emp.name || "Member"}:</span>
                                <span style={{ color: "#1e293b", fontWeight: "500" }}>{formatDate(empStartDate)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="admin-task-details-value">{formatDate(currentDisplayStartDate)}</div>
                      )}
                    </div>

                    <div className="employee-task-details-info-stat" style={{ minWidth: 0 }}>
                      <label className="admin-task-details-section-label">End Date</label>
                      {isTaskCreator && visibleAssignedMembers.length > 1 ? (
                        <div className="admin-task-details-value" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {visibleAssignedMembers.map(emp => {
                            const empIdStr = (emp?._id || emp).toString();
                            const ms = (task?.memberStatuses || []).find(
                              m => (m.employeeId?._id || m.employeeId || "").toString() === empIdStr
                            );
                            const empEndDate = ms?.endDate !== undefined && ms?.endDate !== null ? ms.endDate : task?.endDate;
                            return (
                              <div key={empIdStr} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", whiteSpace: "nowrap" }}>
                                <span style={{ color: "#64748b", fontWeight: "500" }}>{emp.name || "Member"}:</span>
                                <span style={{ color: "#1e293b", fontWeight: "500" }}>{formatDate(empEndDate)}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="admin-task-details-value">{formatDate(currentDisplayEndDate)}</div>
                      )}
                    </div>

                    <div className="employee-task-details-info-stat" style={{ minWidth: 0 }}>
                      <label className="admin-task-details-section-label">Due Date</label>
                      <div className="admin-task-details-value">{formatDate(task?.dueDate)}</div>
                    </div>
                  </div>

                  {/* ROW 3: Status only */}
                  <div
                    className="employee-task-details-info-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "16px",
                      marginBottom: "16px",
                      alignItems: "flex-start"
                    }}
                  >
                    <div className="employee-task-details-info-stat" style={{ minWidth: 0 }}>
                      <label className="admin-task-details-section-label">Status</label>
                      {isTaskCreator && visibleAssignedMembers.length > 1 ? (
                        <div className="admin-task-details-value" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {visibleAssignedMembers.map(emp => {
                            const empIdStr = (emp?._id || emp).toString();
                            const ms = (task?.memberStatuses || []).find(
                              m => (m.employeeId?._id || m.employeeId || "").toString() === empIdStr
                            );
                            const empStatusRaw = (ms?.assignedStatus?.toLowerCase() === "rejected" || ms?.status?.toLowerCase() === "ignored" || ms?.status?.toLowerCase() === "rejected")
                              ? "rejected"
                              : (ms?.status || (ms?.assignedStatus === "Accepted" ? "inprocess" : "pending"));
                            const s = String(empStatusRaw || "").toLowerCase().replace(/[-_\s]/g, "");
                            let label = "Pending";
                            let color = "#d97706";
                            if (s === "completed" || s === "complete") {
                              label = "Completed";
                              color = "#16a34a";
                            } else if (s === "inprocess" || s === "inprogress") {
                              label = "In Process";
                              color = "#2563eb";
                            } else if (s === "hold" || s === "onhold") {
                              label = "On Hold";
                              color = "#dc2626";
                            } else if (s === "assigned") {
                              label = "Assigned";
                              color = "#d97706";
                            } else if (s === "rejected" || s === "ignored" || s === "reject") {
                              label = "Rejected";
                              color = "#dc2626";
                            }
                            return (
                              <div key={empIdStr} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", whiteSpace: "nowrap" }}>
                                <span style={{ color: "#64748b", fontWeight: "500" }}>{emp.name || "Member"}:</span>
                                <span style={{ color, fontWeight: "600" }}>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="admin-task-details-value">
                          {(() => {
                            const s = String(currentDisplayStatus || "").toLowerCase().replace(/[-_\s]/g, "");
                            let label = "Pending";
                            let color = "#d97706";
                            if (s === "completed" || s === "complete") {
                              label = "Completed";
                              color = "#16a34a";
                            } else if (s === "inprocess" || s === "inprogress") {
                              label = "In Process";
                              color = "#2563eb";
                            } else if (s === "hold" || s === "onhold") {
                              label = "On Hold";
                              color = "#dc2626";
                            } else if (s === "assigned") {
                              label = "Assigned";
                              color = "#d97706";
                            } else if (s === "rejected" || s === "ignored" || s === "reject") {
                              label = "Rejected";
                              color = "#dc2626";
                            }
                            return (
                              <span style={{ color, fontWeight: "500" }}>
                                {label}
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="employee-task-details-horizontal-divider" />

                  {/* Task title + details */}
                  <div className="employee-task-details-content">
                    <h5 className="employee-task-details-task-title">{task?.taskTitle}</h5>
                    <div className="employee-task-details-task-desc">{renderDescription(task?.taskDetails) || "—"}</div>

                    {currentDisplayRejectionReason && (
                      <div style={{ padding: "10px 14px", backgroundColor: "#ffffff", borderRadius: "6px", marginTop: "12px" }}>
                        <span style={{ fontSize: "15px", fontWeight: "500", color: "#dc2626", display: "block", marginBottom: "2px" }}>Rejection Reason:</span>
                        <span style={{ fontSize: "13px", color: "#3a466d" }}>{currentDisplayRejectionReason}</span>
                      </div>
                    )}
                  </div>

                  {/* ——————————————————————————————————————————————————————————————
                      PHASES SECTION — shown after task title
                  —————————————————————————————————————————————————————————————— */}
                  {phases.length > 0 && (
                    <div className="td-phases-section">
                      <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <label className="admin-task-details-section-label m-0">
                            Phase
                          </label>
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
                        {(isTaskCreator || !isAssignedMember) && assignedMembers.length > 1 && (
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
                              const isMe = String(mId) === String(currentUserId);
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
                                  {isMe ? "My Phases" : m.name || "Member"} ({count})
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="td-phases-list">
                        {displayedPhases.map((phase, idx) => (
                          <PhaseItem
                            key={idx}
                            idx={idx}
                            phase={phase}
                            phaseNumber={idx + 1}
                            dailyUpdates={dailyUpdates}
                            taskId={taskId}
                            onSuccess={fetchAllData}
                            assignedMembers={assignedMembers}
                            currentUserId={currentUserId}
                            isTaskCreator={isTaskCreator}
                            isTaskCompleted={isTaskCompleted}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Documents ── */}
                  <div className="admin-task-details-docs-section">
                    <label className="admin-task-details-section-label">Documents</label>

                    {task?.documents && task.documents.length > 0 ? (
                      <div className="hrms-common-file-list" style={{ marginBottom: '10px' }}>
                        {task.documents.map((doc, index) => (
                          <div
                            key={doc._id || index}
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

                  <div className="admin-task-details-footer">
                    {renderFooterButtons()}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="delete-modal-title">Delete Task?</h3>
            <p className="delete-modal-message">
              This task will be permanently deleted.<br />
              Assigned members will lose access. This action cannot be undone.
            </p>
            <div className="delete-modal-buttons">
              <button className="common-modal-btn btn-small-cancel " onClick={() => setShowDeleteConfirm(false)} disabled={loading}>Cancel</button>
              <button className="common-modal-btn btn-reject " onClick={handleDeleteTask} disabled={loading}>
                {loading ? "Deleting..." : "Yes, Delete Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectReasonModal && (
        <div className="delete-confirm-overlay" style={{ zIndex: 999999 }}>
          <div
            className="delete-confirm-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "460px", maxWidth: "92%", padding: "24px", textAlign: "left" }}
          >
            <h3 className="delete-modal-title" style={{ color: "#dc2626", marginBottom: "8px", textAlign: "left", fontSize: "18px", fontWeight: "500" }}>
              Reject Task Assignment
            </h3>
            <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px", lineHeight: "1.4" }}>
              Please provide the reason for rejecting this assigned task. This field is mandatory.
            </p>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "block", marginBottom: "6px" }}>
                Rejection Reason *
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Type your reason for rejection..."
                className="hrms-unified-input-style hrms-common-textarea"
                style={{ width: "100%", padding: "10px", borderRadius: "6px", fontSize: "13px", resize: "vertical" }}
                autoFocus
              />
            </div>
            <div className="delete-modal-buttons" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="common-modal-btn btn-small-cancel"
                onClick={() => setShowRejectReasonModal(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="common-modal-btn btn-reject"
                style={{ backgroundColor: "#dc2626", color: "#fff" }}
                onClick={handleConfirmReject}
                disabled={loading}
              >
                {loading ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Popup */}
      {showUpdatePopup && !isTaskCompleted && (
        <div className="employee-task-details-popup-backdrop">
          <div
            className="employee-task-detailsequal-popup-container employee-task-details-popup-container--wide"
            onClick={e => e.stopPropagation()}
            style={{ width: 'min(900px, 95%)', maxHeight: '90vh' }}
          >
            {isAssignedToOthers && task?.assignedStatus !== "Accepted" ? (
              <EditAssignedTask
                task={task}
                onClose={(shouldRefresh) => {
                  setShowUpdatePopup(false);
                  if (shouldRefresh === true) {
                    fetchAllData();
                  }
                }}
              />
            ) : (
              <UpdateTask
                taskId={taskId}
                onClose={() => {
                  setShowUpdatePopup(false);
                  fetchAllData();
                }}
              />
            )}
          </div>
        </div>
      )}

      <style>{`
        .header-title-group { display:flex; align-items:center; gap:12px; }
        .options-menu-container { position:relative; margin-left:auto; }

        /* â”€â”€ Last-updated stamp â”€â”€ */
        .td-detail-updated-at {
          font-size: 11px;
          color: #9ca3af;
          margin: -4px 0 10px;
        }
        .td-detail-updated-at strong { color: #6b7280; }

        /* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
           PHASES SECTION STYLES
        â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */
        .td-phases-section {
          margin: 20px 0 15px;
          padding: 0;
        }

        .td-phase-text-container {
          
          padding: 10px 14px;
          background: #f8fafc;
          border-radius: 8px;
    
        }

        .td-phase-text {
          font-size: 13px;
          color: #3a466d;
          font-weight: 400;
          line-height: 1.5;
        }

        .td-phase-desc {
          font-size: 12px;
          color: #64748b;
          font-weight: 400;
          line-height: 1.45;
          margin-top: 4px;
          padding-top: 4px;
          border-top: 1px dashed #e2e8f0;
          word-break: break-word;
        }
        
        .td-phases-list { 
          display: flex; 
          flex-direction: column; 
          gap: 15px; 
          margin-top: 15px;
        }
.employee-task-details-container {
  width: min(700px, 95%);
  background: #ffffff;
  border-radius: 5px;
  border: 1px solid #00000017;
  /* font-family: "Gilroy-Bold", sans-serif; */
  max-height: 420px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  margin: 0;
  /* keep centre alignment */
}
.employee-task-details-body {
  overflow-y: auto !important;
  flex: 1;
}

        @keyframes modalAppear {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .td-phase-item {
          background: #f8fafc;
          border: 1px solid #f0f0f5;
          border-radius: 12px;
          padding: 15px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          position: relative;
        }

      
        
        .td-phase-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
        }

        .td-phase-date {
          font-size: 11px;
          color: #3a466d;
          font-weight: 500;
         
          padding: 3px 8px;
          border-radius: 4px;
     
        }
        
        .td-phase-number {
       font-size: 8px;
          color: #94a3b8;
          font-weight: 400;
   
          border-radius: 6px;
          padding: 4px 10px 4px 0px ;
      
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        
        
        /* â”€â”€ Daily Updates Under Phase â”€â”€ */
        .td-phase-updates {
          margin-top: 15px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-left: 15px;

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
        
        .employee-task-details-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }

        .td-phase-update-by {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* â”€â”€ Phase Status Dropdown â”€â”€ */
        .td-phase-status-select {
          font-size: 11px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid transparent;
          cursor: pointer;
          outline: none;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          appearance: none;
          text-align: center;
          min-width: 100px;
        }

        .td-phase-save-btn {
          background: #2ecc71;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .td-phase-save-btn:hover {
          background: #27ae60;
          box-shadow: 0 2px 8px rgba(46, 204, 113, 0.3);
        }
        
        .td-phase-edit-icon {
          font-size: 14px;
          color: #9ca3af;
          cursor: pointer;
          transition: color 0.2s;
          padding: 4px 8px;
        }

      

        /* Inline Phase Edit Styles */

        .td-phase-edit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .td-phase-edit-btn:hover {
          background: #eef2ff;
          border-color: #5977f8;
        }

        .td-phase-edit-btn:hover .td-phase-edit-icon-svg {
          stroke: #5977f8;
        }

        .td-phase-edit-form {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 12px;
          animation: fadeIn 0.25s ease;
        }

        .td-phase-edit-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .td-phase-edit-label {
              display: block;
    font-size: 11px;
    color: #868585;
    font-weight: 500;
    margin-bottom: 6px;
    line-height: 100%;
    letter-spacing: 0.5px;
        }

        .td-phase-edit-input {
          width: 100%;
          padding: 8px 12px;
            padding: 7px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
        color: #374151;   
        }

     
        .td-phase-edit-textarea {
              width: 100%;
          padding: 8px 12px;
            padding: 7px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
        color: #374151; 
        }

        .td-phase-edit-status-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .td-phase-edit-row {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          width: 100%;
        }

        .td-phase-edit-row .td-phase-edit-field {
          flex: 1;
        }

        .td-phase-edit-row .td-phase-edit-status-group {
          flex: 1;
        }

        .td-phase-dropdown-container {
          position: relative;
          width: 100%;
        }

        .td-phase-status-dot {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 2;
          transition: background-color 0.2s ease;
        }

        .td-phase-status-dot.pending {
          background-color: #f59e0b;
        }

        .td-phase-status-dot.inprocess {
          background-color: #3b82f6;
        }

        .td-phase-status-dot.hold {
          background-color: #ef4444;
        }

        .td-phase-status-dot.completed {
          background-color: #22c55e;
        }

        .td-phase-edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 5px;
        }

        .td-phase-btn-cancel {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #475569;
          cursor: pointer;
          transition: background 0.2s;
        }

        .td-phase-btn-cancel:hover {
          background: #f1f5f9;
        }

        .td-phase-btn-save {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: none;
          background: #5977f8;
          color: #ffffff;
          cursor: pointer;
          transition: background 0.2s;
        }

        .td-phase-btn-save:hover {
          background: #3b5bdb;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── CustomDropdown overrides inside Phase Item ── */
        .td-phase-status-dropdown {
          width: 100%;
        }
        .td-phase-status-dropdown .custom-dropdown-trigger {
              width: 100%;
          padding: 8px 12px;
            padding: 7px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 12px;
        color: #374151; 
        }
        .td-phase-status-dropdown .custom-dropdown-trigger span {
          font-size: 12px !important;
          color: #334155 !important;
          font-weight: 500 !important;
        }
        .td-phase-status-dropdown .custom-dropdown-menu {
          border-radius: 8px;
          border-color: #cbd5e1;
        }
        .td-phase-status-dropdown .custom-dropdown-option {
          font-size: 13px;
          padding: 8px 12px;
        }
      `}</style>
    </>
  );
};

export default TaskDetailsModal;
