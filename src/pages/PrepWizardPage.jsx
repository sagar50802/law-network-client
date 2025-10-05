// client/src/components/Prep/PrepWizard.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getJSON } from "../../utils/api";
import useSubmissionStream from "../../hooks/useSubmissionStream";
import useAccessSync from "../../hooks/useAccessSync";
import AccessTimer from "../common/AccessTimer";

// ⬇️ NEW: prep-specific overlay (separate from existing QROverlay)
import PrepOverlay from "./PrepOverlay.jsx";

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded ${active ? "bg-black text-white" : "border"}`}
    >
      {label}
    </button>
  );
}

export default function PrepWizard() {
  const { examId } = useParams();
  const email = localStorage.getItem("userEmail") || "";
  useSubmissionStream(email);

  const [tab, setTab] = useState("calendar"); // calendar | today | progress
  const [overview, setOverview] = useState({ total: 0, completed: 0, access: null });
  const [today, setToday] = useState({ dayIndex: 1, items: [], hasAccess: false });

  // ⬇️ NEW: prep overlay state
  const [overlayOpen, setOverlayOpen] = useState(false);

  const pct = useMemo(
    () => (overview.total ? Math.round((overview.completed / overview.total) * 100) : 0),
    [overview]
  );

  async function loadAll() {
    const ov = await getJSON(`/api/exams/${examId}/overview?email=${encodeURIComponent(email)}`).catch(() => ({}));
    setOverview({
      total: ov?.total || 0,
      completed: ov?.completed || 0,
      access: ov?.access || null,
    });

    const td = await getJSON(`/api/exams/${examId}/today?email=${encodeURIComponent(email)}`).catch(() => ({}));
    setToday({ dayIndex: td?.dayIndex || 1, items: td?.items || [], hasAccess: !!td?.hasAccess });
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  // Live grant/revoke via existing SSE hook
  useAccessSync(async (detail) => {
    if (!detail || detail.email !== email || detail.feature !== "exam") return;
    await loadAll();
    // Also re-check status for overlay after access updates
    await checkStatus();
  });

  // ⬇️ NEW: auto-open overlay if no access OR completed
  const checkStatus = async () => {
    try {
      const r = await getJSON(`/api/prep/status/${examId}?email=${encodeURIComponent(email)}`);
      if (!r?.access || r?.isCompleted) setOverlayOpen(true);
    } catch {}
  };
  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const [countdownMs, setCountdownMs] = useState(0);
  useEffect(() => {
    if (!overview?.access?.expiryAt) return;
    const end = +new Date(overview.access.expiryAt);
    const t = setInterval(() => setCountdownMs(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [overview?.access?.expiryAt]);

  return (
    <section className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">{examId}</h1>
        <div className="flex items-center gap-2">
          {overview?.access ? (
            <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
              <span>✅ Active</span>
              {countdownMs > 0 && <AccessTimer timeLeftMs={countdownMs} />}
            </div>
          ) : (
            <button
              className="text-xs bg-red-500 text-white px-2 py-1 rounded"
              onClick={() => setOverlayOpen(true)}
            >
              Start / Restart
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <TabButton label="Calendar" active={tab === "calendar"} onClick={() => setTab("calendar")} />
        <TabButton label="Today’s Task" active={tab === "today"} onClick={() => setTab("today")} />
        <TabButton label="Progress" active={tab === "progress"} onClick={() => setTab("progress")} />
      </div>

      {tab === "calendar" && <CalendarView examId={examId} email={email} today={today} />}
      {tab === "today" && (
        <TodayView
          examId={examId}
          email={email}
          data={today}
          afterAction={loadAll}
          onPossiblyCompleted={() => setOverlayOpen(true)} // ⬅️ NEW: open overlay when plan completes
        />
      )}
      {tab === "progress" && <ProgressView total={overview.total} completed={overview.completed} pct={pct} />}

      {/* ⬇️ NEW: Prep overlay (separate component, no dependency on old QROverlay) */}
      <PrepOverlay
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        examId={examId}
        emailSource={() => email}
      />
    </section>
  );
}

function CalendarView({ today }) {
  return (
    <div className="border rounded-xl bg-white p-4">
      <div className="text-sm">
        Current Day (cohort): <b>Day {today.dayIndex}</b>
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Only released & time-unlocked modules are available each day.
      </div>
    </div>
  );
}

function TodayView({ examId, email, data, afterAction, onPossiblyCompleted }) {
  const items = data?.items || [];

  async function markComplete() {
    await fetch(`/api/exams/${encodeURIComponent(examId)}/complete-day`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, dayIndex: data.dayIndex, done: true }),
    });
    await afterAction?.();

    // ⬇️ NEW: if that was the last day, auto-open overlay
    try {
      const st = await getJSON(`/api/prep/status/${examId}?email=${encodeURIComponent(email)}`);
      if (st?.isCompleted) onPossiblyCompleted?.();
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">Day {data.dayIndex}</div>
      {items.map((m) => (
        <div key={m.id} className="border rounded-xl bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{m.title}</div>
            <div
              className={`text-xs px-2 py-1 rounded-full ${
                m.unlocked ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
              }`}
            >
              {m.unlocked ? "Unlocked" : m.willUnlockAt ? `Will unlock at ${m.willUnlockAt}` : "Locked"}
            </div>
          </div>
          {m.unlocked ? (
            <div className="mt-2 space-y-2">
              {!!m.ocrText && (
                <div className="p-2 bg-yellow-50 rounded border text-sm max-h-48 overflow-auto">
                  {m.ocrText}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {(m.files || []).map((f, i) => {
                  if (f.type === "image") {
                    return <img key={i} src={f.url} alt="" className="w-40 h-24 object-cover rounded border" />;
                  }
                  if (f.type === "audio") {
                    return (
                      <audio
                        key={i}
                        controls
                        preload="metadata"
                        src={`/api/exams/stream?src=${encodeURIComponent(f.url)}`}
                        className="w-full"
                      />
                    );
                  }
                  // pdf or other
                  return (
                    <a
                      key={i}
                      href={`/api/exams/stream?src=${encodeURIComponent(f.url)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline text-sm"
                    >
                      Open PDF
                    </a>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-gray-500">This module will become available later today.</div>
          )}
        </div>
      ))}
      {items.length > 0 && (
        <button onClick={markComplete} className="px-3 py-2 rounded bg-black text-white">
          Mark Day Complete
        </button>
      )}
      {items.length === 0 && <div className="text-gray-500">No modules for today yet.</div>}
    </div>
  );
}

function ProgressView({ total, completed, pct }) {
  return (
    <div className="border rounded-xl bg-white p-4">
      <div className="text-sm mb-2">Overall</div>
      <div className="w-full h-2 bg-gray-200 rounded mb-2">
        <div className="h-2 bg-blue-600 rounded" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-sm text-gray-600">
        {completed} / {total} completed
      </div>
    </div>
  );
}
