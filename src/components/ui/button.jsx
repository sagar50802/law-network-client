// src/components/ui/button.jsx
import React from "react";

export function Button({
  children,
  onClick,
  className = "",
  variant = "default",
  size = "md",
  disabled = false,
}) {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium focus:outline-none transition";
  const variants = {
    default: "bg-purple-600 text-white hover:bg-purple-700",
    outline: "border border-purple-300 text-purple-700 hover:bg-purple-50",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  };
  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
