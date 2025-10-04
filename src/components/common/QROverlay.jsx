// client/src/components/common/QROverlay.jsx
import { useEffect, useState, useMemo } from "react";
import { API_BASE } from "../../utils/api";
import { savePending, loadPending } from "../../utils/pending";
import useApprovalWatcher from "../../hooks/useApprovalWatcher";
import PendingBadge from "../common/PendingBadge";
import UnlockWait from "../common/UnlockWait";
import AccessTimer from "../common/AccessTimer";
import { saveAccess } from "../../utils/access";

export default function QROverlay({ open, onClose, title, feature, featureId }) {
  const [cfg, setCfg] = useState({ url: "", currency: "₹", plans: {} });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", file: null });
  const [pending, setPending] = useState({});
  const [unlocking, setUnlocking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ------------------ Load QR + plan config ------------------ */
  async function fetchConfig() {
    try {
      const r = await fetch(`${API_BASE}/api/qr/current?ts=${Date.now()}`).then((res) => res.json());
      if (r?.success) setCfg(r);
    } catch (e) {
      console.error("QR config fetch failed:", e);
    }
  }
  useEffect(() => { if (open) fetchConfig(); }, [open]);

  /* ------------------ Restore pending (per email) ------------- */
  useEffect(() => {
    if (form.email) {
      const saved = loadPending(feature, featureId, form.email);
      if (saved) setPending(saved);
    }
  }, [form.email, feature, featureId]);

  /* ------------------ Admin Approval Watcher ------------------ */
  const { status, approved, expiry, message } = useApprovalWatcher(
    pending,
    { feature, featureId, email: form.email }
  );

  // Close the overlay on any global "accessGranted"
  useEffect(() => {
    const onGranted = () => onClose?.();
    window.addEventListener("accessGranted", onGranted);
    return () => window.removeEventListener("accessGranted", onGranted);
  }, [onClose]);

  // After approval → 15s unlocking → persist → close → soft refresh → tiny reload
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

  /* ------------------ Helpers: UPI deep-link ------------------ */
  const vpa =
    cfg.upi?.trim() ||
    cfg.upiId?.trim() ||
    cfg.vpa?.trim() ||
    cfg.vpaId?.trim() ||
    ""; // optional
  const payee = cfg.payee?.trim() || cfg.payeeName?.trim() || "Law Network";

  const planPrice = useMemo(() => {
    if (!selectedPlan) return undefined;
    const amt = cfg?.plans?.[selectedPlan]?.price;
    return typeof amt === "number" ? amt : undefined;
  }, [selectedPlan, cfg]);

  function buildUPI(params = {}) {
    // Only include amount if available; never send "0"
    const q = new URLSearchParams({
      pa: vpa || "",
      pn: payee || "Merchant",
      cu: "INR",
      ...(planPrice ? { am: String(planPrice) } : {}),
      tr: `${feature}-${featureId}-${Date.now()}`,
      tn: `${title || feature} plan`,
      ...params,
    });
    // Remove blank keys (if vpa not configured)
    for (const [k, v] of [...q.entries()]) if (!v) q.delete(k);
    return `upi://pay?${q.toString()}`;
  }

  // Silent attempt to open a URI without new tabs
  function tryOpen(uri, delay = 0) {
    setTimeout(() => {
      // <a> click works well across Android browsers
      const a = document.createElement("a");
      a.href = uri;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { try { document.body.removeChild(a); } catch {} }, 1200);
    }, delay);
  }

  function openUpiCascade() {
    const upi = buildUPI();
    // 1) Generic upi://pay
    tryOpen(upi, 0);

    // 2) GPay intent
    const gpayIntent =
      `intent://upi/pay?${upi.split("?")[1]}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
    tryOpen(gpayIntent, 700);

    // 3) PhonePe deeplink
    const phonepe = `phonepe://upi/pay?${upi.split("?")[1]}`;
    tryOpen(phonepe, 1200);

    // 4) Paytm deeplink
    const paytm = `paytmmp://pay?${upi.split("?")[1]}`;
    tryOpen(paytm, 1700);
  }

  /* ------------------ Submit request ------------------ */
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

      const r = await fetch(`${API_BASE}/api/submissions`, { method: "POST", body: fd }).then((res) => res.json());
      if (r?.success) {
        const record = {
          id: r.id,
          shortId: String(r.id).slice(-6),
          expiry: r.expiry,
          planKey: selectedPlan,
          name: form.name,
          email: form.email,
          step1: true, // chosen plan
          step2: pending.step2, // scanned
          step3: true, // filled form
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

  /* ------------------ Progress graph state ------------------ */
  const step1Done = !!selectedPlan;
  const step2Done = !!pending.step2; // tapped QR
  const step3Done = !!(form.name && form.phone && form.email);

  let progressClass = "step-graph-progress";
  if (step3Done) progressClass += " step-3";
  else if (step2Done) progressClass += " step-2";
  else if (step1Done) progressClass += " step-1";

  /* ------------------ Render ------------------ */
  return (
    <div className="fixed inset-y-0 right-0 bg-white shadow-2xl w-full max-w-md z-50 overflow-y-auto">
      {/* tiny css needed for scan-line + progress if your global css doesn't have it */}
      <style>
        {`
        @keyframes qr-scan {
          0% { transform: translateY(-70%); opacity:.75; }
          100% { transform: translateY(70%); opacity:.75; }
        }
        .qr-scan-line {
          position:absolute; left:6%; right:6%;
          height:18%; top:0; border-radius:12px;
          background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(34,197,94,.45) 50%, rgba(0,0,0,0) 100%);
          filter: blur(0.4px);
          animation: qr-scan 2.4s linear infinite;
          mix-blend: screen;
          pointer-events:none;
        }
        .qr-frame { box-shadow: 0 0 0 3px rgba(34,197,94,.4) inset, 0 0 0 1px rgba(16,185,129,.35); }
        .step-graph { position:relative; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; align-items:center; }
        .step-graph .step-graph-progress { position:absolute; left:0; right:0; height:4px; top:14px; background:rgba(203,213,225,.6); border-radius:9999px; overflow:hidden; }
        .step-graph .step-graph-progress::after { content:""; position:absolute; left:0; top:0; bottom:0; width:0%; background:linear-gradient(90deg, #22c55e, #16a34a); transition:width .35s ease; }
        .step-graph .step-graph-progress.step-1::after { width:33.333%; }
        .step-graph .step-graph-progress.step-2::after { width:66.666%; }
        .step-graph .step-graph-progress.step-3::after { width:100%; }
        .step-node { width:26px; height:26px; border-radius:9999px; display:flex; align-items:center; justify-content:center; background:#e5e7eb; color:#111827; z-index:1; font-weight:700; }
        .step-node.active { background:#22c55e; color:white; box-shadow:0 0 0 4px rgba(34,197,94,.18); }
      `}
      </style>

      <div className="p-5 relative">
        {/* Close */}
        <button onClick={onClose} className="absolute right-3 top-3 text-red-600 font-bold text-lg">✕</button>

        {/* Title */}
        <h3 className="font-semibold text-lg mb-3 text-pink-500">{feature} – {title}</h3>

        {/* Steps */}
        <div className="step-graph mb-4 text-xs md:text-sm font-semibold">
          <div className={progressClass}></div>
          <div className={`step-node ${step1Done ? "active" : ""}`}>1</div>
          <div className={`step-node ${step2Done ? "active" : ""}`}>2</div>
          <div className={`step-node ${step3Done ? "active" : ""}`}>3</div>
        </div>

        <div className="flex justify-between mb-3 text-xs md:text-sm font-semibold">
          <div className={step1Done ? "text-green-600" : ""}>Step 1: Choose Plan</div>
          <div className={step2Done ? "text-green-600" : ""}>Step 2: Scan QR</div>
          <div className={step3Done ? "text-green-600" : ""}>Step 3: Fill Info</div>
        </div>

        {/* Plans */}
        <div className="flex gap-2 mb-3">
          {["weekly", "monthly", "yearly"].map((p) => (
            <button
              key={p}
              onClick={() => {
                setSelectedPlan(p);
                setPending((s) => ({ ...s, step1: true }));
              }}
              className={`px-3 py-1 rounded-full border text-sm ${
                selectedPlan === p ? "bg-yellow-300 animate-pulse" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {cfg.plans[p]?.label} – {cfg.currency}{cfg.plans[p]?.price}
            </button>
          ))}
        </div>

        {/* QR block (with LED scan & deep-link on tap) */}
        <div className="mb-2">
          {cfg.url ? (
            <div className="relative">
              {/* image */}
              <img
                src={`${API_BASE}${cfg.url}?v=${Date.now()}`}
                alt="QR code"
                className="w-full h-56 object-contain border rounded-xl bg-white qr-frame"
              />
              {/* scan line */}
              <div className="qr-scan-line" />
              {/* invisible hit area to trigger deep-link cascade */}
              <button
                type="button"
                aria-label="Tap to open UPI app"
                title="Tap QR to open UPI app"
                className="absolute inset-0 rounded-xl focus:outline-none"
                onClick={() => {
                  // mark step2 done and fire deep links (no image open)
                  setPending((s) => ({ ...s, step2: true }));
                  openUpiCascade();
                }}
              />
            </div>
          ) : (
            <div className="w-full h-56 flex items-center justify-center border rounded-xl text-gray-400 bg-gray-50">
              QR image unavailable
            </div>
          )}

          <p className="text-[11px] text-center mt-1 text-rose-600">
            कृपया QR Code पर टैप करें — आपका UPI ऐप खुलेगा (tap to open UPI app)
          </p>
        </div>

        {/* Form / Pending states */}
        <div className="mt-3">
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
                  <p className="text-sm mb-2">Hi {pending.name || "User"}, your subscription has been approved.</p>
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
                deadline={pending.expiry ? new Date(pending.expiry).toLocaleString() : "Waiting for approval"}
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
                }}
              />
              <input
                placeholder="Phone"
                className="border rounded p-2"
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((s) => ({ ...s, phone: val }));
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

              {/* Step 4 - Screenshot */}
              <p className="text-sm">👉 Step 4: Upload your payment screenshot</p>
              <div className="border rounded-xl p-3 text-sm bg-pink-50 relative">
                <label className="flex items-center justify-between text-pink-600 font-semibold mb-2">
                  <span>Upload Payment Screenshot</span>
                  <span className="flex items-center gap-3 text-green-600 animate-bounce select-none">
                    <svg className="w-8 h-8 md:w-9 md:h-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    </div>
  );
}
