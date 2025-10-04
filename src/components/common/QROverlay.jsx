// client/src/components/QROverlay/QROverlay.jsx
import { useEffect, useState } from "react";
import { API_BASE } from "../../utils/api";
import { savePending, loadPending } from "../../utils/pending";
import useApprovalWatcher from "../../hooks/useApprovalWatcher";
import PendingBadge from "../common/PendingBadge";
import UnlockWait from "../common/UnlockWait";
import AccessTimer from "../common/AccessTimer";
import { saveAccess } from "../../utils/access";

export default function QROverlay({ open, onClose, title, feature, featureId }) {
  const [cfg, setCfg] = useState({ url: "", currency: "₹", plans: {}, upi: {} });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", file: null });
  const [pending, setPending] = useState({});
  const [unlocking, setUnlocking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* -------------------- fetch QR + Plan config -------------------- */
  async function fetchConfig() {
    try {
      const r = await fetch(`${API_BASE}/api/qr/current?ts=${Date.now()}`).then((res) =>
        res.json()
      );
      if (r?.success) {
        setCfg({
          url: r.url || "",
          currency: r.currency || "₹",
          plans: r.plans || {},
          upi: r.upi || {},
        });
      }
    } catch (err) {
      console.error("Failed to fetch QR config:", err);
    }
  }
  useEffect(() => {
    if (open) fetchConfig();
  }, [open]);

  /* -------------------- restore pending by email ------------------- */
  useEffect(() => {
    if (form.email) {
      const saved = loadPending(feature, featureId, form.email);
      if (saved) setPending(saved);
    }
  }, [form.email, feature, featureId]);

  /* ----- watch admin approval (SSE / polling handled in hook) ------ */
  const { status, approved, expiry, message } = useApprovalWatcher(pending, {
    feature,
    featureId,
    email: form.email,
  });

  /* ---- close overlay immediately on any 'accessGranted' broadcast -- */
  useEffect(() => {
    const onGranted = () => onClose?.();
    window.addEventListener("accessGranted", onGranted);
    return () => window.removeEventListener("accessGranted", onGranted);
  }, [onClose]);

  /* ------------- after approval: 15s “unlocking” countdown --------- */
  useEffect(() => {
    if (status === "approved" && approved) {
      setUnlocking(true);
      const t = setTimeout(() => {
        // persist access & gently refresh UI
        saveAccess(feature, featureId, form.email, expiry, message);
        setUnlocking(false);
        if (typeof onClose === "function") onClose();

        // nudge all widgets
        window.dispatchEvent(new Event("focus"));
        window.dispatchEvent(
          new CustomEvent("softRefresh", { detail: { feature, featureId } })
        );

        // one-time reload (keeps the green timers in player / lists consistent)
        setTimeout(() => window.location.reload(), 150);
      }, 15000);
      return () => clearTimeout(t);
    }
  }, [status, approved, expiry, message, feature, featureId, form.email, onClose]);

  /* ------------------------- UPI intent helper ---------------------- */
  function openUPI(amount, planLabel) {
    const am = Number(amount || 0).toFixed(2);

    // If a proper UPI VPA is configured, construct a standards-compliant intent
    if (cfg?.upi?.pa) {
      const tr = `LN${Date.now()}`;
      const params = new URLSearchParams({
        pa: cfg.upi.pa, // payee VPA (required)
        pn: cfg.upi.pn || "Law Network",
        am, // amount
        cu: "INR",
        tn: `${planLabel || "Plan"} – ${feature}: ${title}`.slice(0, 80),
        tr,
        tid: tr,
      });
      if (cfg.upi.mc) params.set("mc", String(cfg.upi.mc));
      if (cfg.upi.refUrl) params.set("url", String(cfg.upi.refUrl));

      const href = `upi://pay?${params.toString()}`;
      window.location.href = href;
      return;
    }

    // Fallback (no VPA): still mark progress & open generic UPI chooser.
    setPending((s) => ({ ...s, step2: true }));
    setTimeout(() => (window.location.href = "upi://pay"), 250);
  }

  /* --------------------------- submit form -------------------------- */
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

      const r = await fetch(`${API_BASE}/api/submissions`, {
        method: "POST",
        body: fd,
      }).then((res) => res.json());

      if (r?.success) {
        const record = {
          id: r.id,
          shortId: String(r.id).slice(-6),
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

  if (!open) return null;

  /* --------- progress bar uses existing step1/2/3 semantics ---------
     We keep your visual/logic intact:
       - Step 1 (graph): Scan QR      → pending.step1
       - Step 2 (graph): Fill Info    → pending.step2
       - Step 3 (graph): Upload Shot  → pending.step3
     “Choose Plan” stays above the graph (no change to nodes).
  ------------------------------------------------------------------- */
  let progressClass = "";
  if (pending?.step3) progressClass = "step-graph-progress step-3";
  else if (pending?.step2) progressClass = "step-graph-progress step-2";
  else if (pending?.step1) progressClass = "step-graph-progress step-1";
  else progressClass = "step-graph-progress";

  return (
    <div className="fixed inset-y-0 right-0 bg-white shadow-2xl w-full max-w-md z-50 overflow-y-auto">
      <div className="p-5 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-red-600 font-bold text-lg"
        >
          ✕
        </button>

        {/* Title */}
        <h3 className="font-semibold text-lg mb-3 animate-pulse text-pink-500">
          {feature} – {title}
        </h3>

        {/* Step 1: Choose Plan (placed before graph, per your UI) */}
        <div className="mb-2 text-xs font-semibold">
          <span>Step 1: Choose Plan</span>
        </div>
        <div className="flex gap-2 mb-4">
          {["weekly", "monthly", "yearly"].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPlan(p)}
              className={`px-3 py-1 rounded-full border text-sm ${
                selectedPlan === p
                  ? "bg-yellow-300 animate-pulse"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {cfg.plans[p]?.label} – {cfg.currency}
              {cfg.plans[p]?.price}
            </button>
          ))}
        </div>

        {/* Progress Graph (kept exactly as before) */}
        <div className="step-graph mb-4 text-xs md:text-sm font-semibold">
          <div className={progressClass}></div>
          <div className={`step-node ${pending?.step1 ? "active" : ""}`}>2</div>
          <div className={`step-node ${pending?.step2 ? "active" : ""}`}>3</div>
          <div className={`step-node ${pending?.step3 ? "active" : ""}`}>4</div>
        </div>

        {/* Step labels (unchanged texts except order shown) */}
        <div className="flex justify-between mb-4 text-xs md:text-sm font-semibold">
          <div className={pending?.step1 ? "text-green-600" : "step-1-blink"}>
            Step 2: Scan QR {pending?.step1 && <span className="tick-animate">✅</span>}
          </div>
          <div className={pending?.step2 ? "text-green-600" : "step-2-blink"}>
            Step 3: Fill Info {pending?.step2 && <span className="tick-animate">✅</span>}
          </div>
          <div className={pending?.step3 ? "text-green-600" : "step-3-blink"}>
            Step 4: Upload Screenshot{" "}
            {pending?.step3 && <span className="tick-animate">✅</span>}
          </div>
        </div>

        {/* QR Image (tap to open UPI intent with amount if plan is chosen) */}
        {cfg.url ? (
          <div className="mb-4 text-center">
            <img
              src={`${API_BASE}${cfg.url}?t=${Date.now()}`}
              alt="QR code"
              className={`w-full h-56 object-contain border rounded-xl bg-gray-50 ${
                pending?.step1 ? "" : "cursor-pointer qr-glow"
              }`}
              onClick={() => {
                if (!selectedPlan) {
                  alert("Please choose a plan first");
                  return;
                }
                // Mark Step 2 in your original graph model
                setPending((s) => ({ ...s, step1: true }));
                const price = cfg.plans?.[selectedPlan]?.price;
                const label = cfg.plans?.[selectedPlan]?.label;
                if (price) setTimeout(() => openUPI(price, label), 500);
                else setTimeout(() => (window.location.href = "upi://pay"), 500);
              }}
            />
            {!pending?.step1 && (
              <p className="step-1-blink text-xs mt-1">
                कृपया QR Code पर टैप करें और स्कैन करें (Tap QR to Scan & Pay)
              </p>
            )}
            {pending?.step1 && (
              <p className="step-1-blink text-xs mt-1">
                कृपया payment के बाद स्क्रीन शॉट लेना ना भूले
                <br /> (Please don't forget to take screenshot after payment done)
              </p>
            )}
          </div>
        ) : (
          <div className="w-full h-56 flex items-center justify-center border rounded-xl text-gray-400">
            No QR uploaded yet
          </div>
        )}

        {/* Pending or Form */}
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
                <p className="text-sm mb-2">
                  Hi {pending.name}, your subscription has been approved.
                </p>
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
                pending.expiry
                  ? new Date(pending.expiry).toLocaleString()
                  : "Waiting for approval"
              }
            />
          )
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-3">
            <p className="step-2-blink text-sm">👉 Please fill your info details</p>
            <input
              placeholder="Your Name"
              className="border rounded p-2"
              value={form.name}
              onChange={(e) => {
                const val = e.target.value;
                setForm((s) => ({ ...s, name: val }));
                if (val && form.phone && form.email) {
                  setPending((s) => ({ ...s, step2: true }));
                }
              }}
            />
            <input
              placeholder="Phone"
              className="border rounded p-2"
              value={form.phone}
              onChange={(e) => {
                const val = e.target.value;
                setForm((s) => ({ ...s, phone: val }));
                if (val && form.name && form.email) {
                  setPending((s) => ({ ...s, step2: true }));
                }
              }}
            />
            <input
              placeholder="Gmail"
              className="border rounded p-2"
              value={form.email}
              onChange={(e) => {
                const val = e.target.value;
                setForm((s) => ({ ...s, email: val }));
                if (val && form.name && form.phone) {
                  setPending((s) => ({ ...s, step2: true }));
                }
              }}
            />

            {/* Screenshot block */}
            <p className="step-3-blink text-sm">👉 Step 4: Upload your payment screenshot</p>
            <div className="border rounded-xl p-3 text-sm bg-pink-50 relative">
              <label className="flex items-center justify-between text-pink-600 font-semibold mb-2">
                <span>Upload Payment Screenshot</span>
                <span className="flex items-center gap-3 text-green-600 animate-bounce select-none drop-shadow-[0_0_8px_rgba(34,197,94,0.45)]">
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
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
