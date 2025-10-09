// client/src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function PrepAccessOverlay({ examId, email }) {
  // --------- localStorage keys (per exam + user) ---------
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`, // refresh-proof waiting gate
      dismiss: (hhmm = "09:00", day = 1) => `overlayDismiss:${e}:${day}:${hhmm}`, // daily panel-dismiss (veil stays)
    };
  }, [examId, email]);

  // ----------------------- state --------------------------
  const [state, setState] = useState({
    loading: true,
    // if waiting gate existed, keep veil immediately
    show: !!(examId && localStorage.getItem(ks.wait)),
    mode: localStorage.getItem(ks.wait) ? "waiting" : "",
    exam: {},
    access: {},
    waiting: !!localStorage.getItem(ks.wait),
  });

  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Hide only the panel; keep veil (interaction blocked)
  const [panelHidden, setPanelHidden] = useState(false);

  // ----------------------- core fetch ---------------------
  async function fetchStatus() {
    if (!examId) return;

    const hasWaitingGate = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({ examId, email: email || "" });
      const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);

      // If API is not reachable / invalid payload, do NOT open purchase/restart.
      if (!r || r.success === false || (!r.exam && !r.access)) {
        setState((s) => ({
          ...s,
          loading: false,
          show: hasWaitingGate,                  // only keep veil if waiting
          mode: hasWaitingGate ? "waiting" : "", // preserve waiting mode if set
        }));
        return;
      }

      const { exam, access, overlay } = r;

      // brand-new user → start trial → re-fetch
      if (access?.status === "none" && email) {
        await postJSON("/api/prep/access/start-trial", { examId, email });
        return fetchStatus();
      }

      // todayDay (used by optional planDayTime auto-open)
      let todayDay = 1;
      try {
        const meta = await getJSON(`/api/prep/user/summary?${qs.toString()}`);
        todayDay = Number(meta?.todayDay || 1);
      } catch {}

      // ------------- decide overlay -------------
      let mode = "";
      let show = false;
      let waiting = !!access?.pending;

      const isPlanDayTime = access?.overlayPlan?.mode === "planDayTime";

      // (0) local waiting gate has highest priority
      if (hasWaitingGate) {
        mode = "waiting";
        show = true;
        waiting = true;
      }

      // (A) trust server decision (server computes timing/mode)
      if (!show && overlay?.show && overlay?.mode) {
        mode = overlay.mode; // "purchase" | "restart"
        show = true;
      }
      // (B) server-forced flags
      else if (!show && access?.overlayForce) {
        mode = access.forceMode === "restart" ? "restart" : "purchase";
        show = true;
      }

      // (C) fallback reasons — skip in planDayTime
      if (!show && !isPlanDayTime) {
        if (access?.status === "trial" && access?.trialEnded) {
          mode = "purchase"; show = true;
        } else if (access?.status === "active" && access?.canRestart) {
          mode = "restart"; show = true;
        } else if (waiting) {
          mode = "waiting"; show = true;
        }
      }

      // (D) optional client-side planDayTime (kept for backwards compatibility)
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
              mode = "purchase"; show = true;
            }
          } catch {}
        }
      }

      // Persist/clear waiting gate
      const effectiveShow = !!show && !!mode;
      const isWaitingNow = mode === "waiting";
      if (isWaitingNow) {
        localStorage.setItem(ks.wait, "1");
      } else {
        // if approved and active, drop the gate
        const activeOK = access?.status === "active" && !waiting;
        if (activeOK) localStorage.removeItem(ks.wait);
      }

      setState({
        loading: false,
        // on return from loading, keep veil if waiting gate was present
        show: effectiveShow || hasWaitingGate,
        mode: mode || (hasWaitingGate ? "waiting" : ""),
        exam: exam || {},
        access: access || {},
        waiting: isWaitingNow || hasWaitingGate,
      });

      if (effectiveShow) setPanelHidden(false);
    } catch (e) {
      // Network error → ONLY keep veil if waiting gate exists
      setState((s) => ({
        ...s,
        loading: false,
        show: !!localStorage.getItem(ks.wait),
        mode: localStorage.getItem(ks.wait) ? "waiting" : "",
      }));
    }
  }

  // first load + poll each minute (for minute-accurate open)
  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  useEffect(() => {
    const t = setInterval(fetchStatus, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  // ----------------------- actions ------------------------
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
        localStorage.removeItem(ks.wait); // approved → drop waiting gate
        await fetchStatus();
      } else {
        localStorage.setItem(ks.wait, "1"); // pending → enforce waiting veil
        setState((s) => ({ ...s, mode: "waiting", show: true, waiting: true }));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  // Hide panel content for the day, but keep the page blocked (veil stays)
  function closeForToday() {
    const plan = state.access?.overlayPlan;
    const hhmm = String(plan?.showAtLocal || "09:00");
    const wantDay = Number(plan?.showOnDay || 1);
    localStorage.setItem(ks.dismiss(hhmm, wantDay), new Date().toISOString().slice(0, 10));
    setPanelHidden(true);
  }

  // ----------------------- render -------------------------
  // Show veil if:
  // 1) state.show is true, or
  // 2) during loading, a waiting gate exists
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
      {/* While loading with a waiting gate, keep veil only (no panel) */}
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

            {/* Close = hide panel (veil remains to block interaction) */}
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
