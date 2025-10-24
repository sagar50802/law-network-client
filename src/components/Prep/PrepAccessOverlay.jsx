// client/src/components/Prep/PrepAccessOverlay.jsx
import React, { useEffect, useState, useRef } from "react";
import { getJSON, postJSON } from "../../utils/api";

/**
 * PrepAccessOverlay.jsx
 * Full functional payment + approval overlay.
 * Handles payment, WhatsApp proof, submission, polling, and auto-unlock.
 * Works hand-in-hand with PrepWizard.jsx
 */

export default function PrepAccessOverlay({ examId, email, onApproved }) {
  const [step, setStep] = useState(1); // 1=Pay, 2=Proof, 3=Submit
  const [form, setForm] = useState({ name: "", phone: "", email: email || "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("checking"); // checking | waiting | approved | rejected | inactive
  const pollRef = useRef(null);
  const approvedRef = useRef(false);

  const upiId = "7767045080@ptyes";
  const waNumber = "7767045080";

  // ------------------------------------------
  // 1️⃣ Initial access status check + polling
  // ------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      if (!examId || !email) return;
      try {
        const qs = new URLSearchParams({ examId, email });
        const res = await getJSON(`/api/prep/access/status/guard?${qs.toString()}`);
        const st = res?.access?.status || "inactive";
        if (cancelled) return;
        setStatus(st);

        // ✅ Auto-approve + debounce guard
        if (st === "active" && !approvedRef.current) {
          approvedRef.current = true;
          setStatus("approved");
          setTimeout(() => {
            if (typeof onApproved === "function") onApproved();
          }, 400);
        }
      } catch (err) {
        console.error("Guard check failed", err);
        if (!cancelled) {
          // Retry once on fail
          setTimeout(fetchStatus, 3000);
        }
      }
    }

    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 5000);

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [examId, email, onApproved]);

  // ------------------------------------------
  // 2️⃣ Handle proof submission
  // ------------------------------------------
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setError("All fields are required.");
      return;
    }
    setLoading(true);
    try {
      const body = { ...form, examId };
      const res = await postJSON("/api/prep/access/request", body);
      if (res?.success) {
        setStep(3);
        setStatus("waiting");
      } else {
        throw new Error(res?.message || "Submission failed");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------
  // 3️⃣ WhatsApp proof redirect
  // ------------------------------------------
  function sendWhatsAppProof() {
    const msg = encodeURIComponent(
      `Hello, I have paid for ${examId}.\nName: ${form.name}\nPhone: ${form.phone}\nEmail: ${form.email}`
    );
    window.open(`https://wa.me/91${waNumber}?text=${msg}`, "_blank");
  }

  // ------------------------------------------
  // 4️⃣ Render form UI
  // ------------------------------------------
  const disabled = loading || status === "approved" || status === "waiting";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 relative text-center max-h-[90vh] overflow-auto">
        <h2 className="text-sm font-semibold mb-2">
          Start / Restart — <span className="uppercase">{examId}</span>
        </h2>

        {/* Progress Steps */}
        <div className="flex justify-center items-center mb-4 text-xs text-gray-600">
          <Step n={1} label="Pay via UPI" active={step >= 1} />
          <Step n={2} label="Send Proof" active={step >= 2} />
          <Step n={3} label="Submit" active={step >= 3} />
        </div>

        {/* Step 1 - Pay */}
        <button
          disabled
          className="w-full py-2 mb-2 rounded bg-gray-200 text-gray-700 font-medium cursor-not-allowed"
        >
          Pay via UPI
        </button>

        {/* Step 2 - Proof */}
        <button
          onClick={sendWhatsAppProof}
          disabled={disabled}
          className="w-full py-2 mb-2 rounded border text-sm font-medium hover:bg-gray-50"
        >
          Send Proof on WhatsApp
        </button>

        <p className="text-[11px] text-gray-500 mb-2">
          Tip: On desktop, copy UPI ID <b>{upiId}</b> and pay from your phone.{" "}
          <button
            onClick={() => navigator.clipboard.writeText(upiId)}
            className="underline text-blue-600 ml-1"
          >
            Copy
          </button>
        </p>

        {/* Step 3 - Submit Form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            disabled={disabled}
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            disabled={disabled}
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled}
            className={`w-full py-2 rounded font-semibold ${
              disabled ? "bg-gray-300" : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {loading ? "Submitting…" : "Submit"}
          </button>
        </form>

        {error && <div className="text-red-500 text-xs mt-2">{error}</div>}

        {/* Status indicator */}
        {status === "waiting" && (
          <div className="text-xs text-gray-600 mt-3">
            Waiting for admin approval… You’ll get access automatically once approved.
            <button
              onClick={() => window.location.reload()}
              className="text-xs underline text-blue-600 mt-2 block"
            >
              Refresh Access
            </button>
          </div>
        )}

        {status === "approved" && (
          <div className="text-green-600 text-sm font-medium animate-pulse mt-2">
            ✅ Access granted! Redirecting…
          </div>
        )}

        {status === "rejected" && (
          <p className="text-xs text-red-600 mt-3">Payment rejected. Please contact support.</p>
        )}

        <p className="text-[10px] text-gray-400 mt-3">
          After approval, your schedule starts again from Day 1 with the original release timings.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------
   Step indicator subcomponent
------------------------------------------ */
function Step({ n, label, active }) {
  return (
    <div className="flex items-center">
      <div
        className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center mr-1 ${
          active ? "bg-green-600 text-white" : "bg-gray-300 text-gray-600"
        }`}
      >
        {n}
      </div>
      <span className={`${active ? "text-black font-medium" : "text-gray-400"}`}>{label}</span>
      {n < 3 && <span className="mx-2 text-gray-300">›</span>}
    </div>
  );
}
