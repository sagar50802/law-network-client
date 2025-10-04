// client/src/components/Payments/QROverlay.jsx
import { useEffect, useState } from "react";
import { API_BASE } from "../../utils/api";
import { savePending, loadPending } from "../../utils/pending";
import useApprovalWatcher from "../../hooks/useApprovalWatcher";
import PendingBadge from "../common/PendingBadge";
import UnlockWait from "../common/UnlockWait";
import AccessTimer from "../common/AccessTimer";
import { saveAccess } from "../../utils/access";

// Ensure we can load /uploads/* assets (strip trailing /api)
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

export default function QROverlay({ open, onClose, title, feature, featureId }) {
  const [cfg, setCfg] = useState({ url: "", currency: "₹", plans: {} });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", file: null });
  const [pending, setPending] = useState({});
  const [unlocking, setUnlocking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imgError, setImgError] = useState(false);

  const qrSrc = cfg?.url ? `${API_ORIGIN}${cfg.url}?t=${Date.now()}` : "";

  async function fetchConfig() {
    try {
      // Should return { success, url, currency, plans, upi? } — upi can be `upi`, `upiId` or `vpa`
      const r = await fetch(`${API_BASE}/api/qr/current?ts=${Date.now()}`).then((res) => res.json());
      if (r?.success) {
        setCfg(r);
        setImgError(false);
      }
    } catch (err) {
      console.error("Failed to fetch QR config:", err);
    }
  }
  useEffect(() => {
    if (open) fetchConfig();
  }, [open]);

  // Restore pending flow
  useEffect(() => {
    if (form.email) {
      const saved = loadPending(feature, featureId, form.email);
      if (saved) setPending(saved);
    }
  }, [form.email, feature, featureId]);

  // Watch server approval
  const { status, approved, expiry, message } = useApprovalWatcher(pending, {
    feature,
    featureId,
    email: form.email,
  });

  // Close on broadcast
  useEffect(() => {
    const onGranted = () => onClose?.();
    window.addEventListener("accessGranted", onGranted);
    return () => window.removeEventListener("accessGranted", onGranted);
  }, [onClose]);

  // 15s wait → persist → refresh
  useEffect(() => {
    if (status === "approved" && approved) {
      setUnlocking(true);
      const t = setTimeout(() => {
        saveAccess(feature, featureId, form.email, expiry, message);
        setUnlocking(false);
        onClose?.();
        window.dispatchEvent(new Event("focus"));
        window.dispatchEvent(new CustomEvent("softRefresh", { detail: { feature, featureId } }));
        setTimeout(() => window.location.reload(), 150);
      }, 15000);
      return () => clearTimeout(t);
    }
  }, [status, approved, expiry, message, feature, featureId, form.email, onClose]);

  // Submit (unchanged)
  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedPlan) return alert("Select a plan");
    if (!form.file) return alert("Upload screenshot");
    if (!form.email) return alert("Enter your email");

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("phone", form.phone);
      fd.append("email", form.email);
      fd.append("planKey", selectedPlan);
      fd.append("planLabel", cfg.plans[selectedPlan]?.label);
      fd.append("planPrice", cfg.plans[selectedPlan]?.price);
      fd.append("screenshot", form.file);
      fd.append("type", feature);
      fd.append("id", featureId);

      const r = await fetch(`${API_BASE}/api/submissions`, { method: "POST", body: fd }).then((res) =>
        res.json()
      );
      if (r?.success) {
        const record = {
          id: r.id,
          shortId: String(r.id || "").slice(-6),
          expiry: r.expiry,
          planKey: selectedPlan,
          name: form.name,
          email: form.email,
          step1: pending.step1,
          step2: pending.step2,
          step3: pending.step3,
        };
        setPending(record);
        savePending(feature, featureId, form.email, record);
        localStorage.setItem("userEmail", form.email);
      } else {
        alert("Failed to submit request");
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Step bar class
  let progressClass = "";
  if (pending?.step3) progressClass = "step-graph-progress step-3";
  else if (pending?.step2) progressClass = "step-graph-progress step-2";
  else if (pending?.step1) progressClass = "step-graph-progress step-1";
  else progressClass = "step-graph-progress";

  // Tap QR → UPI first, fallback to image only if needed
  function handleTapQR() {
    // must choose plan for amount
    if (!selectedPlan) {
      alert("Please choose a plan first");
      return;
    }

    // mark steps 1+2 (choose plan + scan)
    setPending((s) => ({ ...s, step1: true, step2: true }));

    const upi = cfg.upi || cfg.upiId || cfg.vpa || "";
    const amount = cfg?.plans?.[selectedPlan]?.price;
    const label = cfg?.plans?.[selectedPlan]?.label || selectedPlan || "";

    // If we have UPI + amount → try deep link
    if (upi && amount) {
      const tn = `Law Network – ${label}`;
      const deep = `upi://pay?pa=${encodeURIComponent(upi)}&am=${encodeURIComponent(
        amount
      )}&cu=INR&tn=${encodeURIComponent(tn)}`;

      // Try UPI; if app doesn't open (blocked / desktop), fallback to manual scan
      const beforeVisible = document.visibilityState;
      window.location.href = deep;

      // Fallback if the page stays visible after a moment
      setTimeout(() => {
        const stillHere = document.visibilityState === "visible";
        if (stillHere && qrSrc) {
          window.open(qrSrc, "_blank", "noopener,noreferrer");
        }
      }, 1200);
      return;
    }

    // Otherwise: no UPI configured → manual scan
    if (qrSrc) window.open(qrSrc, "_blank", "noopener,noreferrer");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 bg-white shadow-2xl w-full max-w-md z-50 overflow-y-auto">
      <div className="p-5 relative">
        {/* Close */}
        <button onClick={onClose} className="absolute right-3 top-3 text-red-600 font-bold text-lg">
          ✕
        </button>

        {/* Title */}
        <h3 className="font-semibold text-lg mb-3 animate-pulse text-pink-500">
          {feature} – {title}
        </h3>

        {/* Step graph */}
        <div className="step-graph mb-4 text-xs md:text-sm font-semibold">
          <div className={progressClass}></div>
          <div className={`step-node ${pending?.step1 ? "active" : ""}`}>1</div>
          <div className={`step-node ${pending?.step2 ? "active" : ""}`}>2</div>
          <div className={`step-node ${pending?.step3 ? "active" : ""}`}>3</div>
        </div>

        {/* Labels (kept to your copy) */}
        <div className="flex justify-between mb-4 text-xs md:text-sm font-semibold">
          <div className={pending?.step1 ? "text-green-600" : ""}>Step 1: Choose Plan</div>
          <div className={pending?.step2 ? "text-green-600" : ""}>Step 2: Scan QR</div>
          <div className={pending?.step3 ? "text-green-600" : ""}>Step 3: Fill Info</div>
        </div>

        {/* Plans */}
        <div className="flex gap-2 mb-4">
          {["weekly", "monthly", "yearly"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlan(p)}
              className={`px-3 py-1 rounded-full border text-sm ${
                selectedPlan === p ? "bg-yellow-300 animate-pulse" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {cfg.plans[p]?.label} – {cfg.currency}
              {cfg.plans[p]?.price}
            </button>
          ))}
        </div>

        {/* QR block */}
        <div className="mb-3">
          <div className="w-full h-56 border rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
            {cfg.url && !imgError ? (
              <img
                src={qrSrc}
                alt="QR code"
                className={`w-full h-full object-contain ${selectedPlan ? "cursor-pointer" : ""}`}
                crossOrigin="anonymous"
                onError={() => setImgError(true)}
                onClick={handleTapQR}
                title={selectedPlan ? "Tap to pay" : "Select a plan first"}
              />
            ) : (
              <div className="text-gray-400 text-sm">QR image unavailable</div>
            )}
          </div>
          <p className="text-center text-xs mt-1">
            कृपया QR Code पर टैप करें और स्कैन करें (Tap QR to Scan &amp; Pay)
          </p>
        </div>

        {/* Pending OR Form */}
        {pending?.id ? (
          unlocking ? (
            <>
              <UnlockWait onDone={() => setUnlocking(false)} />
              <div className="mt-3 text-center text-green-600 font-extrabold text-base">
                🎉 Congratulations! Access granted. Finalizing in 15&nbsp;seconds…
              </div>
            </>
          ) : status === "approved" && approved ? (
            <div className="p-4 bg-green-50 rounded-xl border animate-pulse">
              <h4 className="font-semibold mb-2 text-green-700">Access Granted ✅</h4>
              {message ? (
                <p className="text-sm mb-2 whitespace-pre-line">{message}</p>
              ) : (
                <p className="text-sm mb-2">Hi {pending.name}, your subscription has been approved.</p>
              )}
              {expiry && (
                <div className="animate-blink">
                  <AccessTimer timeLeftMs={expiry - Date.now()} />
                </div>
              )}
            </div>
          ) : (
            <PendingBadge
              shortId={pending.shortId}
              deadline={
                pending.expiry ? new Date(pending.expiry).toLocaleString() : "Waiting for approval"
              }
            />
          )
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-3">
            <p className="text-sm">👉 Please fill your info details</p>
            <input
              placeholder="Your Name"
              className="border rounded p-2"
              value={form.name}
              onChange={(e) => {
                const val = e.target.value;
                setForm((s) => ({ ...s, name: val }));
                if (val && form.phone && form.email) setPending((s) => ({ ...s, step3: true }));
              }}
            />
            <input
              placeholder="Phone"
              className="border rounded p-2"
              value={form.phone}
              onChange={(e) => {
                const val = e.target.value;
                setForm((s) => ({ ...s, phone: val }));
                if (val && form.name && form.email) setPending((s) => ({ ...s, step3: true }));
              }}
            />
            <input
              placeholder="Gmail"
              className="border rounded p-2"
              value={form.email}
              onChange={(e) => {
                const val = e.target.value;
                setForm((s) => ({ ...s, email: val }));
                if (val && form.name && form.phone) setPending((s) => ({ ...s, step3: true }));
              }}
            />

            <p className="text-sm">👉 Step 4: Upload your payment screenshot</p>
            <div className="border rounded-xl p-3 text-sm bg-pink-50">
              <label className="flex items-center justify-between text-pink-600 font-semibold mb-2">
                <span>Upload Payment Screenshot</span>
                <span className="flex items-center gap-3 text-green-600 animate-bounce select-none">
                  <svg
                    className="w-8 h-8 md:w-9 md:h-9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 4v12" />
                    <path d="M8 12l4 4 4-4" />
                  </svg>
                  <span className="text-green-700 font-extrabold text-base md:text-lg uppercase tracking-wide">
                    Browse HERE TO UPLOAD PAYMENT SCREENSHOT
                  </span>
                </span>
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setForm((s) => ({ ...s, file }));
                  if (file) setPending((s) => ({ ...s, step3: true }));
                }}
              />
            </div>

            {selectedPlan && (
              <div className="text-sm p-2 border rounded bg-yellow-50">
                Selected Plan:{" "}
                <b>
                  {cfg.plans[selectedPlan]?.label} – {cfg.currency}
                  {cfg.plans[selectedPlan]?.price}
                </b>
              </div>
            )}
            <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded">
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
