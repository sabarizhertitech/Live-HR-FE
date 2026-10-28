import React, { useEffect, useState } from "react";
import { portalInstance } from "../../Services/instance";
import { toast } from "react-toastify";
import { useUser } from "../UserContext";
import "./ApprovalBanner.css";

const cleanSummaryTitle = (summary) => {
  if (!summary) return "";
  // Strip 24-character hexadecimal MongoDB ObjectId in parentheses e.g. (6a994c07d5680cbaf20a7631)
  return summary.replace(/\s*\([0-9a-fA-F]{24}\)/g, "").trim();
};

const getActionTag = (req) => {
  if (!req) return "";
  if (req.actionType === "DELETE_DOCUMENT") {
    return "DELETE DOCUMENT";
  }
  if (req.actionType === "UPDATE_SALARY") {
    const sumLower = (req.summary || "").toLowerCase();
    if (sumLower.includes("increment document") && !sumLower.includes("salary")) {
      return "INCREMENT DOCUMENT";
    }
    if (sumLower.includes("increment document") && sumLower.includes("salary")) {
      return "SALARY & DOCUMENT";
    }
  }
  return req.actionType.replace(/_/g, " ");
};

const formatDiffValue = (val) => {
  if (val === null || val === undefined || val === "" || val === "-") return "-";
  if (typeof val === "number") return `₹${val.toLocaleString("en-IN")}`;
  if (typeof val === "object") return JSON.stringify(val);
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$/.test(val)) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      }
    } catch {}
  }
  return String(val);
};

const formatLeaveShortCode = (t) => {
  let fY = t.fromYear !== undefined && t.fromYear !== null && t.fromYear !== "" ? Number(t.fromYear) : 0;
  let fM = t.fromMonth !== undefined && t.fromMonth !== null && t.fromMonth !== "" ? Number(t.fromMonth) : 0;
  let tY = t.toYear !== undefined && t.toYear !== null && t.toYear !== "" ? Number(t.toYear) : 0;
  let tM = t.toMonth !== undefined && t.toMonth !== null && t.toMonth !== "" ? Number(t.toMonth) : 0;

  const fromTotal = Number(t.minDuration !== undefined && t.minDuration !== "" ? t.minDuration : (t.eligibleMonths || 0));
  const toTotal = Number(t.maxDuration !== undefined && t.maxDuration !== "" ? t.maxDuration : (t.maxEligibleMonths || 0));

  if (fY === 0 && fM === 0 && fromTotal > 0) {
    fY = Math.floor(fromTotal / 12);
    fM = fromTotal % 12;
  }
  if (tY === 0 && tM === 0 && toTotal > 0) {
    tY = Math.floor(toTotal / 12);
    tM = toTotal % 12;
  }

  if (fY === 0 && fM === 0 && tY === 0 && tM === 0 && fromTotal === 0 && toTotal === 0) {
    return "All";
  }

  const fromStr = fY > 0 ? (fM > 0 ? `${fY}Y ${fM}M` : `${fY}Y`) : `${fM}M`;
  if (toTotal > 0 || tY > 0 || tM > 0) {
    const toStr = tY > 0 ? (tM > 0 ? `${tY}Y ${tM}M` : `${tY}Y`) : `${tM}M`;
    if (fromStr === toStr) return fromStr;
    return `${fromStr} – ${toStr}`;
  }
  return `${fromStr}+`;
};

const formatLeaveHumanDuration = (t) => {
  let fY = t.fromYear !== undefined && t.fromYear !== null && t.fromYear !== "" ? Number(t.fromYear) : 0;
  let fM = t.fromMonth !== undefined && t.fromMonth !== null && t.fromMonth !== "" ? Number(t.fromMonth) : 0;
  let tY = t.toYear !== undefined && t.toYear !== null && t.toYear !== "" ? Number(t.toYear) : 0;
  let tM = t.toMonth !== undefined && t.toMonth !== null && t.toMonth !== "" ? Number(t.toMonth) : 0;

  const fromTotal = Number(t.minDuration !== undefined && t.minDuration !== "" ? t.minDuration : (t.eligibleMonths || 0));
  const toTotal = Number(t.maxDuration !== undefined && t.maxDuration !== "" ? t.maxDuration : (t.maxEligibleMonths || 0));

  if (fY === 0 && fM === 0 && fromTotal > 0) {
    fY = Math.floor(fromTotal / 12);
    fM = fromTotal % 12;
  }
  if (tY === 0 && tM === 0 && toTotal > 0) {
    tY = Math.floor(toTotal / 12);
    tM = toTotal % 12;
  }

  if (fY === 0 && fM === 0 && tY === 0 && tM === 0 && fromTotal === 0 && toTotal === 0) {
    return "All Service Durations";
  }

  const unit = (y, m) => {
    if (y > 0 && m > 0) return `${y} Year${y > 1 ? "s" : ""} ${m} Month${m > 1 ? "s" : ""}`;
    if (y > 0) return `${y} Year${y > 1 ? "s" : ""}`;
    return `${m} Month${m > 1 ? "s" : ""}`;
  };

  const fromStr = unit(fY, fM);
  if (toTotal > 0 || tY > 0 || tM > 0) {
    const toStr = unit(tY, tM);
    if (fromStr === toStr) return fromStr;
    return `${fromStr} to ${toStr}`;
  }
  return `${fromStr} and above`;
};

