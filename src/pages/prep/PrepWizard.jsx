// client/src/pages/prep/PrepWizard.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJSON, buildUrl } from "../../utils/api";

// absolute URL helper (works with relative API file URLs)
function abs(u) {
  try {
    const base = import.meta.env.VITE_BACKEND_URL || "";
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return `${base}${u}`;
  } catch {
    return u;
  }
}

export default function PrepWizard() {
  const { examId } = useParams(); // e.g. "UP_APO"
  const [tab, setTab] = useState("calendar"); // calendar | today | progress
  const [summary, setSummary] = useState({
    todayDay: 1,
    planDays: 30,
    modules: [],
  });

  async function load() {
    const email =
      localStorage.getItem("prepEmail") ||
      localStorage.getItem("userEmail") ||
      "";
    const url = buildUrl(
      `/api/prep/user/summary?examId=${encodeURIComponent(
        examId
      )}&email=${encodeURIComponent(email)}`
    );
    const r = await getJSON(url);
    setSummary({
      todayDay: r.todayDay || 1,
      planDays: r.planDays || 30,
      modules: r.modules || [],
    });
  }

  useEffect(() => {
    load();
  }, [examId]);

  const days = useMemo(
    () => Array.from({ length: summary.planDays }, (_, i) => i + 1),
    [summary.planDays]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link to="/prep" className="text-sm text-blue-600">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">{examId}</h1>
      </div>

      <div className="flex gap-2 mb-4">
        {["calendar", "today", "progress"].map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded border ${
              tab === k ? "bg-black text-white" : "bg-white"
            }`}
          >
            {k === "calendar"
              ? "Calendar"
              : k === "today"
              ? "Today’s Task"
              : "Progress"}
          </button>
        ))}
      </div>

      {tab === "calendar" && (
        <div>
          <div className="mb-3 p-3 rounded border bg-white text-sm">
            Current Day (cohort): <b>Day {summary.todayDay}</b>
            <div className="text-xs text-gray-500">
              Only released & time-unlocked modules are available each day.
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => setTab("today")}
                className={`aspect-square rounded border text-sm ${
                  d === summary.todayDay
                    ? "bg-amber-100 border-amber-300"
                    : "bg-white"
                }`}
                title={`Day ${d}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "today" && (
        <Today modules={summary.modules} day={summary.todayDay} onRefresh={load} />
      )}

      {tab === "progress" && (
        <div className="p-3 rounded border bg-white">
          {/* Placeholder – will be replaced with donut + bars */}
          <div className="text-sm text-gray-600">
            Completed days will appear here once you mark tasks complete.
          </div>
        </div>
      )}
    </div>
  );
}

function Today({ modules, day }) {
  return (
    <div>
      <div className="text-lg font-semibold mb-2">Day {day}</div>
      {modules.length === 0 && (
        <div className="text-gray-500">No modules for today yet.</div>
      )}

      <div className="grid gap-3">
        {modules.map((m, idx) => (
          <div key={m._id || idx} className="rounded-xl border bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{m.title || "Untitled"}</div>
              <div className="text-xs text-gray-500">
                {minToHHMM(m.slotMin || 0)}
              </div>
            </div>

            {/* Image gallery (when images uploaded) */}
            {(m.files || []).filter((f) => f.kind === "image").length > 0 && (
              <div className="mt-2 overflow-x-auto whitespace-nowrap">
                {(m.files || [])
                  .filter((f) => f.kind === "image")
                  .map((f, i) => (
                    <img
                      key={i}
                      src={abs(f.url)}
                      alt=""
                      className="inline-block h-44 rounded mr-2 border object-contain bg-gray-50"
                    />
                  ))}
              </div>
            )}

            {/* Allow opening original PDF (if admin enabled showOriginal) */}
            {(m.files || [])
              .filter((f) => f.kind === "pdf" && m?.flags?.showOriginal)
              .map((f, i) => (
                <div key={i} className="mt-2">
                  <a
                    href={abs(f.url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline text-sm"
                  >
                    Open PDF
                  </a>
                </div>
              ))}

            {/* OCR text (scrollable handwritten look) */}
            {m?.flags?.extractOCR && m?.ocrText && (
              <div
                className="mt-3 rounded p-3"
                style={{
                  maxHeight: 300,
                  overflowY: "auto",
                  background: "#fffbe7",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Patrick Hand', cursive",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.ocrText}
                </p>
              </div>
            )}

            {/* Audio players */}
            {(m.files || [])
              .filter((f) => f.kind === "audio")
              .map((f, i) => (
                <audio key={i} controls className="mt-3 w-full">
                  <source src={abs(f.url)} type={f.mime || "audio/mpeg"} />
                </audio>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function minToHHMM(m) {
  const h = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${h}:${mm}`;
}
