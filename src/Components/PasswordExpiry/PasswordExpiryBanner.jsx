import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PasswordExpiryBanner.css";

function PasswordExpiryBanner({ onDismiss, expiryDate }) {
  const [visible, setVisible] = useState(true);
  const navigate = useNavigate();

  // Calculate days remaining
  const getDaysRemaining = () => {
    if (!expiryDate) return 7; // Fallback
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = getDaysRemaining();

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("pwdExpiryDismissed", "true");
    if (onDismiss) onDismiss();
  };

  const handleChangeNow = () => {
    handleDismiss();
    navigate("/change-password");
  };

  return (
    <div className="pwd-expiry-banner">
      <div className="pwd-expiry-left">
        <div className="pwd-expiry-text-container">
          <strong className="pwd-expiry-title">Password Expiring Soon</strong>
          <p className="pwd-expiry-subtitle">
            Your password will expire within {daysRemaining} days. Please change it to avoid losing access.
          </p>
        </div>
      </div>
      <div className="pwd-expiry-right">
        <button className="pwd-expiry-change-btn" onClick={handleChangeNow}>
          Click Here to Update
        </button>
        <button className="pwd-expiry-dismiss-btn" onClick={handleDismiss}>
          ✕
        </button>
      </div>
    </div>
  );
}

export default PasswordExpiryBanner;