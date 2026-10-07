import React, { useEffect, useState, useMemo, useRef } from "react";
import LetterTemplateEditor from "./LetterTemplateEditor";
import Sidebar from "../../HeaderSidebar/Sidebar";
import { portalInstance } from "../../../Services/instance";
import { toast, ToastContainer } from "react-toastify";
import { Icon } from "@iconify/react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useUser } from "../../UserContext";
import "./TerminationLetter.css";
import "../../Common/CustomDropdown.css";
import CustomDropdown from "../../Common/CustomDropdown";
import Pagination from "../../Employee/Pagination/Pagination";
import "../../Employee/Pagination/Pagination.css";

const DEFAULT_TERMINATION_TEMPLATE = `<p>Dear {employeeName},</p>
<p>This letter serves as formal notification that your employment with ERTI TECH PRIVATE LIMITED is being terminated, effective from <strong>{effectiveDate}</strong>.</p>
<p>As per company policy and employment terms, your notice period will be <strong>{noticePeriod}</strong>. {reason}</p>
<p>Please note that your final settlement, including all pending dues and clearance formalities, will be processed as per company regulations. {settlementStatus}</p>
<p>We request you to hand over all company property, assets, and credentials in your possession to your department head on or before your last working day.</p>
<p>We thank you for your contributions during your tenure and wish you the best in your future professional pursuits.</p>`;