const renderSingleCategoryDetails = (cat, year, isBatch = false, index = 0) => {
  const name = cat.name || "Leave Category";
  const tiers = Array.isArray(cat.tiers) ? cat.tiers : [];

  const probTiers = tiers.filter((t) => {
    const type = t.employeeType;
    if (type) return type === "Probationary Employee" || type === "Probation";
    return (t.durationUnit || "months") === "months" && Number(t.eligibleMonths || 0) <= 12;
  });

  const permTiers = tiers.filter((t) => {
    const type = t.employeeType;
    if (type) return type === "Permanent Employee" || type === "Permanent";
    return (t.durationUnit || "months") === "years" || Number(t.eligibleMonths || 0) > 12;
  });

  const hasProbOthers = cat.probationOthersLeaveCount !== undefined && cat.probationOthersLeaveCount !== null && cat.probationOthersLeaveCount !== "";
  const hasPermOthers = cat.permanentOthersLeaveCount !== undefined && cat.permanentOthersLeaveCount !== null && cat.permanentOthersLeaveCount !== "";

  const probAllCount = cat.probationAllLeaveCount !== undefined && cat.probationAllLeaveCount !== null && cat.probationAllLeaveCount !== ""
    ? cat.probationAllLeaveCount
    : (probTiers.length === 0 && hasProbOthers ? cat.probationOthersLeaveCount : null);

  const permAllCount = cat.permanentAllLeaveCount !== undefined && cat.permanentAllLeaveCount !== null && cat.permanentAllLeaveCount !== ""
    ? cat.permanentAllLeaveCount
    : (permTiers.length === 0 && hasPermOthers ? cat.permanentOthersLeaveCount : null);

  const flatCount = cat.leaveCount ?? (permAllCount ?? probAllCount);

  return (
    <div key={index} className="approval-leave-category-block" style={{ marginBottom: isBatch ? "20px" : "0", borderBottom: isBatch ? "1px dashed #cbd5e1" : "none", paddingBottom: isBatch ? "16px" : "0" }}>
      {/* Category Overview Card */}
      <div className="approval-leave-overview-card">
        <div className="approval-leave-overview-item">
          <span className="approval-leave-label">Category Name</span>
          <span className="approval-leave-value approval-category-name-badge">{name}</span>
        </div>
        {year && (
          <div className="approval-leave-overview-item">
            <span className="approval-leave-label">Financial Year</span>
            <span className="approval-leave-value">{year}</span>
          </div>
        )}
        <div className="approval-leave-overview-item">
          <span className="approval-leave-label">Total Rules</span>
          <span className="approval-leave-value">
            {tiers.length > 0 ? `${tiers.length} rule${tiers.length > 1 ? "s" : ""} configured` : "Flat leave allocation"}
          </span>
        </div>
      </div>

      {/* Probationary Employee Rules */}
      {(probTiers.length > 0 || hasProbOthers) && (
        <div className="approval-leave-rule-section">
          <div className="approval-leave-section-header">
            <span className="approval-leave-badge probation-badge">PROBATIONARY EMPLOYEES</span>
            <span className="approval-leave-section-sub">Rules applied during probation period</span>
          </div>
          <table className="approval-diff-table approval-leave-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Experience / Tenure Range</th>
                <th>Rule Code</th>
                <th>Leave Count</th>
              </tr>
            </thead>
            <tbody>
              {probTiers.map((t, idx) => (
                <tr key={idx}>
                  <td style={{ color: "#94a3b8" }}>{idx + 1}</td>
                  <td><strong>{formatLeaveHumanDuration(t)}</strong></td>
                  <td><span className="lm-rule-pill lm-pill-prob">{formatLeaveShortCode(t)}</span></td>
                  <td>
                    <span className="approval-val-new">
                      {t.leaveCount} {Number(t.leaveCount) === 1 ? "Leave" : "Leaves"}
                    </span>
                  </td>
                </tr>
              ))}
              {hasProbOthers && (
                <tr className="approval-others-row">
                  <td style={{ color: "#94a3b8" }}>•</td>
                  <td><strong>{probTiers.length > 0 ? "Other Probationary Durations" : "All Probationary Employees"}</strong></td>
                  <td><span className="lm-rule-pill lm-pill-others">{probTiers.length > 0 ? "Others" : "All"}</span></td>
                  <td>
                    <span className="approval-val-new">
                      {cat.probationOthersLeaveCount} {Number(cat.probationOthersLeaveCount) === 1 ? "Leave" : "Leaves"}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Permanent Employee Rules */}
      {(permTiers.length > 0 || hasPermOthers) && (
        <div className="approval-leave-rule-section">
          <div className="approval-leave-section-header">
            <span className="approval-leave-badge permanent-badge">PERMANENT EMPLOYEES</span>
            <span className="approval-leave-section-sub">Rules applied for confirmed/permanent staff</span>
          </div>
          <table className="approval-diff-table approval-leave-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Experience / Tenure Range</th>
                <th>Rule Code</th>
                <th>Leave Count</th>
              </tr>
            </thead>
            <tbody>
              {permTiers.map((t, idx) => (
                <tr key={idx}>
                  <td style={{ color: "#94a3b8" }}>{idx + 1}</td>
                  <td><strong>{formatLeaveHumanDuration(t)}</strong></td>
                  <td><span className="lm-rule-pill lm-pill-perm">{formatLeaveShortCode(t)}</span></td>
                  <td>
                    <span className="approval-val-new">
                      {t.leaveCount} {Number(t.leaveCount) === 1 ? "Leave" : "Leaves"}
                    </span>
                  </td>
                </tr>
              ))}
              {hasPermOthers && (
                <tr className="approval-others-row">
                  <td style={{ color: "#94a3b8" }}>•</td>
                  <td><strong>{permTiers.length > 0 ? "Other Permanent Durations" : "All Permanent Employees"}</strong></td>
                  <td><span className="lm-rule-pill lm-pill-others">{permTiers.length > 0 ? "Others" : "All"}</span></td>
                  <td>
                    <span className="approval-val-new">
                      {cat.permanentOthersLeaveCount} {Number(cat.permanentOthersLeaveCount) === 1 ? "Leave" : "Leaves"}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* If flat leave count without tiers */}
      {tiers.length === 0 && !hasProbOthers && !hasPermOthers && (
        <div className="approval-flat-leave-card">
          <span className="approval-leave-label">Allocated Leaves</span>
          <span className="approval-val-new" style={{ fontSize: "16px", padding: "6px 14px" }}>
            {flatCount || 0} Leaves / Year
          </span>
        </div>
      )}
    </div>
  );
};

const renderLeaveCategoryDetails = (req) => {
  const payload = req.payload || {};
  const isDelete = req.actionType === "DELETE_LEAVE_CATEGORY" || req.actionType === "BULK_DELETE_LEAVE_CATEGORY";

  if (isDelete) {
    return (
      <div className="approval-delete-warning">
        <div className="approval-delete-icon"></div>
        <div>
          <h4>Leave Category Deletion Requested</h4>
          <p>
            HR has requested to delete{" "}
            <strong>{cleanSummaryTitle(req.summary).replace(/^Delete Leave Category:\s*/i, "") || "this leave category"}</strong>.
          </p>
          <p className="approval-delete-note">
            Approving this request will permanently remove this leave category and its configured rules.
          </p>
        </div>
      </div>
    );
  }

  const year = payload.year || "";
  const categoriesList = Array.isArray(payload.categories) && payload.categories.length > 0
    ? payload.categories
    : [payload];

  return (
    <div className="approval-leave-details">
      {categoriesList.map((cat, idx) =>
        renderSingleCategoryDetails(cat, year, categoriesList.length > 1, idx)
      )}
    </div>
  );
};

const renderHolidayDetails = (req) => {
  const payload = req.payload || {};
  const isDelete = req.actionType === "DELETE_HOLIDAY";
  const isEdit = req.actionType === "EDIT_HOLIDAY" || (payload.oldHoliday && payload.newHoliday);

  if (isDelete) {
    const dStr = payload.date || payload.holiday?.date;
    const formattedDate = dStr ? new Date(dStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : dStr;
    return (
      <div className="approval-delete-warning">
        <div className="approval-delete-icon"></div>
        <div>
          <h4>Holiday Deletion Requested</h4>
          <p>
            HR has requested to delete holiday: <strong>"{payload.name || payload.holiday?.name || "Holiday"}"</strong> on <strong>{formattedDate}</strong>.
          </p>
          <p className="approval-delete-note">
            Approving will remove this holiday from the calendar for all employees.
          </p>
        </div>
      </div>
    );
  }

  if (isEdit) {
    const oldD = payload.oldHoliday?.date ? new Date(payload.oldHoliday.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
    const newD = payload.newHoliday?.date ? new Date(payload.newHoliday.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : (payload.holiday?.date || "-");
    return (
      <table className="approval-diff-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Previous Data</th>
            <th>Edited Data</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="approval-field-col"><strong>Holiday Name</strong></td>
            <td className="approval-prev-col"><span className="approval-val-prev">{payload.oldHoliday?.name || "-"}</span></td>
            <td className="approval-new-col"><span className="approval-val-new">{payload.newHoliday?.name || payload.holiday?.name || "-"}</span></td>
          </tr>
          <tr>
            <td className="approval-field-col"><strong>Holiday Date</strong></td>
            <td className="approval-prev-col"><span className="approval-val-prev">{oldD}</span></td>
            <td className="approval-new-col"><span className="approval-val-new">{newD}</span></td>
          </tr>
        </tbody>
      </table>
    );
  }

  // ADD_HOLIDAY
  const hName = payload.holiday?.name || payload.name || "-";
  const hDate = payload.holiday?.date || payload.date;
  const formattedDate = hDate ? new Date(hDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", weekday: "short" }) : "-";

  return (
    <div className="approval-leave-overview-card">
      <div className="approval-leave-overview-item">
        <span className="approval-leave-label">Holiday Name</span>
        <span className="approval-leave-value approval-category-name-badge">{hName}</span>
      </div>
      <div className="approval-leave-overview-item">
        <span className="approval-leave-label">Date</span>
        <span className="approval-leave-value" style={{ fontWeight: 600, color: "#047857" }}>{formattedDate}</span>
      </div>
      <div className="approval-leave-overview-item">
        <span className="approval-leave-label">Type</span>
        <span className="approval-leave-value" style={{ textTransform: "capitalize" }}>{payload.type || "Government"} Holiday</span>
      </div>
    </div>
  );
};

const renderGenericPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return <p style={{ color: "#64748b" }}>No details available.</p>;
  }

  const entries = Object.entries(payload).filter(([k]) => k !== "_id" && k !== "id");
  if (entries.length === 0) {
    return <p style={{ color: "#64748b" }}>No details available.</p>;
  }

  return (
    <table className="approval-diff-table">
      <thead>
        <tr>
          <th>Field</th>
          <th>Submitted Value</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, value], idx) => {
          let formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());
          let formattedVal = "-";
          if (typeof value === "object" && value !== null) {
            formattedVal = JSON.stringify(value);
          } else {
            formattedVal = String(value);
          }
          return (
            <tr key={idx}>
              <td className="approval-field-col"><strong>{formattedKey}</strong></td>
              <td className="approval-new-col"><span className="approval-val-new">{formattedVal}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const ApprovalBanner = ({ moduleName, onRefresh }) => {
  const { user: contextUser } = useUser() || {};
  const [requests, setRequests] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editPayload, setEditPayload] = useState({});
  const [inspectingRequest, setInspectingRequest] = useState(null);
  const [rejectingRequestId, setRejectingRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [inspectingDocs, setInspectingDocs] = useState(null);
  const [docLoadingKey, setDocLoadingKey] = useState(null);

  useEffect(() => {
    if (!inspectingRequest) {
      setInspectingDocs(null);
      return;
    }

    if (inspectingRequest.payload?.documents) {
      setInspectingDocs(inspectingRequest.payload.documents);
      return;
    }

    if (inspectingRequest.payload?.newSalary?.documents) {
      setInspectingDocs(inspectingRequest.payload.newSalary.documents);
      return;
    }

    // Fallback: If UPDATE_SALARY, check employee's increment documents
    const empId = inspectingRequest.payload?.empId || inspectingRequest.payload?.empIdString;
    if (inspectingRequest.actionType === "UPDATE_SALARY" && empId) {
      portalInstance
        .get(`/users/employee/increment-documents/${empId}`)
        .then((res) => {
          const docs = res.data?.data;
          if (Array.isArray(docs) && docs.length > 0) {
            const targetSalId = inspectingRequest.payload?.editingId || inspectingRequest.payload?.newSalary?._id;
            let matched = null;
            if (targetSalId) {
              matched = docs.find((d) => String(d.salaryId) === String(targetSalId));
            }
            if (!matched && inspectingRequest.payload?.newSalary?.fromDate) {
              const d = new Date(inspectingRequest.payload.newSalary.fromDate);
              if (!isNaN(d.getTime())) {
                const yr = d.getFullYear();
                const mo = d.getMonth();
                const computedFY = mo >= 3 ? `${yr}–${yr + 1}` : `${yr - 1}–${yr}`;
                const cleanTargetFY = String(computedFY).replace(/[\u2013\u2014–-]/g, "–").trim();
                matched = docs.find((doc) => String(doc.financialYear || "").replace(/[\u2013\u2014–-]/g, "–").trim() === cleanTargetFY);
              }
            }
            if (!matched) {
              matched = docs[0];
            }
            if (matched) {
              setInspectingDocs(matched);
            }
          }
        })
        .catch((err) => {
          console.error("Error fetching increment docs for approval modal:", err);
        });
    }
  }, [inspectingRequest]);

  const handleViewDocument = async (fileKey, empId, directUrl) => {
    if (!fileKey && !directUrl) return;
    if (directUrl) {
      window.open(directUrl, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      setDocLoadingKey(fileKey);
      const res = await portalInstance.post("/users/document-view-url", {
        key: fileKey,
        empId: empId || undefined,
      });
      if (res.data?.success && res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Unable to open document. The file might not be available.");
      }
    } catch (err) {
      console.error("Error viewing document:", err);
      toast.error("Failed to load document view URL.");
    } finally {
      setDocLoadingKey(null);
    }
  };

  useEffect(() => {
    const stored = JSON.parse(sessionStorage.getItem("Erti-Portal") || "{}");
    setUser(stored);
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const url = moduleName
        ? `/hr-approval/requests?status=PENDING&targetModule=${moduleName}`
        : `/hr-approval/requests?status=PENDING`;
      const res = await portalInstance.get(url);
      if (res.data.success) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      console.error("Fetch pending approval banner error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, [moduleName]);

  const handleApprove = async (reqId) => {
    setActionLoading(true);
    try {
      const res = await portalInstance.post(`/hr-approval/approve/${reqId}`, {
        adminNote: "Approved by Admin",
      });
      if (res.data.success) {
        toast.success(res.data.message || (inspectingRequest?.actionType === "DELETE_DOCUMENT" ? "Document deleted successfully from database and S3." : "HR change approved! Updated live data successfully."));
        setInspectingRequest(null);
        fetchPending();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve HR change");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequestId) return;
    if (!rejectionReason.trim()) {
      toast.warning("Please provide a rejection reason.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await portalInstance.post(`/hr-approval/reject/${rejectingRequestId}`, {
        adminNote: rejectionReason.trim(),
      });
      if (res.data.success) {
        toast.success("HR change rejected with reason recorded.");
        setRejectingRequestId(null);
        setRejectionReason("");
        setInspectingRequest(null);
        fetchPending();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject HR change");
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (req) => {
    setEditingRequest(req);
    const initialPayload = JSON.parse(JSON.stringify(req.payload || {}));
    if (req.targetModule === "LEAVE_CATEGORY" || req.targetModule === "LEAVE_MANAGEMENT") {
      if (!Array.isArray(initialPayload.categories)) {
        initialPayload.categories = [{
          name: initialPayload.name || "",
          leaveCount: initialPayload.leaveCount ?? (initialPayload.permanentOthersLeaveCount ?? (initialPayload.tiers?.[0]?.leaveCount || 0)),
          probationOthersLeaveCount: initialPayload.probationOthersLeaveCount ?? 0,
          permanentOthersLeaveCount: initialPayload.permanentOthersLeaveCount ?? (initialPayload.leaveCount ?? 0),
          tiers: initialPayload.tiers || [],
        }];
      }
    }
    setEditPayload(initialPayload);
  };

  const handleSaveAndApprove = async () => {
    if (!editingRequest) return;
    setActionLoading(true);
    try {
      const res = await portalInstance.post(`/hr-approval/update-approve/${editingRequest._id}`, {
        payload: editPayload,
        adminNote: "Edited and Approved by Admin",
      });
      if (res.data.success) {
        toast.success("HR change edited & approved! Live data updated.");
        setEditingRequest(null);
        fetchPending();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to edit and approve");
    } finally {
      setActionLoading(false);
    }
  };

  if (!requests || requests.length === 0) return null;

  const activeUser = user || contextUser;
  const isAdmin = activeUser?.role === "admin";

  return (
    <div className="approval-top-banner">
      <div className="approval-banner-inner">
        <div className="approval-banner-title-row">
          <span className="approval-pulse-dot"></span>
          <span className="approval-banner-badge">
            {isAdmin ? "Admin Review Required" : "Pending Admin Approval"}
          </span>
          <span className="approval-banner-count">({requests.length} Pending HR Update{requests.length > 1 ? "s" : ""})</span>
        </div>

        <div className="approval-items-list">
          {requests.map((req) => (
            <div key={req._id} className="approval-banner-item">
              <div className="approval-item-text">
                <strong>{req.hrName || "HR"}</strong> submitted: <span>{cleanSummaryTitle(req.summary)}</span>
              </div>

              {isAdmin ? (
                <div className="approval-item-actions">
                  <button
                    className="approval-btn-view"
                    onClick={() => setInspectingRequest(req)}
                    disabled={actionLoading}
                  >
                    View Details
                  </button>
                  <button
                    className="approval-btn-approve"
                    onClick={() => handleApprove(req._id)}
                    disabled={actionLoading}
                  >
                    Approve
                  </button>
                  {["HOLIDAY", "LEAVE_CATEGORY", "SALARY_SLIP"].includes(req.targetModule) && (
                    <button
                      className="approval-btn-edit"
                      onClick={() => openEditModal(req)}
                      disabled={actionLoading}
                    >
                      Edit & Approve
                    </button>
                  )}
                  <button
                    className="approval-btn-reject"
                    onClick={() => {
                      setRejectingRequestId(req._id);
                      setRejectionReason("");
                    }}
                    disabled={actionLoading}
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="approval-item-actions">
                  <button
                    className="approval-btn-view"
                    onClick={() => setInspectingRequest(req)}
                  >
                    View Details
                  </button>
                  <span className="approval-hr-status-tag">Status: Pending Approval</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* EDIT & APPROVE MODAL */}
      {editingRequest && (
        <div className="approval-modal-overlay">
          <div className="approval-modal-content approval-modal-edit">
            <h3>Edit HR Change Before Approving</h3>
            <p className="approval-modal-desc">
              Modify the details submitted by HR below. Clicking <strong>Save & Approve</strong> will immediately apply these changes for all employees.
            </p>

            <div className="approval-edit-fields">
              {editingRequest.targetModule === "HOLIDAY" && (
                <>
                  <label>Holiday Name</label>
                  <input
                    type="text"
                    value={editPayload?.holiday?.name || ""}
                    onChange={(e) =>
                      setEditPayload({
                        ...editPayload,
                        holiday: { ...editPayload.holiday, name: e.target.value },
                      })
                    }
                  />
                  <label>Holiday Date</label>
                  <input
                    type="date"
                    value={editPayload?.holiday?.date || ""}
                    onChange={(e) =>
                      setEditPayload({
                        ...editPayload,
                        holiday: { ...editPayload.holiday, date: e.target.value },
                      })
                    }
                  />
                </>
              )}

              {editingRequest.targetModule === "LEAVE_CATEGORY" && (
                <div className="approval-edit-categories-wrapper" style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "420px", overflowY: "auto", paddingRight: "4px" }}>
                  {Array.isArray(editPayload?.categories) && editPayload.categories.length > 0 ? (
                    editPayload.categories.map((cat, catIdx) => (
                      <div key={catIdx} className="approval-edit-category-card" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px 16px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                          <strong style={{ fontSize: "13px", color: "#4f46e5" }}>
                            {editPayload.categories.length > 1 ? `Category #${catIdx + 1}: ${cat.name || "New Category"}` : (cat.name || "Leave Category")}
                          </strong>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          <div>
                            <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "4px" }}>Category Name</label>
                            <input
                              type="text"
                              value={cat.name || ""}
                              onChange={(e) => {
                                const updated = [...editPayload.categories];
                                updated[catIdx] = { ...updated[catIdx], name: e.target.value };
                                setEditPayload({ ...editPayload, categories: updated, name: updated[0]?.name });
                              }}
                              style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                            />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div>
                              <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "4px" }}>Probation Leave Count (Days)</label>
                              <input
                                type="number"
                                min="0"
                                value={cat.probationOthersLeaveCount !== undefined ? cat.probationOthersLeaveCount : (cat.tiers?.find(t => t.employeeType?.includes("Probation"))?.leaveCount || cat.leaveCount || 0)}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const updated = [...editPayload.categories];
                                  const targetCat = { ...updated[catIdx] };
                                  targetCat.probationOthersLeaveCount = val;
                                  if (targetCat.tiers && targetCat.tiers.length > 0) {
                                    targetCat.tiers = targetCat.tiers.map(t =>
                                      t.employeeType?.includes("Probation") ? { ...t, leaveCount: val } : t
                                    );
                                  }
                                  updated[catIdx] = targetCat;
                                  setEditPayload({ ...editPayload, categories: updated });
                                }}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "4px" }}>Permanent Leave Count (Days)</label>
                              <input
                                type="number"
                                min="0"
                                value={cat.permanentOthersLeaveCount !== undefined ? cat.permanentOthersLeaveCount : (cat.tiers?.find(t => t.employeeType?.includes("Permanent"))?.leaveCount || cat.leaveCount || 0)}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const updated = [...editPayload.categories];
                                  const targetCat = { ...updated[catIdx] };
                                  targetCat.permanentOthersLeaveCount = val;
                                  targetCat.leaveCount = val;
                                  if (targetCat.tiers && targetCat.tiers.length > 0) {
                                    targetCat.tiers = targetCat.tiers.map(t =>
                                      t.employeeType?.includes("Permanent") ? { ...t, leaveCount: val } : t
                                    );
                                  }
                                  updated[catIdx] = targetCat;
                                  setEditPayload({ ...editPayload, categories: updated });
                                }}
                                style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <label>Category Name</label>
                      <input
                        type="text"
                        value={editPayload?.name || ""}
                        onChange={(e) => setEditPayload({ ...editPayload, name: e.target.value })}
                      />
                      <label>Leave Count (Days)</label>
                      <input
                        type="number"
                        min="0"
                        value={editPayload?.leaveCount || editPayload?.permanentOthersLeaveCount || editPayload?.tiers?.[0]?.leaveCount || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditPayload({
                            ...editPayload,
                            leaveCount: val,
                            permanentOthersLeaveCount: val,
                            tiers: editPayload?.tiers?.map(t => ({ ...t, leaveCount: val })) || [{ leaveCount: val }],
                          });
                        }}
                      />
                    </>
                  )}
                </div>
              )}

              {editingRequest.targetModule === "SALARY_SLIP" && (
                <>
                  <label>Net Pay (₹)</label>
                  <input
                    type="number"
                    value={editPayload?.netPay || 0}
                    onChange={(e) =>
                      setEditPayload({ ...editPayload, netPay: Number(e.target.value) })
                    }
                  />
                </>
              )}
            </div>

            <div className="approval-modal-footer">
              <button className="common-modal-btn btn-small-cancel" onClick={() => setEditingRequest(null)}>
                Cancel
              </button>
              <button
                className="common-modal-btn btn-update"
                onClick={handleSaveAndApprove}
                disabled={actionLoading}
              >
                {actionLoading ? "Saving..." : "Save & Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT DETAILS / COMPARISON MODAL */}
      {inspectingRequest && (
        <div className="approval-modal-overlay" onClick={() => setInspectingRequest(null)}>
          <div className="approval-modal-content approval-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="approval-modal-header">
              <div>
                <span className="approval-modal-tag">{getActionTag(inspectingRequest)}</span>
                <h3>{cleanSummaryTitle(inspectingRequest.summary)}</h3>
                <p className="approval-modal-meta">
                  Submitted by <strong>{inspectingRequest.hrName || "HR"}</strong> on{" "}
                  {new Date(inspectingRequest.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <button className="common-modal-close-x approval-modal-close" onClick={() => setInspectingRequest(null)}>✕</button>
            </div>

            <div className="approval-diff-container">
              {/* If structured changes array is available */}
              {inspectingRequest.payload?.changes && inspectingRequest.payload.changes.length > 0 ? (
                <>
                  <table className="approval-diff-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Previous Data</th>
                        <th>Edited Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectingRequest.payload.changes.map((c, i) => (
                        <tr key={i}>
                          <td className="approval-field-col"><strong>{c.fieldName}</strong></td>
                          <td className="approval-prev-col">
                            <span className="approval-val-prev">
                              {formatDiffValue(c.from)}
                            </span>
                          </td>
                          <td className="approval-new-col">
                            <span className="approval-val-new" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                              {formatDiffValue(c.to)}
                              {/* {c.fileKey && (
                                <button
                                  type="button"
                                  className="approval-btn-inline-view"
                                  onClick={() => handleViewDocument(
                                    c.fileKey,
                                    inspectingRequest.payload?.empId || inspectingRequest.payload?.empIdString
                                  )}
                                  title="View Document in new tab"
                                >
                                  View
                                </button>
                              )} */}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Uploaded Increment Documents Card Section */}
                  {inspectingDocs && (inspectingDocs.incrementLetter?.fileName || inspectingDocs.incrementLetter?.fileKey || inspectingDocs.performanceForm?.fileName || inspectingDocs.performanceForm?.fileKey) && (
                    <div className="approval-increment-docs-section">
                      <div className="approval-increment-docs-header">
                        <div className="approval-increment-docs-title">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, color: "#4f46e5" }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                          </svg>
                          Uploaded Increment Documents
                        </div>
                        {inspectingDocs.financialYear && (
                          <span className="approval-fy-badge">
                            FY {inspectingDocs.financialYear}
                          </span>
                        )}
                      </div>

                      <div className="approval-increment-docs-grid">
                        {(inspectingDocs.incrementLetter?.fileName || inspectingDocs.incrementLetter?.fileKey) && (
                          <div className="approval-doc-card">
                            <div className="approval-doc-card-info">
                              <span className="approval-doc-card-type">Increment Letter</span>
                              <span className="approval-doc-card-name" title={inspectingDocs.incrementLetter.fileName || "Increment Letter"}>
                                {inspectingDocs.incrementLetter.fileName || "Increment Letter"}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="approval-btn-view-doc"
                              disabled={docLoadingKey === (inspectingDocs.incrementLetter.fileKey || "inc")}
                              onClick={() => handleViewDocument(
                                inspectingDocs.incrementLetter.fileKey,
                                inspectingRequest.payload?.empId || inspectingRequest.payload?.empIdString,
                                inspectingDocs.incrementLetter.url
                              )}
                            >
                              {docLoadingKey === (inspectingDocs.incrementLetter.fileKey || "inc") ? (
                                "Loading..."
                              ) : (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                  View Document
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {(inspectingDocs.performanceForm?.fileName || inspectingDocs.performanceForm?.fileKey) && (
                          <div className="approval-doc-card">
                            <div className="approval-doc-card-info">
                              <span className="approval-doc-card-type">Performance Form</span>
                              <span className="approval-doc-card-name" title={inspectingDocs.performanceForm.fileName || "Performance Form"}>
                                {inspectingDocs.performanceForm.fileName || "Performance Form"}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="approval-btn-view-doc"
                              disabled={docLoadingKey === (inspectingDocs.performanceForm.fileKey || "perf")}
                              onClick={() => handleViewDocument(
                                inspectingDocs.performanceForm.fileKey,
                                inspectingRequest.payload?.empId || inspectingRequest.payload?.empIdString,
                                inspectingDocs.performanceForm.url
                              )}
                            >
                              {docLoadingKey === (inspectingDocs.performanceForm.fileKey || "perf") ? (
                                "Loading..."
                              ) : (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                  View Document
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Allowances & Benefits Breakdown for Salary Requests */}
                  {inspectingRequest.actionType === "UPDATE_SALARY" && !((inspectingRequest.summary || "").toLowerCase().includes("increment document") && !(inspectingRequest.summary || "").toLowerCase().includes("salary")) && (
                    <div className="approval-salary-allowances-section">
                      <h4 className="approval-salary-allowances-title">
                        Allowances & Benefits Breakdown
                      </h4>
                      <table className="approval-diff-table">
                        <thead>
                          <tr>
                            <th>Allowance Type</th>
                            <th>Previous Amount</th>
                            <th>New Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            inspectingRequest.payload?.newSalary?.allowances ||
                            inspectingRequest.payload?.updatedData?.allowances ||
                            []
                          ).map((a, idx) => {
                            const prevAllowances =
                              inspectingRequest.payload?.previousSalary?.allowances ||
                              inspectingRequest.payload?.previousData?.allowances ||
                              [];
                            const prevA = prevAllowances.find((pa) => pa.label === a.label);
                            return (
                              <tr key={idx}>
                                <td className="approval-field-col"><strong>{a.label}</strong></td>
                                <td className="approval-prev-col">
                                  <span className="approval-val-prev">
                                    {prevA?.value != null ? `₹${Number(prevA.value).toLocaleString("en-IN")}` : "-"}
                                  </span>
                                </td>
                                <td className="approval-new-col">
                                  <span className="approval-val-new">
                                    ₹{Number(a.value || 0).toLocaleString("en-IN")}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                          {(!inspectingRequest.payload?.newSalary?.allowances ||
                            inspectingRequest.payload?.newSalary?.allowances.length === 0) && (
                            <tr>
                              <td colSpan="3" style={{ textAlign: "center", color: "#94a3b8", padding: "10px" }}>
                                No allowances configured
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {/* Warning Box for DELETE_DOCUMENT */}
                  {inspectingRequest.actionType === "DELETE_DOCUMENT" && (
                    <div className="approval-delete-warning" style={{ marginTop: 14, background: "#fff1f2", borderColor: "#fecdd3" }}>
                      <div className="approval-delete-icon" style={{ color: "#e11d48", fontSize: "22px" }}>🗑️</div>
                      <div>
                        <h4 style={{ color: "#be123c", marginBottom: "4px" }}>Document Deletion Requested</h4>
                        <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                          HR has requested to delete <strong>{inspectingRequest.payload?.documentLabel || "this document"}</strong> for employee <strong>{inspectingRequest.payload?.empName || "Employee"}</strong> ({inspectingRequest.payload?.empIdString || ""}).
                        </p>
                        <p className="approval-delete-note" style={{ color: "#991b1b", marginTop: "4px" }}>
                          Approving this request will permanently remove the document file from S3 storage and delete the record from the database.
                        </p>
                        {inspectingRequest.payload?.fileKey && (
                          <div style={{ marginTop: 10 }}>
                            <button
                              type="button"
                              className="approval-btn-view-doc"
                              onClick={() => handleViewDocument(
                                inspectingRequest.payload.fileKey,
                                inspectingRequest.payload.empId || inspectingRequest.payload.empIdString,
                                inspectingRequest.payload.fileUrl
                              )}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              View Document Before Decision
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : inspectingRequest.actionType === "DELETE_EMPLOYEE" ? (
                <div className="approval-delete-warning">
                  <div className="approval-delete-icon"></div>
                  <div>
                    <h4>Employee Deletion Requested</h4>
                    <p>HR has requested to delete <strong>{inspectingRequest.payload?.empName || "the employee"}</strong> ({inspectingRequest.payload?.empIdString || ""}).</p>
                    <p className="approval-delete-note">Approving this request will mark the employee as deleted and revoke access.</p>
                  </div>
                </div>
              ) : inspectingRequest.actionType === "DELETE_DOCUMENT" ? (
                <div className="approval-delete-warning" style={{ background: "#fff1f2", borderColor: "#fecdd3" }}>
                  <div className="approval-delete-icon" style={{ color: "#e11d48", fontSize: "22px" }}>🗑️</div>
                  <div>
                    <h4 style={{ color: "#be123c", marginBottom: "4px" }}>Document Deletion Requested</h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
                      HR has requested to delete <strong>{inspectingRequest.payload?.documentLabel || "this document"}</strong> for employee <strong>{inspectingRequest.payload?.empName || "Employee"}</strong> ({inspectingRequest.payload?.empIdString || ""}).
                    </p>
                    <p className="approval-delete-note" style={{ color: "#991b1b", marginTop: "4px" }}>
                      Approving this request will permanently remove the document file from S3 storage and delete the record from the database.
                    </p>
                    {inspectingRequest.payload?.fileKey && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          type="button"
                          className="approval-btn-view-doc"
                          onClick={() => handleViewDocument(
                            inspectingRequest.payload.fileKey,
                            inspectingRequest.payload.empId || inspectingRequest.payload.empIdString,
                            inspectingRequest.payload.fileUrl
                          )}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5 }}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                          View Document Before Decision
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (inspectingRequest.targetModule === "LEAVE_CATEGORY" || inspectingRequest.targetModule === "LEAVE_MANAGEMENT" || (inspectingRequest.actionType && inspectingRequest.actionType.includes("LEAVE_CATEGORY"))) ? (
                renderLeaveCategoryDetails(inspectingRequest)
              ) : (inspectingRequest.targetModule === "HOLIDAY" || inspectingRequest.targetModule === "GOV_HOLIDAY" || (inspectingRequest.actionType && inspectingRequest.actionType.includes("HOLIDAY"))) ? (
                renderHolidayDetails(inspectingRequest)
              ) : inspectingRequest.payload?.previousData || inspectingRequest.payload?.updatedData ? (
                <div className="approval-diff-grid">
                  <div className="approval-diff-box approval-diff-box-prev">
                    <h4>Previous Data</h4>
                    <pre>{JSON.stringify(inspectingRequest.payload?.previousData || {}, null, 2)}</pre>
                  </div>
                  <div className="approval-diff-box approval-diff-box-new">
                    <h4>Edited Data</h4>
                    <pre>{JSON.stringify(inspectingRequest.payload?.updatedData || {}, null, 2)}</pre>
                  </div>
                </div>
              ) : (
                <div className="approval-generic-payload-wrapper">
                  {renderGenericPayload(inspectingRequest.payload)}
                </div>
              )}
            </div>

            <div className="approval-modal-footer">
              <button className="common-modal-btn btn-small-cancel" onClick={() => setInspectingRequest(null)}>
                Close
              </button>
              {isAdmin && (
                <>
                  <button
                    className="common-modal-btn btn-reject"
                    onClick={() => {
                      setRejectingRequestId(inspectingRequest._id);
                      setRejectionReason("");
                    }}
                    disabled={actionLoading}
                  >
                    Reject with Reason
                  </button>
                  <button
                    className="common-modal-btn btn-confirm-success"
                    onClick={() => handleApprove(inspectingRequest._id)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Processing..." : "Approve Changes"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REJECT WITH REASON MODAL */}
      {rejectingRequestId && (
        <div className="approval-modal-overlay" onClick={() => setRejectingRequestId(null)}>
          <div className="approval-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="approval-modal-header" style={{ borderBottom: "none", marginBottom: 0 }}>
              <h3>Reject HR Request</h3>
              <button className="common-modal-close-x approval-modal-close" onClick={() => setRejectingRequestId(null)}>✕</button>
            </div>
            <p className="approval-modal-desc">
              Please enter the reason for rejecting this change. This will be stored in the audit logs and sent to the HR requester.
            </p>

            <div className="approval-edit-fields">
              <label>Rejection Reason (Required) *</label>
              <textarea
                className="approval-rejection-textarea"
                rows={4}
                placeholder="e.g., Salary discrepancy with budget, please adjust allowance or provide justification..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                autoFocus
              />
            </div>

            <div className="approval-modal-footer">
              <button
                className="common-modal-btn btn-small-cancel"
                onClick={() => {
                  setRejectingRequestId(null);
                  setRejectionReason("");
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="common-modal-btn btn-reject"
                onClick={handleConfirmReject}
                disabled={actionLoading || !rejectionReason.trim()}
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalBanner;
