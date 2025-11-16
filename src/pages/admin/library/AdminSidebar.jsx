import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function AdminSidebar() {
  const { pathname } = useLocation();

  // Helper to detect active tab
  const isActive = (path) =>
    pathname === path ? "text-amber-400 font-semibold" : "text-slate-300";

  return (
    <div className="w-56 h-screen bg-slate-950 border-r border-slate-800 p-4 hidden md:flex flex-col">
      <h2 className="text-lg font-bold mb-6">Library Admin</h2>

      <nav className="flex flex-col gap-3">

        <Link to="/admin/library" className={`${isActive("/admin/library")} hover:text-amber-400`}>
          🏠 Dashboard
        </Link>

        <Link
          to="/admin/library/payments"
          className={`${isActive("/admin/library/payments")} hover:text-amber-400`}
        >
          💰 Payment Requests
        </Link>

        <Link
          to="/admin/library/seats"
          className={`${isActive("/admin/library/seats")} hover:text-amber-400`}
        >
          💺 Seat Reservations
        </Link>

        <Link
          to="/admin/library/book-purchases"
          className={`${isActive("/admin/library/book-purchases")} hover:text-amber-400`}
        >
          📖 Book Purchases
        </Link>

        <Link
          to="/admin/library/settings"
          className={`${isActive("/admin/library/settings")} hover:text-amber-400`}
        >
          ⚙️ Settings
        </Link>

        <Link
          to="/"
          className="text-slate-400 mt-auto hover:text-white"
        >
          ← Back to Site
        </Link>
      </nav>
    </div>
  );
}
