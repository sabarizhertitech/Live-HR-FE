import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../HeaderSidebar/Sidebar";
import { Icon } from "@iconify/react";
import "./Todolist.css";
import "../Common/CustomDropdown.css";
import { useNavigate } from "react-router-dom";
import { portalInstance } from "../../Services/instance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Todolist = () => {
  const navigate = useNavigate();

  const [dateType, setDateType] = useState("All Date Range");
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [status, setStatus] = useState("Pending");

  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [todoToDeleteId, setTodoToDeleteId] = useState(null);

  /* ✅ EDIT MODAL STATES */
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [showEditStatusDropdown, setShowEditStatusDropdown] = useState(false);

  /* ✅ CREATE MODAL STATES */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createDate, setCreateDate] = useState("");

  const editStatusRef = useRef(null);
  const createDateInputRef = useRef(null);
  const editDateInputRef = useRef(null);
  const fromDateInputRef = useRef(null);
  const toDateInputRef = useRef(null);
  const abortControllerRef = useRef(null);


  const dateDropdownRef = useRef(null);
  const statusDropdownRef = useRef(null);

  /* ================= FRONTEND DATE FILTER ================= */
  const getFilteredTodos = () => {
    return todos.filter((todo) => {
      // 1. Date filter
      if (dateType === "All Date Range") {
        return true;
      }

      const todoDueDate = todo.dueDate ? new Date(todo.dueDate) : null;
      const todoCreatedDate = (todo.createdDate || todo.createdAt) ? new Date(todo.createdDate || todo.createdAt) : null;

      // Create timezone-aware dates in local user timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      // Compare exact date strings "YYYY-MM-DD"
      const formatDateString = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const todayStr = formatDateString(today);
      const yesterdayStr = formatDateString(yesterday);

      const matchesDate = (targetDate) => {
        if (!targetDate || isNaN(targetDate.getTime())) return false;

        const targetStr = formatDateString(targetDate);

        if (dateType === "Today") {
          return targetStr === todayStr;
        }

        if (dateType === "Yesterday") {
          return targetStr === yesterdayStr;
        }

        if (dateType === "This Week") {
          const day = today.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() + diff);
          startOfWeek.setHours(0, 0, 0, 0);

          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          return targetDate >= startOfWeek && targetDate <= endOfWeek;
        }

        if (dateType === "This Month") {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          return targetDate >= startOfMonth && targetDate <= endOfMonth;
        }

        if (dateType === "Custom") {
          if (!fromDate || !toDate) {
            return false;
          }
          if (fromDate) {
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            if (targetDate < from) return false;
          }
          if (toDate) {
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            if (targetDate > to) return false;
          }
          return true;
        }

        return false;
      };

      // Match if either the due date OR the creation date matches the filter!
      return matchesDate(todoDueDate) || matchesDate(todoCreatedDate);
    });
  };

  /* ================= FETCH TODOS ================= */
  const fetchTodos = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const params = {
        dateFilter: "all",
        statusFilter: status.toLowerCase(),
      };

      const res = await portalInstance.get("/todo/all", {
        params,
        signal: abortControllerRef.current.signal,
      });

      if (res.data.success) {
        setTodos(res.data.data);
      }
    } catch (err) {
      if (err.name !== "CanceledError" && err.name !== "AbortError") {
        console.error("Fetch Todo Error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPDATE TODO ================= */
  const handleUpdate = async () => {
    if (!selectedTodo) return;
    if (!editTitle.trim()) { toast.error("Title is required"); return; }
    if (!editDate) { toast.error("Due date is required"); return; }
    if (!editDescription.trim()) { toast.error("Description is required"); return; }
    try {
      const res = await portalInstance.put(`/todo/update/${selectedTodo._id}`, {
        title: editTitle,
        description: editDescription,
        date: editDate,
        status: editStatus,
      });

      if (res.data.success) {
        toast.success("Todo updated successfully");
        setShowEditModal(false);
        fetchTodos();
      }
    } catch (err) {
      console.error("Update Todo Error:", err);
      toast.error("Failed to update todo");
    }
  };

  /* ================= CREATE TODO ================= */
  const handleCreate = async () => {
    if (!createTitle.trim()) { toast.error("Title is required"); return; }
    if (!createDate) { toast.error("Due date is required"); return; }
    if (!createDescription.trim()) { toast.error("Description is required"); return; }
    try {
      const portalData = JSON.parse(sessionStorage.getItem("Erti-Portal"));
      const res = await portalInstance.post("/todo/create", {
        employeeId: portalData?._id,
        title: createTitle,
        description: createDescription,
        date: createDate,
      });
      if (res.data.success) {
        toast.success("Todo created successfully");
        setShowCreateModal(false);
        setCreateTitle("");
        setCreateDescription("");
        setCreateDate("");
        fetchTodos();
      }
    } catch (err) {
      console.error("Create Todo Error:", err);
      toast.error("Failed to create todo");
    }
  };

  /* ================= DELETE TODO ================= */
  const handleDelete = async () => {
    if (!todoToDeleteId) return;
    try {
      const res = await portalInstance.delete(`/todo/${todoToDeleteId}`);
      if (res.data.success) {
        toast.success("Todo deleted successfully");
        setShowDeleteModal(false);
        setTodoToDeleteId(null);
        fetchTodos(); // Refresh list
      }
    } catch (err) {
      console.error("Delete Todo Error:", err);
      toast.error("Failed to delete todo");
    }
  };

  /* ================= OPEN EDIT MODAL ================= */
  const handleEditClick = (todo) => {
    setSelectedTodo(todo);
    setShowViewModal(true);
  };


  const openUpdateModal = () => {
    if (!selectedTodo) return;

    setEditTitle(
      selectedTodo.title ||
      selectedTodo.description.split("\n")[0]
    );

    setEditDescription(
      selectedTodo.title
        ? selectedTodo.description
        : selectedTodo.description
          .split("\n")
          .slice(1)
          .join("\n")
    );

    setEditDate(
      selectedTodo.dueDate
        ? new Date(selectedTodo.dueDate)
          .toISOString()
          .split("T")[0]
        : ""
    );

    setEditStatus(selectedTodo.status || "pending");

    setShowViewModal(false);
    setShowEditModal(true);
  };


  /* ================= EFFECT ================= */
  useEffect(() => {
    const portalData = JSON.parse(sessionStorage.getItem("Erti-Portal"));
    setUserName(portalData?.name || "");
  }, []);

  useEffect(() => {
    if (dateType === "Custom" && (!fromDate || !toDate)) {
      return;
    }
    fetchTodos();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [dateType, status, fromDate, toDate]);

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dateDropdownRef.current &&
        !dateDropdownRef.current.contains(event.target)
      ) {
        setShowDateDropdown(false);
      }
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target)
      ) {
        setShowStatusDropdown(false);
      }
      if (
        editStatusRef.current &&
        !editStatusRef.current.contains(event.target)
      ) {
        setShowEditStatusDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ================= FORMAT DATE ================= */
  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <Sidebar />
      <style>
        {`
          .todo-modal-overlay .edit-modal-content {
            overflow: visible !important;
          }
        `}
      </style>

      <div className="common-todo-list">
        {/* HEADER */}
        <div className="todo-header">
          <div className="todo-left">
            <span className="todo-back" onClick={() => navigate(-1)}>
              <Icon icon="ep:arrow-left" className="me-1" /> Back
            </span>
          </div>


          <div className="todo-right">
            {/* DATE FILTER */}
            <div className="custom-dropdown-container" ref={dateDropdownRef}>
              <div
                className={`custom-dropdown-trigger ${showDateDropdown ? "open" : ""}`}
                onClick={() => setShowDateDropdown(!showDateDropdown)}
              >
                <span>{dateType}</span>
                <Icon
                  icon="mdi:chevron-down"
                  className={`dropdown-arrow-icon ${showDateDropdown ? "rotate" : ""}`}
                />
              </div>

              {showDateDropdown && (
                <div className="custom-dropdown-menu">
                  {[
                    "All Date Range",
                    "Today",
                    "Yesterday",
                    "This Week",
                    "This Month",
                    "Custom",
                  ].map((item) => (
                    <div
                      key={item}
                      className={`custom-dropdown-option ${dateType === item ? "selected" : ""}`}
                      onClick={() => {
                        setDateType(item);
                        setShowDateDropdown(false);
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ✅ CUSTOM DATE SELECTOR */}
            {dateType === "Custom" && (
              <div className="custom-date-selector">
                <div className="date-input-group">
                  <label>From:</label>
                  <div className="todo-date-field-wrapper filter-date-wrapper">
                    <input
                      ref={fromDateInputRef}
                      type="date"
                      className="todo-date-direct-input filter-date-input"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                    <img
                      src="/Calander.svg"
                      alt="calendar"
                      className="todo-calendar-icon-btn"
                      onClick={() => fromDateInputRef.current?.showPicker?.()}
                    />
                  </div>
                </div>
                <div className="date-input-group">
                  <label>To:</label>
                  <div className="todo-date-field-wrapper filter-date-wrapper">
                    <input
                      ref={toDateInputRef}
                      type="date"
                      className="todo-date-direct-input filter-date-input"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                    <img
                      src="/Calander.svg"
                      alt="calendar"
                      className="todo-calendar-icon-btn"
                      onClick={() => toDateInputRef.current?.showPicker?.()}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STATUS & PLUS GROUP */}
            <div className="todo-status-group">
              {/* STATUS FILTER */}
              <div className="status-filter-wrapper" ref={statusDropdownRef}>
                <div
                  className={`custom-dropdown-trigger ${showStatusDropdown ? "open" : ""}`}
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                >
                  <span>{status}</span>
                  <Icon
                    icon="mdi:chevron-down"
                    className={`dropdown-arrow-icon ${showStatusDropdown ? "rotate" : ""}`}
                  />
                </div>

                {showStatusDropdown && (
                  <div className="custom-dropdown-menu status-dropdown">
                    {["All", "Completed", "Pending", "On-Hold"].map((item) => (
                      <div
                        key={item}
                        className={`custom-dropdown-option ${status === item ? "selected" : ""}`}
                        onClick={() => {
                          setStatus(item);
                          setShowStatusDropdown(false);
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PLUS BUTTON */}
              <button
                className="todo-plus-btn"
                onClick={() => setShowCreateModal(true)}
                title="Create New Todo"
              >
                <Icon icon="mdi:plus" width={22} />
              </button>
            </div>
          </div>
        </div>

        {/* LIST */}
        <div className="todo-list">
          {loading ? (
            <div className="todo-loading-container">
              <div className="todo-spinner"></div>
              <p>Loading Todos...</p>
            </div>
          ) : getFilteredTodos().length === 0 ? (
            <p style={{ textAlign: "center" }}>No Todos List Found</p>
          ) : (
            getFilteredTodos().map((item, index) => (
              <div key={index} className="todo-card" onClick={() => handleEditClick(item)}>
                <div className="todo-content">
                  <h4>{item.title || item.description.split("\n")[0]}</h4>
                  <p>{item.title ? item.description : item.description.split("\n").slice(1).join("\n")}</p>
                  <span className="created">
                    Due Date: {formatDate(item.dueDate)}
                  </span>
                </div>

                <div className="todo-status">
                  <div
                    className="todo-delete-icon"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening edit modal
                      setTodoToDeleteId(item._id);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Icon icon="mingcute:delete-2-fill" />
                  </div>

                  <span
                    className={`status-badge ${item.status?.toLowerCase() === "completed"
                      ? "completed-badge"
                      : item.status?.toLowerCase() === "pending"
                        ? "pending-badge"
                        : item.status?.toLowerCase() === "on-hold"
                          ? "on-hold-badge"
                          : "pending-badge"
                      }`}
                  >
                    {item.status
                      ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
                      : "Pending"}
                  </span>

                  {item.status === "completed" && (
                    <div className="completed-on">
                      <span className="completed">
                        Completed: {formatDate(item.completedDate)}
                      </span>
                    </div>
                  )}

                </div>
              </div>
            ))
          )}
        </div>
      </div>

{showViewModal && selectedTodo && (
  <div className="todo-modal-overlay">
    <div
      className="todo-modal-content common-modal-content employee-view-popup"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="todo-modal-header employee-view-header">

        <div className="employee-view-title-area">
          <div className="todo-view-title">
            {selectedTodo.title}
          </div>
        </div>

        <button
          className="common-modal-close-x"
          onClick={() => setShowViewModal(false)}
        >
          ✕
        </button>

      </div>

      {/* Body */}
      <div className="todo-modal-body common-modal-body employee-view-body">

        <div className="todo-view-description">
          {selectedTodo.description}
        </div>

      </div>

      {/* Footer */}
      <div className="todo-modal-footer employee-view-footer">

        <div className="edit-modal-actions">

          <button
            className="common-modal-btn btn-small-cancel"
            onClick={() => setShowViewModal(false)}
          >
            Cancel
          </button>

          <button
            className="common-modal-btn btn-update"
            onClick={openUpdateModal}
          >
            Edit
          </button>

        </div>

      </div>
    </div>
  </div>
)}
      

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="todo-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="todo-modal-content common-modal-content todo-delete-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="todo-modal-header">
              <h3 className="common-modal-title">Confirm Delete</h3>
              <button className="common-modal-close-x" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="todo-modal-body common-modal-body">
              <p style={{ color: "#A29CC1" }}>Are you sure you want to delete this todo? This action cannot be undone.</p>
            </div>
            <div className="todo-modal-footer todo-delete-modal-footer">
              <div className="todo-delete-btn-group">
                <button className="todo-modal-btn btn-small-cancel common-modal-btn" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button className="todo-modal-btn btn-delete common-modal-btn" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ CREATE TODO MODAL */}
      {showCreateModal && (
        <div className="todo-modal-overlay">
          <div className="todo-modal-content edit-modal-content common-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="todo-modal-header">
              <h3 className="common-modal-title">Create To Do List</h3>
              <button className="common-modal-close-x" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <div className="todo-modal-body common-modal-body">
              <div className="todo-form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Enter title..."
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                />
              </div>
              <div className="todo-form-group">
                <label>Work Description</label>
                <textarea
                  placeholder="Enter your work..."
                  rows={4}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </div>
              <div className="todo-form-group">
                <label>Due Date</label>

                <div className="todo-date-field-wrapper">
                  <input
                    ref={createDateInputRef}
                    type="date"
                    className="todo-date-direct-input"
                    value={createDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setCreateDate(e.target.value)}
                  />

                  <img
                    src="/Calander.svg"
                    alt="calendar"
                    className="todo-calendar-icon-btn"
                    onClick={() => createDateInputRef.current?.showPicker?.()}
                  />
                </div>
              </div>
              <div className="todo-modal-footer" style={{ marginTop: "20px" }}>
                <div className="edit-modal-actions">
                  <button className="common-modal-btn btn-small-cancel" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button className="common-modal-btn btn-update" onClick={handleCreate}>
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ UPDATE TO DO MODAL */}
      {showEditModal && (
        <div className="todo-modal-overlay">
          <div className="todo-modal-content edit-modal-content common-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="todo-modal-header">
              <h3 className="common-modal-title">Update To Do List</h3>
              <button className="common-modal-close-x" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="todo-modal-body common-modal-body">
              <div className="todo-form-group">
                <label>Title</label>
                <input
                  type="text"
                  placeholder="HR-Portal Password Expiry"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div className="todo-form-group">
                <label>Work Description</label>
                <textarea
                  placeholder="Enter details..."
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="todo-form-row">
                <div className="todo-form-group">
                  <label>Due Date</label>

                  <div className="todo-date-field-wrapper">
                    <input
                      ref={editDateInputRef}
                      type="date"
                      className="todo-date-direct-input"
                      value={editDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setEditDate(e.target.value)}
                    />

                    <img
                      src="/Calander.svg"
                      alt="calendar"
                      className="todo-calendar-icon-btn"
                      onClick={() => editDateInputRef.current?.showPicker?.()}
                    />
                  </div>
                </div>
                <div className="todo-form-group" style={{ position: "relative", zIndex: showEditStatusDropdown ? 1000 : 1 }}>
                  <label>Status</label>
                  <div className="custom-dropdown-container status-dropdown-container" ref={editStatusRef}>
                    <div
                      className={`custom-dropdown-trigger ${showEditStatusDropdown ? "open" : ""}`}
                      onClick={() => setShowEditStatusDropdown(!showEditStatusDropdown)}
                      style={{
                        width: "100%",
                        height: "42px",
                        borderRadius: "10px",
                        border: "1px solid #E5E7EB",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer"
                      }}
                    >
                      <span style={{ fontSize: "14px", color: "#374151", fontWeight: "400" }}>
                        {editStatus.charAt(0).toUpperCase() + editStatus.slice(1)}
                      </span>
                      <Icon
                        icon="mdi:chevron-down"
                        className={`dropdown-arrow-icon ${showEditStatusDropdown ? "rotate" : ""}`}
                        style={{ width: "20px", height: "20px", color: "#374151" }}
                      />
                    </div>

                    {showEditStatusDropdown && (
                      <div className="custom-dropdown-menu" style={{ width: "100%", zIndex: 9999, position: "absolute" }}>
                        {["pending", "completed", "on-hold"].map((s) => (
                          <div
                            key={s}
                            className={`custom-dropdown-option ${editStatus.toLowerCase() === s ? "selected" : ""}`}
                            onClick={() => {
                              setEditStatus(s);
                              setShowEditStatusDropdown(false);
                            }}
                            style={{ fontSize: "14px", padding: "10px 14px" }}
                          >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="todo-modal-footer edit-modal-footer" style={{ marginTop: "20px" }}>
                <div className="edit-modal-actions">
                  <button className="todo-modal-btn btn-small-cancel common-modal-btn" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button className="todo-modal-btn btn-update common-modal-btn" onClick={handleUpdate}>
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
};

export default Todolist;