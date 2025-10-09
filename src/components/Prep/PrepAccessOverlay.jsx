// client/src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function PrepAccessOverlay({ examId, email }) {
  // -------- localStorage keys (per exam+user) --------
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`, // waiting-for-approval (refresh-proof veil)
      dismiss: (hhmm = "09:00", day = 1) => `overlayDismiss:${e}:${day}:${hhmm}`, // optional: hide panel till tomorrow
    };
  }, [examId, email]);

  // --------------- component state -------------------
  const [state, setState] = useState({
    loading: true,
    show: !!(examId && localStorage.getItem(ks.wait)), // if waiting was set earlier, show veil immediately
    mode: localStorage.getItem(ks.wait) ? "waiting" : "", // "purchase" | "restart" | "waiting"
    exam: {},
    access: {},
    waiting: !!localStorage.getItem(ks.wait),
  });

  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Hide only the panel content; veil stays to block interaction
  const [panelHidden, setPanelHidden] = useState(false);

  // ---------------- core fetch -----------------------
  async function fetchStatus() {
    if (!examId) return;

    const hasWaitingGate = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({ examId, email: email || "" });
      const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
      const { exam, access, overlay } = r || {};

      // Brand-new user: auto start trial, then re-fetch
      if (access?.status === "none" && email) {
        await postJSON("/api/prep/access/start-trial", { examId, email });
        return fetchStatus();
      }

      // ---------- decide overlay (server is authoritative) ----------
      let mode = "";
      let show = false;
      let waiting = !!access?.pending;

      // (0) Highest priority: local waiting gate (refresh-proof)
      if (hasWaitingGate) {
        mode = "waiting";
        show = true;
        waiting = true;
      }

      // (A) Trust server decision (server already handles all modes & timezone)
      if (!show && overlay?.show && overlay?.mode) {
        mode = overlay.mode; // "purchase" | "restart"
        show = true;
      }
      // (B) Server-forced legacy flags (if any)
      else if (!show && access?.overlayForce) {
        mode = access.forceMode === "restart" ? "restart" : "purchase";
        show = true;
      }
      // (C) Fallback reasons (kept for safety, server should cover most cases)
      if (!show) {
        if (access?.status === "trial" && access?.trialEnded) {
          mode = "purchase"; show = true;
        } else if (access?.status === "active" && access?.canRestart) {
          mode = "restart"; show = true;
        } else if (waiting) {
          mode = "waiting"; show = true;
        }
      }

      // Persist/clear waiting gate
      const effectiveShow = !!show && !!mode;
      const isWaitingNow = mode === "waiting";
      if (isWaitingNow) {
        localStorage.setItem(ks.wait, "1");
      } else {
        // If approved/active and not waiting, remove the waiting gate
        const activeOK = access?.status === "active" && !waiting;
        if (activeOK) localStorage.removeItem(ks.wait);
      }

      setState({
        loading: false,
        // Keep veil if effectiveShow or if waiting gate was already present (during first load)
        show: effectiveShow || hasWaitingGate,
        mode: mode || (hasWaitingGate ? "waiting" : ""),
        exam: exam || {},
        access: access || {},
        waiting: isWaitingNow || hasWaitingGate,
      });

      if (effectiveShow) setPanelHidden(false);
    } catch (e) {
      // If API fails but waiting gate exists, keep veil up
      setState((s) => ({
        ...s,
        loading: false,
        show: s.show || !!localStorage.getItem(ks.wait),
        mode: s.mode || (localStorage.getItem(ks.wait) ? "waiting" : ""),
      }));
    }
  }

  // First load + optional polling (not strictly needed now, but harmless)
  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  useEffect(() => {
    const t = setInterval(fetchStatus, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  // ---------------- actions -------------------------
  async function submitRequest() {
    if (!email) {
      alert("Need an email in localStorage as 'userEmail'");
      return;
    }
    if (!state.mode || state.mode === "waiting") return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("examId", examId);
      fd.append("email", email);
      fd.append("intent", state.mode === "purchase" ? "purchase" : "restart");
      if (file) fd.append("screenshot", file);

      const r = await fetch("/api/prep/access/request", { method: "POST", body: fd });
      const j = await r.json();

      if (j?.approved) {
        // approved => drop waiting gate and refresh
        localStorage.removeItem(ks.wait);
        await fetchStatus();
      } else {
        // pending => set waiting gate (refresh-proof)
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

  // Hide panel (veil stays). Optionally remember "dismiss till tomorrow".
  function closeForToday() {
    const plan = state.access?.overlayPlan;
    const hhmm = String(plan?.showAtLocal || "09:00");
    const wantDay = Number(plan?.showOnDay || 1);
    // Save "dismiss" for today (optional; panel suppression only)
    localStorage.setItem(ks.dismiss(hhmm, wantDay), new Date().toISOString().slice(0, 10));
    setPanelHidden(true);
  }

  // --------------- render ---------------------------
  // Show veil if:
  // 1) state.show is true, or
  // 2) during loading, if waiting gate exists
  const mustVeil = state.show || (state.loading && !!localStorage.getItem(ks.wait));
  if (!mustVeil) return null;

  const price = state.exam?.price || 0;
  const title =
    state.mode === "purchase"
      ? "Unlock full course"
      : state.mode === "restart"
      ? "Restart your preparation"
      : "Waiting for approval";

  const desc =
    state.mode === "purchase"
      ? `Your free trial of ${state.exam?.trialDays || 3} days is over. Buy "${state.exam?.name || examId}" for ₹${price} to continue.`
      : state.mode === "restart"
      ? `You've completed all ${state.access?.planDays || ""} day(s). Restart "${state.exam?.name || examId}" from Day 1.`
      : `Your request has been submitted. You'll see "Waiting for approval" until the owner grants access.`;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm" aria-hidden>
      {/* While loading + waiting gate: we keep only the veil (no panel) */}
      {state.loading && state.waiting && null}

      {!panelHidden && !state.loading && (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
            <div className="text-lg font-semibold mb-1">{title}</div>
            <div className="text-sm text-gray-700 mb-3">{desc}</div>

            {state.mode !== "waiting" ? (
              <>
                <div className="text-sm text-gray-600 mb-2">
                  Admin price: <b>₹{price}</b>
                </div>
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
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting…"
                    : state.mode === "purchase"
                    ? "Submit & Unlock"
                    : "Submit Restart Request"}
                </button>
              </>
            ) : (
              <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-sm mb-2">
                Waiting for approval…
              </div>
            )}

            {/* Close = hide panel; veil/blur remains */}
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
