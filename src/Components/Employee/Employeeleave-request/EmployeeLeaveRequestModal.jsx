import "./EmployeeLeaveRequestModal.css";
import { portalInstance } from "../../../Services/instance";
import React, { useMemo, useState } from "react";
import "../../../Globel/Layout.css";
import { toast } from "react-toastify";
const DEFAULT_AVATAR = "/avatar.png";

const EmployeeLeaveRequestModal = ({
  leaveData,
  leaveCategories = [],
  onClose,
  onUpdate,
  onRequestCancel,
}) => {
  if (!leaveData) return null;

  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelLoading, setIsCancelLoading] = useState(false);


  const {
    requestType,
    employee,
    reasonType,
    fromDate,
    toDate,
    noOfDays,
    detailedReason,
    remark,
    dayType,
    startTime: rawStartTime,
    endTime: rawEndTime,
    leaveType,
    otherLeaveType,
    startDate,
    endDate,
    totalDays,
    reason,
    rejectionRemark,
    status,
    createdAt,
    updatedAt,
    from,
    to,
    permissionType,
  } = leaveData;

  // Use new field names with fallback to old ones
  const displayRequestType = requestType || "leave";
  const leaveTypeMap = leaveCategories.reduce((acc, cat) => {
    acc[cat.code] = cat.name;
    return acc;
  }, {});

  // STEP 7: Updated displayLeaveType
  const displayLeaveType = useMemo(() => {
    if (displayRequestType === "permission") {
      return permissionType === "AFTERNOON" ? "Out & Return" : (permissionType || "Permission");
    }

    if (displayRequestType === "wfh") {
      return reasonType || "Work From Home";
    }

    if (leaveType === "Others") {
      return otherLeaveType || "Other Leave";
    }

    return (
      leaveTypeMap[leaveType] ||
      leaveType ||
      reasonType ||
      "Leave"
    );
  }, [
    displayRequestType,
    leaveType,
    otherLeaveType,
    reasonType,
    permissionType,
  ]);

  const displayStartDate = fromDate || startDate;
  const displayEndDate = toDate || endDate;
  const displayTotalDays = noOfDays ?? totalDays;
  const displayReason = detailedReason || reason;
  const displayRemark = remark || rejectionRemark;

  // Normalize UTC times to local times if it's a permission request and we have ISO dates/Date objects
  let startTime = rawStartTime;
  let endTime = rawEndTime;

  const actualFrom = from || displayStartDate;
  const actualTo = to || displayEndDate;

  if (displayRequestType === "permission" && actualFrom && actualTo) {
    try {
      const fromD = new Date(actualFrom);
      const toD = new Date(actualTo);
      if (!isNaN(fromD.getTime()) && !isNaN(toD.getTime())) {
        const isISOString = typeof actualFrom === "string" && actualFrom.includes("T");
        const isDateObj = actualFrom instanceof Date;
        if (isISOString || isDateObj) {
          startTime = `${String(fromD.getHours()).padStart(2, "0")}:${String(
            fromD.getMinutes()
          ).padStart(2, "0")}`;
          endTime = `${String(toD.getHours()).padStart(2, "0")}:${String(
            toD.getMinutes()
          ).padStart(2, "0")}`;
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- 1. PROFILE PHOTO LOGIC ---
  const profilePhoto = useMemo(() => {
    if (employee?.avatar) return employee.avatar;
    return DEFAULT_AVATAR;
  }, [employee]);

  // --- 2. STATUS LOGIC ---
  const normalizedStatus = useMemo(
    () => (status || "").toLowerCase().replace(/\s/g, ""),
    [status]
  );

  const isPending = normalizedStatus === "pending";
  const isApproved = normalizedStatus === "approved";
  const isRejected = normalizedStatus === "rejected";
  const isCancelled = normalizedStatus === "cancelled";

  const canUpdate = isPending;

  // --- 3. CAN REQUEST CANCEL LOGIC ---
  const canRequestCancel = useMemo(() => {
    if (isCancelled) return false;

    if (!isPending && !isApproved) return false;
    if (!displayStartDate) return false;

    const now = new Date();
    const todayOnly = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const start = new Date(displayStartDate);
    const end = displayEndDate ? new Date(displayEndDate) : start;

    const startOnly = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );
    const endOnly = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );

    if (endOnly < todayOnly) return false;

    if (startOnly > todayOnly) return true;

    if (dayType === "Half Day" && startOnly.getTime() === todayOnly.getTime()) {
      if (!startTime) return false;

      const [startHour, startMin] = startTime.split(":").map(Number);

      const leaveStartDateTime = new Date(
        todayOnly.getFullYear(),
        todayOnly.getMonth(),
        todayOnly.getDate(),
        startHour || 0,
        startMin || 0,
        0,
        0
      );

      const oneHourBefore = new Date(
        leaveStartDateTime.getTime() - 60 * 60 * 1000
      );

      return now < oneHourBefore;
    }

    if (startOnly.getTime() === todayOnly.getTime()) {
      const tenAM = new Date(
        todayOnly.getFullYear(),
        todayOnly.getMonth(),
        todayOnly.getDate(),
        10,
        0,
        0,
        0
      );
      return now < tenAM;
    }

    if (startOnly < todayOnly && endOnly >= todayOnly) {
      return false;
    }

    return false;
  }, [isPending, isApproved, isCancelled, displayStartDate, displayEndDate, dayType, startTime]);

  // --- 4. FORMATTING HELPERS ---
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime12 = (timeString) => {
    if (!timeString) return "";
    const [hStr, mStr] = timeString.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m)) return timeString;

    const ampm = h >= 12 ? "PM" : "AM";
    const hr12 = ((h + 11) % 12) + 1;
    const mm = m.toString().padStart(2, "0");
    return `${hr12}:${mm} ${ampm}`;
  };

  const getDateRangeDisplay = () => {
    const baseDate = formatDate(displayStartDate);

    if (displayRequestType === "permission" && startTime && endTime) {
      const start12 = formatTime12(startTime);
      const end12 = formatTime12(endTime);
      return `${baseDate} (${start12} - ${end12})`;
    }

    if (
      (dayType === "Half Day" || Number(displayTotalDays) === 0.5) &&
      startTime &&
      endTime
    ) {
      const start12 = formatTime12(startTime);
      const end12 = formatTime12(endTime);
      return `${baseDate} (${start12} - ${end12})`;
    }

    if (displayEndDate && displayEndDate !== displayStartDate) {
      return `${baseDate} - ${formatDate(displayEndDate)}`;
    }
    return baseDate;
  };

  const getTotalDurationDisplay = () => {

if (
  displayRequestType === "permission" &&
  startTime &&
  endTime
) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const totalMinutes =
    (eh * 60 + em) -
    (sh * 60 + sm);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours} Hour ${minutes} Minutes`;
  }

  if (hours) {
    return `${hours} Hour`;
  }

  return `${minutes} Minutes`;
}

    if (
      (dayType === "Half Day" || Number(displayTotalDays) === 0.5) &&
      startTime &&
      endTime
    ) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);

      const startMinutes = (sh || 0) * 60 + (sm || 0);
      const endMinutes = (eh || 0) * 60 + (em || 0);
      const diffMinutes = endMinutes - startMinutes;

      if (diffMinutes <= 0) return "N/A";

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      if (hours > 0 && minutes > 0) {
        return `${hours} Hour${hours > 1 ? "s" : ""} ${minutes} Minute${
          minutes > 1 ? "s" : ""
        }`;
      }
      if (hours > 0) {
        return `${hours} Hour${hours > 1 ? "s" : ""}`;
      }
      return `${minutes} Minute${minutes > 1 ? "s" : ""}`;
    }

    if (displayTotalDays !== undefined && displayTotalDays !== null) {
      const num = Number(displayTotalDays);
      if (Number.isNaN(num)) return `${displayTotalDays}`;
      return `${num} Day${num > 1 ? "s" : ""}`;
    }

    return "N/A";
  };

  const isHalfDay =
    dayType === "Half Day" || Number(displayTotalDays) === 0.5;

  // STEP 1: Updated getModalTitle
  const getModalTitle = () => {
    if (displayRequestType === "permission") {
      return "Permission Request Details";
    }

    return displayRequestType === "leave"
      ? "Leave Request Details"
      : "Work From Home Request Details";
  };

  // STEP 2: Updated getCancelButtonText
  const getCancelButtonText = () => {
    if (displayRequestType === "permission") {
      return "Cancel Permission";
    }

    return displayRequestType === "leave"
      ? "Cancel Leave"
      : "Cancel WFH";
  };

  const getCancelConfirmMessage = () => {
    return displayRequestType === "leave"
      ? "Are you sure you want to cancel this leave request?"
      : "Are you sure you want to cancel this WFH request?";
  };

  const getCancelConfirmButtonText = () => {
    return displayRequestType === "leave"
      ? "Yes, Cancel Leave"
      : "Yes, Cancel WFH";
  };

  const handleCancelRequest = async () => {
    try {
      if (!cancelReason.trim()) {
        toast.error("Please provide a reason for cancellation");
        return;
      }

      setIsCancelLoading(true);

      if (onRequestCancel) {
        await onRequestCancel(cancelReason);
      }

      setShowCancelPopup(false);
      setCancelReason("");
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error(
        err?.response?.data?.message || "Failed to cancel request"
      );
    } finally {
      setIsCancelLoading(false);
    }
  };

  // --- 5. RENDER ---
  return (
    <div className="employee-leave-overlay" onClick={onClose}>
      <div
        className="employee-leave-container popup-blink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="employee-leave-header">
          <h4 className="assign-task__members-title">{getModalTitle()}</h4>
          <button className="common-modal-close-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* BODY */}
        <div className="employee-leave-body common-modal-body">
          <div className="employee-leave-card">
            {/* PROFILE & STATUS */}
            <div className="employee-leave-profile-row">
              <div className="employee-leave-profile">
                <img
                  src={profilePhoto}
                  alt={employee?.name || "Employee"}
                  className="employee-leave-avatar"
                  onError={(e) => {
                    e.target.src = DEFAULT_AVATAR;
                  }}
                />
                <div className="employee-leave-profile-text">
                  <div className="employee-leave-emp-name">
                    {employee?.name || "Unknown Employee"}
                  </div>
                  <div className="employee-leave-emp-role">
                    {employee?.designation || "Employee"}
                  </div>
                </div>
              </div>

              <span
                className={`employee-leave-status-badge employee-leave-status-${
                  normalizedStatus || "default"
                }`}
              >
                {status || "Pending"}
              </span>
            </div>

            {/* DETAILS GRID */}
            <div className="employee-leave-info-grid">

              {/* STEP 3: Updated Request Type display */}
              <div className="employee-leave-info-row">
                <div className="employee-leave-label">Request Type</div>
                <div className="employee-leave-value">
                  {displayRequestType === "permission"
                    ? "Permission Request"
                    : displayRequestType === "leave"
                    ? "Leave Request"
                    : "Work From Home"}
                </div>
              </div>

              {/* STEP 4: Updated Leave Type label */}
              <div className="employee-leave-info-row">
                <div className="employee-leave-label">
                  {displayRequestType === "permission"
                    ? "Permission Type"
                    : displayRequestType === "leave"
                    ? "Leave Type"
                    : "Reason"}
                </div>
                <div className="employee-leave-value">
                  {displayLeaveType || "N/A"}
                </div>
              </div>

              {dayType && (
                <div className="employee-leave-info-row">
                  <div className="employee-leave-label">Day Type</div>
                  <div className="employee-leave-value">{dayType}</div>
                </div>
              )}

              {/* STEP 5: Updated Date Range label */}
              <div className="employee-leave-info-row">
                <div className="employee-leave-label">
                  {displayRequestType === "permission"
                    ? "Permission Date"
                    : "Date Range"}
                </div>
                <div className="employee-leave-value">
                  {getDateRangeDisplay()}
                </div>
              </div>

              {/* STEP 6: Updated Total Days/Hours label */}
              <div className="employee-leave-info-row">
                <div className="employee-leave-label">
                  {displayRequestType === "permission"
                    ? "Duration"
                    : isHalfDay
                    ? "Total Hours"
                    : "Total Days"}
                </div>
                <div className="employee-leave-value">
                  {getTotalDurationDisplay()}
                </div>
              </div>

              {displayRequestType !== "permission" && (
                <div className="employee-leave-info-row">
                  <div className="employee-leave-label">Applied On</div>
                  <div className="employee-leave-value">
                    {formatDate(createdAt)}
                  </div>
                </div>
              )}

              {!isPending && updatedAt && displayRequestType !== "permission" && (
                <div className="employee-leave-info-row">
                  <div className="employee-leave-label">Updated On</div>
                  <div className="employee-leave-value">
                    {formatDate(updatedAt)}
                  </div>
                </div>
              )}

              <div className="employee-leave-info-row employee-leave-info-row--reason">
                <div className="employee-leave-label">Reason</div>
                <div className="employee-leave-values employee-leave-reason-text">
                  {displayReason || "No reason provided"}
                </div>
              </div>

              {displayRemark && (
                <div className="employee-leave-info-row employee-leave-remark-row">
                  <div className="employee-leave-label">
                    Admin {isRejected ? "Rejection " : ""}Remarks
                  </div>
                  <div
                    className={`employee-leave-remark-box ${
                      isRejected
                        ? "employee-leave-remark-box--rejection"
                        : "employee-leave-remark-box--general"
                    }`}
                  >
                    {displayRemark}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="employee-leave-footer">
              <button
                className="hrms-common-btn-cancel"
                onClick={onClose}
              >
                Close
              </button>

              {canUpdate && (
                <button
                  className="hrms-common-btn-primary"
                  onClick={onUpdate}
                >
                  Update
                </button>
              )}

              {(isPending || isApproved) && canRequestCancel && !isCancelled && (
                <button
                  className="hrms-common-Reject-btn"
                  onClick={() => setShowCancelPopup(true)}
                >
                  {getCancelButtonText()}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CANCEL POPUP */}
      {showCancelPopup && (
        <div
          className="cancel-validation-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setShowCancelPopup(false);
            setCancelReason("");
          }}
        >
          <div
            className="cancel-validation-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cancel-validation-header">
              <div className="cancel-validation-title-wrap">
                <span className="cancel-validation-modals">
                  {displayRequestType === "permission"
                    ? "Confirm Permission Cancellation"
                    : displayRequestType === "leave"
                    ? "Confirm Leave Cancellation"
                    : "Confirm WFH Cancellation"}
                </span>
              </div>
              <button
                type="button"
                className="cancel-validation-close-btn"
                onClick={() => {
                  setShowCancelPopup(false);
                  setCancelReason("");
                }}
                disabled={isCancelLoading}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="cancel-validation-desc">{getCancelConfirmMessage()}</p>

            <div className="cancel-validation-reason-section">
              <label className="cancel-validation-label">
                Reason for Cancellation <span className="cancel-validation-req">*</span>
              </label>
              <textarea
                className="cancel-validation-textarea"
                placeholder="Please provide a reason for your cancellation request..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                disabled={isCancelLoading}
              />
            </div>

            <div className="cancel-validation-actions">
              <button
                type="button"
                className="hrms-common-btn-cancel"
                onClick={() => {
                  setShowCancelPopup(false);
                  setCancelReason("");
                }}
                disabled={isCancelLoading}
              >
                No, Keep{" "}
                {displayRequestType === "permission"
                  ? "Permission"
                  : displayRequestType === "leave"
                  ? "Leave"
                  : "WFH"}
              </button>

              <button
                type="button"
                className="hrms-common-Reject-btn"
                onClick={handleCancelRequest}
                disabled={isCancelLoading}
              >
                {isCancelLoading ? "Cancelling..." : getCancelConfirmButtonText()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaveRequestModal;