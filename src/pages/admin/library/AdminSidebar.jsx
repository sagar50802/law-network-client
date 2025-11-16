import React from "react";

export default function AdminSidebar() {
  return (
    <div className="w-56 h-screen bg-slate-950 border-r border-slate-800 p-4 hidden md:flex flex-col">
      <h2 className="text-lg font-bold mb-6">Library Admin</h2>

      <nav className="flex flex-col gap-3">
        <a href="/admin/library" className="hover:text-amber-400">🏠 Dashboard</a>
        <a href="/admin/library/payments" className="hover:text-amber-400">💰 Payment Requests</a>
        <a href="/admin/library/seats" className="hover:text-amber-400">💺 Seat Reservations</a>
        <a href="/admin/library/book-purchases" className="hover:text-amber-400">📖 Book Purchases</a>
        <a href="/admin/library/settings" className="hover:text-amber-400">⚙️ Settings</a>
        <a href="/" className="text-slate-400 mt-auto hover:text-white">← Back to Site</a>
      </nav>
    </div>
  );
}
