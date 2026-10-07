import React, { useState, useEffect, useMemo } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { portalInstance } from '../Services/instance';
import Sidebar from '../Components/HeaderSidebar/Sidebar';
import { GrFormPrevious, GrFormNext } from "react-icons/gr";
import CustomDropdown from '../Components/Common/CustomDropdown';
import '../Components/Employee/Pagination/Pagination.css';
import './PaymentScripts.css';

// ── Separate Pagination for Payment Scripts ─────────────────────────────────────
const ScriptsPagination = ({ totalItems, pageSize, currentPage, onPageChange }) => {
  const [pageGroupStart, setPageGroupStart] = useState(1);
  const maxPagesInGroup = 5;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    const groupIndex = Math.floor((currentPage - 1) / maxPagesInGroup);
    setPageGroupStart(groupIndex * maxPagesInGroup + 1);
  }, [currentPage]);

  if (totalItems <= 0) return null;

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages) onPageChange(page);
  };

  const handlePrevGroup = () => {
    const newStart = Math.max(1, pageGroupStart - maxPagesInGroup);
    setPageGroupStart(newStart);
    onPageChange(newStart);
  };

  const handleNextGroup = () => {
    const newStart = pageGroupStart + maxPagesInGroup;
    if (newStart <= totalPages) {
      setPageGroupStart(newStart);
      onPageChange(newStart);
    }
  };

  const pageNumbers = Array.from({ length: maxPagesInGroup }, (_, i) => pageGroupStart + i);

  return (
    <div className="d-flex justify-content-center align-items-center flex-wrap pagination-wrapper">
      <div className="pagination-container d-flex flex-wrap gap-2">
        <button
          className="btn btn-sm btn-outline-primary pagination-prev"
          onClick={handlePrevGroup}
          style={{ fontSize: "20px" }}
          disabled={pageGroupStart === 1}
        >
          <GrFormPrevious />
        </button>
        {pageNumbers.filter(page => page <= totalPages).map((page) => (
          <button
            key={page}
            className={`btn btn-sm mt-0 ${currentPage === page ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => handlePageClick(page)}
            style={{ fontSize: "0.8rem" }}
          >
            {page}
          </button>
        ))}
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={handleNextGroup}
          disabled={pageGroupStart + maxPagesInGroup > totalPages}
          style={{ fontSize: "20px" }}
        >
          <GrFormNext />
        </button>
      </div>
    </div>
  );
};

// ── Separate Pagination for Revision History ──────────────────────────────────
const RevisionPagination = ({ totalItems, pageSize, currentPage, onPageChange }) => {
  const [pageGroupStart, setPageGroupStart] = useState(1);
  const maxPagesInGroup = 5;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    const groupIndex = Math.floor((currentPage - 1) / maxPagesInGroup);
    setPageGroupStart(groupIndex * maxPagesInGroup + 1);
  }, [currentPage]);

  if (totalItems <= 0) return null;

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages) onPageChange(page);
  };

  const handlePrevGroup = () => {
    const newStart = Math.max(1, pageGroupStart - maxPagesInGroup);
    setPageGroupStart(newStart);
    onPageChange(newStart);
  };

  const handleNextGroup = () => {
    const newStart = pageGroupStart + maxPagesInGroup;
    if (newStart <= totalPages) {
      setPageGroupStart(newStart);
      onPageChange(newStart);
    }
  };

  const pageNumbers = Array.from({ length: maxPagesInGroup }, (_, i) => pageGroupStart + i);

  return (
    <div className="d-flex justify-content-center align-items-center flex-wrap pagination-wrapper">
      <div className="pagination-container d-flex flex-wrap gap-2">
        <button
          className="btn btn-sm btn-outline-primary pagination-prev"
          onClick={handlePrevGroup}
          style={{ fontSize: "20px" }}
          disabled={pageGroupStart === 1}
        >
          <GrFormPrevious />
        </button>
        {pageNumbers.filter(page => page <= totalPages).map((page) => (
          <button
            key={page}
            className={`btn btn-sm mt-0 ${currentPage === page ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => handlePageClick(page)}
            style={{ fontSize: "0.8rem" }}
          >
            {page}
          </button>
        ))}
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={handleNextGroup}
          disabled={pageGroupStart + maxPagesInGroup > totalPages}
          style={{ fontSize: "20px" }}
        >
          <GrFormNext />
        </button>
      </div>
    </div>
  );
};

// ── Custom Date Picker Component with Calendar Icon ─────────────────────────────
const CustomDatePicker = ({ value, onChange, className, style, ...props }) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <input
        type="date"
        className={className || "form-control"}
        value={value}
        onChange={onChange}
        style={{ width: '100%', ...style, paddingRight: '35px' }}
        {...props}
      />
      <img
        src="/Calander.svg"
        alt="calendar"
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '16px',
          height: '16px',
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
        onClick={(e) => {
          const inputEl = e.currentTarget.parentElement.querySelector('input');
          if (inputEl && typeof inputEl.showPicker === 'function') {
            inputEl.showPicker();
          }
        }}
      />
    </div>
  );
};

