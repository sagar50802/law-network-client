// client/src/components/common/QROverlay.jsx
import { useEffect, useMemo, useState } from "react";
import { API_ORIGIN, API_BASE } from "../../utils/api"; // ✅ use ORIGIN for images
import { savePending, loadPending } from "../../utils/pending";
import useApprovalWatcher from "../../hooks/useApprovalWatcher";
import PendingBadge from "../common/PendingBadge";
import UnlockWait from "../common/UnlockWait";
import AccessTimer from "../common/AccessTimer";
import { saveAccess } from "../../utils/access";

const bust = (u) => (u ? `${u}${u.includes("?") ? "&" : "?"}t=${Date.now()}` : u);
// ✅ static files should be built with API_ORIGIN (no /api)
const toAbs = (u) => (!u ? "" : /^https?:\/\//i.test(u) ? u : `${API_ORIGIN}${u}`);

function buildUpiUrl({ upiId, amount, label = "Law Network", note = "Subscription" }) {
  if (!upiId) return "upi://pay";
  const qs = new URLSearchParams({ pa: upiId, pn: label, tn: note, cu: "INR" });
  if (amount) qs.set("am", String(amount));
  return `upi://pay?${qs.toString()}`;
}

export default function QROverlay({ open, onClose, title, feature, featureId }) {
  const [cfg, setCfg] = useState({ url: "", currency: "₹", plans: {}, upi: "" });
  const [qrSrc, setQrSrc] = useState("");
  const [qrError, setQrError] = useState(false);
  const [triedDefault, setTriedDefault] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", file: null });
  const [pending, setPending] = useState({});
  const [unlocking, setUnlocking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load minimal QR config each time overlay opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        // 👇 API calls should use API_BASE (has /api)
        const r = await fetch(`${API_BASE}/qr/current?ts=${Date.now()}`).then((res) => res.json());
        if (r?.success) {
          const upi =
            r.upi || r.upiId || r.vpa || (r.meta && (r.meta.upi || r.meta.vpa)) || "";
          const rawUrl = r.url || "/uploads/qr/current.jpg";
          setCfg({
            url: rawUrl,
            currency: r.currency || "₹",
            plans: r.plans || {},
            upi,
          });
          setQrError(false);
          setTriedDefault(false);
          setQrSrc(bust(toAbs(rawUrl))); // ✅ build with ORIGIN
        } else {
          setQrSrc(bust(toAbs("/uploads/qr/current.jpg")));
        }
      } catch {
        setQrSrc(bust(toAbs("/uploads/qr/current.jpg")));
      }
    })();
  }, [open]);

  // If first src fails, try default once
  function onQrError() {
    if (!triedDefault) {
      setTriedDefault(true);
      setQrSrc(bust(toAbs("/uploads/qr/current.jpg")));
      return;
    }
    setQrError(true);
  }

  // Restore pending after user types email
  useEffect(() => {
    if (!form.email) return;
    const saved = loadPending(feature, featureId, form.email);
    if (saved) setPending(saved);
  }, [form.email, feature, featureId]);

  // Live approval watcher
  const { status, approved, expiry, message } = useApprovalWatcher(pending, {
    feature,
    featureId,
    email: form.email,
  });

  // Close overlay on broadcast grant
  useEffect(() => {
    const onGranted = () => onClose?.();
    window.addEventListener("accessGranted", onGranted);
    return () => window.removeEventListener("accessGranted", onGranted);
  }, [onClose]);

  // 15s wait after approval → persist → refresh
  useEffect(() => {
    if (status !== "approved" || !approved) return;
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
  }, [status, approved, expiry, message, feature, featureId, form.email, onClose]);

  // Amount from plan
  const amount = useMemo(() => {
    const key = selectedPlan;
    if (!key) return undefined;
    const v = cfg?.plans?.[key]?.price;
    return v == null ? undefined : Number(v) || undefined;
  }, [selectedPlan, cfg]);

  const upiId = cfg.upi || "";
  const upiUrl = buildUpiUrl({
    upiId,
    amount,
    label: "Law Network",
    note: title || "Subscription",
  });

  // Tap QR → mark step 2 and open UPI after 0.8s
  function handleQrTap(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setPending((s) => ({ ...s, step2: true }));
    setTimeout(() => {
      try {
        window.location.href = upiUrl;
      } catch {}
    }, 800);
  }

  // Submit form (unchanged)
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

      const r = await fetch(`${API_BASE}/submissions`, { method: "POST", body: fd }).then((res) =>
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

  if (!open) return null;

  let progressClass = "step-graph-progress";
  if (pending?.step3) progressClass += " step-3";
  else if (pending?.step2) progressClass += " step-2";
  else if (pending?.step1) progressClass += " step-1";

  return (
    <div className="fixed inset-y-0 right-0 bg-white shadow-2xl w-full max-w-md z-50 overflow-y-auto">
      <div className="p-5 relative">
        <button onClick={onClose} className="absolute right-3 top-3 text-red-600 font-bold text-lg">
          ✕
        </button>

        <h3 className="font-semibold text-lg mb-3 animate-pulse text-pink-500">
          {feature} – {title}
        </h3>

        <div className="step-graph mb-4 text-xs md:text-sm font-semibold">
          <div className={progressClass}></div>
          <div className={`step-node ${pending?.step1 ? "active" : ""}`}>1</div>
          <div className={`step-node ${pending?.step2 ? "active" : ""}`}>2</div>
          <div className={`step-node ${pending?.step3 ? "active" : ""}`}>3</div>
        </div>

        <div className="flex justify-between mb-3 text-xs md:text-sm font-semibold">
          <div className={pending?.step1 ? "text-green-600" : ""}>Step 1: Choose Plan</div>
          <div className={pending?.step2 ? "text-green-600" : "step-2-blink"}>Step 2: Scan QR</div>
          <div className={pending?.step3 ? "text-green-600" : ""}>Step 3: Fill Info</div>
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
              {cfg.plans[p]?.label} – {cfg.currency}
              {cfg.plans[p]?.price}
            </button>
          ))}
        </div>

        {/* QR area */}
        <div className="mb-3 text-center">
          <div
            className={`relative w-full h-56 border rounded-xl bg-gray-50 overflow-hidden ${
              pending?.step2 ? "" : "qr-glow"
            } ${qrError ? "opacity-60" : "cursor-pointer"}`}
            onClick={qrError ? undefined : handleQrTap}
            role="button"
            aria-label="Tap to pay with UPI"
          >
            {!qrError && qrSrc ? (
              <>
                <img
                  src={qrSrc}
                  alt="QR code"
                  onError={onQrError}
                  className="w-full h-full object-contain select-none pointer-events-none"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  draggable={false}
                />
                <div className="pointer-events-none absolute inset-0">
                  <div className="scanline" />
                </div>
              </>
            ) : (
              <div className="w-full h-full grid place-items-center text-gray-400 text-sm">
                QR image unavailable (ask admin to upload)
              </div>
            )}
          </div>
          <p className="step-2-blink text-xs mt-1">
            कृपया QR Code पर टैप करें — आपका UPI ऐप खुलेगा (Tap QR to open UPI)
          </p>
        </div>

        {/* Pay button */}
        <div className="mb-4">
          <a
            href={upiUrl}
            onClick={() => setPending((s) => ({ ...s, step2: true }))}
            className={`block text-center px-4 py-2 rounded font-semibold ${
              selectedPlan
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
            aria-disabled={!selectedPlan}
          >
            {selectedPlan ? `Pay ${cfg.currency}${amount || ""} with UPI` : "Select a plan to pay"}
          </a>
          {!upiId && (
            <div className="text-[12px] text-center text-amber-700 mt-2">
              Admin has not set a UPI ID; users can still scan the QR above.
            </div>
          )}
        </div>

        {/* Pending/Approved/Form — unchanged */}
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
                Selected Plan: <b>{cfg.plans[selectedPlan]?.label} – {cfg.currency}{cfg.plans[selectedPlan]?.price}</b>
              </div>
            )}

            <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded">
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .scanline {
          position:absolute; left:0; right:0; top:10%; height:4px; border-radius:999px;
          background: rgba(16,185,129,0.85); box-shadow:0 0 14px rgba(16,185,129,0.65);
          animation: scan 2.4s linear infinite;
        }
        @keyframes scan { 0%{top:10%;opacity:.9} 50%{top:90%;opacity:.85} 100%{top:10%;opacity:.9} }
      `}</style>
    </div>
  );
}
