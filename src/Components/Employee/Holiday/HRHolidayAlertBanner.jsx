import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { portalInstance } from "../../../Services/instance";
import "./HRHolidayAlertBanner.css";

function HRHolidayAlertBanner({ refreshTrigger }) {
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAlertStatus = useCallback(async () => {
    try {
      const res = await portalInstance.get("holiday-assignments/hr-pending-alert");
      if (res.data?.success && res.data?.showAlert) {
        setAlertData(res.data);
      } else {
        setAlertData(null);
      }
    } catch (err) {
      console.error("Failed to check HR holiday pending alert:", err);
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
    navigate("/emp/holiday-requests", { state: { targetYear: alertData.year } });
  };

  const isRejected = alertData.status === "rejected";

  return (
    <div className={`hr-holiday-notification-banner ${isRejected ? "is-rejected" : ""}`}>
      <div className="hr-holiday-banner-shimmer"></div>
      <div className="hr-holiday-notification-left">
        <div className="hr-holiday-notification-text-wrap">
          <div className="hr-holiday-title-row">
            <span className="hr-holiday-pulse-dot"></span>
            <strong className="hr-holiday-notification-title">
              {alertData.title ||
                (isRejected
                  ? `Action Required: Changes Requested for ${alertData.year} Holidays`
                  : `Upload Holidays for ${alertData.year}`)}
            </strong>
          </div>
          <p className="hr-holiday-notification-message">
            {alertData.message ||
              `The holidays are not uploaded for ${alertData.year}. Please configure and submit for Admin approval.`}
          </p>
        </div>
      </div>
      <div className="hr-holiday-notification-right">
        <button type="button" className="hr-holiday-notification-action-btn" onClick={handleAction}>
          <Icon icon={isRejected ? "solar:pen-new-square-bold" : "solar:upload-track-2-bold"} width="16" />
          {isRejected ? "Review & Update" : `Upload Holidays`}
        </button>
      </div>
    </div>
  );
}

export default HRHolidayAlertBanner;
