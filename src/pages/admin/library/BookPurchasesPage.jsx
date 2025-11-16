import React, { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

export default function BookPurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // auto-refresh every 30 sec
    return () => clearInterval(interval);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/library/book-purchases`, {
        credentials: "include",
      });

      const json = await res.json();
      if (json.success) {
        setPurchases(json.data || []);
      }
    } catch (err) {
      console.error("[Admin] Book purchases load error:", err);
    }
    setLoading(false);
  }

  async function revokeAccess(purchaseId) {
    if (!window.confirm("Are you sure you want to revoke this user's book access?")) return;

    try {
      await fetch(
        `${API_URL}/api/admin/library/book-purchases/revoke/${purchaseId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      load();
    } catch (err) {
      console.error("Revoke failed:", err);
      alert("Failed to revoke access.");
    }
  }

  // Helper: Calculate time left
  function timeLeft(expiresAt) {
    const ms = new Date(expiresAt) - new Date();
    if (ms <= 0) return "Expired";

    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  }

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">📖 Paid Book Access</h1>

        {loading ? (
          <p className="text-slate-400">Loading book purchases...</p>
        ) : purchases.length === 0 ? (
          <p className="text-slate-400">No paid book purchases found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
              <thead className="bg-slate-700 text-left">
                <tr>
                  <th className="py-2 px-3">Book</th>
                  <th className="py-2 px-3">User</th>
                  <th className="py-2 px-3">Readable Until</th>
                  <th className="py-2 px-3">Time Left</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {purchases.map((p) => {
                  const expired = new Date(p.readingExpiresAt) < new Date();

                  return (
                    <tr
                      key={p._id}
                      className="border-t border-slate-700 hover:bg-slate-700/40"
                    >
                      {/* Book info */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-100">
                          {p.book?.title || "Unknown Book"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.book?.subject || "No subject"}
                        </div>
                      </td>

                      {/* User info */}
                      <td className="py-3 px-3">
                        <div className="font-medium">
                          {p.user?.name || "Unknown User"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.user?.phone || "No phone"}
                        </div>
                      </td>

                      {/* Readable until */}
                      <td className="py-3 px-3">
                        <span
                          className={`${expired ? "text-red-400" : "text-emerald-300"}`}
                        >
                          {new Date(p.readingExpiresAt).toLocaleString()}
                        </span>
                      </td>

                      {/* Time Left */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-1 bg-black/40 rounded text-yellow-300">
                          {timeLeft(p.readingExpiresAt)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        {expired ? (
                          <span className="px-2 py-1 text-xs rounded bg-red-600 text-white">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded bg-emerald-600 text-black font-semibold">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => revokeAccess(p._id)}
                          className="px-3 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
