import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { portalInstance } from "../../../Services/instance";
import "./HRLeaveCategoryAlertBanner.css";

function HRLeaveCategoryAlertBanner({ refreshTrigger }) {
  const [alertData, setAlertData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAlertStatus = useCallback(async () => {
    try {
      const res = await portalInstance.get("leave-categories/hr-pending-alert");
      if (res.data?.success && res.data?.showAlert) {
        setAlertData(res.data);
      } else {
        setAlertData(null);
      }
    } catch (err) {
      console.error("Failed to check HR leave category pending alert:", err);
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

  const isRejected = alertData.status === "rejected";

  return (
    <div className={`hr-leave-notification-banner ${isRejected ? "is-rejected" : ""}`}>
      <div className="hr-leave-banner-shimmer"></div>
      <div className="hr-leave-notification-left">
        <div className="hr-leave-notification-text-wrap">
          <div className="hr-leave-title-row">
            <span className="hr-leave-pulse-dot"></span>
            <strong className="hr-leave-notification-title">
              {alertData.title ||
                (isRejected
                  ? `Action Required: Changes Requested for FY ${alertData.year} Leave Categories`
                  : `Upload Leave Categories for FY ${alertData.year}`)}
            </strong>
          </div>
          <p className="hr-leave-notification-message">
            {alertData.message ||
              `The leave categories are not uploaded for FY ${alertData.year}. Please configure and submit for Admin approval.`}
          </p>
        </div>
      </div>
      <div className="hr-leave-notification-right">
        <button type="button" className="hr-leave-notification-action-btn" onClick={handleAction}>
          <Icon icon={isRejected ? "solar:pen-new-square-bold" : "solar:upload-track-2-bold"} width="16" />
          {isRejected ? "Review & Update" : "Upload Leave Categories"}
        </button>
      </div>
    </div>
  );
}

export default HRLeaveCategoryAlertBanner;
