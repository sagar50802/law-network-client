import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

/**
 * Overlay that gates prep pages until purchase/restart is approved.
 * - Veil always blocks interaction when "show" is true or a "waiting" gate is set.
 * - Panel can be hidden for the day, but veil remains.
 * - Adds UPI+WhatsApp deep links and requires Name+Phone before submit.
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

  // New: lightweight checkout fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [emailInput, setEmailInput] = useState(email || "");
  const [note, setNote] = useState("");
  const [proofSent, setProofSent] = useState(false);

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
    setProofSent(true);
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

      // get user's today day (for planDayTime checks if your server still returns it)
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

      // (A) trust server (now server already respects admin timezone)
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

      // (D) client-side planDayTime (kept for safety; server now rules)
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

      // pre-fill email input if empty
      if (!emailInput && email) setEmailInput(email);
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

  // ----------------------- actions -------------------------------
  async function submitRequest() {
    const finalEmail = email || emailInput || "";
    if (!finalEmail) {
      alert("Please enter your email.");
      return;
    }
    // Require Name and Phone
    if (!name.trim() || !phone.trim()) {
      alert("Please fill Name and Phone to continue.");
      return;
    }
    if (!state.mode || state.mode === "waiting") return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("examId", examId);
      fd.append("email", finalEmail);
      fd.append("name", name.trim());
      fd.append("phone", phone.trim());
      fd.append("note", note || "");
      fd.append("proofSent", proofSent ? "1" : "0");
      fd.append("intent", state.mode === "purchase" ? "purchase" : "restart");
      if (file) fd.append("screenshot", file);

      const r = await fetch("/api/prep/access/request", {
        method: "POST",
        body: fd,
      });
      const j = await r.json();

      if (j?.approved) {
        localStorage.removeItem(ks.wait);
        await fetchStatus();
      } else {
        localStorage.setItem(ks.wait, "1");
        setState((s) => ({
          ...s,
          mode: "waiting",
          show: true,
          waiting: true,
        }));
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
    submitting ||
    state.mode === "waiting" ||
    !name.trim() ||
    !phone.trim() ||
    !(email || emailInput);

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
                <div className="text-sm text-gray-800 mb-3">
                  <div className="font-medium">{courseName}</div>
                  <div>
                    Price: <b>₹{price}</b>
                  </div>
                </div>

                {/* UPI button (shows only if configured) */}
                {canShowUPI && (
                  <button
                    onClick={openUPI}
                    className="w-full mb-2 py-2 rounded bg-emerald-600 text-white"
                  >
                    Pay via UPI
                  </button>
                )}

                {/* WhatsApp proof button */}
                {canShowWA && (
                  <button
                    onClick={openWhatsApp}
                    className="w-full mb-3 py-2 rounded bg-[#25D366] text-white"
                  >
                    Send Proof on WhatsApp
                  </button>
                )}

                {/* Minimal form */}
                <div className="grid grid-cols-1 gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Name (required)"
                    className="border rounded px-3 py-2 text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number (required)"
                    className="border rounded px-3 py-2 text-sm"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  {!email && (
                    <input
                      type="email"
                      placeholder="Email (required)"
                      className="border rounded px-3 py-2 text-sm"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                    />
                  )}
                  <textarea
                    placeholder="Note (optional)"
                    className="border rounded px-3 py-2 text-sm"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>

                {/* Optional screenshot */}
                <div className="mb-3">
                  <label className="text-sm block mb-1">
                    Upload payment screenshot (optional)
                  </label>
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
