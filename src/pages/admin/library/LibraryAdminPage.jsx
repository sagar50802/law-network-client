import React from "react";
import AdminSidebar from "./AdminSidebar.jsx";

export default function LibraryAdminPage() {
  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">
          📚 Library Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          <a
            href="/admin/library/payments"
            className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700"
          >
            <h2 className="font-semibold text-lg">💰 Payment Requests</h2>
            <p className="text-sm text-slate-300">
              Review screenshots & approve seat or book purchases
            </p>
          </a>

          <a
            href="/admin/library/seats"
            className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700"
          >
            <h2 className="font-semibold text-lg">💺 Active Seats</h2>
            <p className="text-sm text-slate-300">
              View reservations & expiry timers
            </p>
          </a>

          <a
            href="/admin/library/book-purchases"
            className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700"
          >
            <h2 className="font-semibold text-lg">📖 Paid Book Access</h2>
            <p className="text-sm text-slate-300">
              Approve reading access or view active windows
            </p>
          </a>

          <a
            href="/admin/library/settings"
            className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700"
          >
            <h2 className="font-semibold text-lg">⚙️ Library Settings</h2>
            <p className="text-sm text-slate-300">
              Auto-approve mode, seat price, durations, etc.
            </p>
          </a>

        </div>
      </div>
    </div>
  );
}
