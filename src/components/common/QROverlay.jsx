// client/src/components/common/QROverlay.jsx
import { useEffect, useState, useMemo } from "react";
import { absUrl } from "../../utils/api";                     // ✅ robust server URL builder
import { savePending, loadPending } from "../../utils/pending";
import useApprovalWatcher from "../../hooks/useApprovalWatcher";
import PendingBadge from "../common/PendingBadge";
import UnlockWait from "../common/UnlockWait";
import AccessTimer from "../common/AccessTimer";
import { saveAccess } from "../../utils/access";

// Small helper: safely add a cache-buster
const bust = (u) => (u ? `${u}${u.includes("?") ? "&" : "?"}t=${Date.now()}` : u);

// Build UPI deep link (amount optional)
function buildUpiUrl({ upiId, amount, label = "Law Network", note = "Subscription" }) {
  if (!upiId) return "";
  const q = new URLSearchParams({
    pa: upiId,            // VPA
    pn: label,            // payee name
    tn: note,             // note
    cu: "INR",
  });
  if (amount) q.set("am", String(amount));
  return `upi://pay?${q.toString()}`;
}

// Try opening a URL without changing your page (mobile friendly)
function tryOpen(url, delay = 0) {
  if (!url) return;
  setTimeout(() => {
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 120);
  }, delay);
}

