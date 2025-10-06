// client/src/pages/prep/PrepWizard.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJSON, postJSON, absUrl } from "../../utils/api";

/* ---------- helpers ---------- */

function splitFiles(files = []) {
  return {
    images: files.filter((f) => f?.kind === "image" && f?.url),
    pdf: files.find((f) => f?.kind === "pdf" && f?.url) || null,
    audio: files.find((f) => f?.kind === "audio" && f?.url) || null,
    video: files.find((f) => f?.kind === "video" && f?.url) || null,
  };
}

// originals visible if OCR is off, or OCR is on but admin allowed originals
function shouldShowOriginal(flags = {}) {
  return !flags?.extractOCR || !!flags?.showOriginal;
}

function timeBadge(m) {
  if (m?.releaseAt) {
    const d = new Date(m.releaseAt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return `${m?.slotMin ?? 0}m`;
}

/* ---------- subcomponents ---------- */

function ModuleAttachments({ module }) {
  const { files = [], flags = {} } = module || {};
  const { images, pdf, audio, video } = splitFiles(files);
  const showOriginals = shouldShowOriginal(flags);

  return (
    <>
      {showOriginals && images.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Images</div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {images.map((f, i) => (
              <img
                key={i}
                src={absUrl(f.url)}
                alt={`image ${i + 1}`}
                loading="lazy"
                className="h-48 rounded-lg shadow border"
              />
            ))}
          </div>
        </div>
      )}

      {showOriginals && pdf && (
        <div className="mt-3">
          <a
            href={absUrl(pdf.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded border hover:bg-gray-50"
          >
            📝 Open PDF
          </a>
        </div>
      )}

      {audio && (
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Audio</div>
          <audio controls preload="metadata" src={absUrl(audio.url)} className="w-full" />
        </div>
      )}

      {video && (
        <div className="mt-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Video</div>
          <video
            controls
            playsInline
            preload="metadata"
            src={absUrl(video.url)}
            className="w-full max-h-[360px] rounded border"
          />
        </div>
      )}
    </>
  );
}

function ModuleCard({ module }) {
  const [open, setOpen] = useState(true);
  const flags = module?.flags || {};
  const hasManual = !!(module?.content && String(module.content).trim());
  const showText = hasManual || (flags.extractOCR && module?.ocrText);

  const bg = flags?.background?.trim() || "#fff9e7";

  return (
    <div className="rounded-lg border shadow-sm mb-5 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <div className="font-semibold">
          {module?.title || "Untitled"}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500">{timeBadge(module)}</div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open && (
        <div className="p-3">
          {/* attachments first (images/pdf/audio/video) */}
          <ModuleAttachments module={module} />

          {/* text block */}
          {showText && (
            <div className="mt-3 relative">
              <div className="text-xs font-medium text-gray-600 mb-1">
                {hasManual ? "Text" : "Text (Auto extract)"}
              </div>
              <div
                className="rounded-lg p-3 border"
                style={{ background: bg }}
              >
                <div
                  className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed"
                  style={{ fontFamily: "ui-rounded, system-ui, -apple-system, Segoe UI, Roboto, 'Patrick Hand', cursive" }}
                >
                  {hasManual ? module.content : module.ocrText}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- main page ---------- */

export default function PrepWizard() {
  const params = useParams(); // expects route like /prep/:examId
  const examId = decodeURIComponent(params?.examId || "");
  const [todayDay, setTodayDay] = useState(1);
  const [planDays, setPlanDays] = useState(1);
  const [modules, setModules] = useState([]);
  const [busy, setBusy] = useState(false);

  // basic user identity for /complete; you can change this to your auth
  const emailFromQS = new URLSearchParams(window.location.search).get("email");
  const email =
    emailFromQS ||
    localStorage.getItem("userEmail") ||
    localStorage.getItem("ownerEmail") ||
    ""; // owner fallback for your admin session

  async function load() {
    const q = new URLSearchParams();
    q.set("examId", examId);
    if (email) q.set("email", email);
    const r = await getJSON(`/api/prep/user/summary?${q.toString()}`);
    setTodayDay(r.todayDay || 1);
    setPlanDays(r.planDays || 1);
    setModules(r.modules || []);
  }

  useEffect(() => {
    if (examId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const released = useMemo(() => {
    const now = Date.now();
    return (modules || []).filter((m) =>
      m.status === "released" ? true : m.releaseAt ? Date.parse(m.releaseAt) <= now : true
    );
  }, [modules]);

  const comingLater = useMemo(() => {
    const now = Date.now();
    return (modules || [])
      .filter((m) =>
        m.status === "scheduled" ? true : m.releaseAt ? Date.parse(m.releaseAt) > now : false
      )
      .sort((a, b) => (Date.parse(a.releaseAt || 0) - Date.parse(b.releaseAt || 0)));
  }, [modules]);

  async function markComplete() {
    if (!email) {
      alert("Please login first.");
      return;
    }
    setBusy(true);
    try {
      await postJSON("/api/prep/user/complete", {
        examId,
        email,
        dayIndex: todayDay,
      });
      alert("Marked complete!");
    } catch (e) {
      console.error(e);
      alert("Could not mark complete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <Link to="/prep" className="text-sm text-blue-600">&larr; Back</Link>
          <div className="text-xl font-semibold mt-1">{examId.toLowerCase()}</div>
          <div className="text-xs text-gray-500">Day {todayDay}</div>
        </div>
        <div className="flex gap-2">
          <Link to={`/prep/${encodeURIComponent(examId)}`} className="px-2 py-1 text-sm rounded border bg-white">
            Calendar
          </Link>
          <button className="px-2 py-1 text-sm rounded border bg-black text-white">
            Today’s Task
          </button>
          <Link to={`/prep/${encodeURIComponent(examId)}?tab=progress`} className="px-2 py-1 text-sm rounded border bg-white">
            Progress
          </Link>
        </div>
      </div>

      {/* Coming later (today) */}
      {comingLater.length > 0 && (
        <div className="mb-4 text-sm text-gray-600">
          <div className="font-medium mb-1">Coming later today:</div>
          <ul className="list-disc ml-5">
            {comingLater.map((m) => (
              <li key={m._id}>
                {m.title || "Untitled"} —{" "}
                {m.releaseAt
                  ? new Date(m.releaseAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "time TBA"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Released modules list */}
      <div className="mt-2">
        {released.length === 0 && (
          <div className="text-gray-500 text-sm">No modules for today yet.</div>
        )}
        {released.map((m) => (
          <ModuleCard key={m._id} module={m} />
        ))}
      </div>

      {/* Mark complete */}
      <div className="mt-4">
        <button
          disabled={busy}
          onClick={markComplete}
          className="px-4 py-2 rounded bg-amber-600 text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Mark Complete"}
        </button>
      </div>

      {/* tiny footer */}
      <div className="text-xs text-gray-400 mt-6">
        Plan days: {planDays} • Day {todayDay}
      </div>
    </div>
  );
}
