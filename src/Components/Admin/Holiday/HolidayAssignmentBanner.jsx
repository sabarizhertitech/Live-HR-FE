import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { portalInstance } from "../../../Services/instance";
import "./HolidayAssignmentBanner.css";

function HolidayAssignmentBanner({ onAssignClick, refreshTrigger }) {
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState(false);
  const navigate = useNavigate();

  const fetchAlertStatus = useCallback(async () => {
    try {
      const res = await portalInstance.get("holiday-assignments/unassigned-year-alert");
      if (res.data?.success && res.data?.showAlert) {
        setAlertData(res.data);
      } else {
        setAlertData(null);
      }
    } catch (err) {
      console.error("Failed to check holiday unassigned year alert:", err);
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
    if (onAssignClick) {
      onAssignClick(alertData.year);
    } else {
      navigate("/admin/holiday-management", { state: { targetYear: alertData.year } });
    }
  };

  const handleSendReminder = async () => {
    try {
      setSendingReminder(true);
      const res = await portalInstance.post("holiday-assignments/send-reminder", {
        year: alertData.year,
      });
      if (res.data?.success) {
        toast.success(res.data.message || `Reminder sent to HR to upload ${alertData.year} holidays!`);
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
    <div className="ha-notification-banner">
      <div className="ha-notification-left">
        <div className="ha-notification-icon-wrap">
          <Icon
            icon={isSubmitted ? "solar:check-circle-bold-duotone" : "solar:bell-bing-bold-duotone"}
            width="24"
            height="24"
            className="ha-notification-icon"
          />
        </div>
        <div className="ha-notification-text-wrap">
          <strong className="ha-notification-title">
            {alertData.title ||
              (isSubmitted
                ? `Holiday Calendar Submitted for Approval (${alertData.year})`
                : `Holiday Calendar Not Uploaded for ${alertData.year}`)}
          </strong>
          <p className="ha-notification-message">
            {alertData.message ||
              (isSubmitted
                ? `HR has submitted the ${alertData.year} holiday calendar for review. Please review and approve it.`
                : `The holidays are not uploaded for ${alertData.year}. Send reminder to HR to upload the holidays.`)}
          </p>
        </div>
      </div>
      <div className="ha-notification-right">
        {isSubmitted ? (
          <button type="button" className="ha-notification-action-btn" onClick={handleAction}>
            <Icon icon="solar:check-read-linear" width="16" />
            Review & Approve
          </button>
        ) : (
          <>
            <button
              type="button"
              className="ha-notification-action-btn"
              onClick={handleSendReminder}
              disabled={sendingReminder}
            >
              <Icon icon="solar:bell-bold" width="16" />
              {sendingReminder ? "Sending..." : "Send Reminder to HR"}
            </button>
            <button
              type="button"
              className="ha-notification-action-btn ha-notification-action-btn--secondary"
              onClick={handleAction}
              style={{
                background: "#f8fafc",
                color: "#ea580c",
                border: "1px solid #fdba74",
                boxShadow: "none",
              }}
            >
              <Icon icon="solar:user-plus-rounded-bold" width="16" />
              Assign Calendar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default HolidayAssignmentBanner;
