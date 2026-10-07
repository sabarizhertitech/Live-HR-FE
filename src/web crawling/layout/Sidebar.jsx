import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Globe,
  LayoutDashboard,
  ScanSearch,
  Shield,
  Search,
  Scale,
  FileText,
  ChevronRight,
  Layers,
} from "lucide-react";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract report ID if current URL matches /crawler/report/:id[/...]
  const reportIdMatch = location.pathname.match(/^\/crawler\/report\/([^/]+)/);
  const reportId = reportIdMatch ? reportIdMatch[1] : null;

  const NAV_GROUPS = [
    {
      label: "Overview",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", path: "/crawler" },
        { icon: ScanSearch,      label: "New Scan",  path: "/crawler/analyze"   },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { icon: FileText, label: "Reports",    path: "/crawler" },
        { icon: Shield,   label: "Risk",       path: reportId ? `/crawler/report/${reportId}/risk`       : null, hint: reportId ? "" : "Open a report first" },
        { icon: Search,   label: "SEO",        path: reportId ? `/crawler/report/${reportId}/seo`        : null, hint: reportId ? "" : "Open a report first" },
        { icon: Scale,    label: "Compliance", path: reportId ? `/crawler/report/${reportId}/compliance` : null, hint: reportId ? "" : "Open a report first" },
        { icon: Layers,   label: "Pages",      path: reportId ? `/crawler/report/${reportId}/pages`      : null, hint: reportId ? "" : "Open a report first" },
      ],
    },
  ];

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/crawler") return location.pathname === "/crawler";
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="wi-sidebar">
      {/* Logo */}
      <div className="wi-sidebar-logo" style={{ cursor: "pointer" }} onClick={() => navigate("/crawler")}>
        <div className="wi-sidebar-logo-icon">
          <Globe size={16} color="#fff" />
        </div>
        <div>
          <div className="wi-sidebar-logo-text">Web Crawler</div>
          <div className="wi-sidebar-logo-sub"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="wi-sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="wi-nav-group-label">{group.label}</div>
            <div className="wi-nav-group">
              {group.items.map((item) => {
                const Icon    = item.icon;
                const active  = isActive(item.path);
                const canNav  = !!item.path;

                return (
                  <button
                    key={item.label}
                    className={`wi-nav-item ${active ? "active" : ""} ${!canNav ? "disabled-nav" : ""}`}
                    onClick={() => canNav && navigate(item.path)}
                    title={item.hint || ""}
                    style={{ opacity: canNav ? 1 : 0.45 }}
                  >
                    <Icon size={16} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {!canNav && (
                      <span style={{ fontSize: "0.65rem", color: "var(--wi-text-muted)" }}>
                        Report
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="wi-sidebar-footer">
        <div style={{ fontWeight: 600, color: "var(--wi-text-secondary)", marginBottom: 2 }}>
           Web Crawler
        </div>
        <div>Website Intelligence Suite</div>
      </div>
    </aside>
  );
}
