import React, { useEffect, useState, useRef, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify"; // ✅ Added ToastContainer
import "react-toastify/dist/ReactToastify.css";

import searchIcon from "../../../assets/Vector.png";
import filterIcon from "../../../assets/mage_filter-square-fill.svg";
import plusIcon from "../../../assets/plus.png";
import closeIcon from "../../../assets/close.png";
import attachIcon from "../../../assets/ant-design_file-add-filled.png";
import DateIcon from "../../../assets/uiw_date.svg";
import Document from "../../../../public/document.svg?url";
import CustomDropdown from "../../Common/CustomDropdown";

import { portalInstance } from "../../../Services/instance";
import "../../../Globel/Layout.css";
import "./AssignTask.css";
const DEFAULT_AVATAR = "/avatar.png";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
  "application/vnd.oasis.opendocument.spreadsheet",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/webp",
  "application/zip",
  "application/x-zip-compressed",
  "multipart/x-zip",
  "application/octet-stream",
];
const ALLOWED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".xlsm", ".xlsb", ".ods",
  ".txt", ".png", ".jpg", ".jpeg", ".webp", ".zip"
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

// PREDEFINED DEFAULTS (Removed as per request - only DB and 'Add' used)

const PHASE_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "#f59e0b" },
  { value: "inprocess", label: "In Process", color: "#3b82f6" },
  { value: "hold", label: "Hold", color: "#ef4444" },
  { value: "completed", label: "Completed", color: "#22c55e" },
];

