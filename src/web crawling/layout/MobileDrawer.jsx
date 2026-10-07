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
  X,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",  path: "/crawler" },
      { icon: ScanSearch,      label: "New Scan",   path: "/crawler/analyze"   },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { icon: FileText, label: "Reports",    path: "/crawler" },
      { icon: Shield,   label: "Risk",       path: null },
      { icon: Search,   label: "SEO",        path: null },
      { icon: Scale,    label: "Compliance", path: null },
    ],
  },
];

export default function MobileDrawer({ open, onClose }) {
  const navigate  = useNavigate();
  const location  = useLocation();

  const isActive = (path) => {
    if (!path) return false;
    if (path === "/crawler") return location.pathname === "/crawler";
    return location.pathname.startsWith(path);
  };

  const handleNav = (path) => {
    if (path) {
      navigate(path);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`wi-drawer-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className={`wi-drawer ${open ? "open" : ""}`}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem",
          borderBottom: "1px solid var(--wi-border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32,
              background: "var(--wi-accent)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Globe size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--wi-text-primary)" }}>
                Web Crawler
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--wi-text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                
              </div>
            </div>
          </div>
          <button
            className="wi-btn wi-btn-ghost wi-btn-icon"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.75rem", display: "flex", flexDirection: "column", gap: "1.5rem", overflowY: "auto" }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="wi-nav-group-label">{group.label}</div>
              <div className="wi-nav-group">
                {group.items.map((item) => {
                  const Icon   = item.icon;
                  const active = isActive(item.path);
                  const canNav = !!item.path;
                  return (
                    <button
                      key={item.label}
                      className={`wi-nav-item ${active ? "active" : ""}`}
                      onClick={() => handleNav(item.path)}
                      style={{ opacity: canNav ? 1 : 0.45 }}
                    >
                      <Icon size={16} />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {!canNav && (
                        <span style={{ fontSize: "0.65rem", color: "var(--wi-text-muted)" }}>Report</span>
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
      </div>
    </>
  );
}
