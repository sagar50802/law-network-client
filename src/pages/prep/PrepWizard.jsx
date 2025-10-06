import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON, absUrl } from "../../utils/api";

/**
 * Route shape assumed: /prep/:examId  (e.g. /prep/up%20apo)
 * We'll read :examId from location.
 */
function readExamId() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const i = parts.findIndex((p) => p === "prep");
  const slug = i >= 0 && parts[i + 1] ? decodeURIComponent(parts[i + 1]) : "";
  return slug;
}

function nowUtcMs() {
  return Date.now();
}

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function ModuleCard({ mod }) {
  const [open, setOpen] = useState(true);

  const files = mod.files || [];
  const images = files.filter((f) => (f.kind || "").toLowerCase() === "image");
  const pdfs   = files.filter((f) => (f.kind || "").toLowerCase() === "pdf");
  const audios = files.filter((f) => (f.kind || "").toLowerCase() === "audio");
  const videos = files.filter((f) => (f.kind || "").toLowerCase() === "video");

  const flags = mod.flags || {};
  const showImages = images.length && (!flags.extractOCR || flags.showOriginal);
  const showPDF    = pdfs.length   && (flags.showOriginal ?? true); // default show
  const showAudio  = audios.length;
  const showVideo  = videos.length;

  const textBlock =
    (mod.content && String(mod.content).trim()) ||
    (mod.manualText && String(mod.manualText).trim()) ||
    (mod.ocrText && String(mod.ocrText).trim()) ||
    "";

  return (
    <div className="rounded-lg border bg-white mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <div className="font-medium">
          {mod.title || "Untitled"}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {mod.releaseAt && <span>{fmtTime(mod.releaseAt)}</span>}
          <button
            onClick={() => setOpen((o) => !o)}
            className="px-2 py-0.5 rounded border"
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {!open ? null : (
        <div className="p-3 grid gap-3">
          {/* Images gallery */}
          {showImages ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {images.map((im, i) => (
                <img
                  key={i}
                  loading="lazy"
                  src={absUrl(im.url)}
                  alt={`img-${i}`}
                  className="w-full rounded shadow"
                />
              ))}
            </div>
          ) : null}

          {/* Text area (manual / OCR) */}
          {textBlock ? (
            <div
              className="rounded border bg-yellow-50 p-3"
              style={{ maxHeight: 360, overflowY: "auto" }}
            >
              <pre className="whitespace-pre-wrap font-[ui-sans-serif] leading-6 text-[0.95rem]">
                {textBlock}
              </pre>
            </div>
          ) : null}

          {/* PDF(s) */}
          {showPDF ? (
            <div className="grid gap-2">
              {pdfs.map((p, i) => (
                <a
                  key={i}
                  href={absUrl(p.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline text-blue-600"
                >
                  Open PDF {i + 1}
                </a>
              ))}
            </div>
          ) : null}

          {/* Audio */}
          {showAudio ? (
            <div className="grid gap-2">
              {audios.map((a, i) => (
                <audio
                  key={i}
                  controls
                  preload="none"
                  src={absUrl(a.url)}
                  className="w-full"
                />
              ))}
            </div>
          ) : null}

          {/* Video */}
          {showVideo ? (
            <div className="grid gap-2">
              {videos.map((v, i) => (
                <video
                  key={i}
                  controls
                  preload="metadata"
                  src={absUrl(v.url)}
                  className="w-full rounded"
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ComingLater({ modules }) {
  const later = useMemo(() => {
    const now = nowUtcMs();
    return (modules || [])
      .filter((m) => m.releaseAt && Date.parse(m.releaseAt) > now)
      .sort((a, b) => Date.parse(a.releaseAt) - Date.parse(b.releaseAt));
  }, [modules]);

  if (!later.length) return null;

  return (
    <div className="text-sm text-gray-600 mb-3">
      <div className="font-medium mb-1">Coming later today:</div>
      <ul className="list-disc ml-5">
        {later.map((m) => (
          <li key={m._id}>
            {m.title || "Untitled"} — {fmtTime(m.releaseAt)}{" "}
            {m.flags?.extractOCR && !m.flags?.showOriginal ? "(text only)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PrepWizard() {
  const examId = readExamId();
  const [tab, setTab] = useState(() => new URLSearchParams(location.search).get("tab") || "today");
  const [loading, setLoading] = useState(false);
  const [todayDay, setTodayDay] = useState(1);
  const [planDays, setPlanDays] = useState(1);
  const [modules, setModules] = useState([]);

  // optional email (if your site stores it for progress API)
  const email = localStorage.getItem("userEmail") || "";

  async function load() {
    if (!examId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ examId });
      if (email) qs.set("email", email);
      const r = await getJSON(`/api/prep/user/summary?${qs.toString()}`);
      setTodayDay(r.todayDay || 1);
      setPlanDays(r.planDays || 1);
      setModules(Array.isArray(r.modules) ? r.modules : []);
    } catch (e) {
      console.error(e);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [examId]);

  // keep ?tab= in URL for consistency
  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.set("tab", tab);
    history.replaceState(null, "", u.toString());
  }, [tab]);

  async function markComplete() {
    try {
      if (!email) {
        alert("Progress marking needs an email in localStorage as 'userEmail'. Skipping call.");
        return;
      }
      await postJSON("/api/prep/user/complete", {
        examId,
        email,
        dayIndex: todayDay,
      });
      alert("Marked complete!");
      await load();
    } catch (e) {
      console.error(e);
      alert("Failed to mark complete");
    }
  }

  /* ---------- Tabs ---------- */

  const calendarTab = (
    <div className="max-w-3xl mx-auto">
      <div className="mb-3 text-sm text-gray-600">
        Current Day (cohort): <b>Day {todayDay}</b>
        <div className="text-xs">Only released & time-unlocked modules are available each day.</div>
      </div>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: planDays }, (_, i) => i + 1).map((d) => (
          <div
            key={d}
            title={`Day ${d}`}
            className={`w-20 h-24 rounded-lg border flex items-center justify-center text-lg select-none cursor-default ${
              d === todayDay ? "bg-amber-100 border-amber-300" : "bg-white"
            }`}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );

  const todayTab = (
    <div className="max-w-3xl mx-auto">
      <div className="text-lg font-semibold mb-1">{examId}</div>
      <div className="text-sm text-gray-600 mb-3">Day {todayDay}</div>

      <ComingLater modules={modules} />

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : !modules.length ? (
        <div className="text-gray-500">No modules for today yet.</div>
      ) : (
        modules
          .filter((m) => !m.releaseAt || Date.parse(m.releaseAt) <= nowUtcMs())
          .sort((a, b) => {
            const ta = a.releaseAt ? Date.parse(a.releaseAt) : 0;
            const tb = b.releaseAt ? Date.parse(b.releaseAt) : 0;
            return ta - tb;
          })
          .map((m) => <ModuleCard key={m._id} mod={m} />)
      )}

      <div className="mt-4">
        <button
          onClick={markComplete}
          className="px-4 py-2 rounded bg-amber-600 text-white"
        >
          Mark Complete
        </button>
        <div className="text-xs text-gray-500 mt-2">
          Plan days: {planDays} • Day {todayDay}
        </div>
      </div>
    </div>
  );

  const progressTab = (
    <div className="max-w-3xl mx-auto text-sm text-gray-600">
      <p>
        Progress view (lightweight). Use “Mark Complete” on Today’s Task to record completion
        for Day {todayDay}.
      </p>
      <p className="mt-2">
        <i>Tip:</i> If you want a detailed per-topic progress bar, we can add an endpoint that
        returns the user’s completed days/items and render it here.
      </p>
    </div>
  );

  return (
    <div className="px-4 pb-8">
      {/* Top nav */}
      <div className="max-w-3xl mx-auto flex items-center gap-2 mb-3">
        <button
          className={`px-3 py-1 rounded border ${tab === "calendar" ? "bg-black text-white" : ""}`}
          onClick={() => setTab("calendar")}
        >
          Calendar
        </button>
        <button
          className={`px-3 py-1 rounded border ${tab === "today" ? "bg-black text-white" : ""}`}
          onClick={() => setTab("today")}
        >
          Today’s Task
        </button>
        <button
          className={`px-3 py-1 rounded border ${tab === "progress" ? "bg-black text-white" : ""}`}
          onClick={() => setTab("progress")}
        >
          Progress
        </button>
      </div>

      {tab === "calendar" ? calendarTab : tab === "progress" ? progressTab : todayTab}
    </div>
  );
}
