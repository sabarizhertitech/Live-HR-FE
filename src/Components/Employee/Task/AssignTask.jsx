import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import CustomDropdown from "../../Common/CustomDropdown";
import { portalInstance } from "../../../Services/instance";
import "../../Admin/Task/AssignTask.css";
import "../../../Globel/Layout.css";
import attachIcon from "../../../assets/ant-design_file-add-filled.png";
import closeIcon from "../../../assets/close.png";
import DateIcon from "../../../assets/uiw_date.svg";

const PRIORITY_OPTIONS = [
  { value: "High", label: "High" },
  { value: "Mid", label: "Mid" },
  { value: "Low", label: "Low" },
];

const TASK_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "inprocess", label: "In Process" },
  { value: "hold", label: "Hold" },
  { value: "completed", label: "Completed" },
];

const PHASE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "#f59e0b" },
  { value: "inprocess", label: "In Process", color: "#3b82f6" },
  { value: "hold", label: "Hold", color: "#ef4444" },
  { value: "completed", label: "Completed", color: "#22c55e" },
];

const getUserIdFromToken = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));
    return payload.id || payload._id;
  } catch {
    return null;
  }
};

function AssignTask({ onClose, onSuccess }) {
  const sessionRaw = sessionStorage.getItem("Erti-Portal");
  const sessionData = sessionRaw ? JSON.parse(sessionRaw) : {};
  const token = sessionData?.token;
  const loggedInUserId =
    sessionData?.user?._id || (token ? getUserIdFromToken(token) : null);
  const todayStr = new Date().toISOString().split("T")[0];

  // ── Form state ──────────────────────────────────────────────
  const [formData, setFormData] = useState({
    taskTitle: "",
    taskDetails: "",
    priority: "Mid",
    startDate: "",
    dueDate: "",
    endDate: "",
    status: "pending",
    phases: [],
    category: "",
    project: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Meta lists ───────────────────────────────────────────────
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fullCategories, setFullCategories] = useState([]);
  const [fullProjects, setFullProjects] = useState([]);

  // ── Dropdown open flags ──────────────────────────────────────
  const [showCategoryDrop, setShowCategoryDrop] = useState(false);
  const [showProjectDrop, setShowProjectDrop] = useState(false);

  // ── Add-new input toggle + values ────────────────────────────
  const [showAddCatInput, setShowAddCatInput] = useState(false);
  const [showAddProjInput, setShowAddProjInput] = useState(false);
  const [newCategoryVal, setNewCategoryVal] = useState("");
  const [newProjectVal, setNewProjectVal] = useState("");

  // ── Refs for click-outside close ─────────────────────────────
  const categoryRef = useRef(null);
  const projectRef = useRef(null);

  const [activeOtherField, setActiveOtherField] = useState(null);
  const startDateRef = useRef(null);
  const dueDateRef = useRef(null);
  const endDateRef = useRef(null);

  // ── Fetch task-meta on mount ─────────────────────────────────
  useEffect(() => {
    portalInstance
      .get("/creat/task-meta")
      .then((r) => {
        if (r.data?.success) {
          const rawCats = r.data.data.categories || [];
          const sortedCats = [
            ...rawCats.filter((c) => c && c.toLowerCase() !== "add"),
            ...rawCats.filter((c) => c && c.toLowerCase() === "add"),
          ];

          const rawProjs = r.data.data.projects || [];
          const sortedProjs = [
            ...rawProjs.filter((p) => p && p.toLowerCase() !== "add"),
            ...rawProjs.filter((p) => p && p.toLowerCase() === "add"),
          ];

          setCategories(sortedCats);
          setProjects(sortedProjs);
          setFullCategories(r.data.data.fullCategories || []);
          setFullProjects(r.data.data.fullProjects || []);
        }
      })
      .catch(() => { });
  }, []);

  // ── Click-outside to close dropdowns ────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategoryDrop(false);
        setShowAddCatInput(false);
      }
      if (projectRef.current && !projectRef.current.contains(e.target)) {
        setShowProjectDrop(false);
        setShowAddProjInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Handlers ────────────────────────────────────────────────
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handlePriorityChange = (value) =>
    setFormData((prev) => ({ ...prev, priority: value }));

  const handleStatusChange = (value) =>
    setFormData((prev) => {
      const isCompleted = (value || "").toLowerCase() === "completed";
      return {
        ...prev,
        status: value,
        endDate: isCompleted ? (prev.endDate || todayStr) : "",
      };
    });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (i) =>
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i));

  // Category toggle
  const handleCategoryToggle = (cat) => {
    if (cat === "Add") {
      setActiveOtherField("category");
    } else {
      setActiveOtherField(null);
    }
    setFormData((prev) => {
      const isSelected = prev.category === cat;
      const nextCategory = isSelected ? "" : cat;

      let nextProject = prev.project;
      if (nextCategory) {
        const projObj = fullProjects.find((p) => p.name === prev.project);
        const catName = projObj?.categoryId?.name;
        if (catName !== nextCategory) nextProject = "";
      } else {
        nextProject = "";
      }

      return { ...prev, category: nextCategory, project: nextProject };
    });
  };

  // Project toggle
  const handleProjectToggle = (projName) => {
    if (
      formData.category.includes("Add") ||
      activeOtherField === "category"
    ) {
      toast.warning("Please finalize your category selection first.");
      return;
    }
    if (projName === "Add") {
      setActiveOtherField("project");
    } else {
      setActiveOtherField(null);
    }
    setFormData((prev) => {
      const isSelected = prev.project === projName;
      const nextProject = isSelected ? "" : projName;

      let nextCategory = prev.category;
      if (nextProject && nextProject !== "Add") {
        const projObj = fullProjects.find((p) => p.name === nextProject);
        const catName = projObj?.categoryId?.name;
        if (catName && catName !== nextCategory) {
          nextCategory = catName;
        }
      }

      return { ...prev, project: nextProject, category: nextCategory };
    });
  };

  // Add new category
  const handleAddCategory = async (overrideName = null) => {
    const name = (
      typeof overrideName === "string" ? overrideName : newCategoryVal
    ).trim();
    if (!name) return;

    const exists = categories.some(
      (c) => c && c.toLowerCase() === name.toLowerCase()
    ) || fullCategories.some(
      (c) => c && c.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      toast.info(`"${name}" is already available.`);
      setActiveOtherField(null);
      setFormData((prev) => ({ ...prev, category: name, project: "" }));
      setNewCategoryVal("");
      return;
    }

    try {
      await portalInstance.post("/creat/task-meta/category", { name });

      const r = await portalInstance.get("/creat/task-meta");
      if (r.data?.success) {
        setCategories(r.data.data.categories || []);
        setProjects(r.data.data.projects || []);
        setFullCategories(r.data.data.fullCategories || []);
        setFullProjects(r.data.data.fullProjects || []);
      }

      setActiveOtherField(null);
      setFormData((prev) => ({ ...prev, category: name, project: "" }));
      setNewCategoryVal("");
      toast.success(`Category "${name}" added`);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.info(`"${name}" already exists. Selected automatically.`);
        const r = await portalInstance.get("/creat/task-meta");
        if (r.data?.success) {
          setCategories(r.data.data.categories || []);
          setProjects(r.data.data.projects || []);
          setFullCategories(r.data.data.fullCategories || []);
          setFullProjects(r.data.data.fullProjects || []);
        }
        setActiveOtherField(null);
        setFormData((prev) => ({ ...prev, category: name, project: "" }));
        setNewCategoryVal("");
      } else {
        toast.error(err.response?.data?.message || "Failed to add category");
      }
    }
  };

  // Add new project
  const handleAddProject = async (overrideName = null) => {
    const name = (
      typeof overrideName === "string" ? overrideName : newProjectVal
    ).trim();
    if (!name) return;

    const exists = projects.some(
      (p) => p && p.toLowerCase() === name.toLowerCase()
    ) || fullProjects.some(
      (p) => p && p.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      toast.info(`"${name}" is already available.`);
      setActiveOtherField(null);
      setFormData((prev) => ({ ...prev, project: name }));
      setNewProjectVal("");
      return;
    }

    const selectedCatName = formData.category;
    if (!selectedCatName) {
      toast.error("Please select a category first");
      return;
    }
    const catObj = fullCategories.find(
      (c) => c.name.toLowerCase() === selectedCatName.toLowerCase()
    );
    if (!catObj) {
      toast.error("Selected category not found");
      return;
    }

    try {
      await portalInstance.post("/creat/task-meta/project", {
        name,
        categoryId: catObj._id,
      });

      const r = await portalInstance.get("/creat/task-meta");
      if (r.data?.success) {
        setCategories(r.data.data.categories || []);
        setProjects(r.data.data.projects || []);
        setFullCategories(r.data.data.fullCategories || []);
        setFullProjects(r.data.data.fullProjects || []);
      }

      setActiveOtherField(null);
      setFormData((prev) => ({ ...prev, project: name }));
      setNewProjectVal("");
      toast.success(`Project "${name}" added & selected`);
    } catch (err) {
      if (err.response?.status === 409) {
        toast.info(`"${name}" already exists. Selected automatically.`);
        const r = await portalInstance.get("/creat/task-meta");
        if (r.data?.success) {
          setCategories(r.data.data.categories || []);
          setProjects(r.data.data.projects || []);
          setFullCategories(r.data.data.fullCategories || []);
          setFullProjects(r.data.data.fullProjects || []);
        }
        setActiveOtherField(null);
        setFormData((prev) => ({ ...prev, project: name }));
        setNewProjectVal("");
      } else {
        toast.error(err.response?.data?.message || "Failed to add project");
      }
    }
  };

  const handleCancel = () => {
    if (onClose) onClose();
  };

  // ── Phase handlers ───────────────────────────────────────────
  const addPhase = () => {
    if (!formData.category) {
      toast.info("Please select a Category first");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      phases: [
        ...prev.phases,
        { phaseTitle: "", phaseDescription: "", phaseStatus: "pending" },
      ],
    }));
  };

  const handlePhaseChange = (index, field, value) => {
    const updated = [...formData.phases];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, phases: updated }));
  };

  const removePhase = (index) => {
    setFormData((prev) => ({
      ...prev,
      phases: prev.phases.filter((_, i) => i !== index),
    }));
  };

  // ── Submit ───────────────────────────────────────────────────
  const createTask = async () => {
    if (!formData.category)
      return toast.error("Category is required");
    if (!formData.project)
      return toast.error("Project is required");
    if (!formData.taskTitle.trim())
      return toast.error("Task title is required");
    if (!formData.taskDetails.trim())
      return toast.error("Task details are required");
    if (!formData.startDate) return toast.error("Start date is required");
    const isCompletedStatus = (formData.status || "").toLowerCase() === "completed";
    if (isCompletedStatus && !formData.endDate) {
      return toast.error("End date is required");
    }
    if (formData.startDate < todayStr)
      return toast.error("Start date cannot be in the past");
    if (formData.dueDate && formData.dueDate < formData.startDate)
      return toast.error("Due date cannot be before start date");
    if (isCompletedStatus && formData.endDate && formData.endDate < formData.startDate)
      return toast.error("End date cannot be before start date");

    setLoading(true);
    try {
      const data = new FormData();
      data.append("taskTitle", formData.taskTitle.trim());
      data.append("taskDetails", formData.taskDetails.trim());
      data.append("priority", formData.priority);
      data.append("startDate", formData.startDate);
      data.append("dueDate", formData.dueDate);
      data.append("endDate", formData.endDate);
      // Main task status starts as chosen status during creation
      data.append("status", formData.status || "pending");

      // Filter and standardize phases
      const filteredPhases = formData.phases
        .filter((p) => p.phaseTitle?.trim())
        .map((p) => ({
          phaseTitle: p.phaseTitle.trim(),
          phaseDescription: (p.phaseDescription || "").trim(),
          phaseStatus: p.phaseStatus || "pending",
          updateDate: new Date().toISOString(),
        }));

      if (filteredPhases.length > 0) {
        data.append("phases", JSON.stringify(filteredPhases));
      }
      data.append(
        "assignedMembers",
        JSON.stringify([loggedInUserId])
      );
      data.append("assignedStatus", "Accepted");
      data.append("category", formData.category);
      data.append("project", formData.project);

      uploadedFiles.forEach((file) => data.append("files", file));

      // ✅ SINGLE API CALL ONLY — backend createTask already calls
      // syncPhaseToDailyWorkUpdate for every phase automatically.
      await portalInstance.post("/creat/task", data);

      toast.success("Task created successfully!");

      setFormData({
        taskTitle: "",
        taskDetails: "",
        priority: "Mid",
        status: "pending",
        startDate: "",
        dueDate: "",
        endDate: "",
        phases: [],
        category: "",
        project: "",
      });
      setUploadedFiles([]);
      if (onSuccess) onSuccess();
      setTimeout(() => onClose && onClose(), 1500);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Task creation failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="assign-task-page employee-assign-task-page">
      <style>{`
        .employee-assign-task-page {
          overflow-x: hidden !important;
        }
        .phases-section {
          margin: 18px 0 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 14px 14px;
          background: #fafbfc;
        }
        .employee-assign-task-page .atPhase__addBtn {
          height: 28px;
          padding: 0 12px;
           background: #5977f8;
          border-color: #5977f8;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .employee-assign-task-page .atPhase__addBtn:hover {
          background: #5977f8;
          border-color: #5977f8;
          color: #fff;
          box-shadow: 0 2px 8px rgba(89, 119, 248, 0.2);
        }
        .employee-assign-task-page .atPhase__addBtn:active {
          transform: scale(0.97);
        }
      `}</style>

      <div className="assign-task-container">

        {/* ── HEADER ── */}
        <div className="task-header">
          <h4 className="assign-task__members-title mb-2">Create New Task</h4>
          <button
            className="at-close-btn"
            onClick={onClose}
            type="button"
            title="Close"
          >
            <img src={closeIcon} alt="close" />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="task-body">


          {/* Right: Form */}
          <div className="task-form">

            {/* Category + Project Row */}
            <div className="form-row" style={{ marginBottom: "0px" }} >
              {/* Category */}
              <div className="form-group" ref={categoryRef}>
                <label className="mb-1">Category *</label>
                {activeOtherField === "category" ? (
                  <div className="atMeta__inlineAdd animate-fade-in">
                    <input
                      type="text"
                      className="hrms-unified-input-style atMeta__addInput"
                      placeholder="Type new category..."
                      value={newCategoryVal}
                      autoFocus
                      onChange={(e) => setNewCategoryVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCategory();
                      }}
                    />
                    <button
                      type="button"
                      className="atMeta__saveBtn"
                      onClick={() => handleAddCategory()}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <CustomDropdown
                    options={[...new Set(categories), "Add"].map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    value={formData.category}
                    onChange={(val) => handleCategoryToggle(val)}
                    placeholder="Select Category"
                    className="hrms-unified-dropdown-style atMeta__customDrop"
                  />
                )}
              </div>

              {/* Project */}
              <div className="form-group" ref={projectRef}>
                <label className="mb-1">Project *</label>
                {activeOtherField === "project" ? (
                  <div className="atMeta__inlineAdd animate-fade-in">
                    <input
                      type="text"
                      className="hrms-unified-input-style atMeta__addInput"
                      placeholder="Type new project..."
                      value={newProjectVal}
                      autoFocus
                      onChange={(e) => setNewProjectVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddProject();
                      }}
                    />
                    <button
                      type="button"
                      className="atMeta__saveBtn"
                      onClick={() => handleAddProject()}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <CustomDropdown
                    options={[
                      ...fullProjects
                        .filter((p) => {
                          if (!p.categoryId) return false;
                          const catName =
                            typeof p.categoryId === "object"
                              ? p.categoryId.name
                              : fullCategories.find(
                                (c) => String(c._id) === String(p.categoryId)
                              )?.name;
                          return catName && formData.category === catName;
                        })
                        .map((p) => ({ value: p.name, label: p.name })),
                      { value: "Add", label: "Add" },
                    ].filter(
                      (v, i, a) => a.findIndex((t) => t.value === v.value) === i
                    )}
                    value={formData.project}
                    onChange={(val) => handleProjectToggle(val)}
                    disabled={
                      !formData.category || formData.category === "Add"
                    }
                    placeholder={
                      !formData.category || formData.category === "Add"
                        ? "Select Category first"
                        : "Select Project"
                    }
                    className="hrms-unified-dropdown-style atMeta__customDrop"
                  />
                )}
              </div>
            </div>


            {/* Task Title */}
            <div className="form-group">
              <label>Task Title *</label>
              <input
                type="text"
                name="taskTitle"
                value={formData.taskTitle}
                onChange={handleChange}
                placeholder="Enter task title..."
                className="hrms-unified-input-style"
              />
            </div>

            {/* Task Details */}
            <div className="form-group" >
              <label>Task Details *</label>
              <textarea
                name="taskDetails"
                value={formData.taskDetails}
                onChange={handleChange}
                placeholder="Describe the task..."
                className="hrms-unified-input-style hrms-common-textarea"
              />
            </div>
            {/* Start Date + Due Date + End Date */}
            <div className="form-row " style={{ marginBottom: "5px" }}>
              <div className="form-group">
                <label>Start Date *</label>
                <div className="assign-date-wrapper position-relative">
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    name="startDate"
                    value={formData.startDate || ""}
                    onChange={handleChange}
                    className="hrms-unified-input-style custom-date"
                  />
                  <img
                    src={DateIcon}
                    alt="calendar"
                    className="date-icon cursor-pointer"
                    onClick={() => { if (startDateRef.current) { try { startDateRef.current.showPicker(); } catch (e) { } } }}
                  />
                  <input
                    ref={startDateRef}
                    type="date"
                    min={todayStr}
                    value={formData.startDate || ""}
                    onChange={(e) => handleChange({ target: { name: "startDate", value: e.target.value } })}
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Due Date (Optional)</label>
                <div className="assign-date-wrapper position-relative">
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    name="dueDate"
                    value={formData.dueDate || ""}
                    onChange={handleChange}
                    className="hrms-unified-input-style custom-date"
                  />
                  <img
                    src={DateIcon}
                    alt="calendar"
                    className="date-icon cursor-pointer"
                    onClick={() => { if (dueDateRef.current) { try { dueDateRef.current.showPicker(); } catch (e) { } } }}
                  />
                  <input
                    ref={dueDateRef}
                    type="date"
                    min={todayStr}
                    value={formData.dueDate || ""}
                    onChange={(e) => handleChange({ target: { name: "dueDate", value: e.target.value } })}
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>End Date *</label>
                {(() => {
                  const isCompletedStatus = (formData.status || "").toLowerCase() === "completed";
                  return (
                    <div className="assign-date-wrapper position-relative">
                      <input
                        type="text"
                        placeholder="YYYY-MM-DD"
                        name="endDate"
                        value={formData.endDate || ""}
                        onChange={handleChange}
                        disabled={!isCompletedStatus}
                        className={`hrms-unified-input-style custom-date ${!isCompletedStatus ? "field-disabled" : ""}`}
                      />
                      <img
                        src={DateIcon}
                        alt="calendar"
                        className={`date-icon ${!isCompletedStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                        onClick={() => { if (isCompletedStatus && endDateRef.current) { try { endDateRef.current.showPicker(); } catch (e) { } } }}
                      />
                      <input
                        ref={endDateRef}
                        type="date"
                        min={formData.startDate || todayStr}
                        value={formData.endDate || ""}
                        onChange={(e) => handleChange({ target: { name: "endDate", value: e.target.value } })}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      />
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Priority + Status */}
            <div className="form-row" style={{ marginBottom: "0px" }} >
              <div className="form-group">
                <label>Priority *</label>
                <CustomDropdown
                  options={PRIORITY_OPTIONS}
                  value={formData.priority}
                  onChange={handlePriorityChange}
                  placeholder="Select Priority"
                  className="hrms-unified-dropdown-style atMeta__customDrop"
                />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <CustomDropdown
                  options={TASK_STATUS_OPTIONS}
                  value={formData.status}
                  onChange={handleStatusChange}
                  placeholder="Select Status"
                  className="hrms-unified-dropdown-style atMeta__customDrop"
                />
              </div>
            </div>



            {/* ── PHASES SECTION ── */}
            <div className="phases-section">
              <div className="atPhase__header">
                <label style={{ fontSize: "12px", fontWeight: "400", color: "#868585", margin: 0 }}>Phases *</label>
                <button
                  type="button"
                  className="atPhase__addBtn"
                  onClick={addPhase}
                >
                  + Add Phase
                </button>
              </div>

              <div className="atPhase__list">
                {formData.phases.map((p, index) => (
                  <div key={index} className="atPhase__item animate-fade-in">
                    {/* Row 1: Close button on the right end */}
                    {formData.phases.length > 0 && (
                      <div className="atPhase__closeWrapper">
                        <button
                          type="button"
                          className="hrms-common-close-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removePhase(index);
                          }}
                          title="Remove phase"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Row 2: Title and Status side-by-side */}
                    <div className="atPhase__topRow">
                      <input
                        type="text"
                        className="hrms-unified-input-style" style={{
                          fontSize: "13px",
                          color: "#374151"
                        }}
                        placeholder="Phase Title (e.g. Design Phase)"
                        value={p.phaseTitle}
                        onChange={(e) =>
                          handlePhaseChange(
                            index,
                            "phaseTitle",
                            e.target.value
                          )
                        }
                        disabled={!formData.category}
                      />
                      <div className="atPhase__statusWrapper">
                        <CustomDropdown
                          options={PHASE_STATUS_OPTIONS}
                          value={p.phaseStatus}
                          onChange={(val) =>
                            handlePhaseChange(index, "phaseStatus", val)
                          }
                          placeholder="Status"
                          disabled={!formData.category}
                          style={{
                            border: "none",
                            boxShadow: "none",
                            outline: "none",
                            background: "transparent",
                            width: "120px",
                            height: "35px",
                            minWidth: "120px",
                            marginBottom: "0",
                          }}
                        />
                      </div>
                    </div>

                    {/* Row 3: Description */}
                    <textarea
                      className="hrms-unified-input-style hrms-common-textarea" style={{
                        fontSize: "13px",
                        color: "#374151"
                      }}

                      placeholder="Phase Description (e.g. Completed UI mockups...)"
                      value={p.phaseDescription}
                      onChange={(e) =>
                        handlePhaseChange(
                          index,
                          "phaseDescription",
                          e.target.value
                        )
                      }
                      rows={2}

                      disabled={!formData.category}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Documents */}
            <div className="form-group " style={{ marginBottom: "0px" }} >
              <label>Documents</label>
              <label className="file-item">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.xlsm,.xlsb,.ods,.txt,.png,.jpg,.jpeg,.webp,.zip"
                  multiple
                  hidden
                />
                <div className="hrms-common-upload-box ">
                  <img
                    src={attachIcon}
                    alt="attach"
                    className="attach-icon"
                  />
                  <span>Add File</span>
                </div>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="hrms-common-file-list">
                {uploadedFiles.map((file, index) => (
                  <div className="hrms-common-file-item" key={index}>
                    <span className="hrms-common-file-name">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      className="hrms-common-file-remove"
                      onClick={() => removeFile(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="form-actions">
              <button
                className="hrms-common-btn-cancel"
                type="button"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="hrms-common-btn-primary"
                type="button"
                onClick={createTask}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 9999999 }} />
    </div>
  );
}

export default AssignTask;