const PaymentScripts = () => {
  const loggedInUser = JSON.parse(sessionStorage.getItem("Erti-Portal"))?.name || '';
  const sessionUser = JSON.parse(sessionStorage.getItem("Erti-Portal")) || {};
  const userRole = sessionUser.role || 'employee';
  const userPermissions = sessionUser.permissions || [];
  const modulePermission = userRole === 'admin' ? 'WRITE' : (userPermissions.find(p => p.module === "Payment Script")?.permission || "NO_ACCESS");
  const isReadOnly = modulePermission === "READ";

  const [auditData, setAuditData] = useState({
    paymentScripts: [],
    revisionHistories: []
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Revision History state variables
  const [revPage, setRevPage] = useState(1);
  const [revPageSize, setRevPageSize] = useState(5);
  const [revFilterOpen, setRevFilterOpen] = useState(false);
  const [tempRevFilters, setTempRevFilters] = useState({
    changeDate: '',
    changeDescription: '',
    changeEffectiveDate: '',
    oldVersion: '',
    newVersion: '',
    changeDoneBy: '',
    changeReviewedAndApprovedBy: '',
    approvalStatus: ''
  });
  const [revFilters, setRevFilters] = useState({
    changeDate: '',
    changeDescription: '',
    changeEffectiveDate: '',
    oldVersion: '',
    newVersion: '',
    changeDoneBy: '',
    changeReviewedAndApprovedBy: '',
    approvalStatus: ''
  });

  const paginatedPaymentScripts = useMemo(() => {
    if (!auditData.paymentScripts) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return auditData.paymentScripts.slice(startIndex, startIndex + pageSize);
  }, [auditData.paymentScripts, currentPage, pageSize]);

  const filteredRevisions = useMemo(() => {
    if (!auditData.revisionHistories) return [];
    return auditData.revisionHistories.filter(rev => {
      if (revFilters.changeDate) {
        if (!rev.changeDate) return false;
        const dateStr = new Date(rev.changeDate).toISOString().split('T')[0];
        if (dateStr !== revFilters.changeDate) return false;
      }
      if (revFilters.changeDescription) {
        const descQuery = revFilters.changeDescription.toLowerCase().trim();
        if (!rev.changeDescription || !rev.changeDescription.toLowerCase().includes(descQuery)) return false;
      }
      if (revFilters.changeEffectiveDate) {
        if (!rev.changeEffectiveDate) return false;
        const dateStr = new Date(rev.changeEffectiveDate).toISOString().split('T')[0];
        if (dateStr !== revFilters.changeEffectiveDate) return false;
      }
      if (revFilters.oldVersion) {
        const verStr = revFilters.oldVersion.trim();
        if (!String(rev.oldVersion || '').includes(verStr)) return false;
      }
      if (revFilters.newVersion) {
        const verStr = revFilters.newVersion.trim();
        if (!String(rev.newVersion || '').includes(verStr)) return false;
      }
      if (revFilters.changeDoneBy) {
        const doneByQuery = revFilters.changeDoneBy.toLowerCase().trim();
        if (!rev.changeDoneBy || !rev.changeDoneBy.toLowerCase().includes(doneByQuery)) return false;
      }
      if (revFilters.changeReviewedAndApprovedBy) {
        const appByQuery = revFilters.changeReviewedAndApprovedBy.toLowerCase().trim();
        if (!rev.changeReviewedAndApprovedBy || !rev.changeReviewedAndApprovedBy.toLowerCase().includes(appByQuery)) return false;
      }
      if (revFilters.approvalStatus && rev.approvalStatus !== revFilters.approvalStatus) {
        return false;
      }
      return true;
    });
  }, [auditData.revisionHistories, revFilters]);

  const paginatedRevisions = useMemo(() => {
    const startIndex = (revPage - 1) * revPageSize;
    return filteredRevisions.slice(startIndex, startIndex + revPageSize);
  }, [filteredRevisions, revPage, revPageSize]);

  useEffect(() => {
    setRevPage(1);
  }, [revFilters, revPageSize]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await portalInstance.get('/menu-permission/approvers');
      if (res.data && res.data.data) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch approvers');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Assuming a similar API structure exists for payment scripts
      const res = await portalInstance.get('/api/audit/payment-scripts');
      if (res.data.success) {
        setAuditData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch payment scripts data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (type, id, status) => {
    try {
      if (type === 'script') {
        await portalInstance.put(`/api/audit/payment-scripts/status`, { id, status });
      } else if (type === 'revision') {
        // Fallback for revision history if there's an endpoint, else we reuse the same logic
        await portalInstance.put(`/api/audit/status`, { type, id, status });
      }
      toast.success(`${type} request ${status.toLowerCase()}`);
      fetchData();
    } catch (err) {
      toast.error(`Error updating status`);
    }
  };

  const handleDownload = async () => {
    try {
      const colsParam = selectedCols.map(c => c.key).join(',');
      const res = await portalInstance.get(`/api/audit/payment-scripts/download?cols=${colsParam}`, {
        responseType: 'blob',
      });
      const blob = res.data;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Authorized_Payment_Scripts_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download Excel file');
    }
  };

  // ----------------------------------------------------
  // Edit & Delete Modal State & Handlers
  // ----------------------------------------------------
  const [editModal, setEditModal] = useState({ isOpen: false, type: '' });
  const [editForm, setEditForm] = useState(null);
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null, tab: 'assets' });
  const [modalRevPage, setModalRevPage] = useState(1);
  const [modalRevPageSize, setModalRevPageSize] = useState(5);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: '', id: null });

  const [createModal, setCreateModal] = useState({ isOpen: false, type: '' });
  const openCreateModal = (type) => setCreateModal({ isOpen: true, type });
  const closeCreateModal = () => setCreateModal({ isOpen: false, type: '' });

  const openEditModal = (type, record, isView = false) => {
    setEditForm(record);
    setEditModal({ isOpen: true, type, isView });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, type: '' });
    setEditForm(null);
  };

  const handleEditSubmit = async (status) => {
    try {
      // Script CRUD goes to auditController (has notification support)
      // Revision history CRUD stays on paymentScriptsController (has real implementation)
      let url = '';
      if (editModal.type === 'script') url = '/api/audit/payment-scripts';
      else if (editModal.type === 'revision') url = '/api/payment-scripts/revision-history';

      await portalInstance.post(url, { ...editForm, approvalStatus: status, id: editForm._id });
      toast.success(`Record updated and ${status === 'Draft' ? 'saved as draft' : 'submitted for approval'}`);
      fetchData();
      closeEditModal();
    } catch (err) {
      toast.error('Error updating record');
    }
  };

  const openDeleteModal = (type, id) => setDeleteModal({ isOpen: true, type, id });
  const closeDeleteModal = () => setDeleteModal({ isOpen: false, type: '', id: null });

  const confirmDelete = async () => {
    const { type, id } = deleteModal;
    if (!id) return;
    try {
      let url = '';
      if (type === 'script') url = `/api/audit/payment-scripts/${id}`;
      else if (type === 'revision') url = `/api/payment-scripts/revision-history/${id}`;

      await portalInstance.delete(url);
      toast.success('Deleted successfully');
      fetchData();
    } catch (err) {
      toast.error('Error deleting record');
    } finally {
      closeDeleteModal();
    }
  };

  // ----------------------------------------------------
  // Payment Scripts Creation
  // ----------------------------------------------------
  const emptyScriptRow = () => ({
    scriptName: '', sourceDomain: '', purpose: '', authorizedBy: '',
    lastUpdatedDate: '', auditReviewDate: ''
  });
  const [scriptRows, setScriptRows] = useState([emptyScriptRow()]);

  const updateScriptRow = (index, field, value) => {
    setScriptRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    if (field === 'authorizedBy' && index === 0) {
      setDocInfoForm(prev => ({ ...prev, reviewedBy: value }));
    }
  };
  const addScriptRow = () => setScriptRows(prev => [...prev, emptyScriptRow()]);
  const removeScriptRow = (index) => setScriptRows(prev => prev.filter((_, i) => i !== index));

  const saveScripts = async (status) => {
    let currentReviewedBy = docInfoForm.reviewedBy;
    if (!currentReviewedBy && scriptRows[0]?.authorizedBy) {
      currentReviewedBy = scriptRows[0].authorizedBy;
      setDocInfoForm(prev => ({ ...prev, reviewedBy: scriptRows[0].authorizedBy }));
    }

    if (!currentReviewedBy) {
      return toast.warning('Please select a Reviewed By (Approver)');
    }
    if (currentReviewedBy === loggedInUser) {
      return toast.warning('The record creator cannot be selected as the Reviewed By (Approver). Please select a different approver.');
    }
    const validRows = scriptRows.filter(r => r.scriptName && r.sourceDomain);
    if (validRows.length === 0) return toast.warning('At least one row with Script Name and Source Domain is required');
    try {
      const meta = {
        approvalStatus: status,
        ...docInfoForm,
        reviewedBy: currentReviewedBy,
        author: loggedInUser,
        oldVersion: docInfoForm.currentVersion,
        newVersion: (parseInt(docInfoForm.currentVersion) || 0) + 1,
        // using the first row's dates/authors as reference for revision if needed
        changeDoneBy: loggedInUser,
        changeReviewedAndApprovedBy: currentReviewedBy,
      };
      if (validRows.length === 1) {
        await portalInstance.post('/api/audit/payment-scripts', { ...validRows[0], ...meta });
      } else {
        await portalInstance.post('/api/audit/payment-scripts', { records: validRows, ...meta });
      }
      toast.success(`Payment Scripts ${status === 'Draft' ? 'saved as draft' : 'submitted for approval'}`);
      fetchData();
      setScriptRows([emptyScriptRow()]);
      closeCreateModal();
    } catch (err) {
      toast.error('Error saving payment scripts');
    }
  };

  // ----------------------------------------------------
  // Document Info & Versioning
  // ----------------------------------------------------
  const [docInfoForm, setDocInfoForm] = useState({
    author: loggedInUser, 
    reviewedBy: '', 
    documentId: 'PCI-RR-001', 
    currentVersion: '0', 
    dateOfCurrentVersion: '', 
    documentType: 'Security Governance Document', 
    owner: 'IT Department'
  });

  // Owner dropdown options — user can add more via popup
  const [ownerOptions, setOwnerOptions] = useState(['IT Department', 'HR Department', 'Finance', 'Operations', 'Management']);
  const [ownerPopup, setOwnerPopup] = useState({ isOpen: false, value: '' });
  const openOwnerPopup = () => setOwnerPopup({ isOpen: true, value: '' });
  const closeOwnerPopup = () => setOwnerPopup({ isOpen: false, value: '' });
  const confirmOwnerValue = () => {
    const trimmed = ownerPopup.value.trim();
    if (!trimmed) return;
    if (!ownerOptions.includes(trimmed)) setOwnerOptions(prev => [...prev, trimmed]);
    setDocInfoForm(prev => ({ ...prev, owner: trimmed }));
    closeOwnerPopup();
  };

  // ── Filter Columns State & Handlers ─────────────────────────────
  const SCRIPT_DEFAULT_COLS = [
    { key: 'scriptName',      label: 'Script Name' },
    { key: 'sourceDomain',    label: 'Source Domain' },
    { key: 'purpose',         label: 'Purpose' },
    { key: 'authorizedBy',    label: 'Authorized By' },
    { key: 'lastUpdatedDate', label: 'Last Updated Date' },
    { key: 'auditReviewDate', label: 'Audit Review Date' },
    { key: 'status',          label: 'Status' },
    { key: '__approval__',    label: 'Approval' },
    { key: '__actions__',     label: 'Actions' },
  ];

  const [filterOpen, setFilterOpen]   = useState(false);
  const [selectedCols, setSelectedCols]   = useState([...SCRIPT_DEFAULT_COLS]);
  const [availableCols, setAvailableCols] = useState([]);

  useEffect(() => {
    setSelectedCols(prevSelected => {
      const currentSelectedKeys = new Set(prevSelected.map(c => c.key));
      setAvailableCols(SCRIPT_DEFAULT_COLS.filter(col => !currentSelectedKeys.has(col.key)));
      return prevSelected;
    });
  }, []);

  const handleDragStart = (e, col, sourcePanel, index) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ col, sourcePanel, index }));
  };

  const handleDrop = (e, targetPanel) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { col, sourcePanel } = JSON.parse(dataStr);
      if (sourcePanel === targetPanel) return;

      moveColumn(col, sourcePanel);
    } catch (err) {
      console.error('Drop failed', err);
    }
  };

  const handleDropItem = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { col, sourcePanel, index: sourceIndex } = JSON.parse(dataStr);

      if (sourcePanel === 'selected') {
        const updated = [...selectedCols];
        updated.splice(sourceIndex, 1);
        updated.splice(targetIndex, 0, col);
        setSelectedCols(updated);
      } else {
        setAvailableCols(prev => prev.filter(c => c.key !== col.key));
        const updated = [...selectedCols];
        updated.splice(targetIndex, 0, col);
        setSelectedCols(updated);
      }
    } catch (err) {
      console.error('Drop item failed', err);
    }
  };

  const moveColumn = (col, sourcePanel) => {
    if (sourcePanel === 'available') {
      setAvailableCols(prev => prev.filter(c => c.key !== col.key));
      setSelectedCols(prev => [...prev, col]);
    } else {
      setSelectedCols(prev => prev.filter(c => c.key !== col.key));
      setAvailableCols(prev => [...prev, col]);
    }
  };

  const moveColumnOrder = (e, index, direction) => {
    e.stopPropagation();
    const updated = [...selectedCols];
    if (direction === 'up' && index > 0) {
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
    } else if (direction === 'down' && index < updated.length - 1) {
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
    }
    setSelectedCols(updated);
  };

  const [draggedColIndex, setDraggedColIndex] = useState(null);

  const handleHeaderDragStart = (e, index) => {
    const col = selectedCols[index];
    if (col.key === '__actions__' || col.key === '__approval__') {
      e.preventDefault();
      return;
    }
    setDraggedColIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleHeaderDragOver = (e, index) => {
    e.preventDefault();
  };

  const handleHeaderDrop = (e, targetIndex) => {
    if (draggedColIndex === null || draggedColIndex === targetIndex) return;

    const cols = [...selectedCols];
    const draggedCol = cols[draggedColIndex];
    if (draggedCol.key === '__actions__' || draggedCol.key === '__approval__') return;
    const targetCol = cols[targetIndex];
    if (targetCol.key === '__actions__' || targetCol.key === '__approval__') return;

    const [movedCol] = cols.splice(draggedColIndex, 1);
    cols.splice(targetIndex, 0, movedCol);

    setSelectedCols(cols);
  };

  const handleHeaderDragEnd = () => {
    setDraggedColIndex(null);
  };

  useEffect(() => {
    const version = auditData.revisionHistories ? auditData.revisionHistories.length.toString() : '0';
    const latestRevision = auditData.revisionHistories && auditData.revisionHistories.length > 0 ? auditData.revisionHistories[auditData.revisionHistories.length - 1] : null;
    
    setDocInfoForm(prev => ({ 
      ...prev, 
      currentVersion: version,
      dateOfCurrentVersion: latestRevision && latestRevision.changeEffectiveDate ? new Date(latestRevision.changeEffectiveDate).toISOString().split('T')[0] : prev.dateOfCurrentVersion
    }));
  }, [auditData.revisionHistories]);

  return (
    <>
      <Sidebar />
      <div className="audit-mgmt-container">
        <div className="audit-mgmt-header">
          <h2>Authorized Payment Scripts Management</h2>
          <button className="btn btn-primary" onClick={handleDownload}>
            <i className="bi bi-download"></i> Download Excel
          </button>
        </div>

        <div className="audit-tab-content mt-4">
          {/* Document Information */}
          <div className="card audit-card document-info-card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center" style={{ flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center' }}>
              <h5>Document Information</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-6 col-xl-4">
                  <label>Author <span style={{color:'red'}}>*</span></label>
                  <input type="text" className="form-control" value={loggedInUser} disabled placeholder="Enter Author Name" />
                </div>
                <div className="col-12 col-md-6 col-xl-4">
                  <label>Reviewed By (Approver) <span style={{color:'red'}}>*</span></label>
                  <CustomDropdown
                    options={employees.map(emp => ({ value: emp.name, label: `${emp.name} (${emp.department || emp.role})` }))}
                    value={docInfoForm.reviewedBy}
                    onChange={val => setDocInfoForm({ ...docInfoForm, reviewedBy: val })}
                    placeholder="Select Approver"
                  />
                </div>
                <div className="col-12 col-md-6 col-xl-4">
                  <label>Document ID</label>
                  <input type="text" className="form-control" value={docInfoForm.documentId} onChange={e => setDocInfoForm({...docInfoForm, documentId: e.target.value})} />
                </div>
                <div className="col-6 col-md-6 col-xl-3">
                  <label>Current Version</label>
                  <input type="text" className="form-control" value={docInfoForm.currentVersion} onChange={e => setDocInfoForm({...docInfoForm, currentVersion: e.target.value})} />
                </div>
                <div className="col-6 col-md-6 col-xl-3">
                  <label>Date of Current Version</label>
                  <CustomDatePicker className="form-control" value={docInfoForm.dateOfCurrentVersion} onChange={e => setDocInfoForm({...docInfoForm, dateOfCurrentVersion: e.target.value})} />
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <label>Document Type</label>
                  <input type="text" className="form-control" value={docInfoForm.documentType} onChange={e => setDocInfoForm({...docInfoForm, documentType: e.target.value})} />
                </div>
                <div className="col-12 col-md-6 col-xl-3">
                  <label>Owner</label>
                  <CustomDropdown
                    options={[
                      ...ownerOptions.map(opt => ({ value: opt, label: opt })),
                      { value: '__add_new__', label: '➕ Add your own value...' }
                    ]}
                    value={docInfoForm.owner}
                    onChange={val => {
                      if (val === '__add_new__') {
                        openOwnerPopup();
                      } else {
                        setDocInfoForm({ ...docInfoForm, owner: val });
                      }
                    }}
                    placeholder="Select Owner"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Generated Revision History */}
          <div className="card audit-card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5>Revision History</h5>
              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  
                  <CustomDropdown
                    options={[5, 10, 20, 50, 100].map(size => ({ value: size, label: `${size}` }))}
                    value={revPageSize}
                    onChange={(val) => {
                      setRevPageSize(val);
                      setRevPage(1);
                    }}
                    placeholder={String(revPageSize)}
                    style={{ width: "80px" }}
                  />
                </div>
                <img
                  src="/Filter.svg"
                  alt="Filter"
                  title="Filter Revisions"
                  style={{ width: 25, height: 25, opacity: 1, cursor: 'pointer' }}
                  onClick={() => setRevFilterOpen(!revFilterOpen)}
                />
              </div>
            </div>
            <div className="card-body">
              {revFilterOpen && (
                <div className="audit-filter-panel mb-3">
                  <div className="audit-filter-grid">
                    <div className="audit-filter-field">
                      <label className="audit-filter-label">Change Date</label>
                      <CustomDatePicker
                        className="audit-filter-input"
                        value={tempRevFilters.changeDate}
                        onChange={(e) => setTempRevFilters(prev => ({ ...prev, changeDate: e.target.value }))}
                        placeholder="Select Date"
                      />
                    </div>
                    <div className="audit-filter-field">
                      <label className="audit-filter-label">Effective Date</label>
                      <CustomDatePicker
                        className="audit-filter-input"
                        value={tempRevFilters.changeEffectiveDate}
                        onChange={(e) => setTempRevFilters(prev => ({ ...prev, changeEffectiveDate: e.target.value }))}
                        placeholder="Select Date"
                      />
                    </div>
                    <div className="audit-filter-field">
                      <label className="audit-filter-label">Done By</label>
                      <input
                        type="text"
                        className="audit-filter-input"
                        placeholder="Search name..."
                        value={tempRevFilters.changeDoneBy}
                        onChange={(e) => setTempRevFilters(prev => ({ ...prev, changeDoneBy: e.target.value }))}
                      />
                    </div>
                    <div className="audit-filter-field">
                      <label className="audit-filter-label">Approved By</label>
                      <input
                        type="text"
                        className="audit-filter-input"
                        placeholder="Search name..."
                        value={tempRevFilters.changeReviewedAndApprovedBy}
                        onChange={(e) => setTempRevFilters(prev => ({ ...prev, changeReviewedAndApprovedBy: e.target.value }))}
                      />
                    </div>
                    <div className="audit-filter-field">
                      <label className="audit-filter-label">Old Version</label>
                      <input
                        type="text"
                        className="audit-filter-input"
                        placeholder="e.g. 1"
                        value={tempRevFilters.oldVersion}
                        onChange={(e) => setTempRevFilters(prev => ({ ...prev, oldVersion: e.target.value }))}
                      />
                    </div>
                    <div className="audit-filter-field">
                      <label className="audit-filter-label">New Version</label>
                      <input
                        type="text"
                        className="audit-filter-input"
                        placeholder="e.g. 2"
                        value={tempRevFilters.newVersion}
                        onChange={(e) => setTempRevFilters(prev => ({ ...prev, newVersion: e.target.value }))}
                      />
                    </div>
                    <div className="audit-filter-field">
                      <label className="audit-filter-label">Approval Status</label>
                      <CustomDropdown
                        options={[
                          { value: '', label: 'All Status' },
                          { value: 'Approved', label: 'Approved' },
                          { value: 'Rejected', label: 'Rejected' },
                          { value: 'Pending', label: 'Pending' }
                        ]}
                        value={tempRevFilters.approvalStatus}
                        onChange={(val) => setTempRevFilters(prev => ({ ...prev, approvalStatus: val }))}
                        placeholder="All Status"
                      />
                    </div>
                    <div className="audit-filter-field">
                      <label className="audit-filter-label">Description</label>
                      <input
                        type="text"
                        className="audit-filter-input"
                        placeholder="Search description..."
                        value={tempRevFilters.changeDescription}
                        onChange={(e) => setTempRevFilters(prev => ({ ...prev, changeDescription: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="audit-filter-actions">

                    <button
                      type="button"
                      className="common-modal-btn btn-small-cancel"
                      onClick={() => {
                        setRevFilterOpen(false);
                        setTempRevFilters({ ...revFilters });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="common-modal-btn btn-update"
                      onClick={() => {
                        setRevFilters({ ...tempRevFilters });
                        setRevFilterOpen(false);
                      }}
                    >
                      Search
                    </button>
                  </div>
                </div>
              )}
              {Object.values(revFilters).some(Boolean) && (
                <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded" style={{ border: '1px solid #e5e7ef' }}>
                  <span style={{ fontSize: '0.8rem', color: '#555' }}>
                    Active filters applied.
                  </span>
                  <button
                    className="btn btn-sm btn-link text-decoration-none py-0"
                    onClick={() => {
                      const empty = {
                        changeDate: '',
                        changeDescription: '',
                        changeEffectiveDate: '',
                        oldVersion: '',
                        newVersion: '',
                        changeDoneBy: '',
                        changeReviewedAndApprovedBy: '',
                        approvalStatus: ''
                      };
                      setRevFilters(empty);
                      setTempRevFilters(empty);
                    }}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              <div className="audit-maker-tableCard">
                <div className="table-responsive">
                  <div className="audit-maker-table audit-maker-table--revision">
                    <div className="audit-maker-tableHeader audit-maker-tableHeader--payment-revision">
                      <div>Change Date</div>
                      <div>Description</div>
                      <div>Effective Date</div>
                      <div>Old Ver</div>
                      <div>New Ver</div>
                      <div>Done By</div>
                      <div>Approved By</div>
                      <div>Approval</div>
                    </div>

                    {paginatedRevisions && paginatedRevisions.length > 0 ? (
                      paginatedRevisions.map((rev) => (
                        <div key={rev._id} className="audit-maker-tableRow audit-maker-tableRow--payment-revision">
                          <div>{rev.changeDate ? new Date(rev.changeDate).toLocaleDateString() : ''}</div>
                          <div>{rev.changeDescription}</div>
                          <div>{rev.changeEffectiveDate ? new Date(rev.changeEffectiveDate).toLocaleDateString() : ''}</div>
                          <div>{rev.oldVersion || '0'}</div>
                          <div>{rev.newVersion || '1'}</div>
                          <div>{rev.changeDoneBy}</div>
                          <div>{rev.changeReviewedAndApprovedBy}</div>
                          <div>
                            <span className={`badge bg-${rev.approvalStatus === 'Approved' ? 'success' : rev.approvalStatus === 'Rejected' ? 'danger' : 'warning'}`}>{rev.approvalStatus}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="audit-maker-tableEmpty">No revision history found</div>
                    )}
                  </div>
                </div>
              </div>
              {filteredRevisions && filteredRevisions.length > 0 && (
                <RevisionPagination
                  totalItems={filteredRevisions.length}
                  pageSize={revPageSize}
                  currentPage={revPage}
                  onPageChange={(p) => setRevPage(p)}
                />
              )}
            </div>
          </div>
          {/* Authorized Payment Scripts Section */}
          <div className="card audit-card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <h5>Authorized Payment Scripts</h5>
              </div>
              <div className="d-flex align-items-center gap-3">
                <img
                  src="/Filter.svg"
                  alt="Filter"
                  title="Configure Columns"
                  style={{ width: 25, height: 25, opacity: 1, cursor: 'pointer' }}
                  onClick={() => setFilterOpen(true)}
                />
                <div className="d-flex align-items-center gap-2">
                  
                  <CustomDropdown
                    options={[5, 10, 20, 50, 100].map(size => ({ value: size, label: `${size}` }))}
                    value={pageSize}
                    onChange={(val) => {
                      setPageSize(val);
                      setCurrentPage(1);
                    }}
                    className="audit-page-size-dropdown"
                  />
                </div>
                {!isReadOnly && <button className="btn btn-sm btn-primary" onClick={() => openCreateModal('script')}>Create Record</button>}
              </div>
            </div>
            <div className="card-body">
              <div className="audit-maker-tableCard">
                <div className="table-responsive">
                  <div className="audit-maker-table audit-maker-table--payment-scripts">
                    <div
                      className="audit-maker-tableHeader"
                      style={{
                        gridTemplateColumns: selectedCols.map(col => col.key === '__actions__' ? '200px' : col.key === '__approval__' ? '100px' : '1fr').join(' ')
                      }}
                    >
                      {selectedCols.map((col, index) => {
                        const isDraggable = col.key !== '__actions__' && col.key !== '__approval__';
                        return (
                          <div
                            key={col.key}
                            draggable={isDraggable}
                            onDragStart={(e) => handleHeaderDragStart(e, index)}
                            onDragOver={(e) => handleHeaderDragOver(e, index)}
                            onDrop={(e) => handleHeaderDrop(e, index)}
                            onDragEnd={handleHeaderDragEnd}
                            style={{
                              cursor: isDraggable ? 'grab' : 'default',
                              userSelect: 'none',
                              textAlign: col.key === '__actions__' ? 'center' : 'left'
                            }}
                            className={isDraggable ? "draggable-header-col" : ""}
                            title={isDraggable ? "Drag to reorder column" : ""}
                          >
                            {col.label}
                          </div>
                        );
                      })}
                    </div>

                    {paginatedPaymentScripts && paginatedPaymentScripts.length > 0 ? (
                      paginatedPaymentScripts.map((script) => (
                        <div key={script._id}
                          className="audit-maker-tableRow"
                          style={{
                            gridTemplateColumns: selectedCols.map(col => col.key === '__actions__' ? '200px' : col.key === '__approval__' ? '100px' : '1fr').join(' ')
                          }}
                        >
                          {selectedCols.map(col => {
                            if (col.key === 'scriptName') return <div key={col.key}>{script.scriptName}</div>;
                            if (col.key === 'sourceDomain') return <div key={col.key}>{script.sourceDomain}</div>;
                            if (col.key === 'purpose') return <div key={col.key}>{script.purpose}</div>;
                            if (col.key === 'authorizedBy') return <div key={col.key}>{script.authorizedBy}</div>;
                            if (col.key === 'lastUpdatedDate') return <div key={col.key}>{script.lastUpdatedDate ? new Date(script.lastUpdatedDate).toLocaleDateString() : ''}</div>;
                            if (col.key === 'auditReviewDate') return <div key={col.key}>{script.auditReviewDate ? new Date(script.auditReviewDate).toLocaleDateString() : ''}</div>;
                            if (col.key === 'status') return <div key={col.key}>{script.status || 'Active'}</div>;
                            if (col.key === '__approval__') return (
                              <div key={col.key}>
                                <span className={`badge bg-${script.approvalStatus === 'Approved' ? 'success' : script.approvalStatus === 'Rejected' ? 'danger' : 'warning'}`}>{script.approvalStatus}</span>
                              </div>
                            );
                            if (col.key === '__actions__') return (
                              <div key={col.key}>
                                <div className="d-flex gap-2">
                                  {isReadOnly ? (
                                    <button className="btn btn-sm btn-info text-white" onClick={() => setViewModal({ isOpen: true, data: { ...script, __type: 'script' }, tab: 'assets' })}>View</button>
                                  ) : (
                                    <>
                                      <button className="btn btn-sm btn-info text-white" onClick={() => setViewModal({ isOpen: true, data: { ...script, __type: 'script' }, tab: 'assets' })}>View</button>
                                      <button className="btn btn-sm btn-primary" onClick={() => openEditModal('script', script)}>Edit</button>
                                      <button className="btn btn-sm btn-danger" onClick={() => openDeleteModal('script', script._id)}>Delete</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                            return <div key={col.key}>{script[col.key]}</div>;
                          })}
                        </div>
                      ))
                    ) : (
                      <div className="audit-maker-tableEmpty">No payment scripts found</div>
                    )}
                  </div>
                </div>
              </div>
              {auditData.paymentScripts && auditData.paymentScripts.length > 0 && (
                <ScriptsPagination
                  totalItems={auditData.paymentScripts.length}
                  pageSize={pageSize}
                  currentPage={currentPage}
                  onPageChange={(p) => setCurrentPage(p)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal for Scripts */}
      {editModal.isOpen && editModal.type === 'script' && editForm && (
        <div className="modal show d-block modal-overflow-visible" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title">Edit Payment Script</h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <div className="modal-body document-info-card" style={{ overflow: 'visible' }}>
                <div className="border rounded p-3" style={{ background: '#f9f9fb' }}>
                  <div className="row g-2">
                    <div className="col-md-6">
                      <label>Script Name <span style={{ color: 'red' }}>*</span></label>
                      <input 
                        className="form-control" 
                        value={editForm.scriptName} 
                        onChange={e => setEditForm({ ...editForm, scriptName: e.target.value })} 
                        placeholder="e.g., Worldline PG" 
                        disabled={editModal.isView} 
                      />
                    </div>
                    <div className="col-md-6">
                      <label>Source Domain <span style={{ color: 'red' }}>*</span></label>
                      <input 
                        className="form-control" 
                        value={editForm.sourceDomain} 
                        onChange={e => setEditForm({ ...editForm, sourceDomain: e.target.value })} 
                        placeholder="e.g., paynimo.com" 
                        disabled={editModal.isView} 
                      />
                    </div>
                    <div className="col-md-12">
                      <label>Purpose</label>
                      <input 
                        className="form-control" 
                        value={editForm.purpose || ''} 
                        onChange={e => setEditForm({ ...editForm, purpose: e.target.value })} 
                        placeholder="e.g., Handles payment form submission" 
                        disabled={editModal.isView} 
                      />
                    </div>
                    <div className="col-12 col-lg-4">
                      <label>Authorized By</label>
                      <CustomDropdown
                        options={employees.filter(emp => emp.name !== loggedInUser).map(emp => ({ value: emp.name, label: emp.name }))}
                        value={editForm.authorizedBy}
                        onChange={val => setEditForm({ ...editForm, authorizedBy: val })}
                        placeholder="Select Authorizer"
                        disabled={editModal.isView}
                      />
                    </div>
                    <div className="col-12 col-lg-4">
                      <label>Last Updated Date</label>
                      <CustomDatePicker 
                        className="form-control" 
                        value={editForm.lastUpdatedDate ? editForm.lastUpdatedDate.split('T')[0] : ''} 
                        onChange={e => setEditForm({ ...editForm, lastUpdatedDate: e.target.value })} 
                        disabled={editModal.isView} 
                      />
                    </div>
                    <div className="col-12 col-lg-4">
                      <label>Audit Review Date</label>
                      <CustomDatePicker 
                        className="form-control" 
                        value={editForm.auditReviewDate ? editForm.auditReviewDate.split('T')[0] : ''} 
                        onChange={e => setEditForm({ ...editForm, auditReviewDate: e.target.value })} 
                        disabled={editModal.isView} 
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-0">
                {editModal.isView ? (
                  <button className="btn btn-secondary" onClick={closeEditModal}>Close</button>
                ) : (
                  <div className="edit-modal-actions d-flex gap-2">
                    <button className="common-modal-btn btn-small-cancel" onClick={() => handleEditSubmit('Draft')}>Draft</button>
                    <button className="common-modal-btn btn-update" onClick={() => handleEditSubmit('Pending')}>Submit</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={closeDeleteModal}></button>
              </div>
              <div className="modal-body text-center">
                <p className="mb-0">Are you sure you want to delete this record?</p>
              </div>
              <div className="d-flex justify-content-center gap-3 p-3 pt-0 border-0">
                <button className="btn btn-small-cancel" style={{ minWidth: '100px' }} onClick={closeDeleteModal}>Cancel</button>
                <button className="btn btn-danger" style={{ minWidth: '100px' }} onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal for Scripts */}
      {createModal.isOpen && createModal.type === 'script' && (
        <div className="modal show d-block modal-overflow-visible" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title">Create Payment Script Record</h5>
                <button type="button" className="btn-close" onClick={() => { closeCreateModal(); setScriptRows([emptyScriptRow()]); }}></button>
              </div>
              <div className="modal-body document-info-card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {scriptRows.map((row, index) => (
                  <div key={index} className="border rounded p-3 mb-3" style={{ background: '#f9f9fb', position: 'relative' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong style={{ fontSize: '0.9rem', color: '#555' }}>Row {index + 1}</strong>
                      {scriptRows.length > 1 && (
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => removeScriptRow(index)}>✕ Remove</button>
                      )}
                    </div>
                    <div className="row g-2">
                      <div className="col-md-6"><label>Script Name <span style={{color:'red'}}>*</span></label><input className="form-control" value={row.scriptName} onChange={e => updateScriptRow(index, 'scriptName', e.target.value)} placeholder="e.g., Worldline PG" /></div>
                      <div className="col-md-6"><label>Source Domain <span style={{color:'red'}}>*</span></label><input className="form-control" value={row.sourceDomain} onChange={e => updateScriptRow(index, 'sourceDomain', e.target.value)} placeholder="e.g., paynimo.com" /></div>
                      <div className="col-md-12"><label>Purpose</label><input className="form-control" value={row.purpose} onChange={e => updateScriptRow(index, 'purpose', e.target.value)} placeholder="e.g., Handles payment form submission" /></div>
                      <div className="col-12 col-lg-4">
                        <label>Authorized By</label>
                        <CustomDropdown
                          options={employees.filter(emp => emp.name !== loggedInUser).map(emp => ({ value: emp.name, label: emp.name }))}
                          value={row.authorizedBy}
                          onChange={val => updateScriptRow(index, 'authorizedBy', val)}
                          placeholder="Select Authorizer"
                        />
                      </div>
                      <div className="col-12 col-lg-4"><label>Last Updated Date</label><CustomDatePicker className="form-control" value={row.lastUpdatedDate ? row.lastUpdatedDate.split('T')[0] : ''} onChange={e => updateScriptRow(index, 'lastUpdatedDate', e.target.value)} /></div>
                      <div className="col-12 col-lg-4"><label>Audit Review Date</label><CustomDatePicker className="form-control" value={row.auditReviewDate ? row.auditReviewDate.split('T')[0] : ''} onChange={e => updateScriptRow(index, 'auditReviewDate', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-outline-primary w-100" onClick={addScriptRow}>
                  + Add Another Row
                </button>
                {/* <div style={{ height: '200px' }}></div> */}
              </div>
              <div className="d-flex justify-content-between align-items-center gap-3 p-3 pt-2 border-0">
                <span style={{ fontSize: '0.85rem', color: '#888' }}>{scriptRows.length} row(s) — {scriptRows.length > 1 ? 'ONE revision history entry will be created for all rows' : 'One revision history entry will be created'}</span>
                <div className="d-flex gap-2">
                  <button className="common-modal-btn btn-small-cancel" onClick={() => saveScripts('Draft')}>Draft</button>
                  <button className="common-modal-btn btn-update" onClick={() => saveScripts('Pending')}>Submit</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Owner Add-Value Popup ── */}
      {ownerPopup.isOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 360 }}>
            <div className="modal-content" style={{ borderRadius: 10, boxShadow: '0 6px 28px rgba(0,0,0,0.16)' }}>
              <div className="modal-header" style={{ padding: '12px 18px', borderBottom: '1px solid #eee' }}>
                <h6 className="modal-title" style={{ fontWeight: 700, color: '#333', margin: 0 }}>Add Owner Value</h6>
                <button type="button" className="btn-close" onClick={closeOwnerPopup}></button>
              </div>
              <div className="modal-body" style={{ padding: '18px' }}>
                <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#444', marginBottom: 6, display: 'block' }}>New Owner Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Legal, Security Team..."
                  value={ownerPopup.value}
                  autoFocus
                  onChange={e => setOwnerPopup(prev => ({ ...prev, value: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && confirmOwnerValue()}
                />
              </div>
              <div className="modal-footer" style={{ padding: '10px 18px', borderTop: '1px solid #eee', gap: 8 }}>
                <button type="button" className="btn btn-sm btn-secondary" style={{ minWidth: 80 }} onClick={closeOwnerPopup}>Cancel</button>
                <button type="button" className="btn btn-sm btn-primary" style={{ minWidth: 100 }} onClick={confirmOwnerValue}>Add Value</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Columns Modal ── */}
      {filterOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1080 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
              <div className="modal-header" style={{ padding: '14px 20px', borderBottom: '1px solid #eee' }}>
                <h6 className="modal-title" style={{ fontWeight: 500, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src="/Filter.svg" alt="Filter" style={{ width: 25, height: 25 }} /> Configure Visible Columns
                </h6>
                <button type="button" className="btn-close" onClick={() => setFilterOpen(false)}></button>
              </div>
              <div className="modal-body" style={{ padding: '20px' }}>
                <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: 15 }}>
                  Drag and drop columns between panels to show or hide them in the table, or click to move.
                </p>

                <div className="row g-3">
                  {/* Left panel: Selected Fields */}
                  <div className="col-md-6">
                    <div style={{ border: '1px solid #dee2e6', borderRadius: 8, background: '#f8f9fa', padding: 12, height: 350, display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#2c3e50', marginBottom: 10, display: 'block' }}>
                        Selected Fields (Visible)
                      </strong>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, 'selected')}
                        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}
                      >
                        {selectedCols.map((col, idx) => (
                          <div
                            key={col.key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, col, 'selected', idx)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropItem(e, idx)}
                            style={{
                              padding: '6px 12px',
                              background: '#fff',
                              border: '1px solid #dcdde1',
                              borderRadius: 6,
                              fontSize: '0.8rem',
                              cursor: 'grab',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>☰ &nbsp; {col.label}</span>
                            <div className="d-flex align-items-center gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-light p-0"
                                style={{ width: 18, height: 18, fontSize: '0.62rem', border: '1px solid #ddd', lineHeight: 1 }}
                                disabled={idx === 0}
                                onClick={(e) => moveColumnOrder(e, idx, 'up')}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-light p-0"
                                style={{ width: 18, height: 18, fontSize: '0.62rem', border: '1px solid #ddd', lineHeight: 1 }}
                                disabled={idx === selectedCols.length - 1}
                                onClick={(e) => moveColumnOrder(e, idx, 'down')}
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger p-0"
                                style={{ width: 18, height: 18, fontSize: '0.65rem', marginLeft: 4, lineHeight: 1 }}
                                onClick={(e) => { e.stopPropagation(); moveColumn(col, 'selected'); }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                        {selectedCols.length === 0 && (
                          <div style={{ margin: 'auto', fontSize: '0.78rem', color: '#999', textAlign: 'center' }}>
                            Drag columns here to show them in the table
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right panel: Available Fields */}
                  <div className="col-md-6">
                    <div style={{ border: '1px solid #dee2e6', borderRadius: 8, background: '#f8f9fa', padding: 12, height: 350, display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#2c3e50', marginBottom: 10, display: 'block' }}>
                        Available Fields (Hidden)
                      </strong>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, 'available')}
                        style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}
                      >
                        {availableCols.map((col, idx) => (
                          <div
                            key={col.key}
                            draggable
                            onDragStart={(e) => handleDragStart(e, col, 'available', idx)}
                            style={{
                              padding: '6px 12px',
                              background: '#fff',
                              border: '1px solid #dcdde1',
                              borderRadius: 6,
                              fontSize: '0.8rem',
                              cursor: 'grab',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>{col.label}</span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success p-0"
                              style={{ width: 18, height: 18, fontSize: '0.75rem', lineHeight: 1 }}
                              onClick={(e) => { e.stopPropagation(); moveColumn(col, 'available'); }}
                            >
                              +
                            </button>
                          </div>
                        ))}
                        {availableCols.length === 0 && (
                          <div style={{ margin: 'auto', fontSize: '0.78rem', color: '#999', textAlign: 'center' }}>
                            All columns are visible
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer column-filter-footer">
                <button type="button" className="btn btn-update" onClick={() => setFilterOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
       {viewModal.isOpen && viewModal.data && (() => {
        // Compute modal paginated revisions
        const modalRevisions = auditData.revisionHistories || [];
        const modalRevTotalPages = Math.max(1, Math.ceil(modalRevisions.length / modalRevPageSize));
        const modalRevStart = (modalRevPage - 1) * modalRevPageSize;
        const modalPaginatedRevisions = modalRevisions.slice(modalRevStart, modalRevStart + modalRevPageSize);

        return (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered view-detail-modal">
              <div className="modal-content" style={{ borderRadius: '10px', overflow: 'hidden' }}>
                <div className="modal-header" style={{ borderBottom: '1px solid #e9ecef', padding: '14px 20px' }}>
                  <h5 className="modal-title" style={{ fontSize: '1rem', fontWeight: 600 }}>Record Details</h5>
                  <button type="button" className="btn-close" onClick={() => { setViewModal({ isOpen: false, data: null, tab: 'assets' }); setModalRevPage(1); }}></button>
                </div>

                {/* Tab nav */}
                <div style={{ padding: '0 20px', borderBottom: '1px solid #e9ecef', background: '#fff' }}>
                  <ul className="nav nav-tabs audit-tabs border-0 mb-0">
                    <li className="nav-item">
                      <button className={`nav-link ${viewModal.tab === 'assets' ? 'active' : ''}`} onClick={() => setViewModal({ ...viewModal, tab: 'assets' })}>Assets</button>
                    </li>
                    <li className="nav-item">
                      <button className={`nav-link ${viewModal.tab === 'changes' ? 'active' : ''}`} onClick={() => { setViewModal({ ...viewModal, tab: 'changes' }); setModalRevPage(1); }}>Changes &amp; Review</button>
                    </li>
                  </ul>
                </div>

                {/* Scrollable body */}
                <div className="modal-body view-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '20px', background: '#f8f9fa' }}>

                  {/* ── Assets Tab ── */}
                  {viewModal.tab === 'assets' && (
                    <div className="card shadow-sm border-0">
                      <div className="card-body" style={{ padding: '20px' }}>
                        <h6 className="text-primary pb-2" style={{ fontWeight: 600 }}>Asset Information</h6>
                        <div className="view-asset-grid">
                          {(() => {
                            const formatVal = (val) => {
                              if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                              const str = String(val || '');
                              if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
                                return str.split('T')[0];
                              }
                              return str;
                            };

                            return Object.entries(viewModal.data).map(([key, value]) => {
                              if (['_id', '__v', '__type', 'recordType', 'createdAt', 'updatedAt', 'batchId', 'records', 'docReviewedBy'].includes(key)) return null;
                              if (key === 'rejectReason') return null; // handled below
                              if (key === 'customFields') {
                                if (!Array.isArray(value) || value.length === 0) return null;
                                return value.flatMap((cf, cIdx) => {
                                  if (cf.description) {
                                    return [
                                      <div key={`cf-${cIdx}`} className="view-asset-item" style={{ gridColumnStart: 1 }}>
                                        <span className="view-asset-label">{cf.label}</span>
                                        <span className="view-asset-value">{formatVal(cf.value) || 'N/A'}</span>
                                      </div>,
                                      <div key={`cf-desc-${cIdx}`} className="view-asset-item" style={{ gridColumnStart: 2 }}>
                                        <span className="view-asset-label">Description</span>
                                        <span className="view-asset-value" style={{ color: '#555' }}>{cf.description}</span>
                                      </div>
                                    ];
                                  }
                                  return [
                                    <div key={`cf-${cIdx}`} className="view-asset-item">
                                      <span className="view-asset-label">{cf.label}</span>
                                      <span className="view-asset-value">{formatVal(cf.value) || 'N/A'}</span>
                                    </div>
                                  ];
                                });
                              }
                              const rawValue = formatVal(value);
                              const label = key.replace(/([A-Z])/g, ' $1').trim();
                              // Split "value - description" pattern
                              const dashIdx = rawValue.indexOf(' - ');
                              const mainVal = dashIdx !== -1 ? rawValue.slice(0, dashIdx).trim() : (rawValue || 'N/A');
                              const inlineDesc = dashIdx !== -1 ? rawValue.slice(dashIdx + 3).trim() : null;
                              if (inlineDesc) {
                                return [
                                  <div key={key} className="view-asset-item" style={{ gridColumnStart: 1 }}>
                                    <span className="view-asset-label">{label}</span>
                                    <span className="view-asset-value">{mainVal || 'N/A'}</span>
                                  </div>,
                                  <div key={`${key}-desc`} className="view-asset-item" style={{ gridColumnStart: 2 }}>
                                    <span className="view-asset-label">Description</span>
                                    <span className="view-asset-value" style={{ color: '#555' }}>{inlineDesc}</span>
                                  </div>
                                ];
                              }
                              return (
                                <div key={key} className="view-asset-item">
                                  <span className="view-asset-label">{label}</span>
                                  <span className="view-asset-value">{mainVal || 'N/A'}</span>
                                </div>
                              );
                            });
                          })()}
                          {viewModal.data.rejectReason && (
                            <div className="view-asset-item view-asset-item--danger" style={{ gridColumn: '1 / -1' }}>
                              <span className="view-asset-label text-danger">Rejection Reason</span>
                              <span className="view-asset-value text-danger fw-semibold">{viewModal.data.rejectReason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Changes & Review Tab ── */}
                  {viewModal.tab === 'changes' && (() => {
                    const latestRev = auditData.revisionHistories?.length > 0 ? auditData.revisionHistories[auditData.revisionHistories.length - 1] : null;
                    const latestDoc = (auditData.documentInfos || [])[0];
                    return (
                      <>
                        <div className="card shadow-sm border-0 mb-3">
                          <div className="card-body">
                            <h6 className="mb-3 text-primary border-bottom pb-2">Document Information</h6>
                            <div className="row g-3">
                              <div className="col-md-4">
                                <small className="text-muted d-block">Author</small>
                                <strong>{latestRev?.changeDoneBy || latestDoc?.author || 'Vishnu D (IT)'}</strong>
                              </div>
                              <div className="col-md-4">
                                <small className="text-muted d-block">Reviewed By</small>
                                <strong>{latestRev?.changeReviewedAndApprovedBy || latestDoc?.reviewedBy || 'Jayaprakash R (CISO)'}</strong>
                              </div>
                              <div className="col-md-4">
                                <small className="text-muted d-block">Document ID</small>
                                <strong>{latestDoc?.documentId || 'PCI-PS-001'}</strong>
                              </div>
                              <div className="col-md-4">
                                <small className="text-muted d-block">Current Version</small>
                                <strong>{latestRev?.newVersion || latestDoc?.currentVersion || '1'}</strong>
                              </div>
                              <div className="col-md-4">
                                <small className="text-muted d-block">Date of Current Version</small>
                                <strong>{latestRev?.changeEffectiveDate ? new Date(latestRev.changeEffectiveDate).toISOString().split('T')[0] : (latestDoc?.dateOfCurrentVersion ? new Date(latestDoc.dateOfCurrentVersion).toISOString().split('T')[0] : 'N/A')}</strong>
                              </div>
                              <div className="col-md-4">
                                <small className="text-muted d-block">Document Type</small>
                                <strong>{latestDoc?.documentType || 'Authorized Payment Scripts Document'}</strong>
                              </div>
                              <div className="col-md-4">
                                <small className="text-muted d-block">Owner</small>
                                <strong>{latestDoc?.owner || 'IT Department'}</strong>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Revision History with pagination */}
                        <div className="card shadow-sm border-0 mb-3">
                          <div className="card-body" style={{ padding: '16px' }}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="mb-0 text-primary" style={{ fontWeight: 600 }}>Revision History</h6>
                              <div className="d-flex align-items-center gap-2">
                                
                                <CustomDropdown
                                  options={[5, 10, 20, 50].map(size => ({ value: size, label: `${size}` }))}
                                  value={modalRevPageSize}
                                  onChange={(val) => { 
                                    setModalRevPageSize(Number(val)); 
                                    setModalRevPage(1); 
                                  }}
                                  style={{ width: '60px' }}
                                />
                              </div>
                            </div>

                            {/* audit-maker-table style — scrollable all directions */}
                            <div className="audit-maker-tableCard audit-maker-tableCard--modal">
                              <div className="audit-maker-table audit-maker-table--modal-revision">
                                {/* Header */}
                                <div className="audit-maker-tableHeader audit-maker-tableHeader--modal-revision">
                                  <div>Change Date</div>
                                  <div>Description</div>
                                  <div>Effective Date</div>
                                  <div>Old Ver</div>
                                  <div>New Ver</div>
                                  <div>Done By</div>
                                  <div>Approved By</div>
                                  <div>Approval</div>
                                </div>
                                {/* Rows */}
                                {modalPaginatedRevisions.length > 0 ? (
                                  modalPaginatedRevisions.map((rev) => (
                                    <div
                                      key={rev._id}
                                      className="audit-maker-tableRow audit-maker-tableRow--modal-revision"
                                    >
                                      <div style={{ whiteSpace: 'nowrap' }}>{rev.changeDate ? new Date(rev.changeDate).toLocaleDateString() : ''}</div>
                                      <div>{rev.changeDescription}</div>
                                      <div style={{ whiteSpace: 'nowrap' }}>{rev.changeEffectiveDate ? new Date(rev.changeEffectiveDate).toLocaleDateString() : ''}</div>
                                      <div>{rev.oldVersion || '0'}</div>
                                      <div>{rev.newVersion || '1'}</div>
                                      <div>{rev.changeDoneBy}</div>
                                      <div>{rev.changeReviewedAndApprovedBy}</div>
                                      <div>
                                        <span className={`badge bg-${rev.approvalStatus === 'Approved' ? 'success' : rev.approvalStatus === 'Rejected' ? 'danger' : 'warning'}`}>{rev.approvalStatus}</span>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="audit-maker-tableEmpty">No revision history found</div>
                                )}
                              </div>
                            </div>

                            {/* Pagination — using Pagination.css classes */}
                            {modalRevisions.length > modalRevPageSize && (
                              <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                                <span style={{ fontSize: '0.78rem', color: '#7A7FA6' }}>
                                  Showing {modalRevStart + 1}–{Math.min(modalRevStart + modalRevPageSize, modalRevisions.length)} of {modalRevisions.length}
                                </span>
                                <div className="pagination-wrapper">
                                  <div className="pagination-container d-flex flex-wrap gap-1">
                                    <button
                                      className="btn btn-sm btn-outline-primary pagination-prev"
                                      style={{ fontSize: '18px' }}
                                      disabled={modalRevPage === 1}
                                      onClick={() => setModalRevPage(p => Math.max(1, p - 1))}
                                    >
                                      <GrFormPrevious />
                                    </button>
                                    {Array.from({ length: Math.min(5, modalRevTotalPages) }, (_, i) => {
                                      const startPage = Math.max(1, Math.min(modalRevPage - 2, modalRevTotalPages - 4));
                                      return startPage + i;
                                    }).map(pg => (
                                      <button
                                        key={pg}
                                        className={`btn btn-sm mt-0 ${modalRevPage === pg ? 'btn-primary' : 'btn-outline-primary'}`}
                                        style={{ fontSize: '0.8rem' }}
                                        disabled={pg > modalRevTotalPages}
                                        onClick={() => setModalRevPage(pg)}
                                      >{pg}</button>
                                    ))}
                                    <button
                                      className="btn btn-sm btn-outline-primary"
                                      style={{ fontSize: '18px' }}
                                      disabled={modalRevPage === modalRevTotalPages}
                                      onClick={() => setModalRevPage(p => Math.min(modalRevTotalPages, p + 1))}
                                    >
                                      <GrFormNext />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="modal-footer border-0 pt-0" style={{ padding: '12px' }}>
                  <div className="edit-modal-actions d-flex gap-2">
                    <button className="common-modal-btn btn-small-cancel" onClick={() => { setViewModal({ isOpen: false, data: null, tab: 'assets' }); setModalRevPage(1); }}>Close</button>
                    {viewModal.data.approvalStatus === 'Pending' && viewModal.data.authorizedBy === loggedInUser && (
                      <>
                        <button className="common-modal-btn btn-reject" onClick={() => { handleStatusUpdate('script', viewModal.data._id, 'Rejected'); setViewModal({ isOpen: false, data: null, tab: 'assets' }); }}>Reject</button>
                        <button className="common-modal-btn btn-update" onClick={() => { handleStatusUpdate('script', viewModal.data._id, 'Approved'); setViewModal({ isOpen: false, data: null, tab: 'assets' }); }}>Approve</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </>
  );
};

export default PaymentScripts;
