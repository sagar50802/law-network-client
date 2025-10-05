import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getJSON, postJSON, absUrl } from "../../utils/api";

// crude email source for now (align with your site’s pattern)
function useEmail() {
  return localStorage.getItem("prepEmail") || localStorage.getItem("userEmail") || "";
}

export default function PrepWizard() {
  const { examId } = useParams();
  const email = useEmail();

  const [tab, setTab] = useState("calendar"); // calendar | today | progress
  const [today, setToday] = useState({ day: null, modules: [] });
  const [progress, setProgress] = useState({ completedDays: [] });

  const loadToday = async () => {
    const r = await getJSON(`/api/prep/${examId}/today?email=${encodeURIComponent(email)}`);
    setToday({ day: r.todayDay, modules: r.modules || [] });
  };
  const loadProgress = async () => {
    const r = await getJSON(`/api/prep/access/my?email=${encodeURIComponent(email)}&examId=${encodeURIComponent(examId)}`);
    // lightweight: we’ll get progress on complete; for now just remember access for CTA
  };

  useEffect(() => { loadToday(); loadProgress(); }, [examId]);

  const markComplete = async () => {
    if (!today.day) return;
    await postJSON(`/api/prep/${examId}/complete`, { email, dayIndex: today.day });
    await loadToday();
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-4">
        <a href="/prep" className="text-sm text-blue-600">← Back</a>
        <h1 className="text-2xl font-bold">{examId.replace(/_/g," ")}</h1>
      </div>

      <div className="flex gap-2 mb-3">
        <TabBtn label="Calendar" sel={tab==="calendar"} onClick={()=>setTab("calendar")} />
        <TabBtn label="Today’s Task" sel={tab==="today"} onClick={()=>setTab("today")} />
        <TabBtn label="Progress" sel={tab==="progress"} onClick={()=>setTab("progress")} />
      </div>

      {tab==="calendar" && <CalendarView todayDay={today.day} onPickDay={()=>setTab("today")} />}
      {tab==="today"    && <TodayView data={today} onComplete={markComplete} />}
      {tab==="progress" && <ProgressView examId={examId} />}
    </div>
  );
}

function TabBtn({ label, sel, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded border ${sel ? "bg-black text-white" : "bg-white"}`}>
      {label}
    </button>
  );
}

/* ---------- Calendar (simple placeholder for cohort) ---------- */
function CalendarView({ todayDay, onPickDay }) {
  return (
    <div className="p-3 rounded-xl border bg-white">
      <div className="text-sm">Current Day (cohort): <b>Day {todayDay || 1}</b></div>
      <div className="text-xs text-gray-500 mt-1">Only released & time-unlocked modules are available each day.</div>
      <button className="mt-3 px-3 py-1 rounded border" onClick={onPickDay}>Open Today’s Task</button>
    </div>
  );
}

/* ---------- Today’s Task ---------- */
function TodayView({ data, onComplete }) {
  if (!data.day) return <div className="text-gray-500">No active plan or outside plan window.</div>;
  const mods = data.modules || [];
  return (
    <div>
      <div className="text-sm mb-2">Day {data.day}</div>
      {mods.length === 0 && <div className="text-gray-500">No modules for today yet.</div>}

      <div className="grid gap-4">
        {mods.map((m) => (
          <div key={m._id} className="rounded-xl border bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{m.title}</div>
              <div className="text-xs text-gray-500">{m.slotTime}</div>
            </div>

            {/* Images (gallery) when OCR off or even with OCR */}
            {m.files?.filter(f=>f.type==="image").length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {m.files.filter(f=>f.type==="image").map((f,idx)=>(
                  <img key={idx} src={absUrl(f.url)} className="rounded shadow" />
                ))}
              </div>
            )}

            {/* OCR text (scrollable handwritten) */}
            {m.flags?.extractOCR && m.ocrText && (
              <div className="ocr-box mt-3">
                <p className="handwritten whitespace-pre-wrap">{m.ocrText}</p>
              </div>
            )}

            {/* Audio */}
            {m.files?.some(f=>f.type==="audio") && (
              <div className="mt-3">
                {m.files.filter(f=>f.type==="audio").map((f,i)=>(
                  <audio key={i} controls src={absUrl(f.url)} className="w-full" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="mt-4 px-4 py-2 rounded bg-amber-500 text-white" onClick={onComplete}>
        Mark Complete
      </button>
    </div>
  );
}

/* ---------- Progress (placeholder bars) ---------- */
function ProgressView() {
  return (
    <div className="rounded-xl border bg-white p-3 text-sm text-gray-600">
      Your progress will appear here once modules and completion data grow.
    </div>
  );
}
