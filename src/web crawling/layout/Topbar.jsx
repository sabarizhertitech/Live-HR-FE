import React from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Menu } from "lucide-react";

export default function Topbar({ onMenuClick }) {
  const navigate = useNavigate();

  return (
    <header className="wi-topbar">
      <div className="wi-topbar-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <div style={{
          width: 26,
          height: 26,
          background: "var(--wi-accent)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Globe size={13} color="#fff" />
        </div>
        Web Crawler
      </div>

      <button className="wi-hamburger" onClick={onMenuClick} aria-label="Open navigation">
        <Menu size={18} />
      </button>
    </header>
  );
}