function AssignTask({ onClose, onSuccess }) {
  const [allEmployees, setAllEmployees] = useState([]);
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [search, setSearch] = useState("");

  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const filterRef = useRef(null);
  const [formData, setFormData] = useState({
    taskTitle: "",
    taskDetails: "",
    priority: "",
    status: "Assigned",
    dueDate: "",
    assignedStatus: "Allocated",
    category: "",
    project: "",
    phases: [],
  });

  // Category & Project lists (fetched from DB)
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [fullCategories, setFullCategories] = useState([]);
  const [fullProjects, setFullProjects] = useState([]);

  // Dropdown open state
  const [showCategoryDrop, setShowCategoryDrop] = useState(false);
  const [showProjectDrop, setShowProjectDrop] = useState(false);

  // Toggle add-new input inside each dropdown
  const [showAddCatInput, setShowAddCatInput] = useState(false);
  const [showAddProjInput, setShowAddProjInput] = useState(false);

  // Inline "add new" input value
  const [newCategoryVal, setNewCategoryVal] = useState("");
  const [newProjectVal, setNewProjectVal] = useState("");

  // Category selection for "Add Project"
  const [addProjCategoryId, setAddProjCategoryId] = useState("");

  // Refs for click-outside close
  const categoryRef = useRef(null);
  const projectRef = useRef(null);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeOtherField, setActiveOtherField] = useState(null); // 'category', 'project', or null
  const [loading, setLoading] = useState(false);
  const dueDateRef = useRef(null);

  const todayStr = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
      t.getDate()
    ).padStart(2, "0")}`;
  })();

  const getAvatarSrc = (person) => {
    if (!person) return DEFAULT_AVATAR;
    const rawSrc =
      person.avatar ||
      person.photo ||
      person.photoUrl ||
      person.pictureUrl ||
      person.picture ||
      person.profilePicture ||
      "";
    if (!rawSrc || rawSrc === "avatar.png" || rawSrc === "/avatar.png" || rawSrc === "null" || rawSrc === "undefined") {
      return DEFAULT_AVATAR;
    }
    if (
      rawSrc.startsWith("http://") ||
      rawSrc.startsWith("https://") ||
      rawSrc.startsWith("blob:") ||
      rawSrc.startsWith("data:")
    ) {
      return rawSrc;
    }
    const base = (portalInstance?.defaults?.baseURL || "").replace(/\/+$/, "");
    const cleanPath = String(rawSrc).replace(/^\/+/, "");
    return `${base}/${cleanPath}`;
  };

  // ✅ Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch employees
      try {
        const r = await portalInstance.get("/data/employees?role=employee");
        const empData = r.data.data || [];
        const activeEmployees = empData.filter(
          (emp) =>
            emp &&
            (emp.role || "").toLowerCase() !== "admin" &&
            (emp.employmentStatus || "").toLowerCase() !== "relieved" &&
            (emp.employmentStatus || "").toLowerCase() !== "relived" &&
            (emp.status || "").toLowerCase() !== "relieved" &&
            (emp.status || "").toLowerCase() !== "relived"
        );
        setAllEmployees(activeEmployees);
        if (activeEmployees.length === 0) {
          toast.info("No employees found in the system");
        }
      } catch (err) {
        console.error("Employee fetch error:", err);
        toast.error("Failed to load employee list. Please refresh the page.");
      }

      // Fetch departments
      try {
        const token = localStorage.getItem("token");
        const r = await portalInstance.get("/data/employees/basic", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.data?.success) {
          setDepartmentOptions(r.data.departments || []);
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
        toast.warning("Could not load department filters");
      }

      // Fetch current user
      try {
        const r = await portalInstance.get("/users/get-details");
        setCurrentUser(r.data.data);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }

      // Fetch task meta (categories + projects)
      try {
        const r = await portalInstance.get("/creat/task-meta");
        if (r.data?.success) {
          const rawCats = r.data.data.categories || [];
          // Sort 'Add' to the end
          const sortedCats = [
            ...rawCats.filter(c => c && c.toLowerCase() !== "add"),
            ...rawCats.filter(c => c && c.toLowerCase() === "add")
          ];

          const rawProjs = r.data.data.projects || [];
          const sortedProjs = [
            ...rawProjs.filter(p => p && p.toLowerCase() !== "add"),
            ...rawProjs.filter(p => p && p.toLowerCase() === "add")
          ];

          setCategories(sortedCats);
          setProjects(sortedProjs);
          setFullCategories(r.data.data.fullCategories || []);
          setFullProjects(r.data.data.fullProjects || []);
        }
      } catch (err) {
        console.error("Failed to load task meta:", err);
      }
    };

    fetchData();
  }, []);

  // ✅ Close filter panel on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterPanel(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategoryDrop(false);
      }
      if (projectRef.current && !projectRef.current.contains(e.target)) {
        setShowProjectDrop(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Filtered employees based on search (name, empId, designation, department)
  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEmployees;
    return allEmployees.filter((e) => {
      const nameMatch = (e.name || "").toLowerCase().includes(q);
      const empIdMatch = (e.empId || e.employeeId || e._id || "").toLowerCase().includes(q);
      const deptMatch = (e.department || "").toLowerCase().includes(q);
      const desigMatch = (e.designation || "").toLowerCase().includes(q);
      return nameMatch || empIdMatch || deptMatch || desigMatch;
    });
  }, [allEmployees, search]);

  // ✅ Filtered employees based on designation
  const deptEmployees = useMemo(() => {
    if (!selectedDepartment) return [];
    const sel = selectedDepartment.trim().toLowerCase();
    return allEmployees.filter((e) => {
      const des = (e.designation || "").trim().toLowerCase();
      if (sel === "mern stack developer" || sel === "mern stack") {
        return des === "mern stack developer" || des === "mern stack" || des.includes("mern");
      }
      if (sel === "technical support and api integration" || sel === "techical support and api integration") {
        return des.includes("technical support") || des.includes("techical support") || des.includes("api integration");
      }
      return des === sel;
    });
  }, [allEmployees, selectedDepartment]);

  const isSelected = (id) => selectedEmployees.some((e) => e._id === id);

  // ✅ Add employee with toast
  const addEmployee = (emp) => {
    if (!isSelected(emp._id)) {
      setSelectedEmployees((prev) => [...prev, emp]);
      toast.success(`${emp.name} added to task`, {
        autoClose: 1500,
        hideProgressBar: true,
      });
    } else {
      toast.info(`${emp.name} is already selected`, {
        autoClose: 1500,
        hideProgressBar: true,
      });
    }
  };

  // ✅ Remove employee with toast
  const removeEmployee = (id) => {
    const emp = selectedEmployees.find((e) => e._id === id);
    setSelectedEmployees((prev) => prev.filter((e) => e._id !== id));
    if (emp) {
      toast.info(`${emp.name} removed from task`, {
        autoClose: 1500,
        hideProgressBar: true,
      });
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ File upload with validation and toast
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);

    if (uploadedFiles.length + newFiles.length > MAX_FILES) {
      toast.warning(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles = [];
    const errors = [];

    newFiles.forEach((file) => {
      const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
      const isAllowed = ALLOWED_FILE_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext);

      if (!isAllowed) {
        errors.push(`"${file.name}" — unsupported format`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" — exceeds 10MB limit`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err, { autoClose: 4000 }));
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
      toast.success(
        `${validFiles.length} file${validFiles.length > 1 ? "s" : ""} attached`,
        { autoClose: 2000 }
      );
    }

    // ✅ Reset input so same file can be re-selected
    e.target.value = "";
  };

  // ✅ Remove uploaded file
  const removeFile = (index) => {
    const fileName = uploadedFiles[index]?.name;
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    toast.info(`"${fileName}" removed`, {
      autoClose: 1500,
      hideProgressBar: true,
    });
  };
  const handlePriorityChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      priority: value,
    }));
  };

  const handleCategoryToggle = (cat) => {
    if (cat && cat.toLowerCase() === "add") {
      setActiveOtherField("category");
    } else {
      setActiveOtherField(null);
    }
    setFormData((prev) => {
      const nextCategory = (prev.category || "").toLowerCase() === (cat || "").toLowerCase() ? "" : cat;

      // Clear project if it doesn't belong to the new category
      let nextProject = prev.project;
      if (nextCategory) {
        const projObj = fullProjects.find(p => p && (p.name || "").toLowerCase() === (prev.project || "").toLowerCase());
        const catName = projObj?.categoryId?.name;
        if ((catName || "").toLowerCase() !== nextCategory.toLowerCase()) nextProject = "";
      } else {
        nextProject = "";
      }

      return { ...prev, category: nextCategory, project: nextProject };
    });
  };


  const handleProjectToggle = (projName) => {
    if (projName && projName.toLowerCase() === "add") {
      setActiveOtherField("project");
    } else {
      setActiveOtherField(null);
    }
    setFormData((prev) => {
      const nextProject = (prev.project || "").toLowerCase() === (projName || "").toLowerCase() ? "" : projName;
      let nextCategory = prev.category;

      if (nextProject && nextProject.toLowerCase() !== "add") {
        const projObj = fullProjects.find(p => p && (p.name || "").toLowerCase() === nextProject.toLowerCase());
        const catName = projObj?.categoryId?.name;
        if (catName && (catName || "").toLowerCase() !== (nextCategory || "").toLowerCase()) {
          nextCategory = catName;
        }
      }

      return { ...prev, project: nextProject, category: nextCategory };
    });
  };

  // ── Add new category to DB + local list + auto-select it ──
  const handleAddCategory = async (overrideName = null) => {
    const name = (typeof overrideName === "string" ? overrideName : newCategoryVal).trim();
    if (!name) return;

    const exists = categories.some(c => c && c.toLowerCase() === name.toLowerCase()) ||
      fullCategories.some(c => c && c.name.toLowerCase() === name.toLowerCase());

    if (exists) {
      toast.info(`"${name}" is already available.`);
      setActiveOtherField(null);
      setFormData((prev) => ({ ...prev, category: name, project: "" }));
      setNewCategoryVal("");
      return;
    }

    try {
      await portalInstance.post("/creat/task-meta/category", { name });

      // Refresh all meta lists
      const r = await portalInstance.get("/creat/task-meta");
      if (r.data?.success) {
        setCategories(r.data.data.categories || []);
        setProjects(r.data.data.projects || []);
        setFullCategories(r.data.data.fullCategories || []);
        setFullProjects(r.data.data.fullProjects || []);
      }

      setActiveOtherField(null);
      setFormData((prev) => ({
        ...prev,
        category: name, // Select the newly added category as a string
        project: "",    // Always reset project when adding new category
      }));
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
    } finally {
      if (!overrideName) setNewCategoryVal("");
    }
  };

  // ── Add new project to DB — auto-uses the first selected category ──
  const handleAddProject = async (overrideName = null) => {
    const name = (typeof overrideName === "string" ? overrideName : newProjectVal).trim();
    if (!name) return;

    const exists = projects.some(p => p && p.toLowerCase() === name.toLowerCase()) ||
      fullProjects.some(p => p && p.name.toLowerCase() === name.toLowerCase());

    if (exists) {
      toast.info(`"${name}" is already available.`);
      setActiveOtherField(null);
      setFormData((prev) => ({ ...prev, project: name }));
      setNewProjectVal("");
      return;
    }

    // Get categoryId from the first selected category name
    const selectedCatName = formData.category;
    if (!selectedCatName) {
      toast.error("Please select a category first");
      return;
    }
    const catObj = fullCategories.find(c => c.name.toLowerCase() === selectedCatName.toLowerCase());
    if (!catObj) {
      toast.error("Selected category not found");
      return;
    }

    try {
      await portalInstance.post("/creat/task-meta/project", {
        name,
        categoryId: catObj._id
      });

      // Refresh all meta lists
      const r = await portalInstance.get("/creat/task-meta");
      if (r.data?.success) {
        setCategories(r.data.data.categories || []);
        setProjects(r.data.data.projects || []);
        setFullCategories(r.data.data.fullCategories || []);
        setFullProjects(r.data.data.fullProjects || []);
      }

      setActiveOtherField(null);
      // Auto-select the new project
      setFormData((prev) => ({
        ...prev,
        project: name,
      }));
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
    } finally {
      if (!overrideName) setNewProjectVal("");
    }
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

  // ✅ Create task with comprehensive validation and toasts
  const createTask = async () => {
    if (!formData.category) {
      toast.error("Category is required");
      return;
    }
    if (!formData.project) {
      toast.error("Project is required");
      return;
    }
    if (!formData.taskTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (formData.taskTitle.trim().length < 3) {
      toast.error("Task title must be at least 3 characters");
      return;
    }
    if (!formData.dueDate) {
      toast.error("Due date is required");
      return;
    }
    if (formData.dueDate < todayStr) {
      toast.error("Due date cannot be in the past");
      return;
    }
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee");
      return;
    }
    if (!formData.priority) {
      toast.error("Priority level is required");
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append("taskTitle", formData.taskTitle.trim());
      data.append("taskDetails", formData.taskDetails.trim());
      data.append("priority", formData.priority);
      data.append("status", formData.status || "Assigned");
      data.append("assignedStatus", formData.assignedStatus || "Allocated");
      data.append("dueDate", formData.dueDate);
      data.append("category", formData.category);
      data.append("project", formData.project);
      data.append("assignedMembers", JSON.stringify(selectedEmployees.map((e) => e._id)));

      // Filter and standardize phases
      const filteredPhases = (formData.phases || [])
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

      uploadedFiles.forEach((file) => data.append("files", file));

      const res = await portalInstance.post("/creat/task", data);

      if (res.status === 200 || res.status === 201) {
        toast.success("Task assigned successfully", { position: "top-right", autoClose: 3000 });
        setFormData({
          taskTitle: "",
          taskDetails: "",
          priority: "",
          status: "Assigned",
          dueDate: "",
          assignedStatus: "Allocated",
          category: "",
          project: "",
          phases: [],
        });
        setSelectedEmployees([]);
        setUploadedFiles([]);
        if (onSuccess) onSuccess();
        if (onClose) setTimeout(onClose, 1500);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to assign task.";
      toast.error(errorMsg, { position: "top-right", autoClose: 4000 });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onClose) onClose();
  };

  const MemberCard = ({ emp, mode }) => {
    const sel = isSelected(emp._id);
    const handleToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (mode === "selected" || sel) {
        removeEmployee(emp._id);
      } else {
        addEmployee(emp);
      }
    };
    return (
      <div
        className={`member ${mode === "selected" || sel ? "selected" : ""} cursor-pointer`}
        onClick={handleToggle}
      >
        <img
          src={getAvatarSrc(emp)}
          alt={emp.name}
          className="member-avatar"
          onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
        />
        <div className="member-info">
          <p className="member-name">{emp.name}</p>
          <p className="member-role">{emp.department || emp.role || "Employee"}</p>
        </div>
        {mode === "selected" ? (
          <img src={closeIcon} alt="remove" className="hrms-common-close-btn cursor-pointer" />
        ) : (
          <img src={sel ? closeIcon : plusIcon} alt={sel ? "remove" : "add"} className="member-action" />
        )}
      </div>
    );
  };

  const priorityOptions = [

    { value: "High", label: "High" },
    { value: "Mid", label: "Mid" },
    { value: "Low", label: "Low" },
  ];

  return (
    <div className="assign-task-page">
      <div className="assign-task-container">
        <div className="task-header">
          <h4 className="assign-task__members-title mb-2">Assign Task</h4>
          <button onClick={handleCancel} className="hrms-common-close-btn" title="Close">
            ✕
          </button>
        </div>

        <div className="task-body">
          <div className="hrms-common-label">
            <span>Assign Members</span>
            <div className="adminAssignTask__searchFilter">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowFilterPanel(false); }}
                  className="hrms-unified-input-style hrms-search-input"
                />
                <img src={searchIcon} alt="search" />
              </div>
              <div ref={filterRef} className="atFilter__wrapper">
                <div className={`dwu-employee-filter-icon ${showFilterPanel ? "atFilter--active" : ""}`} onClick={() => { setShowFilterPanel((p) => !p); setSearch(""); }}>
                  <img src={filterIcon} alt="filter" />
                </div>
                {showFilterPanel && (
                  <div className="atFilter__popup">
                    <p className="atFilter__sectionLabel">Designation</p>
                    <div className="atFilter__deptRow">
                      {departmentOptions.length === 0 ? <span className="atFilter__hint">Loading...</span> : departmentOptions.map((dept) => (
                        <div key={dept} className={`atFilter__deptTab${selectedDepartment === dept ? " active" : ""}`} onClick={() => setSelectedDepartment((p) => p === dept ? "" : dept)}>
                          {dept}
                        </div>
                      ))}
                    </div>
                    {selectedDepartment !== "" && (
                      <>
                        <div className="atFilter__divider" />
                        <p className="atFilter__sectionLabel">{selectedDepartment}</p>
                        <div className="atFilter__empList">
                          {deptEmployees.length === 0 ? <p className="atFilter__hint">No employees</p> : deptEmployees.map((emp) => <MemberCard key={emp._id} emp={emp} mode="add" />)}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="members-list">

              {selectedEmployees.map((emp) => <MemberCard key={emp._id} emp={emp} mode="selected" />)}
              {search.trim() !== "" && searchFiltered.filter((emp) => !isSelected(emp._id)).map((emp) => <MemberCard key={emp._id} emp={emp} mode="add" />)}
            </div>
          </div>

          <div className="task-form">
            <div className="form-group">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="m-0">Category *</label>
              </div>
              {activeOtherField === "category" ? (
                <div className="atMeta__inlineAdd animate-fade-in">
                  <input type="text" className="hrms-unified-input-style atMeta__addInput" placeholder="Type new category..." value={newCategoryVal} autoFocus onChange={(e) => setNewCategoryVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddCategory(); }} />
                  <button type="button" className="atMeta__saveBtn" onClick={() => handleAddCategory()}>Save</button>
                </div>
              ) : (
                <CustomDropdown
                  options={[...new Set(categories), "Add"].map(c => ({ value: c, label: c }))}
                  value={formData.category}
                  onChange={(val) => handleCategoryToggle(val)}
                  placeholder="Select Category"
                  className="hrms-unified-dropdown-style atMeta__customDrop"
                />
              )}
            </div>

            <div className="form-group">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="m-0">Project *</label>
              </div>
              {activeOtherField === "project" ? (
                <div className="atMeta__inlineAdd animate-fade-in">
                  <input type="text" className="hrms-unified-input-style atMeta__addInput" placeholder="Type new project..." value={newProjectVal} autoFocus onChange={(e) => setNewProjectVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAddProject(); }} />
                  <button type="button" className="atMeta__saveBtn" onClick={() => handleAddProject()}>Save</button>
                </div>
              ) : (
                <CustomDropdown
                  options={[
                    ...fullProjects.filter(p => {
                      if (!p.categoryId) return false;
                      let catName = typeof p.categoryId === "object" ? p.categoryId.name : fullCategories.find(c => String(c._id) === String(p.categoryId))?.name;
                      return (catName || "").toLowerCase() === (formData.category || "").toLowerCase();
                    }).map(p => ({ value: p.name, label: p.name })),
                    { value: "Add", label: "Add" }
                  ]
                    .filter((v, i, a) => a.findIndex(t => t.value === v.value) === i)}
                  value={formData.project}
                  onChange={(val) => handleProjectToggle(val)}
                  disabled={!formData.category || formData.category.toLowerCase() === "add"}
                  placeholder={!formData.category ? "Select Category first" : "Select Project"}
                  className="hrms-unified-dropdown-style atMeta__customDrop"
                />
              )}
            </div>


            <div className="form-group">
              <label>Task Title *</label>
              <input type="text" name="taskTitle" value={formData.taskTitle} onChange={handleChange} placeholder="Write here..." className="hrms-unified-input-style" />
            </div>
            <div className="form-group " style={{ marginBottom: "5px" }} >
              <label>Task Details *</label>
              <textarea name="taskDetails" value={formData.taskDetails} onChange={handleChange} placeholder="Write here..." className=" hrms-common-textarea" />
            </div>
            <div className="form-row" style={{ marginBottom: "0px" }}>
              <div className="form-group at-priority-group">
                <label>Priority *</label>
                <CustomDropdown
                  options={priorityOptions}
                  value={formData.priority}
                  onChange={handlePriorityChange}
                  placeholder="Select Priority"
                  className="hrms-unified-dropdown-style atMeta__customDrop atMeta__priorityDrop"
                />
              </div>
              <div className="form-group">
                <label>Due Date *</label>
                <div className="assign-date-wrapper position-relative">
                  <input 
                    type="text"
                    placeholder="YYYY-MM-DD"
                    name="dueDate" 
                    value={formData.dueDate || ""} 
                    onChange={handleChange} 
                    className="hrms-unified-input-style custom-date" 
                  />
                  <img src={DateIcon} alt="calendar" className="date-icon cursor-pointer" onClick={() => { if(dueDateRef.current){ try { dueDateRef.current.showPicker(); } catch(e) {} } }} />
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
            </div>



            <div className="form-group " style={{ marginBottom: "5px" }}>
              <label>Documents</label>
              <label className="file-item-trigger">
                <input id="task-files" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.xlsm,.xlsb,.ods,.txt,.png,.jpg,.jpeg,.webp,.zip" className="hrms-hidden-input" onChange={handleFileChange} />
                <div className="hrms-common-upload-box ">
                  <img src={attachIcon} alt="attach" className="attach-icon" />
                  <span>Add File</span>
                </div>
              </label>

              {uploadedFiles.length > 0 && (
                <div className="hrms-common-file-list mt-2">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="hrms-common-file-item">
                      <div className="d-flex align-items-center gap-2 overflow-hidden">
                        <img src={Document} alt="doc" width={14} />
                        <span className="hrms-common-file-name">{file.name}</span>
                      </div>
                      <button type="button" onClick={() => removeFile(idx)} className="hrms-common-file-remove">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-actions ">
              <button className="hrms-common-btn-cancel " type="button" onClick={handleCancel} disabled={loading}>Cancel</button>
              <button className="hrms-common-btn-primary" onClick={createTask} disabled={loading}>{loading ? "Assigning..." : "Assign Task"}</button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 9999999 }} />
    </div>
  );
}

export default AssignTask;
