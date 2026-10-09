import React, { useEffect, useMemo, useState } from "react";
import { Button, Spinner, Modal, Form } from "react-bootstrap";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FaPaperPlane, FaClock, FaCheckCircle, FaTimesCircle, FaEye, FaFileAlt, FaArrowDown } from "react-icons/fa";

import { portalInstance } from "../../../Services/instance";
import Sidebar from "../../HeaderSidebar/Sidebar";
import "./DetailsView.css";
import "./EditRequest.css";

const REJECTABLE_CATEGORIES = [
  {
    category: "Education Section",
    items: [
      { id: "marksheet10", label: "10th Mark Sheet" },
      { id: "marksheet12", label: "12th Mark Sheet" },
      { id: "degreeCertificate", label: "Degree / Diploma Certificate" },
      { id: "school10", label: "10th School Name" },
      { id: "school12", label: "12th School Name" },
      { id: "marks10", label: "10th Marks / Percentage" },
      { id: "marks12", label: "12th Marks / Percentage" },
      { id: "courses", label: "College / Degree Details" },
    ],
  },
  {
    category: "KYC & Identity Section",
    items: [
      { id: "aadhaarFile", label: "Masked Aadhaar Card" },
      { id: "panFile", label: "PAN Card Document" },
      { id: "picture", label: "Profile Photo" },
      { id: "aadhaarNo", label: "Aadhaar Number" },
      { id: "panNo", label: "PAN Number" },
    ],
  },
  {
    category: "Bank Section",
    items: [
      { id: "passbookFile", label: "Bank Passbook Document" },
      { id: "accountNumber", label: "Bank Account Number" },
      { id: "ifscCode", label: "IFSC Code" },
      { id: "bankName", label: "Bank Name" },
      { id: "branch", label: "Branch Name" },
      { id: "accountHolder", label: "Account Holder Name" },
    ],
  },
  {
    category: "Personal & Contact Section",
    items: [
      { id: "phone", label: "Phone Number" },
      { id: "emergencyContact", label: "Emergency Contact" },
      { id: "address", label: "Residential Address" },
      { id: "dob", label: "Date of Birth" },
      { id: "bloodGroup", label: "Blood Group" },
      { id: "gender", label: "Gender" },
    ],
  },
  {
    category: "Family Section",
    items: [
      { id: "fatherName", label: "Father's Name & Occupation" },
      { id: "motherName", label: "Mother's Name & Occupation" },
      { id: "siblings", label: "Siblings Information" },
    ],
  },
  {
    category: "Work Experience Section",
    items: [
      { id: "previousExperiences", label: "Work Experience Documents & Details" },
    ],
  },
];

const ALL_REJECTABLE_ITEMS = REJECTABLE_CATEGORIES.flatMap((c) => c.items);

const getFieldFriendlyName = (fieldId) => {
  const found = ALL_REJECTABLE_ITEMS.find((it) => it.id === fieldId);
  if (found) return found.label;
  const legacyMap = {
    education: "Education Details",
    bank: "Bank Details",
    personal: "Personal Details",
    family: "Family Details",
    working: "Work Experience",
    kyc: "KYC Documents",
    pf: "PF Details",
    basic: "Basic Details",
    marksheet10: "10th Mark Sheet",
    certificate10: "10th Mark Sheet",
    marksheet12: "12th Mark Sheet",
    certificate12: "12th Mark Sheet",
    school10: "10th School Name",
    school12: "12th School Name",
    marks10: "10th Marks / Percentage",
    marks12: "12th Marks / Percentage",
    degreeCertificate: "Degree / Diploma Certificate",
    courses: "College / Degree Details",
    aadhaarFile: "Masked Aadhaar Card",
    panFile: "PAN Card Document",
    picture: "Profile Photo",
    passbookFile: "Bank Passbook Document",
  };
  return legacyMap[fieldId] || fieldId;
};

const getFriendlyFieldNames = (fields) => {
  if (!Array.isArray(fields)) return [];
  const seen = new Set();
  const list = [];
  fields.forEach((f) => {
    let canonical = f;
    if (f === "certificate10") canonical = "marksheet10";
    if (f === "certificate12") canonical = "marksheet12";
    if (!seen.has(canonical)) {
      seen.add(canonical);
      list.push(getFieldFriendlyName(canonical));
    }
  });
  return list;
};

