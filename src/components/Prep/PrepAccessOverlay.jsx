import { useEffect, useMemo, useState } from "react";
import { getJSON, upload as postForm } from "../../utils/api";

/** Safe-ish JSON (kept in case some endpoint returns HTML on error) */
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
    const u = (String(email || "").trim() || "anon").toLowerCase();
    return {
      wait: `prep:overlay:waiting:${e}:${u}`,          // flip to waiting
      waitAt: `prep:overlay:waitingAt:${e}:${u}`,     // when waiting started
      upiStart: `prep:overlay:upiStart:${e}:${u}`,    // timers (optional)
      waStart: `prep:overlay:waStart:${e}:${u}`,
      // persist an approval countdown across refresh
      approvedUntil: `prep:overlay:approvedUntil:${e}:${u}`, // ms epoch
      // mark last time we confirmed active to suppress overlay
      lastActiveAt: `prep:overlay:lastActiveAt:${e}:${u}`,   // ms epoch
    };
  }, [examId, email]);

  /* ----------------------- component state ------------------------ */
  const [state, setState] = useState({
    loading: true,
    show: false,                          // whether to veil
    mode: "",                             // "purchase" | "restart" | "waiting" | "approved"
    approvedLeft: 0,                      // seconds left in approved countdown
    exam: {},
    access: {},
    overlay: {},
    waiting: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [nameField, setName] = useState("");
  const [phoneField, setPhone] = useState("");
  const [emailField, setEmailField] = useState(
    localStorage.getItem("userEmail") || email || ""
  );

  // “return to this tab” hints (optional)
  const [upiStartTs, setUpiStartTs] = useState(() =>
    Number(localStorage.getItem(ks.upiStart) || 0)
  );
  const [upiLeft, setUpiLeft] = useState(0);
  const [waStartTs, setWaStartTs] = useState(() =>
    Number(localStorage.getItem(ks.waStart) || 0)
  );
  const [waLeft, setWaLeft] = useState(0);

  const UPI_SECONDS = 104;
  const WA_SECONDS = 168;

  useEffect(() => {
    if (!upiStartTs) return;
    const tick = () =>
      setUpiLeft(Math.max(0, UPI_SECONDS - Math.floor((Date.now() - upiStartTs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [upiStartTs]);

  useEffect(() => {
    if (!waStartTs) return;
    const tick = () =>
      setWaLeft(Math.max(0, WA_SECONDS - Math.floor((Date.now() - waStartTs) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [waStartTs]);

  /* ----------------------- helpers ------------------------------- */
  function copy(text) {
    try { navigator.clipboard?.writeText(text); } catch {}
  }

  // Start or resume the “approved → unlock in N seconds” countdown.
  function beginApprovedCountdown(totalSeconds = 15) {
    const untilMs = Date.now() + totalSeconds * 1000;
    localStorage.setItem(ks.approvedUntil, String(untilMs));
    localStorage.removeItem(ks.wait);
    localStorage.removeItem(ks.waitAt);

    setState((s) => ({
      ...s,
      show: true,
      mode: "approved",
      waiting: false,
      approvedLeft: totalSeconds,
    }));

    // run a 1s ticker
    let stop = false;
    const tick = () => {
      if (stop) return;
      const left = Math.max(0, Math.ceil((Number(localStorage.getItem(ks.approvedUntil)) - Date.now()) / 1000));
      setState((s) => ({ ...s, approvedLeft: left, mode: "approved", show: true }));
      if (left <= 0) {
        localStorage.removeItem(ks.approvedUntil);
        // mark “active confirmed” now to suppress any immediate overlay
        localStorage.setItem(ks.lastActiveAt, String(Date.now()));
        try { window.location.reload(); } catch { }
        return;
      }
      setTimeout(tick, 1000);
    };
    tick();

    return () => { stop = true; };
  }

  // If an approved countdown was in progress before a refresh, resume it.
  function maybeResumeApprovedCountdown() {
    const until = Number(localStorage.getItem(ks.approvedUntil) || 0);
    if (until > Date.now()) {
      const left = Math.max(1, Math.ceil((until - Date.now()) / 1000));
      beginApprovedCountdown(left);
      return true;
    }
    localStorage.removeItem(ks.approvedUntil);
    return false;
  }

  /* ----------------------- core fetch ------------------------------ */
  async function fetchStatus() {
    if (!examId) return;

    // If “waiting” marker is very old (>15 min), clear it (avoid permanent stick)
    const startedAt = Number(localStorage.getItem(ks.waitAt) || 0);
    if (startedAt && Date.now() - startedAt > 15 * 60 * 1000) {
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
    }

    // If a countdown was in progress, resume it immediately and skip the form.
    if (maybeResumeApprovedCountdown()) return;

    const keepWaiting = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({ examId, email: email || "" });
      // IMPORTANT: this endpoint should return { exam, access, overlay }
      const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
      const { exam, access, overlay } = r || {};

      // If the user is ACTIVE, do NOT show the overlay (regardless of canRestart).
      if (access?.status === "active") {
        localStorage.setItem(ks.lastActiveAt, String(Date.now()));
        localStorage.removeItem(ks.wait);
        localStorage.removeItem(ks.waitAt);
        setState((s) => ({
          ...s,
          loading: false,
          show: false,
          waiting: false,
          mode: "",
          exam: exam || {},
          access: access || {},
          overlay: overlay || {},
        }));
        if (!emailField && email) setEmailField(email);
        return;
      }

      // If server explicitly tells us to show overlay (preferred), obey it
      let show = false;
      let mode = "";
      if (overlay?.show && overlay?.mode) {
        show = true;
        mode = overlay.mode; // "purchase" | "restart"
      } else {
        // Client fallback: only for TRIAL over threshold;
        // never force overlay for ACTIVE here.
        const todayDay = Number(r?.access?.todayDay || 1);
        const trialDays = Number(r?.access?.trialDays ?? exam?.trialDays ?? 0);
        const offsetDays = Number(exam?.overlay?.offsetDays ?? 0);
        const threshold = Math.max(trialDays, offsetDays);
        if (access?.status === "trial") {
          if (todayDay > threshold || (trialDays === 0 && offsetDays === 0 && todayDay > 0)) {
            show = true;
            mode = "purchase";
          }
        }
      }

      // Waiting overrides everything
      if (keepWaiting) { show = true; mode = "waiting"; }

      setState((s) => ({
        ...s,
        loading: false,
        show,
        mode,
        waiting: mode === "waiting",
        exam: exam || {},
        access: access || {},
        overlay: overlay || {},
      }));

      if (!emailField && email) setEmailField(email);
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }

  useEffect(() => { fetchStatus(); /* eslint-disable-next-line */ }, [examId, email]);

  // Poll request status when waiting and flip to "approved" countdown
  useEffect(() => {
    if (!state?.waiting || !emailField) return;
    let stop = false;
    let noneCount = 0;

    const loop = async () => {
      if (stop) return;
      try {
        const qs = new URLSearchParams({ examId, email: emailField });
        const j = await getJSON(`/api/prep/access/request/status?${qs.toString()}`);

        if (j?.status === "approved") {
          // move to approved countdown
          beginApprovedCountdown(15);
          return;
        }

        if (j?.status === "rejected") {
          stop = true;
          localStorage.removeItem(ks.wait);
          localStorage.removeItem(ks.waitAt);
          setState((s) => ({ ...s, show: true, waiting: false, mode: "" }));
          alert("Your request was rejected. Please contact support.");
          return;
        }

        if (!j?.status) {
          noneCount += 1;
          if (noneCount >= 3) {
            stop = true;
            localStorage.removeItem(ks.wait);
            localStorage.removeItem(ks.waitAt);
            setState((s) => ({ ...s, waiting: false, mode: "", show: true }));
            alert("We didn’t find your request. Please submit again.");
            return;
          }
        }
      } catch {
        // ignore transient errors
      }
      setTimeout(loop, 5000);
    };

    loop();
    return () => { stop = true; };
    // eslint-disable-next-line
  }, [state?.waiting, emailField, examId]);

  /* ----------------------- payment/meta --------------------------- */
  function buildPayMeta() {
    const pay =
      state?.overlay?.payment ||
      state?.exam?.overlay?.payment ||
      state?.exam?.payment ||
      {};

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

  // Submit create-request
  async function submitRequest() {
    if (state.mode === "waiting" || state.mode === "approved") return;

    const intentMode = state.mode || "purchase";
    const emailVal = (emailField || "").trim().toLowerCase();
    if (!emailVal) {
      alert("Please enter your email.");
      return;
    }

    const fd = new FormData();
    fd.append("examId", examId);
    fd.append("email", emailVal);
    fd.append("userEmail", emailVal);
    fd.append("intent", intentMode === "purchase" ? "purchase" : "restart");
    if (nameField) fd.append("name", nameField);
    if (phoneField) fd.append("phone", phoneField);

    const noteBits = [];
    if (nameField) noteBits.push(`name=${nameField}`);
    if (phoneField) noteBits.push("phone=" + phoneField);
    if (upiStartTs) noteBits.push("upi_clicked=1");
    if (waStartTs) noteBits.push("wa_clicked=1");
    if (noteBits.length) fd.append("note", noteBits.join("; "));

    localStorage.setItem("userEmail", emailVal);

    setSubmitting(true);
    try {
      const j = await postForm("/api/prep/access/request", fd);

      if (!j?.success) {
        alert(j?.error || j?.message || "Request failed");
        return;
      }

      // Auto-granted right away (exam.autoGrantRestart = true)
      if (j?.approved) {
        beginApprovedCountdown(15);
        return;
      }

      // Otherwise go to Waiting
      localStorage.setItem(ks.wait, "1");
      localStorage.setItem(ks.waitAt, String(Date.now()));
      setState((s) => ({ ...s, mode: "waiting", show: true, waiting: true }));
    } catch {
      alert("Could not submit right now. Please try again.");
      localStorage.removeItem(ks.wait);
      localStorage.removeItem(ks.waitAt);
      setState((s) => ({ ...s, waiting: false, mode: "", show: true }));
    } finally {
      setSubmitting(false);
    }
  }

  /* ----------------------- render -------------------------------- */
  // Show veil only if we’re waiting/approved, or server told us to show form.
  const mustVeil = state.show || (state.loading && !!localStorage.getItem(ks.wait));
  if (!mustVeil) return null;

  // Approved banner takes precedence over others
  if (state.mode === "approved") {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm">
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
            <div className="text-lg font-semibold mb-1">
              Approved — unlocking in {state.approvedLeft}s
            </div>
            <div className="text-sm text-emerald-700 mb-3">
              Your access has been approved. We’ll unlock the content and reset your schedule to <b>Day&nbsp;1</b> automatically in ~{state.approvedLeft}s.
            </div>
            <button
              className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold"
              onClick={() => {
                localStorage.removeItem(ks.approvedUntil);
                localStorage.setItem(ks.lastActiveAt, String(Date.now()));
                try { window.location.reload(); } catch {}
              }}
            >
              Unlock now
            </button>
            <div className="text-[11px] text-gray-500 mt-3">
              After approval, your schedule starts again from Day 1 with the original release timings.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const title =
    state.mode === "waiting" ? "Waiting for approval" : `Start / Restart — ${pay.courseName}`;

  const submitDisabled =
    submitting || state.mode === "waiting" || !(emailField && emailField.trim());

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
              Tip: On desktop, copy UPI ID{" "}
              <code className="bg-gray-100 px-1 rounded">{pay.upiId}</code>{" "}
              and pay from your phone.{" "}
              <button className="underline" onClick={() => copy(pay.upiId)}>Copy</button>
            </div>
          )}

          {(upiLeft > 0 || waLeft > 0) && state.mode !== "waiting" && (
            <div className="text-[12px] text-gray-700 mb-3">
              {upiLeft > 0 && (
                <div className="mb-1">
                  After paying, <b>return to this tab</b> to finish. Auto-focus in ~{upiLeft}s.
                </div>
              )}
              {waLeft > 0 && (
                <div>
                  After sending the screenshot on WhatsApp, <b>come back here</b>. We’ll bring you back in ~{waLeft}s.
                </div>
              )}
            </div>
          )}

          {state.mode !== "waiting" && (
            <>
              <input
                className="w-full border rounded px-3 py-2 mb-2"
                placeholder="Name"
                value={nameField}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full border rounded px-3 py-2 mb-2"
                placeholder="Phone Number"
                value={phoneField}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                className="w-full border rounded px-3 py-2 mb-3"
                type="email"
                required
                placeholder="Email"
                value={emailField}
                onChange={(e) => setEmailField(e.target.value)}
              />
            </>
          )}

          <button
            className="w-full py-3 rounded bg-emerald-600 text-white text-lg font-semibold disabled:opacity-60"
            onClick={state.mode === "waiting" ? undefined : submitRequest}
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
