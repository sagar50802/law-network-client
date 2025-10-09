// client/src/pages/prep/PrepAccessOverlay.jsx 
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

/**
 * Overlay that gates prep pages until purchase/restart is approved.
 * - Veil always blocks interaction when "show" is true or a "waiting" gate is set.
 * - Panel can be hidden for the day, but veil remains.
 * - Adds UPI+WhatsApp deep links; compact form fields.
 */
export default function PrepAccessOverlay({ examId, email }) {
  // ----------------------- localStorage keys -----------------------
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`, // refresh-proof waiting flag
      dismiss: (hhmm = "09:00", day = 1) => `overlayDismiss:${e}:${day}:${hhmm}`, // hide panel for the day (veil stays)
    };
  }, [examId, email]);

  // ----------------------- component state ------------------------
  const [state, setState] = useState({
    loading: true,
    show: !!(examId && localStorage.getItem(ks.wait)),
    mode: localStorage.getItem(ks.wait) ? "waiting" : "", // "purchase" | "restart" | "waiting"
    exam: {},
    access: {},
    waiting: !!localStorage.getItem(ks.wait),
  });

  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [panelHidden, setPanelHidden] = useState(false);

  // --- add state near other useState ---
  const [emailField, setEmailField] = useState(localStorage.getItem("userEmail") || (email || ""));
  const [nameField, setNameField] = useState("");
  const [phoneField, setPhoneField] = useState("");
  const [waClicked, setWaClicked] = useState(false);

  // ----------------------- utilities -------------------------------
  const price = Number(state.exam?.price || 0);
  const courseName = state.exam?.name || String(examId || "").toUpperCase();

  const upiId = state.exam?.payment?.upiId || "";         // e.g. "merchant@upi"
  const waPhone = state.exam?.payment?.waPhone || "";     // e.g. "+9198xxxxxxx" or "98xxxxxxx"
  const waTextTemplate =
    state.exam?.payment?.waText ||
    `Hello, I paid for "${courseName}" (₹${price}). Attaching proof.`; // default prefill

  const canShowUPI = Boolean(upiId && price > 0);
  const canShowWA = Boolean(waPhone);

  function formatUPILink({ pa, pn, amt, tn }) {
    // https://www.npci.org.in/what-we-do/upi/product-overview
    const params = new URLSearchParams();
    params.set("pa", pa);
    if (pn) params.set("pn", pn);
    if (amt) params.set("am", String(amt));
    params.set("cu", "INR");
    if (tn) params.set("tn", tn);
    return `upi://pay?${params.toString()}`;
  }

  function formatWhatsAppLink({ phone, text }) {
    // accepts "+91xxxxx" or "91xxxxx" or plain number
    const digits = String(phone).replace(/[^\d]/g, "");
    const withCC = digits.startsWith("91") ? digits : `91${digits}`;
    const msg = encodeURIComponent(text || "");
    return `https://wa.me/${withCC}?text=${msg}`;
  }

  function openUPI() {
    if (!canShowUPI) return;
    const link = formatUPILink({
      pa: upiId,
      pn: courseName,
      amt: price > 0 ? price.toFixed(2) : undefined,
      tn: `Payment for ${courseName}`,
    });
    window.location.href = link; // open UPI app
  }

  function openWhatsApp() {
    if (!canShowWA) return;
    const text =
      waTextTemplate ||
      `Hello, I paid for "${courseName}" (₹${price}). Attaching proof.`;
    const link = formatWhatsAppLink({ phone: waPhone, text });
    setWaClicked(true);
    window.open(link, "_blank", "noopener,noreferrer");
  }

  // ----------------------- core fetch ------------------------------
  async function fetchStatus() {
    if (!examId) return;

    const hasWaitingGate = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({ examId, email: email || "" });
      const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
      const { exam, access, overlay } = r || {};

      // brand-new user → auto start trial → re-fetch
      if (access?.status === "none" && email) {
        await postJSON("/api/prep/access/start-trial", { examId, email });
        return fetchStatus();
      }

      // get user's today day (if your server endpoint exists)
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

      // (0) local waiting gate highest priority
      if (hasWaitingGate) {
        mode = "waiting";
        show = true;
        waiting = true;
      }

      // (A) trust server
      if (!show && overlay?.show && overlay?.mode) {
        mode = overlay.mode; // "purchase" | "restart"
        show = true;
      }
      // (B) server-forced flags
      else if (!show && access?.overlayForce) {
        mode = access.forceMode === "restart" ? "restart" : "purchase";
        show = true;
      }

      // (C) fallback reasons — skip for planDayTime
      if (!show && !isPlanDayTime) {
        if (access?.status === "trial" && access?.trialEnded) {
          mode = "purchase";
          show = true;
        } else if (access?.status === "active" && access?.canRestart) {
          mode = "restart";
          show = true;
        } else if (waiting) {
          mode = "waiting";
          show = true;
        }
      }

      // (D) client-side planDayTime (kept as safety)
      if (!show) {
        const plan = access?.overlayPlan;
        if (plan?.mode === "planDayTime") {
          try {
            const wantDay = Number(plan.showOnDay || 1);
            const hhmm = String(plan.showAtLocal || "09:00");
            const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));

            const now = new Date();
            const target = new Date(now);
            target.setHours(hh || 0, mm || 0, 0, 0);

            const notDismissed = (() => {
              const k = ks.dismiss(hhmm, wantDay);
              const v = localStorage.getItem(k);
              const todayKey = new Date().toISOString().slice(0, 10);
              return v !== todayKey;
            })();

            if (todayDay >= wantDay && now >= target && notDismissed) {
              mode = "purchase";
              show = true;
            }
          } catch {}
        }
      }

      // persist/clear waiting gate
      const effectiveShow = !!show && !!mode;
      const isWaitingNow = mode === "waiting";
      if (isWaitingNow) {
        localStorage.setItem(ks.wait, "1");
      } else {
        const activeOK = access?.status === "active" && !waiting;
        if (activeOK) localStorage.removeItem(ks.wait);
      }

      setState({
        loading: false,
        show: effectiveShow || hasWaitingGate,
        mode: mode || (hasWaitingGate ? "waiting" : ""),
        exam: exam || {},
        access: access || {},
        waiting: isWaitingNow || hasWaitingGate,
      });

      if (effectiveShow) setPanelHidden(false);

      // pre-fill email field if empty
      if (!emailField && email) setEmailField(email);
    } catch (e) {
      // keep veil if waiting gate is on
      setState((s) => ({
        ...s,
        loading: false,
        show: s.show || !!localStorage.getItem(ks.wait),
        mode: s.mode || (localStorage.getItem(ks.wait) ? "waiting" : ""),
      }));
    }
  }

  // first load + minute polling
  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  useEffect(() => {
    const t = setInterval(fetchStatus, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  // --- helper to safely parse server responses ---
  async function readJsonSafe(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) return await res.json();
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return { success:false, error: (txt || `HTTP ${res.status}`) }; }
  }

  // ----------------------- actions -------------------------------
  // --- your existing action, but hardened & with required email ---
  async function submitRequest() {
    if (!state.mode || state.mode === "waiting") return;

    const emailVal = (emailField || "").trim();
    if (!emailVal) { alert("Please enter your email."); return; }

    // If you want BOTH screenshot and WA mandatory, enforce here instead.
    const hasProof = !!file || waClicked;
    // If you want to allow submit without proof, set `const hasProof = true;`
    if (!hasProof) {
      // eslint-disable-next-line no-restricted-globals
      if (!confirm("No proof attached. Submit request anyway?")) return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("examId", examId);
      fd.append("email", emailVal);
      fd.append("intent", state.mode === "purchase" ? "purchase" : "restart");
      const note = [
        nameField ? `name=${nameField}` : "",
        phoneField ? `phone=${phoneField}` : "",
        waClicked ? "wa=clicked" : ""
      ].filter(Boolean).join("; ");
      if (note) fd.append("note", note);
      if (file) fd.append("screenshot", file);

      // remember email for future
      localStorage.setItem("userEmail", emailVal);

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
        setState((s) => ({ ...s, mode: "waiting", show: true, waiting: true }));
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
    localStorage.setItem(
      ks.dismiss(hhmm, wantDay),
      new Date().toISOString().slice(0, 10)
    );
    setPanelHidden(true);
  }

  // -------- NEW: derive deep links from server overlay.payment -----
  const pay = state?.overlay?.payment || state?.exam?.overlay?.payment || {};
  const dlCourseName = pay.courseName || state?.exam?.name || examId;
  const dlAmount = Number(pay.priceINR || state?.exam?.price || 0);

  const upiLink =
    pay.upiId
      ? `upi://pay?pa=${encodeURIComponent(pay.upiId)}`
        + (pay.upiName ? `&pn=${encodeURIComponent(pay.upiName)}` : "")
        + (dlAmount > 0 ? `&am=${encodeURIComponent(dlAmount)}` : "")
        + `&cu=INR`
        + `&tn=${encodeURIComponent(`Payment for ${dlCourseName}`)}`
      : "";

  const waNum = (pay.whatsappNumber || "").replace(/[^\d+]/g, "");
  const waText = pay.whatsappText || `Hello, I paid for "${dlCourseName}" (₹${dlAmount}).`;
  const waLink = waNum ? `https://wa.me/${waNum.replace(/^\+/, "")}?text=${encodeURIComponent(waText)}` : "";
  // ----------------------------------------------------------------

  // ----------------------- render -------------------------------
  const mustVeil =
    state.show || (state.loading && !!localStorage.getItem(ks.wait));
  if (!mustVeil) return null;

  const title =
    state.mode === "purchase"
      ? `Unlock – ${courseName}`
      : state.mode === "restart"
      ? `Restart – ${courseName}`
      : `Waiting for approval`;

  const desc =
    state.mode === "purchase"
      ? `Your free trial of ${state.exam?.trialDays || 3} days is over. Buy "${courseName}" for ₹${price} to continue.`
      : state.mode === "restart"
      ? `You've completed all ${state.access?.planDays || ""} day(s). Restart "${courseName}" from Day 1.`
      : `Your request has been submitted. You'll see "Waiting for approval" until the owner grants access.`;

  const submitDisabled =
    submitting || state.mode === "waiting" || !(emailField && emailField.trim());

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm" aria-hidden>
      {/* keep the veil during loading, hide panel while loading if needed */}
      {state.loading && state.waiting && null}

      {!panelHidden && !state.loading && (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
            <div className="text-lg font-semibold mb-1">{title}</div>
            <div className="text-sm text-gray-700 mb-3">{desc}</div>

            {/* Price + CTAs */}
            {state.mode !== "waiting" && (
              <>
                {/* Course + price block */}
                <div className="mb-2">
                  <div className="text-xs text-gray-600 mb-1">{state.exam?.name || examId}</div>
                  <div className="text-xs text-gray-600">Price: ₹{state.exam?.price ?? 0}</div>
                </div>

                {/* NEW: Deep-link buttons from overlay.payment */}
                {(upiLink || waLink) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                    {upiLink && (
                      <a
                        href={upiLink}
                        className="w-full py-2 rounded bg-green-600 text-white text-center"
                      >
                        Pay via UPI
                      </a>
                    )}
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setWaClicked(true)}
                        className="w-full py-2 rounded border bg-white text-center"
                      >
                        Send Proof on WhatsApp
                      </a>
                    )}
                  </div>
                )}

                {/* Compact inputs (required email; optional name/phone) */}
                <input
                  type="email"
                  required
                  placeholder="Email"
                  className="w-full border rounded px-2 py-1 mb-2"
                  value={emailField}
                  onChange={(e) => setEmailField(e.target.value)}
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

                {/* Optional screenshot */}
                <div className="mb-3">
                  <label className="text-sm block mb-1">Upload payment screenshot (optional)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
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
            <button
              className="w-full mt-2 py-2 rounded border bg-white"
              onClick={closeForToday}
            >
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
