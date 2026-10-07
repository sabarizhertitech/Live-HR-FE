import React from "react";

/**
 * StatusBadge
 * status: "completed" | "failed" | "pending" | "crawling" | "analyzing"
 *         "HIGH" | "MEDIUM" | "LOW"
 */
const MAP = {
  completed: { cls: "wi-badge-success",  label: "Completed" },
  failed:    { cls: "wi-badge-danger",   label: "Failed"    },
  pending:   { cls: "wi-badge-warning",  label: "Pending"   },
  crawling:  { cls: "wi-badge-info",     label: "Crawling"  },
  analyzing: { cls: "wi-badge-info",     label: "Analyzing" },
  HIGH:      { cls: "wi-badge-danger",   label: "High"      },
  MEDIUM:    { cls: "wi-badge-warning",  label: "Medium"    },
  LOW:       { cls: "wi-badge-success",  label: "Low"       },
};

export default function StatusBadge({ status, label, className = "" }) {
  const cfg    = MAP[status] || { cls: "wi-badge-neutral", label: status };
  const text   = label || cfg.label;
  return (
    <span className={`wi-badge ${cfg.cls} ${className}`}>
      {text}
    </span>
  );
}
