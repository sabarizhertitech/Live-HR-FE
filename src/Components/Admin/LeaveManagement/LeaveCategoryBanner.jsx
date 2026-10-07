import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { portalInstance } from "../../../Services/instance";
import "./LeaveCategoryBanner.css";

function LeaveCategoryBanner({ refreshTrigger, onRefresh }) {
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);
  const navigate = useNavigate();

  const fetchAlertStatus = useCallback(async () => {
    try {
      const res = await portalInstance.get("leave-categories/unassigned-year-alert");
      if (res.data?.success && res.data?.showAlert) {
        setAlertData(res.data);
      } else {
        setAlertData(null);
      }
    } catch (err) {
      console.error("Failed to check leave category unassigned year alert:", err);
      setAlertData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertStatus();
  }, [fetchAlertStatus, refreshTrigger]);

  if (loading || !alertData || !alertData.showAlert) {
    return null;
  }

  const handleAction = () => {
    navigate("/admin/leave-management", { state: { targetYear: alertData.year } });
  };

  const handleSendReminder = async () => {
    try {
      setSendingReminder(true);
      const res = await portalInstance.post("leave-categories/send-reminder", {
        year: alertData.year,
      });
      if (res.data?.success) {
        toast.success(res.data.message || `Reminder sent to HR to upload FY ${alertData.year} leave categories!`);
      } else {
        toast.error(res.data?.message || "Failed to send reminder");
      }
    } catch (err) {
      console.error("Failed sending reminder to HR:", err);
      toast.error(err.response?.data?.message || "Failed to send reminder to HR.");
    } finally {
      setSendingReminder(false);
    }
  };

  const isSubmitted = alertData.status === "submitted";

  return (
    <div className={`lc-notification-banner ${isSubmitted ? "is-submitted" : "is-pending"}`}>
      <div className="lc-notification-left">
        <div className="lc-notification-icon-wrap">
          <Icon
            icon={isSubmitted ? "solar:check-circle-bold-duotone" : "solar:bell-bing-bold-duotone"}
            width="24"
            height="24"
          />
        </div>
        <div className="lc-notification-text-wrap">
          <strong className="lc-notification-title">
            {alertData.title ||
              (isSubmitted
                ? `Leave Categories Submitted for Approval (FY ${alertData.year})`
                : `Leave Categories Not Uploaded for FY ${alertData.year}`)}
          </strong>
          <p className="lc-notification-message">
            {alertData.message ||
              (isSubmitted
                ? `HR has submitted the FY ${alertData.year} leave categories for review. Please review and approve them.`
                : `The leave categories are not uploaded for FY ${alertData.year}. Send reminder to HR to upload the leave categories.`)}
          </p>
        </div>
      </div>
      <div className="lc-notification-right">
        {isSubmitted ? (
          <button type="button" className="lc-notification-action-btn" onClick={handleAction}>
            <Icon icon="solar:check-read-linear" width="16" />
            Review & Approve
          </button>
        ) : (
          <>
            <button
              type="button"
              className="lc-notification-reminder-btn"
              onClick={handleSendReminder}
              disabled={sendingReminder}
            >
              <Icon icon="solar:bell-bold" width="15" />
              {sendingReminder ? "Sending..." : "Send Reminder to HR"}
            </button>
            <button type="button" className="lc-notification-action-btn" onClick={handleAction}>
              <Icon icon="solar:pen-new-square-bold" width="15" />
              Configure Leave Categories
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default LeaveCategoryBanner;
