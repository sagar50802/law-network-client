// src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

/**
 * Final overlay component
 * - Shows immediately AFTER trial ends for "After N days (per user)"
 * - Also shows on Day 1 when trialDays=0 AND offsetDays=0
 * - UPI deep link + WhatsApp proof buttons
 * - Name / Phone / Email fields
 * - Submit flips to "Waiting for approval" and polls until approved/rejected
 * - Works with server/routes/prep.js provided earlier
 */
export default function PrepAccessOverlay({ examId, email }) {
  /* ----------------------- localStorage keys ----------------------- */
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`,                       // flip to waiting
      upiStart: `overlayUPIStart:${e}:${u}`,                  // timers
      waStart: `overlayWAStart:${e}:${u}`,
    };
  }, [examId, email]);

  /* ----------------------- component state ------------------------ */
  const [state, setState] = useState({
    loading: true,
    show: !!(examId && localStorage.getItem(ks.wait)),
    mode: localStorage.getItem(ks.wait) ? "waiting" : "",     // purchase | restart | waiting
    exam: {},
    access: {},
    overlay: {},
    waiting: !!localStorage.getItem(ks.wait),
  });

  const [submitting, setSubmitting] = useState(false);
  const [nameField, setName] = useState("");
  const [phoneField, setPhone] = useState("");
  const [emailField, setEmailField] = useState(localStorage.getItem("userEmail") || email || "");

  // timers for "return to this tab"
  const [upiStartTs, setUpiStartTs] = useState(() => Number(localStorage.getItem(ks.upiStart) || 0));
  const [upiLeft, setUpiLeft] = useState(0);
  const [waStartTs, setWaStartTs] = useState(() => Number(localStorage.getItem(ks.waStart) || 0));
  const [waLeft, setWaLeft] = useState(0);
  const UPI_SECONDS = 104; // keep UX matching screenshot
  const WA_SECONDS = 168;

  useEffect(() => {
    if (!upiStartTs) return;
    const tick = () => setUpiLeft(Math.max(0, UPI_SECONDS - Math.floor((Date.now() - upiStartTs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [upiStartTs]);

  useEffect(() => {
    if (!waStartTs) return;
    const tick = () => setWaLeft(Math.max(0, WA_SECONDS - Math.floor((Date.now() - waStartTs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [waStartTs]);

  /* ----------------------- core fetch ------------------------------ */
  async function fetchStatus() {
    if (!examId) return;

    let keepWaiting = !!localStorage.getItem(ks.wait);
    try {
      const qs = new URLSearchParams({ examId, email: email || "" });
      const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
      const { exam, access, overlay } = r || {};

      // If brand-new user (no record) & email exists — start trial and refetch
      if (access?.status === "none" && email) {
        await postJSON("/api/prep/access/start-trial", { examId, email });
        return fetchStatus();
      }

      // Server decided overlay visibility (preferred)
      let mode = "";
      let show = false;

      if (overlay?.show && overlay?.mode) { show = true; mode = overlay.mode; }

      // Client-side safety net for "After N days (per user)"
      if (!show && exam?.overlay?.mode !== "never") {
        const todayDay = Number(r?.access?.todayDay || 1);
        const trialDays = Number(r?.access?.trialDays ?? exam?.trialDays ?? 0);
        const offsetDays = Number(exam?.overlay?.offsetDays ?? 0);
        // threshold = max(trialDays, offsetDays). Show when plan day > threshold
        const threshold = Math.max(trialDays, offsetDays);
        if ((access?.status === "trial" && todayDay > threshold) || (access?.status === "active" && access?.canRestart)) {
          show = true;
          mode = access?.status === "active" && access?.canRestart ? "restart" : "purchase";
        }
        // Special: trial=0 & offset=0 => show immediately (todayDay > 0)
        if (!show && trialDays === 0 && offsetDays === 0 && todayDay > 0) {
          show = true;
          mode = access?.status === "active" && access?.canRestart ? "restart" : "purchase";
        }
      }

      if (keepWaiting) { show = true; mode = "waiting"; }

      setState({
        loading: false,
        show,
        mode,
        waiting: mode === "waiting",
        exam: exam || {},
        access: access || {},
        overlay: overlay || {},
      });

      if (!emailField && email) setEmailField(email);
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }

  useEffect(() => { fetchStatus(); /* eslint-disable-next-line */ }, [examId, email]);

  // Poll request status when waiting
  useEffect(() => {
    if (!state.waiting || !emailField) return;
    let stop = false;
    const loop = async () => {
      if (stop) return;
      try {
        const qs = new URLSearchParams({ examId, email: emailField });
        const j = await getJSON(`/api/prep/access/request/status?${qs.toString()}`);
        if (j?.status === "approved") {
          localStorage.removeItem(ks.wait);
          stop = true;
          await fetchStatus();
          return;
        }
        if (j?.status === "rejected") {
          stop = true;
          localStorage.removeItem(ks.wait);
          setState(s => ({ ...s, show: false, mode: "", waiting: false }));
          alert("Your request was rejected. Please contact support.");
          return;
        }
      } catch {}
      setTimeout(loop, 5000);
    };
    loop();
    return () => { stop = true; };
    // eslint-disable-next-line
  }, [state.waiting, emailField, examId]);

  /* ----------------------- payment links --------------------------- */
  function buildPayMeta() {
    // Prefer values from /access/status payload (server)
    const pay = state?.overlay?.payment
      || state?.exam?.overlay?.payment
      || state?.exam?.payment
      || {};

    const courseName = state.exam?.name || String(examId || "").toUpperCase();
    const priceINR = Number(pay.priceINR ?? state.exam?.price ?? 0);
    const upiId = String(pay.upiId || "").trim();
    const upiName = String(pay.upiName || "").trim();
    let wa = String(pay.whatsappNumber || "").trim().replace(/[^\d+]/g, "");
    if (wa.startsWith("+")) wa = wa.slice(1);
    if (/^\d{10}$/.test(wa)) wa = "91" + wa;
    const waText = (pay.whatsappText || `Hello, I paid for "${courseName}" (₹${priceINR}).`).trim();

    const upiLink = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}`
        + (upiName ? `&pn=${encodeURIComponent(upiName)}` : "")
        + (priceINR ? `&am=${encodeURIComponent(priceINR)}` : "")
        + `&cu=INR&tn=${encodeURIComponent(`Payment for ${courseName}`)}`
      : "";

    const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : "";

    return { courseName, priceINR, upiId, upiName, upiLink, wa, waLink };
  }
  const pay = buildPayMeta();
  const isAndroid = /Android/i.test(navigator.userAgent);

  /* ----------------------- actions ------------------------------- */
  const handleUPI = () => {
    if (!pay.upiLink) return;
    const now = Date.now();
    localStorage.setItem(ks.upiStart, String(now));
    setUpiStartTs(now);
    try { window.location.href = pay.upiLink; } catch {}
  };

  const handleWA = () => {
    if (!pay.waLink) return;
    const now = Date.now();
    localStorage.setItem(ks.waStart, String(now));
    setWaStartTs(now);
    window.open(pay.waLink, "_blank", "noopener,noreferrer");
  };

  async function submit() {
    if (!state.show || state.mode === "waiting") return;
    const e = String(emailField || "").trim();
    if (!e || !e.includes("@")) { alert("Please enter a valid email."); return; }

    const fd = new FormData();
    fd.append("examId", examId);
    fd.append("email", e);
    fd.append("intent", state.mode === "restart" ? "restart" : "purchase");
    if (nameField) fd.append("name", nameField);
    if (phoneField) fd.append("phone", phoneField);

    localStorage.setItem("userEmail", e);

    setSubmitting(true);
    try {
      const res = await fetch("/api/prep/access/request", { method: "POST", body: fd, credentials: "include" });
      const j = await res.json();
      if (!res.ok || j?.success === false) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);

      // If admin enabled auto-grant, server returns approved:true — refresh
      if (j?.approved) {
        localStorage.removeItem(ks.wait);
        await fetchStatus();
        return;
      }

      // Otherwise flip to waiting and poll
      localStorage.setItem(ks.wait, "1");
      setState(s => ({ ...s, mode: "waiting", waiting: true, show: true }));
    } catch (e) {
      alert(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function copy(text) { try { navigator.clipboard?.writeText(text); } catch {} }

  /* ----------------------- render -------------------------------- */
  const mustVeil = state.show || (state.loading && !!localStorage.getItem(ks.wait));
  if (!mustVeil) return null;

  const title =
    state.mode === "waiting" ? "Waiting for approval"
      : `Start / Restart — ${pay.courseName}`;

  const submitDisabled = submitting || state.mode === "waiting" || !(emailField && emailField.trim());

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
          <div className="text-lg font-semibold mb-1">{title}</div>

          {state.mode === "waiting" && (
            <div className="text-sm text-emerald-700 mb-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <span>Waiting for admin approval…</span>
            </div>
          )}

          {/* Step hint */}
          {state.mode !== "waiting" && (
            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-600 text-white font-semibold">1</div>
                <span>Pay via UPI</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 mx-2" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-700 font-semibold">2</div>
                <span>Send Proof</span>
              </div>
              <div className="flex-1 h-px bg-gray-200 mx-2" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-700 font-semibold">3</div>
                <span>Submit</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {state.mode !== "waiting" && (
            <div className="grid gap-2 mb-3">
              <button
                className={`w-full py-3 rounded text-white text-lg font-semibold ${pay.upiLink ? "bg-emerald-600" : "bg-gray-300 cursor-not-allowed"}`}
                onClick={handleUPI}
                disabled={!pay.upiLink}
              >
                Pay via UPI
              </button>
              <button
                className={`w-full py-3 rounded text-lg font-semibold border ${pay.waLink ? "bg-white" : "bg-gray-100 cursor-not-allowed"}`}
                onClick={handleWA}
                disabled={!pay.waLink}
              >
                Send Proof on WhatsApp
              </button>
            </div>
          )}

          {/* Desktop UPI help */}
          {!isAndroid && pay.upiId && state.mode !== "waiting" && (
            <div className="text-[12px] text-gray-600 mb-3">
              Tip: On desktop, copy UPI ID <code className="bg-gray-100 px-1 rounded">{pay.upiId}</code>{" "}
              and pay from your phone. <button className="underline" onClick={() => copy(pay.upiId)}>Copy</button>
            </div>
          )}

          {/* Timers */}
          {(upiLeft > 0 || waLeft > 0) && state.mode !== "waiting" && (
            <div className="text-[12px] text-gray-700 mb-3">
              {upiLeft > 0 && <div className="mb-1">After paying, <b>return to this tab</b> to finish. Auto-focus in ~{upiLeft}s.</div>}
              {waLeft > 0 && <div>After sending the screenshot on WhatsApp, <b>come back here</b>. We’ll bring you back in ~{waLeft}s.</div>}
            </div>
          )}

          {/* Inputs */}
          {state.mode !== "waiting" && (
            <>
              <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Name"
                     value={nameField} onChange={e=>setName(e.target.value)} />
              <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Phone Number"
                     value={phoneField} onChange={e=>setPhone(e.target.value)} />
              <input className="w-full border rounded px-3 py-2 mb-3" type="email" required placeholder="Email"
                     value={emailField} onChange={e=>setEmailField(e.target.value)} />
            </>
          )}

          {/* Submit */}
          <button
            className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold disabled:opacity-60"
            onClick={state.mode === "waiting" ? undefined : submit}
            disabled={submitDisabled}
          >
            {state.mode === "waiting" ? "Waiting…" : "Submit"}
          </button>

          <div className="text-[11px] text-gray-500 mt-3">
            After approval, your schedule starts again from Day 1 with the original release timings.
          </div>
        </div>
      </div>
    </div>
  );
}
