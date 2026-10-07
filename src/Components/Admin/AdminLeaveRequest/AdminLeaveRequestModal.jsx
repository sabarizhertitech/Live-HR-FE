import React, { useState, useEffect } from "react";
import "./AdminLeaveRequestModal.css";
import { portalInstance } from "../../../Services/instance";
import { toast } from "react-toastify";
import "../../../Globel/Layout.css";

const DEFAULT_AVATAR = "/avatar.png";

const AdminLeaveRequestModal = ({ 
  isOpen, 
  onClose, 
  data, 
  leaveCategories = [],
  requestType = "leave", // ✅ NEW: Accept request type from parent
  onStatusUpdate 
}) => {
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [confirmMessage, setConfirmMessage] = useState("");

  useEffect(() => {
    if (data?.remark) {
      setRemarks(data.remark);
    } else {
      setRemarks("");
    }
  }, [data]);

  if (!isOpen || !data) return null;

  const {
    _id,
    employee,
    reasonType,
    leaveType,
    fromDate,
    toDate,
    noOfDays,
    detailedReason,
    otherReason,
    status,
    dayType,
    startTime,
    endTime,
    createdAt,
    remark,
  } = data;

  // Check status types
  const statusLower = (status || "pending").toLowerCase();
  const isPending = !status || statusLower === "pending";
  const isApproved = statusLower === "approved";
  const isRejected = statusLower === "rejected";
  const isCancelled = statusLower === "cancelled";

  const profilePhoto = employee?.avatar || DEFAULT_AVATAR;

  // ✅ NEW: Get modal title based on request type
const getModalTitle = () => {

  if (requestType === "permission") {
    return "Permission Request Details";
  }

  if (isPending) {
    return requestType === "leave"
      ? "Leave Request Details"
      : "Work From Home Request Details";
  }

  if (isCancelled) {
    return requestType === "leave"
      ? "Leave Cancellation Request"
      : "WFH Cancellation Request";
  }

  return requestType === "leave"
    ? "Leave Request Details"
    : "Work From Home Request Details";
};  // ✅ NEW: Get request type display text
  const getRequestTypeLabel = () => {
    return requestType === "leave" ? "Leave Request" : requestType === "permission" ? "Permission Request" : "Work From Home (WFH)";
  };

  // ✅ NEW: Get reason type label based on request type
  const getReasonLabel = () => {
    if (requestType === "permission") {
      return "Permission Type";
    }
    return requestType === "leave" ? "Leave Type" : "Reason Type";
  };

  const formatDate = (d) => {
    if (!d) return "N/A";
    try {
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return "N/A";
      return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return "N/A";
    }
  };

  const calculateTotalHours = (start, end) => {
    if (!start || !end) return null;
    try {
      const [startHour, startMin] = start.split(":").map(Number);
      const [endHour, endMin] = end.split(":").map(Number);

      const startTotalMinutes = startHour * 60 + startMin;
      const endTotalMinutes = endHour * 60 + endMin;

      const diffMinutes = endTotalMinutes - startTotalMinutes;

      if (diffMinutes <= 0) return "Invalid Time";

      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      if (hours > 0 && minutes > 0) {
        return `${hours} Hr${hours > 1 ? "s" : ""} ${minutes} Min${
          minutes > 1 ? "s" : ""
        }`;
      } else if (hours > 0) {
        return `${hours} Hr${hours > 1 ? "s" : ""}`;
      } else {
        return `${minutes} Min${minutes > 1 ? "s" : ""}`;
      }
    } catch (e) {
      return null;
    }
  };

  const formatTime = (time) => {
    if (!time) return "";
    try {
      const [hour, min] = time.split(":").map(Number);
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 || 12;
      return `${formattedHour.toString().padStart(2, "0")}:${min
        .toString()
        .padStart(2, "0")} ${ampm}`;
    } catch (e) {
      return time || "";
    }
  };

  const formatTimeRange = (from, to) => {
    try {
      if (!from || !to) return "N/A";
      const fromD = new Date(from);
      const toD = new Date(to);
      if (isNaN(fromD.getTime()) || isNaN(toD.getTime())) return "N/A";
      return `${fromD.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })} - ${toD.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
    } catch (e) {
      return "N/A";
    }
  };

  let dateRangeDisplay = "";
  if (requestType === "permission") {
    const timeRange =
      startTime && endTime
        ? `${formatTime(startTime)} - ${formatTime(endTime)}`
        : formatTimeRange(fromDate, toDate);
    dateRangeDisplay = timeRange;
  } else if (dayType === "Half Day") {
    const timeRange =
      startTime && endTime
        ? `(${formatTime(startTime)} - ${formatTime(endTime)})`
        : "";
    dateRangeDisplay = `${formatDate(fromDate)} ${timeRange}`;
  } else {
    dateRangeDisplay = `${formatDate(fromDate)} ${
      toDate && toDate !== fromDate ? "- " + formatDate(toDate) : ""
    }`;
  }

  let totalDurationDisplay = "";
  if (requestType === "permission") {
    try {
      const fromD = new Date(fromDate);
      const toD = new Date(toDate);
      if (!isNaN(fromD.getTime()) && !isNaN(toD.getTime())) {
        const diffMs = toD - fromD;
        const diffMins = Math.ceil(diffMs / 60000);
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        totalDurationDisplay = hrs > 0 ? `${hrs} Hr${hrs > 1 ? "s" : ""} ${mins} Min${mins > 1 ? "s" : ""}` : `${mins} Min${mins > 1 ? "s" : ""}`;
      } else {
        totalDurationDisplay = "N/A";
      }
    } catch (e) {
      totalDurationDisplay = "N/A";
    }
  } else if (dayType === "Half Day" && startTime && endTime) {
    const totalHours = calculateTotalHours(startTime, endTime);
    totalDurationDisplay = `${noOfDays} Day (${totalHours})`;
  } else {
    totalDurationDisplay = `${noOfDays} ${
      Number(noOfDays) > 1 ? "Days" : "Day"
    }`;
  }

  const leaveTypeMap = leaveCategories.reduce((acc, cat) => {
    acc[cat.code] = cat.name;
    return acc;
  }, {});

  const displayLeaveType =
    leaveTypeMap[leaveType] ||
    leaveType ||
    "N/A";

  const displayReason =
    reasonType === "Others" && otherReason ? otherReason : (reasonType === "AFTERNOON" ? "Out & Return" : reasonType);

  // ✅ UPDATED: Get action labels based on request type
  const getActionLabels = () => {
    const approveText = requestType === "leave" ? "Approve Leave" : requestType === "permission" ? "Approve Permission" : "Approve WFH";
    const rejectText = requestType === "leave" ? "Reject Leave" : requestType === "permission" ? "Reject Permission" : "Reject WFH";
    
    return {
      approve: approveText,
      reject: rejectText,
      approveStatus: "Approved",
      rejectStatus: "Rejected",
    };
  };

  const actionLabels = getActionLabels();

  const handleDirectAction = async (newStatus) => {
    if (loading) return;

    if (newStatus === "Rejected" && !remarks.trim()) {
      toast.warning("Remarks are required when rejecting a request");
      return;
    }

    try {
      setLoading(true);

      if (requestType === "permission") {
        await portalInstance.put(
          `/api/leaves/permission/${_id}/status`,
          {
            status: newStatus,
            remark: remarks.trim(),
          }
        );
        toast.success(`Permission request ${newStatus.toLowerCase()} successfully`);
      } else {
        await portalInstance.put(`/api/leaves/${_id}/status`, {
          status: newStatus,
          remark: remarks.trim(),
        });
        toast.success(
          `${requestType === "leave" ? "Leave" : "WFH"} request ${newStatus.toLowerCase()} successfully`
        );
      }

      if (onStatusUpdate) {
        onStatusUpdate(_id, newStatus);
      }
      setRemarks("");
      onClose();
    } catch (err) {
      console.error("Action error:", err);
      toast.error(
        err.response?.data?.message || `Failed to ${newStatus.toLowerCase()} request`
      );
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    if (!loading) {
      setRemarks("");
      setShowConfirm(false);
      setPendingStatus(null);
      onClose();
    }
  };

  const closeConfirmation = (e) => {
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <>
      <div className="admin-leave-overlay" onClick={closeModal}>
        <div
          className="admin-leave-container"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="admin-leave-loading-state">
              <div className="admin-leave-spinner"></div>
              <p>Processing Request...</p>
            </div>
          ) : (
            <>
              <div className="admin-leave-header">
                <h4 className="admin-leave-title">{getModalTitle()}</h4>
                <button
                  className="admin-leave-options-btn"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="admin-leave-body">
                <div className="admin-leave-card">
                  {/* PROFILE ROW */}
                  <div className="admin-leave-profile-row">
                    <div className="admin-leave-profile">
                      <img
                        className="admin-leave-avatar"
                        src={profilePhoto}
                        alt="Profile"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = DEFAULT_AVATAR;
                        }}
                      />
                      <div className="admin-leave-profile-text">
                        <div className="admin-leave-emp-name">
                          {employee?.name || "Unknown"}
                        </div>
                        <div className="admin-leave-emp-role">
                          {employee?.department || "Unknown"}
                        </div>
                      </div>
                    </div>

                    {!isPending && (
                      <div
                        className={`leave-status leave-status-${statusLower.replace(
                          /\s+/g,
                          "-"
                        )}`}
                      >
                        {status}
                      </div>
                    )}
                  </div>

                  {/* INFO GRID */}
                  <div className="admin-leave-info-grid">
                    <div className="admin-leave-info-row">
                      <div className="admin-leave-label">
                        {getReasonLabel()}
                      </div>
                      <div className="admin-leave-value">
                        {requestType === "permission"
                          ? displayReason
                          : requestType === "leave"
                          ? displayLeaveType
                          : displayReason}
                      </div>
                    </div>

                    {requestType === "leave" && (
                      <div className="admin-leave-info-row">
                        <div className="admin-leave-label">Reason</div>
                        <div className="admin-leave-value">
                          {displayReason || "N/A"}
                        </div>
                      </div>
                    )}

                    <div className="admin-leave-info-row">
                      <div className="admin-leave-label">
                        {requestType === "permission" ? "Type" : "Day Type"}
                      </div>
                      <div className="admin-leave-value">
                        {requestType === "permission"
                          ? "Permission"
                          : dayType || "Full Day"}
                      </div>
                    </div>

                    <div className="admin-leave-info-row">
                      <div className="admin-leave-label">
                        {requestType === "permission" ? "Time Range" : "Date Range"}
                      </div>
                      <div className="admin-leave-value">{dateRangeDisplay}</div>
                    </div>

                    <div className="admin-leave-info-row">
                      <div className="admin-leave-label">
                        {requestType === "permission"
                          ? "Duration"
                          : dayType === "Half Day"
                          ? "Total Duration"
                          : "Total Days"}
                      </div>
                      <div className="admin-leave-value">
                        {totalDurationDisplay}
                      </div>
                    </div>

                    <div className="admin-leave-info-row">
                      <div className="admin-leave-label">Applied On</div>
                      <div className="admin-leave-value">
                        {formatDate(createdAt || fromDate)}
                      </div>
                    </div>

                    <div className="admin-leave-info-row">
                      <div className="admin-leave-label">Detailed Reason</div>
                      <div className="admin-leave-values admin-leave-reason-text">
                        {detailedReason || "No details provided."}
                      </div>
                    </div>

                    <div className="admin-leave-info-row">
                      <div
                        className="admin-leave-label"
                        style={{ paddingTop: "10px" }}
                      >
                        Admin Remarks
                      </div>

                      {/* Show input ONLY for pending requests */}
                      {isPending ? (
                        <>
                          <textarea
                            className="admin-leave-input admin-leave-textarea"
                            placeholder={`Enter remarks for this ${
                              requestType === "leave" ? "leave" : "WFH"
                            } request...`}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            rows={3}
                          />
                          <p className="remark-hint">
                            {pendingStatus === "Rejected" && !remarks.trim()
                              ? "Remarks are required for rejection"
                              : ""}
                          </p>
                        </>
                      ) : (
                        <div className="admin-leave-values admin-leave-reason-text mt-2">
                          {remark || "No remarks provided."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              
                {/* FOOTER */}
                <div className="admin-leave-footer">
                  {/* Balance summary on the left */}
                  {requestType === "leave" ? (
                    (() => {
                      const getFinYear = (d) => {
                        const date = new Date(d || new Date());
                        if (isNaN(date.getTime())) return null;
                        const month = date.getMonth();
                        const year = date.getFullYear();
                        return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
                      };
                      const finYear = getFinYear(fromDate);
                      let bal = { total: 0, used: 0, remaining: 0 };
                      
                      if (finYear && employee?.leaveBalances?.[finYear]?.[leaveType]) {
                        bal = { ...employee.leaveBalances[finYear][leaveType] };
                      } else if (employee?.leaveBalances?.[leaveType]) {
                        // Fallback for older data format
                        bal = { ...employee.leaveBalances[leaveType] };
                      }

                      // Dynamic category tier evaluation
                      if (leaveCategories && leaveCategories.length > 0) {
                        const targetCat = leaveCategories.find(
                          (c) => c.name.toLowerCase() === (leaveType || "").toLowerCase()
                        );
                        if (targetCat && targetCat.tiers && targetCat.tiers.length > 0) {
                          const joiningDate = new Date(employee?.dateJoined || employee?.createdAt || new Date());
                          const probMonths = Number(employee?.probationPeriodMonths || 0);
                          const probEndDate = new Date(joiningDate);
                          probEndDate.setMonth(probEndDate.getMonth() + probMonths);
                          const inProb = (employee?.probationPeriod === "yes" || employee?.isProbation) && new Date() < probEndDate;

                          const sortedTiers = [...targetCat.tiers].sort((a, b) => b.eligibleMonths - a.eligibleMonths);
                          let catTotal = 0;
                          if (inProb) {
                            const pTier = sortedTiers.find((t) => Number(t.eligibleMonths || 0) === 0);
                            catTotal = pTier ? pTier.leaveCount : 0;
                          } else {
                            const permTier = sortedTiers.find((t) => Number(t.eligibleMonths || 0) > 0);
                            catTotal = permTier ? permTier.leaveCount : (sortedTiers[0] ? sortedTiers[0].leaveCount : 0);
                          }
                          if (catTotal > 0) {
                            bal.total = catTotal;
                          }
                        }
                      }

                      const currentUsed = bal.used || 0;
                      const projectedUsed = isPending ? currentUsed + (noOfDays || 0) : currentUsed;
                      const total = bal.total || 0;
                      const remaining = Math.max(0, total - projectedUsed);

                      if (leaveType === "Others") {
                        return (
                          <div className="admin-leave-type-balance">
                            <div className="balance-item" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className="balance-label" style={{ whiteSpace: "nowrap" }}>
                                {displayLeaveType} Used :
                              </span>
                              <span className="balance-value">{projectedUsed}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="admin-leave-type-balance">
                          <div className="balance-item" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="balance-label" style={{ whiteSpace: "nowrap" }}>
                              {displayLeaveType} Total :
                            </span>
                            <span className="balance-value">{total}</span>
                          </div>
                          <div className="balance-item" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="balance-label" style={{ whiteSpace: "nowrap" }}>
                              Used :
                            </span>
                            <span className="balance-value">{projectedUsed}</span>
                          </div>
                          <div className="balance-item" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="balance-label" style={{ whiteSpace: "nowrap" }}>Remaining :</span>
                            <span className="balance-value">{remaining}</span>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div />
                  )}

                  {/* Buttons on the right */}
                  <div className="admin-leave-footer-buttons">
                    <button
                      className="hrms-common-btn-cancel admin-leave-btn admin-btn-cancel"
                      onClick={closeModal}
                      disabled={loading}
                    >
                      {isPending ? "Cancel" : "Close"}
                    </button>

                    {/* Show action buttons ONLY for pending requests */}
                    {isPending && (
                      <>
                        <button
                          className="hrms-common-Reject-btn admin-leave-btn admin-btn-reject"
                          onClick={() => handleDirectAction("Rejected")}
                          disabled={loading}
                        >
                          {actionLabels.reject}
                        </button>
                        <button
                          className="hrms-common-approve-btn admin-leave-btn admin-btn-approve"
                          onClick={() => handleDirectAction("Approved")}
                          disabled={loading}
                        >
                          {actionLabels.approve}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* --- CONFIRMATION POPUP --- */}
        {showConfirm && (
          <div className="confirmation-overlay" onClick={closeConfirmation}>
            <div
              className="confirmation-box"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Confirm Action</h3>
              <p>{confirmMessage}</p>
              
              {/* ✅ NEW: Show remark requirement warning */}
              {pendingStatus === "Rejected" && !remarks.trim() && (
                <div className="confirmation-warning">
                  Remarks are required when rejecting a request
                </div>
              )}

              <div className="confirmation-buttons">
                <button
                  className="confirm-btn no-btn"
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="confirm-btn yes-btn"
                  onClick={handleFinalSubmit}
                  disabled={
                    loading || 
                    (pendingStatus === "Rejected" && !remarks.trim())
                  }
                >
                  {loading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminLeaveRequestModal;