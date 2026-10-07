import React, { useState, useEffect } from "react";
import { GrFormPrevious, GrFormNext } from "react-icons/gr";
import "./Pagination.css";

const Pagination = ({
  totalItems = 0,
  pageSize = 5,
  currentPage = 1,
  onPageChange,
  maxPagesInGroup = 5,
}) => {
  const [pageGroupStart, setPageGroupStart] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset group when currentPage changes externally (e.g., filter change)
  useEffect(() => {
    const groupIndex = Math.floor((currentPage - 1) / maxPagesInGroup);
    const newGroupStart = groupIndex * maxPagesInGroup + 1;
    setPageGroupStart(newGroupStart);
  }, [currentPage, maxPagesInGroup]);

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
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

  const isPrevDisabled = pageGroupStart === 1;
  const isNextDisabled = pageGroupStart + maxPagesInGroup > totalPages;

  const pageNumbers = Array.from(
    { length: maxPagesInGroup },
    (_, i) => pageGroupStart + i
  );

  // Don't render if no items
  if (totalItems <= 0) return null;

  return (
    <div className="d-flex justify-content-center align-items-center flex-wrap pagination-wrapper">
      <div className="pagination-container d-flex flex-wrap gap-2">
        {/* Previous Group Button */}
        <button
          className="btn btn-sm btn-outline-primary pagination-prev"
          onClick={handlePrevGroup}
          style={{ fontSize: "20px" }}
          disabled={isPrevDisabled}
        >
          <GrFormPrevious />
        </button>

        {/* Page Number Buttons */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            className={`btn btn-sm mt-0 ${
              currentPage === page ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => handlePageClick(page)}
            style={{ fontSize: "0.8rem" }}
            disabled={page > totalPages}
          >
            {page}
          </button>
        ))}

        {/* Next Group Button */}
        <button
          className="btn btn-sm btn-outline-primary"
          onClick={handleNextGroup}
          disabled={isNextDisabled}
          style={{ fontSize: "20px" }}
        >
          <GrFormNext />
        </button>
      </div>
    </div>
  );
};

export default Pagination;