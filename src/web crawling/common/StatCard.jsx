import React from "react";


export default function StatCard({ icon: Icon, label, value, sub, color = "indigo" }) {
  return (
    <div className="wi-stat-card">
      <div className={`wi-stat-icon ${color}`}>
        {Icon && <Icon size={18} />}
      </div>
      <div>
        <div className="wi-stat-label">{label}</div>
        <div className="wi-stat-value">{value}</div>
        {sub && <div className="wi-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}
