import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../Components/UserContext";
import { portalInstance } from "../Services/instance";
import { checkProfileRestriction } from "../utils/profileCompletionRestriction";
import { toast } from "react-toastify";

const ALLOWED_WHEN_RESTRICTED = [
  "/emp/my-details/edit",
  "/profile",
  "/change-password",
  "/",
  "/forgot",
];

const EmployeeProfileGuard = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const lastBlockedNoticeRef = useRef(0);
  const fetchedOnceRef = useRef(false);

  // Read current session user safely merging stored session + context
  const getSessionUser = () => {
    try {
      const raw = sessionStorage.getItem("Erti-Portal");
      const stored = raw ? JSON.parse(raw) : {};
      return {
        ...stored,
        ...(user || {}),
        token: stored.token || user?.token,
        role: stored.role || user?.role,
        profileCompletion: stored.profileCompletion ?? user?.profileCompletion,
        dateJoined: stored.dateJoined || user?.dateJoined,
        isProfileCompleted: stored.isProfileCompleted ?? user?.isProfileCompleted,
      };
    } catch {
      return user || null;
    }
  };

  // If completion data is missing on mount, fetch once from backend
  useEffect(() => {
    const raw = sessionStorage.getItem("Erti-Portal");
    const stored = raw ? JSON.parse(raw) : null;
    const current = stored || user;

    if (!current || current.role !== "employee" || !current.token) return;

    if (
      !fetchedOnceRef.current &&
      (current.profileCompletion === undefined || current.dateJoined === undefined)
    ) {
      fetchedOnceRef.current = true;
      portalInstance
        .get("/data/completion")
        .then((res) => {
          if (res.data?.success) {
            const rawStored = sessionStorage.getItem("Erti-Portal");
            const latestStored = rawStored ? JSON.parse(rawStored) : {};

            const updated = {
              ...latestStored,
              ...current,
              token: latestStored.token || current.token, // CRITICAL: NEVER DROP TOKEN
              profileCompletion: res.data.profileCompletion ?? 0,
              dateJoined: res.data.dateJoined || latestStored.dateJoined || null,
              isProfileCompleted: res.data.isProfileCompleted ?? false,
              isProfileRestricted: res.data.isProfileRestricted ?? false,
              daysRemainingForProfile: res.data.daysRemaining ?? 7,
              profileDeadline: res.data.deadline || null,
            };
            sessionStorage.setItem("Erti-Portal", JSON.stringify(updated));
            if (setUser) setUser(updated);
          }
        })
        .catch((err) => {
          console.warn("Failed to check profile completion status:", err);
        });
    }
  }, []); // Run on mount only

  // Enforce route restriction on every location change
  useEffect(() => {
    const activeUser = getSessionUser();
    if (!activeUser || activeUser.role !== "employee" || !activeUser.token) return;

    const restriction = checkProfileRestriction(activeUser);

    if (restriction.isRestricted) {
      const isAllowed = ALLOWED_WHEN_RESTRICTED.some((p) =>
        location.pathname === p || location.pathname.startsWith("/emp/my-details/edit")
      );

      if (!isAllowed) {
        const now = Date.now();
        if (now - lastBlockedNoticeRef.current > 4000) {
          lastBlockedNoticeRef.current = now;
          toast.warning(
            "Access Restricted: Your 7-day completion period has passed. Complete your profile to 100% to access the dashboard."
          );
        }
        navigate("/emp/my-details/edit", { replace: true });
      }
    }
  }, [location.pathname]);

  return <>{children}</>;
};

export default EmployeeProfileGuard;