export default function QROverlay({ open, onClose, title, feature, featureId }) {
  const [cfg, setCfg] = useState({
    url: "",               // /uploads/qr/xxxx.jpg
    currency: "₹",
    plans: {},             // { weekly:{label,price}, monthly:{...}, yearly:{...} }
    upi: "",               // server may send as upi / upiId / vpa (we normalize below)
  });

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", file: null });
  const [pending, setPending] = useState({});
  const [unlocking, setUnlocking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ---------- Fetch QR config ----------
  async function fetchConfig() {
    try {
      const res = await fetch(absUrl("/api/qr/current") + `?ts=${Date.now()}`);
      const data = await res.json();
      if (data?.success) {
        const upi =
          data.upi ||
          data.upiId ||
          data.vpa ||
          (data.meta && (data.meta.upi || data.meta.vpa)) ||
          "";
        setCfg({ ...data, upi });
      }
    } catch (e) {
      console.error("QR config fetch failed:", e);
    }
  }
  useEffect(() => {
    if (open) fetchConfig();
  }, [open]);

  // ---------- Restore pending ----------
  useEffect(() => {
    if (form.email) {
      const saved = loadPending(feature, featureId, form.email);
      if (saved) setPending(saved);
    }
  }, [form.email, feature, featureId]);

  // ---------- Live approval watcher ----------
  const { status, approved, expiry, message } = useApprovalWatcher(pending, {
    feature,
    featureId,
    email: form.email,
  });

  // Close overlay when any "accessGranted" broadcast arrives
  useEffect(() => {
    const onGranted = () => onClose?.();
    window.addEventListener("accessGranted", onGranted);
    return () => window.removeEventListener("accessGranted", onGranted);
  }, [onClose]);

  // When approved → 15s unlocking → persist access → soft refresh
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

  // ---------- Robust QR image URL (with fallbacks) ----------
  const [qrSrc, setQrSrc] = useState("");
  const [triedAlt, setTriedAlt] = useState(false);

  useEffect(() => {
    if (!cfg?.url) {
      setQrSrc("");
      return;
    }
    // Use absUrl so "/uploads/*" works whether server is proxied or not
    setQrSrc(bust(absUrl(cfg.url)));
    setTriedAlt(false);
  }, [cfg.url]);

  const onQrError = () => {
    // First fallback: strip accidental /api prefix
    if (!triedAlt && cfg.url?.startsWith("/api/")) {
      setTriedAlt(true);
      setQrSrc(bust(absUrl(cfg.url.replace(/^\/api/, ""))));
      return;
    }
    // Final fallback: conventional path
    setQrSrc(bust(absUrl("/uploads/qr/current.jpg")));
  };

  // ---------- UPI deep-link on tap ----------
  const amount = useMemo(() => {
    const key = selectedPlan;
    if (!key) return undefined;
    const v = cfg?.plans?.[key]?.price;
    return v == null ? undefined : Number(v) || undefined;
  }, [selectedPlan, cfg]);

  function onTapQr() {
    // Step 1 marker
    setPending((s) => ({ ...s, step1: true }));

    // Deep-link cascade (no image popup)
    const upiId = cfg.upi;
    const upiUrl = buildUpiUrl({ upiId, amount, label: "Law Network", note: title || "Subscription" });
    // Standard UPI
    tryOpen(upiUrl, 0);
    // Gentle follow-ups for popular apps (Android)
    if (upiId) {
      const qp = `pa=${encodeURIComponent(upiId)}${amount ? `&am=${amount}` : ""}&pn=Law%20Network&cu=INR&tn=${encodeURIComponent(title || "Subscription")}`;
      tryOpen(`intent://pay?${qp}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end;`, 300);
      tryOpen(`intent://pay?${qp}#Intent;scheme=upi;package=com.phonepe.app;end;`, 600);
      tryOpen(`intent://pay?${qp}#Intent;scheme=upi;package=net.one97.paytm;end;`, 900);
    }
  }

  // ---------- Submit ----------
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

      const r = await fetch(absUrl("/api/submissions"), { method: "POST", body: fd }).then((x) =>
        x.json()
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

  if (!open) return null;

  // Progress graph classes (unchanged look; smoother step movement)
  let progressClass = "step-graph-progress";
  if (pending?.step3) progressClass += " step-3";
  else if (pending?.step2) progressClass += " step-2";
  else if (pending?.step1) progressClass += " step-1";

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

        {/* Progress bar */}
        <div className="step-graph mb-4 text-xs md:text-sm font-semibold">
          <div className={progressClass}></div>
          <div className={`step-node ${pending?.step1 ? "active" : ""}`}>1</div>
          <div className={`step-node ${pending?.step2 ? "active" : ""}`}>2</div>
          <div className={`step-node ${pending?.step3 ? "active" : ""}`}>3</div>
        </div>

        {/* Step labels */}
        <div className="flex justify-between mb-4 text-xs md:text-sm font-semibold">
          <div className={pending?.step1 ? "text-green-600" : "step-1-blink"}>Step 1: Choose Plan</div>
          <div className={pending?.step2 ? "text-green-600" : "step-2-blink"}>Step 2: Scan QR</div>
          <div className={pending?.step3 ? "text-green-600" : "step-3-blink"}>Step 3: Fill Info</div>
        </div>

        {/* Plans */}
        <div className="flex gap-2 mb-3">
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

        {/* QR box */}
        <div className="mb-2">
          <div
            className={`relative w-full h-56 border rounded-xl bg-gray-50 overflow-hidden ${
              pending?.step2 ? "" : "qr-glow"
            }`}
          >
            {qrSrc ? (
              <>
                <img
                  src={qrSrc}
                  onError={onQrError}
                  alt="QR code"
                  className="w-full h-full object-contain select-none"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  onClick={() => {
                    // Step 2 mark + deep link (no image popup)
                    setPending((s) => ({ ...s, step2: true }));
                    onTapQr();
                  }}
                />
                {/* scanning line */}
                <div className="pointer-events-none absolute inset-0">
                  <div className="scanline" />
                </div>
              </>
            ) : (
              <div className="w-full h-full grid place-items-center text-gray-400 text-sm">
                QR image unavailable
              </div>
            )}
          </div>
          <p className="step-2-blink text-xs mt-1">
            कृपया QR Code पर टैप करें — आपका UPI ऐप खुलेगा (tap to open UPI app)
          </p>
        </div>

        {/* Pending / Approved / Form */}
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
            <p className="step-3-blink text-sm">👉 Please fill your info details</p>
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

            {/* Screenshot */}
            <p className="text-sm">👉 Step 4: Upload your payment screenshot</p>
            <div className="border rounded-xl p-3 text-sm bg-pink-50 relative">
              <label className="flex items-center justify-between text-pink-600 font-semibold mb-2">
                <span>Upload Payment Screenshot</span>
                <span className="flex items-center gap-3 text-green-600 animate-bounce select-none">
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4v12" />
                    <path d="M8 12l4 4 4-4" />
                  </svg>
                  <span className="text-green-700 font-extrabold text-base uppercase tracking-wide">
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

      {/* tiny styles for scan line if you don't already have them */}
      <style>{`
        .scanline {
          position: absolute;
          left: 0; right: 0;
          top: 10%;
          height: 4px;
          border-radius: 999px;
          background: rgba(16,185,129,0.85);
          box-shadow: 0 0 14px rgba(16,185,129,0.65);
          animation: scan 2.4s linear infinite;
        }
        @keyframes scan {
          0% { top: 10%; opacity: .9; }
          50% { top: 90%; opacity: .85; }
          100% { top: 10%; opacity: .9; }
        }
      `}</style>
    </div>
  );
}
