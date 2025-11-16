import React from "react";

export default function PaymentReviewModal({ payment, onClose, onApprove, onReject, API_URL }) {
  if (!payment) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
      <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 w-[90%] max-w-lg">
        <h2 className="text-xl font-bold mb-4">Review Payment</h2>

        <div className="space-y-2 text-slate-300">
          <p><b>Name:</b> {payment.name}</p>
          <p><b>Phone:</b> {payment.phone}</p>
          <p><b>Amount:</b> ₹{payment.amount}</p>
          <p>
            <b>Type:</b>{" "}
            {payment.type === "seat" ? "Seat Reservation" : "Book Purchase"}
          </p>
        </div>

        {/* Screenshot */}
        {payment.screenshotPath && (
          <img
            src={`${API_URL}/${payment.screenshotPath}`}
            alt="Payment Screenshot"
            className="w-full mt-4 rounded border border-slate-700"
          />
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onReject}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-500"
          >
            Reject
          </button>

          <button
            onClick={onApprove}
            className="px-4 py-2 bg-emerald-500 text-black rounded hover:bg-emerald-400"
          >
            Approve
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
