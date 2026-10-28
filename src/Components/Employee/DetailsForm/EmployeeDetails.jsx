import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { portalInstance } from "../../../Services/instance";
import axios from "axios";
import Sidebar from "../../HeaderSidebar/Sidebar";
import CustomDropdown from "../../Common/CustomDropdown";
import "./EmployeeDetails.css";
import Cropper from "react-easy-crop";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Icon } from "@iconify/react";
import { useUser } from "../../UserContext";
import { FaTimesCircle, FaCheckCircle, FaExclamationCircle, FaEye } from "react-icons/fa";
import { checkProfileRestriction } from "../../../utils/profileCompletionRestriction";
import { canHrEditEmployee, canHrDeleteDocuments, isHrUser, isAdminUser } from "../../../utils/hrAccessHelper";

/* ================= STATUS CLASS ================= */
const getStatusClass = (status = "") =>
  status
    ? status.toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-")
    : "";

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
      { id: "passedOutYear10", label: "10th Passed-Out Year" },
      { id: "passedOutYear12", label: "12th Passed-Out Year" },
      { id: "careerGaps", label: "Career Gap Details" },
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
    passedOutYear10: "10th Passed-Out Year",
    passedOutYear12: "12th Passed-Out Year",
    careerGaps: "Career Gap Details",
    degreeCertificate: "Degree / Diploma Certificate",
    courses: "College / Degree Details",
    professionalCertifications: "Professional Certifications",
    aadhaarFile: "Masked Aadhaar Card",
    panFile: "PAN Card Document",
    picture: "Profile Photo",
    passbookFile: "Bank Passbook Document",
  };
  if (legacyMap[fieldId]) return legacyMap[fieldId];
  if (typeof fieldId === "string") {
    if (fieldId.startsWith("courses.") || fieldId.startsWith("course_")) {
      const match = fieldId.match(/courses\.(\d+)/) || fieldId.match(/course_(\d+)/);
      const idx = match ? parseInt(match[1], 10) + 1 : "";
      return idx ? `Course Certificate #${idx}` : "Course Certificate";
    }
    if (fieldId.startsWith("professionalCertifications.") || fieldId.startsWith("prof_cert_")) {
      const match = fieldId.match(/professionalCertifications\.(\d+)/) || fieldId.match(/prof_cert_(\d+)/);
      const idx = match ? parseInt(match[1], 10) + 1 : "";
      return idx ? `Professional Certificate #${idx}` : "Professional Certificate";
    }
  }
  return fieldId;
};

