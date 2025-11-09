// src/components/ui/progress.jsx
import React from "react";

export function Progress({ value = 0, className = "" }) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      ></div>
    </div>
  );
}
