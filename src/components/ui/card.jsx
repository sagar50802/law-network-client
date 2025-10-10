// src/components/ui/card.jsx
import React from "react";

export function Card({ className = "", children }) {
  return (
    <div className={`rounded-xl border border-purple-200 bg-white shadow-sm p-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children }) {
  return <div className={`mb-2 ${className}`}>{children}</div>;
}

export function CardTitle({ className = "", children }) {
  return <h3 className={`text-lg font-semibold text-purple-700 ${className}`}>{children}</h3>;
}

export function CardContent({ className = "", children }) {
  return <div className={`text-gray-700 text-sm ${className}`}>{children}</div>;
}
