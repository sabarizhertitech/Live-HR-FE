import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import loginbgimg from "/loginbg-img.png";
import { MdEmail, MdVpnKey, MdLock, MdVisibility, MdVisibilityOff } from "react-icons/md";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { authInstance } from '../../Services/instance';
import loginem from "/login-employee-m.png";
import loginam from "/login-a-m.png";
import logina from "/login-a.png";

const SPECIAL_CHAR_REGEX = /[!@#$%^&*?~\-_+=|[\]{};:'",./<>\\()]/;

const validatePassword = (pwd) => {
  return (
    pwd.length >= 12 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    SPECIAL_CHAR_REGEX.test(pwd)
  );
};

const maskEmailOrUsername = (val) => {
  if (!val) return "";
  const str = val.trim();
  if (str.includes("@")) {
    const [name, domain] = str.split("@");
    if (name.length <= 2) {
      return `${name[0]}*@${domain}`;
    }
    const maskedName = name[0] + name[1] + "*".repeat(Math.max(1, name.length - 3)) + name[name.length - 1];
    return `${maskedName}@${domain}`;
  } else {
    if (str.length <= 2) return `${str[0]}*`;
    return str[0] + str[1] + "*".repeat(Math.max(1, str.length - 3)) + str[str.length - 1];
  }
};

function Forgot() {
  const [role, setRole] = useState(() => {
    return localStorage.getItem("savedRole") || "employee";
  });
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewType, setViewType] = useState(window.innerWidth <= 768 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop');
  const navigate = useNavigate();

  const emailRef = useRef(null);
  const otpRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Screen size detection
  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 768) setViewType('mobile');
      else if (width <= 1024) setViewType('tablet');
      else setViewType('desktop');
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine dynamic background image
  const getBackgroundImage = () => {
    if (viewType === 'mobile') {
      return role === "admin" ? loginam : loginem;
    }
    // Tablets and Desktop use high-res images
    return role === "admin" ? logina : loginbgimg;
  };

  const resetState = () => {
    setEmailOrUsername("");
    setRegisteredEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setOtpSent(false);
  };

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!emailOrUsername) {
      toast.warning("Please enter your Email or Username");
      emailRef.current.focus();
      return;
    }

    setIsLoading(true);
    try {
      const response = await authInstance.post('/data/forgot/send-otp', {
        email: emailOrUsername.trim().toLowerCase(),
        role
      });
      if (response.data?.email) {
        setRegisteredEmail(response.data.email);
      }
      toast.success("OTP sent successfully! Check your email.");
      setOtpSent(true);
    } catch (error) {
      console.error("Error sending OTP:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to send OTP. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    if (e) e.preventDefault();
    if (!otp) {
      toast.warning("Please enter the OTP");
      otpRef.current.focus();
      return;
    }
    if (!newPassword) {
      toast.warning("Please enter a new password");
      newPasswordRef.current.focus();
      return;
    }
    if (!confirmPassword) {
      toast.warning("Please confirm your password");
      confirmPasswordRef.current.focus();
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      confirmPasswordRef.current.focus();
      return;
    }

    if (!validatePassword(newPassword)) {
      toast.error("Password must be strong (12+, upper, lower, number, special character)");
      return;
    }

    setIsLoading(true);
    try {
      await authInstance.post('/data/forgot/reset-password', {
        email: emailOrUsername.trim().toLowerCase(),
        otp,
        newPassword
      });
      toast.success("Password changed successfully!");
      resetState();
      setTimeout(() => navigate("/"), 2000);
    } catch (error) {
      console.error("Error resetting password:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container" style={{ backgroundImage: `url(${getBackgroundImage()})` }}>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />

        {/* Top Role Selector */}
        <div className="role-selector-container">
          <div className="role-selector">
            <button
              type="button"
              className={`role-btn ${role === "admin" ? "active" : ""}`}
              onClick={() => { setRole("admin"); resetState(); }}
              disabled={isLoading}
            >
              Admin
            </button>
            <button
              type="button"
              className={`role-btn ${role === "employee" ? "active" : ""}`}
              onClick={() => { setRole("employee"); resetState(); }}
              disabled={isLoading}
            >
              Employee
            </button>
          </div>
        </div>

        <div className="login-content-wrapper">
          <div className="login-box">
            <div className="logo-section">
              <img src="/HR portal logo.png" alt="logo" className="logo" />
            </div>

            <h5 className={`text-center ${otpSent ? "mb-1" : "mb-4"}`} style={{ color: '#3B3C58', fontWeight: '600' }}>
              {otpSent ? "Reset Your Password" : "Forgot Password?"}
            </h5>
            {otpSent && (
              <p className="text-center mb-4" style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                OTP sent to <span style={{ fontWeight: '600', color: '#5977f8' }}>{maskEmailOrUsername(registeredEmail || emailOrUsername)}</span>
              </p>
            )}

            <form onSubmit={otpSent ? handleChangePassword : handleSendOtp} autoComplete="off">
              {!otpSent ? (
                <div className="mb-4 form-group">
                  <div className="input-with-label">
                    <input
                      type="text"
                      className="form-control custom-input"
                      id="email-input"
                      placeholder=" "
                      value={emailOrUsername}
                      ref={emailRef}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      disabled={isLoading}
                      autoComplete="off"
                    />
                    <label htmlFor="email-input" className="floating-label">Email ID or Username</label>
                    <MdEmail className="input-icon" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 form-group">
                    <div className="input-with-label">
                      <input
                        type="text"
                        className="form-control custom-input"
                        id="otp-input"
                        placeholder=" "
                        value={otp}
                        ref={otpRef}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={isLoading}
                        maxLength={6}
                      />
                      <label htmlFor="otp-input" className="floating-label">6-Digit OTP</label>
                      <MdVpnKey className="input-icon" />
                    </div>
                  </div>

                  <div className="mb-4 form-group">
                    <div className="input-with-label">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control custom-input"
                        id="new-password-input"
                        placeholder=" "
                        value={newPassword}
                        ref={newPasswordRef}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <label htmlFor="new-password-input" className="floating-label">New Password</label>
                      <span className="toggle-password-icon" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4 form-group">
                    <div className="input-with-label">
                      <input
                        type="password"
                        className="form-control custom-input"
                        id="confirm-password-input"
                        placeholder=" "
                        value={confirmPassword}
                        ref={confirmPasswordRef}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                      />
                      <label htmlFor="confirm-password-input" className="floating-label">Confirm Password</label>
                      <MdLock className="input-icon" />
                    </div>
                  </div>
                </>
              )}

              <div className="btn-container">
                <button type="submit" className="btn login-btn w-100" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      {otpSent ? "Updating..." : "Sending..."}
                    </>
                  ) : (
                    otpSent ? "Change Password" : "Send OTP"
                  )}
                </button>
              </div>
            </form>

            <div className="text-center mt-3">
              <span 
                className="forgot-password" 
                onClick={() => !isLoading && navigate("/")}
                style={{ cursor: isLoading ? 'not-allowed' : 'pointer', fontSize: '12px' }}
              >
                Back To Login
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Forgot;