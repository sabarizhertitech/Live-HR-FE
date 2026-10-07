import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { portalInstance } from "../../Services/instance";
import "./ResetPassword.css";
import "react-toastify/dist/ReactToastify.css";
import { MdVisibility, MdVisibilityOff, MdChevronLeft } from "react-icons/md";

// FIX #1 — Broadened special character set to match Ertitech policy
const SPECIAL_CHAR_REGEX = /[!@#$%^&*?~\-_+=|[\]{};:'",./<>\\()]/;

const validatePassword = (pwd) => {
  return (
    pwd.length >= 12 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    SPECIAL_CHAR_REGEX.test(pwd)    // FIX #1 — was /[!@#$%^&*]/
  );
};

function ResetPassword() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const isPasswordMatch =
  newPassword &&
  confirmPassword &&
  newPassword === confirmPassword;

  const navigate = useNavigate();

  const portalData = JSON.parse(sessionStorage.getItem("Erti-Portal") || "null");

  const isPasswordExpiringSoon = portalData?.passwordExpiringSoon === true;
  const isForceChange = portalData?.forceChangePassword === true;
  const daysRemaining = portalData?.daysRemaining ?? 7;

  // If it's a force change and they have > 0 days remaining, they are a new user.
  const isOldUser = !isForceChange || daysRemaining <= 0;

React.useEffect(() => {
  if (!portalData) {
    navigate("/");
  }
}, [portalData, navigate]);

  if (!portalData) return null;


  const clearExpiryFlag = () => {
    const session = JSON.parse(sessionStorage.getItem("Erti-Portal") || "{}");
    session.passwordExpiringSoon = false;
    session.forceChangePassword = false;
    sessionStorage.setItem("Erti-Portal", JSON.stringify(session));
    sessionStorage.removeItem("pwdExpiryDismissed");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isOldUser && !currentPassword) {
      toast.warning("Current password is required");
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast.warning("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!validatePassword(newPassword)) {
      toast.error("Password must be strong (12+, upper, lower, number, special character)");
      return;
    }

    try {
      setLoading(true);

      const response = await portalInstance.put(
        "/data/reset-first-password",
        { newPassword, currentPassword }
      );

      if (response.data.message) {
        toast.success(response.data.message);
      }

      clearExpiryFlag();

sessionStorage.clear();
navigate("/");

    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const getPageTitle = () => {
    if (isForceChange) return "Update Your Password";
    if (isPasswordExpiringSoon) return "Update Your Password";
    return "Update Your Password";
  };

  const getPageSubtitle = () => {
    return "Create a new password to continue securely.";
  };

  const calculateStrength = () => {
    if (!newPassword) return { label: "", score: 0 };
    let score = 0;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (SPECIAL_CHAR_REGEX.test(newPassword)) score++;

    if (score <= 2) return { label: "Weak", score: 1 };
    if (score === 3) return { label: "Medium", score: 2 };
    return { label: "Strong", score: 3 };
  };

  const strength = calculateStrength();

  return (
    <div className="reset-container-main">
      <ToastContainer />

      <div className="reset-card">
        {/* Left Section */}
        <div className="reset-left">
          <button className="reset-back-btn" onClick={() => navigate(-1)}>
            <MdChevronLeft className="back-icon" /> Back
          </button>
          
          <div className="reset-left-content">
            <img src="/Password-reset.png.png" alt="Reset Password" className="reset-image" />            
            <div className="reset-left-text">
              <h4 className="left-title">
                {isForceChange ? "Action Required" : "Password Expiring Soon"}
              </h4>
              <p className="left-desc">
                {isForceChange 
                  ? "You must change your password before you can access the portal."
                  : (
                      <>
                        <span style={{ color: "#EE5C22" }}>Your password will expire within {daysRemaining} days.</span> <br />
                        Update it now to keep your account secure and uninterrupted.
                      </>
                    )
                }
              </p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="reset-right">
          <div className="reset-header">
            <h2 className="reset-main-title">{getPageTitle()}</h2>
            <p className="reset-main-subtitle">{getPageSubtitle()}</p>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="reset-form">
            
            <div className="reset-inputs-row">
              {/* CURRENT PASSWORD */}
              {isOldUser && (
                <div className="reset-input-group">
                  <label>Current Password</label>
                  <div className="input-wrapper">
                    <input
                      type={showCurrent ? "text" : "password"}
                      className="reset-input"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="off"
                    />
                    <span
                      className="password-icon"
                      onClick={() => setShowCurrent(!showCurrent)}
                    >
                      {showCurrent ? <MdVisibilityOff /> : <MdVisibility />}
                    </span>
                  </div>
                </div>
              )}

              {/* NEW PASSWORD */}
              <div className="reset-input-group">
                <label>New Password</label>
                <div className="input-wrapper">
                  <input
                    type={showNew ? "text" : "password"}
                    className="reset-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="off"
                  />
                  <span
                    className="password-icon"
                    onClick={() => setShowNew(!showNew)}
                  >
                    {showNew ? <MdVisibilityOff /> : <MdVisibility />}
                  </span>
                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="reset-input-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="reset-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="off"
                  />
                  <span
                    className="password-icon"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? <MdVisibilityOff /> : <MdVisibility />}
                  </span>
                </div>
              </div>
            </div>

            {/* Password Strength Section */}
            <div className="reset-strength-section">
              <div className="reset-strength-header">
                <span className="strength-label-text">Password Strength</span>
                <span className={`strength-value ${strength.label.toLowerCase()}`}>
                  {strength.label}
                </span>
              </div>
              <div className={`reset-strength-bars ${strength.label.toLowerCase()}`}>
                <div className={`strength-bar ${strength.score >= 1 ? 'active' : ''}`}></div>
                <div className={`strength-bar ${strength.score >= 2 ? 'active' : ''}`}></div>
                <div className={`strength-bar ${strength.score >= 3 ? 'active' : ''}`}></div>
              </div>

              <div className="reset-rules-pills">
                <div className={`rule-pill ${/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? "pass" : ""}`}>
                  <span className="pill-icon">Aa</span>
                  <span>Uppercase & Lowercase</span>
                </div>
                <div className={`rule-pill ${newPassword.length >= 12 ? "pass" : ""}`}>
                  <span className="pill-icon">12+</span>
                  <span>Minimum 12 Characters</span>
                </div>
                <div className={`rule-pill ${/[0-9]/.test(newPassword) ? "pass" : ""}`}>
                  <span className="pill-icon">123</span>
                  <span>At Least One Number</span>
                </div>
                <div className={`rule-pill ${SPECIAL_CHAR_REGEX.test(newPassword) ? "pass" : ""}`}>
                  <span className="pill-icon">#$!</span>
                  <span>Special Character</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="reset-footer">
              <p className="reset-footer-text">
                You may be signed out from other devices after updating your password.
              </p>
              <button className="common-modal-btn btn-update" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;