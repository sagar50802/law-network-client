// client/src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function PrepAccessOverlay({ examId, email }) {
  const [state, setState] = useState({
    loading: true,
    show: false,        // overlay veil (blocks page)
    mode: "",           // "purchase" | "restart" | "waiting"
    exam: {},
    access: {},
    waiting: false,
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Hide only the panel content (keep blur/veil to gate interaction)
  const [panelHidden, setPanelHidden] = useState(false);

  async function fetchStatus() {
    if (!examId) return;

    // 1) load access/exam (+ overlay info/flags)
    const qs = new URLSearchParams({ examId, email: email || "" });
    const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
    const { exam, access, overlay } = r || {};

    // brand-new user → start trial → re-fetch
    if ((access?.status === "none") && email) {
      await postJSON("/api/prep/access/start-trial", { examId, email });
      return fetchStatus();
    }

    // 2) also need the user's current plan day
    let todayDay = 1;
    try {
      const meta = await getJSON(`/api/prep/user/summary?${qs.toString()}`);
      todayDay = Number(meta?.todayDay || 1);
    } catch {}

    // defaults
    let mode = "";
    let show = false;
    let waiting = !!access?.pending;

    // refresh-proof "waiting" flag
    let waitingFlag = false;
    try {
      waitingFlag = localStorage.getItem(`overlayWaiting:${examId}`) === "1";
    } catch {}

    // detect planDayTime config
    const isPlanDayTime = access?.overlayPlan?.mode === "planDayTime";

    // A) backend decision (explicit) — trust ONLY if NOT planDayTime
    if (!isPlanDayTime && overlay?.show && overlay?.mode) {
      mode = overlay.mode;
      show = true;
    }
    // B) server-forced flags
    else if (access?.overlayForce) {
      mode = access.forceMode === "restart" ? "restart" : "purchase";
      show = true;
    }
    // C) existing reasons (fallback)
    if (!show) {
      if (access?.status === "trial" && access?.trialEnded) {
        mode = "purchase"; show = true;
      } else if (access?.status === "active" && access?.canRestart) {
        mode = "restart"; show = true;
      } else if (waiting || waitingFlag) {
        mode = "waiting"; show = true;
      }
    }

    // D) Auto-open by plan day + local time from overlayPlan
    if (!show) {
      const plan = access?.overlayPlan;
      if (plan?.mode === "planDayTime") {
        try {
          const wantDay = Number(plan.showOnDay || 1);
          const hhmm = String(plan.showAtLocal || "09:00");
          const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));

          const now = new Date();
          const targetToday = new Date(now);
          targetToday.setHours(hh || 0, mm || 0, 0, 0);

          // only suppress re-show for the day if user chose to (we'll still gate)
          const notDismissed = (() => {
            const key = `overlayDismiss:${examId}:${wantDay}:${hhmm}`;
            const v = localStorage.getItem(key);
            const todayKey = new Date().toISOString().slice(0, 10);
            return v !== todayKey;
          })();

          if (todayDay >= wantDay && now >= targetToday && notDismissed) {
            mode = "purchase"; show = true;
          }
        } catch {}
      }
    }

    // If server says overlay isn't needed anymore, allow interaction again.
    // Also if mode resolves to "", we drop the veil.
    const effectiveShow = !!show && !!mode;

    setState({
      loading: false,
      show: effectiveShow,
      mode,
      exam: exam || {},
      access: access || {},
      waiting,
    });

    // If overlay is (re)shown, ensure panel is visible unless user chose to hide it.
    if (effectiveShow) setPanelHidden(false);

    // If access is active now, clear refresh-proof waiting flag
    try {
      if (access?.status === "active") {
        localStorage.removeItem(`overlayWaiting:${examId}`);
      }
    } catch {}
  }

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  // OPTIONAL: Auto-recheck every 60s so it can open right at the minute
  useEffect(() => {
    const t = setInterval(fetchStatus, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

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
        await fetchStatus(); // server will flip access, veil will drop
      } else {
        // refresh-proof waiting
        try { localStorage.setItem(`overlayWaiting:${examId}`, "1"); } catch {}
        setState((s) => ({ ...s, mode: "waiting", show: true, waiting: true }));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  // Close button: hide panel for today but KEEP the blur veil (gating)
  function closeForToday() {
    const plan = state.access?.overlayPlan;
    const hhmm = String(plan?.showAtLocal || "09:00");
    const wantDay = Number(plan?.showOnDay || 1);
    const key = `overlayDismiss:${(state.exam?.examId || examId)}:${wantDay}:${hhmm}`;
    const todayKey = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(key, todayKey); } catch {}
    setPanelHidden(true); // Hide only the panel, keep page blocked.
  }

  // Prevent any flash of content:
  // If not loading AND not supposed to show, render nothing (allow interaction).
  if (!state.show && !state.loading) return null;

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
    (state.loading || state.show) && (
      <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm" aria-hidden>
        {/* Panel hidden? Keep veil only (gated). */}
        {!panelHidden && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
              <div className="text-lg font-semibold mb-1">{title}</div>
              <div className="text-sm text-gray-700 mb-3">{desc}</div>

              {state.mode !== "waiting" && (
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
                </>
              )}

              {state.mode === "waiting" ? (
                <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-sm">
                  Waiting for approval…
                </div>
              ) : (
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
              )}

              {/* Close = hide panel, but keep blur gating */}
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
    )
  );
}
