import React, { useEffect, useState } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import PaymentReviewModal from "./PaymentReviewModal.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [selectedPayment, setSelectedPayment] = useState(null);

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
      if (json.success) setPayments(json.data || []);
    } catch (err) {
      console.error("[Admin] load payments error:", err);
    }
    setLoading(false);
  }

  async function handleApprove(paymentId) {
    if (!paymentId) return;
    try {
      await fetch(
        `${API_URL}/api/admin/library/payment/approve/${paymentId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      await loadPayments();
    } catch (err) {
      console.error("[Admin] approve error:", err);
    }
  }

  async function handleReject(paymentId) {
    if (!paymentId) return;
    try {
      await fetch(
        `${API_URL}/api/admin/library/payment/reject/${paymentId}`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      await loadPayments();
    } catch (err) {
      console.error("[Admin] reject error:", err);
    }
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
                      Name: {p.name || "N/A"} • Phone: {p.phone || "N/A"}
                    </p>

                    <p className="text-sm text-slate-400">
                      Amount: ₹{p.amount}
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
                      onClick={() => setSelectedPayment(p)}
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

      {/* ⭐ Review Modal — render ONLY when selectedPayment exists */}
      {selectedPayment && (
        <PaymentReviewModal
          payment={selectedPayment}
          API_URL={API_URL}
          onClose={() => setSelectedPayment(null)}
          onApprove={() => {
            handleApprove(selectedPayment._id);
            setSelectedPayment(null);
          }}
          onReject={() => {
            handleReject(selectedPayment._id);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
}
