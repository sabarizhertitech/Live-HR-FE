import React from "react";
import { Inbox } from "lucide-react";

/**
 * EmptyState — centered empty state for lists and tables
 * Props: icon, title, description, action (node)
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  description,
  action,
}) {
  return (
    <div className="wi-empty-state">
      <div className="wi-empty-icon">
        <Icon size={24} />
      </div>
      <div className="wi-empty-title">{title}</div>
      {description && <div className="wi-empty-desc">{description}</div>}
      {action && <div style={{ marginTop: "1.25rem" }}>{action}</div>}
    </div>
  );
}
