
import React, { useState, useEffect, useRef } from "react";
import "./CustomDropdown.css";
import arrow from "../../../public/Down Arrow.svg";

const CustomDropdown = ({ options, value, onChange, placeholder, className, style, disabled, isOpen: controlledIsOpen, onToggle, direction }) => {
  const [localIsOpen, setLocalIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
  const setIsOpenState = (openVal) => {
    if (onToggle) {
      onToggle(openVal);
    } else {
      setLocalIsOpen(openVal);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpenState(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onToggle]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpenState(false);
  };

  const isMatch = (optVal, currentVal) =>
    optVal === currentVal ||
    (typeof optVal === "string" && typeof currentVal === "string" && optVal.toLowerCase() === currentVal.toLowerCase());

  const selectedOption = options.find((opt) => isMatch(opt.value, value));

  return (
    <div
      className={`custom-dropdown-container ${className || ""} ${disabled ? "disabled" : ""} ${isOpen ? "dropdown-open" : ""}`}
      ref={dropdownRef}
      style={style}
    >
      <div
        className={`custom-dropdown-trigger ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && setIsOpenState(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <img
          src={arrow}
          alt="arrow"
          className={`dropdown-arrow-icon ${isOpen ? "rotate" : ""}`}
        />
      </div>
      {isOpen && !disabled && (
        <div className={`custom-dropdown-menu ${direction === "up" ? "open-up" : ""}`}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-dropdown-option ${isMatch(option.value, value) ? "selected" : ""}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
