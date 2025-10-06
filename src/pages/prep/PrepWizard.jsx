// client/src/pages/prep/PrepWizard.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getJSON, postJSON, absUrl } from "../../utils/api";

const BASE_START_MIN = 9 * 60; // 09:00 as the base clock

function slotToClock(min) {
  const total = BASE_START_MIN + Number(min || 0);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function PrepWizard() {
  const { examId } = useParams();
  const email =
    localStorage.getItem("prepEmail") ||
    localStorage.getItem("userEmail") ||
    "";

  const [tab, setTab] = useState("calendar"); // calendar | today | progress
  const [summary, setSummary] = useState({
    todayDay: 1,
    planDays: 30,
    modules: [],
    upcoming: [],
  });

  async function load() {
    const q = new URLSearchParams({
      examId,
      email,
    }).toString();

    // ✅ Use API-prefixed endpoint and capture upcoming list
    const r = await getJSON(`/api/prep/user/summary?${q}`).catch(() => ({}));

    setSummary({
      todayDay: r?.todayDay ?? 1,
      planDays: r?.planDays ?? 30,
      modules: r?.modules || [],
      upcoming: r?.upcoming || [],
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, email]);

  const days = useMemo(
    () => Array.from({ length: summary.planDays }, (_, i) => i + 1),
    [summary.planDays]
  );

  const markComplete = async () => {
    if (!email) {
      alert("Please login or set your email to track progress.");
      return;
    }
    try {
      await postJSON(`/api/prep/user/complete`, {
        examId,
        email,
        dayIndex: summary.todayDay,
      });
      await load();
    } catch (e) {
      console.error(e);
      alert("Could not mark complete. Please ensure your email is set.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <a href="/prep" className="text-sm text-blue-600">
          ← Back
        </a>
        <h1 className="text-2xl font-bold">
          {String(examId || "").replace(/_/g, " ")}
        </h1>
      </div>

      <div className="flex gap-2 mb-4">
        {[
          ["calendar", "Calendar"],
          ["today", "Today’s Task"],
          ["progress", "Progress"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded border ${
              tab === key ? "bg-black text-white" : "bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* -------- Calendar -------- */}
      {tab === "calendar" && (
        <div>
          <div className="mb-3 p-3 rounded border bg-white">
            Current Day (cohort): <b>Day {summary.todayDay}</b>
            <div className="text-xs text-gray-500">
              Only released & time-unlocked modules are available each day.
            </div>
          </div>

          {/* simple grid 1..planDays */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => setTab("today")} // UI-only switch; server resolves "today"
                className={`aspect-square rounded border text-sm ${
                  d === summary.todayDay
                    ? "bg-amber-100 border-amber-300"
                    : "bg-white"
                }`}
                title={d === summary.todayDay ? "Today" : `Day ${d}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* -------- Today’s Task -------- */}
      {tab === "today" && (
        <div>
          <div className="text-lg font-semibold mb-3">
            Day {summary.todayDay}
          </div>

          {/* ✅ Coming later today */}
          {summary.upcoming?.length > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              <div className="font-semibold mb-1">Coming later today:</div>
              <ul className="list-disc ml-5">
                {summary.upcoming.map((u) => (
                  <li key={u._id}>
                    {u.title || "Untitled"} —{" "}
                    {u.releaseAt
                      ? new Date(u.releaseAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "time TBA"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.modules.length === 0 && (
            <div className="text-gray-500">No modules for today yet.</div>
          )}

          <div className="grid gap-4">
            {summary.modules.map((m, idx) => {
              const files = Array.isArray(m.files) ? m.files : [];
              const byType = (t) =>
                files.filter((f) => (f.kind || f.type) === t);

              const pdfs = byType("pdf");
              const images = byType("image");
              const audios = byType("audio");
              const videos = byType("video");

              return (
                <div key={m._id || idx} className="rounded-xl border bg-white p-4">
                  {/* Header row: Title + Time */}
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{m.title || "Untitled"}</div>
                    <div className="text-xs text-gray-500">
                      {m.slotMin != null ? slotToClock(m.slotMin) : ""}
                    </div>
                  </div>

                  {/* ---- PDF (originals) ---- */}
                  {m.flags?.showOriginal && pdfs.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-1">PDF</div>
                      <ul className="list-disc ml-5 text-sm">
                        {pdfs.map((f, i) => (
                          <li key={i}>
                            <a
                              className="text-blue-600 underline"
                              href={absUrl(f.url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open PDF {i + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* ---- Images (horizontal gallery) ---- */}
                  {images.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-1">Images</div>
                      <div className="overflow-x-auto whitespace-nowrap gap-3 flex py-2">
                        {images.map((img, i) => (
                          <img
                            key={i}
                            src={absUrl(img.url)}
                            alt=""
                            className="h-48 rounded shadow inline-block border object-contain bg-gray-50"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ---- Text (Auto extract) ---- */}
                  {m.flags?.extractOCR && m.ocrText && (
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-1">
                        Text (Auto extract)
                      </div>
                      <div
                        className="rounded p-3"
                        style={{
                          maxHeight: 300,
                          overflowY: "auto",
                          background: m.flags?.background || "#fffbe7",
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
                    </div>
                  )}

                  {/* ---- Audio ---- */}
                  {audios.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-1">Audio</div>
                      {audios.map((f, i) => (
                        <audio key={i} controls className="w-full block mb-2">
                          <source
                            src={absUrl(f.url)}
                            type={f.mime || "audio/mpeg"}
                          />
                        </audio>
                      ))}
                    </div>
                  )}

                  {/* ---- Video ---- */}
                  {videos.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium mb-1">Video</div>
                      {videos.map((f, i) => (
                        <video
                          key={i}
                          controls
                          className="w-full rounded border mb-2 bg-black"
                        >
                          <source
                            src={absUrl(f.url)}
                            type={f.mime || "video/mp4"}
                          />
                        </video>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mark Complete CTA */}
          {summary.modules.length > 0 && (
            <button
              onClick={markComplete}
              className="mt-5 px-4 py-2 rounded bg-amber-500 text-white"
            >
              Mark Complete
            </button>
          )}
        </div>
      )}

      {/* -------- Progress (placeholder) -------- */}
      {tab === "progress" && (
        <div className="rounded-xl border bg-white p-3 text-sm text-gray-600">
          Your progress will appear here once completion data grows.
        </div>
      )}
    </div>
  );
}
