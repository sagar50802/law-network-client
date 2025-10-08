// client/src/components/Prep/PrepAccessOverlay.jsx
import { useEffect, useState } from "react";
import { getJSON, postJSON } from "../../utils/api";

export default function PrepAccessOverlay({ examId, email }) {
  const [state, setState] = useState({
    loading: true,
    show: false,
    mode: "",
    exam: {},
    access: {},
    waiting: false,
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  /** ✅ Updated fetchStatus respecting backend overlay flags */
  async function fetchStatus() {
    if (!examId) return;
    const qs = new URLSearchParams({ examId, email: email || "" });
    const r = await getJSON(`/api/prep/access/status?${qs.toString()}`);
    const { exam, access, overlay } = r || {};

    // brand-new user → start trial automatically
    if ((access?.status === "none") && email) {
      await postJSON("/api/prep/access/start-trial", { examId, email });
      return fetchStatus();
    }

    let mode = "";
    let show = false;
    let waiting = !!access?.pending;

    // ✅ NEW: trust backend overlay decision
    if (overlay?.show && overlay?.mode) {
      mode = overlay.mode; // "purchase" or "restart"
      show = true;
    } else {
      // fallback to local decision (for older servers)
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

    setState({
      loading: false,
      show,
      mode,
      exam: exam || {},
      access: access || {},
      waiting,
    });
  }

  useEffect(() => {
    fetchStatus();
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

      const r = await fetch("/api/prep/access/request", {
        method: "POST",
        body: fd,
      });
      const j = await r.json();
      if (j?.approved) {
        await fetchStatus();
      } else {
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
      ? `Your free trial of ${state.exam?.trialDays || 3} days is over. Buy "${
          state.exam?.name || examId
        }" for ₹${price} to continue.`
      : state.mode === "restart"
      ? `You've completed all ${
          state.access?.planDays || ""
        } day(s). Restart "${state.exam?.name || examId}" from Day 1.`
      : `Your request has been submitted. You'll see "Waiting for approval" until the owner grants access.`;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
        <div className="text-lg font-semibold mb-1">{title}</div>
        <div className="text-sm text-gray-700 mb-3">{desc}</div>

        {state.mode !== "waiting" && (
          <>
            <div className="text-sm text-gray-600 mb-2">
              Admin price: <b>₹{price}</b>
            </div>
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

        <div className="text-[11px] text-gray-500 mt-3">
          After approval, your schedule starts again from Day 1 with the
          original release timings.
        </div>
      </div>
    </div>
  );
}
