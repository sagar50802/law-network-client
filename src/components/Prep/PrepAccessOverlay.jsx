// client/src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function PrepAccessOverlay({ examId, email }) {
  const userEmail = email || "";

  // refresh-proof keys
  const waitKey = useMemo(
    () => (examId && userEmail ? `overlayWaiting:${examId}:${userEmail}` : ""),
    [examId, userEmail]
  );

  // boot पर फ़्लिकर रोकने के लिए veil ON रखें; panel बाद में decide होगा
  const [state, setState] = useState({
    loading: true,
    show: true,          // veil/blur — शुरुआत में true (no flash)
    mode: "",            // "purchase" | "restart" | "waiting"
    exam: {},
    access: {},
    waiting: false,
  });

  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // सिर्फ़ panel hide करने का टॉगल; veil हमेशा रहता है जब state.show = true
  const [panelHidden, setPanelHidden] = useState(false);

  function hasWaitingFlag() {
    if (!waitKey) return false;
    try { return localStorage.getItem(waitKey) === "1"; } catch { return false; }
  }
  function setWaitingFlag(v) {
    if (!waitKey) return;
    try {
      if (v) localStorage.setItem(waitKey, "1");
      else localStorage.removeItem(waitKey);
    } catch {}
  }

  async function fetchStatus() {
    if (!examId) return;

    // 1) server status
    const qs = new URLSearchParams({ examId, email: userEmail });
    const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
    const { exam, access, overlay } = r || {};

    // New user → auto trial → re-fetch
    if ((access?.status === "none") && userEmail) {
      await postJSON("/api/prep/access/start-trial", { examId, email: userEmail });
      return fetchStatus();
    }

    // 2) current cohort day (for planDayTime)
    let todayDay = 1;
    try {
      const meta = await getJSON(`/api/prep/user/summary?${qs.toString()}`);
      todayDay = Number(meta?.todayDay || 1);
    } catch {}

    // ---- decide UI ----
    let mode = "";
    let show = false;
    let waiting = !!access?.pending;

    // refresh-proof waiting (always wins until access flips to active)
    if (hasWaitingFlag()) {
      mode = "waiting";
      show = true;
      waiting = true;
    }

    const isPlanDayTime = access?.overlayPlan?.mode === "planDayTime";

    // A) backend decision — trust ONLY if not planDayTime and not waiting-flag
    if (!show && !isPlanDayTime && overlay?.show && overlay?.mode) {
      mode = overlay.mode;
      show = true;
    }

    // B) server-forced legacy flags
    if (!show && access?.overlayForce) {
      mode = access.forceMode === "restart" ? "restart" : "purchase";
      show = true;
    }

    // C) fallback reasons
    if (!show) {
      if (access?.status === "trial" && r?.access?.trialEnded) {
        mode = "purchase"; show = true;
      } else if (access?.status === "active" && r?.access?.canRestart) {
        mode = "restart"; show = true;
      } else if (waiting) {
        mode = "waiting"; show = true;
      }
    }

    // D) client-side open for planDayTime (local time)
    if (!show && isPlanDayTime) {
      try {
        const plan = access?.overlayPlan || {};
        const wantDay = Number(plan.showOnDay || 1);
        const hhmm = String(plan.showAtLocal || "09:00");
        const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));

        const now = new Date();
        const targetToday = new Date(now);
        targetToday.setHours(hh || 0, mm || 0, 0, 0);

        // dismiss key सिर्फ panel के लिए था; veil अब भी लगाया जाएगा
        const disKey = `overlayDismiss:${examId}:${wantDay}:${hhmm}`;
        const dismissedForToday =
          (localStorage.getItem(disKey) || "") === new Date().toISOString().slice(0, 10);

        if (todayDay >= wantDay && now >= targetToday) {
          mode = dismissedForToday ? "purchase" : "purchase";
          show = true;
        }
      } catch {}
    }

    // अगर approve होकर access active हो गया, waiting flag हटाएँ और veil हटाएँ
    if (access?.status === "active" && hasWaitingFlag()) {
      setWaitingFlag(false);
    }

    const effectiveShow = !!show && !!mode;

    setState({
      loading: false,
      show: effectiveShow,
      mode,
      exam: exam || {},
      access: access || {},
      waiting: waiting || mode === "waiting",
    });

    if (effectiveShow) setPanelHidden(false);
  }

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, userEmail]);

  // minute polling so timed overlay pops without manual refresh
  useEffect(() => {
    const t = setInterval(fetchStatus, 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, userEmail]);

  async function submitRequest() {
    if (!userEmail) {
      alert("Need an email in localStorage as 'userEmail'");
      return;
    }
    if (!state.mode || state.mode === "waiting") return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("examId", examId);
      fd.append("email", userEmail);
      fd.append("intent", state.mode === "purchase" ? "purchase" : "restart");
      if (file) fd.append("screenshot", file);

      const r = await fetch("/api/prep/access/request", { method: "POST", body: fd });
      const j = await r.json();

      if (j?.approved) {
        // approved instantly → refresh status will drop veil
        setWaitingFlag(false);
        await fetchStatus();
      } else {
        // pending → mark waiting refresh-proof & keep veil
        setWaitingFlag(true);
        setState((s) => ({ ...s, mode: "waiting", show: true, waiting: true }));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  // Close = सिर्फ panel hide; veil लगा रहेगा (गेटिंग)
  function closeForToday() {
    const plan = state.access?.overlayPlan;
    const hhmm = String(plan?.showAtLocal || "09:00");
    const wantDay = Number(plan?.showOnDay || 1);
    const key = `overlayDismiss:${state.exam?.examId || examId}:${wantDay}:${hhmm}`;
    const todayKey = new Date().toISOString().slice(0, 10);
    try { localStorage.setItem(key, todayKey); } catch {}
    setPanelHidden(true);
  }

  /* -------------------------- RENDER -------------------------- */

  // अगर show=false, तभी कंटेंट usable होगा
  if (!state.show) return null;

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
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm">
      {/* loading में panel optional है; चाहें तो spinner दिखाएँ */}
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