const EmployeeDetails = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { empId } = useParams();
  const { user, setUser } = useUser();
  const isDesignatedHr = isHrUser(user);
  const isHrRestrictedFromEdit = isDesignatedHr && !canHrEditEmployee(user);
  const effectiveIsAdmin = isAdminUser(user) || (isAdmin && !isHrRestrictedFromEdit);
  const isPrivileged = isAdminUser(user) || (isAdmin && !isHrRestrictedFromEdit) || (isDesignatedHr && !isHrRestrictedFromEdit);

  /* ================= STATE ================= */
  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState({
    empId: "",
    name: "",
    email: "",
    role: "",
    status: "",
    dateRelieved: "",
    dob: "",
    gender: "",
    phone: "",
    emergencyContact: "",
    bloodGroup: "",
    address: "",
    fatherName: "",
    motherName: "",
    fatherOccupation: "",
    motherOccupation: "",
    siblings: [],
    department: "",
    designation: "",
    dateJoined: "",
    experience: "",
    salary: "",
    previousExperiences: [],
    school10: "",
    marks10: "",
    marksheet10: null,
    passedOutYear10: "",
    school12: "",
    marks12: "",
    marksheet12: null,
    passedOutYear12: "",
    careerGaps: [],
    courses: [],
    aadhaarNo: "",
    panNo: "",
    uanNo: "",
    pfNo: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    passbookFile: null,
    picture: null,
    aadhaarFile: null,
    panFile: null,
    isProfileCompleted: false,
  });

  /* ================= VISIBILITY STATE ================= */
  const [showAadhaar, setShowAadhaar] = useState(false);
  const [showPan, setShowPan] = useState(false);
  const [isFetchingAadhaar, setIsFetchingAadhaar] = useState(false);
  const [isFetchingPan, setIsFetchingPan] = useState(false);

  const [educationPath, setEducationPath] = useState("");
  /* ✅ NEW CROP STATE */
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [filePreviews, setFilePreviews] = useState({});
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [showAllMissing, setShowAllMissing] = useState(false);
  const [marks12Total, setMarks12Total] = useState(600);
  const [showAddSibling, setShowAddSibling] = useState(false);
  const [newSibling, setNewSibling] = useState({
    relationship: "Brother",
    name: "",
    occupation: "",
  });
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    courseType: "UG",
    collegeName: "",
    courseName: "",
    cgpa: "",
    passedOutYear: "",
    certificate: null,
  });

  const [courseErrors, setCourseErrors] = useState({
    cgpa: "",
    passedOutYear: "",
  });

  /* ================= ADDITIONAL CERTIFICATIONS STATE ================= */
  const [hasCertifications, setHasCertifications] = useState(""); // "yes" | "no" | ""
  const [certifications, setCertifications] = useState([]);
  const [certificationErrors, setCertificationErrors] = useState({});

  const calculateCertDuration = (startMonthYear, endMonthYear, durationType = "Months") => {
    if (!startMonthYear || !endMonthYear) {
      return { durationValue: "", courseDuration: "", isInvalidRange: false };
    }
    const [sYearStr, sMonthStr] = startMonthYear.split("-");
    const [eYearStr, eMonthStr] = endMonthYear.split("-");

    const sYear = parseInt(sYearStr, 10);
    const sMonth = parseInt(sMonthStr, 10);
    const eYear = parseInt(eYearStr, 10);
    const eMonth = parseInt(eMonthStr, 10);

    if (isNaN(sYear) || isNaN(sMonth) || isNaN(eYear) || isNaN(eMonth)) {
      return { durationValue: "", courseDuration: "", isInvalidRange: false };
    }

    const totalMonths = (eYear - sYear) * 12 + (eMonth - sMonth) + 1;
    if (totalMonths <= 0) {
      return { durationValue: "0", courseDuration: "0 Months", totalMonths, isInvalidRange: true };
    }

    if (durationType === "Years") {
      const years = (totalMonths / 12).toFixed(1).replace(/\.0$/, "");
      const label = parseFloat(years) === 1 ? "Year" : "Years";
      return {
        durationValue: String(years),
        courseDuration: `${years} ${label}`,
        totalMonths,
        isInvalidRange: false,
      };
    } else {
      const label = totalMonths === 1 ? "Month" : "Months";
      return {
        durationValue: String(totalMonths),
        courseDuration: `${totalMonths} ${label}`,
        totalMonths,
        isInvalidRange: false,
      };
    }
  };

  const createNewCertification = () => ({
    id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    courseName: "",
    startMonthYear: "",
    endMonthYear: "",
    courseDuration: "",
    durationValue: "",
    durationType: "Months",
    durationUnit: "Months",
    courseType: "",
    institutionName: "",
    certificate: "",
    certificateFile: null,
  });

  const handleHasCertificationsChange = (val) => {
    setHasCertifications(val);
    markFieldAsUpdated("courses");
    if (val === "no") {
      setCertifications([]);
      setCertificationErrors({});
    } else {
      if (certifications.length === 0) {
        const updated = [createNewCertification()];
        setCertifications(updated);
      }
    }
  };

  const handleAddCertification = () => {
    markFieldAsUpdated("courses");
    const newCert = createNewCertification();
    const updated = [...certifications, newCert];
    setCertifications(updated);
  };

  const handleRemoveCertification = (index) => {
    markFieldAsUpdated("courses");
    const updated = certifications.filter((_, i) => i !== index);
    setCertifications(updated);
    setCertificationErrors((prev) => {
      const nextErrs = { ...prev };
      delete nextErrs[index];
      return nextErrs;
    });
  };

  const handleCertFieldChange = (index, field, value) => {
    markFieldAsUpdated("courses");
    const updated = [...certifications];
    const cert = { ...updated[index], [field]: value };

    if (field === "startMonthYear" || field === "endMonthYear") {
      const sDate = field === "startMonthYear" ? value : cert.startMonthYear;
      const eDate = field === "endMonthYear" ? value : cert.endMonthYear;
      const unit = cert.durationType || cert.durationUnit || "Months";
      const calc = calculateCertDuration(sDate, eDate, unit);
      cert.durationValue = calc.durationValue;
      cert.courseDuration = calc.courseDuration;

      setCertificationErrors((prev) => {
        const entryErrs = { ...(prev[index] || {}) };
        if (calc.isInvalidRange) {
          entryErrs.endMonthYear = "End month must be after or same as start month";
        } else {
          delete entryErrs.startMonthYear;
          delete entryErrs.endMonthYear;
          delete entryErrs.courseDuration;
        }
        return { ...prev, [index]: entryErrs };
      });
    } else {
      setCertificationErrors((prev) => {
        const entryErrs = { ...(prev[index] || {}) };
        delete entryErrs[field];
        return { ...prev, [index]: entryErrs };
      });
    }

    updated[index] = cert;
    setCertifications(updated);
  };

  const handleCertDurationTypeChange = (index, newType) => {
    markFieldAsUpdated("courses");
    const updated = [...certifications];
    const cert = { ...updated[index], durationType: newType, durationUnit: newType };
    if (cert.startMonthYear && cert.endMonthYear) {
      const calc = calculateCertDuration(cert.startMonthYear, cert.endMonthYear, newType);
      cert.durationValue = calc.durationValue;
      cert.courseDuration = calc.courseDuration;
    }
    updated[index] = cert;
    setCertifications(updated);
  };

  const handleCertFileChange = (index, file, target) => {
    markFieldAsUpdated("courses");
    markFieldAsUpdated("professionalCertifications");
    markFieldAsUpdated(`professionalCertifications.${index}.certificate`);
    markFieldAsUpdated(`prof_cert_${index}`);
    if (!file) {
      const updated = [...certifications];
      updated[index] = { ...updated[index], certificateFile: null };
      setCertifications(updated);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      target.value = "";
      showErrorModal("Invalid File", "Only JPG, PNG, WEBP, PDF allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      target.value = "";
      showErrorModal("File Too Large", "Max size is 2MB");
      return;
    }
    const updated = [...certifications];
    updated[index] = { ...updated[index], certificateFile: file };
    setCertifications(updated);

    const previewUrl = URL.createObjectURL(file);
    const certId = certifications[index]?.id || certifications[index]?._id;
    setFilePreviews((prev) => {
      const keyIndex = `cert_${index}_certificate`;
      const keyId = certId ? `cert_${certId}_certificate` : null;
      if (prev[keyIndex]?.startsWith("blob:")) {
        URL.revokeObjectURL(prev[keyIndex]);
      }
      return {
        ...prev,
        [keyIndex]: previewUrl,
        ...(keyId ? { [keyId]: previewUrl } : {}),
      };
    });
  };

  useEffect(() => {
    if (educationPath === "Diploma") {
      setNewCourse((prev) => ({ ...prev, courseType: "Diploma" }));
    } else if (educationPath === "12th" && newCourse.courseType === "Diploma") {
      setNewCourse((prev) => ({ ...prev, courseType: "UG" }));
    }
  }, [educationPath]);

  /* ================= MARKS VALIDATION STATE ================= */
  const [marksErrors, setMarksErrors] = useState({
    marks10: "",
    marks12: "",
  });

  /* ================= CAREER GAP STATE ================= */
  const [showCareerGapModal, setShowCareerGapModal] = useState(false);
  const [careerGapReasonInput, setCareerGapReasonInput] = useState("");
  const [careerGapModalError, setCareerGapModalError] = useState("");
  const [careerGapReasons, setCareerGapReasons] = useState({});
  const [activeGapStage, setActiveGapStage] = useState("10th to 12th Standard");
  const [yearErrors, setYearErrors] = useState({
    passedOutYear10: "",
    passedOutYear12: "",
  });

  const getCourseJoiningYear = useCallback((course) => {
    if (!course) return null;
    if (course.joiningYear !== undefined && course.joiningYear !== null && course.joiningYear !== "") {
      const y = parseInt(String(course.joiningYear).trim(), 10);
      if (!isNaN(y) && y >= 1950 && y <= 2100) return y;
    }
    if (course.passedOutYear && typeof course.passedOutYear === "string") {
      const s = course.passedOutYear.trim();
      const match = s.match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (match) {
        const y = parseInt(match[1], 10);
        if (!isNaN(y) && y >= 1950 && y <= 2100) return y;
      }
    }
    return null;
  }, []);

  const calculateEligibleCareerGaps = useCallback(({
    passedOutYear10,
    passedOutYear12,
    educationPath: currentPath,
    courses: currentCourses = [],
  }) => {
    const y10Num = parseInt(String(passedOutYear10 || "").trim(), 10);
    const valid10 = !isNaN(y10Num) && y10Num >= 1950 && y10Num <= 2100;

    const y12Num = parseInt(String(passedOutYear12 || "").trim(), 10);
    const valid12 = !isNaN(y12Num) && y12Num >= 1950 && y12Num <= 2100;

    if (!valid10 && !valid12) return [];

    const courseList = Array.isArray(currentCourses) ? currentCourses : [];
    const diplomaCourse = courseList.find(
      (c) => c && String(c.courseType || "").trim().toUpperCase() === "DIPLOMA"
    );
    const ugCourse = courseList.find(
      (c) =>
        c &&
        (String(c.courseType || "UG").trim().toUpperCase() === "UG" ||
          String(c.courseType || "").trim().toUpperCase() === "ENGINEERING")
    );

    const isDiplomaPath = String(currentPath || "").trim().toLowerCase() === "diploma";
    // If the student's education path after 10th is Diploma, 12th is not part of their education path
    const effectiveValid12 = !isDiplomaPath && valid12;

    const gaps = [];

    // Path 1: 10th -> 12th -> Diploma -> Engineering (or 10th -> 12th -> Diploma)
    if (effectiveValid12 && Boolean(diplomaCourse)) {
      if (valid10) {
        const expected12th = y10Num + 2;
        const gapYears = y12Num - expected12th;
        if (gapYears > 0) {
          gaps.push({
            educationStage: "10th to 12th Standard",
            passedOutYear10: String(y10Num),
            expectedYear12: String(expected12th),
            actualYear12: String(y12Num),
            gapDuration: gapYears,
          });
        }
      }

      const diplomaJoiningYear = getCourseJoiningYear(diplomaCourse);
      if (diplomaJoiningYear !== null) {
        const expectedDiploma = y12Num;
        const gapYearsDiploma = diplomaJoiningYear - expectedDiploma;
        if (gapYearsDiploma > 0) {
          gaps.push({
            educationStage: "12th Standard to Diploma",
            passedOutYear12: String(y12Num),
            expectedDiplomaYear: String(expectedDiploma),
            actualDiplomaYear: String(diplomaJoiningYear),
            actualYear12: String(y12Num),
            gapDuration: gapYearsDiploma,
          });
        }
      }

      if (ugCourse) {
        const ugJoiningYear = getCourseJoiningYear(ugCourse);
        let diplomaEndYear = null;
        if (diplomaCourse.passedOutYear) {
          const m = String(diplomaCourse.passedOutYear).match(/^(\d{4})\s*-\s*(\d{4})$/);
          if (m) diplomaEndYear = parseInt(m[2], 10);
        }
        if (ugJoiningYear !== null && diplomaEndYear !== null) {
          const gapYearsUG = ugJoiningYear - diplomaEndYear;
          if (gapYearsUG > 0) {
            gaps.push({
              educationStage: "Diploma to UG / Engineering",
              passedOutYearDiploma: String(diplomaEndYear),
              expectedUGYear: String(diplomaEndYear),
              actualUGYear: String(ugJoiningYear),
              gapDuration: gapYearsUG,
            });
          }
        }
      }
    }
    // Path 2: 10th -> 12th -> UG/Engineering
    // Apply Rule A and Rule B.
    else if (effectiveValid12 && !diplomaCourse) {
      // Rule A: 10th to 12th Standard
      if (valid10) {
        const expected12th = y10Num + 2;
        const gapYearsA = y12Num - expected12th;
        if (gapYearsA > 0) {
          gaps.push({
            educationStage: "10th to 12th Standard",
            passedOutYear10: String(y10Num),
            expectedYear12: String(expected12th),
            actualYear12: String(y12Num),
            gapDuration: gapYearsA,
          });
        }
      }

      // Rule B: 12th Standard to UG / Engineering
      if (ugCourse) {
        const ugJoiningYear = getCourseJoiningYear(ugCourse);
        if (ugJoiningYear !== null) {
          const expectedUG = y12Num;
          const gapYearsB = ugJoiningYear - expectedUG;
          if (gapYearsB > 0) {
            gaps.push({
              educationStage: "12th Standard to UG / Engineering",
              passedOutYear12: String(y12Num),
              expectedUGYear: String(expectedUG),
              actualUGYear: String(ugJoiningYear),
              actualYear12: String(y12Num),
              gapDuration: gapYearsB,
            });
          }
        }
      }
    }
    // Path 3: 10th -> Diploma -> Engineering or 10th -> Diploma
    // Apply Rule C only.
    else if ((valid10 && isDiplomaPath) || (!effectiveValid12 && Boolean(diplomaCourse))) {
      if (diplomaCourse) {
        const diplomaJoiningYear = getCourseJoiningYear(diplomaCourse);
        if (diplomaJoiningYear !== null && valid10) {
          const expectedDiploma = y10Num;
          const gapYearsC = diplomaJoiningYear - expectedDiploma;
          if (gapYearsC > 0) {
            gaps.push({
              educationStage: "10th to Diploma",
              passedOutYear10: String(y10Num),
              expectedDiplomaYear: String(expectedDiploma),
              actualDiplomaYear: String(diplomaJoiningYear),
              actualYear12: String(diplomaJoiningYear),
              gapDuration: gapYearsC,
            });
          }
        }

        if (ugCourse) {
          const ugJoiningYear = getCourseJoiningYear(ugCourse);
          let diplomaEndYear = null;
          if (diplomaCourse.passedOutYear) {
            const m = String(diplomaCourse.passedOutYear).match(/^(\d{4})\s*-\s*(\d{4})$/);
            if (m) diplomaEndYear = parseInt(m[2], 10);
          }
          if (ugJoiningYear !== null && diplomaEndYear !== null) {
            const gapYearsUG = ugJoiningYear - diplomaEndYear;
            if (gapYearsUG > 0) {
              gaps.push({
                educationStage: "Diploma to UG / Engineering",
                passedOutYearDiploma: String(diplomaEndYear),
                expectedUGYear: String(diplomaEndYear),
                actualUGYear: String(ugJoiningYear),
                gapDuration: gapYearsUG,
              });
            }
          }
        }
      }
    }

    return gaps;
  }, [getCourseJoiningYear]);

  const calculate10to12Gap = useCallback((y10Val, y12Val) => {
    if (!y10Val || !y12Val) return null;
    const s10 = String(y10Val).trim();
    const s12 = String(y12Val).trim();
    if (s10.length !== 4 || s12.length !== 4) return null;

    const y10 = parseInt(s10, 10);
    const y12 = parseInt(s12, 10);
    if (isNaN(y10) || isNaN(y12)) return null;

    const expected11th = y10 + 1;
    const expected12th = y10 + 2;
    const gap = y12 - expected12th;

    return {
      y10,
      y12,
      expected11th,
      expected12th,
      gap: gap > 0 ? gap : 0,
      hasGap: gap > 0,
      isInvalid: y12 < expected12th,
    };
  }, []);

  const [contactErrors, setContactErrors] = useState({
    emergencyContact: "",
  });
  const [kycErrors, setKycErrors] = useState({
    aadhaarNo: "",
    panNo: "",
  });

  /* ================= BANK VALIDATION STATE ================= */
  const [bankErrors, setBankErrors] = useState({
    ifscCode: "",
    accountNumber: "",
    branch: "",
    toDate: new Date().toISOString().split("T")[0], // Default to today
  });
  const [originalAccountNumber, setOriginalAccountNumber] = useState("");
  const [isIFSCFetching, setIsIFSCFetching] = useState(false);

  /* ================= MODAL STATE ================= */
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState("success");
  const [modalTitle, setModalTitle] = useState("");
  const [shouldNavigate, setShouldNavigate] = useState(false);

  /* ================= PERMISSION STATE ================= */
  const [allowedFields, setAllowedFields] = useState([]);
  const [canEditProfile, setCanEditProfile] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [rejectionRemark, setRejectionRemark] = useState("");
  const [rejectedFields, setRejectedFields] = useState([]);
  const [reviewedAt, setReviewedAt] = useState(null);
  const [activeHighlightedRejectedField, setActiveHighlightedRejectedField] = useState(null);
  const [updatedFields, setUpdatedFields] = useState(() => new Set());

  const formRestriction = useMemo(() => {
    if (isAdmin) return null;
    return checkProfileRestriction({
      role: "employee",
      profileCompletion,
      isProfileCompleted: formData.isProfileCompleted,
      dateJoined: originalData?.dateJoined || user?.dateJoined,
      createdAt: originalData?.createdAt || user?.createdAt,
      profileApprovalStatus: approvalStatus,
      reviewedAt: originalData?.reviewedAt || reviewedAt,
      profileRejectedAt: originalData?.profileRejectedAt || reviewedAt,
    });
  }, [isAdmin, profileCompletion, formData.isProfileCompleted, originalData, user, approvalStatus, reviewedAt]);

  const markFieldAsUpdated = useCallback((fieldKey) => {
    if (!fieldKey) return;
    setUpdatedFields((prev) => {
      const next = new Set(prev);
      next.add(fieldKey);
      if (fieldKey === "marksheet10" || fieldKey === "certificate10") {
        next.add("marksheet10");
        next.add("certificate10");
      }
      if (fieldKey === "marksheet12" || fieldKey === "certificate12") {
        next.add("marksheet12");
        next.add("certificate12");
      }
      if (fieldKey === "degreeCertificate" || fieldKey === "courses") {
        next.add("degreeCertificate");
        next.add("courses");
      }
      return next;
    });
  }, []);

  const isFieldUpdated = useCallback(
    (f) => {
      let canonical = f;
      if (f === "certificate10") canonical = "marksheet10";
      if (f === "certificate12") canonical = "marksheet12";

      if (updatedFields.has(canonical) || updatedFields.has(f)) return true;

      // File uploads
      if (canonical === "marksheet10" && formData.marksheet10 instanceof File) return true;
      if (canonical === "marksheet12" && formData.marksheet12 instanceof File) return true;
      if (
        (canonical === "degreeCertificate" || canonical === "courses") &&
        formData.courses?.some((c) => c && c.certificate instanceof File)
      ) {
        return true;
      }
      if (canonical.startsWith("courses.") || canonical.startsWith("course_")) {
        const m = canonical.match(/courses\.(\d+)/) || canonical.match(/course_(\d+)/);
        const idx = m ? parseInt(m[1], 10) : 0;
        if (formData.courses?.[idx]?.certificate instanceof File) return true;
        if (formData.courses?.some((c) => c && c.certificate instanceof File)) return true;
      }
      if (canonical.startsWith("professionalCertifications.") || canonical.startsWith("prof_cert_") || canonical === "professionalCertifications") {
        const m = canonical.match(/professionalCertifications\.(\d+)/) || canonical.match(/prof_cert_(\d+)/);
        const idx = m ? parseInt(m[1], 10) : 0;
        if (certifications?.[idx]?.certificateFile instanceof File) return true;
        if (certifications?.some((c) => c && c.certificateFile instanceof File)) return true;
      }
      if (canonical === "aadhaarFile" && formData.aadhaarFile instanceof File) return true;
      if (canonical === "panFile" && formData.panFile instanceof File) return true;
      if (canonical === "passbookFile" && formData.passbookFile instanceof File) return true;
      if (canonical === "picture" && formData.picture instanceof File) return true;

      // Text / selection comparison if modified
      if (originalData && formData[canonical] !== undefined && formData[canonical] !== null) {
        const origVal = originalData[canonical];
        const curVal = formData[canonical];
        if (curVal !== "" && curVal !== undefined && curVal !== null) {
          if (origVal === undefined || origVal === null || origVal === "") {
            return true;
          }
          const origNorm = String(origVal).trim().split("T")[0];
          const curNorm = String(curVal).trim().split("T")[0];
          if (origNorm !== curNorm) {
            return true;
          }
        }
      }

      return false;
    },
    [updatedFields, formData, originalData, certifications]
  );

  // Normalize, deduplicate, and exclude any field already updated by employee
  const displayRejectedFields = useMemo(() => {
    if (!Array.isArray(rejectedFields)) return [];
    const seen = new Set();
    const result = [];
    rejectedFields.forEach((f) => {
      let canonical = f;
      if (f === "certificate10") canonical = "marksheet10";
      if (f === "certificate12") canonical = "marksheet12";
      if (isFieldUpdated(canonical) || isFieldUpdated(f)) {
        return;
      }
      if (!seen.has(canonical)) {
        seen.add(canonical);
        result.push(canonical);
      }
    });
    return result;
  }, [rejectedFields, isFieldUpdated]);

  const [permissionsLoaded, setPermissionsLoaded] = useState(isAdmin);

  /* ================= CROP LOGIC ================= */
  const onCropComplete = (croppedArea, croppedAreaPx) => {
    setCroppedAreaPixels(croppedAreaPx);
  };

  const getCroppedImg = (imageSrc, pixelCrop) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          image,
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height,
          0,
          0,
          pixelCrop.width,
          pixelCrop.height
        );

        canvas.toBlob((blob) => {
          if (!blob) return reject("Canvas empty");

          const file = new File([blob], "profile.jpg", {
            type: "image/jpeg",
          });

          resolve(file);
        }, "image/jpeg");
      };
      image.src = imageSrc;
    });
  };

  const handleCropApply = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);

    setFormData((prev) => ({
      ...prev,
      picture: croppedFile,
    }));
    markFieldAsUpdated("picture");

    const previewUrl = URL.createObjectURL(croppedFile);

    setFilePreviews((prev) => ({
      ...prev,
      picture: previewUrl,
    }));

    setShowCropModal(false);
    setImageToCrop(null);
  };

  /* ================= MODAL FUNCTIONS ================= */
  const showSuccessModal = (title, message, navigateAfter = false) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType("success");
    setShouldNavigate(navigateAfter);
    setShowModal(true);
  };

  const showErrorModal = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType("error");
    setShouldNavigate(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    if (shouldNavigate) {
      navigate("/emp/my-details", {
        state: { cameFromEdit: true },
      });
    }
  };

  const CATEGORY_DEFINITIONS = [
    {
      name: "personal",
      triggers: ["personal", "dob", "gender", "phone", "emergencyContact", "bloodGroup", "address"],
      fields: ["dob", "gender", "phone", "emergencyContact", "bloodGroup", "address"],
    },
    {
      name: "family",
      triggers: ["family", "siblings", "fatherName", "fatherOccupation", "motherName", "motherOccupation"],
      fields: ["fatherName", "fatherOccupation", "motherName", "motherOccupation", "siblings"],
    },
    {
      name: "working",
      triggers: ["working", "work", "department", "designation", "status", "experience", "salary", "previousExperiences"],
      fields: ["department", "designation", "status", "experience", "salary", "previousExperiences"],
    },
    {
      name: "education",
      triggers: [
        "education", "school10", "marks10", "marksheet10", "certificate10", "passedOutYear10",
        "school12", "marks12", "marksheet12", "certificate12", "passedOutYear12",
        "educationPath", "careerGaps"
      ],
      fields: [
        "school10", "marks10", "marksheet10", "certificate10", "passedOutYear10",
        "school12", "marks12", "marksheet12", "certificate12", "passedOutYear12",
        "educationPath", "careerGaps",
      ],
    },
    {
      name: "courses",
      triggers: ["courses", "course", "degreeCertificate"],
      fields: ["courses", "degreeCertificate"],
    },
    {
      name: "kycBank",
      triggers: [
        "kyc", "bank", "aadhaarNo", "panNo", "aadhaarFile", "panFile",
        "bankName", "accountHolder", "accountNumber", "ifscCode", "branch", "toDate", "passbookFile"
      ],
      fields: [
        "aadhaarNo", "panNo", "aadhaarFile", "panFile",
        "bankName", "accountHolder", "accountNumber", "ifscCode", "branch", "toDate", "passbookFile"
      ],
    },
    {
      name: "documents",
      triggers: ["documents", "document", "uploadDocument", "picture"],
      fields: [
        "picture", "aadhaarFile", "panFile", "marksheet10", "marksheet12",
        "courses", "degreeCertificate", "passbookFile"
      ],
    },
  ];

  const expandAllowedFields = (rawFields) => {
    if (!Array.isArray(rawFields) || rawFields.length === 0) return [];
    if (rawFields.includes("ALL")) return ["ALL"];

    const expanded = new Set(rawFields);

    CATEGORY_DEFINITIONS.forEach((cat) => {
      const hasTrigger = cat.triggers.some((t) => rawFields.includes(t));
      if (hasTrigger) {
        cat.fields.forEach((f) => expanded.add(f));
        expanded.add(cat.name);
        if (cat.name === "family") expanded.add("siblings");
        if (cat.name === "working") expanded.add("work");
        if (cat.name === "kycBank") {
          expanded.add("kyc");
          expanded.add("bank");
        }
      }
    });

    return Array.from(expanded);
  };

  /* ================= CHECK EDIT PERMISSION ================= */
  const checkEditPermission = async () => {
    if (isAdmin) {
      setCanEditProfile(true);
      setAllowedFields([]);
      setEditMessage("");
      setPermissionsLoaded(true);
      return;
    }

    try {
      const response = await portalInstance.get("/profile/info/can-edit");

      if (response.data.success) {
        const canEdit = !!response.data.canEdit;
        const rawFields = response.data.allowedFields || [];
        const fields = expandAllowedFields(rawFields);
        const message = response.data.message || "";

        setCanEditProfile(canEdit);
        setAllowedFields(fields);
        setEditMessage(message);

        if (response.data.profileApprovalStatus) {
          setApprovalStatus(response.data.profileApprovalStatus);
          setRejectionRemark(response.data.rejectionRemark || "");
          setRejectedFields(Array.isArray(response.data.rejectedFields) ? response.data.rejectedFields : []);
        }
        if (response.data.reviewedAt) {
          setReviewedAt(response.data.reviewedAt);
        }

        sessionStorage.setItem("allowedEditFields", JSON.stringify(fields));
      } else {
        setCanEditProfile(false);
        setAllowedFields([]);
        setEditMessage(response.data.message || "Profile editing is locked");
      }
    } catch (err) {
      console.error("❌ Permission check failed:", err);
      setCanEditProfile(false);
      setAllowedFields([]);
      setEditMessage("Error checking permission. Please try again.");
    } finally {
      setPermissionsLoaded(true);
    }
  };

  /* ================= FETCH EMPLOYEE ================= */
  const fetchEmployee = async () => {
    try {
      const baseUrl = isAdmin
        ? `/users/employee/${empId}`
        : `/users/get-employee`;

      const url = isAdmin ? `${baseUrl}?unmask=true` : baseUrl;

      const response = await portalInstance.get(url);

      if (response.data.success && response.data.data) {
        const emp = response.data.data;

        // BANK HISTORY LOGIC - Prioritize latest entry by fromDate
        let currentBank = {
          bankName: emp.bankName || "",
          accountNumber: emp.accountNumber || "",
          ifscCode: emp.ifscCode || "",
          accountHolder: emp.accountHolder || "",
          branch: emp.branch || ""
        };

        if (emp.bankHistory && Array.isArray(emp.bankHistory) && emp.bankHistory.length > 0) {
          const latestHistory = [...emp.bankHistory].sort((a, b) =>
            new Date(b.fromDate) - new Date(a.fromDate)
          )[0];

          if (latestHistory) {
            currentBank = {
              bankName: latestHistory.bankName || currentBank.bankName,
              accountNumber: latestHistory.accountNumber || currentBank.accountNumber,
              ifscCode: latestHistory.ifscCode || currentBank.ifscCode,
              accountHolder: latestHistory.accountHolder || currentBank.accountHolder,
              branch: latestHistory.branch || currentBank.branch
            };
          }
        }

        const formatGender = (val) => {
          if (!val) return "";
          const s = String(val).trim().toLowerCase();
          return s.charAt(0).toUpperCase() + s.slice(1);
        };

        const normalizedEmp = {
          ...emp,
          ...currentBank,
          gender: formatGender(emp.gender),
          dob: emp.dob ? emp.dob.split("T")[0] : "",
          dateJoined: emp.dateJoined ? emp.dateJoined.split("T")[0] : "",
          toDate: emp.toDate ? emp.toDate.split("T")[0] : "",
          dateRelieved: emp.dateRelieved ? emp.dateRelieved.split("T")[0] : "",
        };
        setOriginalData(normalizedEmp);

        setOriginalAccountNumber(currentBank.accountNumber);

        setProfileCompletion(emp.profileCompletion || 0);
        setEducationPath(emp.educationPath || (emp.school12 ? "12th" : ""));
        if (emp.marks12 && parseInt(emp.marks12) > 600) {
          setMarks12Total(1200);
        } else {
          setMarks12Total(600);
        }
        setFormData((prev) => ({
          ...prev,
          ...normalizedEmp,
          profileCompletion: emp.profileCompletion || 0
        }));

        const previews = {};
        previews.picture = emp.pictureUrl || null;
        previews.aadhaarFile = emp.aadhaarFileUrl || null;
        previews.panFile = emp.panFileUrl || null;
        previews.marksheet10 = emp.marksheet10Url || null;
        previews.marksheet12 = emp.marksheet12Url || null;
        previews.passbookFile = emp.passbookFileUrl || null;

        if (emp.courses && Array.isArray(emp.courses)) {
          emp.courses.forEach((course) => {
            const courseId =
              course.id ||
              (course._id ? course._id.toString?.() ?? String(course._id) : null);
            if (course.certificateUrl && courseId) {
              previews[`course_${courseId}_certificate`] = course.certificateUrl;
            }
          });
        }

        if (emp.professionalCertifications && Array.isArray(emp.professionalCertifications)) {
          emp.professionalCertifications.forEach((cert, idx) => {
            const certId =
              cert.id ||
              (cert._id ? cert._id.toString?.() ?? String(cert._id) : null);
            const url = cert.certificateUrl || (typeof cert.certificate === "string" ? cert.certificate : null);
            if (url) {
              previews[`cert_${idx}_certificate`] = url;
              if (certId) {
                previews[`cert_${certId}_certificate`] = url;
              }
            }
          });
        }

        setFilePreviews(previews);

        const backendCourses = emp.courses || [];
        if (emp.ugCollege || emp.pgCollege) {
          if (emp.ugCollege && emp.ugDegree) {
            backendCourses.push({
              id: Date.now() + Math.random(),
              courseType: "UG",
              collegeName: emp.ugCollege,
              courseName: emp.ugDegree,
              cgpa: emp.ugCGPA || "",
              passedOutYear: emp.ugPassedOutYear || "",
              certificate: emp.ugDegreeCertificate || null,
            });
          }
          if (emp.pgCollege && emp.pgDegree) {
            backendCourses.push({
              id: Date.now() + Math.random(),
              courseType: "PG",
              collegeName: emp.pgCollege,
              courseName: emp.pgDegree,
              cgpa: emp.pgCGPA || "",
              passedOutYear: emp.pgPassedOutYear || "",
              certificate: emp.pgDegreeCertificate || null,
            });
          }
        }

        setFormData((prev) => ({
          ...prev,
          ...emp,

          gender: formatGender(emp.gender),
          status: emp.status || "",
          salary: emp.salary ?? "",

          dob: emp.dob?.split("T")[0] || "",
          dateJoined: emp.dateJoined?.split("T")[0] || "",
          toDate: emp.toDate?.split("T")[0] || "",
          dateRelieved: emp.dateRelieved?.split("T")[0] || "",

          previousExperiences: (emp.previousExperiences || []).map((exp, i) => ({
            ...exp,
            id: exp.id || `exp-${i}-${Date.now()}`,
          })),

          siblings: (emp.siblings || []).map((sib, i) => ({
            ...sib,
            id: sib.id || `sib-${i}-${Date.now()}`,
          })),

          courses: backendCourses.map((course, i) => ({
            ...course,
            id:
              course.id ||
              (course._id
                ? course._id.toString?.() ?? String(course._id)
                : `course-${i}-${Date.now()}`),
          })),

          isProfileCompleted: emp.isProfileCompleted ?? false,
          passedOutYear10: emp.passedOutYear10 || "",
          passedOutYear12: emp.passedOutYear12 || "",
          careerGaps: Array.isArray(emp.careerGaps) ? emp.careerGaps : [],

          picture: null
        }));

        if (Array.isArray(emp.careerGaps)) {
          const reasonsMap = {};
          emp.careerGaps.forEach((g) => {
            if (g && g.educationStage && g.reason) {
              reasonsMap[g.educationStage] = g.reason;
            }
          });
          setCareerGapReasons(reasonsMap);
          const firstReason = emp.careerGaps.find((g) => g && g.reason)?.reason;
          if (firstReason) setCareerGapReasonInput(firstReason);
        }

        if (emp.hasCertifications === "yes" || (Array.isArray(emp.professionalCertifications) && emp.professionalCertifications.length > 0)) {
          setHasCertifications("yes");
          const loadedCerts =
            Array.isArray(emp.professionalCertifications) && emp.professionalCertifications.length > 0
              ? emp.professionalCertifications.map((c, i) => ({
                  ...c,
                  id: c.id || c._id || `cert-${i}-${Date.now()}`,
                  certificateFile: null,
                  durationType: c.durationType || c.durationUnit || "Months",
                  durationUnit: c.durationUnit || c.durationType || "Months",
                }))
              : [
                  {
                    id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    courseName: "",
                    startMonthYear: "",
                    endMonthYear: "",
                    courseDuration: "",
                    durationValue: "",
                    durationType: "Months",
                    durationUnit: "Months",
                    courseType: "",
                    institutionName: "",
                    certificate: "",
                    certificateFile: null,
                  },
                ];
          setCertifications(loadedCerts);
        } else if (emp.hasCertifications === "no") {
          setHasCertifications("no");
          setCertifications([]);
        } else {
          setHasCertifications("");
          setCertifications([]);
        }

        if (emp.profileApprovalStatus) {
          setApprovalStatus(emp.profileApprovalStatus);
          setRejectionRemark(emp.rejectionRemark || "");
          setRejectedFields(Array.isArray(emp.rejectedFields) ? emp.rejectedFields : []);
        }
        if (emp.reviewedAt || emp.profileRejectedAt) {
          setReviewedAt(emp.reviewedAt || emp.profileRejectedAt);
        }

        if (!isAdmin) {
          await checkEditPermission();
        }
      }
    } catch (err) {
      console.error("❌ Fetch employee error:", err);
      showErrorModal("Fetch Error", "Failed to fetch employee data");
      if (!isAdmin) setPermissionsLoaded(true);
    }
  };

  useEffect(() => {
    fetchEmployee();
  }, [empId, isAdmin]);

  /* ================= AUTO-SCROLL TO TARGET MISSING FIELD ================= */
  useEffect(() => {
    if (permissionsLoaded && location.state?.scrollToField) {
      const field = location.state.scrollToField;

      if (["school12", "marks12", "marksheet12"].includes(field)) {
        setEducationPath("12th");
      }

      const timer = setTimeout(() => {
        const targetId = `field-wrapper-${field}`;
        let element = document.getElementById(targetId);

        if (!element && (field === "degreeCertificate" || field === "courses" || String(field).startsWith("courses.") || String(field).startsWith("course_"))) {
          const m = String(field).match(/courses\.(\d+)/) || String(field).match(/course_(\d+)/);
          const idx = m ? m[1] : "0";
          element =
            document.getElementById(`field-wrapper-courses.${idx}.certificate`) ||
            document.getElementById(`field-wrapper-courses-${idx}-certificate`) ||
            document.getElementById(`field-wrapper-course-certificate-${idx}`) ||
            (idx === "0" ? document.getElementById("field-wrapper-degreeCertificate") : null) ||
            document.getElementById("field-wrapper-degreeCertificate") ||
            document.getElementById("field-wrapper-courses") ||
            document.querySelector(".employeedetails-courses-section");
        } else if (!element && (field === "professionalCertifications" || String(field).startsWith("professionalCertifications.") || String(field).startsWith("prof_cert_"))) {
          const m = String(field).match(/professionalCertifications\.(\d+)/) || String(field).match(/prof_cert_(\d+)/);
          const idx = m ? m[1] : "0";
          element =
            document.getElementById(`field-wrapper-professionalCertifications.${idx}.certificate`) ||
            document.getElementById(`field-wrapper-professionalCertifications-${idx}-certificate`) ||
            document.getElementById(`field-wrapper-prof-cert-${idx}`) ||
            document.querySelector(".employeedetails-certifications-section");
        }

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          const inputEl = element.querySelector(
            "input:not([type='hidden']), select, textarea, .custom-dropdown, .employeedetails-detail-input, button:not(.employeedetails-visibility-toggle)"
          );
          const highlightTarget = inputEl || element;
          highlightTarget.classList.add("field-highlight-pulse");

          if (inputEl && typeof inputEl.focus === "function") {
            try {
              inputEl.focus({ preventScroll: true });
            } catch (e) { }
          }

          setTimeout(() => {
            highlightTarget.classList.remove("field-highlight-pulse");
          }, 1500);
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [permissionsLoaded, location.state]);

  /* ================= SCROLL AND HIGHLIGHT REJECTED FILE ================= */
  const scrollToTargetRejectedField = (fieldId) => {
    setActiveHighlightedRejectedField(fieldId);

    if (["school12", "marks12", "marksheet12", "certificate12"].includes(fieldId)) {
      setEducationPath("12th");
    }

    if (fieldId === "degreeCertificate" || fieldId === "courses") {
      setShowAddCourse(true);
    }

    setTimeout(() => {
      let target =
        document.getElementById(`field-wrapper-${fieldId}`) ||
        document.getElementById(`doc-card-${fieldId}`);

      if (!target) {
        if (fieldId === "certificate10" || fieldId === "marksheet10") {
          target = document.getElementById("field-wrapper-marksheet10") || document.getElementById("field-wrapper-school10");
        } else if (fieldId === "certificate12" || fieldId === "marksheet12") {
          target = document.getElementById("field-wrapper-marksheet12") || document.getElementById("field-wrapper-school12");
        } else if (fieldId.startsWith("courses.") || fieldId.startsWith("course_") || fieldId === "degreeCertificate" || fieldId === "courses") {
          const match = fieldId.match(/courses\.(\d+)/) || fieldId.match(/course_(\d+)/);
          const idx = match ? match[1] : "0";
          target =
            document.getElementById(`field-wrapper-courses.${idx}.certificate`) ||
            document.getElementById(`field-wrapper-courses-${idx}-certificate`) ||
            document.getElementById(`field-wrapper-course-certificate-${idx}`) ||
            (idx === "0" ? document.getElementById("field-wrapper-degreeCertificate") : null) ||
            document.getElementById("field-wrapper-degreeCertificate") ||
            document.getElementById("field-wrapper-courses") ||
            document.querySelector(".employeedetails-courses-section");
        } else if (fieldId.startsWith("professionalCertifications.") || fieldId.startsWith("prof_cert_") || fieldId === "professionalCertifications") {
          const match = fieldId.match(/professionalCertifications\.(\d+)/) || fieldId.match(/prof_cert_(\d+)/);
          const idx = match ? match[1] : "0";
          target =
            document.getElementById(`field-wrapper-professionalCertifications.${idx}.certificate`) ||
            document.getElementById(`field-wrapper-professionalCertifications-${idx}-certificate`) ||
            document.getElementById(`field-wrapper-prof-cert-${idx}`) ||
            document.querySelector(".employeedetails-certifications-section");
        } else if (fieldId === "education") {
          target =
            document.getElementById("field-wrapper-marksheet10") ||
            document.getElementById("field-wrapper-school10") ||
            document.querySelector(".employeedetails-education-group");
        } else if (fieldId === "kyc") {
          target =
            document.getElementById("field-wrapper-aadhaarFile") ||
            document.getElementById("field-wrapper-panFile") ||
            document.getElementById("field-wrapper-aadhaarNo");
        } else if (fieldId === "bank") {
          target =
            document.getElementById("field-wrapper-passbookFile") ||
            document.getElementById("field-wrapper-accountNumber");
        } else if (fieldId === "picture") {
          target =
            document.getElementById("field-wrapper-picture") ||
            document.querySelector(".employeedetails-profile-avatar-wrapper");
        }
      }

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });

        target.classList.remove("highlight-rejected-pulse-target");
        void target.offsetWidth; // force DOM reflow
        target.classList.add("highlight-rejected-pulse-target");

        const inputEl = target.querySelector(
          "input:not([type='hidden']), select, textarea, .custom-dropdown-trigger, .custom-dropdown, .employeedetails-detail-input, button:not(.employeedetails-visibility-toggle)"
        );
        if (inputEl && typeof inputEl.focus === "function") {
          try {
            inputEl.focus({ preventScroll: true });
          } catch (e) { }
        }

        setTimeout(() => {
          target.classList.remove("highlight-rejected-pulse-target");
        }, 5000);
      }
    }, 150);
  };

  /* ================= HANDLERS ================= */
  const handleChange = (key, value) => {
    markFieldAsUpdated(key);
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (key, file, inputElement) => {
    if (!file) {
      setFormData((prev) => ({ ...prev, [key]: null }));

      setFilePreviews((prev) => {
        const updated = { ...prev };
        if (updated[key]?.startsWith("blob:")) {
          URL.revokeObjectURL(updated[key]);
        }
        delete updated[key];
        return updated;
      });

      return;
    }

    markFieldAsUpdated(key);

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ];
    const maxSize = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      if (inputElement) inputElement.value = "";
      showErrorModal("Invalid File", "Only JPG, PNG, WEBP, PDF allowed");
      return;
    }

    if (file.size > maxSize) {
      if (inputElement) inputElement.value = "";
      showErrorModal("File Too Large", "Max size is 2MB");
      return;
    }

    /* ✅ CROP MODAL FOR PICTURE */
    if (key === "picture") {
      if (file.type === "application/pdf") {
        if (inputElement) inputElement.value = "";
        showErrorModal("Invalid File", "Profile picture must be an image (JPG, PNG, WEBP)");
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl);
      setShowCropModal(true);
      return;
    }

    setFormData((prev) => ({ ...prev, [key]: file }));

    const previewUrl = URL.createObjectURL(file);

    setFilePreviews((prev) => {
      if (prev[key]?.startsWith("blob:")) {
        URL.revokeObjectURL(prev[key]);
      }

      return {
        ...prev,
        [key]: previewUrl,
      };
    });
  };

  /* ================= MARKS VALIDATION HANDLER ================= */
  const validate12Marks = (sanitizedValue, totalLimit = marks12Total) => {
    if (!sanitizedValue || sanitizedValue.trim() === "") return "";
    const num = parseInt(sanitizedValue);
    if (isNaN(num)) return "Invalid marks";

    if (totalLimit === 600) {
      if (num > 600 && num <= 1200) {
        return "Marks exceed 600. Please select 1200 total marks if your maximum mark is 1200";
      }
      if (num < 100 || num > 600) {
        return "12th marks must be between 100 and 600";
      }
    } else if (totalLimit === 1200) {
      if (num < 100 || num > 1200) {
        return "12th marks must be between 100 and 1200";
      }
    }
    return "";
  };

  const handleMarksChange = (key, value) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    handleChange(key, sanitized);

    if (key === "marks10") {
      const num = parseInt(sanitized);
      if (sanitized === "") {
        setMarksErrors((prev) => ({ ...prev, marks10: "" }));
      } else if (isNaN(num) || num < 100 || num > 500) {
        setMarksErrors((prev) => ({
          ...prev,
          marks10: "10th marks must be between 100 and 500",
        }));
      } else {
        setMarksErrors((prev) => ({ ...prev, marks10: "" }));
      }
    } else if (key === "marks12") {
      const errorMsg = validate12Marks(sanitized, marks12Total);
      setMarksErrors((prev) => ({ ...prev, marks12: errorMsg }));
    }
  };

  const handleMarks12TotalChange = (newTotal) => {
    setMarks12Total(newTotal);
    if (formData.marks12) {
      const errorMsg = validate12Marks(formData.marks12, newTotal);
      setMarksErrors((prev) => ({ ...prev, marks12: errorMsg }));
    }
  };

  /* ================= PASSED-OUT YEAR & CAREER GAP HANDLERS ================= */
  const handleYearChange = (key, value) => {
    const sanitized = value.replace(/[^0-9]/g, "").slice(0, 4);
    handleChange(key, sanitized);

    const next10 = key === "passedOutYear10" ? sanitized : (formData.passedOutYear10 || "");
    const next12 = key === "passedOutYear12" ? sanitized : (formData.passedOutYear12 || "");

    let err10 = "";
    let err12 = "";

    const currentYear = new Date().getFullYear();

    if (next10.length === 4) {
      const n10 = parseInt(next10, 10);
      if (n10 < 1960 || n10 > currentYear) {
        err10 = `Year must be between 1960 and ${currentYear}`;
      }
    }

    if (next12.length === 4) {
      const n12 = parseInt(next12, 10);
      if (n12 < 1960 || n12 > currentYear + 2) {
        err12 = `Year must be between 1960 and ${currentYear + 2}`;
      }
    }

    if (next10.length === 4 && next12.length === 4 && !err10 && !err12 && (educationPath === "12th" || !educationPath)) {
      const gapInfo = calculate10to12Gap(next10, next12);
      if (gapInfo) {
        if (gapInfo.isInvalid) {
          err12 = `12th completion year cannot be before expected year (${gapInfo.expected12th})`;
        } else if (gapInfo.hasGap) {
          // A career gap is detected!
          // Open the popup if reason not provided yet
          if (!careerGapReasons["10th to 12th Standard"] && !careerGapReasonInput.trim()) {
            setActiveGapStage("10th to 12th Standard");
            setCareerGapReasonInput("");
            setShowCareerGapModal(true);
          }
        }
      }
    }

    // Check gap between 12th and existing college courses
    if (key === "passedOutYear12" && sanitized.length === 4 && !err12) {
      const y12 = parseInt(sanitized, 10);
      const ugCourse = (formData.courses || []).find((c) => {
        const ct = String(c?.courseType || "UG").toUpperCase();
        return ct === "UG" || ct === "ENGINEERING";
      });
      if (ugCourse) {
        const jYear = getCourseJoiningYear(ugCourse);
        if (jYear !== null && !isNaN(y12) && jYear > y12) {
          const stage = "12th Standard to UG / Engineering";
          if (!careerGapReasons[stage] || !careerGapReasons[stage].trim()) {
            setActiveGapStage(stage);
            setCareerGapReasonInput(careerGapReasons[stage] || "");
            setShowCareerGapModal(true);
          }
        }
      }
      const dipCourse12 = (formData.courses || []).find((c) => {
        const ct = String(c?.courseType || "").toUpperCase();
        return ct === "DIPLOMA";
      });
      if (dipCourse12) {
        const jYear = getCourseJoiningYear(dipCourse12);
        if (jYear !== null && !isNaN(y12) && jYear > y12) {
          const stage = "12th Standard to Diploma";
          if (!careerGapReasons[stage] || !careerGapReasons[stage].trim()) {
            setActiveGapStage(stage);
            setCareerGapReasonInput(careerGapReasons[stage] || "");
            setShowCareerGapModal(true);
          }
        }
      }
    }
    // Check gap between 10th and existing diploma course
    if (key === "passedOutYear10" && sanitized.length === 4 && !err10) {
      const y10 = parseInt(sanitized, 10);
      const dipCourse = (formData.courses || []).find((c) => {
        const ct = String(c?.courseType || "").toUpperCase();
        return ct === "DIPLOMA";
      });
      if (dipCourse) {
        const jYear = getCourseJoiningYear(dipCourse);
        if (jYear !== null && !isNaN(y10) && jYear > y10) {
          const stage = "10th to Diploma";
          if (!careerGapReasons[stage] || !careerGapReasons[stage].trim()) {
            setActiveGapStage(stage);
            setCareerGapReasonInput(careerGapReasons[stage] || "");
            setShowCareerGapModal(true);
          }
        }
      }
    }

    setYearErrors({
      passedOutYear10: err10,
      passedOutYear12: err12,
    });
  };

  const handleSaveCareerGapReason = () => {
    if (!careerGapReasonInput.trim()) {
      setCareerGapModalError("Reason for career gap is required.");
      return;
    }
    const currentGaps = calculateEligibleCareerGaps({
      passedOutYear10: formData.passedOutYear10,
      passedOutYear12: formData.passedOutYear12,
      educationPath,
      courses: formData.courses,
    });
    const targetGap = currentGaps.find((g) => g.educationStage === activeGapStage) || currentGaps[0];
    const stage = targetGap?.educationStage || activeGapStage || "12th Standard to UG / Engineering";
    const updatedReasons = {
      ...careerGapReasons,
      [stage]: careerGapReasonInput.trim(),
    };
    setCareerGapReasons(updatedReasons);
    markFieldAsUpdated("careerGaps");

    let newGaps = currentGaps.map((g) => ({
      ...g,
      reason: g.educationStage === stage ? careerGapReasonInput.trim() : (updatedReasons[g.educationStage] || ""),
    }));

    if (!newGaps.some((g) => g.educationStage === stage)) {
      const ugCourse = (formData.courses || []).find(
        (c) => String(c?.courseType || "UG").toUpperCase() === "UG" || String(c?.courseType || "").toUpperCase() === "ENGINEERING"
      );
      const joiningYear = ugCourse ? getCourseJoiningYear(ugCourse) : null;
      const y12Num = parseInt(String(formData.passedOutYear12 || "").trim(), 10);
      const gapYears = joiningYear && !isNaN(y12Num) && joiningYear > y12Num ? joiningYear - y12Num : 1;
      newGaps.push({
        educationStage: stage,
        passedOutYear12: String(formData.passedOutYear12 || ""),
        expectedUGYear: String(formData.passedOutYear12 || ""),
        actualUGYear: String(joiningYear || ""),
        gapDuration: gapYears,
        reason: careerGapReasonInput.trim(),
      });
    }

    setFormData((prev) => ({
      ...prev,
      careerGaps: newGaps.filter((g) => g.gapDuration > 0 && g.reason.length > 0),
    }));

    setShowCareerGapModal(false);
    setCareerGapModalError("");
    toast.success("Career gap reason recorded successfully.");
  };

  const handleEmergencyContactChange = (value) => {
    const cleaned = value.replace(/\D/g, "");
    const limited = cleaned.slice(0, 10);

    handleChange("emergencyContact", limited);

    if (limited === "") {
      setContactErrors((prev) => ({ ...prev, emergencyContact: "" }));
    } else if (!/^\d{10}$/.test(limited)) {
      setContactErrors((prev) => ({
        ...prev,
        emergencyContact: "Must be exactly 10 digits",
      }));
    } else {
      setContactErrors((prev) => ({ ...prev, emergencyContact: "" }));
    }
  };

  /* ================= EXPERIENCE VALIDATION ================= */
  const handleExperienceChange = (value) => {
    let cleaned = value.replace(/[^0-9.]/g, "");

    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    handleChange("experience", cleaned);
  };

  /* ================= FIXED handleKycChange ================= */
  const handleKycChange = (key, value) => {
    if (key === "aadhaarNo") {
      const sanitized = value.replace(/\D/g, "");
      handleChange(key, sanitized);

      if (sanitized === "") {
        setKycErrors((prev) => ({ ...prev, aadhaarNo: "" }));
      } else if (!/^\d{12}$/.test(sanitized)) {
        setKycErrors((prev) => ({
          ...prev,
          aadhaarNo: "Aadhaar must be exactly 12 digits",
        }));
      } else {
        setKycErrors((prev) => ({ ...prev, aadhaarNo: "" }));
      }
    }

    if (key === "panNo") {
      const upper = value.toUpperCase();
      handleChange(key, upper);

      if (upper === "") {
        setKycErrors((prev) => ({ ...prev, panNo: "" }));
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(upper)) {
        setKycErrors((prev) => ({
          ...prev,
          panNo: "Invalid PAN format (ABCDE1234F)",
        }));
      } else {
        setKycErrors((prev) => ({ ...prev, panNo: "" }));
      }
    }
  };

  /* ================= UNMASK HANDLERS ================= */
  const toggleAadhaarVisibility = async () => {
    if (!showAadhaar && formData.aadhaarNo.includes("X")) {
      try {
        setIsFetchingAadhaar(true);
        const url = isAdmin ? `/users/employee/${empId}?unmask=true` : `/users/get-employee?unmask=true`;
        const response = await portalInstance.get(url);
        if (response.data.success) {
          setFormData((prev) => ({ ...prev, aadhaarNo: response.data.data.aadhaarNo }));
        }
      } catch (err) {
        console.error("❌ Failed to unmask Aadhaar:", err);
      } finally {
        setIsFetchingAadhaar(false);
      }
    }
    setShowAadhaar(!showAadhaar);
  };

  const togglePanVisibility = async () => {
    if (!showPan && formData.panNo.includes("X")) {
      try {
        setIsFetchingPan(true);
        const url = isAdmin ? `/users/employee/${empId}?unmask=true` : `/users/get-employee?unmask=true`;
        const response = await portalInstance.get(url);
        if (response.data.success) {
          setFormData((prev) => ({ ...prev, panNo: response.data.data.panNo }));
        }
      } catch (err) {
        console.error("❌ Failed to unmask PAN:", err);
      } finally {
        setIsFetchingPan(false);
      }
    }
    setShowPan(!showPan);
  };

  /* ================= LOCAL MASK HELPERS ================= */
  const maskAadhaarLocal = (val) => {
    if (!val || val.includes("X") || val.length !== 12) return val;
    return "XXXX-XXXX-" + val.slice(-4);
  };

  const maskPanLocal = (val) => {
    if (!val || val.includes("X") || val.length !== 10) return val;
    return "XXXXX" + val.slice(5);
  };

  /* ================= IFSC VALIDATION HANDLER ================= */
  const handleIfscChange = (value) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    handleChange("ifscCode", upper);

    if (upper === "") {
      setBankErrors((prev) => ({ ...prev, ifscCode: "" }));
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(upper)) {
      setBankErrors((prev) => ({
        ...prev,
        ifscCode: "Invalid IFSC (e.g. HDFC0001234)",
      }));
    } else {
      setBankErrors((prev) => ({ ...prev, ifscCode: "" }));

      // Auto-fetch bank details when 11 digits are entered
      if (upper.length === 11) {
        const fetchBankDetails = async () => {
          try {
            setIsIFSCFetching(true);
            const response = await axios.get(`https://ifsc.razorpay.com/${upper}`);
            if (response.data) {
              setFormData(prev => ({
                ...prev,
                bankName: response.data.BANK || prev.bankName,
                branch: response.data.BRANCH || prev.branch
              }));
            }
          } catch (err) {
            console.error("❌ IFSC Fetch Error:", err);
          } finally {
            setIsIFSCFetching(false);
          }
        };
        fetchBankDetails();
      }
    }
  };

  /* ================= ACCOUNT NUMBER VALIDATION HANDLER ================= */
  const handleAccountNumberChange = (value) => {
    const cleaned = value.replace(/\D/g, "");
    handleChange("accountNumber", cleaned);

    if (cleaned === "") {
      setBankErrors((prev) => ({ ...prev, accountNumber: "" }));
    } else if (cleaned.length < 9 || cleaned.length > 18) {
      setBankErrors((prev) => ({
        ...prev,
        accountNumber: "Account number must be 9–18 digits",
      }));
    } else {
      setBankErrors((prev) => ({ ...prev, accountNumber: "" }));
    }
  };

  const handleMarksKeyDown = (e) => {
    const allowedKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Home", "End", ".",
    ];
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) return;
    if (allowedKeys.includes(e.key)) return;
    if (e.key >= "0" && e.key <= "9") return;
    e.preventDefault();
  };

  const handleNumberKeyDown = (e) => {
    const allowedKeys = [
      "Backspace", "Delete", "Tab", "Escape", "Enter",
      "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      "Home", "End", "."
    ];

    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) return;

    if (allowedKeys.includes(e.key)) return;

    if (e.key >= "0" && e.key <= "9") return;

    e.preventDefault();
  };

  /* ================= SIBLING / COURSE / EXPERIENCE HANDLERS ================= */
  const handleAddSibling = () => {
    if (newSibling.name.trim() === "" || newSibling.occupation.trim() === "") {
      showErrorModal("Validation Error", "Please fill in sibling name and occupation");
      return;
    }

    markFieldAsUpdated("siblings");
    setFormData((prev) => ({
      ...prev,
      siblings: [...prev.siblings, { ...newSibling, id: Date.now() }],
    }));

    setNewSibling({ relationship: "Brother", name: "", occupation: "" });
    setShowAddSibling(false);
  };

  const handleRemoveSibling = (index) => {
    markFieldAsUpdated("siblings");
    setFormData((prev) => ({
      ...prev,
      siblings: prev.siblings.filter((_, i) => i !== index),
    }));
  };

  const triggerCourseCareerGapCheck = useCallback((val, courseType = "UG", courseIndex = null) => {
    if (!val || typeof val !== "string") return;
    const match = val.trim().match(/^(\d{4})\s*-\s*(\d{4})$/);
    if (!match) return;

    const joiningYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);
    if (isNaN(joiningYear) || isNaN(endYear) || endYear <= joiningYear) return;

    const cType = String(courseType || "UG").toUpperCase();
    const str12 = String(formData.passedOutYear12 || "").trim();
    const str10 = String(formData.passedOutYear10 || "").trim();

    if (cType === "UG" || cType === "ENGINEERING") {
      if (str12.length === 4) {
        const y12 = parseInt(str12, 10);
        if (!isNaN(y12) && joiningYear > y12) {
          const stage = "12th Standard to UG / Engineering";
          if (!careerGapReasons[stage] || !careerGapReasons[stage].trim()) {
            setActiveGapStage(stage);
            setCareerGapReasonInput(careerGapReasons[stage] || "");
            setShowCareerGapModal(true);
          }
        }
      } else {
        const dipCourse = (formData.courses || []).find(
          (c, idx) => (courseIndex === null || idx !== courseIndex) && String(c?.courseType || "").toUpperCase() === "DIPLOMA"
        );
        if (dipCourse && dipCourse.passedOutYear) {
          const m = String(dipCourse.passedOutYear).match(/^(\d{4})\s*-\s*(\d{4})$/);
          if (m) {
            const dipEnd = parseInt(m[2], 10);
            if (!isNaN(dipEnd) && joiningYear > dipEnd) {
              const stage = "Diploma to UG / Engineering";
              if (!careerGapReasons[stage] || !careerGapReasons[stage].trim()) {
                setActiveGapStage(stage);
                setCareerGapReasonInput(careerGapReasons[stage] || "");
                setShowCareerGapModal(true);
              }
            }
          }
        }
      }
    } else if (cType === "DIPLOMA") {
      if (str12.length === 4) {
        const y12 = parseInt(str12, 10);
        if (!isNaN(y12) && joiningYear > y12) {
          const stage = "12th Standard to Diploma";
          if (!careerGapReasons[stage] || !careerGapReasons[stage].trim()) {
            setActiveGapStage(stage);
            setCareerGapReasonInput(careerGapReasons[stage] || "");
            setShowCareerGapModal(true);
          }
        }
      } else if (str10.length === 4) {
        const y10 = parseInt(str10, 10);
        if (!isNaN(y10) && joiningYear > y10) {
          const stage = "10th to Diploma";
          if (!careerGapReasons[stage] || !careerGapReasons[stage].trim()) {
            setActiveGapStage(stage);
            setCareerGapReasonInput(careerGapReasons[stage] || "");
            setShowCareerGapModal(true);
          }
        }
      }
    }
  }, [formData.passedOutYear12, formData.passedOutYear10, formData.courses, careerGapReasons]);

  const handleAddCourse = () => {
    if (
      newCourse.collegeName.trim() === "" ||
      newCourse.courseName.trim() === ""
    ) {
      showErrorModal("Validation Error", "Please fill college and course");
      return;
    }

    const cgpaError = validateCgpa(newCourse.cgpa);
    const yearError = validateYearRange(newCourse.passedOutYear, newCourse.courseType);

    if (cgpaError || yearError) {
      setCourseErrors({
        cgpa: cgpaError,
        passedOutYear: yearError,
      });

      showErrorModal("Validation Error", yearError || "Fix course fields before adding");
      return;
    }

    markFieldAsUpdated("courses");
    markFieldAsUpdated("degreeCertificate");

    const courseYear = newCourse.passedOutYear || "";
    let courseJoiningYear = newCourse.joiningYear || "";
    if (!courseJoiningYear && courseYear) {
      const match = courseYear.match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (match) courseJoiningYear = match[1];
    }

    const courseToAdd = {
      ...newCourse,
      joiningYear: courseJoiningYear,
      id: Date.now(),
      certificate: null,
    };

    setFormData((prev) => ({
      ...prev,
      courses: [...prev.courses, courseToAdd],
    }));

    // Check for career gap popup when adding course!
    if (newCourse.passedOutYear) {
      triggerCourseCareerGapCheck(newCourse.passedOutYear, newCourse.courseType || "UG");
    }

    setNewCourse({
      courseType: educationPath === "Diploma" ? "Diploma" : "UG",
      collegeName: "",
      courseName: "",
      cgpa: "",
      passedOutYear: "",
      certificate: null,
    });

    setCourseErrors({
      cgpa: "",
      passedOutYear: "",
    });

    setShowAddCourse(false);
  };

  const handleRemoveCourse = (index) => {
    markFieldAsUpdated("courses");
    markFieldAsUpdated("degreeCertificate");
    setFormData((prev) => ({
      ...prev,
      courses: prev.courses.filter((_, i) => i !== index),
    }));
  };

  const handleCourseChange = (index, field, value) => {
    markFieldAsUpdated("courses");
    markFieldAsUpdated("degreeCertificate");
    let detectedJoiningYear = null;
    if (field === "passedOutYear") {
      const match = String(value).match(/^(\d{4})\s*-\s*(\d{4})$/);
      if (match) detectedJoiningYear = match[1];
    }
    setFormData((prev) => {
      const updatedCourses = [...prev.courses];
      let joiningYear = updatedCourses[index]?.joiningYear;
      if (detectedJoiningYear) joiningYear = detectedJoiningYear;
      updatedCourses[index] = { ...updatedCourses[index], [field]: value, ...(joiningYear ? { joiningYear } : {}) };
      return { ...prev, courses: updatedCourses };
    });

    if (field === "passedOutYear" && String(value).trim().length === 9) {
      const cType = formData.courses[index]?.courseType || "UG";
      triggerCourseCareerGapCheck(value, cType, index);
    }
  };

  const validateCgpa = (value) => {
    if (!value) return "";

    const num = parseFloat(value);

    if (isNaN(num)) return "Only numbers allowed";

    if (num >= 0 && num <= 10) return "";

    if (num > 10 && num <= 100) return "";

    return "Enter valid CGPA (0-10) or Percentage (0-100)";
  };

  const validateYearRange = (value, courseType = "UG") => {
    if (!value) return "";

    const regex = /^(19|20)\d{2}-(19|20)\d{2}$/;

    if (!regex.test(value)) {
      return "Format must be YYYY-YYYY (e.g. 2021-2024)";
    }

    const [start, end] = value.split("-").map(Number);

    if (end <= start) {
      return "End year must be greater than start year";
    }

    // Check college start year vs 12th passed-out year
    const cType = String(courseType || "UG").toUpperCase();
    const str12 = String(formData.passedOutYear12 || "").trim();
    const str10 = String(formData.passedOutYear10 || "").trim();

    if ((cType === "UG" || cType === "PG" || cType === "ENGINEERING") && str12.length === 4) {
      const y12 = parseInt(str12, 10);
      if (!isNaN(y12) && start < y12) {
        return `College start year cannot be before 12th passed-out year (${y12})`;
      }
      // Note: start === y12 is completely valid, no error shown!
    }

    // Check diploma start year vs 12th or 10th passed-out year
    if (cType === "DIPLOMA") {
      if (str12.length === 4) {
        const y12 = parseInt(str12, 10);
        if (!isNaN(y12) && start < y12) {
          return `Diploma start year cannot be before 12th passed-out year (${y12})`;
        }
      } else if (str10.length === 4) {
        const y10 = parseInt(str10, 10);
        if (!isNaN(y10) && start < y10) {
          return `Diploma start year cannot be before 10th passed-out year (${y10})`;
        }
      }
      // Note: start === y10 or start === y12 is completely valid, no error shown!
    }

    return "";
  };

  const handleCourseFileChange = (index, file, inputElement) => {
    if (!file) {
      setFormData((prev) => {
        const updatedCourses = [...prev.courses];
        updatedCourses[index] = { ...updatedCourses[index], certificate: null };
        return { ...prev, courses: updatedCourses };
      });
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ];
    const maxSize = 2 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      if (inputElement) inputElement.value = "";
      showErrorModal("Invalid File", "Only JPG, PNG, WEBP, PDF allowed");
      return;
    }

    if (file.size > maxSize) {
      if (inputElement) inputElement.value = "";
      showErrorModal("File Too Large", "Max size is 2MB");
      return;
    }

    markFieldAsUpdated("degreeCertificate");
    markFieldAsUpdated("courses");
    markFieldAsUpdated(`courses.${index}.certificate`);
    markFieldAsUpdated(`course_${index}`);

    setFormData((prev) => {
      const updatedCourses = [...prev.courses];
      updatedCourses[index] = { ...updatedCourses[index], certificate: file };
      return { ...prev, courses: updatedCourses };
    });

    const previewUrl = URL.createObjectURL(file);
    const courseId = formData.courses[index]?.id;
    if (courseId) {
      setFilePreviews((prev) => {
        if (prev[`course_${courseId}_certificate`]?.startsWith("blob:")) {
          URL.revokeObjectURL(prev[`course_${courseId}_certificate`]);
        }
        return {
          ...prev,
          [`course_${courseId}_certificate`]: previewUrl,
        };
      });
    }
  };

  const handleAddPreviousExperience = () => {
    markFieldAsUpdated("previousExperiences");
    setFormData((prev) => ({
      ...prev,
      previousExperiences: [
        ...prev.previousExperiences,
        {
          id: Date.now(),
          previousCompany: "",
          employmentType: "Full-time",
          designation: "",
          department: "",
          dateOfJoining: "",
          lastWorkingDate: "",
          totalExperience: "",
          previousSalary: "",
        },
      ],
    }));
  };

  const handlePreviousExperienceChange = (index, field, value) => {
    markFieldAsUpdated("previousExperiences");
    setFormData((prev) => {
      const updatedExperiences = [...prev.previousExperiences];
      updatedExperiences[index] = { ...updatedExperiences[index], [field]: value };
      return { ...prev, previousExperiences: updatedExperiences };
    });
  };

  const handleRemovePreviousExperience = (index) => {
    markFieldAsUpdated("previousExperiences");
    setFormData((prev) => ({
      ...prev,
      previousExperiences: prev.previousExperiences.filter((_, i) => i !== index),
    }));
  };

  /* ================= PERMISSION CHECK ================= */
  const adminBlockedFields = []; // Admin/HR can edit all details

  const isFieldRejected = (field) => {
    if (approvalStatus !== "rejected") return false;
    if (!rejectedFields || rejectedFields.length === 0) return true;
    if (rejectedFields.includes(field)) return true;
    if (field === "marksheet10" && (rejectedFields.includes("certificate10") || rejectedFields.includes("marksheet10"))) return true;
    if (field === "certificate10" && (rejectedFields.includes("marksheet10") || rejectedFields.includes("certificate10"))) return true;
    if (field === "marksheet12" && (rejectedFields.includes("certificate12") || rejectedFields.includes("marksheet12"))) return true;
    if (field === "certificate12" && (rejectedFields.includes("marksheet12") || rejectedFields.includes("certificate12"))) return true;
    if (
      (field === "degreeCertificate" || field === "courses" || String(field).startsWith("course_") || String(field).startsWith("courses.")) &&
      (rejectedFields.includes("degreeCertificate") || rejectedFields.includes("courses") || rejectedFields.some((rf) => String(rf).startsWith("course_") || String(rf).startsWith("courses.")))
    ) return true;
    if (
      (field === "professionalCertifications" || String(field).startsWith("prof_cert_") || String(field).startsWith("professionalCertifications.")) &&
      (rejectedFields.includes("professionalCertifications") || rejectedFields.some((rf) => String(rf).startsWith("prof_cert_") || String(rf).startsWith("professionalCertifications.")))
    ) return true;
    if (rejectedFields.includes("kyc") && ["aadhaarNo", "panNo", "aadhaarFile", "panFile"].includes(field)) return true;
    if (rejectedFields.includes("bank") && ["bankName", "accountHolder", "accountNumber", "ifscCode", "branch", "passbookFile"].includes(field)) return true;
    if (rejectedFields.includes("education") && ["school10", "marks10", "marksheet10", "certificate10", "passedOutYear10", "school12", "marks12", "marksheet12", "certificate12", "passedOutYear12", "careerGaps", "educationPath", "courses", "degreeCertificate", "professionalCertifications"].includes(field)) return true;
    if (rejectedFields.includes("personal") && ["dob", "gender", "phone", "emergencyContact", "bloodGroup", "address"].includes(field)) return true;
    if (rejectedFields.includes("family") && ["fatherName", "motherName", "fatherOccupation", "motherOccupation", "siblings"].includes(field)) return true;
    if (rejectedFields.includes("working") && ["previousExperiences", "department", "designation", "experience"].includes(field)) return true;
    return false;
  };

  const canEditField = (field) => {
    if (isHrRestrictedFromEdit) {
      return false;
    }

    if (isPrivileged) {
      return true;
    }

    // Salary editing is strictly restricted to Admin and HR
    if (field === "salary") {
      return false;
    }

    if (approvalStatus === "rejected") {
      if (["salary", "status", "employmentStatus"].includes(field)) {
        return false;
      }
      if (rejectedFields.length > 0 && !rejectedFields.includes("ALL")) {
        if (!field) {
          return canEditProfile;
        }
        return isFieldRejected(field);
      }
      return true;
    }

    if (formData.isProfileCompleted === false) {
      if (["salary", "status", "employmentStatus"].includes(field)) {
        return false;
      }
      return true;
    }

    if (allowedFields.includes("ALL")) return true;

    if (!field) {
      return canEditProfile;
    }

    return allowedFields.includes(field);
  };

  /* ================= SECTION FIELD MAP ================= */
  const sectionFieldMap = {
    basic: ["name", "email", "status"],
    personal: ["dob", "gender", "phone", "emergencyContact", "bloodGroup", "address"],
    family: ["fatherName", "fatherOccupation", "motherName", "motherOccupation", "siblings"],
    siblings: ["siblings"],
    working: [
      "department", "designation", "status",
      "experience", "salary", "previousExperiences",
    ],
    education: [
      "school10", "marks10", "marksheet10", "certificate10", "passedOutYear10",
      "school12", "marks12", "marksheet12", "certificate12", "passedOutYear12",
      "educationPath", "careerGaps",
    ],
    courses: ["courses", "degreeCertificate", "professionalCertifications"],
    kyc: ["aadhaarNo", "panNo", "aadhaarFile", "panFile"],
    pf: ["pfNo", "uanNo"],
    bank: ["bankName", "accountHolder", "accountNumber", "ifscCode", "branch", "toDate", "passbookFile"],
    documents: ["picture"],
  };

  const isRejectedMode = Boolean(
    !effectiveIsAdmin &&
    approvalStatus === "rejected" &&
    rejectedFields &&
    rejectedFields.length > 0 &&
    !rejectedFields.includes("ALL")
  );

  const getVisibleSections = () => {
    if (!permissionsLoaded) return [];

    if (isPrivileged || isHrRestrictedFromEdit) return Object.keys(sectionFieldMap);

    if (approvalStatus === "rejected") {
      if (rejectedFields && rejectedFields.length > 0 && !rejectedFields.includes("ALL")) {
        return Object.keys(sectionFieldMap).filter((section) =>
          rejectedFields.includes(section) ||
          sectionFieldMap[section].some((field) => isFieldRejected(field))
        );
      }
      return Object.keys(sectionFieldMap);
    }

    if (formData.isProfileCompleted === false) {
      return Object.keys(sectionFieldMap);
    }

    if (canEditProfile && allowedFields.length > 0 && !allowedFields.includes("ALL")) {
      return Object.keys(sectionFieldMap).filter((section) =>
        allowedFields.includes(section) ||
        sectionFieldMap[section].some((field) =>
          allowedFields.includes(field)
        )
      );
    }

    if (allowedFields.includes("ALL")) {
      return Object.keys(sectionFieldMap);
    }

    return [];
  };

  const visibleSections = getVisibleSections();

  const getMissingFields = () => {
    const requiredFields = [
      { key: "dob", label: "Date of Birth" },
      { key: "gender", label: "Gender" },
      { key: "phone", label: "Phone" },
      { key: "emergencyContact", label: "Emergency Contact" },
      { key: "bloodGroup", label: "Blood Group" },
      { key: "address", label: "Address" },
      { key: "fatherName", label: "Father Name" },
      { key: "motherName", label: "Mother Name" },
      { key: "motherOccupation", label: "Mother Occupation" },
      { key: "fatherOccupation", label: "Father Occupation" },
      { key: "status", label: "Employment Status" },
      { key: "school10", label: "10th School" },
      { key: "marks10", label: "10th Marks" },
      { key: "passedOutYear10", label: "10th Passed-Out Year" },
      { key: "marksheet10", label: "10th Marksheet" },
      { key: "courses", label: "Course Details" },
      { key: "degreeCertificate", label: "Degree Certificate" },
      { key: "aadhaarNo", label: "Aadhaar Number" },
      { key: "panNo", label: "PAN Number" },
      { key: "bankName", label: "Bank Name" },
      { key: "accountHolder", label: "Account Holder" },
      { key: "accountNumber", label: "Account Number" },
      { key: "ifscCode", label: "IFSC Code" },
      { key: "branch", label: "Branch Name" },
      { key: "passbookFile", label: "Bank Passbook" },
      { key: "aadhaarFile", label: "Aadhaar Upload" },
      { key: "panFile", label: "PAN Card Document" },
    ];

    if (educationPath === "12th" || (!educationPath && (formData.school12 || formData.marks12 || formData.marksheet12))) {
      requiredFields.splice(15, 0,
        { key: "school12", label: "12th School" },
        { key: "marks12", label: "12th Marks" },
        { key: "passedOutYear12", label: "12th Passed-Out Year" },
        { key: "marksheet12", label: "12th Marksheet" }
      );
    }

    const hasCourseCertificate =
      (Array.isArray(formData.courses) &&
        formData.courses.length > 0 &&
        formData.courses.some(
          (c) =>
            c &&
            ((c.certificate instanceof File) ||
              (typeof c.certificate === "string" && c.certificate.trim() !== "") ||
              (typeof c.certificateUrl === "string" && c.certificateUrl.trim() !== ""))
        )) ||
      (formData.degreeCertificate instanceof File) ||
      (typeof formData.degreeCertificate === "string" && formData.degreeCertificate.trim() !== "") ||
      (typeof formData.degreeCertificateUrl === "string" && formData.degreeCertificateUrl.trim() !== "") ||
      (typeof formData.ugDegreeCertificate === "string" && formData.ugDegreeCertificate.trim() !== "") ||
      (typeof formData.pgDegreeCertificate === "string" && formData.pgDegreeCertificate.trim() !== "");

    const missing = requiredFields
      .filter(({ key }) => {
        if (key === "degreeCertificate") {
          return !hasCourseCertificate;
        }

        const val = formData[key];

        if (val === null || val === undefined) return true;

        if (typeof val === "string" && val.trim() === "") return true;

        if (Array.isArray(val) && val.length === 0) return true;

        return false;
      })
      .map((f) => f.label);

    if (hasCertifications === "yes") {
      if (certifications.length === 0) {
        missing.push("Professional Certifications (Please add certification or select No)");
      } else {
        const hasInvalidCert = certifications.some((c) => {
          return (
            !c.courseName?.trim() ||
            !c.startMonthYear ||
            !c.endMonthYear ||
            !c.courseType?.trim() ||
            !c.institutionName?.trim()
          );
        });
        if (hasInvalidCert) {
          missing.push("Professional Certifications Details");
        }
      }
    } else if (hasCertifications === "") {
      missing.push("Professional Certifications (Please select Yes or No)");
    }

    return missing;
  };

  const missingFields = getMissingFields();
  const effectiveCompletion = missingFields.length === 0 ? 100 : profileCompletion;

  const handleSave = async () => {
    if (educationPath === "Diploma" && (formData.school12 || formData.marks12)) {
      showErrorModal("Error", "Diploma students cannot fill 12th details");
      return;
    }

    if (educationPath === "12th" && (!formData.school12 || !formData.marks12)) {
      showErrorModal("Error", "12th details are required");
      return;
    }

    if (educationPath === "Diploma") {
      const hasDiplomaCourse = Array.isArray(formData.courses) && formData.courses.some(
        (c) => c && c.courseType === "Diploma" && ((c.collegeName && c.collegeName.trim() !== "") || (c.courseName && c.courseName.trim() !== ""))
      );
      if (!hasDiplomaCourse) {
        showErrorModal("Error", "Diploma details are required");
        return;
      }
    }

    const marks10Num = parseInt(formData.marks10);
    const marks12Num = parseInt(formData.marks12);

    if (
      formData.marks10 !== "" &&
      (isNaN(marks10Num) || marks10Num < 100 || marks10Num > 500)
    ) {
      showErrorModal("Validation Error", "10th marks must be between 100 and 500");
      return;
    }

    if (formData.marks12 !== "") {
      if (marks12Total === 600) {
        if (marks12Num > 600 && marks12Num <= 1200) {
          showErrorModal(
            "Validation Error",
            "Marks exceed 600. Please select 1200 total marks if your maximum mark is 1200"
          );
          return;
        }
        if (isNaN(marks12Num) || marks12Num < 100 || marks12Num > 600) {
          showErrorModal("Validation Error", "12th marks must be between 100 and 600");
          return;
        }
      } else if (marks12Total === 1200) {
        if (isNaN(marks12Num) || marks12Num < 100 || marks12Num > 1200) {
          showErrorModal("Validation Error", "12th marks must be between 100 and 1200");
          return;
        }
      }
    }

    if (yearErrors.passedOutYear10 || yearErrors.passedOutYear12) {
      showErrorModal("Validation Error", yearErrors.passedOutYear10 || yearErrors.passedOutYear12);
      return;
    }

    if (educationPath === "12th") {
      if (formData.passedOutYear10 && formData.passedOutYear12) {
        const gapInfo = calculate10to12Gap(formData.passedOutYear10, formData.passedOutYear12);
        if (gapInfo && gapInfo.isInvalid) {
          showErrorModal("Validation Error", `12th completion year cannot be before expected year (${gapInfo.expected12th})`);
          return;
        }
      }
    }

    const eligibleGaps = calculateEligibleCareerGaps({
      passedOutYear10: formData.passedOutYear10,
      passedOutYear12: formData.passedOutYear12,
      educationPath,
      courses: formData.courses,
    });

    const missingReasonGap = eligibleGaps.find(
      (g) => !(careerGapReasons[g.educationStage] || (eligibleGaps.length === 1 && careerGapReasonInput.trim()))
    );

    if (missingReasonGap) {
      setActiveGapStage(missingReasonGap.educationStage);
      setCareerGapReasonInput(careerGapReasons[missingReasonGap.educationStage] || "");
      setShowCareerGapModal(true);
      showErrorModal(
        "Career Gap Reason Required",
        `A career gap of ${missingReasonGap.gapDuration} year(s) was detected for ${missingReasonGap.educationStage}. Please provide the reason before saving.`
      );
      return;
    }

    if (canEditField("aadhaarNo") && (kycErrors.aadhaarNo || (formData.aadhaarNo && !formData.aadhaarNo.includes("X") && !/^\d{12}$/.test(formData.aadhaarNo)))) {
      showErrorModal("Validation Error", kycErrors.aadhaarNo || "Aadhaar must be 12 digits");
      return;
    }

    if (canEditField("panNo") && (kycErrors.panNo || (formData.panNo && !formData.panNo.includes("X") && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNo)))) {
      showErrorModal("Validation Error", kycErrors.panNo || "Invalid PAN format (ABCDE1234F)");
      return;
    }

    if (canEditField("emergencyContact") && (contactErrors.emergencyContact || (formData.emergencyContact && !/^\d{10}$/.test(formData.emergencyContact)))) {
      showErrorModal("Validation Error", contactErrors.emergencyContact || "Emergency Contact must be 10 digits");
      return;
    }

    if (bankErrors.ifscCode) {
      showErrorModal("Validation Error", "Fix IFSC code before saving");
      return;
    }

    if (
      formData.ifscCode &&
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)
    ) {
      showErrorModal("Validation Error", "Invalid IFSC format");
      return;
    }

    if (bankErrors.accountNumber) {
      showErrorModal("Validation Error", "Fix Account Number before saving");
      return;
    }

    if (
      formData.accountNumber &&
      (formData.accountNumber.length < 9 || formData.accountNumber.length > 18)
    ) {
      showErrorModal("Validation Error", "Account number must be 9–18 digits");
      return;
    }

    if (isHrRestrictedFromEdit) {
      showErrorModal("Permission Denied", "Direct editing of employee details is disabled for HR by Administrator Configuration.");
      toast.warning("Direct editing of employee details is disabled for HR by Administrator Configuration.");
      return;
    }

    if (!effectiveIsAdmin && !canEditProfile) {
      showErrorModal("Permission Denied", editMessage || "Permission denied");
      return;
    }

    for (const course of formData.courses) {
      const cgpaError = validateCgpa(course.cgpa);
      const yearError = validateYearRange(course.passedOutYear, course.courseType);

      if (cgpaError || yearError) {
        showErrorModal(
          "Validation Error",
          yearError || `Invalid data in course: ${course.courseName || "Unnamed"}`
        );
        return;
      }
    }

    if (canEditField("courses") && hasCertifications === "yes") {
      if (certifications.length === 0) {
        showErrorModal(
          "Validation Error",
          "You selected 'Yes' for certifications. Please add at least one certification or select 'No'."
        );
        return;
      }
      for (let i = 0; i < certifications.length; i++) {
        const c = certifications[i];
        if (!c.courseName?.trim()) {
          showErrorModal("Validation Error", `Certification #${i + 1}: Course Name is required.`);
          return;
        }
        if (!c.startMonthYear) {
          showErrorModal("Validation Error", `Certification #${i + 1}: Start Month and Year is required.`);
          return;
        }
        if (!c.endMonthYear) {
          showErrorModal("Validation Error", `Certification #${i + 1}: End Month and Year is required.`);
          return;
        }
        if (c.startMonthYear && c.endMonthYear && c.startMonthYear > c.endMonthYear) {
          showErrorModal("Validation Error", `Certification #${i + 1}: End Month and Year must be after or same as Start Month and Year.`);
          return;
        }
        if (!c.courseType?.trim()) {
          showErrorModal("Validation Error", `Certification #${i + 1}: Course Type is required.`);
          return;
        }
        if (!c.institutionName?.trim()) {
          showErrorModal("Validation Error", `Certification #${i + 1}: Institution / College Name is required.`);
          return;
        }
      }
    }

    try {
      setIsSaving(true);

      let safeStatus = formData.status;

      if (Array.isArray(safeStatus)) {
        safeStatus = safeStatus[0];
      }

      if (typeof safeStatus === "string") {
        safeStatus = safeStatus.toLowerCase().trim();
      }

      let safeDateRelieved = formData.dateRelieved;

      if (safeStatus !== "relieved") {
        safeDateRelieved = "";
      }

      const form = new FormData();

      const textFields = [
        "name", "email", "role",
        "dob", "gender", "phone", "emergencyContact",
        "bloodGroup", "address", "fatherName", "motherName",
        "fatherOccupation", "motherOccupation", "department",
        "designation", "status", "dateRelieved", "experience", "salary",
        "school10", "marks10", "passedOutYear10", "school12", "marks12", "passedOutYear12",
        "aadhaarNo", "panNo", "uanNo", "pfNo",
        "bankName", "accountHolder", "accountNumber", "ifscCode", "branch", "toDate",
      ];

      textFields.forEach((field) => {
        if (
          (
            field !== "dateRelieved"
              ? (isAdmin || canEditField(field))
              : isAdmin
          ) &&
          formData[field] !== undefined &&
          formData[field] !== null
        ) {
          let value = formData[field];

          if (field === "status") {
            value = safeStatus;
          }

          if (field === "dateRelieved") {
            value = safeDateRelieved;
          }

          if (value !== "") {
            form.append(field, value);
          }
        }
      });

      if (isAdmin || canEditField("siblings")) {
        form.append("siblings", JSON.stringify(formData.siblings || []));
      }

      if (isAdmin || canEditField("previousExperiences")) {
        form.append("previousExperiences", JSON.stringify(formData.previousExperiences || []));
      }

      if (isAdmin || canEditField("courses")) {
        const coursesPayload = (formData.courses || []).map((c) => {
          const { certificate, certificateUrl, ...rest } = c;
          return {
            ...rest,
            certificate: typeof certificate === "string" && certificate.trim() !== "" ? certificate : undefined,
          };
        });
        form.append("courses", JSON.stringify(coursesPayload));
      }

      // Career Gap Payload (Eligible transitions only) - only saved when positive gap + reason provided
      let careerGapsPayload = [];
      const eligibleGaps = calculateEligibleCareerGaps({
        passedOutYear10: formData.passedOutYear10,
        passedOutYear12: formData.passedOutYear12,
        educationPath,
        courses: formData.courses,
      });

      careerGapsPayload = eligibleGaps
        .map((g) => {
          const reason =
            careerGapReasons[g.educationStage] ||
            (eligibleGaps.length === 1 ? careerGapReasonInput.trim() : "") ||
            (Array.isArray(formData.careerGaps) ? formData.careerGaps.find((cg) => cg && cg.educationStage === g.educationStage)?.reason : "");
          return {
            ...g,
            reason: (reason || "").trim(),
          };
        })
        .filter((g) => g.gapDuration > 0 && g.reason.length > 0);

      form.append("careerGaps", JSON.stringify(careerGapsPayload));

      form.append("educationPath", educationPath);

      // Include additional certifications
      form.append("hasCertifications", hasCertifications || "no");
      if (hasCertifications === "yes" && certifications.length > 0) {
        const certsPayload = certifications.map(({ certificateFile, certificateUrl, ...rest }) => rest);
        form.append("professionalCertifications", JSON.stringify(certsPayload));
        certifications.forEach((cert, idx) => {
          if (cert.certificateFile instanceof File) {
            form.append(`cert_${idx}_certificate`, cert.certificateFile);
          }
        });
      } else {
        form.append("professionalCertifications", JSON.stringify([]));
      }

      const singleFiles = [
        { field: "picture", data: formData.picture },
        { field: "marksheet10", data: formData.marksheet10 },
        { field: "marksheet12", data: formData.marksheet12 },
        { field: "aadhaarFile", data: formData.aadhaarFile },
        { field: "panFile", data: formData.panFile },
        { field: "passbookFile", data: formData.passbookFile },
      ];

      singleFiles.forEach(({ field, data }) => {
        if ((isAdmin || canEditField(field)) && data instanceof File) {
          form.append(field, data);
        }
      });

      if ((isAdmin || canEditField("courses")) && formData.courses?.length) {
        formData.courses.forEach((course, idx) => {
          if (course.certificate instanceof File) {
            if (course.id) {
              form.append(`course_${course.id}_certificate`, course.certificate);
            }
            if (course._id) {
              form.append(`course_${course._id}_certificate`, course.certificate);
            }
            form.append(`course_${idx}_certificate`, course.certificate);
          }
        });
      }

      // If user is HR (not Super Admin), submit changes for Admin approval
      if (isAdmin && user?.isHr && user?.role !== "admin") {
        const changes = [];
        const employeeFields = ["name", "email", "phone", "department", "designation", "status", "salary", "dateRelieved"];
        const employeeUpdate = {};
        const detailsUpdate = {};

        const normalizeVal = (f, v) => {
          if (v === null || v === undefined) return "";
          let s = String(v).trim();
          if (["dob", "dateJoined", "toDate", "dateRelieved"].includes(f) || /^\d{4}-\d{2}-\d{2}T/.test(s)) {
            return s.split("T")[0];
          }
          if (f === "gender") {
            return s.toLowerCase();
          }
          if (f === "salary" || f === "marks10" || f === "marks12") {
            return String(Number(s) || s);
          }
          return s;
        };

        textFields.forEach((field) => {
          const prevVal = originalData ? originalData[field] : undefined;
          let newVal = formData[field];
          if (field === "status") newVal = safeStatus;
          if (field === "dateRelieved") newVal = safeDateRelieved;

          const normPrev = normalizeVal(field, prevVal);
          const normNew = normalizeVal(field, newVal);

          if (newVal !== undefined && newVal !== null && normNew !== normPrev) {
            changes.push({
              fieldName: field.charAt(0).toUpperCase() + field.slice(1),
              from: prevVal ?? "-",
              to: newVal
            });
            if (employeeFields.includes(field)) {
              employeeUpdate[field] = newVal;
            } else {
              detailsUpdate[field] = newVal;
            }
          }
        });

        if (employeeUpdate.salary !== undefined) {
          employeeUpdate.salary = Number(employeeUpdate.salary);
        }

        detailsUpdate.careerGaps = careerGapsPayload;

        const reqPayload = {
          actionType: "EDIT_EMPLOYEE",
          targetModule: "EMPLOYEE",
          summary: `Edit profile for ${formData.name || "Employee"} (${formData.empIdString || formData.empId || empId})`,
          payload: {
            empId: originalData?._id || empId,
            empIdString: formData.empIdString || formData.empId || empId,
            empName: formData.name || originalData?.name,
            employeeUpdate,
            detailsUpdate,
            previousData: originalData || {},
            updatedData: { ...employeeUpdate, ...detailsUpdate },
            changes: changes.length > 0 ? changes : [{ fieldName: "Profile Details", from: "Previous", to: "Updated" }]
          }
        };

        const hrRes = await portalInstance.post("/hr-approval/submit", reqPayload);
        if (hrRes.data.success) {
          showSuccessModal(
            "Submitted for Admin Approval",
            "Your edit request has been sent to the Admin for approval. The updates will take effect once reviewed.",
            false
          );
          toast.success("Your edit request has been sent to the Admin for approval.");
          return;
        } else {
          showErrorModal("Submission Failed", hrRes.data.message || "Failed to submit request.");
          return;
        }
      }

      let response;

      if (isAdmin) {
        response = await portalInstance.put(
          `/users/admin/employee/${empId}/update`,
          form
        );
      } else {
        response = await portalInstance.put("/users/update-employee", form);
      }

      if (response.data.success) {
        await fetchEmployee();

        const updatedCompletion = response.data.profileCompletion ?? effectiveCompletion;
        const reached100 = updatedCompletion >= 100;
        try {
          const sessionRaw = sessionStorage.getItem("Erti-Portal");
          if (sessionRaw) {
            const parsed = JSON.parse(sessionRaw);
            parsed.profileCompletion = updatedCompletion;
            if (reached100) {
              parsed.isProfileCompleted = true;
              parsed.isProfileRestricted = false;
            }
            sessionStorage.setItem("Erti-Portal", JSON.stringify(parsed));
            if (setUser) setUser(parsed);
          }
        } catch (e) {
          console.error("Session sync error:", e);
        }

        const successMsg = response.data.message || (approvalStatus === "rejected"
          ? "Profile re-submitted for Admin review and approval successfully!"
          : "Your changes have been saved successfully.");

        showSuccessModal(
          approvalStatus === "rejected" ? "Resubmitted for Review" : "Profile Updated",
          successMsg,
          !isAdmin
        );
      } else {
        showErrorModal("Update Failed", response.data.message || "Save failed");
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      showErrorModal(
        "Error",
        "Error while saving: " +
        (err.response?.data?.message || err.message || "Unknown error")
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* ================= FILE PREVIEW HELPERS ================= */
  const getFileName = (url) => {
    if (!url) return "";

    try {
      return url.split("/").pop().split("?")[0];
    } catch {
      return "";
    }
  };

  const getFilePreview = (field) => {
    if (formData[field] instanceof File) return URL.createObjectURL(formData[field]);
    if (filePreviews[field]) return filePreviews[field];
    return null;
  };

  const renderFilePreview = (field, label) => {
    const previewUrl = getFilePreview(field);
    if (!previewUrl) return null;

    const fileObj = formData[field];
    const isPdf =
      (fileObj instanceof File && fileObj.type === "application/pdf") ||
      /\.pdf/i.test(previewUrl.split("?")[0]);

    const isImage =
      !isPdf &&
      (previewUrl.startsWith("blob:") ||
        /\.(jpeg|jpg|gif|png|webp)/i.test(previewUrl.split("?")[0]));

    return (
      <div className="employeedetails-file-preview-container">
        <small className="employeedetails-text-muted">{label} Preview:</small>
        <div className="employeedetails-file-preview">
          {isImage ? (
            <img
              src={previewUrl}
              alt={label}
              className="employeedetails-img-thumbnail"
              style={{ maxHeight: "100px", maxWidth: "150px" }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="employeedetails-document-preview">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="employeedetails-text-primary"
              >
                View {label}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCourseFilePreview = (courseIndex) => {
    const course = formData.courses[courseIndex];
    if (!course) return null;

    let previewUrl = null;
    let isPdf = false;

    if (course.certificate instanceof File) {
      previewUrl = URL.createObjectURL(course.certificate);
      isPdf = course.certificate.type === "application/pdf";
    } else if (filePreviews[`course_${course.id}_certificate`]) {
      previewUrl = filePreviews[`course_${course.id}_certificate`];
    } else if (filePreviews[`course_${course._id}_certificate`]) {
      previewUrl = filePreviews[`course_${course._id}_certificate`];
    } else if (course.certificateUrl) {
      previewUrl = course.certificateUrl;
    }

    if (!previewUrl) return null;

    if (!isPdf && /\.pdf/i.test(previewUrl.split("?")[0])) {
      isPdf = true;
    }

    const isImage =
      !isPdf &&
      (previewUrl.startsWith("blob:") ||
        /\.(jpeg|jpg|gif|png|webp)/i.test(previewUrl.split("?")[0]));

    return (
      <div className="employeedetails-file-preview-container">
        <small className="employeedetails-text-muted">Certificate Preview:</small>
        <div className="employeedetails-file-preview">
          {isImage ? (
            <img
              src={previewUrl}
              alt="Certificate"
              className="employeedetails-img-thumbnail"
              style={{ maxHeight: "100px", maxWidth: "150px" }}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div className="employeedetails-document-preview">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="employeedetails-text-primary"
              >
                View Certificate
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCertFilePreview = (certIndex) => {
    const cert = certifications[certIndex];
    if (!cert) return null;

    let previewUrl = null;
    let isPdf = false;

    if (cert.certificateFile instanceof File) {
      previewUrl = URL.createObjectURL(cert.certificateFile);
      isPdf = cert.certificateFile.type === "application/pdf";
    } else if (filePreviews[`cert_${cert.id}_certificate`]) {
      previewUrl = filePreviews[`cert_${cert.id}_certificate`];
    } else if (filePreviews[`cert_${cert._id}_certificate`]) {
      previewUrl = filePreviews[`cert_${cert._id}_certificate`];
    } else if (filePreviews[`cert_${certIndex}_certificate`]) {
      previewUrl = filePreviews[`cert_${certIndex}_certificate`];
    } else if (cert.certificateUrl) {
      previewUrl = cert.certificateUrl;
    } else if (typeof cert.certificate === "string" && cert.certificate) {
      previewUrl = cert.certificate;
    }

    if (!previewUrl) return null;

    if (!isPdf && /\.pdf/i.test(previewUrl.split("?")[0])) {
      isPdf = true;
    }

    const isImage =
      !isPdf &&
      (previewUrl.startsWith("blob:") ||
        /\.(jpeg|jpg|gif|png|webp|bmp|svg)/i.test(previewUrl.split("?")[0]));

    return (
      <div className="employeedetails-file-preview-container" style={{ marginTop: "10px" }}>
        <small className="employeedetails-text-muted">Certificate Preview:</small>
        <div className="employeedetails-file-preview">
          {isImage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <img
                src={previewUrl}
                alt="Certification"
                className="employeedetails-img-thumbnail"
                style={{ maxHeight: "120px", maxWidth: "180px", objectFit: "contain", borderRadius: "6px", border: "1px solid #e5e7eb" }}
                onError={(e) => {
                  e.target.style.display = "none";
                  const fallback = e.target.nextSibling;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                className="employeedetails-document-preview"
                style={{ display: "none" }}
              >
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="employeedetails-text-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  📄 View Certificate
                </a>
              </div>
            </div>
          ) : (
            <div className="employeedetails-document-preview">
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="employeedetails-text-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                📄 View Certificate
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handlePhoneKeyDown = (e) => {
    const allowedKeys = [
      "Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight"
    ];

    if (allowedKeys.includes(e.key)) return;

    if (e.key >= "0" && e.key <= "9") {
      if (formData.emergencyContact.length >= 10) {
        e.preventDefault();
      }
      return;
    }

    e.preventDefault();
  };

  /* ================= JSX ================= */
  return (
    <div className="employeedetails-page">
      <Sidebar />

      <div className="employeedetails-content">
        {/* PROFILE HEADER */}
        <div className={`employeedetails-profile-header ${getStatusClass(formData.status)}`}>
          <div
            id="field-wrapper-picture"
            className={`employeedetails-profile-avatar-wrapper ${isFieldRejected("picture") ? "rejected-avatar-border" : ""}`}
          >
            <img
              src={getFilePreview("picture") || "/avatar.png"}
              alt="profile"
              className="employeedetails-profile-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/avatar.png";
              }}
            />
          </div>
          <div className="employeedetails-profile-info">
            <h4 className="employeedetails-profile-name">{formData.name}</h4>

            <p className="employeedetails-profile-designation">
              {formData.designation}
            </p>

            <span className={`employeedetails-profile-status ${getStatusClass(formData.status)}`}>
              {formData.status === "full_time"
                ? "Full-time"
                : formData.status === "part_time"
                  ? "Part-time"
                  : formData.status === "relieved"
                    ? "Relieved"
                    : "-"}
            </span>

            {/* PROFILE COMPLETION */}
            <div className="profile-completion-wrapper">
              <div className="profile-completion-text">
                Profile Completion: {effectiveCompletion}%
              </div>

              <div className="profile-progress-bar">
                <div
                  className="profile-progress-fill"
                  style={{
                    width: `${effectiveCompletion}%`,
                    background:
                      effectiveCompletion < 40
                        ? "#ef4444"
                        : effectiveCompletion < 70
                          ? "#f59e0b"
                          : "#22c55e",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="missing-details-box">
            {effectiveCompletion < 100 ? (
              <>
                <div className="missing-title">Missing Details:</div>

                <ul className={showAllMissing ? "scrollable" : ""}>
                  {(showAllMissing ? missingFields : missingFields.slice(0, 5)).map((field, i) => (
                    <li key={i}>{field}</li>
                  ))}
                </ul>

                {missingFields.length > 5 && (
                  <div
                    className="missing-more"
                    onClick={() => setShowAllMissing((prev) => !prev)}
                    role="button"
                    tabIndex={0}
                  >
                    {showAllMissing
                      ? "▲ Show less"
                      : `+ ${missingFields.length - 5} more fields (Click to view)`}
                  </div>
                )}
              </>
            ) : (
              <div className="missing-title" style={{ color: "#ffffff" }}>
                ✔ All details completed
              </div>
            )}
          </div>
        </div>

        {!permissionsLoaded ? (
          <div className="employeedetails-form-card" style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ color: "#4a577f", fontSize: "16px" }}>Loading profile...</p>
          </div>
        ) : (
          <div className="employeedetails-form-card">

            {!isAdmin && approvalStatus === "rejected" && (
              displayRejectedFields && displayRejectedFields.length > 0 ? (
                <div className="employee-rejection-form-banner mb-4 p-3 rounded" style={{ border: "1px solid #E1E1E1", background: "#ffe9eb" }}>
                  <div className="d-flex align-items-start gap-3">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                        <h5 className="text-danger fw-bold mb-0" style={{ fontSize: "16px" }}>
                          Admin Profile Review Remark
                        </h5>
                        {formRestriction && (
                          formRestriction.isRestricted ? (
                            <span className="badge bg-danger text-white px-3 py-2" style={{ fontSize: "12px", borderRadius: "12px" }}>
                               Resubmission Deadline Passed
                            </span>
                          ) : formRestriction.isLastDay ? (
                            <span className="badge bg-warning text-dark px-3 py-2" style={{ fontSize: "12px", borderRadius: "12px", fontWeight: "700" }}>
                              Today is your last day!
                            </span>
                          ) : (
                            <span className="badge bg-primary text-white px-3 py-2" style={{ fontSize: "12px", borderRadius: "12px" }}>
                              {formRestriction.daysRemaining} Day{formRestriction.daysRemaining === 1 ? "" : "s"} Remaining
                            </span>
                          )
                        )}
                      </div>

                      {formRestriction && (
                        formRestriction.isRestricted ? (
                          <div className="p-2 mb-2 rounded" style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#991b1b", fontSize: "13px" }}>
                            <strong>Resubmission Deadline Passed:</strong> Your 7-day period has expired. You must complete your profile 100% and resubmit to access other pages.
                          </div>
                        ) : formRestriction.isLastDay ? (
                          <div className="p-2 mb-2 rounded" style={{ background: "#fef3c7", border: "1px solid #f59e0b", color: "#92400e", fontSize: "13px" }}>
                            <strong> Today is your last day!</strong> Please complete your profile today. If not completed today, access to other pages will be restricted until your profile is completed.
                          </div>
                        ) : (
                          <div className="p-2 mb-2 rounded" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", fontSize: "13px" }}>
                            <strong>7-Day Resubmission Period:</strong> You have {formRestriction.daysRemaining} day{formRestriction.daysRemaining === 1 ? "" : "s"} remaining to update and complete your profile.
                          </div>
                        )
                      )}

                      <p className="text-dark" style={{ fontSize: "14px" }}>
                        <strong>Reason for Rejection:</strong> "{rejectionRemark}"
                      </p>
                      <div className="mb-2">
                        <strong className="text-secondary small">Required Correction:</strong>{" "}
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {displayRejectedFields.map((f, i) => (
                            <div
                              key={i}
                              className="rejected-field-pill d-inline-flex align-items-center gap-2 px-3 py-1 rounded border"
                              style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                              onClick={() => scrollToTargetRejectedField(f)}
                              title={`Click to scroll to and update ${getFieldFriendlyName(f)}`}
                            >
                              <span className="rejected-pill-label fw-semibold text-danger">
                                {getFieldFriendlyName(f)}
                              </span>
                              <button
                                type="button"
                                className="btn-reject-view"
                                style={{ fontSize: "12px", height: "26px", fontWeight: "500", borderRadius: "14px" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  scrollToTargetRejectedField(f);
                                }}
                                title={`Scroll to and inspect ${getFieldFriendlyName(f)}`}
                              >
                                <FaEye className="me-1" /> View File
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="small text-muted mb-0">
                        Please update or re-upload the required document/field and click <strong>"Resubmit for Admin Review"</strong> below.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2 py-2 px-3 mb-4 rounded" style={{ fontSize: "13px", fontWeight: "500", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  <span>All details requested by the Admin have been updated.</span>
                </div>
              )
            )}

            {!isAdmin &&
              approvalStatus !== "rejected" &&
              approvalStatus !== "pending" &&
              (profileCompletion < 100 || formData.isProfileCompleted === false) &&
              formRestriction && (
                <div
                  className="mb-4 p-3 rounded"
                  style={{
                    background: formRestriction.isRestricted
                      ? "#fee2e2"
                      : formRestriction.isLastDay
                      ? "#fef3c7"
                      : "#eff6ff",
                    border: formRestriction.isRestricted
                      ? "1px solid #f87171"
                      : formRestriction.isLastDay
                      ? "1.5px solid #f59e0b"
                      : "1px solid #bfdbfe",
                    color: formRestriction.isRestricted
                      ? "#991b1b"
                      : formRestriction.isLastDay
                      ? "#92400e"
                      : "#1e40af",
                    fontSize: "14px",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                    <strong style={{ fontSize: "15px" }}>
                      {formRestriction.isRestricted
                        ? "Profile Completion Deadline Passed"
                        : formRestriction.isLastDay
                        ? "Today is your last day!"
                        : "7-Day Completion Period"}
                    </strong>
                    <span
                      className={`badge ${
                        formRestriction.isRestricted
                          ? "bg-danger text-white"
                          : formRestriction.isLastDay
                          ? "bg-warning text-dark"
                          : "bg-primary text-white"
                      } px-3 py-1`}
                      style={{ fontSize: "12px", borderRadius: "12px" }}
                    >
                      {formRestriction.isRestricted
                        ? "Access Restricted"
                        : formRestriction.isLastDay
                        ? "Last Day"
                        : `${formRestriction.daysRemaining} Days Remaining`}
                    </span>
                  </div>
                  {formRestriction.isRestricted ? (
                    <div>Your 7-day period has expired. You must complete your profile 100% to access other pages.</div>
                  ) : formRestriction.isLastDay ? (
                    <div>Please complete your profile 100% today. If not completed today, access to other pages will be restricted until your profile is completed.</div>
                  ) : (
                    <div>You have {formRestriction.daysRemaining} days remaining to complete your profile to 100%. Complete all required details to maintain unrestricted access.</div>
                  )}
                </div>
              )}

            {!isAdmin && canEditProfile && !allowedFields.includes("ALL") && formData.isProfileCompleted !== false && approvalStatus !== "rejected" && (
              <div className="edit-highlight-banner">
                You can edit: {visibleSections.join(", ").toUpperCase()}
              </div>
            )}

            {!isAdmin && permissionsLoaded && !canEditProfile && formData.isProfileCompleted !== false && approvalStatus !== "rejected" && (
              <div style={{
                background: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "20px",
                fontSize: "14px",
                color: "#856404",
              }}>
                {editMessage || "Your profile is locked. Please send an edit request to make changes."}
              </div>
            )}

            {isHrRestrictedFromEdit && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: "8px",
                  padding: "14px 20px",
                  marginBottom: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "#b45309",
                  fontSize: "14px",
                  fontWeight: "600",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}
              >
                <span style={{ fontSize: "20px" }}>🔒</span>
                <div>
                  <div>Read-Only Access (HR Direct Edit Disabled)</div>
                  <div style={{ fontSize: "13px", fontWeight: "400", color: "#92400e", marginTop: "2px" }}>
                    Administrator has configured HR permissions with Direct Edit disabled. Profile details are in view-only mode.
                  </div>
                </div>
              </div>
            )}

            {/* ===== BASIC DETAILS ===== */}
            {visibleSections.includes("basic") && (
              <>
                <h6 className="employeedetails-section-title">Basic Details</h6>
                <div className="employeedetails-row">
                  <LockedField label="Employee ID" value={formData.empIdString} editable={false} visible={isAdmin || formData.isProfileCompleted === false} />

                  <LockedField
                    label="Name"
                    value={formData.name}
                    editable={effectiveIsAdmin}
                    visible={canEditField("name")}
                    onChange={(v) => handleChange("name", v)}
                  />

                  <LockedField
                    label="Email"
                    value={formData.email}
                    editable={effectiveIsAdmin}
                    visible={canEditField("email")}
                    onChange={(v) => handleChange("email", v)}
                  />

                  {effectiveIsAdmin ? (
                    <DetailSelect
                      id="field-wrapper-status"
                      label="Status"
                      value={formData.status}
                      onChange={(v) => handleChange("status", v.toLowerCase())}
                      options={[
                        { label: "Full-time", value: "full_time" },
                        { label: "Part-time", value: "part_time" },
                        { label: "Relieved", value: "relieved" },
                      ]}
                      disabled={false}
                      visible={canEditField("status")}
                    />
                  ) : (
                    <LockedField id="field-wrapper-status" label="Status" value={formData.status} editable={false} visible={true} />
                  )}

                  {effectiveIsAdmin && (formData.status === "relieved" || formData.dateRelieved) && (
                    <DetailInput
                      type="date"
                      label="Date Relieved"
                      value={formData.dateRelieved}
                      onChange={(v) => handleChange("dateRelieved", v)}
                      visible={true}
                    />
                  )}
                </div>
                <Divider />
              </>
            )}

            {/* ===== PERSONAL & FAMILY DETAILS ===== */}
            {(visibleSections.includes("personal") || visibleSections.includes("family")) && (
              <>
                <h6 className="employeedetails-section-title">
                  {visibleSections.includes("personal") && visibleSections.includes("family")
                    ? "Personal & Family Details"
                    : visibleSections.includes("family")
                      ? "Family Details"
                      : "Personal Details"}
                </h6>
                <div className="employeedetails-row">
                  <div id="field-wrapper-dob" className="employeedetails-col-md-6 employeedetails-mb-4 dob-field-custom" style={{ display: canEditField("dob") ? "block" : "none" }}>
                    <label className="employeedetails-detail-label">DOB</label>
                    <div style={{ position: "relative", width: "100%" }}>
                      <style>
                        {`
                          .custom-dob-input::-webkit-calendar-picker-indicator {
                            background: transparent;
                            color: transparent;
                            cursor: pointer;
                            position: absolute;
                            right: 0;
                            top: 0;
                            width: 44px;
                            height: 100%;
                            z-index: 2;
                            opacity: 0;
                          }
                        `}
                      </style>
                      <input
                        type="date"
                        className={`employeedetails-detail-input custom-dob-input ${!canEditField("dob") ? "employeedetails-input-locked" : ""}`}
                        value={formData.dob || ""}
                        onChange={(e) => handleChange("dob", e.target.value)}
                        disabled={!canEditField("dob")}
                        style={{ width: "100%", paddingRight: "44px", position: "relative", zIndex: 1 }}
                      />
                      <img
                        src="/Calander.svg"
                        alt="Calendar"
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "15px",
                          height: "15px",
                          pointerEvents: "none",
                          zIndex: 3
                        }}
                      />
                    </div>
                  </div>
                  <DetailSelect
                    id="field-wrapper-gender"
                    label="Gender"
                    className="gender-field-custom"
                    value={formData.gender}
                    onChange={(v) => handleChange("gender", v)}
                    options={[
                      { label: "Male", value: "Male" },
                      { label: "Female", value: "Female" },
                      { label: "Other", value: "Other" },
                    ]}
                    disabled={!canEditField("gender")} visible={canEditField("gender")}
                  />
                  <LockedField
                    id="field-wrapper-phone"
                    label="Phone"
                    value={formData.phone}
                    editable={isAdmin || canEditField("phone")}
                    onChange={(v) => handleChange("phone", v.replace(/\D/g, "").slice(0, 10))}
                    visible={canEditField("phone")}
                  />

                  {canEditField("emergencyContact") && (
                    <div id="field-wrapper-emergencyContact" className="employeedetails-col-md-6 employeedetails-mb-4">
                      <div className="employeedetails-detail-label">Emergency Contact</div>
                      <div className="employeedetails-field-wrapper">
                        <input
                          type="text"
                          placeholder="Enter 10-digit mobile number"
                          value={formData.emergencyContact}
                          onChange={(e) => handleEmergencyContactChange(e.target.value)}
                          onKeyDown={handlePhoneKeyDown}
                          maxLength={10}
                          inputMode="numeric"
                          className={`employeedetails-detail-input ${!canEditField("emergencyContact") ? "employeedetails-input-locked" : ""} ${contactErrors.emergencyContact ? "employeedetails-input-error" : ""}`}
                          disabled={!canEditField("emergencyContact")}
                        />
                        {contactErrors.emergencyContact && (
                          <div className="employeedetails-field-error">
                            {contactErrors.emergencyContact}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <DetailSelect
                    id="field-wrapper-bloodGroup"
                    label="Blood Group"
                    value={formData.bloodGroup}
                    onChange={(v) => handleChange("bloodGroup", v)}
                    options={["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => ({
                      label: b,
                      value: b,
                    }))}
                    disabled={!canEditField("bloodGroup")} visible={canEditField("bloodGroup")}
                  />
                  <DetailInput
                    id="field-wrapper-address"
                    full
                    label="Address"
                    value={formData.address}
                    onChange={(v) => handleChange("address", v)}
                    disabled={!canEditField("address")} visible={canEditField("address")}
                  />
                  <DetailInput
                    id="field-wrapper-fatherName"
                    label="Father's Name"
                    value={formData.fatherName}
                    onChange={(v) => handleChange("fatherName", v)}
                    disabled={!canEditField("fatherName")} visible={canEditField("fatherName")}
                  />
                  <DetailInput
                    id="field-wrapper-fatherOccupation"
                    label="Father's Occupation"
                    value={formData.fatherOccupation}
                    onChange={(v) => handleChange("fatherOccupation", v)}
                    disabled={!canEditField("fatherOccupation")} visible={canEditField("fatherOccupation")}
                  />
                  <DetailInput
                    id="field-wrapper-motherName"
                    label="Mother's Name"
                    value={formData.motherName}
                    onChange={(v) => handleChange("motherName", v)}
                    disabled={!canEditField("motherName")} visible={canEditField("motherName")}
                  />
                  <DetailInput
                    id="field-wrapper-motherOccupation"
                    label="Mother's Occupation"
                    value={formData.motherOccupation}
                    onChange={(v) => handleChange("motherOccupation", v)}
                    disabled={!canEditField("motherOccupation")} visible={canEditField("motherOccupation")}
                  />
                </div>
                <Divider />
              </>
            )}

            {/* ===== SIBLINGS ===== */}
            {(visibleSections.includes("siblings") || visibleSections.includes("family")) && (
              <>
                <div id="field-wrapper-siblings" className="employeedetails-siblings-section">
                  <div className="employeedetails-d-flex employeedetails-justify-content-between employeedetails-align-items-center employeedetails-mb-3">
                    <h6 className="employeedetails-section-title employeedetails-mb-0">Siblings</h6>
                    {canEditField("siblings") && (
                      <button
                        className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-outline-primary"
                        onClick={() => setShowAddSibling(!showAddSibling)}
                      >
                        {showAddSibling ? "Cancel" : "+ Add Sibling"}
                      </button>
                    )}
                  </div>

                  {showAddSibling && canEditField("siblings") && (
                    <div className="employeedetails-add-sibling-form employeedetails-mb-4 employeedetails-p-3 employeedetails-border employeedetails-rounded">
                      <div className="employeedetails-row">
                        <div className="employeedetails-col-md-4 employeedetails-mb-3">
                          <div className="employeedetails-detail-label">Relationship</div>
                          <CustomDropdown
                            style={{ width: "100%" }}
                            placeholder="Select"
                            value={newSibling.relationship}
                            onChange={(val) =>
                              setNewSibling((prev) => ({ ...prev, relationship: val }))
                            }
                            options={[
                              { label: "Brother", value: "Brother" },
                              { label: "Sister", value: "Sister" }
                            ]}
                          />
                        </div>
                        <div className="employeedetails-col-md-4 employeedetails-mb-3">
                          <div className="employeedetails-detail-label">Name</div>
                          <input
                            className="employeedetails-detail-input"
                            type="text"
                            value={newSibling.name || ""}
                            onChange={(e) => setNewSibling((prev) => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div className="employeedetails-col-md-4 employeedetails-mb-3">
                          <div className="employeedetails-detail-label">Occupation</div>
                          <input
                            className="employeedetails-detail-input"
                            type="text"
                            value={newSibling.occupation || ""}
                            onChange={(e) => setNewSibling((prev) => ({ ...prev, occupation: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="employeedetails-d-flex employeedetails-justify-content-end">
                        <button
                          className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-primary"
                          onClick={handleAddSibling}
                        >
                          Click to save
                        </button>
                      </div>
                    </div>
                  )}

                  {formData.siblings.length > 0 && (
                    <div className="employeedetails-siblings-list">
                      {formData.siblings.map((sibling, index) => (
                        <div
                          key={sibling.id || `sib-${index}`}
                          className="employeedetails-sibling-item employeedetails-mb-3 employeedetails-p-3 employeedetails-border employeedetails-rounded"
                        >
                          <div className="employeedetails-d-flex employeedetails-justify-content-between employeedetails-align-items-center">
                            <div>
                              <strong>
                                {sibling.relationship}: {sibling.name}
                              </strong>
                              <p className="employeedetails-mb-0 employeedetails-text-muted">
                                Occupation: {sibling.occupation}
                              </p>
                            </div>
                            {canEditField("siblings") && (
                              <button
                                className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-outline-danger"
                                onClick={() => handleRemoveSibling(index)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Divider />
              </>
            )}

            {/* ===== WORKING DETAILS ===== */}
            {(visibleSections.includes("working") || visibleSections.includes("work")) && (
              <>
                <div className="employeedetails-working-details-section">
                  <div className="employeedetails-d-flex employeedetails-justify-content-between employeedetails-align-items-center employeedetails-mb-3">
                    <h6 className="employeedetails-section-title employeedetails-mb-0">
                      Working / Employment Details
                    </h6>
                    {canEditField("previousExperiences") && (
                      <button
                        className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-outline-primary"
                        onClick={handleAddPreviousExperience}
                      >
                        + Add Previous Experience
                      </button>
                    )}
                  </div>

                  <div className="employeedetails-row">
                    <LockedField
                      label="Department"
                      value={formData.department}
                      editable={effectiveIsAdmin}
                      visible={canEditField("department")}
                      onChange={(v) => handleChange("department", v)}
                    />

                    <LockedField
                      label="Designation"
                      value={formData.designation}
                      editable={effectiveIsAdmin}
                      visible={canEditField("designation")}
                      onChange={(v) => handleChange("designation", v)}
                    />

                    {effectiveIsAdmin ? (
                      <DetailSelect
                        label="Status"
                        value={formData.status}
                        onChange={(v) => handleChange("status", v.toLowerCase())}
                        options={[
                          { label: "Full-time", value: "full_time" },
                          { label: "Part-time", value: "part_time" },
                          { label: "Relieved", value: "relieved" },
                        ]}
                        visible={canEditField("status")}
                      />
                    ) : (
                      <LockedField label="Status" value={formData.status} editable={false} visible={true} />
                    )}

                    {/* {canEditField("experience") && (
                      <div className="employeedetails-col-md-6 employeedetails-mb-4">
                        <div className="employeedetails-detail-label">Experience (years)</div>

                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Enter years (e.g. 2 or 2.5)"
                          value={formData.experience || ""}
                          onChange={(e) => handleExperienceChange(e.target.value)}
                          onKeyDown={handleNumberKeyDown}
                          className={`employeedetails-detail-input ${!canEditField("experience") ? "employeedetails-input-locked" : ""
                            }`}
                          disabled={!canEditField("experience")}
                          readOnly={!canEditField("experience")}
                        />
                      </div>
                    )} */}

                    {/* <DetailInput
                      type="number"
                      label="Salary"
                      value={formData.salary}
                      onChange={(v) => handleChange("salary", v)}
                      disabled={!canEditField("salary")}
                      visible={true}
                    /> */}
                  </div>

                  {formData.previousExperiences.length > 0 && (
                    <div id="field-wrapper-previousExperiences" className="employeedetails-previous-experiences employeedetails-mt-4">
                      <h6
                        className="employeedetails-mb-3"
                        style={{ fontSize: "16px", color: "#4a577f", fontWeight: "500" }}
                      >
                        Previous Experiences
                      </h6>
                      {formData.previousExperiences.map((exp, index) => (
                        <div
                          key={exp.id || `exp-${index}`}
                          className="employeedetails-previous-experience-item employeedetails-mb-4 employeedetails-p-4 employeedetails-border employeedetails-rounded"
                        >
                          <div className="employeedetails-d-flex employeedetails-justify-content-between employeedetails-align-items-center employeedetails-mb-3">
                            <h6
                              className="employeedetails-mb-0"
                              style={{ fontSize: "14px", color: "#1f2937" }}
                            >
                              Experience #{index + 1}
                            </h6>
                            {canEditField("previousExperiences") && (
                              <button
                                className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-outline-danger"
                                onClick={() => handleRemovePreviousExperience(index)}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="employeedetails-row">
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                label="Company Name"
                                value={exp.previousCompany}
                                onChange={(v) =>
                                  handlePreviousExperienceChange(index, "previousCompany", v)
                                }
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <label className="employeedetails-detail-label">Employment Status</label>
                              <div style={!canEditField("previousExperiences") ? { pointerEvents: "none", opacity: 0.6 } : {}}>
                                <CustomDropdown
                                  style={{ width: "100%" }}
                                  placeholder="Select"
                                  value={exp.employmentType}
                                  onChange={(val) =>
                                    handlePreviousExperienceChange(
                                      index,
                                      "employmentType",
                                      val
                                    )
                                  }
                                  options={[
                                    { label: "Full-time", value: "Full-time" },
                                    { label: "Contract", value: "Contract" },
                                    { label: "Part-time", value: "Part-time" },
                                    { label: "Internship", value: "Internship" }
                                  ]}
                                />
                              </div>
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                label="Designation / Role"
                                value={exp.designation}
                                onChange={(v) =>
                                  handlePreviousExperienceChange(index, "designation", v)
                                }
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                label="Department"
                                value={exp.department}
                                onChange={(v) =>
                                  handlePreviousExperienceChange(index, "department", v)
                                }
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                type="date"
                                label="Date of Joining"
                                value={exp.dateOfJoining}
                                onChange={(v) =>
                                  handlePreviousExperienceChange(index, "dateOfJoining", v)
                                }
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                type="date"
                                label="Last Working Date"
                                value={exp.lastWorkingDate}
                                onChange={(v) =>
                                  handlePreviousExperienceChange(index, "lastWorkingDate", v)
                                }
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                label="Total Experience"
                                value={exp.totalExperience}
                                onChange={(v) =>
                                  handlePreviousExperienceChange(index, "totalExperience", v)
                                }
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                type="number"
                                label="Salary of Previous Company"
                                value={exp.previousSalary}
                                onChange={(v) =>
                                  handlePreviousExperienceChange(index, "previousSalary", v)
                                }
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Divider />
              </>
            )}

            {/* ===== EDUCATION DETAILS ===== */}
            {visibleSections.includes("education") && (
              <>
                <h6 className="employeedetails-section-title">Education Details</h6>

                {(!isRejectedMode || canEditField("school10") || canEditField("marks10") || canEditField("passedOutYear10") || canEditField("marksheet10")) && (
                  <div className="employeedetails-education-group">
                    <div className="employeedetails-education-group-label">10th Standard</div>
                    <div className="employeedetails-row employeedetails-education-row">
                      <div id="field-wrapper-school10" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("school10")) ? "block" : "none" }}>
                        <div className="employeedetails-detail-label">10th School</div>
                        <input
                          className={`employeedetails-detail-input ${!canEditField("school10") ? "employeedetails-input-locked" : ""}`}
                          type="text"
                          value={formData.school10 || ""}
                          onChange={(e) => handleChange("school10", e.target.value)}
                          disabled={!canEditField("school10")}
                          readOnly={!canEditField("school10")}
                        />
                      </div>

                      <div id="field-wrapper-marks10" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("marks10")) ? "block" : "none" }}>
                        <div className="employeedetails-detail-label">10th Marks</div>
                        <div className="employeedetails-field-wrapper">
                          <input
                            className={`employeedetails-detail-input ${!canEditField("marks10") ? "employeedetails-input-locked" : ""} ${marksErrors.marks10 ? "employeedetails-input-error" : ""}`}
                            type="text"
                            inputMode="decimal"
                            value={formData.marks10 || ""}
                            onChange={(e) => handleMarksChange("marks10", e.target.value)}
                            onKeyDown={handleMarksKeyDown}
                            disabled={!canEditField("marks10")}
                            readOnly={!canEditField("marks10")}
                            placeholder="100 – 500"
                          />
                          {marksErrors.marks10 && (
                            <div className="employeedetails-field-error">{marksErrors.marks10}</div>
                          )}
                        </div>
                      </div>

                      <div id="field-wrapper-passedOutYear10" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("passedOutYear10")) ? "block" : "none" }}>
                        <div className="employeedetails-detail-label">10th Passed-Out Year</div>
                        <div className="employeedetails-field-wrapper">
                          <input
                            className={`employeedetails-detail-input ${!canEditField("passedOutYear10") ? "employeedetails-input-locked" : ""} ${yearErrors.passedOutYear10 ? "employeedetails-input-error" : ""}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            value={formData.passedOutYear10 || ""}
                            onChange={(e) => handleYearChange("passedOutYear10", e.target.value)}
                            onKeyDown={handleNumberKeyDown}
                            disabled={!canEditField("passedOutYear10")}
                            readOnly={!canEditField("passedOutYear10")}
                            placeholder="e.g. 2021"
                          />
                          {yearErrors.passedOutYear10 && (
                            <div className="employeedetails-field-error">{yearErrors.passedOutYear10}</div>
                          )}
                        </div>
                      </div>

                      <div id="field-wrapper-marksheet10" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("marksheet10")) ? "block" : "none" }}>
                        <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>10th Marksheet</span>
                        </div>
                        <div className="employeedetails-file-upload-container">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => handleFileChange("marksheet10", e.target.files[0], e.target)}
                            className="employeedetails-detail-input"
                            disabled={!canEditField("marksheet10")}
                          />

                          {filePreviews.marksheet10 && (
                            <div className="employeedetails-file-name">
                              Existing File: {getFileName(filePreviews.marksheet10)}
                            </div>
                          )}

                          {renderFilePreview("marksheet10", "10th Marksheet")}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(!isRejectedMode || canEditField("educationPath")) && (
                  <>
                    <div className="employeedetails-education-divider" />

                    <h6>Select Education Path After 10th</h6>
                    <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEducationPath("12th");
                          setNewCourse((prev) => ({ ...prev, courseType: "UG" }));
                        }}
                        className={`employeedetails-path-btn ${educationPath === "12th" ? "active" : ""}`}
                      >
                        12th
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEducationPath("Diploma");
                          setNewCourse((prev) => ({ ...prev, courseType: "Diploma" }));
                        }}
                        className={`employeedetails-path-btn ${educationPath === "Diploma" ? "active" : ""}`}
                      >
                        Diploma
                      </button>
                    </div>
                  </>
                )}

                {educationPath === "12th" && (!isRejectedMode || canEditField("school12") || canEditField("marks12") || canEditField("passedOutYear12") || canEditField("marksheet12")) && (
                  <>
                    <div className="employeedetails-education-group">
                      <div className="employeedetails-education-group-label">12th Standard</div>
                      <div className="employeedetails-row employeedetails-education-row">
                        <div id="field-wrapper-school12" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("school12")) ? "block" : "none" }}>
                          <div className="employeedetails-detail-label">12th School</div>
                          <input
                            className={`employeedetails-detail-input ${!canEditField("school12") ? "employeedetails-input-locked" : ""}`}
                            type="text"
                            value={formData.school12 || ""}
                            onChange={(e) => handleChange("school12", e.target.value)}
                            disabled={!canEditField("school12")}
                            readOnly={!canEditField("school12")}
                          />
                        </div>

                        <div id="field-wrapper-marks12" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("marks12")) ? "block" : "none" }}>
                          <div className="employeedetails-d-flex employeedetails-justify-content-between employeedetails-align-items-center employeedetails-mb-1">
                            <div className="employeedetails-detail-label employeedetails-mb-0">12th Marks</div>
                            <div className="employeedetails-marks-total-selector">
                              <label className={`employeedetails-marks-radio-label ${marks12Total === 600 ? "active" : ""}`}>
                                <input
                                  type="radio"
                                  name="marks12Total"
                                  value={600}
                                  checked={marks12Total === 600}
                                  onChange={() => handleMarks12TotalChange(600)}
                                  disabled={!canEditField("marks12")}
                                />
                                <span>600</span>
                              </label>
                              <label className={`employeedetails-marks-radio-label ${marks12Total === 1200 ? "active" : ""}`}>
                                <input
                                  type="radio"
                                  name="marks12Total"
                                  value={1200}
                                  checked={marks12Total === 1200}
                                  onChange={() => handleMarks12TotalChange(1200)}
                                  disabled={!canEditField("marks12")}
                                />
                                <span>1200</span>
                              </label>
                            </div>
                          </div>
                          <div className="employeedetails-field-wrapper">
                            <input
                              className={`employeedetails-detail-input ${!canEditField("marks12") ? "employeedetails-input-locked" : ""} ${marksErrors.marks12 ? "employeedetails-input-error" : ""}`}
                              type="text"
                              inputMode="decimal"
                              value={formData.marks12 || ""}
                              onChange={(e) => handleMarksChange("marks12", e.target.value)}
                              onKeyDown={handleMarksKeyDown}
                              disabled={!canEditField("marks12")}
                              readOnly={!canEditField("marks12")}
                              placeholder={`100 – ${marks12Total}`}
                            />
                            {marksErrors.marks12 && (
                              <div className="employeedetails-field-error">{marksErrors.marks12}</div>
                            )}
                          </div>
                        </div>

                        <div id="field-wrapper-passedOutYear12" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("passedOutYear12")) ? "block" : "none" }}>
                          <div className="employeedetails-detail-label">12th Passed-Out Year</div>
                          <div className="employeedetails-field-wrapper">
                            <input
                              className={`employeedetails-detail-input ${!canEditField("passedOutYear12") ? "employeedetails-input-locked" : ""} ${yearErrors.passedOutYear12 ? "employeedetails-input-error" : ""}`}
                              type="text"
                              inputMode="numeric"
                              maxLength={4}
                              value={formData.passedOutYear12 || ""}
                              onChange={(e) => handleYearChange("passedOutYear12", e.target.value)}
                              onKeyDown={handleNumberKeyDown}
                              disabled={!canEditField("passedOutYear12")}
                              readOnly={!canEditField("passedOutYear12")}
                              placeholder="e.g. 2023"
                            />
                            {yearErrors.passedOutYear12 && (
                              <div className="employeedetails-field-error">{yearErrors.passedOutYear12}</div>
                            )}
                          </div>
                        </div>

                        <div id="field-wrapper-marksheet12" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("marksheet12")) ? "block" : "none" }}>
                          <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>12th Marksheet</span>
                          </div>
                          <div className="employeedetails-file-upload-container">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileChange("marksheet12", e.target.files[0], e.target)}
                              className="employeedetails-detail-input"
                              disabled={!canEditField("marksheet12")}
                            />

                            {filePreviews.marksheet12 && (
                              <div className="employeedetails-file-name">
                                Existing File: {getFileName(filePreviews.marksheet12)}
                              </div>
                            )}

                            {renderFilePreview("marksheet12", "12th Marksheet")}
                          </div>
                        </div>

                        {/* ── Career Gap Display for Admin & Employee Review (12th Path) ── */}
                        {(() => {
                          const eligibleGaps = calculateEligibleCareerGaps({
                            passedOutYear10: formData.passedOutYear10,
                            passedOutYear12: formData.passedOutYear12,
                            educationPath,
                            courses: formData.courses,
                          });
                          const savedGaps = Array.isArray(formData.careerGaps) ? formData.careerGaps : [];
                          const gapsToShow = eligibleGaps.length > 0
                            ? eligibleGaps
                            : savedGaps.filter((g) => g && Number(g.gapDuration) > 0);

                          if (!gapsToShow || gapsToShow.length === 0) return null;

                          return gapsToShow.map((gap, idx) => {
                            const stage = gap.educationStage;
                            const is12toUG = stage === "12th Standard to UG / Engineering";
                            const y10Display = formData.passedOutYear10 || gap.passedOutYear10 || "-";
                            const durationDisplay = `${gap.gapDuration} ${gap.gapDuration === 1 ? "Year" : "Years"}`;
                            const reasonDisplay = careerGapReasons[stage] || gap.reason || (gapsToShow.length === 1 ? careerGapReasonInput.trim() : "");

                            return (
                              <div key={stage || idx} className="employeedetails-col-md-12 employeedetails-mb-2">
                                <div className="career-gap-review-card">
                                  <div className="career-gap-review-header">
                                    <div className="career-gap-review-title-badge">
                                      <span>Career Gap Information ({stage})</span>
                                    </div>
                                    {!isAdmin && canEditField("careerGaps") && (
                                      <button
                                        type="button"
                                        className="btn-edit-gap-reason"
                                        onClick={() => {
                                          setActiveGapStage(stage);
                                          setCareerGapReasonInput(reasonDisplay || "");
                                          setShowCareerGapModal(true);
                                        }}
                                      >
                                        {reasonDisplay ? "Edit Reason" : "+ Provide Reason"}
                                      </button>
                                    )}
                                  </div>
                                  <div className="career-gap-review-grid">
                                    <div className="career-gap-review-col">
                                      <span className="career-gap-col-label">Education Stage</span>
                                      <span className="career-gap-col-val">{stage}</span>
                                    </div>
                                    {is12toUG ? (
                                      <>
                                        <div className="career-gap-review-col">
                                          <span className="career-gap-col-label">12th Passed-Out Year</span>
                                          <span className="career-gap-col-val">{gap.passedOutYear12 || formData.passedOutYear12 || "-"}</span>
                                        </div>
                                        <div className="career-gap-review-col">
                                          <span className="career-gap-col-label">Expected UG Joining</span>
                                          <span className="career-gap-col-val">{gap.expectedUGYear || "-"}</span>
                                        </div>
                                        <div className="career-gap-review-col">
                                          <span className="career-gap-col-label">Actual UG Joining</span>
                                          <span className="career-gap-col-val">{gap.actualUGYear || "-"}</span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="career-gap-review-col">
                                          <span className="career-gap-col-label">10th Passed-Out Year</span>
                                          <span className="career-gap-col-val">{y10Display}</span>
                                        </div>
                                        <div className="career-gap-review-col">
                                          <span className="career-gap-col-label">Expected 12th Year</span>
                                          <span className="career-gap-col-val">{gap.expectedYear12 || "-"}</span>
                                        </div>
                                        <div className="career-gap-review-col">
                                          <span className="career-gap-col-label">Actual 12th Year</span>
                                          <span className="career-gap-col-val">{formData.passedOutYear12 || gap.actualYear12 || "-"}</span>
                                        </div>
                                      </>
                                    )}
                                    <div className="career-gap-review-col">
                                      <span className="career-gap-col-label">Career Gap Duration</span>
                                      <span className="career-gap-duration-pill">{durationDisplay}</span>
                                    </div>
                                  </div>
                                  <div className="career-gap-review-reason-box">
                                    <span className="career-gap-col-label">Reason for Career Gap</span>
                                    <p className="career-gap-reason-text">
                                      {reasonDisplay ? (
                                        reasonDisplay
                                      ) : (
                                        <span style={{ color: "#dc2626", fontWeight: "600" }}>
                                           Reason required. Please click "+ Provide Reason" above to enter your career gap explanation.
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </>
                )}

                {educationPath === "Diploma" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddCourse(true);
                        setNewCourse((prev) => ({ ...prev, courseType: "Diploma" }));
                      }}
                      className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-primary employeedetails-mb-4"
                    >
                      Add Diploma Course
                    </button>
                    {(() => {
                      const eligibleGaps = calculateEligibleCareerGaps({
                        passedOutYear10: formData.passedOutYear10,
                        passedOutYear12: formData.passedOutYear12,
                        educationPath,
                        courses: formData.courses,
                      });
                      const dipGap = eligibleGaps.find((g) => g.educationStage === "10th to Diploma") ||
                        (Array.isArray(formData.careerGaps) && formData.careerGaps.find((g) => g && g.educationStage === "10th to Diploma" && Number(g.gapDuration) > 0));

                      if (!dipGap) return null;
                      const stage = "10th to Diploma";
                      const durationDisplay = `${dipGap.gapDuration} ${dipGap.gapDuration === 1 ? "Year" : "Years"}`;
                      const reasonDisplay = careerGapReasons[stage] || dipGap.reason || careerGapReasonInput.trim();

                      return (
                        <div className="employeedetails-col-md-12 employeedetails-mb-4">
                          <div className="career-gap-review-card">
                            <div className="career-gap-review-header">
                              <div className="career-gap-review-title-badge">
                                <span>Career Gap Information ({stage})</span>
                              </div>
                              {!isAdmin && canEditField("careerGaps") && (
                                <button
                                  type="button"
                                  className="btn-edit-gap-reason"
                                  onClick={() => {
                                    setActiveGapStage(stage);
                                    setCareerGapReasonInput(reasonDisplay || "");
                                    setShowCareerGapModal(true);
                                  }}
                                >
                                  {reasonDisplay ? "Edit Reason" : "+ Provide Reason"}
                                </button>
                              )}
                            </div>
                            <div className="career-gap-review-grid">
                              <div className="career-gap-review-col">
                                <span className="career-gap-col-label">Education Stage</span>
                                <span className="career-gap-col-val">{stage}</span>
                              </div>
                              <div className="career-gap-review-col">
                                <span className="career-gap-col-label">10th Passed-Out Year</span>
                                <span className="career-gap-col-val">{formData.passedOutYear10 || dipGap.passedOutYear10 || "-"}</span>
                              </div>
                              <div className="career-gap-review-col">
                                <span className="career-gap-col-label">Expected Diploma Year</span>
                                <span className="career-gap-col-val">{dipGap.expectedDiplomaYear || "-"}</span>
                              </div>
                              <div className="career-gap-review-col">
                                <span className="career-gap-col-label">Actual Diploma Year</span>
                                <span className="career-gap-col-val">{dipGap.actualDiplomaYear || "-"}</span>
                              </div>
                              <div className="career-gap-review-col">
                                <span className="career-gap-col-label">Career Gap Duration</span>
                                <span className="career-gap-duration-pill">{durationDisplay}</span>
                              </div>
                            </div>
                            <div className="career-gap-review-reason-box">
                              <span className="career-gap-col-label">Reason for Career Gap</span>
                              <p className="career-gap-reason-text">
                                {reasonDisplay ? (
                                  reasonDisplay
                                ) : (
                                  <span style={{ color: "#dc2626", fontWeight: "600" }}>
                                    Reason required. Please click "+ Provide Reason" above to enter your career gap explanation.
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                <Divider />
              </>
            )}

            {/* ===== COURSES SECTION ===== */}
            {visibleSections.includes("courses") && (
              <>
                <div id="field-wrapper-courses" className="employeedetails-courses-section">
                  <div className="employeedetails-d-flex employeedetails-justify-content-between employeedetails-align-items-center employeedetails-mb-3">
                    <h6 className="employeedetails-section-title employeedetails-mb-0"> College Courses</h6>
                    {!isRejectedMode && canEditField("courses") && (
                      <button
                        className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-outline-primary"
                        onClick={() => setShowAddCourse(!showAddCourse)}
                      >
                        {showAddCourse ? "Cancel" : "+ Add Course"}
                      </button>
                    )}
                  </div>

                  {showAddCourse && canEditField("courses") && (
                    <div className="employeedetails-add-course-form employeedetails-mb-4 employeedetails-p-3 employeedetails-border employeedetails-rounded">
                      <div className="employeedetails-course-grid">
                        <div>
                          <label className="employeedetails-detail-label">Course Type</label>
                          <CustomDropdown
                            style={{ width: "100%" }}
                            placeholder="Select"
                            value={newCourse.courseType}
                            onChange={(val) =>
                              setNewCourse((prev) => ({ ...prev, courseType: val }))
                            }
                            options={[
                              { label: "Diploma", value: "Diploma" },
                              { label: "UG", value: "UG" },
                              { label: "PG", value: "PG" }
                            ]}
                          />
                        </div>

                        <DetailInput
                          label="College Name"
                          value={newCourse.collegeName}
                          onChange={(v) =>
                            setNewCourse((prev) => ({ ...prev, collegeName: v }))
                          }
                        />

                        <DetailInput
                          label="Course Name"
                          value={newCourse.courseName}
                          onChange={(v) =>
                            setNewCourse((prev) => ({ ...prev, courseName: v }))
                          }
                        />

                        <div>
                          <div className="employeedetails-field-wrapper">
                            <label className="employeedetails-detail-label">CGPA / Percentage</label>
                            <input
                              type="text"
                              placeholder="Enter CGPA (0–10) or % (0–100)"
                              value={newCourse.cgpa}
                              onChange={(v) => {
                                let cleaned = v.target.value.replace(/[^0-9.]/g, "");
                                const parts = cleaned.split(".");
                                if (parts.length > 2) {
                                  cleaned = parts[0] + "." + parts.slice(1).join("");
                                }
                                setNewCourse((prev) => ({ ...prev, cgpa: cleaned }));
                                const error = validateCgpa(cleaned);
                                setCourseErrors((prev) => ({ ...prev, cgpa: error }));
                              }}
                              className={`employeedetails-detail-input ${courseErrors.cgpa ? "employeedetails-input-error" : ""
                                }`}
                            />
                            {courseErrors.cgpa && (
                              <div className="employeedetails-field-error">
                                {courseErrors.cgpa}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="employeedetails-detail-label">Year Passed Out</label>
                          <div className="employeedetails-field-wrapper">
                            <input
                              type="text"
                              placeholder="YYYY-YYYY (e.g. 2021-2024)"
                              value={newCourse.passedOutYear}
                              onChange={(e) => {
                                const val = e.target.value;
                                setNewCourse((prev) => ({ ...prev, passedOutYear: val }));
                                if (val.length >= 9) {
                                  setCourseErrors((prev) => ({
                                    ...prev,
                                    passedOutYear: validateYearRange(val, newCourse.courseType || "UG"),
                                  }));
                                  triggerCourseCareerGapCheck(val, newCourse.courseType || "UG");
                                } else if (!val) {
                                  setCourseErrors((prev) => ({
                                    ...prev,
                                    passedOutYear: "",
                                  }));
                                }
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const err = validateYearRange(val, newCourse.courseType || "UG");
                                  setCourseErrors((prev) => ({
                                    ...prev,
                                    passedOutYear: err,
                                  }));
                                  if (!err && val.length === 9) {
                                    triggerCourseCareerGapCheck(val, newCourse.courseType || "UG");
                                  }
                                }
                              }}
                              className={`employeedetails-detail-input ${courseErrors.passedOutYear ? "employeedetails-input-error" : ""
                                }`}
                            />
                            {courseErrors.passedOutYear && (
                              <div className="employeedetails-field-error">
                                {courseErrors.passedOutYear}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="employeedetails-full">
                          <label className="employeedetails-detail-label">Degree Certificate</label>
                          <input
                            type="file"
                            className="employeedetails-detail-input employeedetails-file-input-aligned"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) {
                                setNewCourse((prev) => ({ ...prev, certificate: null }));
                                return;
                              }
                              const allowedTypes = [
                                "image/jpeg",
                                "image/png",
                                "image/jpg",
                                "image/webp",
                                "application/pdf",
                              ];
                              const maxSize = 2 * 1024 * 1024;
                              if (!allowedTypes.includes(file.type)) {
                                e.target.value = "";
                                showErrorModal("Invalid File", "Only JPG, PNG, WEBP, PDF allowed");
                                return;
                              }
                              if (file.size > maxSize) {
                                e.target.value = "";
                                showErrorModal("File Too Large", "Max size is 2MB");
                                return;
                              }
                              setNewCourse((prev) => ({
                                ...prev,
                                certificate: file,
                              }));
                            }}
                            accept="image/*,.pdf"
                          />
                        </div>
                      </div>

                      <div className="employeedetails-d-flex employeedetails-justify-content-end employeedetails-mt-3">
                        <button
                          className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-primary"
                          onClick={handleAddCourse}
                        >
                          Click to save
                        </button>
                      </div>
                    </div>
                  )}

                  {formData.courses.length > 0 && (
                    <div className="employeedetails-courses-list">
                      {formData.courses.map((course, index) => (
                        <div
                          key={course.id || `course-${index}`}
                          className="employeedetails-course-item employeedetails-mb-4 employeedetails-p-4 employeedetails-border employeedetails-rounded"
                        >
                          <div className="employeedetails-d-flex employeedetails-justify-content-between employeedetails-align-items-center employeedetails-mb-3">
                            <h6
                              className="employeedetails-mb-0"
                              style={{ fontSize: "14px", color: "#1f2937" }}
                            >
                              {course.courseType}: {course.courseName}{" "}
                              {course.passedOutYear && `(${course.passedOutYear})`}
                            </h6>
                            {canEditField("courses") && (
                              <button
                                className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-outline-danger"
                                onClick={() => handleRemoveCourse(index)}
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="employeedetails-row employeedetails-course-fields-row">
                            <div className="employeedetails-col-md-6 employeedetails-mb-3" style={{ display: !isRejectedMode ? "block" : "none" }}>
                              <DetailInput
                                label="College Name"
                                value={course.collegeName}
                                onChange={(v) => handleCourseChange(index, "collegeName", v)}
                                disabled={!canEditField("courses")} visible={!isRejectedMode}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3" style={{ display: !isRejectedMode ? "block" : "none" }}>
                              <DetailInput
                                label="Course Name"
                                value={course.courseName}
                                onChange={(v) => handleCourseChange(index, "courseName", v)}
                                disabled={!canEditField("courses")} visible={!isRejectedMode}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3" style={{ display: !isRejectedMode ? "block" : "none" }}>
                              <div style={{ padding: 0 }}>
                                <div className="employeedetails-detail-label">CGPA / Percentage</div>
                                <input
                                  type="text"
                                  placeholder="Enter CGPA (0–10) or % (0–100)"
                                  className={`employeedetails-detail-input ${!canEditField() ? "employeedetails-input-locked" : ""}`}
                                  value={course.cgpa || ""}
                                  onChange={(e) => {
                                    let cleaned = e.target.value.replace(/[^0-9.]/g, "");
                                    const parts = cleaned.split(".");
                                    if (parts.length > 2) {
                                      cleaned = parts[0] + "." + parts.slice(1).join("");
                                    }
                                    handleCourseChange(index, "cgpa", cleaned);
                                  }}
                                  onBlur={(e) => {
                                    const error = validateCgpa(e.target.value);
                                    if (error) showErrorModal("Invalid CGPA", error);
                                  }}
                                  disabled={!canEditField()}
                                  readOnly={!canEditField()}
                                />
                              </div>
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3" style={{ display: !isRejectedMode ? "block" : "none" }}>
                              <div style={{ padding: 0 }}>
                                <div className="employeedetails-detail-label">Year (e.g. 2021-2024)</div>
                                <input
                                  type="text"
                                  placeholder="2021-2024"
                                  className={`employeedetails-detail-input ${!canEditField() ? "employeedetails-input-locked" : ""}`}
                                  value={course.passedOutYear || ""}
                                  onChange={(e) => {
                                    let cleaned = e.target.value.replace(/[^0-9]/g, "");
                                    if (cleaned.length > 4) {
                                      cleaned = cleaned.slice(0, 4) + "-" + cleaned.slice(4, 8);
                                    }
                                    handleCourseChange(index, "passedOutYear", cleaned);
                                    if (cleaned.length === 9) {
                                      triggerCourseCareerGapCheck(cleaned, course.courseType || "UG", index);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    // Only validate once the user has typed a complete YYYY-YYYY value
                                    if (!val || val.length < 9) return;
                                    const yearErr = validateYearRange(val, course.courseType || "UG");
                                    if (yearErr) { showErrorModal("Invalid Year", yearErr); return; }
                                    triggerCourseCareerGapCheck(val, course.courseType || "UG", index);
                                  }}
                                  disabled={!canEditField()}
                                  readOnly={!canEditField()}
                                />
                              </div>
                            </div>
                            <div
                              id={`field-wrapper-courses.${index}.certificate`}
                              data-field-wrapper={index === 0 ? "field-wrapper-degreeCertificate" : `field-wrapper-course-certificate-${index}`}
                              className="employeedetails-col-md-6 employeedetails-mb-3"
                            >
                              <div className="employeedetails-file-upload-container">
                                <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>Degree Certificate</span>
                                </div>
                                <input
                                  type="file"
                                  className="employeedetails-detail-input employeedetails-file-input-aligned"
                                  onChange={(e) =>
                                    handleCourseFileChange(index, e.target.files[0], e.target)
                                  }
                                  accept="image/*,.pdf"
                                  disabled={!canEditField("courses") && !isFieldRejected(`courses.${index}.certificate`)}
                                />
                                {(filePreviews[`course_${course.id}_certificate`] || filePreviews[`course_${course._id}_certificate`] || course.certificateUrl || (typeof course.certificate === "string" && course.certificate)) && !(course.certificate instanceof File) && (
                                  <div className="employeedetails-file-name">
                                    Existing File: {(filePreviews[`course_${course.id}_certificate`] || filePreviews[`course_${course._id}_certificate`] || course.certificateUrl || course.certificate).split("/").pop().split("?")[0]}
                                  </div>
                                )}
                                {renderCourseFilePreview(index)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Divider />

                {/* ===== PROFESSIONAL CERTIFICATIONS / EXTRA COURSES ===== */}
                {(!isRejectedMode ? canEditField("courses") : (isFieldRejected("professionalCertifications") || isFieldRejected("courses") || rejectedFields?.some(rf => String(rf).includes("professionalCertifications")))) && (
                  <div className="employeedetails-certifications-section" style={{ marginTop: "24px", marginBottom: "24px" }}>
                    <div className="employeedetails-cert-section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "10px" }}>
                      <div>
                        <h6 className="employeedetails-section-title" style={{ marginBottom: "6px" }}>
                          Professional Certifications / Additional Courses
                        </h6>
                        <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                          Have you completed any additional certifications or short courses (e.g., MERN Stack, AWS, etc.)?
                        </p>
                      </div>
                      {!isRejectedMode && hasCertifications === "yes" && (
                        <button
                          type="button"
                          className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-primary"
                          onClick={handleAddCertification}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          + Add Certification
                        </button>
                      )}
                    </div>

                    {!isRejectedMode && (
                      <div className="employeedetails-cert-radios" style={{ display: "flex", gap: "20px", marginBottom: "18px", alignItems: "center", flexWrap: "wrap" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: hasCertifications === "yes" ? "#4f46e5" : "#374151" }}>
                          <input
                            type="radio"
                            name="hasCertifications"
                            value="yes"
                            checked={hasCertifications === "yes"}
                            onChange={() => handleHasCertificationsChange("yes")}
                            style={{ accentColor: "#4f46e5" }}
                          />
                          Yes, I have certifications
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500", color: hasCertifications === "no" ? "#4f46e5" : "#374151" }}>
                          <input
                            type="radio"
                            name="hasCertifications"
                            value="no"
                            checked={hasCertifications === "no"}
                            onChange={() => handleHasCertificationsChange("no")}
                            style={{ accentColor: "#4f46e5" }}
                          />
                          No
                        </label>
                      </div>
                    )}

                    {(hasCertifications === "yes" || isRejectedMode) && (
                      <>
                        {certifications.length === 0 ? (
                          <div style={{ padding: "28px 16px", textAlign: "center", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px dashed #d1d5db" }}>
                            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
                              No certifications added yet. Click <strong>"+ Add Certification"</strong> to add one.
                            </p>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {certifications.map((cert, index) => (
                              <div
                                key={cert.id || index}
                                id={`field-wrapper-professionalCertifications.${index}.certificate`}
                                data-field-wrapper={`field-wrapper-prof-cert-${index}`}
                                className="employeedetails-course-card employeedetails-p-4 employeedetails-border employeedetails-rounded"
                                style={{
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "8px",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                                  <span style={{ fontWeight: 600, fontSize: "14px", color: "#1f2937", wordBreak: "break-word" }}>
                                    {cert.courseName?.trim() ? cert.courseName : `Certification #${index + 1}`}
                                  </span>
                                  {!isRejectedMode && (
                                    <button
                                      type="button"
                                      className="employeedetails-btn employeedetails-btn-sm employeedetails-btn-outline-danger"
                                      onClick={() => handleRemoveCertification(index)}
                                      style={{ fontSize: "12px", padding: "4px 10px" }}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>

                                <div className="employeedetails-course-grid">
                                  {/* Course Name */}
                                  <div style={{ display: !isRejectedMode ? "block" : "none" }}>
                                    <div className="employeedetails-detail-label">
                                      Course Name <span style={{ color: "#ef4444" }}>*</span>
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="e.g. MERN Stack Development"
                                      className={`employeedetails-detail-input ${certificationErrors[index]?.courseName ? "employeedetails-input-error" : ""}`}
                                      value={cert.courseName || ""}
                                      onChange={(e) => handleCertFieldChange(index, "courseName", e.target.value)}
                                    />
                                    {certificationErrors[index]?.courseName && (
                                      <div className="employeedetails-field-error">{certificationErrors[index].courseName}</div>
                                    )}
                                  </div>

                                  {/* Start Month and Year */}
                                  <div style={{ display: !isRejectedMode ? "block" : "none" }}>
                                    <div className="employeedetails-detail-label">
                                      Start Month and Year <span style={{ color: "#ef4444" }}>*</span>
                                    </div>
                                    <div style={{ position: "relative", width: "100%" }}>
                                      <input
                                        type="month"
                                        className={`employeedetails-detail-input custom-cert-month-input ${certificationErrors[index]?.startMonthYear ? "employeedetails-input-error" : ""}`}
                                        value={cert.startMonthYear || ""}
                                        onChange={(e) => handleCertFieldChange(index, "startMonthYear", e.target.value)}
                                        style={{ width: "100%", paddingRight: "44px", position: "relative", zIndex: 1 }}
                                      />
                                      <img
                                        src="/Calander.svg"
                                        alt="Calendar"
                                        style={{
                                          position: "absolute",
                                          right: "12px",
                                          top: "50%",
                                          transform: "translateY(-50%)",
                                          width: "15px",
                                          height: "15px",
                                          pointerEvents: "none",
                                          zIndex: 3
                                        }}
                                      />
                                    </div>
                                    {certificationErrors[index]?.startMonthYear && (
                                      <div className="employeedetails-field-error">{certificationErrors[index].startMonthYear}</div>
                                    )}
                                  </div>

                                  {/* End Month and Year */}
                                  <div style={{ display: !isRejectedMode ? "block" : "none" }}>
                                    <div className="employeedetails-detail-label">
                                      End Month and Year <span style={{ color: "#ef4444" }}>*</span>
                                    </div>
                                    <div style={{ position: "relative", width: "100%" }}>
                                      <input
                                        type="month"
                                        className={`employeedetails-detail-input custom-cert-month-input ${certificationErrors[index]?.endMonthYear ? "employeedetails-input-error" : ""}`}
                                        value={cert.endMonthYear || ""}
                                        onChange={(e) => handleCertFieldChange(index, "endMonthYear", e.target.value)}
                                        style={{ width: "100%", paddingRight: "44px", position: "relative", zIndex: 1 }}
                                      />
                                      <img
                                        src="/Calander.svg"
                                        alt="Calendar"
                                        style={{
                                          position: "absolute",
                                          right: "12px",
                                          top: "50%",
                                          transform: "translateY(-50%)",
                                          width: "15px",
                                          height: "15px",
                                          pointerEvents: "none",
                                          zIndex: 3
                                        }}
                                      />
                                    </div>
                                    {certificationErrors[index]?.endMonthYear && (
                                      <div className="employeedetails-field-error">{certificationErrors[index].endMonthYear}</div>
                                    )}
                                  </div>

                                  {/* Course Duration */}
                                  <div style={{ display: !isRejectedMode ? "block" : "none" }}>
                                    <div className="employeedetails-detail-label">
                                      Course Duration <span style={{ color: "#ef4444" }}>*</span>
                                    </div>
                                    <div className="employeedetails-duration-control" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                      <input
                                        type="text"
                                        placeholder="e.g. 6"
                                        style={{ flex: "0 0 90px", minWidth: "75px", backgroundColor: "#f9fafb" }}
                                        className={`employeedetails-detail-input ${certificationErrors[index]?.courseDuration ? "employeedetails-input-error" : ""}`}
                                        value={cert.durationValue || ""}
                                        readOnly
                                      />
                                      <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                                        <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", cursor: "pointer", fontWeight: "500", color: (cert.durationType || cert.durationUnit) !== "Years" ? "#4f46e5" : "#374151", whiteSpace: "nowrap" }}>
                                          <input
                                            type="radio"
                                            name={`certDurationUnit_${index}`}
                                            value="Months"
                                            checked={(cert.durationType || cert.durationUnit) !== "Years"}
                                            onChange={() => handleCertDurationTypeChange(index, "Months")}
                                            style={{ accentColor: "#4f46e5" }}
                                          />
                                          Month(s)
                                        </label>
                                        <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "13px", cursor: "pointer", fontWeight: "500", color: (cert.durationType || cert.durationUnit) === "Years" ? "#4f46e5" : "#374151", whiteSpace: "nowrap" }}>
                                          <input
                                            type="radio"
                                            name={`certDurationUnit_${index}`}
                                            value="Years"
                                            checked={(cert.durationType || cert.durationUnit) === "Years"}
                                            onChange={() => handleCertDurationTypeChange(index, "Years")}
                                            style={{ accentColor: "#4f46e5" }}
                                          />
                                          Year(s)
                                        </label>
                                      </div>
                                    </div>
                                    {certificationErrors[index]?.courseDuration && (
                                      <div className="employeedetails-field-error">{certificationErrors[index].courseDuration}</div>
                                    )}
                                  </div>

                                  {/* Course Type */}
                                  <div style={{ display: !isRejectedMode ? "block" : "none" }}>
                                    <div className="employeedetails-detail-label">
                                      Course Type <span style={{ color: "#ef4444" }}>*</span>
                                    </div>
                                    <CustomDropdown
                                      style={{ width: "100%" }}
                                      placeholder="Select Course Type"
                                      value={cert.courseType || ""}
                                      onChange={(val) => handleCertFieldChange(index, "courseType", val)}
                                      options={[
                                        { label: "Online", value: "Online" },
                                        { label: "Offline", value: "Offline" },
                                        { label: "Hybrid", value: "Hybrid" },
                                        { label: "Self-Study", value: "Self-Study" },
                                      ]}
                                    />
                                    {certificationErrors[index]?.courseType && (
                                      <div className="employeedetails-field-error" style={{ marginTop: "4px" }}>
                                        {certificationErrors[index].courseType}
                                      </div>
                                    )}
                                  </div>

                                  {/* Institution / College Name */}
                                  <div style={{ display: !isRejectedMode ? "block" : "none" }}>
                                    <div className="employeedetails-detail-label">
                                      Institution Name <span style={{ color: "#ef4444" }}>*</span>
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="e.g. Udemy, Coursera, NIIT"
                                      className={`employeedetails-detail-input ${certificationErrors[index]?.institutionName ? "employeedetails-input-error" : ""}`}
                                      value={cert.institutionName || ""}
                                      onChange={(e) => handleCertFieldChange(index, "institutionName", e.target.value)}
                                    />
                                    {certificationErrors[index]?.institutionName && (
                                      <div className="employeedetails-field-error">{certificationErrors[index].institutionName}</div>
                                    )}
                                  </div>

                                  {/* Certificate Upload */}
                                  <div id={`field-wrapper-prof-cert-${index}`} className="employeedetails-full">
                                    <div className="employeedetails-detail-label">Certificate</div>
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      className="employeedetails-detail-input employeedetails-file-input-aligned"
                                      onChange={(e) => handleCertFileChange(index, e.target.files[0], e.target)}
                                      disabled={!canEditField("courses") && !isFieldRejected("professionalCertifications") && !isFieldRejected(`professionalCertifications.${index}.certificate`)}
                                    />
                                    {cert.certificateFile && (
                                      <div className="employeedetails-file-name" style={{ color: "#16a34a", fontSize: "12px", marginTop: "4px" }}>
                                        📎 Selected: {cert.certificateFile.name}
                                      </div>
                                    )}
                                    {!cert.certificateFile && (cert.certificateUrl || (typeof cert.certificate === "string" && cert.certificate)) && (
                                      <div className="employeedetails-file-name" style={{ marginTop: "4px" }}>
                                        Existing File: {(cert.certificateUrl || cert.certificate).split("/").pop().split("?")[0]}
                                      </div>
                                    )}
                                    {renderCertFilePreview(index)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                <Divider />
              </>
            )}

            {/* ===== KYC DETAILS ===== */}
            {(visibleSections.includes("kyc") || visibleSections.includes("kycBank")) && (
              <>
                <h6 className="employeedetails-section-title">KYC Details</h6>
                <div className="employeedetails-row">
                  <div id="field-wrapper-aadhaarNo" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("aadhaarNo")) ? "block" : "none" }}>
                    <div className="employeedetails-detail-label">Aadhaar No (12 digit)</div>
                    <div className="employeedetails-field-wrapper">
                      <div style={{ position: "relative" }}>
                        <input
                          className={`employeedetails-detail-input ${kycErrors.aadhaarNo ? "employeedetails-input-error" : ""
                            }`}
                          type="text"
                          value={showAadhaar ? (formData.aadhaarNo || "") : maskAadhaarLocal(formData.aadhaarNo || "")}
                          onChange={(e) => handleKycChange("aadhaarNo", e.target.value)}
                          maxLength={12}
                          placeholder="Enter 12-digit Aadhaar number"
                          disabled={!canEditField("aadhaarNo")}
                        />
                        <button
                          type="button"
                          className="employeedetails-visibility-toggle"
                          onClick={toggleAadhaarVisibility}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center"
                          }}
                          disabled={isFetchingAadhaar}
                        >
                          {isFetchingAadhaar ? (
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                          ) : (
                            <Icon icon={showAadhaar ? "lucide:eye-off" : "lucide:eye"} width={20} />
                          )}
                        </button>
                      </div>
                      {kycErrors.aadhaarNo && (
                        <div className="employeedetails-field-error">
                          {kycErrors.aadhaarNo}
                        </div>
                      )}
                    </div>
                  </div>
                  <div id="field-wrapper-panNo" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("panNo")) ? "block" : "none" }}>
                    <div className="employeedetails-detail-label">PAN Number</div>
                    <div className="employeedetails-field-wrapper">
                      <div style={{ position: "relative" }}>
                        <input
                          className={`employeedetails-detail-input ${kycErrors.panNo ? "employeedetails-input-error" : ""
                            }`}
                          type="text"
                          value={showPan ? (formData.panNo || "") : maskPanLocal(formData.panNo || "")}
                          onChange={(e) => handleKycChange("panNo", e.target.value)}
                          maxLength={10}
                          placeholder="ABCDE1234F"
                          disabled={!canEditField("panNo")}
                        />
                        <button
                          type="button"
                          className="employeedetails-visibility-toggle"
                          onClick={togglePanVisibility}
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#6b7280",
                            display: "flex",
                            alignItems: "center"
                          }}
                          disabled={isFetchingPan}
                        >
                          {isFetchingPan ? (
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                          ) : (
                            <Icon icon={showPan ? "lucide:eye-off" : "lucide:eye"} width={20} />
                          )}
                        </button>
                      </div>
                      {kycErrors.panNo && (
                        <div className="employeedetails-field-error">
                          {kycErrors.panNo}
                        </div>
                      )}
                    </div>
                  </div>

                  <div id="field-wrapper-aadhaarFile" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("aadhaarFile")) ? "block" : "none" }}>
                    <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Aadhaar Upload</span>
                      <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>* Note: Only use the masked aadhar files only</span>
                    </div>
                    <div className="employeedetails-file-upload-container">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("aadhaarFile", e.target.files[0], e.target)}
                        className="employeedetails-detail-input"
                        disabled={!canEditField("aadhaarFile")}
                      />

                      {filePreviews.aadhaarFile && (
                        <div className="employeedetails-file-name">
                          Existing File: {getFileName(filePreviews.aadhaarFile)}
                        </div>
                      )}

                      {renderFilePreview("aadhaarFile", "Aadhaar Upload")}
                    </div>
                  </div>

                  <div id="field-wrapper-panFile" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("panFile")) ? "block" : "none" }}>
                    <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>PAN Card</span>
                    </div>
                    <div className="employeedetails-file-upload-container">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("panFile", e.target.files[0], e.target)}
                        className="employeedetails-detail-input"
                        disabled={!canEditField("panFile")}
                      />

                      {filePreviews.panFile && (
                        <div className="employeedetails-file-name">
                          Existing File: {getFileName(filePreviews.panFile)}
                        </div>
                      )}

                      {renderFilePreview("panFile", "PAN Card")}
                    </div>
                  </div>
                </div>
                <Divider />
              </>
            )}

            {/* ===== PF DETAILS ===== */}
            {visibleSections.includes("pf") && (
              <>
                <h6 className="employeedetails-section-title">PF Details (Optional)</h6>
                <div className="employeedetails-row">
                  <DetailInput
                    label="PF Number"
                    value={formData.pfNo}
                    onChange={(v) => handleChange("pfNo", v)}
                    disabled={!canEditField()} visible={canEditField()}
                  />
                </div>
                <Divider />
              </>
            )}

            {/* ===== BANK DETAILS ===== */}
            {(visibleSections.includes("bank") || visibleSections.includes("kycBank")) && (
              <>
                <h6 className="employeedetails-section-title">Bank Details</h6>
                <div className="employeedetails-row">
                  <DetailInput
                    id="field-wrapper-bankName"
                    label="Bank Name"
                    value={formData.bankName}
                    onChange={(v) => handleChange("bankName", v)}
                    disabled={!canEditField("bankName")}
                    visible={!isRejectedMode || canEditField("bankName")}
                  />
                  <DetailInput
                    id="field-wrapper-accountHolder"
                    label="Account Holder Name"
                    value={formData.accountHolder}
                    onChange={(v) => handleChange("accountHolder", v)}
                    disabled={!canEditField("accountHolder")}
                    visible={!isRejectedMode || canEditField("accountHolder")}
                  />

                  <div id="field-wrapper-accountNumber" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("accountNumber")) ? "block" : "none" }}>
                    <div className="employeedetails-detail-label">Account Number</div>
                    <div className="employeedetails-field-wrapper">
                      <input
                        type="text"
                        placeholder="Enter 9–18 digit account number"
                        value={formData.accountNumber || ""}
                        onChange={(e) => handleAccountNumberChange(e.target.value)}
                        maxLength={18}
                        inputMode="numeric"
                        className={`employeedetails-detail-input ${bankErrors.accountNumber ? "employeedetails-input-error" : ""
                          } ${!canEditField("accountNumber") ? "employeedetails-input-locked" : ""}`}
                        disabled={!canEditField("accountNumber")}
                        readOnly={!canEditField("accountNumber")}
                      />
                      {bankErrors.accountNumber && (
                        <div className="employeedetails-field-error">
                          {bankErrors.accountNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  <div id="field-wrapper-ifscCode" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("ifscCode")) ? "block" : "none" }}>
                    <div className="employeedetails-detail-label">IFSC Code</div>
                    <div className="employeedetails-field-wrapper">
                      <input
                        type="text"
                        placeholder="Enter IFSC Code (e.g. HDFC0001234)"
                        value={formData.ifscCode || ""}
                        onChange={(e) => handleIfscChange(e.target.value)}
                        maxLength={11}
                        className={`employeedetails-detail-input ${bankErrors.ifscCode ? "employeedetails-input-error" : ""
                          } ${!canEditField("ifscCode") ? "employeedetails-input-locked" : ""}`}
                        disabled={!canEditField("ifscCode")}
                        readOnly={!canEditField("ifscCode")}
                      />
                      {bankErrors.ifscCode && (
                        <div className="employeedetails-field-error">
                          {bankErrors.ifscCode}
                        </div>
                      )}
                      {isIFSCFetching && (
                        <div className="employeedetails-ifsc-loading" style={{ color: "#667eea", fontSize: "12px", marginTop: "4px" }}>
                          Fetching bank details...
                        </div>
                      )}
                    </div>
                  </div>

                  <div id="field-wrapper-branch" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("branch")) ? "block" : "none" }}>
                    <div className="employeedetails-detail-label">Branch Name</div>
                    <div className="employeedetails-field-wrapper">
                      <input
                        type="text"
                        placeholder="Enter Branch Name"
                        value={formData.branch || ""}
                        onChange={(e) => handleChange("branch", e.target.value)}
                        className={`employeedetails-detail-input ${!canEditField("branch") ? "employeedetails-input-locked" : ""}`}
                        disabled={!canEditField("branch")}
                        readOnly={!canEditField("branch")}
                      />
                    </div>
                  </div>

                  {/* 🔥 NEW: End Date for Previous Account (Only if changed) */}
                  {formData.accountNumber && originalAccountNumber && formData.accountNumber !== originalAccountNumber && !formData.accountNumber.includes("X") && (
                    <div className="employeedetails-col-md-12 employeedetails-mb-4">
                      <div className="employeedetails-detail-label" style={{ color: "#667eea", fontWeight: "600" }}>
                        End Date of Previous Account (To Date)
                      </div>
                      <div className="employeedetails-field-wrapper">
                        <input
                          type="date"
                          value={formData.toDate || ""}
                          onChange={(e) => handleChange("toDate", e.target.value)}
                          className="employeedetails-detail-input"
                          style={{ border: "2px solid #667eea" }}
                        />
                        <small style={{ color: "#718096", display: "block", marginTop: "4px" }}>
                          Select the date when your previous account became inactive.
                        </small>
                      </div>
                    </div>
                  )}

                  <div id="field-wrapper-passbookFile" className="employeedetails-col-md-6 employeedetails-mb-4" style={{ display: (!isRejectedMode || canEditField("passbookFile")) ? "block" : "none" }}>
                    <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Bank Passbook/Cancelled Cheque</span>
                    </div>
                    <div className="employeedetails-file-upload-container">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("passbookFile", e.target.files[0], e.target)}
                        className="employeedetails-detail-input"
                        disabled={!canEditField("passbookFile")}
                      />

                      {filePreviews.passbookFile && (
                        <div className="employeedetails-file-name">
                          Existing File: {getFileName(filePreviews.passbookFile)}
                        </div>
                      )}

                      {renderFilePreview("passbookFile", "Passbook")}
                    </div>
                  </div>
                </div>
                <Divider />
              </>
            )}

            {/* ===== DOCUMENTS ===== */}
            {visibleSections.includes("documents") && (
              <>
                <h6 className="employeedetails-section-title">Documents Upload</h6>
                <div className="employeedetails-row">
                  <div className="employeedetails-col-md-6 employeedetails-mb-4">
                    <FileUploadWithPreview
                      label="Profile Picture"
                      onChange={(f, inputEl) => handleFileChange("picture", f, inputEl)}
                      accept="image/*"
                      preview={getFilePreview("picture")}
                      existingFileName={filePreviews.picture}
                      disabled={!canEditField()} visible={canEditField()}
                    />
                  </div>
                </div>

              </>
            )}

            {/* ===== FORM ACTIONS ===== */}
            <div className="employeedetails-form-actions">
              {isHrRestrictedFromEdit ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%" }}>
                  <div style={{
                    background: "#fef3c7",
                    border: "1px solid #f59e0b",
                    color: "#92400e",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    <span>⚠️</span>
                    <span>Direct editing of employee profiles is disabled for HR by Administrator Configuration.</span>
                  </div>
                  <button
                    type="button"
                    className="employeedetails-btn-save"
                    style={{ background: "#3A466D", cursor: "pointer" }}
                    onClick={() => navigate("/admin/employees/manage-employee")}
                  >
                    Back to Employee Directory
                  </button>
                </div>
              ) : (
                <>
                  {!effectiveIsAdmin && !canEditProfile && (
                    <p style={{ color: "#f44336", marginBottom: "10px", fontSize: "14px" }}>
                      {editMessage || "You are not allowed to edit your profile. Please send a request."}
                    </p>
                  )}
                  <button
                    className="employeedetails-btn-save"
                    onClick={handleSave}
                    disabled={isSaving || (!effectiveIsAdmin && !canEditProfile)}
                  >
                    {isSaving
                      ? "Saving..."
                      : approvalStatus === "rejected"
                        ? "Resubmit for Admin Review"
                        : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ✅ NEW CROP MODAL */}
      {showCropModal && (
        <div className="employeedetails-modal-overlay">
          <div className="employeedetails-modal-card" style={{ width: 400 }}>
            <h4>Crop Image</h4>

            <div style={{ position: "relative", width: "100%", height: 300 }}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                className="common-modal-btn btn-small-cancel"
                onClick={() => setShowCropModal(false)}
              >
                Cancel
              </button>

              <button
                className="employeedetails-btn-save"
                onClick={handleCropApply}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CAREER GAP POPUP MODAL ================= */}
      {showCareerGapModal && (() => {
        const eligibleGaps = calculateEligibleCareerGaps({
          passedOutYear10: formData.passedOutYear10,
          passedOutYear12: formData.passedOutYear12,
          educationPath,
          courses: formData.courses,
        });
        const currentGap = eligibleGaps.find((g) => g.educationStage === activeGapStage) || eligibleGaps[0];
        const stage = currentGap?.educationStage || activeGapStage || "10th to 12th Standard";

        let subtitle = "Please explain the career gap for your education timeline.";
        if (stage === "10th to 12th Standard") {
          subtitle = "Please explain the gap between your 10th and 12th Standard education timeline.";
        } else if (stage === "12th Standard to UG / Engineering") {
          subtitle = "Please explain the gap between your 12th Standard completion and UG / Engineering admission.";
        } else if (stage === "10th to Diploma") {
          subtitle = "Please explain the gap between your 10th Standard completion and Diploma admission.";
        } else if (stage === "12th Standard to Diploma") {
          subtitle = "Please explain the gap between your 12th Standard completion and Diploma admission.";
        } else if (stage === "Diploma to UG / Engineering") {
          subtitle = "Please explain the gap between your Diploma completion and UG / Engineering admission.";
        }

        return (
          <div className="employeedetails-modal-overlay">
            <div className="employeedetails-modal-card career-gap-modal-card" style={{ maxWidth: 520, width: "95%" }}>
              <div className="career-gap-modal-header">
                <div style={{ flex: 1, paddingRight: "20px" }}>
                  <h4 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#1f2937", textAlign:"left" }}>
                    Career Gap Detected
                  </h4>
                  <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#6b7280" }}>
                    {subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  className="career-gap-modal-close"
                  onClick={() => {
                    setShowCareerGapModal(false);
                    setCareerGapModalError("");
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="career-gap-details-grid">
                <div className="career-gap-grid-item">
                  <span className="career-gap-label">Education Stage</span>
                  <span className="career-gap-value">{stage}</span>
                </div>
                {stage === "12th Standard to UG / Engineering" ? (
                  <>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">12th Passed-Out Year</span>
                      <span className="career-gap-value">{currentGap?.passedOutYear12 || formData.passedOutYear12 || "-"}</span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Expected UG Joining</span>
                      <span className="career-gap-value font-highlight">{currentGap?.expectedUGYear || formData.passedOutYear12 || "-"}</span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Actual UG Joining</span>
                      <span className="career-gap-value font-highlight">{currentGap?.actualUGYear || (() => {
                        const ug = (formData.courses || []).find((c) => String(c?.courseType || "UG").toUpperCase() === "UG" || String(c?.courseType || "").toUpperCase() === "ENGINEERING");
                        return ug ? getCourseJoiningYear(ug) : "-";
                      })() || "-"}</span>
                    </div>
                  </>
                ) : stage === "10th to Diploma" ? (
                  <>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">10th Passed-Out Year</span>
                      <span className="career-gap-value">{currentGap?.passedOutYear10 || formData.passedOutYear10 || "-"}</span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Expected Diploma Joining</span>
                      <span className="career-gap-value font-highlight">{currentGap?.expectedDiplomaYear || "-"}</span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Actual Diploma Joining</span>
                      <span className="career-gap-value font-highlight">{currentGap?.actualDiplomaYear || "-"}</span>
                    </div>
                  </>
                ) : stage === "12th Standard to Diploma" ? (
                  <>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">12th Passed-Out Year</span>
                      <span className="career-gap-value">{currentGap?.passedOutYear12 || formData.passedOutYear12 || "-"}</span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Expected Diploma Joining</span>
                      <span className="career-gap-value font-highlight">{currentGap?.expectedDiplomaYear || "-"}</span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Actual Diploma Joining</span>
                      <span className="career-gap-value font-highlight">{currentGap?.actualDiplomaYear || "-"}</span>
                    </div>
                  </>
                ) : stage === "Diploma to UG / Engineering" ? (
                  <>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Diploma Completion Year</span>
                      <span className="career-gap-value">{currentGap?.passedOutYearDiploma || "-"}</span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Expected UG Joining</span>
                      <span className="career-gap-value font-highlight">{currentGap?.expectedUGYear || "-"}</span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Actual UG Joining</span>
                      <span className="career-gap-value font-highlight">{currentGap?.actualUGYear || "-"}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">10th Passed-Out Year</span>
                      <span className="career-gap-value">{formData.passedOutYear10 || "-"}</span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Expected Completion Year</span>
                      <span className="career-gap-value font-highlight">
                        {currentGap?.expectedYear12 || (formData.passedOutYear10 ? parseInt(formData.passedOutYear10, 10) + 2 : "-")}
                      </span>
                    </div>
                    <div className="career-gap-grid-item">
                      <span className="career-gap-label">Actual Completion Year</span>
                      <span className="career-gap-value font-highlight">
                        {formData.passedOutYear12 || "-"}
                      </span>
                    </div>
                  </>
                )}
                <div className="career-gap-grid-item full-width highlight-duration">
                  <span className="career-gap-label">Career Gap Duration</span>
                  <span className="career-gap-value-badge">
                    {(() => {
                      if (currentGap && currentGap.gapDuration > 0) {
                        return `${currentGap.gapDuration} ${currentGap.gapDuration === 1 ? "Year" : "Years"}`;
                      }
                      if (stage === "12th Standard to UG / Engineering") {
                        const y12 = parseInt(String(formData.passedOutYear12 || "").trim(), 10);
                        const ug = (formData.courses || []).find((c) => String(c?.courseType || "UG").toUpperCase() === "UG" || String(c?.courseType || "").toUpperCase() === "ENGINEERING");
                        const joining = ug ? getCourseJoiningYear(ug) : null;
                        if (!isNaN(y12) && joining && joining > y12) {
                          const d = joining - y12;
                          return `${d} ${d === 1 ? "Year" : "Years"}`;
                        }
                      }
                      return "0 Years";
                    })()}
                  </span>
                </div>
              </div>

              <div className="career-gap-reason-section">
                <label className="employeedetails-detail-label">
                  Reason for Career Gap ({stage}) <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  className={`employeedetails-detail-input career-gap-textarea ${careerGapModalError ? "employeedetails-input-error" : ""}`}
                  rows={4}
                  placeholder="Explain the reason for the career gap (required)..."
                  value={careerGapReasonInput}
                  onChange={(e) => {
                    setCareerGapReasonInput(e.target.value);
                    if (e.target.value.trim()) setCareerGapModalError("");
                  }}
                />
                {careerGapModalError && (
                  <div className="employeedetails-field-error" style={{ marginTop: "4px" }}>
                    {careerGapModalError}
                  </div>
                )}
              </div>

              <div className="career-gap-modal-actions">
                <button
                  type="button"
                  className="common-modal-btn btn-small-cancel"
                  onClick={() => {
                    setShowCareerGapModal(false);
                    setCareerGapModalError("");
                  }}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="employeedetails-btn-save"
                  onClick={handleSaveCareerGapReason}
                >
                  Submit Reason
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= CUSTOM MODAL ================= */}
      {showModal && (
        <>
          <div
            className="employeedetails-modal-backdrop"
            style={{
              position: "fixed", top: 0, left: 0,
              width: "100vw", height: "100vh",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 9998,
              animation: "fadeIn 0.3s ease",
            }}
            onClick={closeModal}
          />
          <div
            className="employeedetails-modal-container"
            style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 9999,
              animation: "slideIn 0.4s ease",
            }}
          >
            <div
              className="employeedetails-modal-content"
              style={{
                backgroundColor: "white", borderRadius: "20px",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                width: "380px", maxWidth: "90vw", overflow: "hidden",
                border: modalType === "success" ? "2px solid #4CAF50" : "2px solid #f44336",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="employeedetails-modal-header"
                style={{
                  padding: "25px 25px 15px", textAlign: "center",
                  background: modalType === "success"
                    ? "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)"
                    : "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
                  position: "relative",
                }}
              >
                <div style={{
                  width: "70px", height: "70px", borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 15px", animation: "pulse 2s infinite",
                }}>
                  <div style={{
                    width: "50px", height: "50px", borderRadius: "50%",
                    backgroundColor: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  }}>
                    {modalType === "success" ? (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#4CAF50" />
                      </svg>
                    ) : (
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="#f44336" />
                      </svg>
                    )}
                  </div>
                </div>
                <h3 style={{ margin: 0, color: "white", fontSize: "20px", fontWeight: "600", letterSpacing: "0.5px" }}>
                  {modalTitle}
                </h3>
                <button
                  onClick={closeModal}
                  style={{
                    position: "absolute", top: "15px", right: "15px",
                    background: "rgba(255,255,255,0.2)", border: "none",
                    width: "32px", height: "32px", borderRadius: "50%",
                    color: "white", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "18px", transition: "all 0.3s ease",
                  }}
                >
                  ×
                </button>
              </div>

              <div className="employeedetails-modal-body" style={{ padding: "20px 25px", textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: "16px", color: "#555", lineHeight: "1.6", marginBottom: "10px" }}>
                  {modalMessage}
                </p>
              </div>

              <div className="employeedetails-modal-footer" style={{ padding: "15px 25px 25px", textAlign: "center", borderTop: "1px solid #f0f0f0" }}>
                <button
                  onClick={closeModal}
                  style={{
                    backgroundColor: modalType === "success" ? "#4CAF50" : "#f44336",
                    color: "white", border: "none",
                    padding: "12px 40px", borderRadius: "50px",
                    fontSize: "16px", fontWeight: "600", cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                    minWidth: "150px", letterSpacing: "0.5px",
                  }}
                >
                  {modalType === "success"
                    ? (isAdmin ? "Profile Updated" : "Go to My Details")
                    : "Try Again"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn {
          from { opacity: 0; transform: translate(-50%, -60%); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes pulse {
          0%   { transform: scale(1);    opacity: 1; }
          50%  { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1);    opacity: 1; }
        }
      `}</style>
      <ToastContainer />
    </div>
  );
};



/* ================= REUSABLE COMPONENTS ================= */
const Divider = () => <div className="employeedetails-section-divider" />;

const LockedField = ({ label, value, editable = false, onChange, type = "text", visible = true, id }) => {
  if (!visible) return null;
  return (
    <div id={id} className="employeedetails-col-md-6 employeedetails-mb-4">
      <div className="employeedetails-detail-label">{label}</div>
      <input
        className={`employeedetails-detail-input ${!editable ? "employeedetails-input-locked" : ""}`}
        type={type}
        value={value || ""}
        onChange={(e) => editable && onChange && onChange(e.target.value)}
        readOnly={!editable}
        disabled={!editable}
      />
    </div>
  );
};

const DetailInput = ({
  label,
  value,
  onChange,
  full,
  type = "text",
  placeholder = "",
  disabled = false,
  maxLength,
  onKeyDown,
  visible = true,
  id,
}) => {
  if (!visible) return null;
  return (
    <div id={id} className={`employeedetails-col-md-${full ? "12" : "6"} employeedetails-mb-4`}>
      <div className="employeedetails-detail-label">{label}</div>
      <input
        className={`employeedetails-detail-input ${disabled ? "employeedetails-input-locked" : ""}`}
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={disabled}
        maxLength={maxLength}
        onKeyDown={onKeyDown}
        inputMode={type === "tel" ? "numeric" : undefined}
      />
    </div>
  );
};

const DetailSelect = ({ label, value, onChange, options, disabled = false, visible = true, className = "", id }) => {
  if (!visible) return null;
  const formattedOptions = options.map((opt) =>
    typeof opt === "object" ? opt : { label: opt, value: opt }
  );

  return (
    <div id={id} className={`employeedetails-col-md-6 employeedetails-mb-4 ${className}`}>
      <div className="employeedetails-detail-label">{label}</div>
      <div style={disabled ? { pointerEvents: "none", opacity: 0.6 } : {}}>
        <CustomDropdown
          style={{ width: "100%" }}
          placeholder="Select"
          value={value || ""}
          onChange={onChange}
          options={formattedOptions}
        />
      </div>
    </div>
  );
};

const FileUploadWithPreview = ({
  label,
  onChange,
  preview,
  accept,
  disabled,
  existingFileName,
  visible = true,
}) => {
  if (!visible) return null;
  const getCleanFileName = (url) => {
    if (!url) return null;
    try {
      const decoded = decodeURIComponent(url.split("?")[0]);
      const parts = decoded.split("/");
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  };

  const cleanName = getCleanFileName(existingFileName);
  const isImagePreview =
    preview &&
    (preview.startsWith("blob:") ||
      /\.(jpeg|jpg|gif|png|webp)/i.test(preview.split("?")[0]));

  return (
    <div className="employeedetails-file-upload-container">
      <div className="employeedetails-detail-label">{label}</div>

      <input
        type="file"
        className="employeedetails-detail-input"
        accept={accept}
        onChange={(e) => onChange(e.target.files[0], e.target)}
        disabled={disabled}
      />

      {cleanName && !preview?.startsWith("blob:") && (
        <div className="employeedetails-file-name">
          Existing File: {cleanName}
        </div>
      )}

      {preview && isImagePreview && (
        <div style={{ marginTop: "10px" }}>
          <img
            src={preview}
            alt="preview"
            style={{
              width: "80px",
              height: "80px",
              objectFit: "cover",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />
        </div>
      )}

      {preview && !isImagePreview && !preview.startsWith("blob:") && (
        <div className="employeedetails-document-preview" style={{ marginTop: "10px" }}>
          <a href={preview} target="_blank" rel="noopener noreferrer" className="employeedetails-text-primary">
            View {label}
          </a>
        </div>
      )}
    </div>
  );
};

export default EmployeeDetails;
