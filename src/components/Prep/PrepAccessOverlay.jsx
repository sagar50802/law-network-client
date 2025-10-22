// src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, upload as postForm } from "../../utils/api";

/* util */
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export default function PrepAccessOverlay({ examId, email }) {
  /* ---------- storage keys (isolated per examId + user) ---------- */
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait:       `overlayWaiting:${e}:${u}`,
      waitAt:     `overlayWaiting:${e}:${u}:at`,
      upiStart:   `overlayUPIStart:${e}:${u}`,
      waStart:    `overlayWAStart:${e}:${u}`,
      approved:   `overlayApprovedUntil:${e}:${u}`,
      lastActive: `overlayLastActiveAt:${e}:${u}`,
    };
  }, [examId, email]);

  /* ---------- component state ---------- */
  const [state, setState] = useState({
    loading: true,
    show: false,
    step: 1,                 // 1 = UPI, 2 = WhatsApp + form
    mode: "",                // "purchase" | "restart" | "waiting" | "approved"
    exam: {},
    access: {},
    overlay: {},
  });

  // form fields
  const [nameField, setName] = useState("");
  const [phoneField, setPhone] = useState("");
  const [emailField, setEmailField] = useState(localStorage.getItem("userEmail") || email || "");
  const [submitting, setSubmitting] = useState(false);

  // timers: “return to this tab” helpers
  const [upiStartTs, setUpiStartTs] = useState(() => Number(localStorage.getItem(ks.upiStart) || 0));
  const [waStartTs, setWaStartTs] = useState(() => Number(localStorage.getItem(ks.waStart) || 0));
  const [upiLeft, setUpiLeft] = useState(0);
  const [waLeft, setWaLeft] = useState(0);
  const UPI_SECONDS = 104;
  const WA_SECONDS = 168;

  // approval countdown
  const APPROVE_SECONDS = 15;
  const [approveLeft, setApproveLeft] = useState(() => {
    const until = Number(localStorage.getItem(ks.approved) || 0);
    return until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
  });

  /* ---------- helpers: admin-configured payment ---------- */
  function computePayMeta() {
    const pay = state?.overlay?.payment
      || state?.exam?.overlay?.payment
      || state?.exam?.payment
      || {};

    const courseName = state?.exam?.name || String(examId || "").toUpperCase();
    const priceINR = Number(pay.priceINR ?? state?.exam?.price ?? 0);

    const upiId = String(pay.upiId || "").trim();
    const upiName = String(pay.upiName || "").trim();
    let wa = String(pay.whatsappNumber || "").trim().replace(/[^\d+]/g, "");
    if (wa.startsWith("+")) wa = wa.slice(1);
    if (/^\d{10}$/.test(wa)) wa = "91" + wa; // normalize 10-digit to +91
    const waText = (pay.whatsappText || `Hello, I paid for "${courseName}" (₹${priceINR}).`).trim();

    const upiLink = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}${upiName ? `&pn=${encodeURIComponent(upiName)}` : ""}${priceINR ? `&am=${encodeURIComponent(priceINR)}` : ""}&cu=INR&tn=${encodeURIComponent(`Payment for ${courseName}`)}`
      : "";

    const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : "";

    return { courseName, priceINR, upiId, upiName, upiLink, wa, waLink };
  }
  const pay = useMemo(computePayMeta, [state?.overlay, state?.exam, examId]);
  const isAndroid = /Android/i.test(navigator.userAgent);

  /* ---------- effects: auxiliary timers ---------- */
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

  // countdown for approved state
  useEffect(() => {
    if (state.mode !== "approved") return;
    const tick = () => {
      const until = Number(localStorage.getItem(ks.approved) || 0);
      const left = until > Date.now() ? Math.ceil((until - Date.now()) / 1000) : 0;
      setApproveLeft(clamp(left, 0, APPROVE_SECONDS));
      if (left <= 0) unlockNow(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mode]);

  /* ---------- fetch access/overlay (HARD GATE unless ACTIVE) ---------- */
  async function fetchStatus() {
    if (!examId) return;

    // expire stale waiting (>15 min)
    const startedAt = Number(localStorage.getItem(ks.waitAt) || 0);
    if (startedAt && Date.now() - startedAt > 15 * 60 * 1000) {
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
    }
    const keepWaiting = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({ examId, email: email || "" });
      const r = await getJSON(`/api/prep/access/status/guard?${qs.toString()}`);
      const { exam, access, overlay } = r || {};

      // ACTIVE → hide overlay (unless finishing approval countdown)
      if (access?.status === "active") {
        localStorage.setItem(ks.lastActive, String(Date.now()));
        const until = Number(localStorage.getItem(ks.approved) || 0);
        if (until > Date.now()) {
          setState((s) => ({ ...s, loading: false, show: true, mode: "approved", exam, access, overlay }));
        } else {
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState((s) => ({ ...s, loading: false, show: false, mode: "", exam, access, overlay }));
        }
        if (!emailField && email) setEmailField(email);
        return;
      }

      // NOT ACTIVE → gate ON immediately
      let mode = overlay?.mode || "purchase";
      if (keepWaiting) mode = "waiting";

      setState((s) => ({
        ...s,
        loading: false,
        show: true,
        mode,
        step: 1,
        exam: exam || {},
        access: access || {},
        overlay: overlay || {},
      }));

      if (!emailField && email) setEmailField(email);
    } catch {
      // fail-safe: keep gating
      setState((s) => ({ ...s, loading: false, show: true, step: 1, mode: "purchase" }));
    }
  }
  useEffect(() => { fetchStatus(); /* eslint-disable-next-line */ }, [examId, email]);

  /* ---------- poll while waiting ---------- */
  useEffect(() => {
    if (state.mode !== "waiting" || !emailField) return;
    let stop = false;
    let missed = 0;

    const loop = async () => {
      if (stop) return;
      try {
        const qs = new URLSearchParams({ examId, email: emailField });
        const j = await getJSON(`/api/prep/access/request/status?${qs.toString()}`);
        if (j?.status === "approved") {
          const until = Date.now() + 15 * 1000;
          localStorage.setItem(ks.approved, String(until));
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          stop = true;
          setState((s) => ({ ...s, show: true, mode: "approved" }));
          return;
        }
        if (j?.status === "rejected") {
          stop = true;
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState((s) => ({ ...s, show: true, mode: "" }));
          alert("Your request was rejected. Please contact support.");
          return;
        }
        if (!j?.status) missed += 1;
        if (missed >= 3) {
          stop = true;
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState((s) => ({ ...s, show: true, mode: "" }));
          alert("We didn’t find your request. Please submit again.");
          return;
        }
      } catch {}
      setTimeout(loop, 5000);
    };

    loop();
    return () => { stop = true; };
    // eslint-disable-next-line
  }, [state.mode, emailField, examId]);

  /* ---------- actions ---------- */
  const goNext = () => setState((s) => ({ ...s, step: 2 }));
  const goBack = () => setState((s) => ({ ...s, step: 1 }));

  const clickUPI = () => {
    if (!pay.upiLink) return;
    const now = Date.now();
    localStorage.setItem(ks.upiStart, String(now));
    setUpiStartTs(now);
    try { window.location.href = pay.upiLink; } catch {}
  };

  const clickWhatsApp = () => {
    if (!pay.waLink) return;
    const now = Date.now();
    localStorage.setItem(ks.waStart, String(now));
    setWaStartTs(now);
    window.open(pay.waLink, "_blank", "noopener,noreferrer");
  };

  async function submitRequest() {
    if (state.mode === "waiting") return;
    const intentMode = state.mode || "purchase";
    const emailVal = (emailField || "").trim();
    if (!emailVal) { alert("Please enter your email."); return; }

    const fd = new FormData();
    fd.append("examId", examId);
    fd.append("email", emailVal);
    fd.append("userEmail", emailVal);
    fd.append("intent", intentMode === "purchase" ? "purchase" : "restart");
    if (nameField)  fd.append("name",  nameField);
    if (phoneField) fd.append("phone", phoneField);

    const notes = [];
    if (nameField)  notes.push(`name=${nameField}`);
    if (phoneField) notes.push(`phone=${phoneField}`);
    if (upiStartTs) notes.push("upi_clicked=1");
    if (waStartTs)  notes.push("wa_clicked=1");
    if (notes.length) fd.append("note", notes.join("; "));

    localStorage.setItem("userEmail", emailVal);

    setSubmitting(true);
    try {
      const j = await postForm("/api/prep/access/request", fd);

      if (j && j.code === "ALREADY_ACTIVE") {
        localStorage.removeItem(ks.wait);
        localStorage.removeItem(ks.waitAt);
        localStorage.setItem(ks.lastActive, String(Date.now()));
        setState((s) => ({ ...s, show: false, mode: "" }));
        try { window.location.reload(); } catch {}
        return;
      }

      if (!j?.success) {
        alert(j?.error || j?.message || "Request failed");
        return;
      }

      // auto-approve path
      if (j?.approved) {
        const until = Date.now() + 15 * 1000;
        localStorage.setItem(ks.approved, String(until));
        localStorage.removeItem(ks.wait);
        localStorage.removeItem(ks.waitAt);
        setState((s) => ({ ...s, show: true, mode: "approved" }));
        return;
      }

      // normal waiting path
      localStorage.setItem(ks.wait, "1");
      localStorage.setItem(ks.waitAt, String(Date.now()));
      setState((s) => ({ ...s, show: true, mode: "waiting" }));
    } catch {
      alert("Could not submit right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function unlockNow(auto = false) {
    localStorage.setItem(ks.lastActive, String(Date.now()));
    if (auto) localStorage.setItem(ks.approved, "0"); else localStorage.removeItem(ks.approved);
    localStorage.removeItem(ks.wait);
    localStorage.removeItem(ks.waitAt);
    try { window.location.reload(); } catch {}
  }

  function copy(text) { try { navigator.clipboard?.writeText(text); } catch {} }

  /* ---------- render gate ---------- */
  const mustShow = state.show || (state.loading && true);
  if (!mustShow) return null;

  const title =
    state.mode === "waiting"  ? "Waiting for approval…"
  : state.mode === "approved" ? `Approved — unlocking in ${approveLeft || APPROVE_SECONDS}s`
  : state.step === 1 ? "Step 1 — Pay via UPI" : "Step 2 — WhatsApp screenshot & submit";

  const submitDisabled = submitting || state.mode === "waiting" || !(emailField && emailField.trim());

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm">
      <div className="w-full h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
          <div className="text-lg font-semibold mb-2">{title}</div>

          {/* APPROVED → countdown & unlock */}
          {state.mode === "approved" && (
            <>
              <div className="text-sm text-emerald-700 mb-3">
                Your access has been approved. We’ll unlock and reset your plan to <b>Day 1</b> automatically in ~{approveLeft || APPROVE_SECONDS}s.
              </div>
              <button className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold mb-2" onClick={() => unlockNow(false)}>
                Unlock now
              </button>
              <div className="text-[11px] text-gray-500">After approval, your schedule restarts from Day 1.</div>
            </>
          )}

          {/* WAITING */}
          {state.mode === "waiting" && (
            <>
              <div className="text-sm text-emerald-700 mb-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                <span>Waiting for admin approval…</span>
              </div>
              <div className="text-[11px] text-gray-500">We’ll unlock automatically the moment it’s approved.</div>
            </>
          )}

          {/* STEP 1 — UPI */}
          {state.mode !== "waiting" && state.mode !== "approved" && state.step === 1 && (
            <>
              <div className="grid gap-2 mb-3">
                <button
                  className={`w-full py-3 rounded text-white text-lg font-semibold ${pay.upiLink ? "bg-emerald-600" : "bg-gray-300 cursor-not-allowed"}`}
                  onClick={clickUPI}
                  disabled={!pay.upiLink}
                >
                  Pay via UPI {pay.priceINR ? `(₹${pay.priceINR})` : ""}
                </button>
                {!isAndroid && pay.upiId && (
                  <div className="text-[12px] text-gray-600">
                    Tip: On desktop, copy UPI ID <code className="bg-gray-100 px-1 rounded">{pay.upiId}</code>{" "}
                    and pay from your phone.{" "}
                    <button className="underline" onClick={() => copy(pay.upiId)}>Copy</button>
                  </div>
                )}
                {upiLeft > 0 && (
                  <div className="text-[12px] text-gray-700">After paying, <b>return to this tab</b>. Auto-focus in ~{upiLeft}s.</div>
                )}
              </div>

              <button
                className="w-full py-3 rounded border bg-white text-lg font-medium"
                onClick={goNext}
              >
                Next: Send WhatsApp screenshot →
              </button>
            </>
          )}

          {/* STEP 2 — WhatsApp + form + submit */}
          {state.mode !== "waiting" && state.mode !== "approved" && state.step === 2 && (
            <>
              <div className="grid gap-2 mb-3">
                <button
                  className={`w-full py-3 rounded text-lg font-semibold border ${pay.waLink ? "bg-white" : "bg-gray-100 cursor-not-allowed"}`}
                  onClick={clickWhatsApp}
                  disabled={!pay.waLink}
                >
                  Open WhatsApp & send screenshot
                </button>
                {waLeft > 0 && (
                  <div className="text-[12px] text-gray-700">
                    After sending, <b>come back here</b>. We’ll bring you back in ~{waLeft}s.
                  </div>
                )}
              </div>

              <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Name"
                     value={nameField} onChange={(e)=>setName(e.target.value)} />
              <input className="w-full border rounded px-3 py-2 mb-2" placeholder="Phone Number"
                     value={phoneField} onChange={(e)=>setPhone(e.target.value)} />
              <input className="w-full border rounded px-3 py-2 mb-3" type="email" required placeholder="Email"
                     value={emailField} onChange={(e)=>setEmailField(e.target.value)} />

              <button
                className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold disabled:opacity-60"
                onClick={submitRequest}
                disabled={submitDisabled}
              >
                Submit
              </button>

              <div className="mt-2 flex items-center justify-between">
                <button className="text-sm underline" onClick={goBack}>← Back</button>
                <div className="text-[11px] text-gray-500">After approval, your plan restarts from Day 1.</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
