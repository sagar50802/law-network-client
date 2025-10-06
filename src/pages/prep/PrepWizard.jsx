// client/src/pages/prep/PrepWizard.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON, absUrl } from "../../utils/api";
import { Card } from "../../components/ui/Card";
import { ImageScroller } from "../../components/ui/ImageScroller";

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

/* ---------------- helpers for midnight countdown + day chips ---------------- */

function useCountdownToMidnight() {
  const [left, setLeft] = useState(formatLeft());
  useEffect(() => {
    const t = setInterval(() => setLeft(formatLeft()), 1000);
    return () => clearInterval(t);
  }, []);
  function formatLeft() {
    const now = new Date();
    const mid = new Date(now);
    mid.setHours(24, 0, 0, 0);
    let ms = Math.max(0, mid - now);
    const h = String(Math.floor(ms / 3600000)).padStart(2, "0");
    ms %= 3600000;
    const m = String(Math.floor(ms / 60000)).padStart(2, "0");
    ms %= 60000;
    const s = String(Math.floor(ms / 1000)).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }
  return left;
}

function DayNav({ planDays, currentDay, activeDay, onPick }) {
  const total = Math.max(planDays || 1, currentDay || 1);
  return (
    <div className="flex gap-2 flex-wrap mb-3">
      {Array.from({ length: total }, (_, i) => i + 1).map((d) => (
        <button
          key={d}
          onClick={() => onPick(d)}
          className={[
            "px-3 py-1 rounded-full border text-sm",
            d === activeDay ? "bg-black text-white border-black" : "bg-white",
            d === currentDay ? "ring-2 ring-amber-400" : "",
          ].join(" ")}
          title={d === currentDay ? "Current day" : `Go to Day ${d}`}
        >
          Day {d}
        </button>
      ))}
    </div>
  );
}

function NextDayTeaser({ day }) {
  const left = useCountdownToMidnight();
  return (
    <div className="mt-6 p-4 border rounded-xl bg-amber-50">
      <div className="font-medium mb-1">Ready for Day {day} tasks</div>
      <div className="text-sm text-gray-700">
        Unlocks in <span className="font-mono">{left}</span>. Admin may add content before the
        unlock time.
      </div>
    </div>
  );
}

/* ------------------------ module + later components ------------------------ */

// --- Locked preview card (NO TIME SHOWN) ---
function LockedPreviewCard({ m }) {
  return (
    <div className="rounded-lg border p-3 bg-gray-50 relative overflow-hidden">
      <div className="absolute right-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
        Preview
      </div>

      <div className="font-medium mb-2">{m.title || "Untitled"}</div>

      {/* thumbnails (locked) */}
      {Array.isArray(m.images) && m.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {m.images.slice(0, 6).map((u, i) => (
            <div
              key={i}
              className="relative w-24 h-16 shrink-0 rounded overflow-hidden bg-gray-200"
              title="Locked until release"
            >
              <img src={absUrl(u)} alt="" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 grid place-items-center text-white/90 text-xs">
                🔒
              </div>
            </div>
          ))}
        </div>
      )}

      {/* short text teaser (no time) */}
      {m.content && (
        <p className="text-xs text-gray-600 italic line-clamp-3">
          Unlocks soon.
        </p>
      )}

      {/* audio/video preview (disabled look) */}
      {(m.audio || m.video) && (
        <div className="mt-2 text-xs text-gray-500">Media will unlock when available.</div>
      )}
    </div>
  );
}

