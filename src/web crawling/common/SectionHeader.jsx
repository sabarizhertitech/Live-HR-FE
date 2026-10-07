import React from "react";

/**
 * SectionHeader — visually separates content sections
 * Props: icon, title, description, actions (node)
 */
export default function SectionHeader({ icon: Icon, title, description, actions }) {
  return (
    <div className="wi-section-header">
      <div>
        <div className="wi-section-title">
          {Icon && <Icon size={15} />}
          <h3>{title}</h3>
        </div>
        {description && <p className="wi-section-desc">{description}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: "0.5rem" }}>{actions}</div>}
    </div>
  );
}
