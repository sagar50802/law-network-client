// src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function PrepAccessOverlay({ examId, email }) {
  // ----------------------- localStorage keys -----------------------
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`,
      dismiss: (hhmm = "09:00", day = 1) => `overlayDismiss:${e}:${day}:${hhmm}`,
      upiStart: `overlayUPIStart:${e}:${u}`,
      waStart: `overlayWAStart:${e}:${u}`,
    };
  }, [examId, email]);

  // ----------------------- component state ------------------------
  const [state, setState] = useState({
    loading: true,
    show: !!(examId && localStorage.getItem(ks.wait)),
    mode: localStorage.getItem(ks.wait) ? "waiting" : "",
    exam: {},
    access: {},
    overlay: {},
    waiting: !!localStorage.getItem(ks.wait),
  });

  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [panelHidden, setPanelHidden] = useState(false);

  // Minimal user inputs
  const [emailField, setEmailField] = useState(
    localStorage.getItem("userEmail") || (email || "")
  );
  const [nameField, setNameField] = useState("");
  const [phoneField, setPhoneField] = useState("");

  // "Domino’s/Zomato" style step tracker
  // 0 = Pay → 1 = Proof → 2 = Submit
  const [step, setStep] = useState(0);

  // ----------------------- timers for return flows -----------------
  const [upiStartTs, setUpiStartTs] = useState(() => Number(localStorage.getItem(ks.upiStart) || 0));
  const [upiLeft, setUpiLeft] = useState(0);
  const [waStartTs, setWaStartTs] = useState(() => Number(localStorage.getItem(ks.waStart) || 0));
  const [waLeft, setWaLeft] = useState(0);

  const UPI_SECONDS = 120;   // 2 minutes
  const WA_SECONDS  = 180;   // 3 minutes

  useEffect(() => {
    if (!upiStartTs) return;
    const tick = () => {
      const left = Math.max(0, UPI_SECONDS - Math.floor((Date.now() - upiStartTs) / 1000));
      setUpiLeft(left);
      if (left <= 0) { try { window.focus(); } catch {} setStep(s => Math.max(s, 1)); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [upiStartTs]);

  useEffect(() => {
    if (!waStartTs) return;
    const tick = () => {
      const left = Math.max(0, WA_SECONDS - Math.floor((Date.now() - waStartTs) / 1000));
      setWaLeft(left);
      if (left <= 0) { try { window.focus(); } catch {} setStep(s => Math.max(s, 2)); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [waStartTs]);

  // ----------------------- utilities -------------------------------
  const price = Number(state.exam?.price || 0);
  const courseName = state.exam?.name || String(examId || "").toUpperCase();

  // ----------------------- core fetch ------------------------------
  async function fetchStatus() {
    if (!examId) return;

    const hasWaitingGate = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({ examId, email: email || "" });
      const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
      const { exam, access, overlay } = r || {};

      // brand-new user → auto trial → re-fetch
      if (access?.status === "none" && email) {
        await postJSON("/api/prep/access/start-trial", { examId, email });
        return fetchStatus();
      }

      // try to read todayDay (best-effort)
      let todayDay = 1;
      try {
        const meta = await getJSON(`/api/prep/user/summary?${qs.toString()}`);
        todayDay = Number(meta?.todayDay || 1);
      } catch {}

      // --------- decide overlay ---------
      let mode = "";
      let show = false;
      let waiting = !!access?.pending;
      const isPlanDayTime = access?.overlayPlan?.mode === "planDayTime";

      if (hasWaitingGate) { mode = "waiting"; show = true; waiting = true; }

      if (!show && overlay?.show && overlay?.mode) { mode = overlay.mode; show = true; }
      else if (!show && access?.overlayForce) { mode = access.forceMode === "restart" ? "restart" : "purchase"; show = true; }

      if (!show && !isPlanDayTime) {
        if (access?.status === "trial" && access?.trialEnded) { mode = "purchase"; show = true; }
        else if (access?.status === "active" && access?.canRestart) { mode = "restart"; show = true; }
        else if (waiting) { mode = "waiting"; show = true; }
      }

      if (!show) {
        const plan = access?.overlayPlan;
        if (plan?.mode === "planDayTime") {
          try {
            const wantDay = Number(plan.showOnDay || 1);
            const hhmm = String(plan.showAtLocal || "09:00");
            const [hh, mm] = hhmm.split(":").map(n => parseInt(n, 10));
            const now = new Date();
            const tgt = new Date(now);
            tgt.setHours(hh || 0, mm || 0, 0, 0);
            const notDismissed = (() => {
              const k = ks.dismiss(hhmm, wantDay);
              const v = localStorage.getItem(k);
              const todayKey = new Date().toISOString().slice(0, 10);
              return v !== todayKey;
            })();
            if (todayDay >= wantDay && now >= tgt && notDismissed) { mode = "purchase"; show = true; }
          } catch {}
        }
      }

      const effectiveShow = !!show && !!mode;
      const isWaitingNow = mode === "waiting";
      if (isWaitingNow) localStorage.setItem(ks.wait, "1");
      else if (access?.status === "active" && !waiting) localStorage.removeItem(ks.wait);

      setState({
        loading: false,
        show: effectiveShow || hasWaitingGate,
        mode: mode || (hasWaitingGate ? "waiting" : ""),
        exam: exam || {},
        access: access || {},
        overlay: overlay || {},
        waiting: isWaitingNow || hasWaitingGate,
      });

      if (effectiveShow) setPanelHidden(false);
      if (!emailField && email) setEmailField(email);
    } catch {
      setState(s => ({
        ...s,
        loading: false,
        show: s.show || !!localStorage.getItem(ks.wait),
        mode: s.mode || (localStorage.getItem(ks.wait) ? "waiting" : "")
      }));
    }
  }

  useEffect(() => { fetchStatus(); /* eslint-disable-next-line */ }, [examId, email]);
  useEffect(() => { const t = setInterval(fetchStatus, 60_000); return () => clearInterval(t); /* eslint-disable-next-line */ }, [examId, email]);

  // --- safe JSON parse for file submit ---
  async function readJsonSafe(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) return await res.json();
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return { success:false, error: (txt || `HTTP ${res.status}`) }; }
  }

  // ------- robust deep-link derivation (hide IDs from UI) -------
  function pick(obj, path, def = "") {
    try { return path.split(".").reduce((a, k) => a?.[k], obj) ?? def; } catch { return def; }
  }
  const overlayPay = pick(state, "overlay.payment", null) || pick(state, "exam.overlay.payment", null);
  const examPay     = pick(state, "exam.payment", null);
  const overlayUI   = pick(state, "exam.overlayUI", null);

  const pay = {
    courseName: overlayPay?.courseName || state?.exam?.name || examId,
    priceINR: Number(overlayPay?.priceINR ?? state?.exam?.price ?? overlayUI?.priceINR ?? 0),
    upiId: overlayPay?.upiId || examPay?.upiId || overlayUI?.upiId || "",         // used only to build link
    upiName: overlayPay?.upiName || overlayUI?.upiName || "",
    whatsappNumber: (() => {
      const a = overlayPay?.whatsappNumber || examPay?.waPhone || "";
      if (a) return a;
      const link = overlayUI?.whatsappLink || "";
      const m = link?.match?.(/wa\.me\/(\+?\d+)/i);
      return m ? m[1] : "";
    })(),
    whatsappText: overlayPay?.whatsappText || examPay?.waText || "",
  };

  const amount = Number(pay.priceINR || 0);
  const upiLink = pay.upiId
    ? `upi://pay?pa=${encodeURIComponent(pay.upiId)}`
      + (pay.upiName ? `&pn=${encodeURIComponent(pay.upiName)}` : "")
      + (amount > 0 ? `&am=${encodeURIComponent(amount)}` : "")
      + `&cu=INR&tn=${encodeURIComponent(`Payment for ${pay.courseName}`)}`
    : "";

  const waNumRaw = (pay.whatsappNumber || "").replace(/[^\d+]/g, "");
  const waNum    = waNumRaw.replace(/^\+/, "");
  const waText   = pay.whatsappText || `Hello, I paid for "${pay.courseName}" (₹${amount}).`;
  const waLink   = waNum ? `https://wa.me/${waNum}?text=${encodeURIComponent(waText)}` : "";

  // ----------------------- actions -------------------------------
  async function submitRequest() {
    if (!state.mode || state.mode === "waiting") return;
    const emailVal = (emailField || "").trim();
    if (!emailVal) { alert("Please enter your email."); return; }

    const fd = new FormData();
    fd.append("examId", examId);
    fd.append("email", emailVal);
    fd.append("intent", state.mode === "purchase" ? "purchase" : "restart");
    const note = [
      nameField ? `name=${nameField}` : "",
      phoneField ? `phone=${phoneField}` : "",
      upiStartTs ? `upi_clicked=1` : "",
      waStartTs ? `wa_clicked=1` : ""
    ].filter(Boolean).join("; ");
    if (note) fd.append("note", note);
    if (file) fd.append("screenshot", file);

    localStorage.setItem("userEmail", emailVal);

    setSubmitting(true);
    try {
      const res = await fetch("/api/prep/access/request", { method: "POST", body: fd });
      const j = await readJsonSafe(res);
      if (!res.ok || j?.success === false) {
        const msg = j?.error || j?.message || `Request failed (${res.status})`;
        alert(msg);
        return;
      }

      if (j?.approved) {
        localStorage.removeItem(ks.wait);
        await fetchStatus();
      } else {
        localStorage.setItem(ks.wait, "1");
        setState(s => ({ ...s, mode: "waiting", show: true, waiting: true }));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  // Hide only the panel (veil remains)
  function closeForToday() {
    const plan = state.access?.overlayPlan;
    const hhmm = String(plan?.showAtLocal || "09:00");
    const wantDay = Number(plan?.showOnDay || 1);
    localStorage.setItem(ks.dismiss(hhmm, wantDay), new Date().toISOString().slice(0, 10));
    setPanelHidden(true);
  }

  // Handlers that start timers + open deep links
  const handleUPIClick = () => {
    if (!upiLink) return;
    const now = Date.now();
    setUpiStartTs(now);
    localStorage.setItem(ks.upiStart, String(now));
    setStep(0); // user is on Pay step
    window.location.href = upiLink; // better handoff for mobile UPI apps
  };

  const handleWAClick = () => {
    if (!waLink) return;
    const now = Date.now();
    setWaStartTs(now);
    localStorage.setItem(ks.waStart, String(now));
    setStep(s => Math.max(s, 1)); // move to Proof step
    window.open(waLink, "_blank", "noopener,noreferrer");
  };

  // ----------------------- render -------------------------------
  const mustVeil = state.show || (state.loading && !!localStorage.getItem(ks.wait));
  if (!mustVeil) return null;

  const title =
    state.mode === "purchase" ? `Unlock – ${courseName}`
    : state.mode === "restart" ? `Restart – ${courseName}`
    : `Waiting for approval`;

  const desc =
    state.mode === "purchase"
      ? `Your free trial of ${state.exam?.trialDays || 3} days is over. Buy "${courseName}" to continue.`
      : state.mode === "restart"
      ? `You've completed all ${state.access?.planDays || ""} day(s). Restart "${courseName}" from Day 1.`
      : `Your request has been submitted. You'll see "Waiting for approval" until the owner grants access.`;

  const submitDisabled = submitting || state.mode === "waiting" || !(emailField && emailField.trim());

  const StepBadge = ({ idx, label }) => (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
          ${step >= idx ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-700"}`}
      >
        {idx + 1}
      </div>
      <div className={`text-xs ${step >= idx ? "text-emerald-700" : "text-gray-600"}`}>{label}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm" aria-hidden>
      {state.loading && state.waiting && null}

      {!panelHidden && !state.loading && (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
            <div className="text-lg font-semibold mb-1">{title}</div>
            <div className="text-sm text-gray-700 mb-3">{desc}</div>

            {/* Progress / tracker */}
            {state.mode !== "waiting" && (
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <StepBadge idx={0} label="Pay via UPI" />
                  <div className="flex-1 h-px bg-gray-200 mx-2" />
                  <StepBadge idx={1} label="Send Proof" />
                  <div className="flex-1 h-px bg-gray-200 mx-2" />
                  <StepBadge idx={2} label="Submit" />
                </div>
              </div>
            )}

            {/* Action area */}
            {state.mode !== "waiting" && (
              <>
                {/* Price + CTAs */}
                <div className="mb-2">
                  <div className="text-xs text-gray-600 mb-1">{state.exam?.name || examId}</div>
                  <div className="text-xs text-gray-600">Price: ₹{state.exam?.price ?? 0}</div>
                </div>

                {/* UPI + WhatsApp deep links (no IDs shown) */}
                {(upiLink || waLink) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {upiLink && (
                      <button
                        onClick={handleUPIClick}
                        className="w-full py-2 rounded bg-emerald-600 text-white"
                      >
                        Pay via UPI
                      </button>
                    )}
                    {waLink && (
                      <button
                        onClick={handleWAClick}
                        className="w-full py-2 rounded border bg-white"
                      >
                        Send Proof on WhatsApp
                      </button>
                    )}
                  </div>
                )}

                {/* Timers / guidance banners */}
                {(upiLeft > 0 || waLeft > 0) && (
                  <div className="text-[12px] text-gray-700 mb-2">
                    {upiLeft > 0 && (
                      <div className="mb-1">
                        After paying, <b>return to this tab</b> to upload the receipt.
                        Auto-focus in ~{upiLeft}s.
                      </div>
                    )}
                    {waLeft > 0 && (
                      <div>
                        After sending the screenshot on WhatsApp, <b>come back here</b>.
                        We’ll bring you back in ~{waLeft}s.
                      </div>
                    )}
                  </div>
                )}

                {/* Inputs */}
                <input
                  type="email"
                  required
                  placeholder="Email"
                  className="w-full border rounded px-2 py-1 mb-2"
                  value={emailField}
                  onChange={(e) => setEmailField(e.target.value)}
                  onFocus={() => setStep(s => Math.max(s, 2))}
                />

                <input
                  type="text"
                  placeholder="Name (optional)"
                  className="w-full border rounded px-2 py-1 mb-2"
                  value={nameField}
                  onChange={(e) => setNameField(e.target.value)}
                />

                <input
                  type="tel"
                  placeholder="Phone (optional)"
                  className="w-full border rounded px-2 py-1 mb-2"
                  value={phoneField}
                  onChange={(e) => setPhoneField(e.target.value)}
                />

                {/* Screenshot */}
                <div className="mb-3">
                  <label className="text-sm block mb-1">Upload payment screenshot (optional)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setStep(2);
                    }}
                  />
                </div>

                <button
                  className="w-full py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
                  onClick={submitRequest}
                  disabled={submitDisabled}
                >
                  {submitting
                    ? "Submitting…"
                    : state.mode === "purchase"
                    ? "Submit & Unlock"
                    : "Submit Restart Request"}
                </button>
              </>
            )}

            {state.mode === "waiting" && (
              <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-sm mb-2">
                Waiting for approval…
              </div>
            )}

            {/* Close = only hide panel; veil stays */}
            <button className="w-full mt-2 py-2 rounded border bg-white" onClick={closeForToday}>
              Close
            </button>

            <div className="text-[11px] text-gray-500 mt-3">
              After approval, your schedule starts again from Day 1 with the original release timings.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
