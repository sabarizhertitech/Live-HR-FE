import { createContext, useContext, useState, useEffect } from "react";
import React from "react";
import { toast } from "react-toastify";

const UserContext = createContext();

// Helper to decode JWT exp timestamp from token issued by BE
const getTokenExpMs = (token) => {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    if (decoded && typeof decoded.exp === "number") {
      return decoded.exp * 1000;
    }
  } catch (err) {
    try {
      const decoded = JSON.parse(atob(token.split(".")[1]));
      if (decoded && typeof decoded.exp === "number") {
        return decoded.exp * 1000;
      }
    } catch (_) {}
  }
  return null;
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Initialize from sessionStorage to survive page refreshes
    const savedData = sessionStorage.getItem("Erti-Portal");
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (err) {
        console.error("Error parsing saved user data:", err);
        return null;
      }
    }
    return null;
  });

  const [hrAccessConfig, setHrAccessConfig] = useState(() => {
    try {
      const raw = sessionStorage.getItem("hrAccessConfig");
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  });

  useEffect(() => {
    if (user?.isHr && user?.role !== "admin") {
      import("../utils/hrAccessHelper").then(({ fetchHrAccessConfig }) => {
        fetchHrAccessConfig().then((cfg) => {
          if (cfg) setHrAccessConfig(cfg);
        });
      });
    }

    const handleUpdate = () => {
      try {
        const raw = sessionStorage.getItem("hrAccessConfig");
        if (raw) setHrAccessConfig(JSON.parse(raw));
      } catch (_) {}
    };
    window.addEventListener("hrAccessConfigUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("hrAccessConfigUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [user?.isHr, user?.role]);

  const updateUserData = (newData) => {
    setUser((prev) => {
      if (!newData) return null;
      let storedToken = null;
      try {
        const raw = sessionStorage.getItem("Erti-Portal");
        if (raw) storedToken = JSON.parse(raw)?.token;
      } catch (_) {}
      return {
        ...newData,
        token: newData.token || prev?.token || storedToken,
      };
    });
  };

  // Session auto-logout: check token expiry from BE JSON token
  useEffect(() => {
    const checkExpiry = () => {
      const pathname = window.location.pathname;
      const isPublic = pathname === "/" || pathname === "/forgot";

      if (isPublic) {
        if (sessionStorage.getItem("session_expired_notice") === "true") {
          sessionStorage.removeItem("session_expired_notice");
          toast.warning("Your session has expired. Please log in again.", {
            toastId: "session-expired",
            autoClose: 5000,
          });
        }
        return;
      }

      let token = user?.token;
      if (!token) {
        try {
          const raw = sessionStorage.getItem("Erti-Portal");
          if (raw) token = JSON.parse(raw)?.token;
        } catch (_) {}
      }

      if (!token) return;

      let expMs = getTokenExpMs(token);
      if (!expMs) {
        const loginTimeStr = sessionStorage.getItem("loginTime");
        if (loginTimeStr) {
          const loginTime = new Date(loginTimeStr).getTime();
          if (!isNaN(loginTime)) {
            expMs = loginTime + 8 * 60 * 60 * 1000;
          }
        }
      }
      if (!expMs) return;

      const now = Date.now();
      if (now >= expMs) {
        // Token expired: clear session and redirect to login
        sessionStorage.removeItem("Erti-Portal");
        sessionStorage.removeItem("loginTime");
        sessionStorage.removeItem("fcm_token");
        sessionStorage.removeItem("fcm_user_id");
        sessionStorage.setItem("session_expired_notice", "true");
        setUser(null);
        window.location.href = "/";
        return;
      }

      return expMs - now;
    };

    const remaining = checkExpiry();
    let timeoutId = null;
    if (typeof remaining === "number" && remaining > 0) {
      const safeDelay = Math.min(remaining, 2147483647);
      timeoutId = setTimeout(checkExpiry, safeDelay);
    }

    const intervalId = setInterval(checkExpiry, 2000);
    window.addEventListener("focus", checkExpiry);
    document.addEventListener("visibilitychange", checkExpiry);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener("focus", checkExpiry);
      document.removeEventListener("visibilitychange", checkExpiry);
    };
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser: updateUserData, hrAccessConfig, setHrAccessConfig }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);