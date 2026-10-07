import React, { useState, useEffect, useMemo } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { portalInstance } from '../Services/instance';
import Sidebar from '../Components/HeaderSidebar/Sidebar';
import { GrFormPrevious, GrFormNext } from "react-icons/gr";
import Pagination from '../Components/Employee/Pagination/Pagination';
import '../Components/Employee/Pagination/Pagination.css';
import CustomDropdown from '../Components/Common/CustomDropdown';
import './EmployeeAuditManagement.css';

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

// ── Separate Pagination for User Access Review ─────────────────────────────────
const AccessPagination = ({ totalItems, pageSize, currentPage, onPageChange }) => {
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

// ── Separate Pagination for Firewall Rules ─────────────────────────────────────
const FirewallPagination = ({ totalItems, pageSize, currentPage, onPageChange }) => {
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

const EmployeeAuditManagement = () => {
  const loggedInUser = JSON.parse(sessionStorage.getItem("Erti-Portal"))?.name || '';
  const sessionUser = JSON.parse(sessionStorage.getItem("Erti-Portal")) || {};
  const userRole = sessionUser.role || 'employee';
  const userPermissions = sessionUser.permissions || [];
  const modulePermission = userRole === 'admin' ? 'WRITE' : (userPermissions.find(p => p.module === "Access Controller")?.permission || "NO_ACCESS");
  const isReadOnly = modulePermission === "READ";
  const [activeTab, setActiveTab] = useState('assets');
  const [auditData, setAuditData] = useState({
    accessReviews: [],
    firewallRules: [],
    documentInfos: [],
    revisionHistories: []
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pagination states
  const [accessCurrentPage, setAccessCurrentPage] = useState(1);
  const [accessPageSize, setAccessPageSize] = useState(5);
  const [fwCurrentPage, setFwCurrentPage] = useState(1);
  const [fwPageSize, setFwPageSize] = useState(5);

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

  // Visibility Filters (Creator or Reviewer only)
const filteredAccessReviews = useMemo(() => {
    if (!auditData.accessReviews) return [];

    // Admin can see everything
    if (userRole === "admin") {
        return auditData.accessReviews;
    }

    // Users with READ or WRITE permission can see everything
    if (modulePermission === "READ" || modulePermission === "WRITE") {
        return auditData.accessReviews;
    }

    // NO_ACCESS
    return [];
}, [auditData.accessReviews, userRole, modulePermission]);

const filteredFirewallRules = useMemo(() => {
    if (!auditData.firewallRules) return [];

    // Admin can see everything
    if (userRole === "admin") {
        return auditData.firewallRules;
    }

    // Users with READ or WRITE permission can see everything
    if (modulePermission === "READ" || modulePermission === "WRITE") {
        return auditData.firewallRules;
    }

    // NO_ACCESS
    return [];
}, [auditData.firewallRules, userRole, modulePermission]);

  // Sliced data for paginated tables
  const paginatedAccessReviews = useMemo(() => {
    const startIndex = (accessCurrentPage - 1) * accessPageSize;
    return filteredAccessReviews.slice(startIndex, startIndex + accessPageSize);
  }, [filteredAccessReviews, accessCurrentPage, accessPageSize]);

  const paginatedFirewallRules = useMemo(() => {
    const startIndex = (fwCurrentPage - 1) * fwPageSize;
    return filteredFirewallRules.slice(startIndex, startIndex + fwPageSize);
  }, [filteredFirewallRules, fwCurrentPage, fwPageSize]);

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
      const res = await portalInstance.get('/api/audit');
      if (res.data.success) {
        setAuditData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch audit data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (type, id, status, rejectReason) => {
    if (status === 'Rejected' && !rejectReason) {
      setRejectModal({ isOpen: true, type, id, status });
      setRejectReasonText('');
      return;
    }
    try {
      await portalInstance.put(`/api/audit/status`, { type, id, status, rejectReason, reviewerName: loggedInUser });
      toast.success(`${type} request ${status.toLowerCase()}`);
      fetchData();
      setViewModal({ isOpen: false, data: null, tab: 'assets' });
      setRejectModal({ isOpen: false, type: '', id: '', status: '' });
    } catch (err) {
      toast.error(`Error updating status`);
    }
  };

  const handleDownload = async () => {
    try {
      const accessColsParam = selectedAccessCols.map(c => c.key).join(',');
      const fwColsParam = selectedFwCols.map(c => c.key).join(',');
      const res = await portalInstance.get(`/api/audit/download?accessCols=${accessColsParam}&fwCols=${fwColsParam}`, {
        responseType: 'blob',
      });
      const blob = res.data;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Access_Control_Review_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download Excel file');
    }
  };

  // ----------------------------------------------------
  // Edit Modal State & Handlers
  // ----------------------------------------------------
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null, tab: 'assets' });
  const [editModal, setEditModal] = useState({ isOpen: false, type: '', isView: false });
  const [editForm, setEditForm] = useState(null);

  // Modal Revision History pagination
  const [modalRevPage, setModalRevPage] = useState(1);
  const [modalRevPageSize, setModalRevPageSize] = useState(5);

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: '', id: null });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, type: '', id: '', status: '' });
  const [rejectReasonText, setRejectReasonText] = useState('');

  const [createModal, setCreateModal] = useState({ isOpen: false, type: '' });
  const openCreateModal = (type) => setCreateModal({ isOpen: true, type });
  const closeCreateModal = () => setCreateModal({ isOpen: false, type: '' });

  const openEditModal = (type, record) => {
    if (type === 'access') {
      const parseField = (str) => {
        if (!str || str === 'N/A') return { value: '', desc: '' };
        const parts = str.split(' - ');
        if (parts.length > 1) {
          return { value: parts[0], desc: parts.slice(1).join(' - ') };
        }
        return { value: str, desc: '' };
      };
      
      const aws = parseField(record.awsConsole);
      const ec2 = parseField(record.ec2Server);
      const db = parseField(record.database);
      const git = parseField(record.gitRepository);
      const prod = parseField(record.productionDeploy);

      setEditForm({
        ...record,
        awsConsoleValue: aws.value,
        awsConsoleDesc: aws.desc,
        ec2ServerValue: ec2.value,
        ec2ServerDesc: ec2.desc,
        databaseValue: db.value,
        databaseDesc: db.desc,
        gitRepositoryValue: git.value,
        gitRepositoryDesc: git.desc,
        productionDeployValue: prod.value,
        productionDeployDesc: prod.desc,
        kmsSecrets: record.kmsSecrets || 'N/A',
        firewallWaf: record.firewallWaf || 'N/A',
      });
    } else {
      setEditForm(record);
    }
    setEditModal({ isOpen: true, type, isView: false });
  };

  const closeEditModal = () => {
    setEditModal({ isOpen: false, type: '', isView: false });
    setEditForm(null);
  };

  const handleEditSubmit = async (status) => {
    try {
      let endpoint = '';
      let payload = { ...editForm };
      
      if (editModal.type === 'access') {
        endpoint = 'access-review';
        if (!editForm.reviewedBy) {
          return toast.warning('Please select a Reviewed By (Approver)');
        }
        if (editForm.reviewedBy === loggedInUser) {
          return toast.warning('The record creator cannot be selected as the Reviewed By (Approver). Please select a different approver.');
        }

        payload = {
          ...editForm,
          awsConsole: editForm.awsConsoleValue ? (editForm.awsConsoleDesc ? `${editForm.awsConsoleValue} - ${editForm.awsConsoleDesc}` : editForm.awsConsoleValue) : 'N/A',
          ec2Server: editForm.ec2ServerValue ? (editForm.ec2ServerDesc ? `${editForm.ec2ServerValue} - ${editForm.ec2ServerDesc}` : editForm.ec2ServerValue) : 'N/A',
          database: editForm.databaseValue ? (editForm.databaseDesc ? `${editForm.databaseValue} - ${editForm.databaseDesc}` : editForm.databaseValue) : 'N/A',
          gitRepository: editForm.gitRepositoryValue ? (editForm.gitRepositoryDesc ? `${editForm.gitRepositoryValue} - ${editForm.gitRepositoryDesc}` : editForm.gitRepositoryValue) : 'N/A',
          productionDeploy: editForm.productionDeployValue ? (editForm.productionDeployDesc ? `${editForm.productionDeployValue} - ${editForm.productionDeployDesc}` : editForm.productionDeployValue) : 'N/A',
          firewallWaf: editForm.firewallWaf || 'N/A',
          customFields: (editForm.customFields || []).filter(cf => cf.label && cf.label.trim()),
          docReviewedBy: editForm.reviewedBy,
          approvalStatus: status,
          id: editForm._id
        };
      } else {
        if (editModal.type === 'firewall') endpoint = 'firewall-rule';
        else if (editModal.type === 'revision') endpoint = 'revision-history';
        payload = { ...editForm, approvalStatus: status, id: editForm._id };
      }
      
      await portalInstance.post(`/api/audit/${endpoint}`, payload);
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
      let endpoint = '';
      if (type === 'access') endpoint = 'access-review';
      else if (type === 'firewall') endpoint = 'firewall-rule';
      else if (type === 'revision') endpoint = 'revision-history';

      await portalInstance.delete(`/api/audit/${endpoint}/${id}`);
      toast.success('Deleted successfully');
      fetchData();
    } catch (err) {
      toast.error('Error deleting record');
    } finally {
      closeDeleteModal();
    }
  };

  // ----------------------------------------------------
  // User Access Review
  // ----------------------------------------------------
  const emptyAccessRow = () => ({
    user: loggedInUser || '', role: '',
    awsConsoleValue: '', awsConsoleDesc: '',
    ec2ServerValue: '', ec2ServerDesc: '',
    databaseValue: '', databaseDesc: '',
    kmsSecrets: 'N/A',
    gitRepositoryValue: '', gitRepositoryDesc: '',
    firewallWaf: '',
    productionDeployValue: '', productionDeployDesc: '',
    reviewedBy: '', reviewDate: '',
    customFields: []
  });
  const [accessReviewRows, setAccessReviewRows] = useState([emptyAccessRow()]);

  const updateAccessRow = (index, field, value) => {
    setAccessReviewRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    if (field === 'reviewedBy') {
      setDocInfoForm(prev => ({ ...prev, reviewedBy: value }));
    }
  };
  const addAccessRow = () => setAccessReviewRows(prev => [...prev, emptyAccessRow()]);
  const removeAccessRow = (index) => setAccessReviewRows(prev => prev.filter((_, i) => i !== index));

  // ── Filter Popup State & Logic ──────────────────────────────────
  const ACCESS_DEFAULT_COLS = [
    { key: 'user',           label: 'User' },
    { key: 'role',           label: 'Role' },
    { key: 'awsConsole',     label: 'AWS Console' },
    { key: 'awsConsoleDesc', label: 'AWS Description' },
    { key: 'ec2Server',      label: 'EC2 Server' },
    { key: 'ec2ServerDesc',  label: 'EC2 Description' },
    { key: 'database',       label: 'Database' },
    { key: 'databaseDesc',   label: 'Database Description' },
    { key: 'kmsSecrets',     label: 'KMS/Secrets' },
    { key: 'gitRepository',  label: 'Git Repo' },
    { key: 'gitRepositoryDesc', label: 'Git Repo Description' },
    { key: 'firewallWaf',    label: 'Firewall/WAF' },
    { key: 'productionDeploy', label: 'Prod Deploy' },
    { key: 'productionDeployDesc', label: 'Prod Deploy Description' },
    { key: 'reviewedBy',     label: 'Reviewed By' },
    { key: 'reviewDate',     label: 'Review Date' },
    { key: 'status',         label: 'Status' },
    { key: '__approval__',   label: 'Approval' },
    { key: '__actions__',    label: 'Actions' },
  ];
  const FW_DEFAULT_COLS = [
    { key: 'firewallType',        label: 'Type' },
    { key: 'ruleId',              label: 'Rule ID' },
    { key: 'source',              label: 'Source' },
    { key: 'destination',         label: 'Destination' },
    { key: 'action',              label: 'Action' },
    { key: 'businessJustification', label: 'Justification' },
    { key: 'implementedBy',       label: 'Implemented By' },
    { key: 'reviewedBy',          label: 'Reviewed By' },
    { key: 'reviewDate',          label: 'Review Date' },
    { key: 'status',              label: 'Status' },
    { key: '__approval__',        label: 'Approval' },
    { key: '__actions__',         label: 'Actions' },
  ];

  const [filterOpen, setFilterOpen]           = useState(false);
  const [selectedAccessCols, setSelectedAccessCols] = useState([...ACCESS_DEFAULT_COLS]);
  const [availableAccessCols, setAvailableAccessCols] = useState([]);
  const [selectedFwCols, setSelectedFwCols]   = useState([...FW_DEFAULT_COLS]);
  const [availableFwCols, setAvailableFwCols] = useState([]);
  const [draggedColIndex, setDraggedColIndex] = useState(null);
  const [draggedTableType, setDraggedTableType] = useState(null);

  const handleHeaderDragStart = (e, index, tableType) => {
    const cols = tableType === 'access' ? finalAccessCols : selectedFwCols;
    const col = cols[index];
    if (col.key === '__actions__' || col.key === '__approval__') {
      e.preventDefault();
      return;
    }
    setDraggedColIndex(index);
    setDraggedTableType(tableType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleHeaderDragOver = (e, index, tableType) => {
    if (draggedTableType === tableType) {
      e.preventDefault();
    }
  };

  const handleHeaderDrop = (e, targetIndex, tableType) => {
    if (draggedTableType !== tableType || draggedColIndex === null || draggedColIndex === targetIndex) return;

    if (tableType === 'access') {
      const cols = [...finalAccessCols];
      const draggedCol = cols[draggedColIndex];
      if (draggedCol.key === '__actions__' || draggedCol.key === '__approval__') return;
      const targetCol = cols[targetIndex];
      if (targetCol.key === '__actions__' || targetCol.key === '__approval__') return;

      const newSelectedCols = [...selectedAccessCols];
      const origDragIdx = newSelectedCols.findIndex(c => c.key === draggedCol.key);
      const origTargetIdx = newSelectedCols.findIndex(c => c.key === targetCol.key);

      if (origDragIdx !== -1 && origTargetIdx !== -1) {
        const [movedCol] = newSelectedCols.splice(origDragIdx, 1);
        newSelectedCols.splice(origTargetIdx, 0, movedCol);
        
        // Ensure description columns are aligned directly next to their main columns
        const alignDescriptions = (cols) => {
          const list = [...cols];
          const pairs = [
            { main: 'awsConsole', desc: 'awsConsoleDesc' },
            { main: 'ec2Server', desc: 'ec2ServerDesc' },
            { main: 'database', desc: 'databaseDesc' },
            { main: 'gitRepository', desc: 'gitRepositoryDesc' },
            { main: 'productionDeploy', desc: 'productionDeployDesc' }
          ];
          pairs.forEach(({ main, desc }) => {
            const descIdx = list.findIndex(c => c.key === desc);
            if (descIdx !== -1) {
              const [descCol] = list.splice(descIdx, 1);
              const mainIdx = list.findIndex(c => c.key === main);
              if (mainIdx !== -1) {
                list.splice(mainIdx + 1, 0, descCol);
              } else {
                list.splice(descIdx, 0, descCol);
              }
            }
          });
          return list;
        };

        setSelectedAccessCols(alignDescriptions(newSelectedCols));
      }
    } else {
      const cols = [...selectedFwCols];
      const draggedCol = cols[draggedColIndex];
      if (draggedCol.key === '__actions__' || draggedCol.key === '__approval__') return;
      const targetCol = cols[targetIndex];
      if (targetCol.key === '__actions__' || targetCol.key === '__approval__') return;

      const [movedCol] = cols.splice(draggedColIndex, 1);
      cols.splice(targetIndex, 0, movedCol);
      setSelectedFwCols(cols);
    }

    setDraggedColIndex(null);
    setDraggedTableType(null);
  };

  const handleHeaderDragEnd = () => {
    setDraggedColIndex(null);
    setDraggedTableType(null);
  };

  const [filterActiveTable, setFilterActiveTable] = useState('access');

  // Sync access columns when auditData or local rows change (dynamic custom columns detection)
  useEffect(() => {
    const allLabels = new Set();
    if (auditData.accessReviews) {
      auditData.accessReviews.forEach(ar => {
        if (ar.customFields) {
          ar.customFields.forEach(cf => {
            if (cf.label) allLabels.add(cf.label.trim());
          });
        }
      });
    }
    accessReviewRows.forEach(row => {
      if (row.customFields) {
        row.customFields.forEach(cf => {
          if (cf.label) allLabels.add(cf.label.trim());
        });
      }
    });

    const customCols = Array.from(allLabels).map(lbl => ({
      key: '__custom__' + lbl,
      label: lbl
    }));

    setSelectedAccessCols(prevSelected => {
      const currentCustomKeys = new Set(
        prevSelected.filter(col => col.key.startsWith('__custom__')).map(col => col.key)
      );

      const currentAvailableCustomKeys = new Set(
        availableAccessCols.filter(col => col.key.startsWith('__custom__')).map(col => col.key)
      );

      const newCustomCols = customCols.filter(cc => !currentCustomKeys.has(cc.key) && !currentAvailableCustomKeys.has(cc.key));

      const validSelected = prevSelected.filter(col => {
        if (col.key.startsWith('__custom__')) {
          return customCols.some(cc => cc.key === col.key);
        }
        return true;
      });

      newCustomCols.forEach(cc => {
        const prodDeployIdx = validSelected.findIndex(col => col.key === 'productionDeploy');
        if (prodDeployIdx !== -1) {
          validSelected.splice(prodDeployIdx + 1, 0, cc);
        } else {
          const reviewedByIdx = validSelected.findIndex(col => col.key === 'reviewedBy');
          if (reviewedByIdx !== -1) {
            validSelected.splice(reviewedByIdx, 0, cc);
          } else {
            validSelected.push(cc);
          }
        }
      });

      setAvailableAccessCols(() => {
        const updatedSelectedKeys = new Set(validSelected.map(c => c.key));
        const allPossibleCols = [...ACCESS_DEFAULT_COLS, ...customCols];
        return allPossibleCols.filter(col => !updatedSelectedKeys.has(col.key));
      });

      return validSelected;
    });
  }, [auditData.accessReviews, accessReviewRows]);

  // Sync firewall columns available list
  useEffect(() => {
    setSelectedFwCols(prevSelected => {
      const currentSelectedKeys = new Set(prevSelected.map(c => c.key));
      setAvailableFwCols(FW_DEFAULT_COLS.filter(col => !currentSelectedKeys.has(col.key)));
      return prevSelected;
    });
  }, []);

  // HTML5 Drag and Drop Handlers
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

      if (filterActiveTable === 'access') {
        if (sourcePanel === 'selected') {
          const updated = [...selectedAccessCols];
          updated.splice(sourceIndex, 1);
          updated.splice(targetIndex, 0, col);
          setSelectedAccessCols(updated);
        } else {
          setAvailableAccessCols(prev => prev.filter(c => c.key !== col.key));
          const updated = [...selectedAccessCols];
          updated.splice(targetIndex, 0, col);
          setSelectedAccessCols(updated);
        }
      } else {
        if (sourcePanel === 'selected') {
          const updated = [...selectedFwCols];
          updated.splice(sourceIndex, 1);
          updated.splice(targetIndex, 0, col);
          setSelectedFwCols(updated);
        } else {
          setAvailableFwCols(prev => prev.filter(c => c.key !== col.key));
          const updated = [...selectedFwCols];
          updated.splice(targetIndex, 0, col);
          setSelectedFwCols(updated);
        }
      }
    } catch (err) {
      console.error('Drop item failed', err);
    }
  };

  const moveColumn = (col, sourcePanel) => {
    if (filterActiveTable === 'access') {
      if (sourcePanel === 'available') {
        setAvailableAccessCols(prev => prev.filter(c => c.key !== col.key));
        setSelectedAccessCols(prev => [...prev, col]);
      } else {
        setSelectedAccessCols(prev => prev.filter(c => c.key !== col.key));
        setAvailableAccessCols(prev => [...prev, col]);
      }
    } else {
      if (sourcePanel === 'available') {
        setAvailableFwCols(prev => prev.filter(c => c.key !== col.key));
        setSelectedFwCols(prev => [...prev, col]);
      } else {
        setSelectedFwCols(prev => prev.filter(c => c.key !== col.key));
        setAvailableFwCols(prev => [...prev, col]);
      }
    }
  };

  const moveColumnOrder = (e, index, direction) => {
    e.stopPropagation();
    if (filterActiveTable === 'access') {
      const updated = [...selectedAccessCols];
      if (direction === 'up' && index > 0) {
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
      } else if (direction === 'down' && index < updated.length - 1) {
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
      }
      setSelectedAccessCols(updated);
    } else {
      const updated = [...selectedFwCols];
      if (direction === 'up' && index > 0) {
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
      } else if (direction === 'down' && index < updated.length - 1) {
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
      }
      setSelectedFwCols(updated);
    }
  };

  // ── Custom Field Builder Modal ────────────────────────────────
  const [customFieldModal, setCustomFieldModal] = useState({
    isOpen: false,
    targetRowIndex: null,
    label: '',
    type: 'text',         // 'text' | 'textarea' | 'radio'
    radioOptions: [''],   // only used when type === 'radio'
  });

  const openCustomFieldModal = (rowIndex) => {
    setCustomFieldModal({ isOpen: true, targetRowIndex: rowIndex, label: '', type: 'text', radioOptions: [''] });
  };
  const closeCustomFieldModal = () => {
    setCustomFieldModal(prev => ({ ...prev, isOpen: false }));
  };
  const confirmCustomField = () => {
    const { targetRowIndex, label, type, radioOptions } = customFieldModal;
    if (!label.trim()) return toast.warning('Please enter a field label');
    if (type === 'radio' && radioOptions.filter(o => o.trim()).length < 1)
      return toast.warning('Add at least one radio option');
    const newField = {
      label: label.trim(),
      type,
      radioOptions: type === 'radio' ? radioOptions.filter(o => o.trim()) : [],
      value: ''
    };
    if (targetRowIndex === -1) {
      setEditForm(prev => ({
        ...prev,
        customFields: [...(prev.customFields || []), newField]
      }));
    } else {
      setAccessReviewRows(prev => prev.map((r, i) =>
        i === targetRowIndex
          ? { ...r, customFields: [...(r.customFields || []), newField] }
          : r
      ));
    }
    closeCustomFieldModal();
  };
  const removeCustomField = (rowIndex, fieldIndex) => {
    setAccessReviewRows(prev => prev.map((r, i) =>
      i === rowIndex ? { ...r, customFields: r.customFields.filter((_, fi) => fi !== fieldIndex) } : r
    ));
  };
  const updateCustomFieldValue = (rowIndex, fieldIndex, val) => {
    setAccessReviewRows(prev => prev.map((r, i) =>
      i === rowIndex
        ? { ...r, customFields: r.customFields.map((cf, fi) => fi === fieldIndex ? { ...cf, value: val } : cf) }
        : r
    ));
  };

  const saveAccessReview = async (status) => {
    if (!docInfoForm.reviewedBy) {
      return toast.warning('Please select a Reviewed By (Approver)');
    }
    if (docInfoForm.reviewedBy === loggedInUser) {
      return toast.warning('The record creator cannot be selected as the Reviewed By (Approver). Please select a different approver.');
    }
    const validRows = accessReviewRows.filter(r => r.user && r.role);
    if (validRows.length === 0) return toast.warning('At least one row with User and Role is required');
    if (validRows.some(r => r.reviewedBy === loggedInUser)) {
      return toast.warning('The record creator cannot be selected as the Reviewer in any row. Please select a different reviewer.');
    }

    const formattedRows = validRows.map(r => ({
      ...r,
      awsConsole: r.awsConsoleValue ? (r.awsConsoleDesc ? `${r.awsConsoleValue} - ${r.awsConsoleDesc}` : r.awsConsoleValue) : 'N/A',
      ec2Server: r.ec2ServerValue ? (r.ec2ServerDesc ? `${r.ec2ServerValue} - ${r.ec2ServerDesc}` : r.ec2ServerValue) : 'N/A',
      database: r.databaseValue ? (r.databaseDesc ? `${r.databaseValue} - ${r.databaseDesc}` : r.databaseValue) : 'N/A',
      gitRepository: r.gitRepositoryValue ? (r.gitRepositoryDesc ? `${r.gitRepositoryValue} - ${r.gitRepositoryDesc}` : r.gitRepositoryValue) : 'N/A',
      productionDeploy: r.productionDeployValue ? (r.productionDeployDesc ? `${r.productionDeployValue} - ${r.productionDeployDesc}` : r.productionDeployValue) : 'N/A',
      firewallWaf: r.firewallWaf || 'N/A',
      customFields: (r.customFields || []).filter(cf => cf.label && cf.label.trim()),
    }));

    try {
      const meta = {
        approvalStatus: status,
        ...docInfoForm,
        docReviewedBy: docInfoForm.reviewedBy,
        oldVersion: docInfoForm.currentVersion,
        newVersion: (parseInt(docInfoForm.currentVersion) || 0) + 1,
        reviewedBy: validRows[0].reviewedBy,
        reviewDate: validRows[0].reviewDate,
      };
      if (formattedRows.length === 1) {
        // Single row — use existing single path
        await portalInstance.post('/api/audit/access-review', { ...formattedRows[0], ...meta });
      } else {
        // Multiple rows — bulk path, ONE revision history entry
        await portalInstance.post('/api/audit/access-review', { records: formattedRows, ...meta });
      }
      toast.success(`Access Review ${status === 'Draft' ? 'saved as draft' : 'submitted for approval'}`);
      fetchData();
      setAccessReviewRows([emptyAccessRow()]);
      closeCreateModal();
    } catch (err) {
      toast.error('Error saving access review');
    }
  };

  // ----------------------------------------------------
  // Firewall Rule
  // ----------------------------------------------------
  const emptyFirewallRow = () => ({
    firewallType: '', ruleId: '', source: '', destination: '', action: '',
    businessJustification: '', implementedBy: '', reviewedBy: '', reviewDate: ''
  });
  const [firewallRows, setFirewallRows] = useState([emptyFirewallRow()]);

  const updateFirewallRow = (index, field, value) => {
    setFirewallRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
    if (field === 'reviewedBy') {
      setDocInfoForm(prev => ({ ...prev, reviewedBy: value }));
    }
  };
  const addFirewallRow = () => setFirewallRows(prev => [...prev, emptyFirewallRow()]);
  const removeFirewallRow = (index) => setFirewallRows(prev => prev.filter((_, i) => i !== index));

  const saveFirewallRule = async (status) => {
    if (!docInfoForm.reviewedBy) {
      return toast.warning('Please select a Reviewed By (Approver)');
    }
    if (docInfoForm.reviewedBy === loggedInUser) {
      return toast.warning('The record creator cannot be selected as the Reviewed By (Approver). Please select a different approver.');
    }
    const validRows = firewallRows.filter(r => r.firewallType && r.ruleId);
    if (validRows.length === 0) return toast.warning('At least one row with Type and Rule ID is required');
    if (validRows.some(r => r.reviewedBy === loggedInUser)) {
      return toast.warning('The record creator cannot be selected as the Reviewer in any row. Please select a different reviewer.');
    }
    try {
      const meta = {
        approvalStatus: status,
        ...docInfoForm,
        docReviewedBy: docInfoForm.reviewedBy,
        oldVersion: docInfoForm.currentVersion,
        newVersion: (parseInt(docInfoForm.currentVersion) || 0) + 1,
        reviewedBy: validRows[0].reviewedBy,
        reviewDate: validRows[0].reviewDate,
      };
      if (validRows.length === 1) {
        // Single row — use existing single path
        await portalInstance.post('/api/audit/firewall-rule', { ...validRows[0], ...meta });
      } else {
        // Multiple rows — bulk path, ONE revision history entry
        await portalInstance.post('/api/audit/firewall-rule', { records: validRows, ...meta });
      }
      toast.success(`Firewall Rule ${status === 'Draft' ? 'saved as draft' : 'submitted for approval'}`);
      fetchData();
      setFirewallRows([emptyFirewallRow()]);
      closeCreateModal();
    } catch (err) {
      toast.error('Error saving firewall rule');
    }
  };

  // ----------------------------------------------------
  // Document Info & Versioning
  // ----------------------------------------------------
  const allAssets = [...auditData.accessReviews, ...auditData.firewallRules];
  const sortedAssets = allAssets.sort((a, b) => new Date(b.reviewDate || b.createdAt) - new Date(a.reviewDate || a.createdAt));
  const latestDate = sortedAssets.length > 0 && sortedAssets[0].reviewDate ? new Date(sortedAssets[0].reviewDate).toISOString().split('T')[0] : '';

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
    if (!ownerOptions.includes(trimmed)) {
      setOwnerOptions(prev => [...prev, trimmed]);
    }
    setDocInfoForm(prev => ({ ...prev, owner: trimmed }));
    closeOwnerPopup();
  };

  useEffect(() => {
    fetchEmployees();
    const histories = auditData.revisionHistories || [];
    const version = histories.length.toString();
    const latestRevision = histories.length > 0 ? histories[histories.length - 1] : null;
    const docInfo = auditData.documentInfos && auditData.documentInfos[0] ? auditData.documentInfos[0] : null;

    setDocInfoForm(prev => ({ 
      ...prev, 
      currentVersion: version,
      author: loggedInUser,
      dateOfCurrentVersion: latestRevision && latestRevision.changeEffectiveDate ? new Date(latestRevision.changeEffectiveDate).toISOString().split('T')[0] : prev.dateOfCurrentVersion,
      documentId: docInfo && docInfo.documentId ? docInfo.documentId : prev.documentId,
      documentType: docInfo && docInfo.documentType ? docInfo.documentType : prev.documentType,
      owner: docInfo && docInfo.owner ? docInfo.owner : prev.owner,
    }));
  }, [auditData.revisionHistories, auditData.documentInfos]);

  const hasAwsDesc = auditData?.accessReviews?.some(ar => ar.awsConsole?.includes(' - '));
  const hasEc2Desc = auditData?.accessReviews?.some(ar => ar.ec2Server?.includes(' - '));
  const hasDbDesc = auditData?.accessReviews?.some(ar => ar.database?.includes(' - '));
  const hasGitDesc = auditData?.accessReviews?.some(ar => ar.gitRepository?.includes(' - '));
  const hasProdDesc = auditData?.accessReviews?.some(ar => ar.productionDeploy?.includes(' - '));

  const finalAccessCols = selectedAccessCols.filter(col => {
    if (col.key.endsWith('Desc')) return false;
    return true;
  });

  return (
    <>
      <Sidebar />
      <div className="audit-mgmt-container">
        <div className="audit-mgmt-header">
        <h2>Access Control Review Management</h2>
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
                <input type="text" className="form-control" value={docInfoForm.author} readOnly style={{ backgroundColor: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} />
              </div>
              <div className="col-12 col-md-6 col-xl-4">
                <label>Reviewed By (Approver) <span style={{color:'red'}}>*</span></label>
                <CustomDropdown
                  options={employees.filter(emp => emp.name !== loggedInUser).map(emp => ({ value: emp.name, label: `${emp.name} (${emp.department || emp.role})` }))}
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
                    { value: '__add_new__', label: 'Add your own value...' }
                  ]}
                  value={docInfoForm.owner}
                  onChange={val => {
                    if (val === 'separator') return;
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
                  <div className="audit-maker-tableHeader audit-maker-tableHeader--employee-revision">
                    <div>Change Date</div>
                    <div>Description</div>
                    <div>Effective Date</div>
                    <div>Old Ver</div>
                    <div>New Ver</div>
                    <div>Done By</div>
                    <div>Approved By</div>
                    <div>Approval</div>
                    <div>Actions</div>
                  </div>

                  {paginatedRevisions && paginatedRevisions.length > 0 ? (
                    paginatedRevisions.map((rev) => (
                      <div key={rev._id} className="audit-maker-tableRow audit-maker-tableRow--employee-revision">
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
                        <div>
                          <button className="btn btn-sm btn-info text-white py-0" onClick={() => setViewModal({ isOpen: true, data: { ...rev, __type: 'revision' }, tab: 'assets' })}>View</button>
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

        <div className="card audit-card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <h5>User Access Review</h5>
            </div>
            <div className="d-flex align-items-center gap-3">
              <img
                src="/Filter.svg"
                alt="Filter"
                title="Configure Columns"
                style={{ width: 25, height: 25, opacity: 1, cursor: 'pointer' }}
                onClick={() => {
                  setFilterActiveTable('access');
                  setFilterOpen(true);
                }}
              />
              <div className="d-flex align-items-center gap-2">
                
                <CustomDropdown
                  options={[5, 10, 20, 50, 100].map(size => ({ value: size, label: `${size}` }))}
                  value={accessPageSize}
                  onChange={(val) => {
                    setAccessPageSize(val);
                    setAccessCurrentPage(1);
                  }}
                  style={{ width: "80px" }}
                />
              </div>
              {!isReadOnly && <button className="btn btn-sm btn-primary" onClick={() => openCreateModal('access')}>Create Record</button>}
            </div>
          </div>
          <div className="card-body">
            <div className="audit-maker-tableCard">
              <div className="table-responsive">
                <div className="audit-maker-table audit-maker-table--access">
                  <div
                    className="audit-maker-tableHeader"
                    style={{
                      gridTemplateColumns: finalAccessCols.map(col => col.key === '__actions__' ? '200px' : col.key === '__approval__' ? '100px' : '1fr').join(' ')
                    }}
                  >
                    {finalAccessCols.map((col, index) => {
                      const isDraggable = col.key !== '__actions__' && col.key !== '__approval__';
                      return (
                        <div
                          key={col.key}
                          draggable={isDraggable}
                          onDragStart={(e) => handleHeaderDragStart(e, index, 'access')}
                          onDragOver={(e) => handleHeaderDragOver(e, index, 'access')}
                          onDrop={(e) => handleHeaderDrop(e, index, 'access')}
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

                  {paginatedAccessReviews && paginatedAccessReviews.length > 0 ? (
                    paginatedAccessReviews.map((ar) => (
                      <div key={ar._id}
                        className="audit-maker-tableRow"
                        style={{
                          gridTemplateColumns: finalAccessCols.map(col => col.key === '__actions__' ? '200px' : col.key === '__approval__' ? '100px' : '1fr').join(' ')
                        }}
                      >
                        {finalAccessCols.map(col => {
                          if (col.key === '__approval__') return (
                            <div key={col.key}>
                              <span className={`badge bg-${ar.approvalStatus === 'Approved' ? 'success' : ar.approvalStatus === 'Rejected' ? 'danger' : 'warning'}`}>{ar.approvalStatus}</span>
                              {ar.approvalStatus === 'Pending' && ar.docReviewedBy === loggedInUser && (
                                <div className="mt-1 d-flex gap-1 flex-wrap">
                                  <button className="btn btn-sm btn-success py-0" onClick={() => handleStatusUpdate('access', ar._id, 'Approved')}>Approve</button>
                                  <button className="btn btn-sm btn-warning text-dark py-0" onClick={() => handleStatusUpdate('access', ar._id, 'Rejected')}>Reject</button>
                                </div>
                              )}
                            </div>
                          );
                          if (col.key === '__actions__') {
                            const isApprover = ar.docReviewedBy === loggedInUser || ar.reviewedBy === loggedInUser || docInfoForm.reviewedBy === loggedInUser;
                            return (
                              <div key={col.key}>
                                <div className="d-flex gap-2">
                                  {isApprover || isReadOnly ? (
                                     <button className="btn btn-sm btn-info text-white" onClick={() => setViewModal({ isOpen: true, data: { ...ar, __type: 'access' }, tab: 'assets' })}>View</button>
                                  ) : (
                                    <>
                                      <button className="btn btn-sm btn-info text-white" onClick={() => setViewModal({ isOpen: true, data: { ...ar, __type: 'access' }, tab: 'assets' })}>View</button>
                                      <button className="btn btn-sm btn-primary" onClick={() => openEditModal('access', ar)}>Edit</button>
                                      <button className="btn btn-sm btn-danger" onClick={() => openDeleteModal('access', ar._id)}>Delete</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          if (col.key === 'reviewDate') return <div key={col.key}>{ar.reviewDate ? new Date(ar.reviewDate).toLocaleDateString() : ''}</div>;
                          if (col.key === 'awsConsole' || col.key === 'ec2Server' || col.key === 'database' || col.key === 'gitRepository' || col.key === 'productionDeploy') {
                            const v = ar[col.key];
                            return <div key={col.key}>{v && v.includes(' - ') ? v.split(' - ')[0] : v}</div>;
                          }
                          if (col.key === 'awsConsoleDesc' || col.key === 'ec2ServerDesc' || col.key === 'databaseDesc' || col.key === 'gitRepositoryDesc' || col.key === 'productionDeployDesc') {
                            const parentKey = col.key.replace('Desc', '');
                            const v = ar[parentKey];
                            return <div key={col.key}>{v && v.includes(' - ') ? v.split(' - ').slice(1).join(' - ') : ''}</div>;
                          }
                          // custom field
                          if (col.key.startsWith('__custom__')) {
                            const lbl = col.key.replace('__custom__', '');
                            const cf = (ar.customFields || []).find(f => f.label === lbl);
                            return <div key={col.key}>{cf ? cf.value : ''}</div>;
                          }
                          return <div key={col.key}>{ar[col.key]}</div>;
                        })}
                      </div>
                    ))
                  ) : (
                    <div className="audit-maker-tableEmpty">No access reviews found</div>
                  )}
                </div>
              </div>
              {filteredAccessReviews && filteredAccessReviews.length > 0 && (
                <AccessPagination
                  totalItems={filteredAccessReviews.length}
                  pageSize={accessPageSize}
                  currentPage={accessCurrentPage}
                  onPageChange={(p) => setAccessCurrentPage(p)}
                />
              )}
            </div>
          </div>
        </div>
        {/* Firewall Rules Section */}
        <div className="card audit-card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <h5>Firewall Rules</h5>
            </div>
            <div className="d-flex align-items-center gap-3">
              <img
                src="/Filter.svg"
                alt="Filter"
                title="Configure Columns"
                style={{ width: 25, height: 25, opacity: 1, cursor: 'pointer' }}
                onClick={() => {
                  setFilterActiveTable('firewall');
                  setFilterOpen(true);
                }}
              />
              <div className="d-flex align-items-center gap-2">
                
                <CustomDropdown
                  options={[5, 10, 20, 50, 100].map(size => ({ value: size, label: `${size}` }))}
                  value={fwPageSize}
                  onChange={(val) => {
                    setFwPageSize(val);
                    setFwCurrentPage(1);
                  }}
                  style={{ width: "80px" }}
                />
              </div>
              {!isReadOnly && <button className="btn btn-sm btn-primary" onClick={() => openCreateModal('firewall')}>Create Record</button>}
            </div>
          </div>
          <div className="card-body">
            <div className="audit-maker-tableCard">
              <div className="table-responsive">
                <div className="audit-maker-table audit-maker-table--firewall">
                  <div
                    className="audit-maker-tableHeader"
                    style={{
                      gridTemplateColumns: selectedFwCols.map(col => col.key === '__actions__' ? '200px' : col.key === '__approval__' ? '100px' : '1fr').join(' ')
                    }}
                  >
                    {selectedFwCols.map((col, index) => {
                      const isDraggable = col.key !== '__actions__' && col.key !== '__approval__';
                      return (
                        <div
                          key={col.key}
                          draggable={isDraggable}
                          onDragStart={(e) => handleHeaderDragStart(e, index, 'fw')}
                          onDragOver={(e) => handleHeaderDragOver(e, index, 'fw')}
                          onDrop={(e) => handleHeaderDrop(e, index, 'fw')}
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

                  {paginatedFirewallRules && paginatedFirewallRules.length > 0 ? (
                    paginatedFirewallRules.map((fw) => (
                      <div key={fw._id}
                        className="audit-maker-tableRow"
                        style={{
                          gridTemplateColumns: selectedFwCols.map(col => col.key === '__actions__' ? '200px' : col.key === '__approval__' ? '100px' : '1fr').join(' ')
                        }}
                      >
                        {selectedFwCols.map(col => {
                          if (col.key === '__approval__') return (
                            <div key={col.key}>
                              <span className={`badge bg-${fw.approvalStatus === 'Approved' ? 'success' : fw.approvalStatus === 'Rejected' ? 'danger' : 'warning'}`}>{fw.approvalStatus}</span>
                              {fw.approvalStatus === 'Pending' && fw.docReviewedBy === loggedInUser && (
                                <div className="mt-1 d-flex gap-1 flex-wrap">
                                  <button className="btn btn-sm btn-success py-0" onClick={() => handleStatusUpdate('firewall', fw._id, 'Approved')}>Approve</button>
                                  <button className="btn btn-sm btn-warning text-dark py-0" onClick={() => handleStatusUpdate('firewall', fw._id, 'Rejected')}>Reject</button>
                                </div>
                              )}
                            </div>
                          );
                          if (col.key === '__actions__') {
                            const isApprover = fw.docReviewedBy === loggedInUser || fw.reviewedBy === loggedInUser || docInfoForm.reviewedBy === loggedInUser;
                            return (
                              <div key={col.key}>
                                <div className="d-flex gap-2">
                                  {isApprover || isReadOnly ? (
                                     <button className="btn btn-sm btn-info text-white" onClick={() => setViewModal({ isOpen: true, data: { ...fw, __type: 'firewall' }, tab: 'assets' })}>View</button>
                                  ) : (
                                    <>
                                      <button className="btn btn-sm btn-info text-white" onClick={() => setViewModal({ isOpen: true, data: { ...fw, __type: 'firewall' }, tab: 'assets' })}>View</button>
                                      <button className="btn btn-sm btn-primary" onClick={() => openEditModal('firewall', fw)}>Edit</button>
                                      <button className="btn btn-sm btn-danger" onClick={() => openDeleteModal('firewall', fw._id)}>Delete</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          if (col.key === 'reviewDate') return <div key={col.key}>{fw.reviewDate ? new Date(fw.reviewDate).toLocaleDateString() : ''}</div>;
                          return <div key={col.key}>{fw[col.key]}</div>;
                        })}
                      </div>
                    ))
                  ) : (
                    <div className="audit-maker-tableEmpty">No firewall rules found</div>
                  )}
                </div>
              </div>
              {filteredFirewallRules && filteredFirewallRules.length > 0 && (
                <FirewallPagination
                  totalItems={filteredFirewallRules.length}
                  pageSize={fwPageSize}
                  currentPage={fwCurrentPage}
                  onPageChange={(p) => setFwCurrentPage(p)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {editModal.isOpen && editModal.type === 'access' && (
        <div className="modal show d-block modal-overflow-visible" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title">{editModal.isView ? 'View User Access Review' : 'Edit User Access Review'}</h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <div className="modal-body document-info-card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="border rounded p-3 mb-3" style={{ background: '#f9f9fb' }}>
                  <div className="row g-2">
                    <div className="col-md-6"><label>User <span style={{color:'red'}}>*</span></label><input className="form-control" value={editForm.user} disabled /></div>
                    <div className="col-md-6">
                      <label>Role <span style={{color:'red'}}>*</span></label>
                      <CustomDropdown
                        options={[
                          { value: "IT Administrator", label: "IT Administrator" },
                          { value: "Developer", label: "Developer" },
                          { value: "CISO", label: "CISO" },
                          { value: "HR Manager", label: "HR Manager" },
                          { value: "Operations", label: "Operations" },
                          { value: "Executive", label: "Executive" }
                        ]}
                        value={editForm.role}
                        onChange={val => !editModal.isView && setEditForm({ ...editForm, role: val })}
                        placeholder="Select Role"
                        disabled={editModal.isView}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="d-block">AWS Console</label>
                      <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editAwsConsole" id="editAwsAdmin" value="Admin" checked={editForm.awsConsoleValue === 'Admin'} onChange={e => !editModal.isView && setEditForm({ ...editForm, awsConsoleValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editAwsAdmin">Admin</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editAwsConsole" id="editAwsReadOnly" value="Read Only" checked={editForm.awsConsoleValue === 'Read Only'} onChange={e => !editModal.isView && setEditForm({ ...editForm, awsConsoleValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editAwsReadOnly">Read Only</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editAwsConsole" id="editAwsAudit" value="Audit/Read Only" checked={editForm.awsConsoleValue === 'Audit/Read Only'} onChange={e => !editModal.isView && setEditForm({ ...editForm, awsConsoleValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editAwsAudit">Audit/Read Only</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editAwsConsole" id="editAwsNo" value="No" checked={editForm.awsConsoleValue === 'No'} onChange={e => !editModal.isView && setEditForm({ ...editForm, awsConsoleValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editAwsNo">No</label>
                        </div>
                      </div>
                      <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                      <input className="form-control" placeholder="Description/Purpose" value={editForm.awsConsoleDesc || ''} onChange={e => !editModal.isView && setEditForm({ ...editForm, awsConsoleDesc: e.target.value })} disabled={editModal.isView} />
                    </div>
                    <div className="col-md-6">
                      <label className="d-block">EC2 Server</label>
                      <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editEc2Server" id="editEc2Admin" value="Admin" checked={editForm.ec2ServerValue === 'Admin'} onChange={e => !editModal.isView && setEditForm({ ...editForm, ec2ServerValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editEc2Admin">Admin</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editEc2Server" id="editEc2ReadOnly" value="Read Only" checked={editForm.ec2ServerValue === 'Read Only'} onChange={e => !editModal.isView && setEditForm({ ...editForm, ec2ServerValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editEc2ReadOnly">Read Only</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editEc2Server" id="editEc2No" value="No" checked={editForm.ec2ServerValue === 'No'} onChange={e => !editModal.isView && setEditForm({ ...editForm, ec2ServerValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editEc2No">No</label>
                        </div>
                      </div>
                      <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                      <input className="form-control" placeholder="Description/Purpose" value={editForm.ec2ServerDesc || ''} onChange={e => !editModal.isView && setEditForm({ ...editForm, ec2ServerDesc: e.target.value })} disabled={editModal.isView} />
                    </div>
                    <div className="col-md-6">
                      <label className="d-block">Database</label>
                      <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editDatabase" id="editDbAdmin" value="Admin" checked={editForm.databaseValue === 'Admin'} onChange={e => !editModal.isView && setEditForm({ ...editForm, databaseValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editDbAdmin">Admin</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editDatabase" id="editDbReadOnly" value="Read Only" checked={editForm.databaseValue === 'Read Only'} onChange={e => !editModal.isView && setEditForm({ ...editForm, databaseValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editDbReadOnly">Read Only</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editDatabase" id="editDbNo" value="No" checked={editForm.databaseValue === 'No'} onChange={e => !editModal.isView && setEditForm({ ...editForm, databaseValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editDbNo">No</label>
                        </div>
                      </div>
                      <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                      <input className="form-control" placeholder="Description/Purpose" value={editForm.databaseDesc || ''} onChange={e => !editModal.isView && setEditForm({ ...editForm, databaseDesc: e.target.value })} disabled={editModal.isView} />
                    </div>
                    <div className="col-md-6">
                      <label className="d-block">KMS/Secrets</label>
                      <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editKmsSecrets" id="editKmsAdmin" value="Admin" checked={editForm.kmsSecrets === 'Admin'} onChange={e => !editModal.isView && setEditForm({ ...editForm, kmsSecrets: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editKmsAdmin">Admin</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editKmsSecrets" id="editKmsNo" value="No" checked={editForm.kmsSecrets === 'No'} onChange={e => !editModal.isView && setEditForm({ ...editForm, kmsSecrets: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editKmsNo">No</label>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="d-block">Git Repo</label>
                      <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editGitRepo" id="editGitReadWrite" value="Read/Write" checked={editForm.gitRepositoryValue === 'Read/Write'} onChange={e => !editModal.isView && setEditForm({ ...editForm, gitRepositoryValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editGitReadWrite">Read/Write</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editGitRepo" id="editGitNo" value="No" checked={editForm.gitRepositoryValue === 'No'} onChange={e => !editModal.isView && setEditForm({ ...editForm, gitRepositoryValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editGitNo">No</label>
                        </div>
                      </div>
                      <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                      <input className="form-control" placeholder="Description/Purpose" value={editForm.gitRepositoryDesc || ''} onChange={e => !editModal.isView && setEditForm({ ...editForm, gitRepositoryDesc: e.target.value })} disabled={editModal.isView} />
                    </div>
                    <div className="col-md-6">
                      <label className="d-block">Firewall/WAF</label>
                      <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editFirewallWaf" id="editFwAdmin" value="Admin" checked={editForm.firewallWaf === 'Admin'} onChange={e => !editModal.isView && setEditForm({ ...editForm, firewallWaf: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editFwAdmin">Admin</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editFirewallWaf" id="editFwReviewOnly" value="Review only" checked={editForm.firewallWaf === 'Review only'} onChange={e => !editModal.isView && setEditForm({ ...editForm, firewallWaf: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editFwReviewOnly">Review only</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editFirewallWaf" id="editFwNo" value="No" checked={editForm.firewallWaf === 'No'} onChange={e => !editModal.isView && setEditForm({ ...editForm, firewallWaf: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editFwNo">No</label>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="d-block">Prod Deploy</label>
                      <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editProdDeploy" id="editProdDeployYes" value="Yes" checked={editForm.productionDeployValue === 'Yes'} onChange={e => !editModal.isView && setEditForm({ ...editForm, productionDeployValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editProdDeployYes">Yes</label>
                        </div>
                        <div className="form-check form-check-inline m-0">
                          <input className="form-check-input" type="radio" name="editProdDeploy" id="editProdDeployNo" value="No" checked={editForm.productionDeployValue === 'No'} onChange={e => !editModal.isView && setEditForm({ ...editForm, productionDeployValue: e.target.value })} disabled={editModal.isView} />
                          <label className="form-check-label" htmlFor="editProdDeployNo">No</label>
                        </div>
                      </div>
                      <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                      <input className="form-control" placeholder="Description/Purpose" value={editForm.productionDeployDesc || ''} onChange={e => !editModal.isView && setEditForm({ ...editForm, productionDeployDesc: e.target.value })} disabled={editModal.isView} />
                    </div>

                    {/* ── Custom Fields Section ── */}
                    <div className="col-12">
                      <div style={{ borderTop: '1px dashed #d0d0e0', marginTop: '8px', paddingTop: '10px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#555' }}>Custom Fields</span>
                          {!editModal.isView && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              style={{ fontSize: '0.75rem', padding: '3px 12px' }}
                              onClick={() => openCustomFieldModal(-1)}
                            >
                              + Add Custom Field
                            </button>
                          )}
                        </div>
                        {(editForm.customFields || []).length === 0 && (
                          <p style={{ fontSize: '0.78rem', color: '#aaa', margin: 0 }}>No custom fields yet. Click "+ Add Custom Field" to define a field.</p>
                        )}
                        {(editForm.customFields || []).length > 0 && (
                          <div className="row g-2">
                            {(editForm.customFields || []).map((cf, fi) => (
                              <div key={fi} className="col-md-6">
                                <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '4px' }}>
                                  <label className="d-block" style={{ margin: 0 }}>
                                    {cf.label}
                                  </label>
                                  {!editModal.isView && (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      style={{ padding: '1px 7px', fontSize: '0.72rem', lineHeight: 1.4 }}
                                      onClick={() => {
                                        setEditForm({
                                          ...editForm,
                                          customFields: editForm.customFields.filter((_, i) => i !== fi)
                                        });
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>

                                {(!cf.type || cf.type === 'text') && (
                                  <input
                                    className="form-control"
                                    placeholder={`Enter ${cf.label}`}
                                    value={cf.value || ''}
                                    onChange={e => {
                                      setEditForm({
                                        ...editForm,
                                        customFields: editForm.customFields.map((item, i) => i === fi ? { ...item, value: e.target.value } : item)
                                      });
                                    }}
                                    disabled={editModal.isView}
                                  />
                                )}

                                {cf.type === 'textarea' && (
                                  <textarea
                                    className="form-control"
                                    rows={2}
                                    placeholder={`Enter ${cf.label}`}
                                    value={cf.value || ''}
                                    onChange={e => {
                                      setEditForm({
                                        ...editForm,
                                        customFields: editForm.customFields.map((item, i) => i === fi ? { ...item, value: e.target.value } : item)
                                      });
                                    }}
                                    disabled={editModal.isView}
                                  />
                                )}

                                {cf.type === 'radio' && (
                                  <div className="d-flex align-items-center flex-wrap gap-3" style={{ minHeight: '32px' }}>
                                    {(cf.radioOptions || []).map((opt, oi) => (
                                      <div key={oi} className="form-check form-check-inline m-0">
                                        <input
                                          className="form-check-input"
                                          type="radio"
                                          name={`edit-custom-${fi}`}
                                          id={`edit-custom-${fi}-${oi}`}
                                          value={opt}
                                          checked={cf.value === opt}
                                          onChange={() => {
                                            setEditForm({
                                              ...editForm,
                                              customFields: editForm.customFields.map((item, i) => i === fi ? { ...item, value: opt } : item)
                                            });
                                          }}
                                          disabled={editModal.isView}
                                        />
                                        <label className="form-check-label" htmlFor={`edit-custom-${fi}-${oi}`}>
                                          {opt}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="d-block mb-2">Reviewed By</label>
                      <CustomDropdown
                        options={employees.filter(emp => emp.name !== loggedInUser).map(emp => ({ value: emp.name, label: emp.name }))}
                        value={editForm.reviewedBy}
                        onChange={val => !editModal.isView && setEditForm({ ...editForm, reviewedBy: val })}
                        placeholder="Select Reviewer"
                        disabled={editModal.isView}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="d-block mb-2">Review Date</label>
                      <CustomDatePicker disabled={editModal.isView} className="form-control" value={editForm.reviewDate ? editForm.reviewDate.split('T')[0] : ''} onChange={e => !editModal.isView && setEditForm({...editForm, reviewDate: e.target.value})} />
                    </div>

                  </div>
                </div>
                <div style={{ height: '160px' }}></div>
              </div>
              <div className="d-flex justify-content-end gap-3 p-3 pt-0 border-0">
                {editModal.isView ? (
                  <button className="btn btn-secondary" style={{ minWidth: '100px' }} onClick={closeEditModal}>Close</button>
                ) : (
                  <>
                    <button className="btn btn-small-cancel" style={{ minWidth: '120px' }} onClick={() => handleEditSubmit('Draft')}>Save as Draft</button>
                    <button className="btn btn-update" style={{ minWidth: '150px' }} onClick={() => handleEditSubmit('Pending')}>Submit for Approval</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editModal.isOpen && editModal.type === 'firewall' && (
        <div className="modal show d-block modal-overflow-visible" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editModal.isView ? 'View Firewall Rule' : 'Edit Firewall Rule'}</h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <div className="modal-body document-info-card">
                <div className="row g-3">
                  <div className="col-md-6"><label>Type</label><input className="form-control" disabled={editModal.isView} value={editForm.firewallType} onChange={e => setEditForm({...editForm, firewallType: e.target.value})} /></div>
                  <div className="col-md-6"><label>Rule ID</label><input className="form-control" disabled={editModal.isView} value={editForm.ruleId} onChange={e => setEditForm({...editForm, ruleId: e.target.value})} /></div>
                  <div className="col-md-4"><label>Source</label><input className="form-control" disabled={editModal.isView} value={editForm.source} onChange={e => setEditForm({...editForm, source: e.target.value})} /></div>
                  <div className="col-md-4"><label>Destination</label><input className="form-control" disabled={editModal.isView} value={editForm.destination} onChange={e => setEditForm({...editForm, destination: e.target.value})} /></div>
                  <div className="col-md-4"><label>Action</label><input className="form-control" disabled={editModal.isView} value={editForm.action} onChange={e => setEditForm({...editForm, action: e.target.value})} /></div>
                  <div className="col-md-6"><label>Justification</label><input className="form-control" disabled={editModal.isView} value={editForm.businessJustification} onChange={e => setEditForm({...editForm, businessJustification: e.target.value})} /></div>
                  <div className="col-md-6"><label>Implemented By</label><input className="form-control" disabled={editModal.isView} value={editForm.implementedBy} onChange={e => setEditForm({...editForm, implementedBy: e.target.value})} /></div>
                  <div className="col-md-6">
                    <label>Reviewed By</label>
                    <CustomDropdown
                      options={employees.filter(emp => emp.name !== loggedInUser).map(emp => ({ value: emp.name, label: emp.name }))}
                      value={editForm.reviewedBy}
                      onChange={val => !editModal.isView && setEditForm({ ...editForm, reviewedBy: val })}
                      placeholder="Select Reviewer"
                      disabled={editModal.isView}
                    />
                  </div>
                  <div className="col-md-6"><label>Review Date</label><CustomDatePicker disabled={editModal.isView} className="form-control" value={editForm.reviewDate ? editForm.reviewDate.split('T')[0] : ''} onChange={e => setEditForm({...editForm, reviewDate: e.target.value})} /></div>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-3 p-3 pt-0 border-0">
                {editModal.isView ? (
                  <button className="btn btn-secondary" style={{ minWidth: '100px' }} onClick={closeEditModal}>Close</button>
                ) : (
                  <>
                    <button className="btn btn-small-cancel" style={{ minWidth: '120px' }} onClick={() => handleEditSubmit('Draft')}>Save as Draft</button>
                    <button className="btn btn-update" style={{ minWidth: '150px' }} onClick={() => handleEditSubmit('Pending')}>Submit for Approval</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editModal.isOpen && editModal.type === 'revision' && (
        <div className="modal show d-block modal-overflow-visible" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editModal.isView ? 'View Revision History' : 'Edit Revision History'}</h5>
                <button type="button" className="btn-close" onClick={closeEditModal}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><label>Change Date</label><CustomDatePicker disabled={editModal.isView} className="form-control" value={editForm.changeDate ? editForm.changeDate.split('T')[0] : ''} onChange={e => setEditForm({...editForm, changeDate: e.target.value})} /></div>
                  <div className="col-md-6"><label>Description</label><input className="form-control" disabled={editModal.isView} value={editForm.changeDescription} onChange={e => setEditForm({...editForm, changeDescription: e.target.value})} /></div>
                  <div className="col-md-6"><label>Effective Date</label><CustomDatePicker disabled={editModal.isView} className="form-control" value={editForm.changeEffectiveDate ? editForm.changeEffectiveDate.split('T')[0] : ''} onChange={e => setEditForm({...editForm, changeEffectiveDate: e.target.value})} /></div>
                  <div className="col-md-3"><label>Old Version</label><input className="form-control" disabled={editModal.isView} value={editForm.oldVersion} onChange={e => setEditForm({...editForm, oldVersion: e.target.value})} /></div>
                  <div className="col-md-3"><label>New Version</label><input className="form-control" disabled={editModal.isView} value={editForm.newVersion} onChange={e => setEditForm({...editForm, newVersion: e.target.value})} /></div>
                  <div className="col-md-6">
                    <label>Done By</label>
                    <CustomDropdown
                      options={employees.map(emp => ({ value: emp.name, label: emp.name }))}
                      value={editForm.changeDoneBy}
                      onChange={val => !editModal.isView && setEditForm({ ...editForm, changeDoneBy: val })}
                      placeholder="Select Author"
                      disabled={editModal.isView}
                    />
                  </div>
                  <div className="col-md-6">
                    <label>Approved By</label>
                    <CustomDropdown
                      options={employees.filter(emp => emp.name !== loggedInUser).map(emp => ({ value: emp.name, label: emp.name }))}
                      value={editForm.changeReviewedAndApprovedBy}
                      onChange={val => !editModal.isView && setEditForm({ ...editForm, changeReviewedAndApprovedBy: val })}
                      placeholder="Select Approver"
                      disabled={editModal.isView}
                    />
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-3 p-3 pt-0 border-0">
                {editModal.isView ? (
                  <button className="btn btn-secondary" style={{ minWidth: '100px' }} onClick={closeEditModal}>Close</button>
                ) : (
                  <>
                    <button className="btn btn-small-cancel" style={{ minWidth: '120px' }} onClick={() => handleEditSubmit('Draft')}>Save as Draft</button>
                    <button className="btn btn-update" style={{ minWidth: '150px' }} onClick={() => handleEditSubmit('Pending')}>Submit for Approval</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                <button className="btn btn-reject" style={{ minWidth: '100px' }} onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {createModal.isOpen && createModal.type === 'access' && (
        <div className="modal show d-block modal-overflow-visible" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title">Create User Access Review</h5>
                <button type="button" className="btn-close" onClick={() => { closeCreateModal(); setAccessReviewRows([emptyAccessRow()]); }}></button>
              </div>
              <div className="modal-body document-info-card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {accessReviewRows.map((row, index) => (
                  <div key={index} className="border rounded p-3 mb-3" style={{ background: '#f9f9fb', position: 'relative' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong style={{ fontSize: '0.9rem', color: '#555' }}>Row {index + 1}</strong>
                      {accessReviewRows.length > 1 && (
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => removeAccessRow(index)}>✕ Remove</button>
                      )}
                    </div>
                    <div className="row g-2">
                      <div className="col-md-6"><label>User <span style={{color:'red'}}>*</span></label><input className="form-control" value={row.user} disabled placeholder="User" /></div>
                      <div className="col-md-6">
                        <label>Role <span style={{color:'red'}}>*</span></label>
                        <CustomDropdown
                          options={[
                            { value: "IT Administrator", label: "IT Administrator" },
                            { value: "Developer", label: "Developer" },
                            { value: "CISO", label: "CISO" },
                            { value: "HR Manager", label: "HR Manager" },
                            { value: "Operations", label: "Operations" },
                            { value: "Executive", label: "Executive" }
                          ]}
                          value={row.role}
                          onChange={val => updateAccessRow(index, 'role', val)}
                          placeholder="Select Role"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="d-block">AWS Console</label>
                        <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`awsConsole-${index}`} id={`awsAdmin-${index}`} value="Admin" checked={row.awsConsoleValue === 'Admin'} onChange={e => updateAccessRow(index, 'awsConsoleValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`awsAdmin-${index}`}>Admin</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`awsConsole-${index}`} id={`awsReadOnly-${index}`} value="Read Only" checked={row.awsConsoleValue === 'Read Only'} onChange={e => updateAccessRow(index, 'awsConsoleValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`awsReadOnly-${index}`}>Read Only</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`awsConsole-${index}`} id={`awsAudit-${index}`} value="Audit/Read Only" checked={row.awsConsoleValue === 'Audit/Read Only'} onChange={e => updateAccessRow(index, 'awsConsoleValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`awsAudit-${index}`}>Audit/Read Only</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`awsConsole-${index}`} id={`awsNo-${index}`} value="No" checked={row.awsConsoleValue === 'No'} onChange={e => updateAccessRow(index, 'awsConsoleValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`awsNo-${index}`}>No</label>
                          </div>
                        </div>
                        <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                        <input className="form-control" placeholder="Description/Purpose" value={row.awsConsoleDesc} onChange={e => updateAccessRow(index, 'awsConsoleDesc', e.target.value)} />
                      </div>
                      <div className="col-md-6">
                        <label className="d-block">EC2 Server</label>
                        <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`ec2Server-${index}`} id={`ec2Admin-${index}`} value="Admin" checked={row.ec2ServerValue === 'Admin'} onChange={e => updateAccessRow(index, 'ec2ServerValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`ec2Admin-${index}`}>Admin</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`ec2Server-${index}`} id={`ec2ReadOnly-${index}`} value="Read Only" checked={row.ec2ServerValue === 'Read Only'} onChange={e => updateAccessRow(index, 'ec2ServerValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`ec2ReadOnly-${index}`}>Read Only</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`ec2Server-${index}`} id={`ec2No-${index}`} value="No" checked={row.ec2ServerValue === 'No'} onChange={e => updateAccessRow(index, 'ec2ServerValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`ec2No-${index}`}>No</label>
                          </div>
                        </div>
                        <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                        <input className="form-control" placeholder="Description/Purpose" value={row.ec2ServerDesc} onChange={e => updateAccessRow(index, 'ec2ServerDesc', e.target.value)} />
                      </div>
                      <div className="col-md-6">
                        <label className="d-block">Database</label>
                        <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`database-${index}`} id={`dbAdmin-${index}`} value="Admin" checked={row.databaseValue === 'Admin'} onChange={e => updateAccessRow(index, 'databaseValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`dbAdmin-${index}`}>Admin</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`database-${index}`} id={`dbReadOnly-${index}`} value="Read Only" checked={row.databaseValue === 'Read Only'} onChange={e => updateAccessRow(index, 'databaseValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`dbReadOnly-${index}`}>Read Only</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`database-${index}`} id={`dbNo-${index}`} value="No" checked={row.databaseValue === 'No'} onChange={e => updateAccessRow(index, 'databaseValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`dbNo-${index}`}>No</label>
                          </div>
                        </div>
                        <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                        <input className="form-control" placeholder="Description/Purpose" value={row.databaseDesc} onChange={e => updateAccessRow(index, 'databaseDesc', e.target.value)} />
                      </div>
                      <div className="col-md-6">
                        <label className="d-block">KMS/Secrets</label>
                        <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`kmsSecrets-${index}`} id={`kmsAdmin-${index}`} value="Admin" checked={row.kmsSecrets === 'Admin'} onChange={e => updateAccessRow(index, 'kmsSecrets', e.target.value)} />
                            <label className="form-check-label" htmlFor={`kmsAdmin-${index}`}>Admin</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`kmsSecrets-${index}`} id={`kmsNo-${index}`} value="No" checked={row.kmsSecrets === 'No'} onChange={e => updateAccessRow(index, 'kmsSecrets', e.target.value)} />
                            <label className="form-check-label" htmlFor={`kmsNo-${index}`}>No</label>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="d-block">Git Repo</label>
                        <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`gitRepo-${index}`} id={`gitReadWrite-${index}`} value="Read/Write" checked={row.gitRepositoryValue === 'Read/Write'} onChange={e => updateAccessRow(index, 'gitRepositoryValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`gitReadWrite-${index}`}>Read/Write</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`gitRepo-${index}`} id={`gitNo-${index}`} value="No" checked={row.gitRepositoryValue === 'No'} onChange={e => updateAccessRow(index, 'gitRepositoryValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`gitNo-${index}`}>No</label>
                          </div>
                        </div>
                        <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                        <input className="form-control" placeholder="Description/Purpose" value={row.gitRepositoryDesc} onChange={e => updateAccessRow(index, 'gitRepositoryDesc', e.target.value)} />
                      </div>
                      <div className="col-md-6">
                        <label className="d-block">Firewall/WAF</label>
                        <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`firewallWaf-${index}`} id={`fwAdmin-${index}`} value="Admin" checked={row.firewallWaf === 'Admin'} onChange={e => updateAccessRow(index, 'firewallWaf', e.target.value)} />
                            <label className="form-check-label" htmlFor={`fwAdmin-${index}`}>Admin</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`firewallWaf-${index}`} id={`fwReviewOnly-${index}`} value="Review only" checked={row.firewallWaf === 'Review only'} onChange={e => updateAccessRow(index, 'firewallWaf', e.target.value)} />
                            <label className="form-check-label" htmlFor={`fwReviewOnly-${index}`}>Review only</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`firewallWaf-${index}`} id={`fwNo-${index}`} value="No" checked={row.firewallWaf === 'No'} onChange={e => updateAccessRow(index, 'firewallWaf', e.target.value)} />
                            <label className="form-check-label" htmlFor={`fwNo-${index}`}>No</label>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="d-block">Prod Deploy</label>
                        <div className="d-flex align-items-center flex-wrap gap-3 mb-2" style={{ minHeight: '32px' }}>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`prodDeploy-${index}`} id={`prodDeployYes-${index}`} value="Yes" checked={row.productionDeployValue === 'Yes'} onChange={e => updateAccessRow(index, 'productionDeployValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`prodDeployYes-${index}`}>Yes</label>
                          </div>
                          <div className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" name={`prodDeploy-${index}`} id={`prodDeployNo-${index}`} value="No" checked={row.productionDeployValue === 'No'} onChange={e => updateAccessRow(index, 'productionDeployValue', e.target.value)} />
                            <label className="form-check-label" htmlFor={`prodDeployNo-${index}`}>No</label>
                          </div>
                        </div>
                        <label style={{ fontSize: '11px', color: '#868585', display: 'block', marginTop: '5px', marginBottom: '2px' }}>Add Description :</label>
                        <input className="form-control" placeholder="Description/Purpose" value={row.productionDeployDesc} onChange={e => updateAccessRow(index, 'productionDeployDesc', e.target.value)} />
                      </div>

                      {/* ── Custom Fields Section ── */}
                      <div className="col-12">
                        <div style={{ borderTop: '1px dashed #d0d0e0', marginTop: '8px', paddingTop: '10px' }}>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#555' }}>Custom Fields</span>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              style={{ fontSize: '0.75rem', padding: '3px 12px' }}
                              onClick={() => openCustomFieldModal(index)}
                            >
                              + Add Custom Field
                            </button>
                          </div>
                          {(row.customFields || []).length === 0 && (
                            <p style={{ fontSize: '0.78rem', color: '#aaa', margin: 0 }}>No custom fields yet. Click "+ Add Custom Field" to define a field.</p>
                          )}
                          {(row.customFields || []).length > 0 && (
                            <div className="row g-2">
                              {(row.customFields || []).map((cf, fi) => (
                                <div key={fi} className="col-md-6">
                                  {/* Label row — same style as "AWS Console", "EC2 Server" etc. */}
                                  <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '4px' }}>
                                    <label className="d-block" style={{ margin: 0 }}>
                                      {cf.label}
                                    </label>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      style={{ padding: '1px 7px', fontSize: '0.72rem', lineHeight: 1.4 }}
                                      onClick={() => removeCustomField(index, fi)}
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  {/* Text input — same form-control as other fields */}
                                  {(!cf.type || cf.type === 'text') && (
                                    <input
                                      className="form-control"
                                      placeholder={`Enter ${cf.label}`}
                                      value={cf.value || ''}
                                      onChange={e => updateCustomFieldValue(index, fi, e.target.value)}
                                    />
                                  )}

                                  {/* Textarea — same form-control */}
                                  {cf.type === 'textarea' && (
                                    <textarea
                                      className="form-control"
                                      rows={2}
                                      placeholder={`Enter ${cf.label}`}
                                      value={cf.value || ''}
                                      onChange={e => updateCustomFieldValue(index, fi, e.target.value)}
                                    />
                                  )}

                                  {/* Radio — same pattern as AWS Console / EC2 Server radios above */}
                                  {cf.type === 'radio' && (
                                    <div className="d-flex align-items-center flex-wrap gap-3" style={{ minHeight: '32px' }}>
                                      {(cf.radioOptions || []).map((opt, oi) => (
                                        <div key={oi} className="form-check form-check-inline m-0">
                                          <input
                                            className="form-check-input"
                                            type="radio"
                                            name={`custom-${index}-${fi}`}
                                            id={`custom-${index}-${fi}-${oi}`}
                                            value={opt}
                                            checked={cf.value === opt}
                                            onChange={() => updateCustomFieldValue(index, fi, opt)}
                                          />
                                          <label className="form-check-label" htmlFor={`custom-${index}-${fi}-${oi}`}>
                                            {opt}
                                          </label>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="col-md-6">
                        <label className="d-block mb-2">Reviewed By</label>
                        <CustomDropdown
                          options={employees.filter(emp => emp.name !== loggedInUser).map(emp => ({ value: emp.name, label: emp.name }))}
                          value={row.reviewedBy}
                          onChange={val => updateAccessRow(index, 'reviewedBy', val)}
                          placeholder="Select Reviewer"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="d-block mb-2">Review Date</label>
                        <CustomDatePicker className="form-control" value={row.reviewDate ? row.reviewDate.split('T')[0] : ''} onChange={e => updateAccessRow(index, 'reviewDate', e.target.value)} />
                      </div>

                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-outline-primary w-100" onClick={addAccessRow}>
                  + Add Another Row
                </button>
                {/* <div style={{ height: '200px' }}></div> */}
              </div>
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 p-3 pt-2 border-0">
                <span style={{ fontSize: '0.85rem', color: '#888' }}>{accessReviewRows.length} row(s) — {accessReviewRows.length > 1 ? 'ONE revision history entry will be created for all rows' : 'One revision history entry will be created'}</span>
                <div className="d-flex gap-2">
                  <button className="btn btn-small-cancel" style={{ minWidth: '100px' }} onClick={() => saveAccessReview('Draft')}>Draft</button>
                  <button className="btn btn-update" style={{ minWidth: '100px' }} onClick={() => saveAccessReview('Pending')}>Submit</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {createModal.isOpen && createModal.type === 'firewall' && (
        <div className="modal show d-block modal-overflow-visible" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title">Create Firewall Rule</h5>
                <button type="button" className="btn-close" onClick={() => { closeCreateModal(); setFirewallRows([emptyFirewallRow()]); }}></button>
              </div>
              <div className="modal-body document-info-card" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {firewallRows.map((row, index) => (
                  <div key={index} className="border rounded p-3 mb-3" style={{ background: '#f9f9fb', position: 'relative' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong style={{ fontSize: '0.9rem', color: '#555' }}>Row {index + 1}</strong>
                      {firewallRows.length > 1 && (
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => removeFirewallRow(index)}>✕ Remove</button>
                      )}
                    </div>
                    <div className="row g-2">
                      <div className="col-md-6"><label>Type <span style={{color:'red'}}>*</span></label><input className="form-control" value={row.firewallType} onChange={e => updateFirewallRow(index, 'firewallType', e.target.value)} placeholder="Type" /></div>
                      <div className="col-md-6"><label>Rule ID <span style={{color:'red'}}>*</span></label><input className="form-control" value={row.ruleId} onChange={e => updateFirewallRow(index, 'ruleId', e.target.value)} placeholder="Rule ID" /></div>
                      <div className="col-md-4"><label>Source</label><input className="form-control" value={row.source} onChange={e => updateFirewallRow(index, 'source', e.target.value)} placeholder="Source" /></div>
                      <div className="col-md-4"><label>Destination</label><input className="form-control" value={row.destination} onChange={e => updateFirewallRow(index, 'destination', e.target.value)} placeholder="Destination" /></div>
                      <div className="col-md-4"><label>Action</label><input className="form-control" value={row.action} onChange={e => updateFirewallRow(index, 'action', e.target.value)} placeholder="Action" /></div>
                      <div className="col-md-6"><label>Justification</label><input className="form-control" value={row.businessJustification} onChange={e => updateFirewallRow(index, 'businessJustification', e.target.value)} placeholder="Justification" /></div>
                      <div className="col-md-6"><label>Implemented By</label><input className="form-control" value={row.implementedBy} onChange={e => updateFirewallRow(index, 'implementedBy', e.target.value)} placeholder="By" /></div>
                      <div className="col-md-6">
                        <label>Reviewed By</label>
                        <CustomDropdown
                          options={employees.filter(emp => emp.name !== loggedInUser).map(emp => ({ value: emp.name, label: emp.name }))}
                          value={row.reviewedBy}
                          onChange={val => updateFirewallRow(index, 'reviewedBy', val)}
                          placeholder="Select Reviewer"
                        />
                      </div>
                      <div className="col-md-6"><label>Review Date</label><CustomDatePicker className="form-control" value={row.reviewDate ? row.reviewDate.split('T')[0] : ''} onChange={e => updateFirewallRow(index, 'reviewDate', e.target.value)} /></div>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-outline-primary w-100" onClick={addFirewallRow}>
                  + Add Another Row
                </button>
                {/* <div style={{ height: '120px' }}></div> */}
              </div>
              <div className="d-flex justify-content-between align-items-center gap-3 p-3 pt-2 border-0">
                <span style={{ fontSize: '0.85rem', color: '#888' }}>{firewallRows.length} row(s) — {firewallRows.length > 1 ? 'ONE revision history entry will be created for all rows' : 'One revision history entry will be created'}</span>
                <div className="d-flex gap-2">
                  <button className="btn btn-small-cancel" style={{ minWidth: '100px' }} onClick={() => saveFirewallRule('Draft')}>Draft</button>
                  <button className="btn btn-update" style={{ minWidth: '100px' }} onClick={() => saveFirewallRule('Pending')}>Submit</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {createModal.isOpen && createModal.type === 'revision' && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0">
                <h5 className="modal-title">Create Revision History</h5>
                <button type="button" className="btn-close" onClick={closeCreateModal}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6"><label>Change Date</label><CustomDatePicker className="form-control" value={revisionForm.changeDate} onChange={e => setRevisionForm({...revisionForm, changeDate: e.target.value})} /></div>
                  <div className="col-md-6"><label>Description</label><input className="form-control" value={revisionForm.changeDescription} onChange={e => setRevisionForm({...revisionForm, changeDescription: e.target.value})} placeholder="Description" /></div>
                  <div className="col-md-6"><label>Effective Date</label><CustomDatePicker className="form-control" value={revisionForm.changeEffectiveDate} onChange={e => setRevisionForm({...revisionForm, changeEffectiveDate: e.target.value})} /></div>
                  <div className="col-md-3"><label>Old Version</label><input className="form-control" value={revisionForm.oldVersion} onChange={e => setRevisionForm({...revisionForm, oldVersion: e.target.value})} /></div>
                  <div className="col-md-3"><label>New Version</label><input className="form-control" value={revisionForm.newVersion} onChange={e => setRevisionForm({...revisionForm, newVersion: e.target.value})} /></div>
                  <div className="col-md-6">
                    <label>Done By</label>
                    <CustomDropdown
                      options={employees.map(emp => ({ value: emp.name, label: emp.name }))}
                      value={revisionForm.changeDoneBy}
                      onChange={val => setRevisionForm({ ...revisionForm, changeDoneBy: val })}
                      placeholder="Select Author"
                    />
                  </div>
                  <div className="col-md-6">
                    <label>Approved By</label>
                    <CustomDropdown
                      options={employees.filter(emp => emp.name !== loggedInUser).map(emp => ({ value: emp.name, label: emp.name }))}
                      value={revisionForm.changeReviewedAndApprovedBy}
                      onChange={val => setRevisionForm({ ...revisionForm, changeReviewedAndApprovedBy: val })}
                      placeholder="Select Approver"
                    />
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end gap-3 p-3 pt-0 border-0">
                <button className="btn btn-small-cancel" style={{ minWidth: '100px' }} onClick={() => saveRevisionHistory('Draft')}>Draft</button>
                <button className="btn btn-update" style={{ minWidth: '100px' }} onClick={() => saveRevisionHistory('Pending')}>Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          Custom Field Builder Modal
          ══════════════════════════════════════════════════════ */}
      {customFieldModal.isOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '480px' }}>
            <div className="modal-content" style={{ borderRadius: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>

              {/* Header */}
              <div className="modal-header" style={{ borderBottom: '1px solid #eee', padding: '14px 20px' }}>
                <h6 className="modal-title" style={{ fontWeight: 700, color: '#333' }}>
                  Add Custom Field
                </h6>
                <button type="button" className="btn-close" onClick={closeCustomFieldModal}></button>
              </div>

              {/* Body */}
              <div className="modal-body" style={{ padding: '20px' }}>

                {/* Field Label */}
                <div className="mb-3">
                  <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#444', marginBottom: 5 }}>
                    Field Label <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. S3 Bucket, VPN Access, Custom Role..."
                    value={customFieldModal.label}
                    onChange={e => setCustomFieldModal(prev => ({ ...prev, label: e.target.value }))}
                  />
                </div>

                {/* Input Type */}
                <div className="mb-3">
                  <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#444', marginBottom: 8, display: 'block' }}>
                    Input Type <span style={{ color: 'red' }}>*</span>
                  </label>
                  <div className="d-flex gap-3 flex-wrap">
                    {[
                      { value: 'text',     label: 'Text Input',  icon: '✏️' },
                      { value: 'textarea', label: 'Text Area',   icon: '📝' },
                      { value: 'radio',    label: 'Radio (Options)', icon: '🔘' },
                    ].map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => setCustomFieldModal(prev => ({
                          ...prev,
                          type: opt.value,
                          radioOptions: opt.value === 'radio' ? (prev.radioOptions.length ? prev.radioOptions : ['']) : prev.radioOptions
                        }))}
                        style={{
                          border: `2px solid ${customFieldModal.type === opt.value ? '#0d6efd' : '#dee2e6'}`,
                          borderRadius: 8,
                          padding: '8px 14px',
                          cursor: 'pointer',
                          background: customFieldModal.type === opt.value ? '#e8f0fe' : '#fff',
                          fontSize: '0.8rem',
                          fontWeight: customFieldModal.type === opt.value ? 700 : 400,
                          color: customFieldModal.type === opt.value ? '#0d6efd' : '#555',
                          transition: 'all 0.15s',
                          userSelect: 'none',
                        }}
                      >
                        {opt.icon} {opt.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Radio Options (only shown when type === 'radio') */}
                {customFieldModal.type === 'radio' && (
                  <div className="mb-2">
                    <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#444', marginBottom: 6, display: 'block' }}>
                      Radio Options <span style={{ color: 'red' }}>*</span>
                    </label>
                    {customFieldModal.radioOptions.map((opt, oi) => (
                      <div key={oi} className="d-flex gap-2 mb-2 align-items-center">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder={`Option ${oi + 1} (e.g. Admin, Read Only, No)`}
                          value={opt}
                          onChange={e => {
                            const updated = customFieldModal.radioOptions.map((o, i) => i === oi ? e.target.value : o);
                            setCustomFieldModal(prev => ({ ...prev, radioOptions: updated }));
                          }}
                        />
                        {customFieldModal.radioOptions.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            style={{ padding: '2px 8px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                            onClick={() => {
                              const updated = customFieldModal.radioOptions.filter((_, i) => i !== oi);
                              setCustomFieldModal(prev => ({ ...prev, radioOptions: updated }));
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary mt-1"
                      style={{ fontSize: '0.75rem' }}
                      onClick={() => setCustomFieldModal(prev => ({ ...prev, radioOptions: [...prev.radioOptions, ''] }))}
                    >
                      + Add Option
                    </button>
                  </div>
                )}

                {/* Preview */}
                {customFieldModal.label.trim() && (
                  <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8f9fb', borderRadius: 8, border: '1px solid #e5e7ef' }}>
                    <p style={{ fontSize: '0.72rem', color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preview</p>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: 4, display: 'block' }}>
                      {customFieldModal.label}
                    </label>
                    {customFieldModal.type === 'text' && (
                      <input type="text" className="form-control form-control-sm" placeholder={`Enter ${customFieldModal.label}`} disabled />
                    )}
                    {customFieldModal.type === 'textarea' && (
                      <textarea className="form-control form-control-sm" rows={2} placeholder={`Enter ${customFieldModal.label}`} disabled />
                    )}
                    {customFieldModal.type === 'radio' && (
                      <div className="d-flex flex-wrap gap-3">
                        {customFieldModal.radioOptions.filter(o => o.trim()).map((opt, oi) => (
                          <div key={oi} className="form-check form-check-inline m-0">
                            <input className="form-check-input" type="radio" disabled />
                            <label className="form-check-label" style={{ fontSize: '0.8rem' }}>{opt}</label>
                          </div>
                        ))}
                        {customFieldModal.radioOptions.filter(o => o.trim()).length === 0 && (
                          <span style={{ fontSize: '0.78rem', color: '#bbb' }}>Add options above to preview</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #eee', gap: 8 }}>
                <button
                  type="button"
                  className="common-modal-btn btn-small-cancel"
                  style={{ minWidth: 80 }}
                  onClick={closeCustomFieldModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="common-modal-btn btn-update"
                  style={{ minWidth: 100 }}
                  onClick={confirmCustomField}
                >
                  Add Field
                </button>
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
                <label style={{ fontSize: '0.83rem', fontWeight: 600, color: '#444', marginBottom: 6, display: 'block' }}>
                  New Owner Name
                </label>
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
                <button type="button" className="btn btn-sm btn-primary" style={{ minWidth: 100 }} onClick={confirmOwnerValue}> Add Value</button>
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
                <h6 className="modal-title" style={{ fontWeight: 700, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src="/Filter.svg" alt="Filter" style={{ width: 25, height: 25 }} /> Configure Visible Columns - {filterActiveTable === 'access' ? 'User Access Review' : 'Firewall Rules'}
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
                        {(filterActiveTable === 'access' ? selectedAccessCols : selectedFwCols).map((col, idx) => (
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
                                disabled={idx === (filterActiveTable === 'access' ? selectedAccessCols : selectedFwCols).length - 1}
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
                        {(filterActiveTable === 'access' ? selectedAccessCols : selectedFwCols).length === 0 && (
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
                        {(filterActiveTable === 'access' ? availableAccessCols : availableFwCols).map((col, idx) => (
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
                        {(filterActiveTable === 'access' ? availableAccessCols : availableFwCols).length === 0 && (
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
                <div className="modal-header" style={{ borderBottom: 'none', padding: '14px 20px' }}>
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
                            <h6 className="mb-3 border-bottom pb-2" style={{ fontSize: '16px', color: '#3b3c58', fontWeight: 500 }}>Document Information</h6>
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
                                <strong>{latestDoc?.documentId || 'PCI-RR-001'}</strong>
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
                                <strong>{latestDoc?.documentType || 'Access Control Review'}</strong>
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
                            <div className="audit-maker-tableCard" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '260px' }}>
                              <div className="audit-maker-table" style={{ minWidth: '700px' }}>
                                {/* Header */}
                                <div className="audit-maker-tableHeader" style={{ gridTemplateColumns: '100px 1fr 100px 65px 65px 110px 110px 90px' }}>
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
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '100px 1fr 100px 65px 65px 110px 110px 90px',
                                        gap: '12px',
                                        padding: '10px 15px',
                                        borderBottom: '1px solid #f3f4fe',
                                        backgroundColor: '#fff',
                                        fontSize: '0.75rem',
                                        color: '#3A466D',
                                        alignItems: 'center'
                                      }}
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

                <div className="modal-footer border-0" style={{ padding: '12px' }}>
                  <div className="edit-modal-actions d-flex gap-2">
                    <button className="common-modal-btn btn-small-cancel" onClick={() => { setViewModal({ isOpen: false, data: null, tab: 'assets' }); setModalRevPage(1); }}>Close</button>
                    {viewModal.data.approvalStatus === 'Pending' && (viewModal.data.docReviewedBy === loggedInUser || viewModal.data.reviewedBy === loggedInUser) && (
                      <>
                        <button className="common-modal-btn btn-reject" onClick={() => handleStatusUpdate(viewModal.data.__type, viewModal.data._id, 'Rejected')}>Reject</button>
                        <button className="common-modal-btn btn-update" onClick={() => handleStatusUpdate(viewModal.data.__type, viewModal.data._id, 'Approved')}>Approve</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {rejectModal.isOpen && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title w-100 text-center font-weight-bold" style={{ color: '#333' }}>Rejection Reason</h5>
                <button type="button" className="btn-close" onClick={() => setRejectModal({ isOpen: false, type: '', id: '', status: '' })}></button>
              </div>
              <div className="modal-body py-3 px-4">
                <label className="d-block text-start mb-2" style={{ fontSize: '0.85rem', color: '#555', fontWeight: 500 }}>Enter reason for rejection:</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Reason..."
                  value={rejectReasonText}
                  onChange={e => setRejectReasonText(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
              <div className="px-3 pb-3 pt-0 d-flex flex-row flex-nowrap gap-2 justify-content-center w-100">
                <button className="btn btn-small-cancel" onClick={() => setRejectModal({ isOpen: false, type: '', id: '', status: '' })}>Cancel</button>
                <button
                  className="btn btn-reject"
                  onClick={() => {
                    if (!rejectReasonText.trim()) {
                      toast.error("Rejection reason is required");
                      return;
                    }
                    handleStatusUpdate(rejectModal.type, rejectModal.id, 'Rejected', rejectReasonText);
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </>
  );
};

export default EmployeeAuditManagement;
