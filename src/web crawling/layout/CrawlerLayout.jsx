import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileDrawer from "./MobileDrawer";
import "../crawler.css";

export default function CrawlerLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="wi-shell">
      {/* Fixed left sidebar — desktop only */}
      <Sidebar />

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Main content area */}
      <div className="wi-main-area">
        {/* Mobile topbar */}
        <Topbar onMenuClick={() => setDrawerOpen(true)} />

        <div className="wi-page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
