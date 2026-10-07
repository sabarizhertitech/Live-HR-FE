import React from "react";

/**
 * InfoCard — labeled key/value cell inside cards
 * Props: label, value, mono (bool), icon
 */
export default function InfoCard({ label, value, mono = false, icon: Icon }) {
  return (
    <div className="wi-info-cell">
      <div className="wi-info-key">
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {Icon && <Icon size={13} style={{ opacity: 0.6 }} />}
          {label}
        </span>
      </div>
      <div className={`wi-info-value ${mono ? "mono" : ""}`}>
        {value || <span style={{ color: "var(--wi-text-muted)", fontStyle: "italic" }}>—</span>}
      </div>
    </div>
  );
}
