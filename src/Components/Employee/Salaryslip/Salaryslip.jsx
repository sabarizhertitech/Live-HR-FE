import React, { useEffect, useMemo, useState } from "react";
import "./Slip.css";
import CustomDropdown from "../../Common/CustomDropdown";
import { portalInstance } from "../../../Services/instance";
import Sidebar from "../../HeaderSidebar/Sidebar";
import Pagination from "../Pagination/Pagination";
import "../Pagination/Pagination.css";
import JSZip from "jszip";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const now = new Date();
const defaultPrevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
const defaultPrevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

const SalarySlip = () => {
  const [loading, setLoading] = useState(false);
  const [slips, setSlips] = useState([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [downloadingId, setDownloadingId] = useState("");
  const [viewingId, setViewingId] = useState("");
  const [zipLoading, setZipLoading] = useState(false);

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [filterMode, setFilterMode] = useState("monthly"); // Default: monthly

  const [filters, setFilters] = useState({
    month: defaultPrevMonth.toString(),
    year: defaultPrevYear.toString(),
    fromMonth: "",
    toMonth: "",
    fromYear: "",
    toYear: ""
  });

  const paginatedSlips = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return slips.slice(start, start + itemsPerPage);
  }, [slips, currentPage]);

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const yearOptions = [];
  for (let y = 2024; y <= currentYear + 1; y++) {
    yearOptions.push(y);
  }

  const monthDropdownOptions = useMemo(() => {
    return [
      { label: "All Months", value: "all" },
      ...monthNames.map((m, i) => {
        const monthVal = i + 1;
        const yearVal = Number(filters.year);
        let disabled = false;

        if (yearVal) {
          if (yearVal === 2024 && monthVal < 4) disabled = true;
          if (yearVal > currentYear) disabled = true;
          else if (yearVal === currentYear && monthVal > currentMonth) disabled = true;
        }

        return { label: m, value: monthVal.toString(), disabled };
      })
    ];
  }, [filters.year, currentYear, currentMonth]);

  const fromMonthDropdownOptions = useMemo(() => {
    const fromYearVal = Number(filters.fromYear) || currentYear;
    return monthNames.map((m, i) => {
      const monthVal = i + 1;
      let disabled = false;
      if (fromYearVal === 2024 && monthVal < 4) disabled = true;
      if (fromYearVal > currentYear) disabled = true;
      else if (fromYearVal === currentYear && monthVal > currentMonth) disabled = true;
      return { label: m, value: monthVal.toString(), disabled };
    });
  }, [filters.fromYear, currentYear, currentMonth]);

  const fromYearDropdownOptions = useMemo(() => {
    return [
      { label: "Year", value: "" },
      ...yearOptions.map(y => ({
        label: y.toString(),
        value: y.toString(),
        disabled: y < 2024 || y > currentYear
      }))
    ];
  }, [yearOptions, currentYear]);

  const toMonthDropdownOptions = useMemo(() => {
    const fromYearVal = Number(filters.fromYear) || 2024;
    const fromMonthVal = Number(filters.fromMonth) || 4;
    const toYearVal = Number(filters.toYear) || currentYear;

    return monthNames.map((m, i) => {
      const monthVal = i + 1;
      let disabled = false;
      if (toYearVal === 2024 && monthVal < 4) disabled = true;
      if (toYearVal === fromYearVal && monthVal < fromMonthVal) disabled = true;
      if (toYearVal > currentYear) disabled = true;
      else if (toYearVal === currentYear && monthVal > currentMonth) disabled = true;
      return { label: m, value: monthVal.toString(), disabled };
    });
  }, [filters.fromYear, filters.fromMonth, filters.toYear, currentYear, currentMonth]);

  const toYearDropdownOptions = useMemo(() => {
    const fromYearVal = Number(filters.fromYear) || 2024;
    return [
      { label: "Year", value: "" },
      ...yearOptions.map(y => ({
        label: y.toString(),
        value: y.toString(),
        disabled: y < fromYearVal || y > currentYear
      }))
    ];
  }, [yearOptions, filters.fromYear, currentYear]);

  const handleFromMonthChange = (val) => {
    setFilters(prev => {
      const next = { ...prev, fromMonth: val };
      const fromY = Number(next.fromYear) || 2024;
      const fromM = Number(val) || 4;
      const toY = Number(next.toYear);
      const toM = Number(next.toMonth);

      if (toY && toM) {
        if (toY < fromY || (toY === fromY && toM < fromM)) {
          next.toYear = fromY.toString();
          next.toMonth = fromM.toString();
        }
      }
      return next;
    });
  };

  const handleFromYearChange = (val) => {
    setFilters(prev => {
      const next = { ...prev, fromYear: val };
      const fromY = Number(val) || 2024;
      const fromM = Number(next.fromMonth) || 4;
      const toY = Number(next.toYear);
      const toM = Number(next.toMonth);

      if (toY && toM) {
        if (toY < fromY || (toY === fromY && toM < fromM)) {
          next.toYear = fromY.toString();
          next.toMonth = fromM.toString();
        }
      }
      return next;
    });
  };

  const yearDropdownOptions = useMemo(() => [
    { label: "Year", value: "" },
    ...yearOptions.map(y => {
      const disabled = y > currentYear + 1;
      return { label: y.toString(), value: y.toString(), disabled };
    })
  ], [yearOptions, currentYear]);

  const fetchSlips = async (showLoader = true, appliedFilters = null, appliedMode = null) => {
    if (showLoader) setLoading(true);
    const activeF = appliedFilters || filters;
    const activeMode = appliedMode || filterMode;

    try {
      const params = new URLSearchParams();
      params.append("mode", activeMode);

      if (activeMode === "monthly") {
        if (activeF.month && activeF.month !== "all") params.append("month", activeF.month);
        if (activeF.year) params.append("year", activeF.year);
      } else if (activeMode === "custom") {
        if (activeF.fromMonth) params.append("fromMonth", activeF.fromMonth);
        if (activeF.toMonth) params.append("toMonth", activeF.toMonth);
        if (activeF.fromYear) params.append("fromYear", activeF.fromYear);
        if (activeF.toYear) params.append("toYear", activeF.toYear);
      }

      const res = await portalInstance.get(`/salary-slip/my-slips?${params.toString()}`);
      if (res.data?.success) {
        setSlips(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch salary slips", error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchSlips(true);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      month: defaultPrevMonth.toString(),
      year: defaultPrevYear.toString(),
      fromMonth: "",
      toMonth: "",
      fromYear: "",
      toYear: ""
    };
    setFilterMode("monthly");
    setFilters(defaultFilters);
    setCurrentPage(1);
    fetchSlips(true, defaultFilters, "monthly");
  };

  useEffect(() => {
    const initialFilters = {
      month: defaultPrevMonth.toString(),
      year: defaultPrevYear.toString(),
      fromMonth: "",
      toMonth: "",
      fromYear: "",
      toYear: ""
    };
    fetchSlips(true, initialFilters, "monthly");
  }, []);

  const formatMoney = (amt) => {
    return Number(amt || 0).toLocaleString("en-IN");
  };

  const downloadSlip = async (id) => {
    try {
      setDownloadingId(id);

      const res = await portalInstance.get(`/salary-slip/download/${id}?download=true`);

      if (res.data?.success && res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (error) {
      console.error("Failed to download payslip", error);
    } finally {
      setDownloadingId("");
    }
  };

  const viewSlip = async (id) => {
    try {
      setViewingId(id);

      const res = await portalInstance.get(`/salary-slip/download/${id}`);

      if (res.data?.success && res.data?.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (error) {
      console.error("Failed to view payslip", error);
    } finally {
      setViewingId("");
    }
  };

  const handleDownloadZip = async () => {
    if (!slips || slips.length === 0) {
      alert("No payslips to download for the selected filter.");
      return;
    }

    try {
      setZipLoading(true);
      const params = new URLSearchParams();
      params.append("mode", filterMode);

      if (filterMode === "monthly") {
        if (filters.month && filters.month !== "all") params.append("month", filters.month);
        if (filters.year) params.append("year", filters.year);
      } else if (filterMode === "custom") {
        if (filters.fromMonth) params.append("fromMonth", filters.fromMonth);
        if (filters.toMonth) params.append("toMonth", filters.toMonth);
        if (filters.fromYear) params.append("fromYear", filters.fromYear);
        if (filters.toYear) params.append("toYear", filters.toYear);
      }

      let token = "";
      try {
        const portalData = sessionStorage.getItem("Erti-Portal");
        if (portalData) {
          const parsed = JSON.parse(portalData);
          token = parsed.token;
        }
      } catch (e) { }

      const baseURL = portalInstance.defaults.baseURL || "http://localhost:5000/";
      const cleanBase = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;

      const response = await fetch(`${cleanBase}/salary-slip/download-zip?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        let errMsg = "Failed to generate ZIP file";
        try {
          const errData = await response.json();
          errMsg = errData.message || errMsg;
        } catch (e) { }
        alert(errMsg);
        return;
      }

      const blob = await response.blob();

      let zipName = "Payslips";
      if (filterMode === "monthly" && filters.month && filters.month !== "all") {
        const mStr = monthNames[Number(filters.month) - 1] || filters.month;
        zipName = `Payslips_${mStr}_${filters.year || ""}`;
      } else if (filterMode === "custom" && filters.fromMonth && filters.toMonth) {
        const fmStr = monthNames[Number(filters.fromMonth) - 1] || filters.fromMonth;
        const tmStr = monthNames[Number(filters.toMonth) - 1] || filters.toMonth;
        zipName = `Payslips_${fmStr}_${filters.fromYear}_to_${tmStr}_${filters.toYear}`;
      } else {
        zipName = `Payslips_All`;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${zipName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP creation failed:", err);
      alert(err?.message || "Failed to generate ZIP file");
    } finally {
      setZipLoading(false);
    }
  };

  const closeModal = () => {
    setPdfModalOpen(false);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl("");
  };

  return (
    <div className="salary-slip-page">
      <Sidebar />

      <main className="salary-slip-main">
        <div className="salary-slip-wrapper">
          {/* SINGLE CARD CONTAINER */}
          <div className="salary-slip-card" style={{ overflow: 'visible' }}>
            <div className="payslip-header-bar">
              <h4 className="payslip-header-title">Slip History</h4>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  className="hrms-common-btn-primary payslip-zip-download-btn"
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={zipLoading || slips.length === 0}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                    borderRadius: "6px",
                    height: "36px",
                    cursor: zipLoading || slips.length === 0 ? "not-allowed" : "pointer"
                  }}
                  title="Download filtered payslips as ZIP"
                >
                  {zipLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "14px", height: "14px", borderWidth: "2px" }}></span>
                      <span>Downloading ZIP...</span>
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span>Download ZIP</span>
                    </>
                  )}
                </button>

                <div
                  className={`dwu-employee-filter-icon ${showFilterPanel ? "active" : ""}`}
                  onClick={() => setShowFilterPanel(prev => !prev)}
                  title="Toggle Filters"
                  style={{ cursor: "pointer" }}
                >
                  <img src="/Filter.svg" alt="filter" />
                </div>
              </div>
            </div>

            {showFilterPanel && (
              <div className="payslip-filters animate-slide-down">
                <div className="payslip-filters-grid">
                  {/* 1. Date Range Mode */}
                  <div className="payslip-filter-field">
                    <label className="payslip-filter-label">Date Range</label>
                    <CustomDropdown
                      options={[
                        { label: "All Time", value: "all" },
                        { label: "Monthly", value: "monthly" },
                        { label: "Custom Range", value: "custom" }
                      ]}
                      value={filterMode}
                      onChange={(val) => setFilterMode(val)}
                      placeholder="Date Range"
                    />
                  </div>

                  {filterMode === "monthly" && (
                    <>
                      <div className="payslip-filter-field">
                        <label className="payslip-filter-label">Month</label>
                        <CustomDropdown
                          options={monthDropdownOptions}
                          value={filters.month}
                          onChange={(val) => setFilters({ ...filters, month: val })}
                          placeholder="Month"
                        />
                      </div>
                      <div className="payslip-filter-field">
                        <label className="payslip-filter-label">Year</label>
                        <CustomDropdown
                          options={yearDropdownOptions}
                          value={filters.year}
                          onChange={(val) => setFilters({ ...filters, year: val })}
                          placeholder="Year"
                        />
                      </div>
                    </>
                  )}

                  {filterMode === "custom" && (
                    <>
                      <div className="payslip-filter-field">
                        <label className="payslip-filter-label">From</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <CustomDropdown
                            options={fromMonthDropdownOptions}
                            value={filters.fromMonth}
                            onChange={handleFromMonthChange}
                            placeholder="Month"
                          />
                          <CustomDropdown
                            options={fromYearDropdownOptions}
                            value={filters.fromYear}
                            onChange={handleFromYearChange}
                            placeholder="Year"
                          />
                        </div>
                      </div>
                      <div className="payslip-filter-field">
                        <label className="payslip-filter-label">To</label>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <CustomDropdown
                            options={toMonthDropdownOptions}
                            value={filters.toMonth}
                            onChange={(val) => setFilters({ ...filters, toMonth: val })}
                            placeholder="Month"
                          />
                          <CustomDropdown
                            options={toYearDropdownOptions}
                            value={filters.toYear}
                            onChange={(val) => setFilters({ ...filters, toYear: val })}
                            placeholder="Year"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="payslip-filter-actions">
                  <button
                    type="button"
                    className="hrms-common-btn-cancel"
                    onClick={handleResetFilters}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="hrms-common-btn-primary"
                    onClick={handleApplyFilters}
                    disabled={loading}
                  >
                    Search
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="salary-slip-empty">
                Loading salary slips...
              </div>
            ) : slips.length === 0 ? (
              <div className="salary-slip-empty">
                No salary slips found
              </div>
            ) : (
              <>
                <div className="pay-slip-generator-table-wrapper">
                  <table className="payslip-table-main">
                    <thead className="payslip-table-header">
                      <tr>
                        <th className="payslip-table-header-cell" style={{ textAlign: 'center', width: '80px' }}>S.No</th>
                        <th className="payslip-table-header-cell">Month</th>
                        <th className="payslip-table-header-cell">Year</th>
                        <th className="payslip-table-header-cell" style={{ textAlign: 'right' }}>Net Pay</th>
                        <th className="payslip-table-header-cell" style={{ textAlign: 'center' }}>Generated On</th>
                        <th className="payslip-table-header-cell" style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedSlips.map((item, index) => (
                        <tr key={item._id} className="payslip-table-row">
                          <td className="payslip-table-cell payslip-table-cell--muted" style={{ textAlign: 'center' }}>
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>

                          <td className="payslip-table-cell payslip-table-cell--bold">
                            {monthNames[item.month - 1] || item.month}
                          </td>

                          <td className="payslip-table-cell payslip-table-cell--muted">{item.year}</td>

                          <td className="payslip-table-cell payslip-table-cell--bold" style={{ textAlign: 'right' }}>
                            ₹{" "}
                            {formatMoney(
                              item.netPay
                            )}
                          </td>

                          <td className="payslip-table-cell payslip-table-cell--muted" style={{ textAlign: 'center' }}>
                            {new Date(
                              item.generatedAt ||
                              item.createdAt
                            ).toLocaleDateString(
                              "en-IN"
                            )}
                          </td>

                          <td className="payslip-table-cell">
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' }}>

                              <button
                                className="payslip-btn payslip-btn-view"
                                onClick={() =>
                                  viewSlip(
                                    item._id
                                  )
                                }
                                disabled={
                                  viewingId ===
                                  item._id
                                }
                              >
                                {viewingId ===
                                  item._id
                                  ? "Opening..."
                                  : "View"}
                              </button>

                              <button
                                className="payslip-btn payslip-btn-download"
                                onClick={() =>
                                  downloadSlip(
                                    item._id
                                  )
                                }
                                disabled={
                                  downloadingId ===
                                  item._id
                                }
                              >
                                {downloadingId ===
                                  item._id
                                  ? "Downloading..."
                                  : "Download"}
                              </button>

                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="payslip-pagination-wrapper" style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", marginTop: "20px" }}>
                  <Pagination
                    totalItems={slips.length}
                    pageSize={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={(page) => setCurrentPage(page)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* PDF MODAL */}
      {pdfModalOpen && (
        <div
          className="salary-slip-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="salary-slip-modal-box"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="salary-slip-modal-header">
              <h3>Payslip Preview</h3>

              <button
                className="salary-slip-modal-close"
                onClick={closeModal}
              >
                ×
              </button>
            </div>

            <iframe
              src={pdfUrl}
              title="Payslip PDF"
              className="salary-slip-pdf-frame"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SalarySlip;