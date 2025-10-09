// client/src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function PrepAccessOverlay({ examId, email }) {
  // ----------------------- localStorage keys -----------------------
  const ks = useMemo(() => {
    const e = String(examId || "").trim();
    const u = String(email || "").trim() || "anon";
    return {
      wait: `overlayWaiting:${e}:${u}`,   // waiting-for-approval (refresh-proof gate)
      dismiss: (hhmm = "09:00", day = 1) => `overlayDismiss:${e}:${day}:${hhmm}`, // daily panel-dismiss
    };
  }, [examId, email]);

  // ----------------------- component state ------------------------
  const [state, setState] = useState({
    loading: true,
    show: !!(examId && localStorage.getItem(ks.wait)), // अगर पहले से waiting था तो वील तुरंत दिखे
    mode: localStorage.getItem(ks.wait) ? "waiting" : "", // waiting मोड पिन करें
    exam: {},
    access: {},
    waiting: !!localStorage.getItem(ks.wait),
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // पैनल छुपाना (blur veil बना रहेगा)
  const [panelHidden, setPanelHidden] = useState(false);

  // ----------------------- core fetch ------------------------------
  async function fetchStatus() {
    if (!examId) return;

    // अगर पहले से waiting गेट लगा है, तो लोडिंग के दौरान भी वील न हटाएँ
    const hasWaitingGate = !!localStorage.getItem(ks.wait);

    try {
      const qs = new URLSearchParams({ examId, email: email || "" });
      const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
      const { exam, access, overlay } = r || {};

      // brand-new user → auto start trial → re-fetch
      if ((access?.status === "none") && email) {
        await postJSON("/api/prep/access/start-trial", { examId, email });
        return fetchStatus();
      }

      // user summary से टुडे-डे
      let todayDay = 1;
      try {
        const meta = await getJSON(`/api/prep/user/summary?${qs.toString()}`);
        todayDay = Number(meta?.todayDay || 1);
      } catch {}

      // ---------- decide overlay -------------
      let mode = "";
      let show = false;
      let waiting = !!access?.pending;

      // planDayTime होने पर सर्वर का overlay.show भरोसा न करें
      const isPlanDayTime = access?.overlayPlan?.mode === "planDayTime";

      // (0) local waiting gate highest priority (refresh-proof)
      if (hasWaitingGate) {
        mode = "waiting";
        show = true;
        waiting = true;
      }

      // (A) backend निर्देश — planDayTime में स्किप
      if (!show && !isPlanDayTime && overlay?.show && overlay?.mode) {
        mode = overlay.mode; // "purchase" | "restart"
        show = true;
      }
      // (B) server-forced flags
      else if (!show && access?.overlayForce) {
        mode = access.forceMode === "restart" ? "restart" : "purchase";
        show = true;
      }
      // (C) fallback reasons
      if (!show) {
        if (access?.status === "trial" && access?.trialEnded) {
          mode = "purchase"; show = true;
        } else if (access?.status === "active" && access?.canRestart) {
          mode = "restart"; show = true;
        } else if (waiting) {
          mode = "waiting"; show = true;
        }
      }

      // (D) planDayTime → local time/day पर auto-open
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

      // waiting gate persist/clear
      const effectiveShow = !!show && !!mode;
      const isWaitingNow = mode === "waiting";
      if (isWaitingNow) {
        localStorage.setItem(ks.wait, "1");
      } else {
        // अगर सर्वर active दे दे (approved), तो gate हटा दो
        const activeOK = access?.status === "active" && !waiting;
        if (activeOK) localStorage.removeItem(ks.wait);
      }

      setState({
        loading: false,
        show: effectiveShow || hasWaitingGate, // लोडिंग से वापस आते समय भी वील न गिरे
        mode: mode || (hasWaitingGate ? "waiting" : ""),
        exam: exam || {},
        access: access || {},
        waiting: isWaitingNow || hasWaitingGate,
      });

      if (effectiveShow) setPanelHidden(false);
    } catch (e) {
      // अगर API fail भी हो जाए और waiting gate लगा है, तो वील बनाए रखें
      setState((s) => ({ ...s, loading: false, show: s.show || !!localStorage.getItem(ks.wait), mode: s.mode || (localStorage.getItem(ks.wait) ? "waiting" : "") }));
    }
  }

  // first load + minute polling (so planDayTime minute पर खुल जाए)
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
        // approved → gate हटेगा; status रिफ्रेश
        localStorage.removeItem(ks.wait);
        await fetchStatus();
      } else {
        // pending → waiting gate ON (refresh-proof)
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

  // Panel hide (blur veil रहेगा; यूज़र इंटरैक्ट नहीं कर पाएगा)
  function closeForToday() {
    const plan = state.access?.overlayPlan;
    const hhmm = String(plan?.showAtLocal || "09:00");
    const wantDay = Number(plan?.showOnDay || 1);
    localStorage.setItem(ks.dismiss(hhmm, wantDay), new Date().toISOString().slice(0, 10));
    setPanelHidden(true);
  }

  // ----------------------- render -------------------------------
  // वील कब दिखाएँ?
  // 1) state.show true हो, या
  // 2) लोडिंग के दौरान waiting gate लगा हो
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
      {/* Loading + waiting gate: सिर्फ़ वील रखें, पैनल छिपा सकते हैं */}
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
                  <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
                <button
                  className="w-full py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
                  onClick={submitRequest}
                  disabled={submitting}
                >
                  {submitting ? "Submitting…" : state.mode === "purchase" ? "Submit & Unlock" : "Submit Restart Request"}
                </button>
              </>
            ) : (
              <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 text-sm mb-2">
                Waiting for approval…
              </div>
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