// (kept for completeness; not changed)
function ModuleCard({ mod }) {
  const [open, setOpen] = useState(true);

  const files = mod.files || [];
  const images = files.filter((f) => (f.kind || "").toLowerCase() === "image");
  const pdfs = files.filter((f) => (f.kind || "").toLowerCase() === "pdf");
  const audios = files.filter((f) => (f.kind || "").toLowerCase() === "audio");
  const videos = files.filter((f) => (f.kind || "").toLowerCase() === "video");

  const flags = mod.flags || {};
  const showImages = images.length && (!flags.extractOCR || flags.showOriginal);
  const showPDF = pdfs.length && (flags.showOriginal ?? true); // default show
  const showAudio = audios.length;
  const showVideo = videos.length;

  const textBlock =
    (mod.content && String(mod.content).trim()) ||
    (mod.manualText && String(mod.manualText).trim()) ||
    (mod.ocrText && String(mod.ocrText).trim()) ||
    "";

  return (
    <div className="rounded-lg border bg-white mb-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <div className="font-medium">{mod.title || "Untitled"}</div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          {mod.releaseAt && <span>{fmtTime(mod.releaseAt)}</span>}
          <button onClick={() => setOpen((o) => !o)} className="px-2 py-0.5 rounded border">
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
            <div className="rounded border bg-yellow-50 p-3" style={{ maxHeight: 360, overflowY: "auto" }}>
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
                <audio key={i} controls preload="none" src={absUrl(a.url)} className="w-full" />
              ))}
            </div>
          ) : null}

          {/* Video */}
          {showVideo ? (
            <div className="grid gap-2">
              {videos.map((v, i) => (
                <video key={i} controls preload="metadata" src={absUrl(v.url)} className="w-full rounded" />
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

/* --------------------------- preview panel (no time) --------------------------- */

function PreviewPanel({ day, modules }) {
  if (!modules?.length) return null;

  // massage data so LockedPreviewCard can show thumbnails/content flags
  const previews = useMemo(
    () =>
      modules.map((m) => {
        const files = Array.isArray(m.files) ? m.files : [];
        const images = files.filter((f) => (f.kind || "").toLowerCase() === "image").map((f) => f.url);
        const audio = files.some((f) => (f.kind || "").toLowerCase() === "audio");
        const video = files.some((f) => (f.kind || "").toLowerCase() === "video");
        const content =
          (m.ocrText && String(m.ocrText).trim()) ||
          (m.text && String(m.text).trim()) ||
          (m.manualText && String(m.manualText).trim()) ||
          "";
        return { ...m, images, audio, video, content };
      }),
    [modules]
  );

  return (
    <div className="mt-6">
      <div className="mb-2 text-sm font-semibold">Preview — Day {day}</div>
      <div className="grid gap-3">
        {previews.map((pm) => (
          <LockedPreviewCard key={pm._id} m={pm} />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function PrepWizard() {
  const examId = readExamId();
  const [tab, setTab] = useState(() => new URLSearchParams(location.search).get("tab") || "today");
  const [loading, setLoading] = useState(false);

  // existing
  const [todayDay, setTodayDay] = useState(1);
  const [planDays, setPlanDays] = useState(1);
  const [modules, setModules] = useState([]);

  // NEW: for previewing any day
  const [allModules, setAllModules] = useState([]);

  // NEW (tiny UI states)
  const [currentDay, setCurrentDay] = useState(1);
  const [activeDay, setActiveDay] = useState(1);

  // optional email (if your site stores it for progress API)
  const email = localStorage.getItem("userEmail") || "";

  async function load() {
    if (!examId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ examId });
      if (email) qs.set("email", email);

      // fetch "today summary" and "all templates" for previews
      const [r, t] = await Promise.all([
        getJSON(`/api/prep/user/summary?${qs.toString()}`),
        getJSON(`/api/prep/templates?examId=${encodeURIComponent(examId)}`),
      ]);

      const td = r.todayDay || 1;
      const pd = r.planDays || 1;

      setTodayDay(td);
      setPlanDays(pd);
      setModules(Array.isArray(r.modules) ? r.modules : []);

      setAllModules(Array.isArray(t.items) ? t.items : []);

      // NEW: mirror “context” into UI chips
      setCurrentDay(td);
      setActiveDay(td);
    } catch (e) {
      console.error(e);
      setModules([]);
      setAllModules([]);
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

  // modules to preview for the currently selected calendar day (no time shown)
  const previewModulesForActiveDay = useMemo(() => {
    return (allModules || [])
      .filter((m) => Number(m.dayIndex) === Number(activeDay))
      .sort((a, b) => {
        const sa = Number(a.slotMin || 0) - Number(b.slotMin || 0);
        if (sa !== 0) return sa;
        const ra = a.releaseAt ? Date.parse(a.releaseAt) : 0;
        const rb = b.releaseAt ? Date.parse(b.releaseAt) : 0;
        return ra - rb;
      });
  }, [allModules, activeDay]);

  /* ---------- Tabs ---------- */

  const calendarTab = (
    <div className="max-w-3xl mx-auto">
      <div className="mb-3 text-sm text-gray-600">
        Current Day (cohort): <b>Day {todayDay}</b>
        <div className="text-xs">Only released & time-unlocked modules are available each day.</div>
      </div>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: planDays }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            onClick={() => setActiveDay(d)}
            title={`Day ${d}`}
            className={`w-20 h-24 rounded-lg border flex items-center justify-center text-lg select-none ${
              d === todayDay ? "bg-amber-100 border-amber-300" : "bg-white"
            } ${d === activeDay ? "ring-2 ring-black" : ""}`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Show preview only for non-today days (no time display) */}
      {activeDay !== currentDay && (
        <PreviewPanel day={activeDay} modules={previewModulesForActiveDay} />
      )}
    </div>
  );

  const todayTab = (
    <div className="max-w-3xl mx-auto">
      <div className="text-lg font-semibold mb-1">{examId}</div>
      <div className="text-sm text-gray-600 mb-3">Day {todayDay}</div>

      {/* day chips */}
      <DayNav
        planDays={planDays}
        currentDay={currentDay}
        activeDay={activeDay}
        onPick={(d) => {
          setActiveDay(d);
          if (d !== currentDay) setTab("calendar"); // gently guide to calendar if they tap future day
        }}
      />

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
          .map((m) => {
            // minimal: presentational wrapper + scroller
            const imageUrls =
              m.images ||
              (m.files || [])
                .filter((f) => (f.kind || "").toLowerCase() === "image")
                .map((f) => absUrl(f.url));

            const content =
              m.content ??
              (m.ocrText && String(m.ocrText).trim()) ??
              (m.text && String(m.text).trim()) ??
              (m.manualText && String(m.manualText).trim()) ??
              null;

            const audioUrl =
              m.audio ||
              (m.files || []).find((f) => (f.kind || "").toLowerCase() === "audio")?.url;

            const pdfUrl =
              m.pdf ||
              (m.files || []).find((f) => (f.kind || "").toLowerCase() === "pdf")?.url;

            return (
              <Card key={m._id} title={m.title || "Untitled"} footer={null}>
                {/* IMAGES */}
                <ImageScroller images={imageUrls} />

                {/* OCR / Manual Text */}
                {content && (
                  <div className="ocr-box" style={{ marginTop: 12 }}>
                    {content}
                  </div>
                )}

                {/* AUDIO */}
                {(audioUrl || (m.files || []).some((f) => (f.kind || "").toLowerCase() === "audio")) && (
                  <div style={{ marginTop: 10 }}>
                    <audio
                      controls
                      src={audioUrl ? absUrl(audioUrl) : undefined}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}

                {/* (Optional) PDF link */}
                {(pdfUrl || (m.files || []).some((f) => (f.kind || "").toLowerCase() === "pdf")) && (
                  <div style={{ marginTop: 10 }}>
                    <a
                      className="badge"
                      href={pdfUrl ? absUrl(pdfUrl) : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open PDF
                    </a>
                  </div>
                )}
              </Card>
            );
          })
      )}

      <div className="mt-4">
        <button onClick={markComplete} className="px-4 py-2 rounded bg-amber-600 text-white">
          Mark Complete
        </button>
        <div className="text-xs text-gray-500 mt-2">
          Plan days: {planDays} • Day {todayDay}
        </div>
      </div>

      {currentDay < planDays && <NextDayTeaser day={currentDay + 1} />}
    </div>
  );

  const progressTab = (
    <div className="max-w-3xl mx-auto text-sm text-gray-600">
      <p>
        Progress view (lightweight). Use “Mark Complete” on Today’s Task to record completion for
        Day {todayDay}.
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
