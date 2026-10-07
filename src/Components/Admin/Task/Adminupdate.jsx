import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import searchIcon from "../../../assets/Vector.png";
import plusIcon from "../../../assets/plus.png";
import closeIcon from "../../../assets/close.png";
import attachIcon from "../../../assets/ant-design_file-add-filled.png";
import { portalInstance } from "../../../Services/instance";
import "./Adminupdate.css"
import CustomDropdown from "../../Common/CustomDropdown";
import DateIcon from "../../../assets/uiw_date.svg";
import Document from "../../../../public/document.svg?url";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


function Adminupdate({ taskId, onClose }) {
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [task, setTask] = useState(null);

  const [formData, setFormData] = useState({
    taskTitle: "",
    taskDetails: "",
    priority: "Select",
    status: "Select",
    startDate: "",
    endDate: "",
    dueDate: "",
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState(null);

  const initialDataRef = useRef(null);
  const timerRef = useRef(null);

  const DEFAULT_AVATAR = "/avatar.png";

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  // Priority dropdown options
  const priorityOptions = [
    { value: "Select", label: "Select Priority" },
    { value: "High", label: "High" },
    { value: "Mid", label: "Mid" },
    { value: "Low", label: "Low" },
  ];

  // Status dropdown options
  const statusOptions = [
    { value: "Select", label: "Select Status" },
    { value: "Assigned", label: "Assigned" },
    { value: "assigned", label: "Assigned" },
    { value: "pending", label: "Pending" },
    { value: "inprocess", label: "In Process" },
    { value: "hold", label: "Hold" },
    { value: "Completed", label: "Completed" },
    { value: "completed", label: "Completed" },
    { value: "ignored", label: "Ignored" },
    { value: "Rejected", label: "Rejected" },
    { value: "rejected", label: "Rejected" },
  ];

  const token = useMemo(() => {
    const raw = sessionStorage.getItem("Erti-Portal");
    return raw ? JSON.parse(raw)?.token : "";
  }, []);

  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode(token);
      return decoded?.id || decoded?._id || decoded?.userId || null;
    } catch {
      return null;
    }
  }, [token]);

  const taskCreatorId = useMemo(() => {
    if (!task) return null;
    return task?.createdBy?._id || task?.createdBy?.id || task?.createdBy || null;
  }, [task]);

  const userRole = useMemo(() => {
    const raw = sessionStorage.getItem("Erti-Portal");
    return raw ? JSON.parse(raw)?.user?.role || JSON.parse(raw)?.role || "" : "";
  }, []);

  const isCreator = useMemo(() => {
    if (userRole === "admin") return true;
    return (
      Boolean(currentUserId) &&
      Boolean(taskCreatorId) &&
      String(currentUserId) === String(taskCreatorId)
    );
  }, [currentUserId, taskCreatorId, userRole]);

  const isAssignedMember = useMemo(() => {
    if (!currentUserId || !task?.assignedMembers) return false;
    return task.assignedMembers.some((member) => {
      const memberId = typeof member === "string" ? member : member?._id;
      return String(memberId) === String(currentUserId);
    });
  }, [currentUserId, task?.assignedMembers]);

  const isStatusDisabled = useMemo(() => {
    return isCreator; // Creator CANNOT edit status, assignee CAN
  }, [isCreator]);
  const buildFileUrl = useCallback((fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return fileUrl;
    }
    const base = (portalInstance.defaults.baseURL || "").replace(/\/+$/, "");
    const path = fileUrl.replace(/^\/+/, "");
    return `${base}/${path}`;
  }, []);

  const getFileIcon = useCallback((fileName) => {
    if (!fileName) return "File";
    const ext = fileName.split(".").pop()?.toLowerCase();
    const iconMap = {
      pdf: "PDF",
      doc: "DOC",
      docx: "DOCX",
      xls: "XLS",
      xlsx: "XLSX",
      png: "IMG",
      jpg: "IMG",
      jpeg: "IMG",
      gif: "IMG",
      zip: "ZIP",
      rar: "RAR",
      txt: "TXT",
      csv: "CSV",
      ppt: "PPT",
      pptx: "PPTX",
    };
    return iconMap[ext] || "FILE";
  }, []);

  const getFileSize = useCallback((size) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // Download handler
  const handleDownload = useCallback(
    async (doc) => {
      if (!doc?.fileUrl) {
        toast.error("File URL is missing", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      const fullUrl = buildFileUrl(doc.fileUrl);
      if (!fullUrl) {
        toast.error("Invalid file URL", {
          position: "top-right",
          autoClose: 3000,
        });
        return;
      }

      const fileId = doc._id || doc.fileUrl;
      const fileName = doc.fileName || "download";

      try {
        setDownloadingFileId(fileId);

        const downloadToast = toast.info(`Downloading ${fileName}`, {
          position: "top-right",
          autoClose: false,
          hideProgressBar: false,
        });

        const response = await portalInstance.get(doc.fileUrl, {
          responseType: "blob",
        });

        let finalFileName = fileName;
        const contentDisposition = response.headers?.["content-disposition"];
        if (contentDisposition) {
          const match = contentDisposition.match(
            /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
          );
          if (match?.[1]) {
            finalFileName = match[1].replace(/['"]/g, "");
          }
        }

        const blob = new Blob([response.data]);
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = finalFileName;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);

        toast.dismiss(downloadToast);
        toast.success(`${finalFileName} downloaded successfully`, {
          position: "top-right",
          autoClose: 3000,
        });
      } catch (err) {
        console.error("Download failed:", err);

        if (err.response?.status === 404) {
          toast.error("File not found on server", {
            position: "top-right",
            autoClose: 4000,
          });
        } else {
          window.open(fullUrl, "_blank", "noopener,noreferrer");
          toast.info("File opened in new tab", {
            position: "top-right",
            autoClose: 3000,
          });
        }
      } finally {
        setDownloadingFileId(null);
      }
    },
    [buildFileUrl]
  );
  /* ── Remove existing doc ── */
  const handleRemoveExistingDoc = useCallback(async (docId) => {
    if (!isCreator) {
      toast.warning("Only task creator can remove documents");
      return;
    }

    // ✅ Validate docId exists
    if (!docId) {
      toast.error("Invalid document ID");
      return;
    }

    try {
      // ✅ Correct endpoint format, explicitly encodeURIComponent the docId is needed as it contains slashes (S3 keys)
      await portalInstance.delete(`/creat/task/${taskId}/document/${encodeURIComponent(docId)}`);

      // ✅ Update local state
      setTask(prev => ({
        ...prev,
        documents: prev.documents.filter(d => d._id !== docId)
      }));

      toast.success("Document removed successfully");
      setIsDirty(true);
    } catch (err) {
      console.error("Delete document error:", err);
      toast.error(err.response?.data?.message || "Failed to remove document");
    }
  }, [isCreator, taskId]);

  // File upload
  const handleFileUpload = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const validFiles = [];
      const errors = [];

      files.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name} exceeds 10MB limit`);
        } else if (
          uploadedFiles.some((f) => f.name === file.name && f.size === file.size)
        ) {
          errors.push(`${file.name} already added`);
        } else {
          validFiles.push(file);
        }
      });

      errors.forEach((err) => {
        toast.error(err, {
          position: "top-right",
          autoClose: 3500,
        });
      });

      if (validFiles.length > 0) {
        setUploadedFiles((prev) => [...prev, ...validFiles]);
        const message =
          validFiles.length === 1
            ? `${validFiles[0].name} added`
            : `${validFiles.length} files added successfully`;
        toast.success(message, {
          position: "top-right",
          autoClose: 2500,
        });
      }

      e.target.value = "";
    },
    [uploadedFiles]
  );

  // Remove uploaded file
  const handleRemoveUploadedFile = useCallback(
    (index) => {
      const fileName = uploadedFiles[index]?.name || "File";
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
      toast.info(`${fileName} removed`, {
        position: "top-right",
        autoClose: 2000,
      });
    },
    [uploadedFiles]
  );

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  // Fetch task
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        setFetching(true);
        const res = await portalInstance.get(`/creat/tasks/${taskId}`);
        const taskData = res.data.data;

        setTask(taskData);

        const loadedData = {
          taskTitle: taskData.taskTitle || "",
          taskDetails: taskData.taskDetails || "",
          priority: taskData.priority || "Select",
          status: taskData.status || "Select",
          startDate: taskData.startDate ? taskData.startDate.slice(0, 10) : "",
          endDate: taskData.endDate ? taskData.endDate.slice(0, 10) : "",
          dueDate: taskData.dueDate ? taskData.dueDate.slice(0, 10) : "",
        };

        setFormData(loadedData);
        setSelectedEmployees(taskData.assignedMembers || []);
        initialDataRef.current = {
          formData: loadedData,
          members: taskData.assignedMembers || [],
        };
        setIsDirty(false);
      } catch (err) {
        console.error("Failed to fetch task:", err);
        toast.error("Failed to load task details", {
          position: "top-right",
          autoClose: 5000,
        });
      } finally {
        setFetching(false);
      }
    };

    fetchTask();
  }, [taskId]);

  // Fetch employees
  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const res = await portalInstance.get("/data/employees");
        const fetched = res.data.data || [];
        const activeEmployees = fetched.filter(
          (emp) =>
            emp &&
            emp.employmentStatus !== "relieved" &&
            emp.employmentStatus !== "relived" &&
            emp.status !== "relieved" &&
            emp.status !== "relived"
        );
        setAllEmployees(activeEmployees);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
        toast.error("Failed to load employees", {
          position: "top-right",
          autoClose: 3000,
        });
      }
    };
    fetchAllEmployees();
  }, []);

  // Track changes
  useEffect(() => {
    if (!initialDataRef.current) return;

    const initialMemberIds = initialDataRef.current.members
      .map((m) => m._id)
      .sort();
    const currentMemberIds = selectedEmployees.map((m) => m._id).sort();

    const formChanged = JSON.stringify(initialDataRef.current.formData) !== JSON.stringify(formData);
    const membersChanged = JSON.stringify(initialMemberIds) !== JSON.stringify(currentMemberIds);

    setIsDirty(formChanged || membersChanged || uploadedFiles.length > 0);
  }, [formData, selectedEmployees, uploadedFiles]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleAddEmployee = (employee) => {
    if (!selectedEmployees.some((e) => e._id === employee._id)) {
      setSelectedEmployees([...selectedEmployees, employee]);
      toast.success(`${employee.name} added to task`, {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  const handleRemoveEmployee = (employeeId) => {
    const employee = selectedEmployees.find((e) => e._id === employeeId);
    setSelectedEmployees(selectedEmployees.filter((e) => e._id !== employeeId));
    if (employee) {
      toast.info(`${employee.name} removed from task`, {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  const handleCancel = () => {
    if (isDirty) setShowConfirmModal(true);
    else onClose();
  };

  // Submit
  const handleSubmit = async () => {
    if (!formData.taskTitle.trim()) {
      toast.warning("Please enter a task title", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (selectedEmployees.length === 0) {
      toast.warning("Please assign at least one member", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    const toastId = toast.loading("Updating task...", {
      position: "top-right",
    });

    setLoading(true);

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key !== "phases" && key !== "assignedMembers") {
          data.append(key, formData[key]);
        }
      });
      data.append(
        "assignedMembers",
        JSON.stringify(selectedEmployees.map((e) => e._id))
      );
      // Phases logic removed as requested
      uploadedFiles.forEach((file) => data.append("files", file));

      await portalInstance.put(`/creat/task/${taskId}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.update(toastId, {
        render: "Task updated successfully",
        type: "success",
        isLoading: false,
        autoClose: 3000,
        position: "top-right",
      });

      setIsDirty(false);
      timerRef.current = setTimeout(() => onClose(), 1500);
    } catch (error) {
      console.error("Update failed:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update task";

      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 5000,
        position: "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const availableEmployees = allEmployees
    .filter((emp) => !selectedEmployees.some((s) => s._id === emp._id))
    .filter((emp) =>
      search ? emp.name.toLowerCase().includes(search.toLowerCase()) : false
    );

  if (fetching) {
    return (
      <div
        className="admin-task-details-update-container"
        style={{
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="p-5 text-center">
          <div className="spinner-border text-primary mb-3"></div>
          <p>Loading Task Details...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-task-details-update-container">
        <div className="admin-task-details-update-header">
          <div className="header-top-row">
            <div className="d-flex align-items-center gap-3">
              <h2 className="assign-task__members-title m-0">Update Task</h2>

            </div>
            <button className="hrms-common-close-btn" style={{ marginLeft: "auto" }} onClick={handleCancel} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="admin-task-details-update-body">
          {/* LEFT PANEL: Assign Members */}
          <div
            className={`admin-task-details-update-members-panel ${!isCreator ? "panel-disabled" : ""
              }`}
            style={{
              opacity: isCreator ? 1 : 0.5,
              pointerEvents: isCreator ? "auto" : "none",
            }}
          >
            <h6>
              Assign Members
              {!isCreator && (
                <span className="view-only-label">(View Only)</span>
              )}
            </h6>

            <div className="adminAssignTask__searchFilter">
              <div className="form-group input">
                <input
                  type="text"
                  placeholder="Search to add employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={!isCreator}
                />
                <img src={searchIcon} alt="search" />
              </div>
            </div>

            <div className="members-list">
              {selectedEmployees.map((emp) => (
                <div className="member selected" key={emp._id}>
                  <img
                    src={emp?.avatar || emp?.pictureUrl || emp?.photoUrl || (emp?.photo ? buildFileUrl(emp.photo) : DEFAULT_AVATAR)}
                    className="member-avatar"
                    alt={emp.name}
                    onError={(e) => {
                      e.target.src = DEFAULT_AVATAR;
                    }}
                  />
                  <div className="member-info">
                    <p className="member-name">{emp.name}</p>
                    <p className="member-role">
                      {emp.designation || "Employee"}
                    </p>
                  </div>
                  {isCreator && (
                    <img
                      src={closeIcon}
                      className="member-action"
                      alt="Remove"
                      onClick={() => handleRemoveEmployee(emp._id)}
                    />
                  )}
                </div>
              ))}

              {search &&
                isCreator &&
                selectedEmployees.length > 0 &&
                availableEmployees.length > 0 && (
                  <hr className="member-divider" />
                )}

              {search &&
                isCreator &&
                availableEmployees.map((emp) => (
                  <div
                    className="member"
                    key={emp._id}
                    onClick={() => handleAddEmployee(emp)}
                  >
                    <img
                      src={emp?.avatar || emp?.pictureUrl || emp?.photoUrl || (emp?.photo ? buildFileUrl(emp.photo) : DEFAULT_AVATAR)}
                      className="member-avatar"
                      alt={emp.name}
                      onError={(e) => {
                        e.target.src = DEFAULT_AVATAR;
                      }}
                    />
                    <div className="member-info">
                      <p className="member-name">{emp.name}</p>
                    </div>
                    <img src={plusIcon} className="member-action" alt="Add" />
                  </div>
                ))}
            </div>
          </div>

          {/* RIGHT PANEL: Form Fields */}
          <div className="admin-task-details-update-form">
            {/* Task Title */}
            <div className="form-group">
              <label>
                Task Title
                {!isCreator && <span className="field-lock-icon"></span>}
              </label>
              <input
                type="text"
                name="taskTitle"
                value={formData.taskTitle}
                onChange={handleChange}
                disabled={!isCreator}
                className={!isCreator ? "field-disabled" : ""}
              />
            </div>

            {/* Task Details */}
            <div className="form-group" style={{ marginBottom: "5px" }}>
              <label>
                Task Details
                {!isCreator && <span className="field-lock-icon"></span>}
              </label>
              <textarea
                name="taskDetails"
                value={formData.taskDetails}
                onChange={handleChange}
                disabled={!isCreator}
                className={!isCreator ? "field-disabled" : ""}
              />
            </div>

            <div className="form-row" style={{ marginBottom: "0px" }}>
              {/* Priority */}
              <div className="form-group">
                <label>
                  Priority
                  {!isCreator && <span className="field-lock-icon"></span>}
                </label>
                <CustomDropdown
                  options={priorityOptions}
                  value={formData.priority}
                  onChange={(val) =>
                    setFormData({ ...formData, priority: val })
                  }
                  disabled={!isCreator}
                  className="priority-dropdown"
                  style={{ width: "100%" }}
                />
              </div>

              {/* Due Date */}
              <div className="form-group">
                <label>
                  Due Date
                  {!isCreator && <span className="field-lock-icon"></span>}
                </label>
                <div className="date-inputsbut">
                  <input
                    type="date"
                    name="dueDate"
                    id="dueDate"
                    value={formData.dueDate || ""}
                    onChange={handleChange}
                    disabled={!isCreator}
                    className={!isCreator ? "field-disabled" : "custom-date"}
                  />
                  {isCreator && (
                    <img
                      src={DateIcon}
                      alt="calendar"
                      className="date-icon"
                      onClick={() => {
                        const el = document.getElementById("dueDate");
                        if (el) {
                          try { el.showPicker(); } catch (e) { }
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              {/* ✅ Status - FIXED LOGIC */}
              {!isCreator && (
                <div className="form-group">
                  <label>
                    Status
                    {isStatusDisabled && <span className="field-lock-icon"></span>}
                  </label>

                  <CustomDropdown
                    options={statusOptions}
                    value={formData.status}
                    onChange={(val) =>
                      setFormData({ ...formData, status: val })
                    }
                    disabled={isStatusDisabled}
                    className="status-dropdown"
                  />
                </div>
              )}
            </div>

            <div className="form-row" style={{ marginBottom: "0px" }}>
              {/* Start Date */}
              <div className="form-group">
                <label>
                  Start Date
                  {isCreator && <span className="field-lock-icon"></span>}
                </label>
                <div className="date-inputsbut position-relative">
                  <input
                    type="text"
                    name="startDate"
                    id="startDate"
                    placeholder="YYYY-MM-DD"
                    value={formData.startDate || ""}
                    onChange={handleChange}
                    disabled={isCreator}
                    className={isCreator ? "field-disabled" : "custom-date"}
                  />
                  {!isCreator && (
                    <>
                      <img
                        src={DateIcon}
                        alt="calendar"
                        className="date-icon cursor-pointer"
                        onClick={() => {
                          const el = document.getElementById("startDate_picker");
                          if (el) {
                            try { el.showPicker(); } catch (e) {}
                          }
                        }}
                      />
                      <input
                        id="startDate_picker"
                        type="date"
                        value={formData.startDate || ""}
                        onChange={(e) => handleChange({ target: { name: "startDate", value: e.target.value } })}
                        style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                      />
                    </>
                  )}
                </div>
              </div>
              {/* End Date */}
              <div className="form-group">
                <label>
                  End Date
                </label>
                <div className="date-inputsbut position-relative">
                  <input
                    type="text"
                    name="endDate"
                    id="endDate"
                    placeholder="YYYY-MM-DD"
                    value={formData.endDate || ""}
                    onChange={handleChange}
                    className="hrms-unified-input-style custom-date"
                  />
                  <img
                    src={DateIcon}
                    alt="calendar"
                    className="date-icon cursor-pointer"
                    onClick={() => {
                      const el = document.getElementById("endDate_picker");
                      if (el) {
                        try {
                          el.showPicker();
                        } catch (e) {}
                      }
                    }}
                  />
                  <input
                    id="endDate_picker"
                    type="date"
                    value={formData.endDate || ""}
                    onChange={(e) => handleChange({ target: { name: "endDate", value: e.target.value } })}
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                  />
                </div>
              </div>
            </div>


            <div className="update-task-docs-section">
              <label className="update-task-section-label">Documents</label>

              {/* Upload Button */}
              <label htmlFor="updateTaskUpload" className="hrms-common-upload-box">
                <img src={attachIcon} alt="Add" className="hrms-common-attach-icon" />
                <span>Add File</span>
                <input
                  type="file"
                  id="updateTaskUpload"
                  hidden
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.xlsm,.xlsb,.ods,.txt,.png,.jpg,.jpeg,.webp,.zip"
                  onChange={handleFileUpload}
                />
              </label>

              {/* Existing Documents */}
              {task?.documents?.length > 0 && (
                <div className="hrms-common-file-list mt-3">
                  {task.documents.map(doc => {
                    const fileId = doc._id || doc.id;
                    if (!fileId) return null;
                    const isDL = downloadingFileId === fileId;
                    return (
                      <div key={fileId} className={`hrms-common-file-item${isDL ? " downloading" : ""}`}>
                        <div className="d-flex align-items-center gap-2 overflow-hidden" role="button" tabIndex={0}
                          style={{ cursor: 'pointer', flex: 1 }}
                          onClick={() => !isDL && handleDownload(doc)}
                          onKeyDown={e => { if (e.key === "Enter" && !isDL) handleDownload(doc); }}>
                          <img src={Document} alt="Doc" className="hrms-common-attach-icon" />
                          <span className="hrms-common-file-name">{doc?.fileName || "Unnamed File"}</span>
                          {doc?.fileSize && <span className="file-size-text" style={{ fontSize: '10px', color: '#94a3b8' }}>({getFileSize(doc.fileSize)})</span>}
                        </div>
                        {isCreator && fileId && (
                          <button className="hrms-common-file-remove"
                            onClick={e => { e.stopPropagation(); handleRemoveExistingDoc(fileId); }}>
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New Files to Upload */}
              {uploadedFiles.length > 0 && (
                <div className="hrms-common-file-list mt-3">
                  <p className="docs-sub-label" style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '5px' }}>New Files to Upload</p>
                  {uploadedFiles.map((file, index) => (
                    <div key={`new-${index}`} className="hrms-common-file-item">
                      <div className="d-flex align-items-center gap-2 overflow-hidden" style={{ flex: 1 }}>
                        <span className="file-icon-text" style={{ fontSize: '10px', background: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>{getFileIcon(file.name)}</span>
                        <span className="hrms-common-file-name">{file.name}</span>
                        <span className="new-badge" style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 4px', borderRadius: '3px' }}>NEW</span>
                      </div>
                      <button className="hrms-common-file-remove" onClick={() => handleRemoveUploadedFile(index)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* No Documents Message */}
              {(!task?.documents || task.documents.length === 0) &&
                uploadedFiles.length === 0 && (
                  <p className="no-docs-message">No documents attached yet.</p>
                )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="admin-task-details-update-form-actions">
              <button
                className="hrms-common-btn-cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                className="hrms-common-btn-primary"
                onClick={handleSubmit}
                disabled={loading || !isDirty}
              >
                {loading ? "Updating..." : "Update Task"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* UNSAVED CHANGES CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="unsaved-confirm-overlay">
          <div
            className="unsaved-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="unsaved-title">Unsaved Changes</h4>
            <p className="unsaved-message">
              You have modified this task. Are you sure you want to discard your
              changes?
            </p>
            <div className="confirm-btn-container">
              <button className="confirm-btn discard" onClick={onClose}>
                Discard
              </button>
              <button
                className="confirm-btn keep"
                onClick={() => setShowConfirmModal(false)}
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .role-badge {
          font-size: 12px;
          font-weight: 600;
          margin-left: 10px;
          padding: 4px 12px;
          border-radius: 20px;
        }
        .role-badge.creator {
          color: #2e7d32;
          background: #e8f5e9;
        }
        .role-badge.assignee {
          color: #1565c0;
          background: #e3f2fd;
        }
        .view-only-label {
          font-size: 11px;
          color: #f44336;
          margin-left: 8px;
          font-weight: normal;
        }
        .field-lock-icon {
          font-size: 10px;
          margin-left: 5px;
          opacity: 0.7;
        }
        .field-disabled {
          background-color: #f5f5f5 !important;
          color: #9e9e9e !important;
          cursor: not-allowed !important;
          border-color: #e0e0e0 !important;
          opacity: 0.7;
        }
        .panel-disabled {
          position: relative;
        }
        .file-icon-text {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          background: #e3f2fd;
          border-radius: 4px;
          color: #1976d2;
        }
        .remove-doc-btn {
          background: #ef5350;
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .remove-doc-btn:hover {
          background: #e53935;
        }
      `}</style>
      <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 99999999 }} />
    </>
  );
}

export default Adminupdate;
