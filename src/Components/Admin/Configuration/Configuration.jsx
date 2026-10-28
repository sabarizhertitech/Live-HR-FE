import React, { useState, useEffect } from "react";
import { portalInstance } from "../../../Services/instance";
import { toast, ToastContainer } from "react-toastify";
import Sidebar from "../../HeaderSidebar/Sidebar";
import { Icon } from "@iconify/react";
import "./Configuration.css";

const Configuration = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permanentFreeCount, setPermanentFreeCount] = useState(2);
  const [probationFreeCount, setProbationFreeCount] = useState(2);
  const [deductCategoryName, setDeductCategoryName] = useState("Annual Leave");
  const [leaveDaysPerPermission, setLeaveDaysPerPermission] = useState(0.5);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [financialYear, setFinancialYear] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const defaultHrAccess = {
    slipAndLetter: "WRITE", // "READ" | "WRITE" | "FULL_ACCESS"
    hrRequests: "WRITE", // "READ" | "WRITE" | "FULL_ACCESS"
    leaveManagement: "MAKER", // "MAKER" | "READ" | "FULL_ACCESS"
    employeeManagement: {
      canAdd: true,
      canView: true,
      canEdit: true,
      canDeleteDocuments: false, // Admin can toggle enable/disable for HR
    },
    attendanceManagement: {
      dailyReport: true,
      monthlyOverview: true,
      exportAttendance: true,
    },
    holidays: "MAKER", // "MAKER" | "READ" | "FULL_ACCESS"
  };

  const [hrAccessConfig, setHrAccessConfig] = useState(defaultHrAccess);
  const [assignedHr, setAssignedHr] = useState(null);
  const [initialHrAccess, setInitialHrAccess] = useState(defaultHrAccess);
  const [isHrAccessOpen, setIsHrAccessOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);

  const [initialData, setInitialData] = useState({
    permanentFreeCount: 2,
    probationFreeCount: 2,
    deductCategoryName: "Annual Leave",
    leaveDaysPerPermission: 0.5,
  });

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await portalInstance.get("/api/leaves/permission-config");
      if (res.data?.success && res.data.data) {
        const d = res.data.data;
        const permCount = typeof d.permanentFreeCount === "number" ? d.permanentFreeCount : 2;
        const probCount = typeof d.probationFreeCount === "number" ? d.probationFreeCount : 2;
        const catName = d.deductCategoryName || "Annual Leave";
        const rate = typeof d.leaveDaysPerPermission === "number" ? d.leaveDaysPerPermission : 0.5;

        setPermanentFreeCount(permCount);
        setProbationFreeCount(probCount);
        setDeductCategoryName(catName);
        setLeaveDaysPerPermission(rate);
        setAvailableCategories(
          d.availableCategories && d.availableCategories.length > 0
            ? d.availableCategories
            : ["Annual Leave", "Casual Leave", "Sick Leave"]
        );
        setFinancialYear(d.financialYear || "");

        if (d.hrAccessConfig) {
          const rawHr = d.hrAccessConfig;
          const normalized = {
            ...defaultHrAccess,
            ...rawHr,
            employeeManagement: {
              canAdd: rawHr.employeeManagement?.canAdd !== false,
              canView: rawHr.employeeManagement?.canView !== false,
              canEdit: rawHr.employeeManagement?.canEdit !== false,
              canDeleteDocuments: Boolean(rawHr.employeeManagement?.canDeleteDocuments),
            },
            attendanceManagement: {
              dailyReport: rawHr.attendanceManagement?.dailyReport !== false,
              monthlyOverview: rawHr.attendanceManagement?.monthlyOverview !== false,
              exportAttendance: rawHr.attendanceManagement?.exportAttendance !== false,
            },
          };
          setHrAccessConfig(normalized);
          setInitialHrAccess(normalized);
        }
        if (d.assignedHr) {
          setAssignedHr(d.assignedHr);
        }

        setInitialData({
          permanentFreeCount: permCount,
          probationFreeCount: probCount,
          deductCategoryName: catName,
          leaveDaysPerPermission: rate,
        });
        setHasChanges(false);
      }
    } catch (err) {
      console.error("Failed to load permission config:", err);
      toast.error("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Track changes to enable the Save button when settings change
  useEffect(() => {
    const isPolicyDifferent =
      Number(permanentFreeCount) !== Number(initialData.permanentFreeCount) ||
      Number(probationFreeCount) !== Number(initialData.probationFreeCount) ||
      deductCategoryName.trim().toLowerCase() !== initialData.deductCategoryName.trim().toLowerCase() ||
      Number(leaveDaysPerPermission) !== Number(initialData.leaveDaysPerPermission);

    const isHrDifferent =
      JSON.stringify(hrAccessConfig) !== JSON.stringify(initialHrAccess);

    setHasChanges(isPolicyDifferent || isHrDifferent);
  }, [
    permanentFreeCount,
    probationFreeCount,
    deductCategoryName,
    leaveDaysPerPermission,
    initialData,
    hrAccessConfig,
    initialHrAccess,
  ]);

  const handleHrAccessChange = (moduleKey, value) => {
    setHrAccessConfig((prev) => ({
      ...prev,
      [moduleKey]: value,
    }));
  };

  const handleNestedAccessChange = (moduleKey, fieldKey, value) => {
    setHrAccessConfig((prev) => ({
      ...prev,
      [moduleKey]: {
        ...(typeof prev[moduleKey] === "object" ? prev[moduleKey] : {}),
        [fieldKey]: value,
      },
    }));
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    const pCount = permanentFreeCount === "" ? 0 : Number(permanentFreeCount);
    const probCount = probationFreeCount === "" ? 0 : Number(probationFreeCount);
    const rate = leaveDaysPerPermission === "" ? 0.5 : Number(leaveDaysPerPermission);

    if (pCount < 0 || probCount < 0) {
      toast.error("Permission counts cannot be negative");
      return;
    }

    if (rate < 0) {
      toast.error("Leave deduction count cannot be negative");
      return;
    }

    if (!deductCategoryName) {
      toast.error("Please select a leave category for deduction");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        permanentFreeCount: pCount,
        probationFreeCount: probCount,
        deductCategoryName: deductCategoryName.trim(),
        leaveDaysPerPermission: rate,
        hrAccessConfig,
      };

      const res = await portalInstance.put("/api/leaves/permission-config", payload);
      if (res.data?.success) {
        toast.success("Configuration & HR Access updated successfully!");
        sessionStorage.setItem("hrAccessConfig", JSON.stringify(hrAccessConfig));
        window.dispatchEvent(new Event("hrAccessConfigUpdated"));
        setPermanentFreeCount(pCount);
        setProbationFreeCount(probCount);
        setLeaveDaysPerPermission(rate);
        setInitialData({
          permanentFreeCount: pCount,
          probationFreeCount: probCount,
          deductCategoryName: deductCategoryName.trim(),
          leaveDaysPerPermission: rate,
        });
        setInitialHrAccess(hrAccessConfig);
        setHasChanges(false);
      } else {
        toast.error(res.data?.message || "Failed to update configuration");
      }
    } catch (err) {
      console.error("Error saving permission config:", err);
      toast.error(err.response?.data?.message || "Error saving configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPermanentFreeCount(initialData.permanentFreeCount);
    setProbationFreeCount(initialData.probationFreeCount);
    setDeductCategoryName(initialData.deductCategoryName);
    setLeaveDaysPerPermission(initialData.leaveDaysPerPermission);
    setHrAccessConfig(initialHrAccess);
    toast.info("Reverted all unsaved changes");
  };

  return (
    <>
      <Sidebar />
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="config-page-wrapper">
        <div className="config-container">
          {loading ? (
            <div className="config-loading-card">
              <div className="config-spinner"></div>
              <span>Loading configuration...</span>
            </div>
          ) : (
            <>
              {/* Panel 1: Policy & Permission Configuration */}
              <div className="config-main-panel">
              {/* Header inside Panel 1 with bottom arrow */}
              <div
                className="config-panel-header config-collapsible-header"
                onClick={() => setIsPolicyOpen((prev) => !prev)}
              >
                <div className="config-collapsible-header-left">
                  <div className="config-section-icon-box icon-purple">
                    <Icon icon="solar:shield-user-bold" width="18" />
                  </div>
                  <div className="config-header-text">
                    <h1 className="config-title" style={{ margin: 0 }}>Policy & Permission Configuration</h1>
                    <p className="config-subtitle">
                      Configure monthly free permission quotas and leave category deduction rules.
                    </p>
                  </div>
                </div>

                <div className="config-collapsible-header-right">
                  {financialYear && (
                    <div className="config-fy-chip">
                      <Icon icon="solar:calendar-date-bold" width="15" />
                      <span>FY {financialYear}</span>
                    </div>
                  )}

                  {/* Bottom Arrow Toggle Button */}
                  <button
                    type="button"
                    className={`config-toggle-arrow-btn ${isPolicyOpen ? "open" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPolicyOpen((prev) => !prev);
                    }}
                    aria-label="Toggle Policy & Permission Configuration"
                    title={isPolicyOpen ? "Collapse Configuration" : "Open Configuration"}
                  >
                    <Icon
                      icon={isPolicyOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
                      width="20"
                    />
                  </button>
                </div>
              </div>

              {/* Collapsible Body */}
              {isPolicyOpen && (
                <>
                  <div className="config-panel-divider" />

              {/* Section 1: Monthly Free Permission Count */}
              <div className="config-section">
                <div className="config-section-title-row">
                  <div className="config-section-icon-box icon-purple">
                    <Icon icon="solar:shield-user-bold" width="18" />
                  </div>
                  <h2 className="config-section-title">Monthly Free Permission Count</h2>
                </div>

                <div className="config-fields-row">
                  {/* Permanent Employees */}
                  <div className="config-field-group">
                    <label className="config-label">
                      <Icon icon="solar:user-check-bold" width="16" color="#5977f8" />
                      <span className="config-label-text">Permanent Employees</span>
                    </label>
                    <div className="config-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="config-number-input"
                        value={permanentFreeCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setPermanentFreeCount("");
                          } else {
                            const num = parseInt(val, 10);
                            if (!isNaN(num) && num >= 0) {
                              setPermanentFreeCount(num);
                            }
                          }
                        }}
                        onBlur={() => {
                          if (permanentFreeCount === "" || isNaN(permanentFreeCount)) {
                            setPermanentFreeCount(0);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                          }
                        }}
                        onWheel={(e) => e.target.blur()}
                        placeholder="2"
                      />
                      <span className="config-input-unit">per month</span>
                    </div>
                  </div>

                  {/* Probationary Employees */}
                  <div className="config-field-group">
                    <label className="config-label">
                      <Icon icon="solar:clock-circle-bold" width="16" color="#f59e0b" />
                      <span className="config-label-text">Probationary Employees</span>
                    </label>
                    <div className="config-input-wrapper">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="config-number-input"
                        value={probationFreeCount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            setProbationFreeCount("");
                          } else {
                            const num = parseInt(val, 10);
                            if (!isNaN(num) && num >= 0) {
                              setProbationFreeCount(num);
                            }
                          }
                        }}
                        onBlur={() => {
                          if (probationFreeCount === "" || isNaN(probationFreeCount)) {
                            setProbationFreeCount(0);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                          }
                        }}
                        onWheel={(e) => e.target.blur()}
                        placeholder="2"
                      />
                      <span className="config-input-unit">per month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="config-panel-divider" />

              {/* Section 2: Excess Permission Leave Deduction */}
              <div className="config-section">
                <div className="config-section-title-row">
                  <div className="config-section-icon-box icon-blue">
                    <Icon icon="solar:calendar-minimalistic-bold" width="18" />
                  </div>
                  <h2 className="config-section-title">Excess Permission Leave Deduction</h2>
                </div>

                {/* Category Selection */}
                <div className="config-category-selector-group">
                  <label className="config-label mb-2">
                    <span className="config-label-text">Deduct From Category:</span>
                  </label>
                  <div className="config-category-chips">
                    {availableCategories.length === 0 ? (
                      <div className="config-category-chip selected">
                        <Icon icon="solar:check-circle-bold" width="16" />
                        <span>Annual Leave</span>
                      </div>
                    ) : (
                      availableCategories.map((catName) => {
                        const isSelected =
                          deductCategoryName.trim().toLowerCase() === catName.trim().toLowerCase();
                        return (
                          <button
                            key={catName}
                            type="button"
                            className={`config-category-chip ${isSelected ? "selected" : ""}`}
                            onClick={() => setDeductCategoryName(catName)}
                          >
                            {isSelected ? (
                              <Icon icon="solar:check-circle-bold" width="16" color="#5977f8" />
                            ) : (
                              <Icon icon="solar:tag-horizontal-bold" width="16" color="#94a3b8" />
                            )}
                            <span>{catName}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Deduction Rate Field */}
                <div className="config-field-group mt-3">
                  <label className="config-label">
                    <Icon icon="solar:calculator-minimalistic-bold" width="16" color="#5977f8" />
                    <span className="config-label-text">Leave Deduction Per Excess Permission</span>
                  </label>
                  <div className="config-input-wrapper">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="config-number-input"
                      value={leaveDaysPerPermission}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setLeaveDaysPerPermission("");
                        } else {
                          const num = parseFloat(val);
                          if (!isNaN(num) && num >= 0) {
                            setLeaveDaysPerPermission(val);
                          }
                        }
                      }}
                      onBlur={() => {
                        if (leaveDaysPerPermission === "" || isNaN(parseFloat(leaveDaysPerPermission))) {
                          setLeaveDaysPerPermission(0.5);
                        } else {
                          setLeaveDaysPerPermission(parseFloat(leaveDaysPerPermission));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                        }
                      }}
                      onWheel={(e) => e.target.blur()}
                      placeholder="0.5"
                    />
                    <span className="config-input-unit">day(s) / permission</span>
                  </div>
                </div>

                {/* Alert Box */}
                <div className="config-alert-box">
                  <Icon icon="solar:info-circle-bold" width="18" color="#3b82f6" />
                  <div>
                    Exhausted <strong>{deductCategoryName}</strong> balances automatically overflow to <strong>Others / Loss of Pay (LOP)</strong>.
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="config-panel-divider" />

              {/* Action Buttons: Policy & Permission Configuration */}
              <div className="config-actions-bar">
                <button
                  type="button"
                  className="common-modal-btn btn-small-cancel"
                  onClick={handleReset}
                  disabled={saving || !hasChanges}
                >
                  Reset
                </button>

                <button
                  type="button"
                  className="common-modal-btn btn-update"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                >
                  {saving ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </>
          )}
        </div>

            {/* Panel 2: HR Access & Permissions Configuration */}
            <div className="config-main-panel config-hr-panel">
              {/* Collapsible Header with Bottom Arrow */}
              <div
                className="config-panel-header config-collapsible-header"
                onClick={() => setIsHrAccessOpen((prev) => !prev)}
              >
                <div className="config-collapsible-header-left">
                  <div className="config-section-icon-box icon-blue">
                    <Icon icon="solar:users-group-rounded-bold" width="18" />
                  </div>
                  <div className="config-header-text">
                    <h2 className="config-title" style={{ fontSize: "18px", margin: 0 }}>
                      HR Access & Permissions Configuration
                    </h2>
                    <p className="config-subtitle">
                      Configure granular access levels (Read, Write, Full Access, Maker-Checker) for the designated HR role.
                    </p>
                  </div>
                </div>

                <div className="config-collapsible-header-right">
                  {assignedHr ? (
                    <div className="config-assigned-hr-badge">
                      <span className="config-assigned-hr-label">Assigned HR:</span>{" "}
                      <span className="config-assigned-hr-value">
                        {assignedHr.name} ({assignedHr.empIdString || assignedHr.empId})
                      </span>
                    </div>
                  ) : (
                    <div className="config-no-hr-badge">
                      <Icon icon="solar:danger-triangle-bold" width="16" color="#f59e0b" />
                      <span>No HR currently assigned</span>
                    </div>
                  )}

                  {/* Bottom Arrow Button to open full table */}
                  <button
                    type="button"
                    className={`config-toggle-arrow-btn ${isHrAccessOpen ? "open" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHrAccessOpen((prev) => !prev);
                    }}
                    aria-label="Toggle HR Access Table"
                    title={isHrAccessOpen ? "Collapse HR Access Table" : "Open Full HR Access Table"}
                  >
                    <Icon
                      icon={isHrAccessOpen ? "solar:alt-arrow-up-bold" : "solar:alt-arrow-down-bold"}
                      width="20"
                    />
                  </button>
                </div>
              </div>

              {/* Collapsible Full Table & Cards Content */}
              {isHrAccessOpen && (
                <>
                  <div className="config-panel-divider" />

                  <div className="config-hr-grid">
                    {/* Module 1: Slip & Letter Generation */}
                  <div className="config-hr-card">
                    <div className="config-hr-card-header">
                      <div className="config-hr-card-icon-box" style={{ background: "#eef2ff", color: "#5977f8" }}>
                        <Icon icon="solar:document-text-bold" width="18" />
                      </div>
                      <div className="config-hr-card-title-wrap">
                        <h3 className="config-hr-card-title">1. Slip & Letter Generation</h3>
                        <span className="config-hr-badge-current">
                          {hrAccessConfig.slipAndLetter === "FULL_ACCESS"
                            ? "Full Access"
                            : hrAccessConfig.slipAndLetter === "WRITE"
                            ? "Write Access"
                            : "Read Access"}
                        </span>
                      </div>
                    </div>
                    <div className="config-hr-pill-group">
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.slipAndLetter === "READ" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("slipAndLetter", "READ")}
                      >
                        Read
                      </button>
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.slipAndLetter === "WRITE" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("slipAndLetter", "WRITE")}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.slipAndLetter === "FULL_ACCESS" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("slipAndLetter", "FULL_ACCESS")}
                      >
                        Full Access
                      </button>
                    </div>
                    <p className="config-hr-card-desc">
                      {hrAccessConfig.slipAndLetter === "READ" && "View slips & letter issuance history."}
                      {hrAccessConfig.slipAndLetter === "WRITE" && "Generate payslips, calculate LOP deductions, & issue appointment/increment/termination letters."}
                      {hrAccessConfig.slipAndLetter === "FULL_ACCESS" && "Modify salary structures, delete slips, templates & letters."}
                    </p>
                  </div>

                  {/* Module 2: HR Requests */}
                  <div className="config-hr-card">
                    <div className="config-hr-card-header">
                      <div className="config-hr-card-icon-box" style={{ background: "#ecfdf5", color: "#10b981" }}>
                        <Icon icon="solar:inbox-in-bold" width="18" />
                      </div>
                      <div className="config-hr-card-title-wrap">
                        <h3 className="config-hr-card-title">2. HR Requests</h3>
                        <span className="config-hr-badge-current">
                          {hrAccessConfig.hrRequests === "FULL_ACCESS"
                            ? "Full Access"
                            : hrAccessConfig.hrRequests === "WRITE"
                            ? "Write Access"
                            : "Read Access"}
                        </span>
                      </div>
                    </div>
                    <div className="config-hr-pill-group">
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.hrRequests === "READ" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("hrRequests", "READ")}
                      >
                        Read
                      </button>
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.hrRequests === "WRITE" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("hrRequests", "WRITE")}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.hrRequests === "FULL_ACCESS" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("hrRequests", "FULL_ACCESS")}
                      >
                        Full Access
                      </button>
                    </div>
                    <p className="config-hr-card-desc">
                      {hrAccessConfig.hrRequests === "READ" && "View employee requests & queries in view-only mode."}
                      {hrAccessConfig.hrRequests === "WRITE" && "Approve, process & upload certificates (bonafide, experience, salary certificates)."}
                      {hrAccessConfig.hrRequests === "FULL_ACCESS" && "Delete tickets, configure request rules & certificates templates."}
                    </p>
                  </div>

                  {/* Module 3: Leave Management */}
                  <div className="config-hr-card">
                    <div className="config-hr-card-header">
                      <div className="config-hr-card-icon-box" style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                        <Icon icon="solar:calendar-bold" width="18" />
                      </div>
                      <div className="config-hr-card-title-wrap">
                        <h3 className="config-hr-card-title">3. Leave Management</h3>
                        <span className="config-hr-badge-current">
                          {hrAccessConfig.leaveManagement === "MAKER"
                            ? "Maker (Admin Approval)"
                            : hrAccessConfig.leaveManagement === "FULL_ACCESS"
                            ? "Full Access"
                            : "Read Access"}
                        </span>
                      </div>
                    </div>
                    <div className="config-hr-pill-group">
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.leaveManagement === "MAKER" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("leaveManagement", "MAKER")}
                      >
                        Maker (Approval)
                      </button>
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.leaveManagement === "READ" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("leaveManagement", "READ")}
                      >
                        Read
                      </button>
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.leaveManagement === "FULL_ACCESS" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("leaveManagement", "FULL_ACCESS")}
                      >
                        Full Access
                      </button>
                    </div>
                    <p className="config-hr-card-desc">
                      {hrAccessConfig.leaveManagement === "MAKER" && "HR creates leave category and submits to Admin; Admin reviews and Approves or Rejects."}
                      {hrAccessConfig.leaveManagement === "READ" && "HR can only view leave categories, allocations, and employee balances."}
                      {hrAccessConfig.leaveManagement === "FULL_ACCESS" && "HR can directly create, edit, and activate leave categories without Admin approval."}
                    </p>
                  </div>

                  {/* Module 6: Holidays */}
                  <div className="config-hr-card">
                    <div className="config-hr-card-header">
                      <div className="config-hr-card-icon-box" style={{ background: "#fdf2f8", color: "#ec4899" }}>
                        <Icon icon="solar:sun-bold" width="18" />
                      </div>
                      <div className="config-hr-card-title-wrap">
                        <h3 className="config-hr-card-title">6. Holidays</h3>
                        <span className="config-hr-badge-current">
                          {hrAccessConfig.holidays === "MAKER"
                            ? "Maker (Admin Approval)"
                            : hrAccessConfig.holidays === "FULL_ACCESS"
                            ? "Full Access"
                            : "Read Access"}
                        </span>
                      </div>
                    </div>
                    <div className="config-hr-pill-group">
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.holidays === "MAKER" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("holidays", "MAKER")}
                      >
                        Maker (Approval)
                      </button>
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.holidays === "READ" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("holidays", "READ")}
                      >
                        Read
                      </button>
                      <button
                        type="button"
                        className={`config-hr-pill ${hrAccessConfig.holidays === "FULL_ACCESS" ? "active" : ""}`}
                        onClick={() => handleHrAccessChange("holidays", "FULL_ACCESS")}
                      >
                        Full Access
                      </button>
                    </div>
                    <p className="config-hr-card-desc">
                      {hrAccessConfig.holidays === "MAKER" && "HR sends a holidays collection to Admin; Admin views it and Approves or Rejects."}
                      {hrAccessConfig.holidays === "READ" && "HR can only view the published holiday calendar."}
                      {hrAccessConfig.holidays === "FULL_ACCESS" && "HR can directly publish and modify holiday assignments without Admin approval."}
                    </p>
                  </div>

                  {/* Module 4: Employee Management */}
                  <div className="config-hr-card">
                    <div className="config-hr-card-header">
                      <div className="config-hr-card-icon-box" style={{ background: "#fffbeb", color: "#f59e0b" }}>
                        <Icon icon="solar:user-bold" width="18" />
                      </div>
                      <div className="config-hr-card-title-wrap">
                        <h3 className="config-hr-card-title">4. Employee Management</h3>
                        <span className="config-hr-badge-current">
                          {hrAccessConfig.employeeManagement?.canDeleteDocuments
                            ? "Doc Delete: Enabled"
                            : "Doc Delete: Restricted (Admin Only)"}
                        </span>
                      </div>
                    </div>

                    <div className="config-hr-toggle-list">
                      {/* Add Employee */}
                      <div className="config-hr-toggle-row">
                        <div className="config-hr-toggle-info">
                          <Icon icon="solar:user-plus-bold" width="16" color="#5977f8" className="toggle-icon" />
                          <span className="config-hr-toggle-title">Add Employee</span>
                        </div>
                        <div className="config-hr-switch-group">
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.employeeManagement?.canAdd !== false ? "active-enable" : ""}`}
                            onClick={() => handleNestedAccessChange("employeeManagement", "canAdd", true)}
                          >
                            <Icon icon="solar:check-circle-bold" width="13" />
                            <span>Enable</span>
                          </button>
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.employeeManagement?.canAdd === false ? "active-disable" : ""}`}
                            onClick={() => handleNestedAccessChange("employeeManagement", "canAdd", false)}
                          >
                            <Icon icon="solar:close-circle-bold" width="13" />
                            <span>Disable</span>
                          </button>
                        </div>
                      </div>

                      {/* View Details */}
                      <div className="config-hr-toggle-row">
                        <div className="config-hr-toggle-info">
                          <Icon icon="solar:eye-bold" width="16" color="#10b981" className="toggle-icon" />
                          <span className="config-hr-toggle-title">View Details</span>
                        </div>
                        <div className="config-hr-switch-group">
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.employeeManagement?.canView !== false ? "active-enable" : ""}`}
                            onClick={() => handleNestedAccessChange("employeeManagement", "canView", true)}
                          >
                            <Icon icon="solar:check-circle-bold" width="13" />
                            <span>Enable</span>
                          </button>
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.employeeManagement?.canView === false ? "active-disable" : ""}`}
                            onClick={() => handleNestedAccessChange("employeeManagement", "canView", false)}
                          >
                            <Icon icon="solar:close-circle-bold" width="13" />
                            <span>Disable</span>
                          </button>
                        </div>
                      </div>

                      {/* Edit Details Directly */}
                      <div className="config-hr-toggle-row">
                        <div className="config-hr-toggle-info">
                          <Icon icon="solar:pen-new-square-bold" width="16" color="#f59e0b" className="toggle-icon" />
                          <span className="config-hr-toggle-title">Edit Details Directly</span>
                        </div>
                        <div className="config-hr-switch-group">
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.employeeManagement?.canEdit !== false ? "active-enable" : ""}`}
                            onClick={() => handleNestedAccessChange("employeeManagement", "canEdit", true)}
                          >
                            <Icon icon="solar:check-circle-bold" width="13" />
                            <span>Enable</span>
                          </button>
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.employeeManagement?.canEdit === false ? "active-disable" : ""}`}
                            onClick={() => handleNestedAccessChange("employeeManagement", "canEdit", false)}
                          >
                            <Icon icon="solar:close-circle-bold" width="13" />
                            <span>Disable</span>
                          </button>
                        </div>
                      </div>

                      {/* Delete Uploaded Documents (Admin can toggle enable/disable for HR) */}
                      <div className="config-hr-toggle-row">
                        <div className="config-hr-toggle-info">
                          <Icon icon="solar:trash-bin-trash-bold" width="16" color="#ef4444" className="toggle-icon" />
                          <span className="config-hr-toggle-title">Delete Uploaded Documents</span>
                        </div>
                        <div className="config-hr-switch-group">
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.employeeManagement?.canDeleteDocuments ? "active-enable" : ""}`}
                            onClick={() => handleNestedAccessChange("employeeManagement", "canDeleteDocuments", true)}
                          >
                            <Icon icon="solar:check-circle-bold" width="13" />
                            <span>Enable</span>
                          </button>
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${!hrAccessConfig.employeeManagement?.canDeleteDocuments ? "active-disable" : ""}`}
                            onClick={() => handleNestedAccessChange("employeeManagement", "canDeleteDocuments", false)}
                          >
                            <Icon icon="solar:close-circle-bold" width="13" />
                            <span>Disable</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="config-hr-card-desc">
                      {hrAccessConfig.employeeManagement?.canDeleteDocuments
                        ? "HR can add, view, edit employees and is granted permission to delete uploaded documents."
                        : "HR can manage employee records per enabled permissions. Uploaded document deletion remains disabled for HR."}
                    </p>
                  </div>

                  {/* Module 5: Attendance Management */}
                  <div className="config-hr-card">
                    <div className="config-hr-card-header">
                      <div className="config-hr-card-icon-box" style={{ background: "#ecfeff", color: "#06b6d4" }}>
                        <Icon icon="solar:clock-circle-bold" width="18" />
                      </div>
                      <div className="config-hr-card-title-wrap">
                        <h3 className="config-hr-card-title">5. Attendance Management</h3>
                        <span className="config-hr-badge-current">
                          {[
                            hrAccessConfig.attendanceManagement?.dailyReport,
                            hrAccessConfig.attendanceManagement?.monthlyOverview,
                            hrAccessConfig.attendanceManagement?.exportAttendance,
                          ].filter(Boolean).length === 3
                            ? "Full Access (3/3 Enabled)"
                            : `${
                                [
                                  hrAccessConfig.attendanceManagement?.dailyReport,
                                  hrAccessConfig.attendanceManagement?.monthlyOverview,
                                  hrAccessConfig.attendanceManagement?.exportAttendance,
                                ].filter(Boolean).length
                              }/3 Actions Enabled`}
                        </span>
                      </div>
                    </div>

                    <div className="config-hr-toggle-list">
                      {/* Daily Report View */}
                      <div className="config-hr-toggle-row">
                        <div className="config-hr-toggle-info">
                          <Icon icon="solar:document-text-bold" width="16" color="#06b6d4" className="toggle-icon" />
                          <span className="config-hr-toggle-title">Daily Report View</span>
                        </div>
                        <div className="config-hr-switch-group">
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.attendanceManagement?.dailyReport !== false ? "active-enable" : ""}`}
                            onClick={() => handleNestedAccessChange("attendanceManagement", "dailyReport", true)}
                          >
                            <Icon icon="solar:check-circle-bold" width="13" />
                            <span>Enable</span>
                          </button>
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.attendanceManagement?.dailyReport === false ? "active-disable" : ""}`}
                            onClick={() => handleNestedAccessChange("attendanceManagement", "dailyReport", false)}
                          >
                            <Icon icon="solar:close-circle-bold" width="13" />
                            <span>Disable</span>
                          </button>
                        </div>
                      </div>

                      {/* Monthly Attendance Overview */}
                      <div className="config-hr-toggle-row">
                        <div className="config-hr-toggle-info">
                          <Icon icon="solar:chart-square-bold" width="16" color="#8b5cf6" className="toggle-icon" />
                          <span className="config-hr-toggle-title">Monthly Attendance Overview</span>
                        </div>
                        <div className="config-hr-switch-group">
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.attendanceManagement?.monthlyOverview !== false ? "active-enable" : ""}`}
                            onClick={() => handleNestedAccessChange("attendanceManagement", "monthlyOverview", true)}
                          >
                            <Icon icon="solar:check-circle-bold" width="13" />
                            <span>Enable</span>
                          </button>
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.attendanceManagement?.monthlyOverview === false ? "active-disable" : ""}`}
                            onClick={() => handleNestedAccessChange("attendanceManagement", "monthlyOverview", false)}
                          >
                            <Icon icon="solar:close-circle-bold" width="13" />
                            <span>Disable</span>
                          </button>
                        </div>
                      </div>

                      {/* Export Attendance */}
                      <div className="config-hr-toggle-row">
                        <div className="config-hr-toggle-info">
                          <Icon icon="solar:download-square-bold" width="16" color="#10b981" className="toggle-icon" />
                          <span className="config-hr-toggle-title">Export Attendance</span>
                        </div>
                        <div className="config-hr-switch-group">
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.attendanceManagement?.exportAttendance !== false ? "active-enable" : ""}`}
                            onClick={() => handleNestedAccessChange("attendanceManagement", "exportAttendance", true)}
                          >
                            <Icon icon="solar:check-circle-bold" width="13" />
                            <span>Enable</span>
                          </button>
                          <button
                            type="button"
                            className={`config-hr-switch-btn ${hrAccessConfig.attendanceManagement?.exportAttendance === false ? "active-disable" : ""}`}
                            onClick={() => handleNestedAccessChange("attendanceManagement", "exportAttendance", false)}
                          >
                            <Icon icon="solar:close-circle-bold" width="13" />
                            <span>Disable</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="config-hr-card-desc">
                      {hrAccessConfig.attendanceManagement?.exportAttendance !== false
                        ? "HR can view daily logs, examine monthly analytics, and export attendance records."
                        : "HR attendance permissions are customized per the enabled analytics tools above."}
                    </p>
                  </div>
                </div>

                  {/* HR Notification Notice Alert */}
                  {/* <div className="config-alert-box mt-3" style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }}>
                    <Icon icon="solar:bell-bold" width="18" color="#16a34a" />
                    <div>
                      Saving changes to HR Access automatically delivers an in-app & push notification to the active HR employee.
                    </div>
                  </div> */}

                  {/* Divider */}
                  <div className="config-panel-divider" />

                  {/* Action Buttons: HR Access Configuration */}
                  <div className="config-actions-bar">
                    <button
                      type="button"
                      className="common-modal-btn btn-small-cancel"
                      onClick={handleReset}
                      disabled={saving || !hasChanges}
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      className="common-modal-btn btn-update"
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                    >
                      {saving ? "Saving..." : "Save Configuration"}
                    </button>
                  </div>
                </>
              )}
            </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Configuration;
