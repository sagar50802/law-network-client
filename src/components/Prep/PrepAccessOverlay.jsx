import { useEffect, useMemo, useState } from "react";
import { getJSON, upload as postForm } from "../../utils/api"; // <-- use helpers

// defensive JSON parser (prevents “Unexpected end of JSON input” on empty/HTML)
async function safeJSON(res) {
  try {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export default function PrepAccessOverlay({ examId, email }) {
  /* ----------------------- localStorage keys ----------------------- */
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`,                       // flip to waiting
      waitAt: `overlayWaiting:${e}:${u}:at`,                 // when waiting started
      upiStart: `overlayUPIStart:${e}:${u}`,                 // timers
      waStart: `overlayWAStart:${e}:${u}`,
    };
  }, [examId, email]);

  /* ----------------------- component state ------------------------ */
  const [state, setState] = useState({
    loading: true,
    show: !!(examId && localStorage.getItem(ks.wait)),
    mode: localStorage.getItem(ks.wait) ? "waiting" : "",     // purchase | restart | waiting
  });
  const [submitting, setSubmitting] = useState(false);
  const [nameField, setName] = useState("");
  const [phoneField, setPhone] = useState("");
  const [emailField, setEmailField] = useState(
    localStorage.getItem("userEmail") || email || ""
  );

  // timers for "return to this tab"
  const [upiStartTs, setUpiStartTs] = useState(() => Number(localStorage.getItem(ks.upiStart) || 0));
  const [upiLeft, setUpiLeft] = useState(0);
  const [waStartTs, setWaStartTs] = useState(() => Number(localStorage.getItem(ks.waStart) || 0));
  const [waLeft, setWaLeft] = useState(0);
  const UPI_SECONDS = 104;
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
  // Always prefer the email the user typed.
  function effectiveEmail() {
    return (
      (emailField && emailField.trim()) ||
      (localStorage.getItem("userEmail") || "").trim() ||
      (email || "").trim()
    );
  }

  async function fetchStatus() {
    if (!examId) return;

    // If "waiting" marker is very old (>15 min), clear it (avoid permanent stick)
    const startedAt = Number(localStorage.getItem(ks.waitAt) || 0);
    if (startedAt && Date.now() - startedAt > 15 * 60 * 1000) {
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
    }

    const keepWaiting = !!localStorage.getItem(ks.wait);
    const effEmail = effectiveEmail();

    try {
      const qs = new URLSearchParams({ examId, email: effEmail });
      const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
      const { exam, access, overlay } = r || {};

      // Server decided overlay visibility (preferred)
      let mode = "";
      let show = false;

      if (overlay?.show && overlay?.mode) { show = true; mode = overlay.mode; }

      // Client-side safety net for "After N days (per user)"
      if (!show && exam?.overlay?.mode !== "never") {
        const todayDay = Number(r?.access?.todayDay || 1);
        const trialDays = Number(r?.access?.trialDays ?? exam?.trialDays ?? 0);
        const offsetDays = Number(exam?.overlay?.offsetDays ?? 0);
        const threshold = Math.max(trialDays, offsetDays);
        if ((access?.status === "trial" && todayDay > threshold) || (access?.status === "active" && access?.canRestart)) {
          show = true;
          mode = access?.status === "active" && access?.canRestart ? "restart" : "purchase";
        }
        if (!show && trialDays === 0 && offsetDays === 0 && todayDay > 0) {
          show = true;
          mode = access?.status === "active" && access?.canRestart ? "restart" : "purchase";
        }
      }

      // If access is ACTIVE, never keep the overlay up.
      if (r?.access?.status === "active") {
        show = false;
        mode = "";
      }

      if (keepWaiting) { show = true; mode = "waiting"; }

      setState(s => ({
        ...s,
        loading: false,
        show,
        mode,
        waiting: mode === "waiting",
        exam: exam || {},
        access: access || {},
        overlay: overlay || {},
      }));

      if (!emailField && effEmail) setEmailField(effEmail);
    } catch {
      setState(s => ({ ...s, loading: false }));
    }
  }

  useEffect(() => { fetchStatus(); /* eslint-disable-next-line */ }, [examId, email, emailField]);

  // Poll request status when waiting (self-heal back to form; don't unblock content)
  useEffect(() => {
    if (!state?.waiting) return;

    const effEmail = effectiveEmail();
    if (!effEmail) return;

    let stop = false;
    let noneCount = 0;

    const loop = async () => {
      if (stop) return;
      try {
        const qs = new URLSearchParams({ examId, email: effEmail });
        const j = await getJSON(`/api/prep/access/request/status?${qs.toString()}`);

        if (j?.status === "approved") {
          // Clear waiting and immediately hide overlay; then refresh.
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState(s => ({ ...s, waiting: false, show: false, mode: "" }));
          stop = true;
          await fetchStatus();
          return;
        }

        if (j?.status === "rejected") {
          stop = true;
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState(s => ({ ...s, show: true, waiting: false, mode: "" }));
          alert("Your request was rejected. Please contact support.");
          return;
        }

        if (!j?.status) {
          noneCount += 1;
          if (noneCount >= 3) {
            stop = true;
            localStorage.removeItem(ks.wait);
            localStorage.removeItem(ks.waitAt);
            setState(s => ({ ...s, waiting: false, mode: "", show: true }));
            alert("We didn’t find your request. Please submit again.");
            return;
          }
        }
      } catch {
        // ignore
      }
      setTimeout(loop, 5000);
    };

    loop();
    return () => { stop = true; };
    // eslint-disable-next-line
  }, [state?.waiting, examId]);

  /* ----------------------- payment links --------------------------- */
  function buildPayMeta() {
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
    if (/^\d{10}$/.test(wa)) wa = "91" + wa;
    const waText = (pay.whatsappText || `Hello, I paid for "${courseName}" (₹${priceINR}).`).trim();

    const upiLink = upiId
      ? `upi://pay?pa=${encodeURIComponent(upiId)}${upiName ? `&pn=${encodeURIComponent(upiName)}` : ""}${priceINR ? `&am=${encodeURIComponent(priceINR)}` : ""}&cu=INR&tn=${encodeURIComponent(`Payment for ${courseName}`)}`
      : "";

    const waLink = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : "";

    return { courseName, priceINR, upiId, upiName, upiLink, wa, waLink };
  }
  const pay = useMemo(buildPayMeta, [state?.overlay, state?.exam, examId]);
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

  // Robust submit using API helper (ensures it hits the backend origin)
  async function submitRequest() {
    if (state.mode === "waiting") return;

    const intentMode = state.mode || "purchase";
    const emailVal = (effectiveEmail() || "").trim();
    if (!emailVal) { alert("Please enter your email."); return; }

    const fd = new FormData();
    fd.append("examId", examId);
    fd.append("email", emailVal);          // used by server + status lookups
    fd.append("userEmail", emailVal);      // harmless extra; some handlers use this name
    // IMPORTANT: must be "purchase" or "restart" (NOT "start")
    fd.append("intent", intentMode === "purchase" ? "purchase" : "restart");
    if (nameField)  fd.append("name",  nameField);
    if (phoneField) fd.append("phone", phoneField);

    const noteBits = [];
    if (nameField)  noteBits.push(`name=${nameField}`);
    if (phoneField) noteBits.push(`phone=${phoneField}`);
    if (upiStartTs) noteBits.push("upi_clicked=1");
    if (waStartTs)  noteBits.push("wa_clicked=1");
    if (noteBits.length) fd.append("note", noteBits.join("; "));

    localStorage.setItem("userEmail", emailVal);

    setSubmitting(true);
    try {
      // IMPORTANT: must hit /api/prep/* (server mount path)
      const j = await postForm("/api/prep/access/request", fd);

      if (!j?.success) {
        alert(j?.error || j?.message || "Request failed");
        return;
      }

      // Auto-grant path
      if (j?.approved) {
        localStorage.removeItem(ks.wait);
        localStorage.removeItem(ks.waitAt);
        setState(s => ({ ...s, waiting: false, show: false, mode: "" }));
        await fetchStatus();
        return;
      }

      // Show “Waiting…” immediately and start polling
      localStorage.setItem(ks.wait, "1");
      localStorage.setItem(ks.waitAt, String(Date.now()));
      setState(s => ({ ...s, mode: "waiting", show: true, waiting: true }));

      const t0 = Date.now();
      const fastPoll = async () => {
        const qs = new URLSearchParams({ examId, email: emailVal });
        try {
          const status = await getJSON(`/api/prep/access/status?${qs.toString()}`);
          const a = status?.access?.status || "none";
          if (a === "active") {
            localStorage.removeItem(ks.wait);
            localStorage.removeItem(ks.waitAt);
            setState(s => ({ ...s, waiting: false, show: false, mode: "" }));
            await fetchStatus();
            return;
          }
        } catch {}
        setTimeout(fastPoll, Date.now() - t0 < 15000 ? 1000 : 5000);
      };
      fastPoll();
    } catch {
      alert("Could not submit right now. Please try again.");
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
      setState(s => ({ ...s, waiting: false, mode: "", show: true }));
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

  const submitDisabled = submitting || state.mode === "waiting" || !(effectiveEmail());

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

          {!isAndroid && pay.upiId && state.mode !== "waiting" && (
            <div className="text-[12px] text-gray-600 mb-3">
              Tip: On desktop, copy UPI ID <code className="bg-gray-100 px-1 rounded">{pay.upiId}</code>{" "}
              and pay from your phone. <button className="underline" onClick={() => copy(pay.upiId)}>Copy</button>
            </div>
          )}

          {(upiLeft > 0 || waLeft > 0) && state.mode !== "waiting" && (
            <div className="text-[12px] text-gray-700 mb-3">
              {upiLeft > 0 && <div className="mb-1">After paying, <b>return to this tab</b> to finish. Auto-focus in ~{upiLeft}s.</div>}
              {waLeft > 0 && <div>After sending the screenshot on WhatsApp, <b>come back here</b>. We’ll bring you back in ~{waLeft}s.</div>}
            </div>
          )}

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

          <button
            className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold disabled:opacity-60"
            onClick={state.mode === "waiting" ? undefined : submitRequest}
            disabled={submitting || state.mode === "waiting" || !effectiveEmail()}
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
