import React from "react";

export default function ProgressBar({ label, value }) {
  const safe = Math.min(100, Math.max(0, value || 0));

  return (
    <div className="aw-progress-row">
      {label && <div className="aw-progress-label">{label}</div>}
      <div className="aw-progress-wrapper">
        <div className="aw-progress-bg">
          <div
            className="aw-progress-fill"
            style={{ width: `${safe}%` }}
          ></div>
        </div>
        <span className="aw-progress-value">{safe}%</span>
      </div>
    </div>
  );
}
