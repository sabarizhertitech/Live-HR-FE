import React, { useState, useEffect, useMemo, useCallback } from "react";
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

const EmployeeDetails = ({ isAdmin = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { empId } = useParams();
  const { user, setUser } = useUser();
  const isPrivileged = isAdmin || user?.role === "admin" || Boolean(user?.isHr);

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
    school12: "",
    marks12: "",
    marksheet12: null,
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
  const [activeHighlightedRejectedField, setActiveHighlightedRejectedField] = useState(null);
  const [updatedFields, setUpdatedFields] = useState(() => new Set());

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
    [updatedFields, formData, originalData]
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
        const fields = response.data.allowedFields || [];
        const message = response.data.message || "";

        setCanEditProfile(canEdit);
        setAllowedFields(Array.isArray(fields) ? fields : []);
        setEditMessage(message);

        if (response.data.profileApprovalStatus) {
          setApprovalStatus(response.data.profileApprovalStatus);
          setRejectionRemark(response.data.rejectionRemark || "");
          setRejectedFields(Array.isArray(response.data.rejectedFields) ? response.data.rejectedFields : []);
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

        const normalizedEmp = {
          ...emp,
          ...currentBank,
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

          picture: null
        }));

        if (emp.profileApprovalStatus) {
          setApprovalStatus(emp.profileApprovalStatus);
          setRejectionRemark(emp.rejectionRemark || "");
          setRejectedFields(Array.isArray(emp.rejectedFields) ? emp.rejectedFields : []);
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

        if (!element && (field === "degreeCertificate" || field === "courses")) {
          element =
            document.getElementById("field-wrapper-degreeCertificate") ||
            document.getElementById("field-wrapper-courses") ||
            document.querySelector(".employeedetails-courses-section");
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
            } catch (e) {}
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
        } else if (fieldId === "degreeCertificate" || fieldId === "courses") {
          target =
            document.getElementById("field-wrapper-degreeCertificate") ||
            document.getElementById("field-wrapper-courses") ||
            document.querySelector(".employeedetails-courses-section");
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
          } catch (e) {}
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

  const handleFileChange = (key, file) => {
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
      showErrorModal("Invalid File", "Only JPG, PNG, WEBP, PDF allowed");
      return;
    }

    if (file.size > maxSize) {
      showErrorModal("File Too Large", "Max size is 2MB");
      return;
    }

    /* ✅ CROP MODAL FOR PICTURE */
    if (key === "picture") {
      if (file.type === "application/pdf") {
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

  const handleAddCourse = () => {
    if (
      newCourse.collegeName.trim() === "" ||
      newCourse.courseName.trim() === ""
    ) {
      showErrorModal("Validation Error", "Please fill college and course");
      return;
    }

    const cgpaError = validateCgpa(newCourse.cgpa);
    const yearError = validateYearRange(newCourse.passedOutYear);

    if (cgpaError || yearError) {
      setCourseErrors({
        cgpa: cgpaError,
        passedOutYear: yearError,
      });

      showErrorModal("Validation Error", "Fix course fields before adding");
      return;
    }

    markFieldAsUpdated("courses");
    markFieldAsUpdated("degreeCertificate");

    const courseToAdd = { ...newCourse, id: Date.now(), certificate: null };

    setFormData((prev) => ({
      ...prev,
      courses: [...prev.courses, courseToAdd],
    }));

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
    setFormData((prev) => {
      const updatedCourses = [...prev.courses];
      updatedCourses[index] = { ...updatedCourses[index], [field]: value };
      return { ...prev, courses: updatedCourses };
    });
  };

  const validateCgpa = (value) => {
    if (!value) return "";

    const num = parseFloat(value);

    if (isNaN(num)) return "Only numbers allowed";

    if (num >= 0 && num <= 10) return "";

    if (num > 10 && num <= 100) return "";

    return "Enter valid CGPA (0-10) or Percentage (0-100)";
  };

  const validateYearRange = (value) => {
    if (!value) return "";

    const regex = /^(19|20)\d{2}-(19|20)\d{2}$/;

    if (!regex.test(value)) {
      return "Format must be YYYY-YYYY (e.g. 2021-2024)";
    }

    const [start, end] = value.split("-").map(Number);

    if (end <= start) {
      return "End year must be greater than start year";
    }

    return "";
  };

  const handleCourseFileChange = (index, file) => {
    if (file) {
      markFieldAsUpdated("degreeCertificate");
      markFieldAsUpdated("courses");
    }

    setFormData((prev) => {
      const updatedCourses = [...prev.courses];
      updatedCourses[index] = { ...updatedCourses[index], certificate: file };
      return { ...prev, courses: updatedCourses };
    });

    if (file) {
      const previewUrl = URL.createObjectURL(file);
      const courseId = formData.courses[index]?.id;
      if (courseId) {
        setFilePreviews((prev) => ({
          ...prev,
          [`course_${courseId}_certificate`]: previewUrl,
        }));
      }
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
    if ((field === "degreeCertificate" || field === "courses") && (rejectedFields.includes("degreeCertificate") || rejectedFields.includes("courses"))) return true;
    if (rejectedFields.includes("kyc") && ["aadhaarNo", "panNo", "aadhaarFile", "panFile"].includes(field)) return true;
    if (rejectedFields.includes("bank") && ["bankName", "accountHolder", "accountNumber", "ifscCode", "branch", "passbookFile"].includes(field)) return true;
    if (rejectedFields.includes("education") && ["school10", "marks10", "marksheet10", "certificate10", "school12", "marks12", "marksheet12", "certificate12", "educationPath", "courses", "degreeCertificate"].includes(field)) return true;
    if (rejectedFields.includes("personal") && ["dob", "gender", "phone", "emergencyContact", "bloodGroup", "address"].includes(field)) return true;
    if (rejectedFields.includes("family") && ["fatherName", "motherName", "fatherOccupation", "motherOccupation", "siblings"].includes(field)) return true;
    if (rejectedFields.includes("working") && ["previousExperiences", "department", "designation", "experience"].includes(field)) return true;
    return false;
  };

  const canEditField = (field) => {
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
    personal: [
      "dob", "gender", "phone", "emergencyContact",
      "bloodGroup", "address", "fatherName",
      "motherName", "fatherOccupation", "motherOccupation",
    ],
    siblings: ["siblings"],
    working: [
      "department", "designation", "status",
      "experience", "salary", "previousExperiences",
    ],
    education: [
      "school10", "marks10", "marksheet10",
      "school12", "marks12", "marksheet12",
    ],
    courses: ["courses"],
    kyc: ["aadhaarNo", "panNo", "aadhaarFile", "panFile"],
    pf: ["pfNo", "uanNo"],
    bank: ["bankName", "accountHolder", "accountNumber", "ifscCode", "branch", "toDate", "passbookFile"],
    documents: ["picture"],
  };

  const getVisibleSections = () => {
    if (!permissionsLoaded) return [];

    if (isPrivileged) return Object.keys(sectionFieldMap);

    if (approvalStatus === "rejected") {
      return Object.keys(sectionFieldMap);
    }

    if (formData.isProfileCompleted === false) {
      return Object.keys(sectionFieldMap);
    }

    if (canEditProfile && allowedFields.length > 0 && !allowedFields.includes("ALL")) {
      return Object.keys(sectionFieldMap).filter((section) =>
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
      requiredFields.splice(14, 0, 
        { key: "school12", label: "12th School" },
        { key: "marks12", label: "12th Marks" },
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

    return requiredFields
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

    if (!isAdmin && !canEditProfile) {
      showErrorModal("Permission Denied", editMessage || "Permission denied");
      return;
    }

    for (const course of formData.courses) {
      const cgpaError = validateCgpa(course.cgpa);
      const yearError = validateYearRange(course.passedOutYear);

      if (cgpaError || yearError) {
        showErrorModal(
          "Validation Error",
          `Invalid data in course: ${course.courseName || "Unnamed"}`
        );
        return;
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
        "school10", "marks10", "school12", "marks12",
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

      form.append("educationPath", educationPath);

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
                <div className="employee-rejection-form-banner mb-4 p-3 rounded" style={{ border: "1px solid #E1E1E1" , background: "#ffe9eb" }}>
                  <div className="d-flex align-items-start gap-3">
                    <div className="flex-grow-1">
                      <h5 className="text-danger fw-bold mb-1" style={{ fontSize: "16px" }}>
                        Admin Profile Review Remark
                      </h5>
                      <p className="text-dark" style={{ fontSize: "14px" }}>
                        <strong>Reason for Rejection:</strong> "{rejectionRemark}"
                      </p>
                      <div className="mb-2">
                        <strong className="text-secondary small">Required Correction:</strong>{" "}
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {displayRejectedFields.map((f, i) => (
                            <div key={i} className="rejected-field-pill d-inline-flex align-items-center gap-2 px-3 py-1 rounded border">
                              <span className="rejected-pill-label fw-semibold text-danger">
                                {getFieldFriendlyName(f)}
                              </span>
                              <button
                                type="button"
                                className="btn-reject-view"
                                style={{ fontSize: "12px", height: "26px", fontWeight: "500", borderRadius: "14px" }}
                                onClick={() => scrollToTargetRejectedField(f)}
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

            {/* ===== BASIC DETAILS ===== */}
            {visibleSections.includes("basic") && (
              <>
                <h6 className="employeedetails-section-title">Basic Details</h6>
                <div className="employeedetails-row">
                  <LockedField label="Employee ID" value={formData.empIdString} editable={false} visible={isAdmin || formData.isProfileCompleted === false} />

                  <LockedField
                    label="Name"
                    value={formData.name}
                    editable={isAdmin}
                    visible={canEditField("name")}
                    onChange={(v) => handleChange("name", v)}
                  />

                  <LockedField
                    label="Email"
                    value={formData.email}
                    editable={isAdmin}
                    visible={canEditField("email")}
                    onChange={(v) => handleChange("email", v)}
                  />

                  {isAdmin ? (
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
                    <LockedField id="field-wrapper-status" label="Status" value={formData.status} editable={false} visible={canEditField("status")} />
                  )}

                  {isAdmin && (formData.status === "relieved" || formData.dateRelieved) && (
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

            {/* ===== PERSONAL DETAILS ===== */}
            {visibleSections.includes("personal") && (
              <>
                <h6 className="employeedetails-section-title">Personal Details</h6>
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
                  <LockedField id="field-wrapper-phone" label="Phone" value={formData.phone} editable={isAdmin} visible={canEditField("phone")} />

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
            {visibleSections.includes("siblings") && (
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
            {visibleSections.includes("working") && (
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
                      editable={isAdmin}
                      visible={canEditField("department")}
                      onChange={(v) => handleChange("department", v)}
                    />

                    <LockedField
                      label="Designation"
                      value={formData.designation}
                      editable={isAdmin}
                      visible={canEditField("designation")}
                      onChange={(v) => handleChange("designation", v)}
                    />

                  {isAdmin ? (
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
                    <LockedField label="Status" value={formData.status} editable={false} visible={canEditField("status")} />
                  )}

                    {canEditField("experience") && (
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
                    )}

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

                <div className="employeedetails-education-group">
                  <div className="employeedetails-education-group-label">10th Standard</div>
                  <div className="employeedetails-row employeedetails-education-row">
                    <div id="field-wrapper-school10" className="employeedetails-col-md-6 employeedetails-mb-4">
                      <div className="employeedetails-detail-label">10th School</div>
                      <input
                        className={`employeedetails-detail-input ${!canEditField("school10") ? "employeedetails-input-locked" : ""}`}
                        type="text"
                        value={formData.school10 || ""}
                        onChange={(e) => handleChange("school10", e.target.value)}
                        disabled={!canEditField()} visible={canEditField()}
                        readOnly={!canEditField("school10")}
                      />
                    </div>

                    <div id="field-wrapper-marks10" className="employeedetails-col-md-6 employeedetails-mb-4">
                      <div className="employeedetails-detail-label">10th Marks</div>
                      <div className="employeedetails-field-wrapper">
                        <input
                          className={`employeedetails-detail-input ${!canEditField("marks10") ? "employeedetails-input-locked" : ""} ${marksErrors.marks10 ? "employeedetails-input-error" : ""}`}
                          type="text"
                          inputMode="decimal"
                          value={formData.marks10 || ""}
                          onChange={(e) => handleMarksChange("marks10", e.target.value)}
                          onKeyDown={handleMarksKeyDown}
                          disabled={!canEditField()} visible={canEditField()}
                          readOnly={!canEditField("marks10")}
                          placeholder="100 – 500"
                        />
                        {marksErrors.marks10 && (
                          <div className="employeedetails-field-error">{marksErrors.marks10}</div>
                        )}
                      </div>
                    </div>

                    <div id="field-wrapper-marksheet10" className="employeedetails-col-md-6 employeedetails-mb-4">
                      <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>10th Marksheet</span>
                      </div>
                      <div className="employeedetails-file-upload-container">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleFileChange("marksheet10", e.target.files[0])}
                          className="employeedetails-detail-input"
                          disabled={!canEditField("marksheet10")} visible={canEditField("marksheet10")}
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

                {educationPath === "12th" && (
                  <>
                    <div className="employeedetails-education-group">
                      <div className="employeedetails-education-group-label">12th Standard</div>
                      <div className="employeedetails-row employeedetails-education-row">
                        <div id="field-wrapper-school12" className="employeedetails-col-md-6 employeedetails-mb-4">
                          <div className="employeedetails-detail-label">12th School</div>
                          <input
                            className={`employeedetails-detail-input ${!canEditField("school12") ? "employeedetails-input-locked" : ""}`}
                            type="text"
                            value={formData.school12 || ""}
                            onChange={(e) => handleChange("school12", e.target.value)}
                            disabled={!canEditField()} visible={canEditField()}
                            readOnly={!canEditField("school12")}
                          />
                        </div>

                        <div id="field-wrapper-marks12" className="employeedetails-col-md-6 employeedetails-mb-4">
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
                              disabled={!canEditField()} visible={canEditField()}
                              readOnly={!canEditField("marks12")}
                              placeholder={`100 – ${marks12Total}`}
                            />
                            {marksErrors.marks12 && (
                              <div className="employeedetails-field-error">{marksErrors.marks12}</div>
                            )}
                          </div>
                        </div>

                        <div id="field-wrapper-marksheet12" className="employeedetails-col-md-6 employeedetails-mb-4">
                          <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>12th Marksheet</span>
                          </div>
                          <div className="employeedetails-file-upload-container">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileChange("marksheet12", e.target.files[0])}
                              className="employeedetails-detail-input"
                              disabled={!canEditField("marksheet12")} visible={canEditField("marksheet12")}
                            />

                            {filePreviews.marksheet12 && (
                              <div className="employeedetails-file-name">
                                Existing File: {getFileName(filePreviews.marksheet12)}
                              </div>
                            )}

                            {renderFilePreview("marksheet12", "12th Marksheet")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {educationPath === "Diploma" && (
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
                    {canEditField("courses") && (
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
                                setCourseErrors((prev) => ({
                                  ...prev,
                                  passedOutYear: validateYearRange(val),
                                }));
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
                            onChange={(e) =>
                              setNewCourse((prev) => ({
                                ...prev,
                                certificate: e.target.files[0],
                              }))
                            }
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
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                label="College Name"
                                value={course.collegeName}
                                onChange={(v) => handleCourseChange(index, "collegeName", v)}
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                label="Course Name"
                                value={course.courseName}
                                onChange={(v) => handleCourseChange(index, "courseName", v)}
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                label="CGPA / Percentage"
                                placeholder="Enter CGPA (0–10) or % (0–100)"
                                value={course.cgpa}
                                onChange={(v) => {
                                  let cleaned = v.replace(/[^0-9.]/g, "");

                                  const parts = cleaned.split(".");
                                  if (parts.length > 2) {
                                    cleaned = parts[0] + "." + parts.slice(1).join("");
                                  }

                                  handleCourseChange(index, "cgpa", cleaned);

                                  const error = validateCgpa(cleaned);
                                  if (error) {
                                    showErrorModal("Invalid CGPA", error);
                                  }
                                }}
                                disabled={!canEditField()}
                              />
                            </div>
                            <div className="employeedetails-col-md-6 employeedetails-mb-3">
                              <DetailInput
                                label="Year (e.g. 2021-2024)"
                                placeholder="2021-2024"
                                value={course.passedOutYear}
                                onChange={(v) => {
                                  let cleaned = v.replace(/[^0-9]/g, "");

                                  if (cleaned.length > 4) {
                                    cleaned = cleaned.slice(0, 4) + "-" + cleaned.slice(4, 8);
                                  }

                                  handleCourseChange(index, "passedOutYear", cleaned);

                                  const error = validateYearRange(cleaned);
                                  if (error) {
                                    showErrorModal("Invalid Year", error);
                                  }
                                }}
                                disabled={!canEditField()} visible={canEditField()}
                              />
                            </div>
                            <div id={index === 0 ? "field-wrapper-degreeCertificate" : `field-wrapper-course-certificate-${index}`} className="employeedetails-col-md-6 employeedetails-mb-3">
                              <div className="employeedetails-file-upload-container">
                                <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>Degree Certificate</span>
                                </div>
                                <input
                                  type="file"
                                  className="employeedetails-detail-input employeedetails-file-input-aligned"
                                  onChange={(e) =>
                                    handleCourseFileChange(index, e.target.files[0])
                                  }
                                  accept="image/*,.pdf"
                                  disabled={!canEditField("courses")} visible={canEditField("courses")}
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
              </>
            )}

            {/* ===== KYC DETAILS ===== */}
            {visibleSections.includes("kyc") && (
              <>
                <h6 className="employeedetails-section-title">KYC Details</h6>
                <div className="employeedetails-row">
                  <div id="field-wrapper-aadhaarNo" className="employeedetails-col-md-6 employeedetails-mb-4">
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
                          disabled={!canEditField()} visible={canEditField()}
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
                  <div id="field-wrapper-panNo" className="employeedetails-col-md-6 employeedetails-mb-4">
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
                          disabled={!canEditField()} visible={canEditField()}
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

                  <div id="field-wrapper-aadhaarFile" className="employeedetails-col-md-6 employeedetails-mb-4">
                    <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Aadhaar Upload</span>
                      <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>* Note: Only use the masked aadhar files only</span>
                    </div>
                    <div className="employeedetails-file-upload-container">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("aadhaarFile", e.target.files[0])}
                        className="employeedetails-detail-input"
                        disabled={!canEditField("aadhaarFile")} visible={canEditField("aadhaarFile")}
                      />

                      {filePreviews.aadhaarFile && (
                        <div className="employeedetails-file-name">
                          Existing File: {getFileName(filePreviews.aadhaarFile)}
                        </div>
                      )}

                      {renderFilePreview("aadhaarFile", "Aadhaar Upload")}
                    </div>
                  </div>

                  <div id="field-wrapper-panFile" className="employeedetails-col-md-6 employeedetails-mb-4">
                    <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>PAN Card</span>
                    </div>
                    <div className="employeedetails-file-upload-container">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("panFile", e.target.files[0])}
                        className="employeedetails-detail-input"
                        disabled={!canEditField("panFile")} visible={canEditField("panFile")}
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
            {visibleSections.includes("bank") && (
              <>
                <h6 className="employeedetails-section-title">Bank Details</h6>
                <div className="employeedetails-row">
                  <DetailInput
                    id="field-wrapper-bankName"
                    label="Bank Name"
                    value={formData.bankName}
                    onChange={(v) => handleChange("bankName", v)}
                    disabled={!canEditField()} visible={canEditField()}
                  />
                  <DetailInput
                    id="field-wrapper-accountHolder"
                    label="Account Holder Name"
                    value={formData.accountHolder}
                    onChange={(v) => handleChange("accountHolder", v)}
                    disabled={!canEditField()} visible={canEditField()}
                  />

                  <div id="field-wrapper-accountNumber" className="employeedetails-col-md-6 employeedetails-mb-4">
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
                        disabled={!canEditField()} visible={canEditField()}
                        readOnly={!canEditField("accountNumber")}
                      />
                      {bankErrors.accountNumber && (
                        <div className="employeedetails-field-error">
                          {bankErrors.accountNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  <div id="field-wrapper-ifscCode" className="employeedetails-col-md-6 employeedetails-mb-4">
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
                        disabled={!canEditField()} visible={canEditField()}
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

                  <div id="field-wrapper-branch" className="employeedetails-col-md-6 employeedetails-mb-4">
                    <div className="employeedetails-detail-label">Branch Name</div>
                    <div className="employeedetails-field-wrapper">
                      <input
                        type="text"
                        placeholder="Enter Branch Name"
                        value={formData.branch || ""}
                        onChange={(e) => handleChange("branch", e.target.value)}
                        className={`employeedetails-detail-input ${!canEditField("branch") ? "employeedetails-input-locked" : ""}`}
                        disabled={!canEditField()} visible={canEditField()}
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

                  <div id="field-wrapper-passbookFile" className="employeedetails-col-md-6 employeedetails-mb-4">
                    <div className="employeedetails-detail-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Bank Passbook/Cancelled Cheque</span>
                    </div>
                    <div className="employeedetails-file-upload-container">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange("passbookFile", e.target.files[0])}
                        className="employeedetails-detail-input"
                        disabled={!canEditField("passbookFile")} visible={canEditField("passbookFile")}
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
                      onChange={(f) => handleFileChange("picture", f)}
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
              {!isAdmin && !canEditProfile && (
                <p style={{ color: "#f44336", marginBottom: "10px", fontSize: "14px" }}>
                  {editMessage || "You are not allowed to edit your profile. Please send a request."}
                </p>
              )}
              <button
                className="employeedetails-btn-save"
                onClick={handleSave}
                disabled={isSaving || (!isAdmin && !canEditProfile)}
              >
                {isSaving
                  ? "Saving..."
                  : approvalStatus === "rejected"
                  ? "Resubmit for Admin Review"
                  : "Save Changes"}
              </button>
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

export default EmployeeDetails;

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
        onChange={(e) => onChange(e.target.files[0])}
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