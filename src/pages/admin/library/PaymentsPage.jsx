import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdminSidebar from "./AdminSidebar.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/library/payments`, {
        credentials: "include",
      });

      const json = await res.json();
      if (json.success) {
        setPayments(json.data || []);
      }
    } catch (err) {
      console.error("[Admin] load payments error:", err);
    }

    setLoading(false);
  }

  async function handleApprove(paymentId) {
    await fetch(`${API_URL}/api/admin/library/payment/approve/${paymentId}`, {
      method: "POST",
      credentials: "include",
    });

    loadPayments();
  }

  async function handleReject(paymentId) {
    await fetch(`${API_URL}/api/admin/library/payment/reject/${paymentId}`, {
      method: "POST",
      credentials: "include",
    });

    loadPayments();
  }

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      <AdminSidebar />

      <div className="flex-1 p-6">
        <h1 className="text-xl font-bold mb-6">💰 Payment Requests</h1>

        {loading ? (
          <p>Loading...</p>
        ) : payments.length === 0 ? (
          <p className="text-slate-400">No pending payments.</p>
        ) : (
          <div className="space-y-4">
            {payments.map((p) => (
              <div
                key={p._id}
                className="border border-slate-700 rounded-lg p-4 bg-slate-800"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">
                      {p.type === "seat" ? "💺 Seat Reservation" : "📖 Book Purchase"}
                    </p>

                    <p className="text-sm text-slate-300">
                      Name: {p.name || "N/A"} • Phone: {p.phone || "N/A"}
                    </p>

                    <p className="text-sm text-slate-400">
                      Amount: <span className="text-green-400">₹{p.amount}</span>
                    </p>

                    <p className="text-xs mt-1">
                      Status:{" "}
                      <span
                        className={
                          p.status === "submitted"
                            ? "text-yellow-300"
                            : p.status === "approved"
                            ? "text-green-400"
                            : "text-red-400"
                        }
                      >
                        {p.status}
                      </span>
                    </p>
                  </div>

                  {p.screenshotPath && (
                    <img
                      src={`${API_URL}/${p.screenshotPath}`}
                      alt="Payment Screenshot"
                      className="w-24 h-24 object-cover rounded border border-slate-700 cursor-pointer"
                    />
                  )}
                </div>

                {p.status === "submitted" && (
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleApprove(p._id)}
                      className="px-3 py-1 bg-emerald-500 text-black rounded hover:bg-emerald-400"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => handleReject(p._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
