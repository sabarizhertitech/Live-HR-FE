import { portalInstance } from "../Services/instance.js";

export const DEFAULT_HR_ACCESS = {
  slipAndLetter: "WRITE",
  hrRequests: "WRITE",
  leaveManagement: "MAKER",
  employeeManagement: {
    canAdd: true,
    canView: true,
    canEdit: true,
    canDeleteDocuments: false,
  },
  attendanceManagement: {
    dailyReport: true,
    monthlyOverview: true,
    exportAttendance: true,
  },
  holidays: "MAKER",
};

/**
 * Read cached hrAccessConfig from sessionStorage or user object,
 * deep merging with DEFAULT_HR_ACCESS to ensure complete object structures.
 */
export const getCachedHrAccessConfig = () => {
  try {
    let active = null;
    const direct = sessionStorage.getItem("hrAccessConfig");
    if (direct) {
      active = JSON.parse(direct);
    } else {
      const userRaw = sessionStorage.getItem("Erti-Portal");
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (parsed?.hrAccessConfig) active = parsed.hrAccessConfig;
      }
    }

    if (active) {
      return {
        ...DEFAULT_HR_ACCESS,
        ...active,
        employeeManagement: {
          ...DEFAULT_HR_ACCESS.employeeManagement,
          ...(active.employeeManagement || {}),
        },
        attendanceManagement: {
          ...DEFAULT_HR_ACCESS.attendanceManagement,
          ...(active.attendanceManagement || {}),
        },
      };
    }
  } catch (e) {
    console.error("Error reading cached HR access config:", e);
  }
  return DEFAULT_HR_ACCESS;
};

/**
 * Fetch latest HR Access Config from backend and update cache
 */
export const fetchHrAccessConfig = async () => {
  try {
    const res = await portalInstance.get("/api/leaves/permission-config");
    if (res.data?.success && res.data?.data?.hrAccessConfig) {
      const cfg = res.data.data.hrAccessConfig;
      sessionStorage.setItem("hrAccessConfig", JSON.stringify(cfg));
      return cfg;
    }
  } catch (err) {
    console.error("Error fetching HR access config:", err);
  }
  return getCachedHrAccessConfig();
};

/**
 * Check if the given user is designated HR (not pure Admin)
 */
export const isHrUser = (user) => {
  const role = (user?.role || "").toLowerCase();
  const isHr = Boolean(user?.isHr === true || user?.isHr === "true" || role === "hr");
  return isHr && role !== "admin" && role !== "superadmin";
};

/**
 * Check if the given user is Portal Administrator (unrestricted)
 */
export const isAdminUser = (user) => {
  const role = (user?.role || "").toLowerCase();
  return role === "admin" || role === "superadmin";
};

// ── Employee Management Checks ──
export const canHrAddEmployee = (user, config = null) => {
  if (isAdminUser(user)) return true;
  if (!isHrUser(user)) return false;
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.employeeManagement?.canAdd !== false;
};

export const canHrViewEmployee = (user, config = null) => {
  if (isAdminUser(user)) return true;
  if (!isHrUser(user)) return false;
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.employeeManagement?.canView !== false;
};

export const canHrEditEmployee = (user, config = null) => {
  if (isAdminUser(user)) return true;
  if (!isHrUser(user)) return false;
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.employeeManagement?.canEdit !== false;
};

export const canHrDeleteDocuments = (user, config = null) => {
  if (isAdminUser(user)) return true;
  if (!isHrUser(user)) return false;
  const cfg = config || getCachedHrAccessConfig();
  return Boolean(cfg?.employeeManagement?.canDeleteDocuments);
};

// ── Attendance Management Checks ──
export const canHrDailyAttendance = (user, config = null) => {
  if (isAdminUser(user)) return true;
  if (!isHrUser(user)) return false;
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.attendanceManagement?.dailyReport !== false;
};

export const canHrMonthlyAttendance = (user, config = null) => {
  if (isAdminUser(user)) return true;
  if (!isHrUser(user)) return false;
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.attendanceManagement?.monthlyOverview !== false;
};

export const canHrExportAttendance = (user, config = null) => {
  if (isAdminUser(user)) return true;
  if (!isHrUser(user)) return false;
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.attendanceManagement?.exportAttendance !== false;
};

// ── Slips & Letters Checks ──
export const getHrSlipAccess = (user, config = null) => {
  if (isAdminUser(user)) return "FULL_ACCESS";
  if (!isHrUser(user)) return "NO_ACCESS";
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.slipAndLetter || "WRITE";
};

export const canHrGenerateSlips = (user, config = null) => {
  const access = getHrSlipAccess(user, config);
  return ["WRITE", "FULL_ACCESS"].includes(access);
};

export const canHrDeleteSlips = (user, config = null) => {
  const access = getHrSlipAccess(user, config);
  return access === "FULL_ACCESS";
};

// ── HR Requests Checks ──
export const getHrRequestsAccess = (user, config = null) => {
  if (isAdminUser(user)) return "FULL_ACCESS";
  if (!isHrUser(user)) return "NO_ACCESS";
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.hrRequests || "WRITE";
};

export const canHrProcessRequests = (user, config = null) => {
  const access = getHrRequestsAccess(user, config);
  return ["WRITE", "FULL_ACCESS"].includes(access);
};

export const canHrDeleteRequests = (user, config = null) => {
  const access = getHrRequestsAccess(user, config);
  return access === "FULL_ACCESS";
};

// ── Leave & Holiday Checks ──
export const getHrLeaveAccess = (user, config = null) => {
  if (isAdminUser(user)) return "FULL_ACCESS";
  if (!isHrUser(user)) return "NO_ACCESS";
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.leaveManagement || "MAKER";
};

export const getHrHolidaysAccess = (user, config = null) => {
  if (isAdminUser(user)) return "FULL_ACCESS";
  if (!isHrUser(user)) return "NO_ACCESS";
  const cfg = config || getCachedHrAccessConfig();
  return cfg?.holidays || "MAKER";
};
