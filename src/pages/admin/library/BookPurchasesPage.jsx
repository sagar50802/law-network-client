import React, { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

export default function BookPurchasesPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load purchases on page load
  useEffect(() => {
    load();
  }, []);

  // Fetch all approved book purchases
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

  // Optional: revoke a user's access manually
  async function revokeAccess(purchaseId) {
    if (!window.confirm("Are you sure you want to revoke this access?")) return;

    try {
      await fetch(`${API_URL}/api/admin/library/book-purchases/revoke/${purchaseId}`, {
        method: "POST",
        credentials: "include",
      });

      load();
    } catch (err) {
      console.error("Revoke failed:", err);
      alert("Failed to revoke access.");
    }
  }

  const now = Date.now();

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content */}
      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">📖 Paid Book Access</h1>

        {loading ? (
          <p className="text-slate-400">Loading book purchases...</p>
        ) : purchases.length === 0 ? (
          <p className="text-slate-400">No paid book purchases found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="py-2 px-2">Book</th>
                  <th className="py-2 px-2">User</th>
                  <th className="py-2 px-2">Readable Until</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Actions</th>
                </tr>
              </thead>

              <tbody>
                {purchases.map((p) => {
                  const expiresAt = new Date(p.readingExpiresAt).getTime();
                  const isExpired = expiresAt < now;

                  return (
                    <tr
                      key={p._id}
                      className="border-b border-slate-800 hover:bg-slate-800/40"
                    >
                      {/* Book */}
                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-100">
                          {p.book?.title || "Unknown"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.book?.subject}
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3 px-2">
                        <div className="font-medium">
                          {p.user?.name || "Unknown User"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {p.user?.phone}
                        </div>
                      </td>

                      {/* Expiry */}
                      <td className="py-3 px-2">
                        <span
                          className={`${
                            isExpired ? "text-red-400" : "text-emerald-300"
                          }`}
                        >
                          {new Date(p.readingExpiresAt).toLocaleString()}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2">
                        {isExpired ? (
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
                      <td className="py-3 px-2">
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
