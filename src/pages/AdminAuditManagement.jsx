import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { portalInstance } from '../Services/instance';
import Sidebar from '../Components/HeaderSidebar/Sidebar';
import CustomDropdown from '../Components/Common/CustomDropdown';
import Pagination from '../Components/Employee/Pagination/Pagination';
import './AdminAuditManagement.css';

const AdminAuditManagement = () => {
  const [filterStatus, setFilterStatus] = useState(''); // '' means all
  const [filterType, setFilterType] = useState('Assets Management'); // default to Assets Management
  const [recordsPerPage, setRecordsPerPage] = useState(5);
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null, tab: 'assets' });
  const [modalRevPage, setModalRevPage] = useState(1);
  const [modalRevPageSize, setModalRevPageSize] = useState(5);
  
  const [activeTab, setActiveTab] = useState('Assets'); // 'Assets' | 'Payment Scripts' | 'Vendor' | 'Employee Permission'
  const [employeePermissions, setEmployeePermissions] = useState([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [localPermissions, setLocalPermissions] = useState({});

  const fetchPermissions = async () => {
    setPermissionLoading(true);
    try {
      const res = await portalInstance.get('/menu-permission/all');
      if (res.data.success) {
        // Exclude admin users, only show employee role users
        setEmployeePermissions((res.data.data || []).filter(emp => emp.role === 'employee'));
      }
    } catch (err) {
      toast.error('Failed to fetch employee permissions');
    } finally {
      setPermissionLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (employeePermissions.length > 0) {
      const initial = {};
      employeePermissions.forEach(emp => {
        const accessPerm = emp.menus.find(m => m.module === 'Access Controller')?.permission || 'NO_ACCESS';
        const scriptPerm = emp.menus.find(m => m.module === 'Payment Script')?.permission || 'NO_ACCESS';
        const vendorPerm = emp.menus.find(m => m.module === 'Inscope Vendor')?.permission || 'NO_ACCESS';
        const isApprover = emp.isApprover || false;
        
        initial[emp.employeeId] = {
          'Access Controller': accessPerm,
          'Payment Script': scriptPerm,
          'Inscope Vendor': vendorPerm,
          'Review Approver': isApprover
        };
      });
      setLocalPermissions(initial);
    }
  }, [employeePermissions]);

  const handleLocalPermissionChange = (employeeId, moduleName, value) => {
    setLocalPermissions(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [moduleName]: value
      }
    }));
  };

  const handleSavePermission = async (emp) => {
    const perms = localPermissions[emp.employeeId] || {
      'Access Controller': 'NO_ACCESS',
      'Payment Script': 'NO_ACCESS',
      'Inscope Vendor': 'NO_ACCESS',
      'Review Approver': false
    };

    const payload = {
      employeeId: emp.employeeId,
      menus: [
        { module: 'Access Controller', permission: perms['Access Controller'] },
        { module: 'Payment Script', permission: perms['Payment Script'] },
        { module: 'Inscope Vendor', permission: perms['Inscope Vendor'] }
      ],
      isApprover: perms['Review Approver'] || false
    };

    try {
      const res = await portalInstance.post('/menu-permission/save', payload);
      if (res.data.success) {
        toast.success(`Permissions saved successfully for ${emp.employeeName}`);
        fetchPermissions();
      }
    } catch (err) {
      toast.error('Failed to save permissions');
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (tab === 'Assets') {
      setFilterType('Assets Management');
    } else if (tab === 'Payment Scripts') {
      setFilterType('Payment Scripts');
    } else if (tab === 'Vendor') {
      setFilterType('Inscope Vendor');
    }
    setCurrentPage(1);
  };
  const [auditData, setAuditData] = useState({
    accessReviews: [],
    firewallRules: [],
    documentInfos: [],
    revisionHistories: []
  });
  const [paymentScriptsData, setPaymentScriptsData] = useState({
    paymentScripts: [],
    documentInfos: [],
    revisionHistories: []
  });
  const [vendorsData, setVendorsData] = useState({
    vendors: [],
    documentInfos: [],
    revisionHistories: []
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [empFilterOpen, setEmpFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterModule, setFilterModule] = useState('Access Controller');
  const [filterPermission, setFilterPermission] = useState('All');
  const [filterApprover, setFilterApprover] = useState('All');

  const [tempFilterSearch, setTempFilterSearch] = useState('');
  const [tempFilterDept, setTempFilterDept] = useState('All');
  const [tempFilterModule, setTempFilterModule] = useState('Access Controller');
  const [tempFilterPermission, setTempFilterPermission] = useState('All');
  const [tempFilterApprover, setTempFilterApprover] = useState('All');

  const [empCurrentPage, setEmpCurrentPage] = useState(1);
  const [empRecordsPerPage, setEmpRecordsPerPage] = useState(5);

  const empFilterRef = useRef(null);

  // Close filter popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (empFilterRef.current && !empFilterRef.current.contains(e.target) && !e.target.closest('.emp-filter-icon-btn')) {
        setEmpFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    employeePermissions.forEach(emp => {
      if (emp.department) depts.add(emp.department);
    });
    return ['All', ...Array.from(depts)];
  }, [employeePermissions]);

  const filteredEmployees = useMemo(() => {
    return employeePermissions.filter(emp => {
      // 1. Search Query (Employee Name or Employee ID)
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const matchesName = emp.employeeName && emp.employeeName.toLowerCase().includes(q);
        const matchesId = emp.employeeId && emp.employeeId.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }

      // 2. Department
      if (filterDept !== 'All') {
        if (!emp.department || emp.department.toLowerCase() !== filterDept.toLowerCase()) {
          return false;
        }
      }

      // 3. Review Approver
      if (filterApprover !== 'All') {
        const isApprover = emp.isApprover || false;
        const wantApprover = filterApprover === 'Yes';
        if (isApprover !== wantApprover) return false;
      }

      // 4. Module & Permission Check
      const perms = localPermissions[emp.employeeId] || {
        'Access Controller': emp.menus?.find(m => m.module === 'Access Controller')?.permission || 'NO_ACCESS',
        'Payment Script': emp.menus?.find(m => m.module === 'Payment Script')?.permission || 'NO_ACCESS',
        'Inscope Vendor': emp.menus?.find(m => m.module === 'Inscope Vendor')?.permission || 'NO_ACCESS',
      };
      
      const permValue = perms[filterModule] || 'NO_ACCESS';

      if (filterPermission !== 'All') {
        if (filterPermission === 'Has Access') {
          if (permValue === 'NO_ACCESS') return false;
        } else if (filterPermission === 'No Access') {
          if (permValue !== 'NO_ACCESS') return false;
        } else {
          // Exact match (READ, WRITE, BOTH)
          if (permValue !== filterPermission) return false;
        }
      }

      return true;
    });
  }, [employeePermissions, localPermissions, filterSearch, filterDept, filterModule, filterPermission, filterApprover]);

  const paginatedEmployees = useMemo(() => {
    const startIndex = (empCurrentPage - 1) * empRecordsPerPage;
    return filteredEmployees.slice(startIndex, startIndex + empRecordsPerPage);
  }, [filteredEmployees, empCurrentPage, empRecordsPerPage]);
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);

  const loggedInUser = JSON.parse(sessionStorage.getItem("Erti-Portal"))?.name || '';
  const [rejectModal, setRejectModal] = useState({ isOpen: false, type: '', id: '', status: '' });
  const [rejectReasonText, setRejectReasonText] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.download-dropdown-container')) {
        setDownloadDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchData(filterStatus);
  }, [filterStatus]);

  const fetchData = async (status) => {
    setLoading(true);
    try {
      const query = status ? `?status=${status}` : '';
      const [auditRes, paymentRes, vendorRes] = await Promise.all([
        portalInstance.get(`/api/audit${query}`),
        portalInstance.get(`/api/audit/payment-scripts${query}`),
        portalInstance.get(`/api/audit/vendors${query}`)
      ]);
      if (auditRes.data.success) {
        setAuditData(auditRes.data.data);
      }
      if (paymentRes.data.success) {
        setPaymentScriptsData(paymentRes.data.data);
      }
      if (vendorRes.data.success) {
        setVendorsData(vendorRes.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch data');
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
      if (type === 'script') {
        await portalInstance.put(`/api/audit/payment-scripts/status`, { id, status, rejectReason, reviewerName: loggedInUser });
      } else if (type === 'vendor') {
        await portalInstance.put(`/api/audit/vendors/status`, { id, status, rejectReason, reviewerName: loggedInUser });
      } else {
        await portalInstance.put(`/api/audit/status`, { type, id, status, rejectReason, reviewerName: loggedInUser });
      }
      toast.success(`${type} request ${status.toLowerCase()}`);
      fetchData(filterStatus);
      setViewModal({ isOpen: false, data: null, tab: 'assets' });
      setRejectModal({ isOpen: false, type: '', id: '', status: '' });
    } catch (err) {
      toast.error(`Error updating status`);
    }
  };




  const handleDownloadAudit = async () => {
    try {
      const res = await portalInstance.get('/api/audit/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Access_Control_Review_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download Audit Excel file');
    }
  };

  const handleDownloadPaymentScripts = async () => {
    try {
      const res = await portalInstance.get('/api/audit/payment-scripts/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Authorized_Payment_Scripts_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download Payment Scripts Excel file');
    }
  };

  const handleDownloadVendors = async () => {
    try {
      const res = await portalInstance.get('/api/audit/vendors/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Inscope_Vendors_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download Vendors Excel file');
    }
  };

  const handleDownloadBoth = async () => {
    await handleDownloadAudit();
    setTimeout(() => {
      handleDownloadPaymentScripts();
    }, 1000);
    setTimeout(() => {
      handleDownloadVendors();
    }, 2000);
  };

  const allAssets = [
    ...(auditData.accessReviews || []).map(r => ({ ...r, __type: 'access' })),
    ...(auditData.firewallRules || []).map(r => ({ ...r, __type: 'firewall' })),
    ...(paymentScriptsData.paymentScripts || []).map(r => ({ ...r, __type: 'script' })),
    ...(vendorsData.vendors || []).map(r => ({ ...r, __type: 'vendor' }))
  ].sort((a, b) => new Date(b.createdAt || b.reviewDate || b.lastUpdatedDate) - new Date(a.createdAt || a.reviewDate || a.lastUpdatedDate));

  // Group records: same batchId -> one group row; no batchId -> individual row
const buildDisplayRows = (assets) => {

    const batchMap = new Map();
    const rows = [];

    assets.forEach(item => {

        // Vendors should NEVER be grouped
        if (item.__type === "vendor") {

            rows.push({
                ...item,
                __isBatch: false
            });

            return;
        }

        // Keep grouping for other modules
        if (item.batchId) {

            if (!batchMap.has(item.batchId)) {

                batchMap.set(item.batchId, {
                    __isBatch: true,
                    batchId: item.batchId,
                    __type: item.__type,
                    records: [],
                    approvalStatus: item.approvalStatus,
                    createdAt: item.createdAt
                });

                rows.push(batchMap.get(item.batchId));

            }

            batchMap.get(item.batchId).records.push(item);

        } else {

            rows.push({
                ...item,
                __isBatch: false
            });

        }

    });

    return rows;
};

  const filteredAssets = buildDisplayRows(
    allAssets.filter(item => {
      const matchesStatus = filterStatus ? item.approvalStatus === filterStatus : true;
      let matchesType = true;
      if (filterType === 'Assets Management') {
        matchesType = item.__type === 'access' || item.__type === 'firewall';
      } else if (filterType === 'Payment Scripts') {
        matchesType = item.__type === 'script';
      } else if (filterType === 'Inscope Vendor') {
        matchesType = item.__type === 'vendor';
      }
      return matchesStatus && matchesType;
    })
  );

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredAssets.slice(indexOfFirstRecord, indexOfLastRecord);

  const handleBatchStatusUpdate = async (batchRow, status) => {
    try {
      await Promise.all(batchRow.records.map(r => {
        if (r.__type === 'script') {
          return portalInstance.put(`/api/audit/payment-scripts/status`, { id: r._id, status });
        } else if (r.__type === 'vendor') {
          return portalInstance.put(`/api/audit/vendors/status`, { id: r._id, status });
        } else {
          return portalInstance.put(`/api/audit/status`, { type: r.__type, id: r._id, status });
        }
      }));
      toast.success(`All ${batchRow.records.length} records ${status.toLowerCase()}`);
      fetchData(filterStatus);
      if (viewModal.isOpen) setViewModal({ ...viewModal, data: { ...viewModal.data, approvalStatus: status } });
    } catch (err) {
      toast.error('Error updating batch status');
    }
  };

  const latestDoc = viewModal.data?.__type === 'script' ? (paymentScriptsData.documentInfos || [])[0] : (viewModal.data?.__type === 'vendor' ? (vendorsData.documentInfos || [])[0] : (auditData.documentInfos || [])[0]);

  return (
    <>
      <Sidebar />
      <div className="audit-admin-container">
        <div className="audit-admin-header">
          <h2>Audit Approval Dashboard</h2>
          <div className="dropdown download-dropdown-container" style={{ position: 'relative' }}>
            <button className="common-modal-btn btn-update" type="button" onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}>
              <i className="bi bi-download"></i> Download Options
            </button>
            {downloadDropdownOpen && (
              <ul className="dropdown-menu dropdown-menu-end shadow show" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1050, display: 'block', marginTop: '5px' }}>
                <li><button className="dropdown-item" onClick={() => { setDownloadDropdownOpen(false); handleDownloadAudit(); }}>Download Access Controller Excel</button></li>
                <li><button className="dropdown-item" onClick={() => { setDownloadDropdownOpen(false); handleDownloadPaymentScripts(); }}>Download Payment Script Excel</button></li>
                <li><button className="dropdown-item" onClick={() => { setDownloadDropdownOpen(false); handleDownloadVendors(); }}>Download Inscope Vendors Excel</button></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item" onClick={() => { setDownloadDropdownOpen(false); handleDownloadBoth(); }}>Download All</button></li>
              </ul>
            )}
          </div>
        </div>

        {/* Tab Navigation as Radio Button Group */}
        <div className="audit-tab-radio-container">
          {['Assets', 'Payment Scripts', 'Vendor', 'Employee Permission'].map((tab) => (
            <label
              key={tab}
              className={`audit-tab-radio-label ${activeTab === tab ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="auditTabSelect"
                checked={activeTab === tab}
                onChange={() => handleTabClick(tab)}
                className="audit-tab-radio-input"
              />
              {tab}
            </label>
          ))}
        </div>

        <div className="card audit-admin-card mt-4 mb-4">
          <div className="card-header d-flex justify-content-between align-items-center gap-2">
            <h5>{activeTab === 'Employee Permission' ? 'Employee Menu Permission Configuration' : 'All Audit & Payment Script Records'}</h5>
            {activeTab === 'Employee Permission' ? (
              <div className="audit-admin-filter-row d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-2 audit-admin-pagesize-group">
                  
                  <CustomDropdown
                    options={[5, 10, 20, 50, 100].map(size => ({ value: size, label: `${size}` }))}
                    value={empRecordsPerPage}
                    onChange={(val) => {
                      setEmpRecordsPerPage(Number(val));
                      setEmpCurrentPage(1);
                    }}
                    style={{ width: '80px' }}
                  />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <img
                    src="/Filter.svg"
                    alt="Filter"
                    title="Filter Employee"
                    className="emp-filter-icon-btn"
                    style={{ width: 25, height: 25, opacity: 1, cursor: 'pointer' }}
                    onClick={() => {
                      if (!empFilterOpen) {
                        setTempFilterSearch(filterSearch);
                        setTempFilterDept(filterDept);
                        setTempFilterModule(filterModule);
                        setTempFilterPermission(filterPermission);
                        setTempFilterApprover(filterApprover);
                      }
                      setEmpFilterOpen(!empFilterOpen);
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="audit-admin-filter-row d-flex align-items-center gap-3">
                <div className="d-flex align-items-center gap-2 audit-admin-pagesize-group">
                  
                  <CustomDropdown
                    options={[5, 10, 20, 50].map(size => ({ value: size, label: `${size}` }))}
                    value={recordsPerPage}
                    onChange={(val) => {
                      setRecordsPerPage(Number(val));
                      setCurrentPage(1);
                    }}
                    style={{ width: '80px' }}
                  />
                </div>
                <CustomDropdown
                  options={[
                    { value: '', label: 'All Statuses' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Approved', label: 'Approved' },
                    { value: 'Rejected', label: 'Rejected' },
                  ]}
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val)}
                  placeholder="All Statuses"
                />
              </div>
            )}
          </div>
          <div className="card-body">
            {activeTab === 'Employee Permission' ? (
              <>
                {empFilterOpen && (
                  <div className="audit-filter-panel mb-3">
                    <div className="audit-filter-grid">
                      <div className="audit-filter-field">
                        <label className="audit-filter-label">Search</label>
                        <input
                          type="text"
                          className="audit-filter-input"
                          placeholder="Search Name or ID..."
                          value={tempFilterSearch}
                          onChange={(e) => setTempFilterSearch(e.target.value)}
                        />
                      </div>
                      <div className="audit-filter-field">
                        <label className="audit-filter-label">Department</label>
                        <CustomDropdown
                          options={uniqueDepartments.map(dept => ({ value: dept, label: dept }))}
                          value={tempFilterDept}
                          onChange={(val) => setTempFilterDept(val)}
                        />
                      </div>
                      <div className="audit-filter-field">
                        <label className="audit-filter-label">Module</label>
                        <CustomDropdown
                          options={[
                            { value: 'Access Controller', label: 'Access Controller' },
                            { value: 'Payment Script', label: 'Payment Script' },
                            { value: 'Inscope Vendor', label: 'Inscope Vendor' }
                          ]}
                          value={tempFilterModule}
                          onChange={(val) => setTempFilterModule(val)}
                        />
                      </div>
                      <div className="audit-filter-field">
                        <label className="audit-filter-label">Permission Check</label>
                        <CustomDropdown
                          options={[
                            { value: 'All', label: 'All' },
                            { value: 'Has Access', label: 'Has Access' },
                            { value: 'No Access', label: 'No Access' },
                            { value: 'READ', label: 'READ' },
                            { value: 'WRITE', label: 'WRITE' }
                          ]}
                          value={tempFilterPermission}
                          onChange={(val) => setTempFilterPermission(val)}
                        />
                      </div>
                      <div className="audit-filter-field">
                        <label className="audit-filter-label">Review Approver</label>
                        <CustomDropdown
                          options={[
                            { value: 'All', label: 'All' },
                            { value: 'Yes', label: 'Yes' },
                            { value: 'No', label: 'No' }
                          ]}
                          value={tempFilterApprover}
                          onChange={(val) => setTempFilterApprover(val)}
                        />
                      </div>
                    </div>
                    <div className="audit-filter-actions">
                      <button
                        type="button"
                        className="common-modal-btn btn-small-cancel"
                        onClick={() => {
                          setEmpFilterOpen(false);
                          setTempFilterSearch(filterSearch);
                          setTempFilterDept(filterDept);
                          setTempFilterModule(filterModule);
                          setTempFilterPermission(filterPermission);
                          setTempFilterApprover(filterApprover);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="common-modal-btn btn-update"
                        onClick={() => {
                          setFilterSearch(tempFilterSearch);
                          setFilterDept(tempFilterDept);
                          setFilterModule(tempFilterModule);
                          setFilterPermission(tempFilterPermission);
                          setFilterApprover(tempFilterApprover);
                          setEmpCurrentPage(1);
                          setEmpFilterOpen(false);
                        }}
                      >
                        Search
                      </button>
                    </div>
                  </div>
                )}
                {Object.values({ filterSearch, filterDept, filterModule, filterPermission, filterApprover }).some(v => v && v !== 'All' && v !== 'Access Controller') && (
                  <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded" style={{ border: '1px solid #e5e7ef' }}>
                    <span style={{ fontSize: '0.8rem', color: '#555' }}>
                      Active filters applied.
                    </span>
                    <button
                      className="btn btn-sm btn-link text-decoration-none py-0"
                      onClick={() => {
                        setFilterSearch('');
                        setFilterDept('All');
                        setFilterModule('Access Controller');
                        setFilterPermission('All');
                        setFilterApprover('All');
                        setTempFilterSearch('');
                        setTempFilterDept('All');
                        setTempFilterModule('Access Controller');
                        setTempFilterPermission('All');
                        setTempFilterApprover('All');
                        setEmpCurrentPage(1);
                      }}
                      style={{ fontSize: '0.8rem' }}
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
                <div className="table-responsive employee-perm-table-wrapper">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th style={{ textAlign: 'left', fontWeight: 600 }}>Employee Name</th>
                      <th style={{ textAlign: 'left', fontWeight: 600 }}>Department</th>
                      <th style={{ textAlign: 'center', fontWeight: 600 }}>Access Controller</th>
                      <th style={{ textAlign: 'center', fontWeight: 600 }}>Payment Script</th>
                      <th style={{ textAlign: 'center', fontWeight: 600 }}>Inscope Vendor</th>
                      <th style={{ textAlign: 'center', fontWeight: 600 }}>Review Approver</th>
                      <th style={{ textAlign: 'center', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.map((emp) => {
                      const perms = localPermissions[emp.employeeId] || {
                        'Access Controller': 'NO_ACCESS',
                        'Payment Script': 'NO_ACCESS',
                        'Inscope Vendor': 'NO_ACCESS',
                        'Review Approver': false
                      };
                      const hasPerm = emp.menus && emp.menus.length > 0;
                      const origAccess = emp.menus?.find(m => m.module === 'Access Controller')?.permission || 'NO_ACCESS';
                      const origScript = emp.menus?.find(m => m.module === 'Payment Script')?.permission || 'NO_ACCESS';
                      const origVendor = emp.menus?.find(m => m.module === 'Inscope Vendor')?.permission || 'NO_ACCESS';
                      const origApprover = emp.isApprover || false;

                      const isChanged = 
                        perms['Access Controller'] !== origAccess ||
                        perms['Payment Script'] !== origScript ||
                        perms['Inscope Vendor'] !== origVendor ||
                        (perms['Review Approver'] || false) !== origApprover;

                      return (
                        <tr key={emp.employeeId}>
                          <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>{emp.employeeName}</td>
                          <td style={{ textAlign: 'left', verticalAlign: 'middle' }}>{emp.department || 'N/A'}</td>
                           <td style={{ textAlign: 'center' }}>
                            <CustomDropdown
                              options={[
                                { value: 'NO_ACCESS', label: 'NO ACCESS' },
                                { value: 'READ', label: 'READ' },
                                { value: 'WRITE', label: 'WRITE' }
                              ]}
                              value={perms['Access Controller']}
                              onChange={(val) => handleLocalPermissionChange(emp.employeeId, 'Access Controller', val)}
                              style={{ width: '140px', fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <CustomDropdown
                              options={[
                                { value: 'NO_ACCESS', label: 'NO ACCESS' },
                                { value: 'READ', label: 'READ' },
                                { value: 'WRITE', label: 'WRITE' }
                              ]}
                              value={perms['Payment Script']}
                              onChange={(val) => handleLocalPermissionChange(emp.employeeId, 'Payment Script', val)}
                              style={{ width: '140px', fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <CustomDropdown
                              options={[
                                { value: 'NO_ACCESS', label: 'NO ACCESS' },
                                { value: 'READ', label: 'READ' },
                                { value: 'WRITE', label: 'WRITE' }
                              ]}
                              value={perms['Inscope Vendor']}
                              onChange={(val) => handleLocalPermissionChange(emp.employeeId, 'Inscope Vendor', val)}
                              style={{ width: '140px', fontSize: '0.85rem' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={perms['Review Approver'] || false}
                              onChange={(e) => handleLocalPermissionChange(emp.employeeId, 'Review Approver', e.target.checked)}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleSavePermission(emp)}
                              style={{ 
                                minWidth: '85px', 
                                borderRadius: '4px', 
                                fontSize: '0.8rem',
                                opacity: isChanged ? 1 : 0.5,
                                cursor: isChanged ? 'pointer' : 'not-allowed'
                              }}
                              disabled={!isChanged}
                            >
                              {hasPerm ? 'Update' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredEmployees.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center">No employees found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredEmployees.length > 0 && (
                <div className=" text-center d-flex justify-content-center">
                  <Pagination
                    totalItems={filteredEmployees.length}
                    pageSize={empRecordsPerPage}
                    currentPage={empCurrentPage}
                    onPageChange={(p) => setEmpCurrentPage(p)}
                  />
                </div>
              )}
            </>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th style={{ textAlign: 'center', fontWeight: 500 }}>Type</th><th style={{ textAlign: 'center', fontWeight: 500 }}>Details</th><th style={{ textAlign: 'center', fontWeight: 500 }}>Approver</th><th style={{ textAlign: 'center', fontWeight: 500 }}>Approval</th><th style={{ textAlign: 'center', fontWeight: 500 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecords.map((item, idx) => {
                        if (item.__isBatch) {
                          let typeLabel = '';
                          let names = '';
                          if (item.__type === 'access') {
                            typeLabel = 'User Access Review';
                            names = item.records.map(r => r.user).filter(Boolean).join(', ');
                          } else if (item.__type === 'firewall') {
                            typeLabel = 'Firewall Rule';
                            names = item.records.map(r => r.ruleId).filter(Boolean).join(', ');
                          } else if (item.__type === 'script') {
                            typeLabel = 'Payment Script';
                            names = item.records.map(r => r.scriptName).filter(Boolean).join(', ');
                          } else if (item.__type === 'vendor') {
                            typeLabel = 'Inscope Vendor';
                            names = item.records.map(r => r.vendorName).filter(Boolean).join(', ');
                          }
                          
                          const reviewerNames = item.records && item.records.length > 0
                            ? [...new Set(item.records.map(r => r.reviewedBy || r.authorizedBy))].filter(Boolean).join(', ')
                            : '';
                          
                          return (
                            <tr key={item.batchId} style={{ background: '#f0f6ff' }}>
                              <td>
                                <span>{typeLabel}</span>
                                <span className="badge bg-primary ms-2" style={{ fontSize: '0.7rem' }}>{item.records.length} records</span>
                              </td>
                              <td>
                                <span style={{ fontWeight: 500 }}>{names}</span>
                              </td>
                              <td className="text-center">{reviewerNames}</td>
                              <td><span className={`badge bg-${item.approvalStatus === 'Approved' ? 'success' : item.approvalStatus === 'Rejected' ? 'danger' : 'warning'}`}>{item.approvalStatus}</span></td>
                              <td>
                                <div className="d-flex gap-2 justify-content-center">
                                  <button className="btn btn-sm btn-info text-white" onClick={() => setViewModal({ isOpen: true, data: item, tab: 'assets' })}>View</button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                        // ── Single record row ─────────────────────────
                        let typeLabel = '';
                        let detailsLabel = '';
                        if (item.__type === 'access') {
                          typeLabel = 'User Access Review';
                          detailsLabel = `User: ${item.user} | Role: ${item.role}`;
                        } else if (item.__type === 'firewall') {
                          typeLabel = 'Firewall Rule';
                          detailsLabel = `Rule ID: ${item.ruleId} | Action: ${item.action}`;
                        } else if (item.__type === 'script') {
                          typeLabel = 'Payment Script';
                          detailsLabel = `Script: ${item.scriptName} | Domain: ${item.sourceDomain}`;
                        } else if (item.__type === 'vendor') {
                          typeLabel = 'Inscope Vendor';
                          detailsLabel = `Vendor: ${item.vendorName} | Service: ${item.serviceProvided}`;
                        }
                        
                        const reviewerName = item.reviewedBy || item.authorizedBy || '';
                        
                        return (
                          <tr key={item._id}>
                            <td>{typeLabel}</td>
                            <td>{detailsLabel}</td>
                            <td className="text-center">{reviewerName}</td>
                            <td className="text-center"><span className={`badge bg-${item.approvalStatus === 'Approved' ? 'success' : item.approvalStatus === 'Rejected' ? 'danger' : 'warning'}`}>{item.approvalStatus}</span></td>
                            <td>
                              <div className="d-flex gap-2 justify-content-center">
                                <button className="btn btn-sm btn-info text-white" onClick={() => setViewModal({ isOpen: true, data: item, tab: 'assets' })}>View</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {currentRecords.length === 0 && <tr><td colSpan="5" className="text-center">No records found</td></tr>}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {filteredAssets.length > 0 && (
                  <div className="mt-1">
                    <Pagination
                      totalItems={filteredAssets.length}
                      pageSize={recordsPerPage}
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {viewModal.isOpen && viewModal.data && (() => {
        // Get document type specific data
        const revs = viewModal.data.__type === 'script' 
          ? (paymentScriptsData.revisionHistories || []) 
          : (viewModal.data.__type === 'vendor' 
            ? (vendorsData.revisionHistories || []) 
            : (auditData.revisionHistories || []));
        
        const modalRevisions = revs;
        const modalRevTotalPages = Math.max(1, Math.ceil(modalRevisions.length / modalRevPageSize));
        const modalRevStart = (modalRevPage - 1) * modalRevPageSize;
        const modalPaginatedRevisions = modalRevisions.slice(modalRevStart, modalRevStart + modalRevPageSize);

        return (
          <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered view-detail-modal">
              <div className="modal-content" style={{ borderRadius: '10px', overflow: 'hidden' }}>
                <div className="modal-header" style={{ borderBottom: 'none', padding: '14px 20px' }}>
                  <h5 className="modal-title" style={{ fontSize: '16px', fontWeight: 500 , color: '#3a466d'}}>Record Details</h5>
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
                        <h6 className="text-primary pb-2" style={{ fontWeight: 500 , fontSize:'17px' }}>Asset Information</h6>
                        {(() => {
                          const renderRecordFields = (rec, prefix = '') => {
                            const formatVal = (val) => {
                              if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                              const str = String(val || '');
                              if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
                                return str.split('T')[0];
                              }
                              return str;
                            };

                            return Object.entries(rec).map(([key, value]) => {
                              if (['_id', '__v', '__type', 'recordType', 'createdAt', 'updatedAt', 'batchId', 'records', 'docReviewedBy', 'approvalStatus', 'rejectReason'].includes(key)) return null;
                              if (key === 'customFields') {
                                if (!Array.isArray(value) || value.length === 0) return null;
                                return value.flatMap((cf, cIdx) => {
                                  if (cf.description) {
                                    return [
                                      <div key={`${prefix}cf-${cIdx}`} className="view-asset-item" style={{ gridColumnStart: 1 }}>
                                        <span className="view-asset-label">{cf.label}</span>
                                        <span className="view-asset-value">{formatVal(cf.value) || 'N/A'}</span>
                                      </div>,
                                      <div key={`${prefix}cf-desc-${cIdx}`} className="view-asset-item" style={{ gridColumnStart: 2 }}>
                                        <span className="view-asset-label">Description</span>
                                        <span className="view-asset-value" style={{ color: '#555' }}>{cf.description}</span>
                                      </div>
                                    ];
                                  }
                                  return [
                                    <div key={`${prefix}cf-${cIdx}`} className="view-asset-item">
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
                                  <div key={`${prefix}${key}`} className="view-asset-item" style={{ gridColumnStart: 1 }}>
                                    <span className="view-asset-label">{label}</span>
                                    <span className="view-asset-value">{mainVal || 'N/A'}</span>
                                  </div>,
                                  <div key={`${prefix}${key}-desc`} className="view-asset-item" style={{ gridColumnStart: 2 }}>
                                    <span className="view-asset-label">Description</span>
                                    <span className="view-asset-value" style={{ color: '#555' }}>{inlineDesc}</span>
                                  </div>
                                ];
                              }
                              return (
                                <div key={`${prefix}${key}`} className="view-asset-item">
                                  <span className="view-asset-label">{label}</span>
                                  <span className="view-asset-value">{mainVal || 'N/A'}</span>
                                </div>
                              );
                            });
                          };

                          if (viewModal.data.__isBatch) {
                            return viewModal.data.records.map((rec, i) => (
                              <div key={rec._id} className="mb-4 pb-3 border-bottom">
                                <strong className="text-secondary mb-3 d-block" style={{ fontSize: '0.9rem', fontWeight: 600 }}>Record {i + 1}</strong>
                                <div className="view-asset-grid">
                                  {renderRecordFields(rec, `batch-${i}-`)}
                                </div>
                              </div>
                            ));
                          } else {
                            return (
                              <div className="view-asset-grid">
                                {renderRecordFields(viewModal.data)}
                              </div>
                            );
                          }
                        })()}
                        {viewModal.data.rejectReason && (
                          <div className="view-asset-item view-asset-item--danger mt-3" style={{ gridColumn: '1 / -1', borderRadius: '4px' }}>
                            <span className="view-asset-label text-danger">Rejection Reason</span>
                            <span className="view-asset-value text-danger fw-semibold">{viewModal.data.rejectReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Changes & Review Tab ── */}
                  {viewModal.tab === 'changes' && (() => {
                    const latestRev = revs.length > 0 ? revs[revs.length - 1] : null;
                    const latestDoc = (viewModal.data.__type === 'script' 
                      ? (paymentScriptsData.documentInfos || []) 
                      : (viewModal.data.__type === 'vendor' 
                        ? (vendorsData.documentInfos || []) 
                        : (auditData.documentInfos || [])))[0];
                    return (
                      <>
                        <div className="card shadow-sm border-0 mb-3">
                          <div className="card-body">
                            <h6 className="mb-3 border-bottom pb-2" style={{ fontSize: '17px', color: '#3b3c58', fontWeight: 500 }}>Document Information</h6>
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

                <div className="modal-footer border-0" style={{ padding: '12px 20px' }}>
                  <div className="edit-modal-actions d-flex gap-2">
                    <button className="common-modal-btn btn-small-cancel" onClick={() => { setViewModal({ isOpen: false, data: null, tab: 'assets' }); setModalRevPage(1); }}>Close</button>
                    {viewModal.data.approvalStatus === 'Pending' && (
                      viewModal.data.reviewedBy === loggedInUser ||
                      viewModal.data.authorizedBy === loggedInUser ||
                      viewModal.data.docReviewedBy === loggedInUser ||
                      viewModal.data.changeReviewedAndApprovedBy === loggedInUser ||
                      (viewModal.data.records && viewModal.data.records.some(r =>
                        r.reviewedBy === loggedInUser ||
                        r.authorizedBy === loggedInUser ||
                        r.docReviewedBy === loggedInUser ||
                        r.changeReviewedAndApprovedBy === loggedInUser
                      ))
                    ) && (
                      <>
                        <button className="common-modal-btn btn-reject" onClick={() => handleStatusUpdate(viewModal.data.__type, viewModal.data._id || viewModal.data.batchId, 'Rejected')}>Reject</button>
                        <button className="common-modal-btn btn-update" onClick={() => handleStatusUpdate(viewModal.data.__type, viewModal.data._id || viewModal.data.batchId, 'Approved')}>Approve</button>
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
            <div className="todo-modal-content common-modal-content employee-view-popup" style={{ borderRadius: '8px' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title w-100 text-center font-weight-bold" style={{ color: '#333' }}>Rejection Reason</h5>
                <button type="button" className="btn-close" onClick={() => setRejectModal({ isOpen: false, type: '', id: '', status: '' })}></button>
              </div>
              <div className="modal-body py-3">
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Enter rejection reason..."
                  value={rejectReasonText}
                  onChange={(e) => setRejectReasonText(e.target.value)}
                  style={{ resize: 'none', borderRadius: '6px' }}
                />
              </div>
              <div className="modal-footer border-0 pt-0 d-flex justify-content-center gap-3">
                <button
                  className="common-modal-btn btn-small-cancel"
                  style={{ minWidth: '100px', borderRadius: '20px' }}
                  onClick={() => setRejectModal({ isOpen: false, type: '', id: '', status: '' })}
                >
                  Cancel
                </button>
                <button
                  className="common-modal-btn btn-reject"
                  style={{ minWidth: '100px', borderRadius: '20px' }}
                  onClick={() => handleStatusUpdate(rejectModal.type, rejectModal.id, rejectModal.status, rejectReasonText)}
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

export default AdminAuditManagement;
