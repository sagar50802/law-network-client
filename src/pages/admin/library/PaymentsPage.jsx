import React, { useEffect, useState } from "react";
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
      const res = await fetch(`${API_URL}/api/admin/library/payments`);
      const json = await res.json();
      if (json.success) setPayments(json.data || []);
    } catch (err) {
      console.error("[Admin] load payments error:", err);
    }
    setLoading(false);
  }

  async function handleApprove(payment) {
    if (payment.type === "seat") {
      await fetch(`${API_URL}/api/library/admin/seat/approve/${payment._id}`, {
        method: "POST",
        credentials: "include",
      });
    } else {
      await fetch(`${API_URL}/api/library/admin/book/approve/${payment._id}`, {
        method: "POST",
        credentials: "include",
      });
    }
    loadPayments();
  }

  async function handleReject(payment) {
    await fetch(`${API_URL}/api/admin/library/payments/reject/${payment._id}`, {
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
          <p className="text-slate-400">No payment requests pending.</p>
        ) : (
          <div className="space-y-4">
            {payments.map((p) => (
              <div
                key={p._id}
                className="border border-slate-700 rounded-lg p-4 bg-slate-800"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">
                      {p.type === "seat" ? "Seat Reservation" : "Book Purchase"}
                    </p>
                    <p className="text-sm text-slate-300">
                      Name: {p.name} • Phone: {p.phone}
                    </p>
                    <p className="text-sm text-slate-400">
                      Amount: ₹{p.amount}
                    </p>
                  </div>

                  {p.screenshotPath && (
                    <img
                      src={p.screenshotPath}
                      alt="Payment Screenshot"
                      className="w-24 h-24 object-cover rounded border border-slate-700"
                    />
                  )}
                </div>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => handleApprove(p)}
                    className="px-3 py-1 bg-emerald-500 text-black rounded hover:bg-emerald-400"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(p)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