const DetailsView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { empId } = useParams();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestedFields, setRequestedFields] = useState([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [canEditProfile, setCanEditProfile] = useState(false);
  const [allowedFields, setAllowedFields] = useState([]);
  const [showApprovalToast, setShowApprovalToast] = useState(false);

  // ── Admin Profile Review States ──
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [rejectionRemark, setRejectionRemark] = useState("");
  const [selectedRejectedFields, setSelectedRejectedFields] = useState([]);
  const [rejectError, setRejectError] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  // Salary History States
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

  // Progress states
  const [animatedProgress, setAnimatedProgress] = useState(null);
  const [strokeProgress, setStrokeProgress] = useState(0);

  // ── Document View Loading State ──
  const [docLoadingId, setDocLoadingId] = useState(null);
  const [highlightedField, setHighlightedField] = useState(null);

  const handleScrollToRejectedFile = (fieldId) => {
    setHighlightedField(fieldId);

    let target =
      document.getElementById(`doc-card-${fieldId}`) ||
      document.getElementById(`field-item-${fieldId}`) ||
      document.getElementById(`field-wrapper-${fieldId}`);

    if (!target) {
      if (fieldId === "certificate10" || fieldId === "marksheet10") {
        target =
          document.getElementById("doc-card-marksheet10") ||
          document.getElementById("field-item-school10") ||
          document.getElementById("section-education");
      } else if (fieldId === "certificate12" || fieldId === "marksheet12") {
        target =
          document.getElementById("doc-card-marksheet12") ||
          document.getElementById("field-item-school12") ||
          document.getElementById("section-education");
      } else if (fieldId === "degreeCertificate" || fieldId === "courses") {
        target =
          document.getElementById("doc-card-degreeCertificate") ||
          document.getElementById("doc-card-course_0") ||
          document.getElementById("section-courses") ||
          document.getElementById("section-education");
      } else if (
        [
          "school10",
          "school12",
          "marks10",
          "marks12",
          "education",
        ].includes(fieldId)
      ) {
        target =
          document.getElementById(`field-item-${fieldId}`) ||
          document.getElementById("doc-card-marksheet10") ||
          document.getElementById("section-education");
      } else if (
        [
          "passbookFile",
          "accountNumber",
          "ifscCode",
          "bankName",
          "branch",
          "accountHolder",
          "bank",
        ].includes(fieldId)
      ) {
        target =
          document.getElementById("doc-card-passbookFile") ||
          document.getElementById(`field-item-${fieldId}`) ||
          document.getElementById("section-bank");
      } else if (["aadhaarFile", "panFile", "aadhaarNo", "panNo", "kyc"].includes(fieldId)) {
        target =
          document.getElementById(`doc-card-${fieldId}`) ||
          document.getElementById(`field-item-${fieldId}`) ||
          document.getElementById("doc-card-aadhaarFile") ||
          document.getElementById("doc-card-panFile") ||
          document.getElementById("section-documents") ||
          document.getElementById("section-bank");
      } else if (fieldId === "picture") {
        target =
          document.getElementById("doc-card-picture") ||
          document.querySelector(".detailsview-avatar-wrap") ||
          document.querySelector(".detailsview-header-avatar");
      } else if (["phone", "emergencyContact", "address", "dob", "bloodGroup", "gender", "personal"].includes(fieldId)) {
        target =
          document.getElementById(`field-item-${fieldId}`) ||
          document.getElementById("section-personal");
      } else if (["fatherName", "motherName", "siblings", "family"].includes(fieldId)) {
        target =
          document.getElementById(`field-item-${fieldId}`) ||
          document.getElementById("section-family") ||
          document.getElementById("section-siblings");
      } else if (["previousExperiences", "working"].includes(fieldId)) {
        target =
          document.getElementById("section-previousExperiences") ||
          document.getElementById("section-working");
      }
    }

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.remove("rejected-file-highlight-pulse");
      void target.offsetWidth; // force DOM reflow
      target.classList.add("rejected-file-highlight-pulse");
      setTimeout(() => {
        target.classList.remove("rejected-file-highlight-pulse");
      }, 5000);
    }
  };

  const isAdminView = useMemo(
    () => location.pathname.startsWith("/admin"),
    [location.pathname]
  );
  const isEmployeeView = useMemo(
    () => location.pathname.startsWith("/emp"),
    [location.pathname]
  );

  // ── Dynamically prepared uploaded documents list ──
  const uploadedDocuments = useMemo(() => {
    if (!employee) return [];
    const list = [];

    // 1. 10th Marksheet
    const has10 = Boolean(employee.marksheet10 || employee.marksheet10Url);
    list.push({
      id: "marksheet10",
      label: "10th Marksheet",
      field: "marksheet10",
      key: employee.marksheet10 || null,
      url: employee.marksheet10Url || null,
      isUploaded: has10,
      iconType: "education",
    });

    // 2. 12th Marksheet
    const has12 = Boolean(employee.marksheet12 || employee.marksheet12Url);
    const is12thRelevant = employee.educationPath === "12th" || has12 || employee.school12 || employee.marks12;
    if (is12thRelevant) {
      list.push({
        id: "marksheet12",
        label: "12th Marksheet",
        field: "marksheet12",
        key: employee.marksheet12 || null,
        url: employee.marksheet12Url || null,
        isUploaded: has12,
        iconType: "education",
      });
    }

    // 3. Courses / Degree Certificates
    if (Array.isArray(employee.courses) && employee.courses.length > 0) {
      employee.courses.forEach((course, idx) => {
        const hasCert = Boolean(course.certificate || course.certificateUrl);
        const cType = course.courseType || "College";
        const cName = course.courseName ? ` - ${course.courseName}` : (course.collegeName ? ` (${course.collegeName})` : "");
        list.push({
          id: `course_${idx}`,
          label: `${cType} Certificate${cName}`,
          field: `courses.${idx}.certificate`,
          key: course.certificate || null,
          url: course.certificateUrl || null,
          isUploaded: hasCert,
          iconType: "college",
        });
      });
    }

    // Degree Certificate fallback if present outside courses array
    if (employee.degreeCertificate || employee.degreeCertificateUrl) {
      list.push({
        id: "degreeCertificate",
        label: "Degree Certificate",
        field: "degreeCertificate",
        key: employee.degreeCertificate || null,
        url: employee.degreeCertificateUrl || null,
        isUploaded: true,
        iconType: "college",
      });
    }
    if (employee.ugDegreeCertificate || employee.ugDegreeCertificateUrl) {
      list.push({
        id: "ugDegreeCertificate",
        label: "UG Degree Certificate",
        field: "ugDegreeCertificate",
        key: employee.ugDegreeCertificate || null,
        url: employee.ugDegreeCertificateUrl || null,
        isUploaded: true,
        iconType: "college",
      });
    }
    if (employee.pgDegreeCertificate || employee.pgDegreeCertificateUrl) {
      list.push({
        id: "pgDegreeCertificate",
        label: "PG Degree Certificate",
        field: "pgDegreeCertificate",
        key: employee.pgDegreeCertificate || null,
        url: employee.pgDegreeCertificateUrl || null,
        isUploaded: true,
        iconType: "college",
      });
    }

    // 4. Aadhaar Document
    const hasAadhaar = Boolean(employee.aadhaarFile || employee.aadhaarFileUrl);
    list.push({
      id: "aadhaarFile",
      label: "Aadhaar Card Document",
      field: "aadhaarFile",
      key: employee.aadhaarFile || null,
      url: employee.aadhaarFileUrl || null,
      isUploaded: hasAadhaar,
      iconType: "kyc",
    });

    // 5. PAN Document
    const hasPan = Boolean(employee.panFile || employee.panFileUrl);
    list.push({
      id: "panFile",
      label: "PAN Card Document",
      field: "panFile",
      key: employee.panFile || null,
      url: employee.panFileUrl || null,
      isUploaded: hasPan,
      iconType: "kyc",
    });

    // 6. Bank Passbook Document
    const hasPassbook = Boolean(employee.passbookFile || employee.passbookFileUrl);
    list.push({
      id: "passbookFile",
      label: "Bank Passbook Document",
      field: "passbookFile",
      key: employee.passbookFile || null,
      url: employee.passbookFileUrl || null,
      isUploaded: hasPassbook,
      iconType: "bank",
    });

    return list;
  }, [employee]);

  /* ════════════════════════════════════════════════════════════
     EDIT SECTIONS — Dynamic based on DB status
  ════════════════════════════════════════════════════════════ */
  const EDIT_SECTIONS = useMemo(() => {
    const sections = {
      personal: {
        label: "Personal Details",
        fields: ["phone", "address", "emergencyContact"],
      },
      family: {
        label: "Family Details",
        fields: ["fatherName", "motherName", "siblings"],
      },
      education: {
        label: "Education & Courses",
        fields: ["school10", "marks10", "school12", "marks12", "courses"],
      },
      kyc: {
        label: "KYC Details",
        fields: ["aadhaarNo", "panNo"],
      },
      documents: {
        label: "Documents Upload",
        subLabel: "Profile Photo · Aadhaar Card · PAN Card · 10th Marksheet · 12th Marksheet · Degree Certificates",
        fields: ["picture", "aadhaarFile", "panFile", "marksheet10", "marksheet12", "courses"],
      },
    };

    // 🏦 Conditional Bank Details:
    // Show in Request Modal ONLY if it's missing from DB (First-time addition)
    const hasBankInDB = !!(employee?.bankHistory?.length > 0);

    if (!hasBankInDB) {
      sections.bank = {
        label: "Bank Details",
        fields: ["bankName", "accountHolder", "accountNumber", "ifscCode"],
      };

      // Add passbook to documents if bank info is missing
      if (sections.documents) {
        sections.documents.fields.push("passbookFile");
        sections.documents.subLabel += " · Bank Passbook";
      }
    }

    return sections;
  }, [employee]);

  /* ════════════════════════════════════════════════════════════
     FETCH EMPLOYEE DATA
  ════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      setError("");
      try {
        let url;
        if (isAdminView && empId) {
          url = `/users/employee/${empId}`;
        } else if (isEmployeeView) {
          url = `/users/get-details`;
        } else {
          setError("Invalid access route");
          setLoading(false);
          return;
        }

        const res = await portalInstance.get(url);
        const data = res.data?.data;

        if (!data) {
          setEmployee(null);
          setIsNewUser(false);
        } else {
          setEmployee(data);
          setIsNewUser(false);
        }
      } catch (err) {
        console.error("Details fetch error:", err);
        setError(
          err.response?.data?.message || "Failed to fetch employee details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
  }, [empId, isAdminView, isEmployeeView]);

  /* ════════════════════════════════════════════════════════════
     FETCH SALARY HISTORY
  ════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const fetchSalary = async () => {
      //  FIX: Prioritize empIdString for employees to match security check
      const idToUse = isAdminView ? empId : employee?.empIdString;
      if (!idToUse) return;

      setSalaryLoading(true);
      try {
        const res = await portalInstance.get(`/users/employee/salary/${idToUse}`);
        setSalaryHistory(res.data.data || []);
      } catch (err) {
        console.error("Salary fetch error:", err);
      } finally {
        setSalaryLoading(false);
      }
    };

    if (employee) {
      fetchSalary();
    }
  }, [employee, isAdminView, empId]);

  /* ════════════════════════════════════════════════════════════
     PERMISSION CHECK — on mount
  ════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isEmployeeView) return;
    checkEditPermission();
  }, [isEmployeeView]);

  /* ════════════════════════════════════════════════════════════
     PERMISSION CHECK — when returning from edit page
  ════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!isEmployeeView) return;
    if (location.state?.cameFromEdit === true) {
      checkEditPermission();
      window.history.replaceState({}, "", location.pathname);
    }
  }, [location.state, isEmployeeView]);

  const checkEditPermission = async () => {
    try {
      const res = await portalInstance.get("/profile/info/can-edit");
      // console.log("API RESPONSE:", res.data);
      const {
        canEdit,
        allowedFields = [],
        hasPendingRequest,
        wasRejected,
        message,
      } = res.data;

      const prevCanEdit = canEditProfile;

      // Always update base states
      setCanEditProfile(!!canEdit);
      setAllowedFields(allowedFields);

      // 🔴 IMPORTANT: Decide requestStatus PROPERLY

      // ✅ FIRST TIME USER (canEdit = true but NOT approved)
      if (canEdit && message === "First-time profile setup") {
        setRequestStatus(null);
        setStatusMessage("");
        return;
      }

      // ✅ APPROVED → only when real approval message
      if (canEdit) {
        setRequestStatus("approved");
        setStatusMessage(message);

        // show toast only when it becomes approved newly
        if (!prevCanEdit) {
          setShowApprovalToast(true);
          setTimeout(() => setShowApprovalToast(false), 5000);
        }
        return;
      }

      // ✅ PENDING
      if (hasPendingRequest) {
        setRequestStatus("pending");
        setStatusMessage(message || "Request pending");
        return;
      }

      // ✅ REJECTED / USED
      // ✅ HANDLE USED (IMPORTANT FIX)
      if (message === "Request already used") {
        setRequestStatus(null);
        setStatusMessage("");
        setShowStatusModal(false);
        return;
      }

      // ✅ REJECTED ONLY REAL REJECTION
      if (wasRejected) {
        setRequestStatus("rejected");
        setStatusMessage(message || "Request rejected");

        if (!showStatusModal) {
          setShowStatusModal(true);
        }
        return;
      }

      // ✅ DEFAULT → LOCKED
      setRequestStatus(null);
      setStatusMessage("");

    } catch (err) {
      console.error("Check edit permission error:", err);
    }
  };

  /* ════════════════════════════════════════════════════════════
     PROGRESS ANIMATION
  ════════════════════════════════════════════════════════════ */
  const progress = Math.min(employee?.profileCompletion || 0, 100);
  const RECT_SIZE = 96;
  const PERIMETER = 4 * RECT_SIZE;

  const progressColor = useMemo(() => {
    if (progress >= 80) return "#1DDC69";
    if (progress >= 40) return "#1D59DC";
    return "#FF7E33";
  }, [progress]);

  useEffect(() => {
    if (!employee || progress == null) return;
    setAnimatedProgress(progress);
    setStrokeProgress(0);
  }, [employee, progress]);

  useEffect(() => {
    if (strokeProgress >= progress) return;
    const duration = Math.max(600, progress * 12);
    const startTime = performance.now();
    const animate = (time) => {
      const elapsed = time - startTime;
      const ratio = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setStrokeProgress(Math.round(progress * eased));
      if (ratio < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [progress, employee]);

  /* ════════════════════════════════════════════════════════════
     HANDLERS
  ════════════════════════════════════════════════════════════ */
  const scrollToBottomActions = () => {
    const footerActions =
      document.getElementById("detailsview-admin-actions") ||
      document.querySelector(".detailsview-footer");
    if (footerActions) {
      footerActions.scrollIntoView({ behavior: "smooth", block: "center" });
      footerActions.classList.add("highlight-footer-pulse");
      setTimeout(() => {
        footerActions.classList.remove("highlight-footer-pulse");
      }, 2500);
    }
  };

  const toggleRejectedField = (fieldId) => {
    setSelectedRejectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleApproveProfile = async () => {
    try {
      setReviewLoading(true);
      const targetId = empId || employee?.empIdString || employee?.empId || employee?._id;
      const res = await portalInstance.put(`/users/admin/review-profile/${targetId}`, {
        action: "approve",
      });
      if (res.data?.success) {
        setEmployee((prev) => ({
          ...prev,
          profileApprovalStatus: "approved",
          isProfileCompleted: true,
          rejectionRemark: "",
          rejectedFields: [],
        }));
        setShowApproveModal(false);
        setToastMsg("Employee profile approved successfully!");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch (err) {
      console.error("Approve profile error:", err);
      alert(err.response?.data?.message || "Failed to approve profile");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleRejectProfile = async () => {
    if (!rejectionRemark.trim()) {
      setRejectError(true);
      return;
    }
    setRejectError(false);
    try {
      setReviewLoading(true);
      const targetId = empId || employee?.empIdString || employee?.empId || employee?._id;
      const sanitizedFields = Array.from(new Set(selectedRejectedFields.map((f) => {
        if (f === "certificate10") return "marksheet10";
        if (f === "certificate12") return "marksheet12";
        return f;
      })));

      const res = await portalInstance.put(`/users/admin/review-profile/${targetId}`, {
        action: "reject",
        remark: rejectionRemark.trim(),
        rejectedFields: sanitizedFields,
      });
      if (res.data?.success) {
        setEmployee((prev) => ({
          ...prev,
          profileApprovalStatus: "rejected",
          isProfileCompleted: false,
          rejectionRemark: rejectionRemark.trim(),
          rejectedFields: sanitizedFields,
        }));
        setShowRejectModal(false);
        setToastMsg("Employee profile rejected. Rejection remark has been sent to the employee.");
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    } catch (err) {
      console.error("Reject profile error:", err);
      alert(err.response?.data?.message || "Failed to reject profile");
    } finally {
      setReviewLoading(false);
    }
  };

  const toggleSection = (fields) => {
    setRequestedFields((prev) =>
      fields.every((f) => prev.includes(f))
        ? prev.filter((f) => !fields.includes(f))
        : [...new Set([...prev, ...fields])]
    );
  };

  const handleSendRequest = async () => {
    if (!requestMessage.trim()) {
      alert("Please enter a request message");
      return;
    }
    if (requestedFields.length === 0) {
      alert("Please select at least one section to edit");
      return;
    }
    try {
      setRequestLoading(true);
      await portalInstance.post("/profile/employee/request-edit", {
        requestMessage: requestMessage.trim(),
        requestedFields,
      });
      setShowRequestModal(false);
      setRequestMessage("");
      setRequestedFields([]);
      setRequestStatus("pending");
      setStatusMessage("Your edit request has been sent to admin!");
      setShowStatusModal(true);
    } catch (err) {
      console.error("Send request error:", err);
      alert(err.response?.data?.message || "Failed to send request");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleEdit = () => {
    if (isAdminView) {
      navigate(`/admin/employees/${empId}/edit`);
      return;
    }
    if (requestStatus === "pending") {
      setStatusMessage(
        "Your request is still pending. Please wait for admin approval."
      );
      setShowStatusModal(true);
      return;
    }
    if (requestStatus === "rejected") {
      setShowRequestModal(true);
      return;
    }
    if (requestStatus === "approved") {
      sessionStorage.setItem("allowedEditFields", JSON.stringify(allowedFields));
      navigate("/emp/my-details/edit", { state: { cameFromEdit: false } });
      return;
    }
    // ✅ NEW EMPLOYEE: profile not yet completed → allow free edit without request
    if (!employee?.isProfileCompleted || (employee?.profileCompletion ?? 0) < 100) {
      navigate("/emp/my-details/edit");
      return;
    }
    setShowRequestModal(true);
  };

  /* ════════════════════════════════════════════════════════════
     HELPERS
  ════════════════════════════════════════════════════════════ */
  // ✅ S3: Use signed URL returned by backend (employee.photoUrl)
  const getPhotoUrl = () => {
    if (employee?.pictureUrl) return employee.pictureUrl;
    return "/avatar.png";
  };

  const getStatusClass = (status) => {
    if (!status) return "working";
    return status.toLowerCase().trim().replace(/\s+/g, "-").replace(/_/g, "-");
  };

  const formatStatusDisplay = (status) =>
    status
      ? status
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
      : "Working";

  const getHeaderBgClass = (status) => {
    if (!status) return "";
    const s = status.toLowerCase().trim();
    if (s.includes("full") && s.includes("time")) return "full-time";
    if (s.includes("part") && (s.includes("time") || s.includes("_") || s.includes("-"))) return "part-time";
    if (s === "parttime" || s === "part_time" || s === "part-time") return "part-time";
    if (s === "intern" || s === "internship") return "intern";
    if (s === "relived" || s === "relieved") return "relived";
    if (s === "active") return "active";
    if (s.includes("hold")) return "on-hold";
    return "";
  };

  /* ════════════════════════════════════════════════════════════
     RENDER GUARDS
  ════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="dashboard-page">
        <Sidebar />
        <div
          className="detailsview-page d-flex justify-content-center align-items-center"
          style={{ minHeight: "80vh" }}
        >
          <Spinner animation="border" variant="primary" />
        </div>
      </div>
    );
  }

  if (!employee && isEmployeeView) {
    return (
      <div className="dashboard-page">
        <Sidebar />
        <div
          className="detailsview-page d-flex flex-column justify-content-center align-items-center"
          style={{ minHeight: "80vh", textAlign: "center" }}
        >
          <div className="text-center mb-5">
            <h3 style={{ color: "#1f2a44", fontWeight: "600" }}>Welcome!</h3>
            <p
              className="text-muted mt-3"
              style={{ fontSize: "16px", maxWidth: "500px" }}
            >
              Please fill in your details to complete your profile and get
              started.
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => navigate("/emp/my-details/edit")}
            style={{ padding: "12px 32px", fontSize: "16px" }}
          >
            Fill Details
          </Button>
        </div>
      </div>
    );
  }

  if (error || (!employee && !isNewUser)) {
    return (
      <div className="dashboard-page">
        <Sidebar />
        <div
          className="detailsview-page d-flex flex-column align-items-center justify-content-center"
          style={{ minHeight: "70vh" }}
        >
          <p className="text-danger mb-4">{error || "Employee not found"}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  //  Extra safety masking (frontend fallback)
  const maskAadhaar = (val) => {
    if (!val) return "-";
    if (val.includes("XXXX")) return val; // already masked
    return val.replace(/\d(?=\d{4})/g, "X");
  };

  const maskPAN = (val) => {
    if (!val) return "-";
    if (val.includes("X")) return val; // already masked
    return val.replace(/^([A-Z]{5})[0-9]{4}([A-Z])$/, "XXXXX1234$2");
  };

  // ✅ Mask phone: show only last 4 digits e.g. ******1234
  const maskPhone = (val) => {
    if (!val) return "-";
    const str = String(val).replace(/\D/g, "");
    if (str.length < 4) return "****";
    return str.slice(0, -4).replace(/./g, "*") + str.slice(-4);
  };

  // ✅ Mask email: show first 2 chars + domain e.g. sa*****@gmail.com
  const maskEmail = (val) => {
    if (!val) return "-";
    const [user, domain] = val.split("@");
    if (!domain) return val;
    const visible = user.slice(0, 2);
    const masked = "*".repeat(Math.max(3, user.length - 2));
    return `${visible}${masked}@${domain}`;
  };

  // ✅ Mask emergency contact same way as phone
  const maskEmergencyContact = (val) => {
    if (!val) return "-";
    const str = String(val).replace(/\D/g, "");
    if (str.length < 4) return "****";
    return str.slice(0, -4).replace(/./g, "*") + str.slice(-4);
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return "₹0";
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // ── Handle Document View with 3-Minute Expiry S3 Presigned URL ──
  const handleViewDocument = async (doc) => {
    if (!doc || !doc.isUploaded) return;

    try {
      setDocLoadingId(doc.id);

      const payload = {
        key: doc.key || undefined,
        field: doc.field || undefined,
        empId: employee?.empIdString || employee?.empId || employee?._id,
      };

      const res = await portalInstance.post("/users/document-view-url", payload);

      if (res.data?.success && res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      } else if (doc.url) {
        // Fallback to pre-attached signed URL
        window.open(doc.url, "_blank", "noopener,noreferrer");
      } else {
        alert("Unable to open document. The file might not be available.");
      }
    } catch (err) {
      console.error("Error viewing document:", err);
      if (doc.url) {
        window.open(doc.url, "_blank", "noopener,noreferrer");
      } else {
        alert("Failed to load document view URL. Please try again.");
      }
    } finally {
      setDocLoadingId(null);
    }
  };

  /* ════════════════════════════════════════════════════════════
     MAIN RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="dashboard-page">
      <Sidebar />
      <div className="detailsview-page">

        {/* ── Approval Toast ── */}
        {isEmployeeView && showApprovalToast && (
          <div className="approval-toast">
            <div className="toast-content">
              <FaCheckCircle className="toast-icon" />
              <div className="toast-text">
                <strong>Upate Your Profile!</strong>
                {/* <p>{statusMessage}</p> */}
                <small>Click "Edit now" to update your details</small>
              </div>
            </div>
          </div>
        )}

        {/* ── Profile Header ── */}
        <div className={`detailsview-header ${getHeaderBgClass(employee.status)}`}>
          <div className="avatar-wrapper">
            <svg className="progress-border" viewBox="0 0 100 100">
              <rect
                x="2"
                y="2"
                width="96"
                height="96"
                rx="9"
                ry="9"
                style={{
                  stroke: progressColor,
                  strokeWidth: 4,
                  fill: "none",
                  strokeDasharray:
                    strokeProgress === 100
                      ? `${PERIMETER} ${PERIMETER}`
                      : `${(strokeProgress / 100) * PERIMETER} ${PERIMETER}`,
                  strokeDashoffset: 0,
                  transition: "stroke 0.3s ease",
                }}
              />
            </svg>

            {/* ✅ S3 signed URL photo */}
            <img
              src={getPhotoUrl()}
              alt="Employee"
              className="detailsview-avatar"
              onError={(e) => (e.target.src = "/avatar.png")}
            />

            <div
              className={`profile-completion-badge ${animatedProgress >= 80
                ? "high"
                : animatedProgress >= 40
                  ? "medium"
                  : "low"
                }`}
            >
              {animatedProgress !== null ? animatedProgress : 0}%
            </div>
          </div>

          <div className="header-info">
            <h2>{employee.name}</h2>
            <p>{employee.designation}</p>
            <span className={`status-badge ${getStatusClass(employee.status)}`}>
              {formatStatusDisplay(employee.status)}
            </span>
          </div>
        </div>

        {/* ── Details Sections ── */}
        <div className="detailsview-wrapper">

          {/* ── Review Toast Alert ── */}
          {showToast && (
            <div className="profile-review-toast-alert animate-in mb-3">
              <FaCheckCircle className="me-2" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* ── Admin Review Banners ── */}
          {isAdminView && (employee.profileApprovalStatus === "pending" || (!employee.profileApprovalStatus && employee.profileCompletion >= 100 && !employee.isProfileCompleted)) && (
            <div className="admin-review-banner pending animate-in mb-4">
              <div className="admin-review-content">
                <div className="admin-review-badge pending">
                  <FaClock className="me-1" /> Profile Ready for Review & Approval
                </div>
                <h4 className="admin-review-title">
                  Employee Profile Completed 100%
                </h4>
                <p className="admin-review-desc mb-0">
                  {employee.name} ({employee.empIdString || employee.empId || ""}) has submitted all required documents for review and approval.
                </p>
              </div>
              <div className="admin-review-actions">
                <button
                  type="button"
                  className="admin-scroll-down-btn"
                  onClick={scrollToBottomActions}
                  title="Scroll down to Approve & Reject"
                >
                  <FaArrowDown className="admin-scroll-arrow-icon" />
                </button>
              </div>
            </div>
          )}

          {isAdminView && employee.profileApprovalStatus === "rejected" && (
            <div className="admin-review-banner rejected animate-in mb-4">
              <div className="admin-review-content">
                <div className="admin-review-badge rejected">
                  Profile Currently Rejected
                </div>
                <h4 className="admin-review-title">
                  Rejection Remark Given to Employee
                </h4>
                <p className="admin-review-desc mb-2">
                  <strong>Reason:</strong> "{employee.rejectionRemark}"
                </p>
                {employee.rejectedFields && employee.rejectedFields.length > 0 && (
                  <div className="admin-review-items mb-0">
                    <strong>Requested Corrections:</strong>{" "}
                    {getFriendlyFieldNames(employee.rejectedFields).join(", ")}
                  </div>
                )}
              </div>
              <div className="admin-review-actions">
                <Button
                  variant="outline-danger"
                  className="common-modal-btn btn-update me-2"
                  onClick={() => {
                    setRejectionRemark(employee.rejectionRemark || "");
                    setSelectedRejectedFields(employee.rejectedFields || []);
                    setShowRejectModal(true);
                  }}
                >
                  Update Remark
                </Button>
                <Button
                  variant="success"
                  className="common-modal-btn btn-approve"
                  style={{ backgroundColor: "#16a34a", color: "#ffffff", borderColor: "#16a34a" }}
                  onClick={() => setShowApproveModal(true)}
                >
                  Approve Profile
                </Button>
              </div>
            </div>
          )}

          {isAdminView && employee.profileApprovalStatus === "approved" && (
            <div className="admin-review-banner approved animate-in">
              <div className="admin-review-badge approved">
                <FaCheckCircle className="me-1" /> Profile Verified & Approved by Admin
              </div>
            </div>
          )}

          {/* ── Employee Review Banners ── */}
          {isEmployeeView && employee.profileApprovalStatus === "rejected" && (
            <div className="employee-review-alert rejected animate-in mb-4">
              <div className="employee-review-alert-content">
                <h4 className="employee-review-alert-title">
                  Profile Verification Action Required
                </h4>
                <div className="employee-review-alert-remark">
                  <strong>Admin Rejection Remark:</strong> "{employee.rejectionRemark}"
                </div>
                {employee.rejectedFields && employee.rejectedFields.length > 0 && (
                  <div className="employee-review-alert-corrections mt-2">
                    <strong>Document(s) Needing Correction:</strong>
                    <div className="rejected-items-action-list mt-2">
                      {employee.rejectedFields.map((f, i) => (
                        <div key={i} className="rejected-item-action-pill">
                          <span className="rejected-item-name">{getFieldFriendlyName(f)}</span>
                          {/* <button
                            type="button"
                            className="btn-view-rejected-file"
                            onClick={() => handleScrollToRejectedFile(f)}
                            title={`Scroll to and inspect ${getFieldFriendlyName(f)}`}
                          >
                            <FaEye className="me-1" /> View File
                          </button> */}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="employee-review-alert-hint mt-2 mb-0">
                  Please update or re-upload only the required document/field and resubmit your profile for Admin review.
                </p>
              </div>
              <div className="employee-review-alert-action">
                {/* <Button
                  variant="danger"
                  className="btn-employee-resubmit-cta"
                  onClick={() => navigate("/emp/my-details/edit")}
                >
                  Update & Resubmit Profile
                </Button> */}
              </div>
            </div>
          )}

          {isEmployeeView && employee.profileApprovalStatus === "pending" && (
            <div className="employee-review-alert pending animate-in mb-4">
              <div className="employee-review-alert-icon pending">
                <FaClock />
              </div>
              <div className="employee-review-alert-content">
                <h4 className="employee-review-alert-title">
                  Profile Submitted for Admin Review
                </h4>
                <p className="employee-review-alert-desc mb-0">
                  Your profile has been completed to 100% and submitted to the Admin for review and approval. You will receive a notification once the Admin has reviewed your details and uploaded documents.
                </p>
              </div>
            </div>
          )}

          {isEmployeeView && employee.profileApprovalStatus === "approved" && (
            <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", marginBottom: "8px" }}>
              <div className="employee-review-alert approved animate-in">
                <FaCheckCircle className="me-2 text-success" />
                <span>Your profile has been verified and approved by the Admin.</span>
              </div>
            </div>
          )}

          <Section id="section-personal" title="Personal Details">
            <Grid>
              <Item label="Employee ID" value={employee.empIdString} />
              <Item label="Name" value={employee.name} />
              <Item label="Email" value={employee.email} />
              <Item
                label="Status"
                value={employee.status === "full_time" ? "Full-time" : "Intern"}
              />
              <Item id="field-item-gender" label="Gender" value={employee.gender} />
              <Item id="field-item-phone" label="Phone" value={employee.phone} />
              <Item id="field-item-emergencyContact" label="Emergency Contact" value={employee.emergencyContact} />
              <Item id="field-item-bloodGroup" label="Blood Group" value={employee.bloodGroup} />
              <Item id="field-item-address" label="Address" value={employee.address} full />
            </Grid>
          </Section>

          <Section id="section-family" title="Family Details">
            <Grid>
              <Item id="field-item-fatherName" label="Father Name" value={employee.fatherName} />
              <Item label="Father Occupation" value={employee.fatherOccupation} />
              <Item id="field-item-motherName" label="Mother Name" value={employee.motherName} />
              <Item label="Mother Occupation" value={employee.motherOccupation} />
            </Grid>
          </Section>

          <Section id="section-siblings" title="Siblings">
            {employee.siblings?.length > 0 ? (
              employee.siblings.map((sib, i) => (
                <Grid key={i}>
                  <Item label="Relationship" value={sib.relationship} />
                  <Item label="Name" value={sib.name} />
                  <Item label="Occupation" value={sib.occupation} />
                </Grid>
              ))
            ) : (
              <p>No siblings added</p>
            )}
          </Section>

          <Section id="section-working" title="Work Details">
            <Grid>
              <Item label="Department" value={employee.department} />
              <Item label="Designation" value={employee.designation} />
              <Item
                label="Employment Type"
                value={employee.status === "full_time" ? "Full-time" : "Intern"}
              />
              <Item label="Experience" value={employee.experience} />
              {salaryHistory && salaryHistory.length > 0 && (
                <Item
                  label="Salary"
                  value={(() => {
                    const activeSalary =
                      salaryHistory.find((s) => !s.toDate || new Date(s.toDate) >= new Date()) ||
                      [...salaryHistory].sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate))[0];
                    const amount =
                      activeSalary?.totalSalary ??
                      (activeSalary ? Number(activeSalary.basicSalary || 0) + (activeSalary.allowances || []).reduce((sum, a) => sum + Number(a.value || a.amount || 0), 0) : null);
                    return amount !== null && amount !== undefined ? formatCurrency(amount) : "-";
                  })()}
                />
              )}
            </Grid>
          </Section>

          <Section id="section-previousExperiences" title="Previous Experience">
            {employee.previousExperiences?.length > 0 ? (
              employee.previousExperiences.map((exp, i) => (
                <Grid key={i}>
                  <Item label="Company" value={exp.previousCompany} />
                  <Item label="Designation" value={exp.designation} />
                  <Item label="Department" value={exp.department} />
                  <Item
                    label="Joining Date"
                    value={
                      exp.dateOfJoining
                        ? new Date(exp.dateOfJoining).toLocaleDateString()
                        : "-"
                    }
                  />
                  <Item
                    label="Last Working Date"
                    value={
                      exp.lastWorkingDate
                        ? new Date(exp.lastWorkingDate).toLocaleDateString()
                        : "-"
                    }
                  />
                  <Item label="Previous Salary" value={exp.previousSalary} />
                </Grid>
              ))
            ) : (
              <p>No previous experience</p>
            )}
          </Section>

          <Section id="section-education" title="Education">
            <Grid>
              <Item id="field-item-school10" label="10th School" value={employee.school10} />
              <Item id="field-item-marks10" label="10th Marks" value={employee.marks10} />
              <Item id="field-item-passedOutYear10" label="10th Passed-Out Year" value={employee.passedOutYear10} />
              {employee.educationPath !== "Diploma" && (
                <>
                  <Item id="field-item-school12" label="12th School" value={employee.school12} />
                  <Item id="field-item-marks12" label="12th Marks" value={employee.marks12} />
                  <Item id="field-item-passedOutYear12" label="12th Passed-Out Year" value={employee.passedOutYear12} />
                </>
              )}
            </Grid>

            {/* ── Career Gap Details for Admin Review ── */}
            {(() => {
              const gap1012 = (employee.careerGaps || []).find(
                (g) => g && g.educationStage === "10th to 12th Standard" && Number(g.gapDuration) > 0 && g.reason
              );
              if (!gap1012) return null;
              return (
                <div className="career-gap-review-card">
                  <div className="career-gap-review-header">
                    <div className="career-gap-review-title-badge">
                      <span>Career Gap Information ({gap1012.educationStage})</span>
                    </div>
                  </div>
                  <div className="career-gap-review-grid">
                    <div className="career-gap-review-col">
                      <span className="career-gap-col-label">Education Stage</span>
                      <span className="career-gap-col-val">{gap1012.educationStage}</span>
                    </div>
                    <div className="career-gap-review-col">
                      <span className="career-gap-col-label">10th Passed-Out Year</span>
                      <span className="career-gap-col-val">{gap1012.passedOutYear10 || employee.passedOutYear10 || "-"}</span>
                    </div>
                    <div className="career-gap-review-col">
                      <span className="career-gap-col-label">Expected 12th Year</span>
                      <span className="career-gap-col-val">{gap1012.expectedYear12 || "-"}</span>
                    </div>
                    <div className="career-gap-review-col">
                      <span className="career-gap-col-label">Actual 12th Year</span>
                      <span className="career-gap-col-val">{gap1012.actualYear12 || employee.passedOutYear12 || "-"}</span>
                    </div>
                    <div className="career-gap-review-col">
                      <span className="career-gap-col-label">Career Gap Duration</span>
                      <span className="career-gap-duration-pill">
                        {gap1012.gapDuration} {gap1012.gapDuration === 1 ? "Year" : "Years"}
                      </span>
                    </div>
                  </div>
                  <div className="career-gap-review-reason-box">
                    <span className="career-gap-col-label">Reason for Career Gap</span>
                    <p className="career-gap-reason-text">{gap1012.reason}</p>
                  </div>
                </div>
              );
            })()}
          </Section>

          <Section id="section-courses" title="Courses">
            {employee.courses?.length > 0 ? (
              employee.courses.map((course, i) => (
                <Grid key={i}>
                  <Item label="Course Type" value={course.courseType} />
                  <Item label="Course Name" value={course.courseName} />
                  <Item label="College" value={course.collegeName} />
                  <Item label="CGPA" value={course.cgpa} />
                  <Item
                    label="Year Passed Out"
                    value={course.passedOutYear}
                    className="year-passed-out-item"
                  />
                </Grid>
              ))
            ) : (
              <p>No courses added</p>
            )}
          </Section>

          <Section id="section-bank" title="KYC & Bank Details">
            <Grid>
              <Item id="field-item-aadhaarNo" label="Aadhaar No" value={maskAadhaar(employee.aadhaarNo)} />
              <Item id="field-item-panNo" label="PAN No" value={maskPAN(employee.panNo)} />
              <Item label="PF No" value={employee.pfNo} />
              {(() => {
                // Read bank details from the latest active bankHistory entry
                const sortedBank = (employee.bankHistory || [])
                  .slice()
                  .sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));
                const latestBank =
                  sortedBank.find((b) => !b.toDate) || sortedBank[0];
                return (
                  <>
                    <Item id="field-item-bankName" label="Bank Name" value={latestBank?.bankName} />
                    <Item id="field-item-accountHolder" label="Account Holder" value={latestBank?.accountHolder} />
                    <Item id="field-item-accountNumber" label="Account Number" value={latestBank?.accountNumber} />
                    <Item id="field-item-ifscCode" label="IFSC Code" value={latestBank?.ifscCode} />
                    <Item id="field-item-branch" label="Branch" value={latestBank?.branch} />
                  </>
                );
              })()}
            </Grid>
          </Section>

          {/* ── Uploaded Documents Section ── */}
          <Section id="section-documents" title="Upload Document">
            <div className="doc-view-grid">
              {uploadedDocuments.map((doc) => {
                const isDocRejected = employee?.profileApprovalStatus === "rejected" &&
                  (employee?.rejectedFields?.includes(doc.id) ||
                    employee?.rejectedFields?.includes(doc.field) ||
                    (doc.id === "marksheet10" && employee?.rejectedFields?.includes("certificate10")) ||
                    (doc.id === "marksheet12" && employee?.rejectedFields?.includes("certificate12")) ||
                    ((doc.id === "degreeCertificate" || doc.id.startsWith("course_")) &&
                      (employee?.rejectedFields?.includes("degreeCertificate") || employee?.rejectedFields?.includes("courses"))));

                const isTargetHighlighted = highlightedField === doc.id ||
                  (doc.field && highlightedField === doc.field) ||
                  (doc.id === "marksheet10" && highlightedField === "certificate10") ||
                  (doc.id === "marksheet12" && highlightedField === "certificate12") ||
                  (doc.id === "degreeCertificate" && (highlightedField === "courses" || highlightedField === "degreeCertificate")) ||
                  (doc.id.startsWith("course_") && highlightedField === "courses");

                return (
                  <div
                    key={doc.id}
                    id={`doc-card-${doc.id}`}
                    className={`doc-view-card ${doc.isUploaded ? "has-doc" : "no-doc"} ${isDocRejected ? "rejected-correction-card" : ""} ${isTargetHighlighted ? "rejected-file-highlight-pulse" : ""}`}
                  >
                    <div className="doc-view-card-left">
                      <div className={`doc-icon-badge ${doc.iconType} ${isDocRejected ? "rejected-badge" : ""}`}>
                        <FaFileAlt />
                      </div>
                      <div className="doc-view-details">
                        <span className="doc-view-title">{doc.label}</span>
                        <span className={`doc-status-tag ${isDocRejected ? "rejected" : (doc.isUploaded ? "uploaded" : "missing")}`}>
                          {isDocRejected ? (
                            <>
                              <FaTimesCircle className="status-mini-icon" /> Correction Required
                            </>
                          ) : doc.isUploaded ? (
                            <>
                              <FaCheckCircle className="status-mini-icon" /> Uploaded
                            </>
                          ) : (
                            <>
                              <FaTimesCircle className="status-mini-icon" /> Not Uploaded
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="doc-view-card-right">
                      {doc.isUploaded ? (
                        <button
                          type="button"
                          className="btn-doc-view"
                          onClick={() => handleViewDocument(doc)}
                          disabled={docLoadingId === doc.id}
                          title="View document in new tab (Expires in 3 minutes)"
                        >
                          {docLoadingId === doc.id ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-1" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <FaEye className="me-1" /> View
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="doc-unavailable-text">No File</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Salary History Section ── */}
          <Section title="Salary Details History">
            {salaryLoading ? (
              <div className="text-center py-5">
                <Spinner animation="border" size="md" variant="primary" />
                <p className="mt-2 text-muted">Fetching salary history...</p>
              </div>
            ) : salaryHistory.length > 0 ? (
              <div className="salary-history-table-wrapper animate-in">
                <table className="salary-history-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Basic Salary</th>
                      <th>Allowances</th>
                      <th>Total CTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryHistory.map((s, idx) => (
                      <tr key={s._id || idx}>
                        <td>
                          <div className="period-badge-view">
                            {new Date(s.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {s.toDate ? ` — ${new Date(s.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : " — Present"}
                          </div>
                        </td>
                        <td className="salary-amt-cell">{formatCurrency(s.basicSalary)}</td>
                        <td className="allowances-cell">
                          <ul className="allowance-list-view">
                            {s.allowances?.map((a, i) => (
                              <li key={i}>
                                <span className="allowance-label">{a.label}:</span>
                                <span className="allowance-val">{formatCurrency(a.value)}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="salary-amt-cell total-ctc">
                          <strong>{formatCurrency(s.totalSalary)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-salary-state">
                <p>No salary records available yet.</p>
              </div>
            )}
          </Section>

          {/* ── Footer Buttons ── */}
          <div className="detailsview-footer" id="detailsview-admin-actions">
            <Button
              variant=""
              className="common-modal-btn btn-small-cancel"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>

            {isAdminView && (employee?.profileApprovalStatus === "pending" || (!employee?.profileApprovalStatus && employee?.profileCompletion >= 100 && !employee?.isProfileCompleted)) && (
              <>
                <Button
                  variant="success"
                  className="common-modal-btn btn-approve"
                  style={{ backgroundColor: "#16a34a", color: "#ffffff", borderColor: "#16a34a" }}
                  onClick={() => setShowApproveModal(true)}
                >
                  Approve Profile
                </Button>
                <Button
                  variant="danger"
                  className="common-modal-btn btn-reject"
                  onClick={() => {
                    setRejectionRemark("");
                    setSelectedRejectedFields([]);
                    setRejectError(false);
                    setShowRejectModal(true);
                  }}
                >
                  Reject Profile
                </Button>
              </>
            )}

            <Button
              onClick={handleEdit}
              disabled={isEmployeeView && (requestStatus === "pending" || employee?.profileApprovalStatus === "pending")}
              className={`${isEmployeeView && (requestStatus === "pending" || employee?.profileApprovalStatus === "pending")
                ? "btn-disabled"
                : "btn-update"
                } common-modal-btn`}
            >
              {isEmployeeView && requestStatus === "pending" ? (
                <>
                  Request Pending
                </>
              ) : isEmployeeView && employee?.profileApprovalStatus === "pending" ? (
                <>
                  Pending Admin Approval
                </>
              ) : isEmployeeView && employee?.profileApprovalStatus === "rejected" ? (
                <>
                   Update & Resubmit
                </>
              ) : isEmployeeView && requestStatus === "approved" ? (
                <>
                  <FaCheckCircle className="me-2" /> Edit Now
                </>
              ) : isEmployeeView && requestStatus === "rejected" ? (
                <>
                  New Request
                </>
              ) : isAdminView ? (
                "Edit Profile"
              ) : isEmployeeView && (!employee?.isProfileCompleted || employee?.profileCompletion < 100) ? (
                "Edit Profile"
              ) : (
                "Request Edit"
              )}
            </Button>
          </div>
        </div>
        <Modal
          show={showRequestModal}
          onHide={() => setShowRequestModal(false)}
          centered
          className="edit-request-modal"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              Request Profile Edit
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <p className="modal-description">
              Select the sections you want to update and provide a reason. The
              request will be reviewed by admin.
            </p>

            <Form.Group className="mb-3">
              <Form.Label>
                <div className="edit-title">Select sections to edit</div>
              </Form.Label>

              <div className="sections-grid-container">
                {Object.entries(EDIT_SECTIONS).map(([key, sec]) => {
                  const isChecked = sec.fields.every((f) =>
                    requestedFields.includes(f)
                  );
                  return (
                    <div
                      key={key}
                      className={`section-selection-item ${isChecked ? 'selected' : ''}`}
                      onClick={() => toggleSection(sec.fields)}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <input
                        type="checkbox"
                        className="form-check-input me-2 mt-0"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSection(sec.fields);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: "pointer", flexShrink: 0 }}
                      />
                      <div className="section-content-wrap" style={{ pointerEvents: "none" }}>
                        <div className="section-label">{sec.label}</div>
                        {sec.subLabel && (
                          <div className="section-sublabel">
                            {sec.subLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Form.Group>

            {/* ✅ Selected fields summary badge */}
            {requestedFields.length > 0 && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  marginBottom: "14px",
                  fontSize: "12px",
                  color: "#166534",
                }}
              >
                <strong>Selected:</strong> {requestedFields.join(", ")}
              </div>
            )}

            <Form.Group>
              <Form.Label>
                <div className="edit-title">Request Message</div>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="e.g., Need to update phone number, upload new Aadhaar card and add degree certificate..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                className="request-textarea"
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <button
              onClick={() => setShowRequestModal(false)}
              className="common-modal-btn btn-small-cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSendRequest}
              disabled={requestLoading}
              className="common-modal-btn btn-update"
            >
              {requestLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Sending...
                </>
              ) : (
                <>Send Request</>
              )}
            </button>
          </Modal.Footer>
        </Modal>

        {/* ════════════════════════════════════════════════════════════
            STATUS MODAL
        ════════════════════════════════════════════════════════════ */}
        <Modal
          show={showStatusModal}
          onHide={() => setShowStatusModal(false)}
          centered
          className="status-modal"
        >
          <Modal.Body className="text-center py-4 px-4 position-relative">
            <button
              type="button"
              className="btn-close position-absolute top-0 end-0 m-3"
              onClick={() => setShowStatusModal(false)}
              aria-label="Close"
            />

            {requestStatus === "approved" && (
              <>
                <div className="status-icon approved">
                  <FaCheckCircle />
                </div>
                <h4 className="mt-4 mb-3">Request Approved!</h4>
                <p className="text-muted">{statusMessage}</p>
                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="common-modal-btn btn-confirm-success"
                    onClick={() => {
                      setShowStatusModal(false);
                      navigate("/emp/my-details/edit");
                    }}
                  >
                    Go to Edit Profile
                  </button>
                </div>
              </>
            )}

            {requestStatus === "rejected" && (
              <>
                <div className="status-icon rejected">
                  <FaTimesCircle />
                </div>
                <h4 className="mt-4 mb-3">Request Rejected</h4>
                <p className="text-muted">{statusMessage}</p>
                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="common-modal-btn btn-small-cancel"
                    onClick={() => setShowStatusModal(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            )}

            {requestStatus === "pending" && (
              <>
                <div className="status-icon pending">
                  <FaClock />
                </div>
                <h4 className="mt-2 mb-1">Request Sent!</h4>
                <p className="text-muted">{statusMessage}</p>
                <div className="d-flex justify-content-end mt-4">
                  <button
                    type="button"
                    className="common-modal-btn btn-small-cancel"
                    onClick={() => setShowStatusModal(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </Modal.Body>
        </Modal>

        {/* ── Admin Approve Modal ── */}
        <Modal
          show={showApproveModal}
          onHide={() => !reviewLoading && setShowApproveModal(false)}
          centered
          className="admin-profile-review-modal"
        >
          <Modal.Header closeButton={!reviewLoading}>
            <Modal.Title className="common-modal-title">Approve Employee Profile</Modal.Title>
          </Modal.Header>
          <Modal.Body className="text-center py-4">
            <div className="approve-modal-icon-wrap mb-3">
              <FaCheckCircle style={{ fontSize: "3.5rem", color: "#10b981" }} />
            </div>
            <h5 className="mb-2" style={{ fontSize: "16px", fontWeight: "500" }}>Approve {employee?.name}'s Profile?</h5>
            <p className="text-muted mb-0" style={{ fontSize: "13px"  }}>
              Are you sure you want to approve this employee profile? All submitted details and uploaded documents will be verified and marked as approved. The employee will be notified immediately.
            </p>
          </Modal.Body>
          <Modal.Footer className="admin-reject-modal-footer">
            <button
              type="button"
              className="common-modal-btn btn-small-cancel"
              onClick={() => setShowApproveModal(false)}
              disabled={reviewLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="common-modal-btn btn-confirm-success"
              onClick={handleApproveProfile}
              disabled={reviewLoading}
            >
              {reviewLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Approving...
                </>
              ) : (
                "Confirm Approval"
              )}
            </button>
          </Modal.Footer>
        </Modal>

        {/* ── Admin Reject Modal ── */}
        <Modal
          show={showRejectModal}
          onHide={() => !reviewLoading && setShowRejectModal(false)}
          centered
          scrollable
          className="admin-profile-review-modal"
        >
          <Modal.Header closeButton={!reviewLoading}>
            <Modal.Title className="common-modal-title">Reject Employee Profile</Modal.Title>
          </Modal.Header>
          <Modal.Body className="admin-reject-modal-body">
            <Form.Group className="mb-3">
              <Form.Label className="rejection-form-label">
                Rejection Remark / Reason <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="e.g. Masked Aadhaar document is missing. Please upload the clear Masked Aadhaar card copy."
                value={rejectionRemark}
                onChange={(e) => setRejectionRemark(e.target.value)}
                isInvalid={rejectError && !rejectionRemark.trim()}
              />
              {rejectError && !rejectionRemark.trim() && (
                <div className="text-danger small">
                  Please provide a rejection remark.
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-0">
              <Form.Label className="rejection-form-label mb-2">
                Select Specific File(s) or Document(s) Needing Correction:
              </Form.Label>
              <div className="rejection-categories-container">
                {REJECTABLE_CATEGORIES.map((catGroup) => (
                  <div key={catGroup.category} className="rejection-cat-block mb-3">
                    <div className="rejection-cat-title">
                      {catGroup.category}
                    </div>
                    <div className="rejection-items-grid">
                      {catGroup.items.map((item) => {
                        const isSelected = selectedRejectedFields.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`rejection-checkbox-item ${isSelected ? "selected" : ""}`}
                            onClick={() => toggleRejectedField(item.id)}
                          >
                            <input
                              type="checkbox"
                              className="form-check-input me-2 mt-0"
                              checked={isSelected}
                              onChange={() => toggleRejectedField(item.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="rejection-item-label">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="admin-reject-modal-footer">
            <button
              type="button"
              className="common-modal-btn btn-small-cancel"
              onClick={() => setShowRejectModal(false)}
              disabled={reviewLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="common-modal-btn btn-update"
              onClick={handleRejectProfile}
              disabled={reviewLoading}
            >
              {reviewLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Rejecting...
                </>
              ) : (
                "Submit Rejection"
              )}
            </button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   REUSABLE SUB-COMPONENTS
════════════════════════════════════════════════════════════ */
const Section = ({ title, id, children }) => (
  <div id={id} className="detailsview-section with-divider">
    <h4>{title}</h4>
    {children}
  </div>
);

const Grid = ({ children }) => (
  <div className="detailsview-grid">{children}</div>
);

const Item = ({ id, label, value, full, className = "" }) => (
  <div id={id} className={`detailsview-item ${full ? "full" : ""} ${className}`}>
    <span>{label}</span>
    <p>{value || "-"}</p>
  </div>
);

export default DetailsView;