const TerminationLetter = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("generate"); // "generate" | "settings"

  // Data states
  const [generatedLetters, setGeneratedLetters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Search & Filter in Generate Tab
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const historyPageSize = 10;

  // Search & Filter in Employee Selection Modal
  const [empSearchTerm, setEmpSearchTerm] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("");
  const [showDeptFilterPopover, setShowDeptFilterPopover] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [showSelectEmployeeModal, setShowSelectEmployeeModal] = useState(false);
  const [showCreateSlipModal, setShowCreateSlipModal] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Preview & Editor state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingTemplateType, setEditingTemplateType] = useState(null);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [templateTexts, setTemplateTexts] = useState({
    termination: DEFAULT_TERMINATION_TEMPLATE,
  });

  const handleSaveTemplate = async ({ subject, html } = {}) => {
    try {
      const cleanHtml = html || templateTexts.termination || DEFAULT_TERMINATION_TEMPLATE;
      const payload = {
        letterType: "termination",
        subject: subject || "Letter of Termination",
        html: cleanHtml,
      };
      const res = await portalInstance.put("/appointment/letter/templates", payload);
      if (res.data?.success) {
        setTemplateTexts((prev) => ({
          ...prev,
          termination: cleanHtml,
          customHtml: cleanHtml,
          isCustomized: true,
        }));
        setEditingTemplateType(null);
        toast.success("Custom template saved successfully!");
      }
    } catch (err) {
      console.error("Failed to save template:", err);
      toast.error(err.response?.data?.message || "Failed to save template.");
    }
  };

  const handleEditorPreview = ({ html } = {}) => {
    setTemplateTexts((prev) => ({
      ...prev,
      termination: html || prev.termination,
    }));
    setPreviewHtml(null);
    setShowPreviewModal(true);
  };

  const handleResetTemplate = async () => {
    try {
      let tData = null;
      try {
        const res = await portalInstance.post("/appointment/letter/templates/reset", {
          letterType: "termination",
        });
        if (res.data?.success && res.data?.data) {
          tData = res.data.data;
        }
      } catch (postErr) {
        if (postErr?.response?.status === 404) {
          const defaultHtml = templateTexts?.defaultHtml || DEFAULT_TERMINATION_TEMPLATE;
          const putRes = await portalInstance.put("/appointment/letter/templates", {
            letterType: "termination",
            html: defaultHtml,
            isDefault: false,
            reset: true
          });
          if (putRes.data?.success) {
            tData = {
              ...putRes.data.data,
              letterType: "termination",
              defaultHtml: defaultHtml,
              html: defaultHtml,
              isCustomized: false,
              isDefault: true
            };
          }
        } else {
          throw postErr;
        }
      }

      if (tData) {
        const defaultHtml = tData.defaultHtml || tData.html || DEFAULT_TERMINATION_TEMPLATE;
        setTemplateTexts({
          termination: defaultHtml,
          isCustomized: false,
          customHtml: "",
          defaultHtml: defaultHtml,
        });
        setEditorResetKey((k) => k + 1);
        toast.success("Reset to original default template successfully!");
        return tData;
      }
    } catch (err) {
      console.error("Failed to reset template:", err);
      toast.error("Failed to reset template to default.");
    }
  };

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingLetterId, setDeletingLetterId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employeeName: "",
    designation: "",
    department: "",
    dateOfIssue: new Date().toISOString().slice(0, 10),
    effectiveDate: new Date().toISOString().slice(0, 10),
    noticePeriod: "30 Days",
    reason: "",
    settlementStatus: "Full and final settlement will be credited within 30 days.",
    signatoryName: "Jayaprakash. R",
    signatoryTitle: "Director",
  });

  const previewRef = useRef(null);
  const inlineEditRef = useRef(null);

  // ── Fetch Initial Data ──────────────────────────────────────────────────
  const fetchGeneratedLetters = async () => {
    try {
      setLoading(true);
      const res = await portalInstance.get("/appointment/letter/history?type=termination");
      if (res.data.success) {
        setGeneratedLetters(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching termination letters history:", err);
      toast.error("Failed to load termination letters history.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await portalInstance.get("/appointment/letter/templates");
      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        const termData = data.termination || (Array.isArray(data) ? data.find((t) => t.letterType === "termination") : null);
        if (termData) {
          setTemplateTexts({
            termination: termData.html || termData.body || DEFAULT_TERMINATION_TEMPLATE,
            isCustomized: !!termData.isCustomized,
            defaultHtml: termData.defaultHtml || DEFAULT_TERMINATION_TEMPLATE,
            customHtml: termData.customHtml || "",
          });
        }
      }
    } catch (err) {
      console.error("Error fetching letter templates:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const res = await portalInstance.get("/appointment/letter/employees");
      if (res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching employee list:", err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchGeneratedLetters();
    fetchTemplates();
    fetchEmployees();
  }, []);

  // Close department filter popover on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".filter-popover-container") && !e.target.closest(".custom-dropdown-container")) {
        setShowDeptFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered employees in selection modal
  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  const filteredSelectableEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const term = empSearchTerm.toLowerCase().trim();
      const nameMatch = (emp.employeeName || emp.name || "").toLowerCase().includes(term);
      const idMatch = (emp.empId || emp._id || "").toLowerCase().includes(term);
      const emailMatch = (emp.email || "").toLowerCase().includes(term);
      const matchesSearch = !term || nameMatch || idMatch || emailMatch;

      const matchesDept = !selectedDeptFilter || emp.department === selectedDeptFilter;
      return matchesSearch && matchesDept;
    });
  }, [employees, empSearchTerm, selectedDeptFilter]);

  // History search filtering
  const filteredHistoryLetters = useMemo(() => {
    if (!historySearchTerm.trim()) return generatedLetters;
    const term = historySearchTerm.toLowerCase().trim();
    return generatedLetters.filter((letter) => {
      const nameMatch = (letter.employeeName || "").toLowerCase().includes(term);
      const desigMatch = (letter.designation || "").toLowerCase().includes(term);
      const deptMatch = (letter.department || "").toLowerCase().includes(term);
      return nameMatch || desigMatch || deptMatch;
    });
  }, [generatedLetters, historySearchTerm]);

  const paginatedHistoryLetters = useMemo(() => {
    const start = (historyCurrentPage - 1) * historyPageSize;
    return filteredHistoryLetters.slice(start, start + historyPageSize);
  }, [filteredHistoryLetters, historyCurrentPage]);

  // ── Employee Selection Handlers ─────────────────────────────────────────
  const handleToggleEmployee = (emp) => {
    const id = emp._id || emp.empId;
    const exists = selectedEmployees.some((e) => (e._id || e.empId) === id);
    if (exists) {
      setSelectedEmployees(selectedEmployees.filter((e) => (e._id || e.empId) !== id));
    } else {
      setSelectedEmployees([...selectedEmployees, emp]);
    }
  };

  const handleToggleSelectAll = () => {
    const allSelected = filteredSelectableEmployees.every((emp) =>
      selectedEmployees.some((e) => (e._id || e.empId) === (emp._id || emp.empId))
    );
    if (allSelected) {
      const currentIds = new Set(filteredSelectableEmployees.map((e) => e._id || e.empId));
      setSelectedEmployees(selectedEmployees.filter((e) => !currentIds.has(e._id || e.empId)));
    } else {
      const combined = [...selectedEmployees];
      filteredSelectableEmployees.forEach((emp) => {
        const id = emp._id || emp.empId;
        if (!combined.some((e) => (e._id || e.empId) === id)) {
          combined.push(emp);
        }
      });
      setSelectedEmployees(combined);
    }
  };

  const handleProceedWithEmployees = () => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee.");
      return;
    }
    const first = selectedEmployees[0];
    setFormData((prev) => ({
      ...prev,
      employeeName: first.employeeName || first.name || "",
      designation: first.designation || "",
      department: first.department || "",
      dateOfIssue: new Date().toISOString().slice(0, 10),
      effectiveDate: new Date().toISOString().slice(0, 10),
    }));
    setShowSelectEmployeeModal(false);
    setShowCreateSlipModal(true);
  };

  // Form input handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Validation
  const validateForm = () => {
    if (!formData.employeeName.trim()) {
      toast.error("Please enter the employee full name.");
      return false;
    }
    if (!formData.designation.trim()) {
      toast.error("Please enter the designation.");
      return false;
    }
    if (!formData.dateOfIssue) {
      toast.error("Please select the date of issue.");
      return false;
    }
    if (!formData.effectiveDate) {
      toast.error("Please select the effective termination date.");
      return false;
    }
    if (!formData.noticePeriod.trim()) {
      toast.error("Please enter the notice period.");
      return false;
    }
    return true;
  };

  const handleConfirmFormDetails = () => {
    if (!validateForm()) return;
    setPreviewHtml(null);
    setShowCreateSlipModal(false);
    setShowPreviewModal(true);
  };

  // Template Preview & Editor Handlers
  const handleTemplatePreview = (type, isEditor = false) => {
    setActiveTemplateType(type);
    setIsEditingTemplate(isEditor);
    if (!isEditor) {
      setPreviewHtml(null);
      setShowPreviewModal(true);
    }
  };

  const handleClosePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewHtml(null);
  };

  // Delete Confirmation Handler
  const handleDeleteClick = (id) => {
    setDeletingLetterId(id);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingLetterId) return;
    try {
      setIsDeleting(true);
      const res = await portalInstance.delete(`/appointment/letter/delete/${deletingLetterId}`);
      if (res.data.success) {
        toast.success("Letter record deleted successfully.");
        setGeneratedLetters((prev) => prev.filter((item) => item._id !== deletingLetterId));
      } else {
        toast.error(res.data.message || "Failed to delete letter record.");
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Server error while deleting letter record.");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeletingLetterId(null);
    }
  };

  // ── PDF Generation & Save ───────────────────────────────────────────────
  const handleGenerateAndSavePdf = async () => {
    const el = previewRef.current || inlineEditRef.current;
    if (!el) {
      toast.error("Preview document element not ready.");
      return;
    }

    try {
      setIsDownloading(true);

      const pageEl = el.querySelector(".term-letter-page") || el;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output("blob");

      // Save to Backend S3
      const postData = new FormData();
      postData.append("file", pdfBlob, `${formData.employeeName.replace(/\s+/g, "_")}_Termination_Letter.pdf`);
      postData.append("letterType", "termination");
      postData.append("employeeName", formData.employeeName);
      postData.append("dateOfIssue", formData.dateOfIssue);
      postData.append("designation", formData.designation);
      postData.append("department", formData.department);
      postData.append("signatoryName", formData.signatoryName);
      postData.append("signatoryTitle", formData.signatoryTitle);

      const extraData = {
        effectiveDate: formData.effectiveDate,
        noticePeriod: formData.noticePeriod,
        reason: formData.reason,
        settlementStatus: formData.settlementStatus,
      };
      postData.append("data", JSON.stringify(extraData));

      const res = await portalInstance.post("/appointment/letter/save", postData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("Termination Letter generated and saved successfully!");
        pdf.save(`${formData.employeeName.replace(/\s+/g, "_")}_Termination_Letter.pdf`);
        fetchGeneratedLetters();
        handleClosePreviewModal();
      } else {
        toast.error(res.data.message || "Failed to save termination letter.");
      }
    } catch (err) {
      console.error("PDF generation/save error:", err);
      toast.error("Error generating Termination Letter PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Document Compilation Helper
  const compileTemplateToHtml = (templateStr, data, isTemplatePreview = false) => {
    if (!templateStr) return "";
    let compiled = templateStr;

    if (isTemplatePreview) {
      compiled = compiled
        .replace(/\{employeeName\}/g, "{employeeName}")
        .replace(/\{effectiveDate\}/g, "{effectiveDate}")
        .replace(/\{noticePeriod\}/g, "{noticePeriod}")
        .replace(/\{reason\}/g, "{reason}")
        .replace(/\{settlementStatus\}/g, "{settlementStatus}");
    } else {
      compiled = compiled
        .replace(/\{employeeName\}/g, data.employeeName || "Employee Name")
        .replace(/\{effectiveDate\}/g, data.effectiveDate || "Effective Date")
        .replace(/\{noticePeriod\}/g, data.noticePeriod || "Notice Period")
        .replace(/\{reason\}/g, data.reason ? `Reason: ${data.reason}` : "")
        .replace(/\{settlementStatus\}/g, data.settlementStatus || "");
    }
    return compiled;
  };

  const renderDocument = (onReady = null, isTemplatePreview = false) => {
    return (
      <TerminationLetterDoc
        formData={formData}
        templateTexts={templateTexts}
        onReady={onReady}
        isTemplatePreview={isTemplatePreview}
      />
    );
  };

  return (
    <div className="term-letter-layout">
      <Sidebar />
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="term-letter-container">
        {/* Header */}
        {/* <div className="term-letter-header">
          <p>Generate and manage formal employment termination letters.</p>
        </div> */}

        <div className="term-page-content-card">
          {/* Tabs Navigation */}
          <div className="term-tab-bar-container">
            <div className="term-tab-radio-group">
              <button
                id="tab-generate"
                className={`term-tab-radio-btn${activeTab === "generate" ? " active" : ""}`}
                onClick={() => setActiveTab("generate")}
              >
                <span className={`term-tab-radio-circle${activeTab === "generate" ? " active" : ""}`} />
                Generate Letter
              </button>
              <button
                id="tab-settings"
                className={`term-tab-radio-btn${activeTab === "settings" ? " active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <span className={`term-tab-radio-circle${activeTab === "settings" ? " active" : ""}`} />
                Templates &amp; Settings
              </button>
            </div>

            {activeTab === "generate" && (
              <button
                id="btn-open-create-slip-modal"
                className="term-add-btn"
                style={{ borderStyle: "solid", background: "#5977f8", color: "#ffffff", borderRadius: "8px" }}
                onClick={() => {
                  setSelectedEmployees([]);
                  setShowSelectEmployeeModal(true);
                }}
              >
                <Icon icon="lucide:plus" width="16" /> Create Letter Slip
              </button>
            )}
          </div>

          {/* TAB 1: GENERATE LETTER */}
          {activeTab === "generate" && (
            <div>

              {/* History Table */}
              <div className="term-table-wrapper">
                <table className="term-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>S.No</th>
                      <th>Employee Name</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th>Date of Issue</th>
                      <th style={{ textAlign: "center" }}>Letter File</th>
                      <th style={{ textAlign: "center", width: "80px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                          Loading termination letters history...
                        </td>
                      </tr>
                    ) : paginatedHistoryLetters.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                          No generated termination letters found.
                        </td>
                      </tr>
                    ) : (
                      paginatedHistoryLetters.map((letter, idx) => (
                        <tr key={letter._id || idx}>
                          <td>{String((historyCurrentPage - 1) * historyPageSize + idx + 1).padStart(2, "0")}</td>
                          <td style={{ fontWeight: "500", color: "#1e293b" }}>{letter.employeeName}</td>
                          <td>{letter.designation}</td>
                          <td>{letter.department || "—"}</td>
                          <td>{new Date(letter.dateOfIssue).toLocaleDateString("en-IN")}</td>
                          <td style={{ textAlign: "center" }}>
                            {letter.fileUrl ? (
                              <a
                                href={letter.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  color: "#3b82f6",
                                  fontWeight: "500",
                                  textDecoration: "underline",
                                  fontSize: "13px",
                                }}
                              >
                                View PDF
                              </a>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>N/A</span>
                            )}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="term-delete-btn"
                              title="Delete Record"
                              onClick={() => handleDeleteClick(letter._id)}
                            >
                              <Icon icon="lucide:trash-2" width="16" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* History Pagination */}
              <Pagination
                totalItems={Math.max(1, filteredHistoryLetters.length)}
                pageSize={historyPageSize}
                currentPage={historyCurrentPage}
                onPageChange={(page) => setHistoryCurrentPage(page)}
              />
            </div>
          )}

          {/* TAB 2: TEMPLATES & SETTINGS */}
          {activeTab === "settings" && (
            <div className="term-template-settings-area">
              {editingTemplateType ? (
                <LetterTemplateEditor
                  key={`termination-${editorResetKey}`}
                  letterType="termination"
                  initialHtml={templateTexts.termination || DEFAULT_TERMINATION_TEMPLATE}
                  subjectValue="Letter of Termination"
                  isCustomized={!!templateTexts.isCustomized}
                  onSave={handleSaveTemplate}
                  onPreview={handleEditorPreview}
                  onReset={handleResetTemplate}
                  onBack={() => setEditingTemplateType(null)}
                />
              ) : (
                <>
                  <p className="term-template-settings-desc">
                    Preview and manage the Termination Letter template. Click{" "}
                    <strong>Preview Template</strong> to see a sample, or{" "}
                    <strong>Customize</strong> to edit.
                  </p>

                  <div className="term-template-cards">
                    <div
                      className="term-template-card"
                      style={{ "--term-card-accent": "#5977f8" }}
                    >
                      <div className="term-template-card-header">
                        <div className="term-template-icon">
                          <Icon icon="lucide:user-x" width="28" />
                        </div>
                        <div>
                          <h3>Termination Letter</h3>
                          <p>Standard termination letter format with dynamic placeholders for notice period and settlement terms.</p>
                        </div>
                      </div>

                      <div className="term-template-card-footer">
                        <button
                          id="btn-preview-term-template"
                          className="term-template-preview-btn"
                          onClick={() => {
                            setPreviewHtml(null);
                            setShowPreviewModal(true);
                          }}
                        >
                          <Icon icon="lucide:eye" width="14" /> Preview
                        </button>
                        <button
                          id="btn-customize-term-template"
                          className="term-template-customize-btn"
                          onClick={() => {
                            setEditingTemplateType("termination");
                            setEditorResetKey((k) => k + 1);
                          }}
                        >
                          <Icon icon="lucide:layout-template" width="14" /> Customize
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* MODAL 1: Select Employee Modal */}
        {showSelectEmployeeModal && (
          <div className="term-modal-overlay">
            <div className="term-modal-content" style={{ maxWidth: "780px" }}>
              <div className="term-modal-header">
                <h3 className="term-modal-title">Select Employee</h3>
                <button
                  className="term-modal-close"
                  onClick={() => {
                    setShowSelectEmployeeModal(false);
                    setShowDeptFilterPopover(false);
                  }}
                >
                  &times;
                </button>
              </div>

              <div className="term-modal-body" style={{ background: "transparent", border: "none", padding: 0 }}>
                {/* Search & Filter Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "16px",
                    position: "relative",
                  }}
                >
                  <div style={{ position: "relative", flex: 1, maxWidth: "340px" }}>
                    <Icon
                      icon="lucide:search"
                      style={{ position: "absolute", left: "12px", top: "11px", color: "#94a3b8" }}
                      width="16"
                    />
                    <input
                      type="text"
                      placeholder="Search by name, ID, or email..."
                      value={empSearchTerm}
                      onChange={(e) => setEmpSearchTerm(e.target.value)}
                      style={{
                        width: "100%",
                        height: "38px",
                        paddingLeft: "36px",
                        paddingRight: "12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>

                  <div className="filter-popover-container" style={{ position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => setShowDeptFilterPopover((prev) => !prev)}
                      title="Filter by Department"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img src="/Filter.svg" alt="Filter" style={{ width: "20px", height: "20px" }} />
                    </button>

                    {showDeptFilterPopover && (
                      <div
                        style={{
                          position: "absolute",
                          right: 0,
                          top: "44px",
                          width: "220px",
                          background: "#ffffff",
                          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                          borderRadius: "10px",
                          border: "1px solid #e2e8f0",
                          padding: "12px",
                          zIndex: 100,
                        }}
                      >
                        <div style={{ fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "8px" }}>
                          Filter by Department
                        </div>
                        <CustomDropdown
                          options={[
                            { value: "", label: "All Departments" },
                            ...uniqueDepartments.map((dept) => ({ value: dept, label: dept })),
                          ]}
                          value={selectedDeptFilter}
                          onChange={(val) => {
                            setSelectedDeptFilter(val);
                            setShowDeptFilterPopover(false);
                          }}
                          placeholder="All Departments"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Searchable Employee Table */}
                <div style={{ maxHeight: "360px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                  <table className="term-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 5 }}>
                      <tr>
                        <th style={{ width: "50px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={
                              filteredSelectableEmployees.length > 0 &&
                              filteredSelectableEmployees.every((emp) =>
                                selectedEmployees.some((e) => (e._id || e.empId) === (emp._id || emp.empId))
                              )
                            }
                            onChange={handleToggleSelectAll}
                            style={{ cursor: "pointer", width: "16px", height: "16px" }}
                            title="Select / Deselect All"
                          />
                        </th>
                        <th>Employee ID</th>
                        <th>Employee Name</th>
                        <th>Email</th>
                        <th>Department</th>
                        <th>Designation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingEmployees ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                            Loading employees...
                          </td>
                        </tr>
                      ) : filteredSelectableEmployees.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                            No employees found.
                          </td>
                        </tr>
                      ) : (
                        filteredSelectableEmployees.map((emp) => {
                          const isSelected = selectedEmployees.some(
                            (e) => (e._id || e.empId) === (emp._id || emp.empId)
                          );
                          return (
                            <tr
                              key={emp._id || emp.empId}
                              style={{
                                cursor: "pointer",
                                background: isSelected ? "#f0f7ff" : "transparent",
                              }}
                              onClick={() => handleToggleEmployee(emp)}
                            >
                              <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleEmployee(emp)}
                                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                />
                              </td>
                              <td style={{ fontWeight: "600", color: "#0f172a" }}>{emp.empId || emp._id}</td>
                              <td style={{ fontWeight: "500", color: "#1e293b" }}>{emp.employeeName || emp.name}</td>
                              <td>{emp.email || "—"}</td>
                              <td>{emp.department || "—"}</td>
                              <td>{emp.designation || "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="term-modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#64748b" }}>
                  Selected: <strong>{selectedEmployees.length}</strong> employee(s)
                </span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="common-modal-btn btn-small-cancel" onClick={() => setShowSelectEmployeeModal(false)}>
                    Cancel
                  </button>
                  <button className="common-modal-btn btn-update" onClick={handleProceedWithEmployees}>
                    Proceed with Selected
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Create Letter Slip Details Form */}
        {showCreateSlipModal && (
          <div className="term-modal-overlay">
            <div className="term-modal-content" style={{ maxWidth: "650px" }}>
              <div className="term-modal-header">
                <h3 className="term-modal-title">Termination Letter Details</h3>
                <button className="term-modal-close" onClick={() => setShowCreateSlipModal(false)}>
                  &times;
                </button>
              </div>

              <div className="term-modal-body">
                <div className="term-form-grid">
                  <div className="term-form-section-title">Employee Details</div>
                  <div className="term-form-row">
                    <div className="term-form-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        name="employeeName"
                        value={formData.employeeName}
                        onChange={handleInputChange}
                        placeholder="Employee Full Name"
                      />
                    </div>
                    <div className="term-form-group">
                      <label>Designation *</label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        placeholder="e.g. Software Engineer"
                      />
                    </div>
                  </div>

                  <div className="term-form-row">
                    <div className="term-form-group">
                      <label>Department</label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        placeholder="e.g. Engineering"
                      />
                    </div>
                    <div className="term-form-group">
                      <label>Date of Issue *</label>
                      <input
                        type="date"
                        name="dateOfIssue"
                        value={formData.dateOfIssue}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="term-form-section-title">Termination Details</div>
                  <div className="term-form-row">
                    <div className="term-form-group">
                      <label>Effective Termination Date *</label>
                      <input
                        type="date"
                        name="effectiveDate"
                        value={formData.effectiveDate}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="term-form-group">
                      <label>Notice Period *</label>
                      <input
                        type="text"
                        name="noticePeriod"
                        value={formData.noticePeriod}
                        onChange={handleInputChange}
                        placeholder="e.g. 30 Days / Immediate"
                      />
                    </div>
                  </div>

                  <div className="term-form-group">
                    <label>Reason for Termination (Optional)</label>
                    <textarea
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      placeholder="e.g. Restructuring / End of contract"
                    />
                  </div>

                  <div className="term-form-group">
                    <label>Settlement / Dues Status</label>
                    <input
                      type="text"
                      name="settlementStatus"
                      value={formData.settlementStatus}
                      onChange={handleInputChange}
                      placeholder="Full and final settlement terms..."
                    />
                  </div>

                  <div className="term-form-section-title">Signatory Details</div>
                  <div className="term-form-row">
                    <div className="term-form-group">
                      <label>Signatory Name</label>
                      <input
                        type="text"
                        name="signatoryName"
                        value={formData.signatoryName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="term-form-group">
                      <label>Signatory Title</label>
                      <input
                        type="text"
                        name="signatoryTitle"
                        value={formData.signatoryTitle}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="term-modal-footer">
                <button className="common-modal-btn btn-small-cancel" onClick={() => setShowCreateSlipModal(false)}>
                  Cancel
                </button>
                <button className="term-add-btn" onClick={handleConfirmFormDetails}>
                  <Icon icon="lucide:eye" width="16" /> Preview &amp; Generate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: Preview Modal */}
        {showPreviewModal && (
          <div className="term-modal-overlay">
            <div className="term-modal-content" style={{ maxWidth: "850px", height: "90vh" }}>
              <div className="term-modal-header">
                <h3 className="term-modal-title">Letter Preview</h3>
                <button className="term-modal-close" onClick={handleClosePreviewModal}>
                  &times;
                </button>
              </div>
              <div className="term-modal-body" style={{ background: "#cbd5e1", display: "flex", justifyContent: "center" }}>
                {previewHtml === null && (
                  <div style={{ position: "absolute", left: "-9999px", top: 0, visibility: "hidden", pointerEvents: "none" }}>
                    {renderDocument(setPreviewHtml, !showCreateSlipModal && !formData.employeeName)}
                  </div>
                )}
                {previewHtml !== null ? (
                  <div
                    ref={(el) => {
                      previewRef.current = el;
                      inlineEditRef.current = el;
                    }}
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div style={{ color: "#64748b", padding: "40px" }}>Preparing document preview...</div>
                )}
              </div>
              <div className="term-modal-footer">
                <button
                  type="button"
                  className="common-modal-btn btn-small-cancel"
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewHtml(null);
                    setShowCreateSlipModal(true);
                  }}
                  style={{
                    marginRight: "auto",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <Icon icon="lucide:arrow-left" width="14" />
                  Back
                </button>
                <button
                  className="common-modal-btn"
                  onClick={() => window.print()}
                  style={{ background: "#0f172a", color: "#ffffff", border: "1px solid #0f172a", borderRadius: "6px", padding: "8px 16px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Icon icon="lucide:printer" width="16" />
                  Print
                </button>
                <button className="common-modal-btn btn-small-cancel" onClick={handleClosePreviewModal}>
                  Close
                </button>
                <button
                  className="common-modal-btn btn-update"
                  onClick={handleGenerateAndSavePdf}
                  disabled={isDownloading}
                >
                  <Icon icon="lucide:download" width="16" />
                  {isDownloading ? "Generating PDF..." : "Download & Save PDF"}
                </button>
              </div>
            </div>
          </div>
        )}



        {/* MODAL 5: Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="term-modal-overlay">
            <div className="term-modal-content" style={{ maxWidth: "420px" }}>
              <div className="term-modal-header">
                <h3 className="term-modal-title">Confirm Deletion</h3>
                <button className="term-modal-close" onClick={() => setShowDeleteModal(false)}>
                  &times;
                </button>
              </div>
              <div className="term-modal-body" style={{ background: "#fff", border: "none", padding: "16px 0" }}>
                <p style={{ fontSize: "14px", color: "#475569", margin: 0 }}>
                  Are you sure you want to delete this termination letter record and its PDF? This action cannot be undone.
                </p>
              </div>
              <div className="term-modal-footer">
                <button className="common-modal-btn btn-small-cancel" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button
                  className="common-modal-btn btn-update"
                  style={{ background: "#ef4444", borderColor: "#ef4444" }}
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Termination Letter Document Component ─────────────────────────────────
const TerminationLetterDoc = ({ formData, templateTexts, onReady, isTemplatePreview = false }) => {
  const containerRef = useRef(null);

  const formattedDate = useMemo(() => {
    if (!formData.dateOfIssue) return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const d = new Date(formData.dateOfIssue);
    return isNaN(d.getTime())
      ? formData.dateOfIssue
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }, [formData.dateOfIssue]);

  const compiledBodyHtml = useMemo(() => {
    const rawTpl = templateTexts.termination || DEFAULT_TERMINATION_TEMPLATE;
    if (!rawTpl) return "";
    let compiled = rawTpl;

    if (isTemplatePreview) {
      compiled = compiled
        .replace(/\{employeeName\}/g, "{employeeName}")
        .replace(/\{effectiveDate\}/g, "{effectiveDate}")
        .replace(/\{noticePeriod\}/g, "{noticePeriod}")
        .replace(/\{reason\}/g, "{reason}")
        .replace(/\{settlementStatus\}/g, "{settlementStatus}");
    } else {
      compiled = compiled
        .replace(/\{employeeName\}/g, formData.employeeName || "Employee Name")
        .replace(/\{effectiveDate\}/g, formData.effectiveDate ? new Date(formData.effectiveDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "Effective Date")
        .replace(/\{noticePeriod\}/g, formData.noticePeriod || "Notice Period")
        .replace(/\{reason\}/g, formData.reason ? `Reason: ${formData.reason}` : "")
        .replace(/\{settlementStatus\}/g, formData.settlementStatus || "");
    }
    return compiled;
  }, [templateTexts, formData, isTemplatePreview]);

  useEffect(() => {
    if (onReady && containerRef.current) {
      onReady(containerRef.current.innerHTML);
    }
  }, [onReady, compiledBodyHtml]);

  return (
    <div ref={containerRef} className="term-letter-page-wrapper">
      <div className="term-letter-page">
        <img src="/Letterpad.svg" alt="Letterpad Background" className="term-letter-bg" />

        <div className="term-letter-body-content">
          <div className="term-letter-date">
            Date : {isTemplatePreview ? "{dateOfIssue}" : formattedDate}
          </div>

          <div
            style={{ marginTop: "24px", fontSize: "14px", lineHeight: "1.7" }}
            dangerouslySetInnerHTML={{ __html: compiledBodyHtml }}
          />

          <div className="term-sig-block" style={{ marginTop: "auto" }}>
            <div className="term-sig-left">
              <p className="term-sig-wishes">For ERTI TECH PRIVATE LIMITED</p>
              <img src="/sign 1.png" alt="Signature" className="term-sig-img" />
              <strong className="term-sig-name">{formData.signatoryName || "Jayaprakash. R"}</strong>
              <p className="term-sig-title">{formData.signatoryTitle || "Director"}</p>
            </div>
            <img src="/seal.png" alt="Company Seal" className="term-seal-img" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminationLetter;
