import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJSON } from "../../utils/api";

/** IMPORTANT: we only need the API origin (without trailing /api) to absolutize /api/files URLs */
const API_BASE = import.meta.env.VITE_API_URL || "/api";
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");
const absUrl = (u) => (!u ? "" : /^https?:/i.test(u) ? u : API_ORIGIN + u);

export default function PrepWizard() {
  const params = useParams();
  const examSlug = decodeURIComponent(params.examId || params.slug || "");
  const [summary, setSummary] = useState({ todayDay: 1, planDays: 1, modules: [] });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      // NOTE: email is optional; public view works without it
      const r = await getJSON(`/api/prep/user/summary?examId=${encodeURIComponent(examSlug)}`);
      setSummary(r);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [examSlug]);

  const { released, later } = useMemo(() => {
    const now = Date.now();
    const items = (summary.modules || []).slice().sort(sortByTimeThenTitle);
    const rel = [];
    const lat = [];
    for (const m of items) {
      const t = m.releaseAt ? Date.parse(m.releaseAt) : 0;
      // treat status:released OR past releaseAt as available
      if (m.status === "released" || !t || t <= now) rel.push(m);
      else lat.push(m);
    }
    return { released: rel, later: lat };
  }, [summary]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link to="/prep" className="text-blue-600 hover:underline">← Back</Link>
        <span className="mx-1">/</span>
        <span className="uppercase tracking-wide">{examSlug}</span>
      </div>

      <h1 className="text-xl font-semibold">{examSlug.replace(/_/g," ")}</h1>
      <p className="text-sm text-gray-500 -mt-1 mb-4">Day {summary.todayDay}</p>

      {/* Mini day tiles (visual polish) */}
      <DayTiles current={summary.todayDay} total={summary.planDays} />

      {later.length > 0 && (
        <div className="my-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm">
          <div className="font-medium mb-1">Coming later today:</div>
          <ul className="list-disc ml-5 space-y-0.5">
            {later.map((m) => (
              <li key={m._id}>
                <span className="font-semibold">{m.title || "Untitled"}</span>
                {" — "}
                <TimeBadge module={m} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading && <div className="text-gray-500">Loading…</div>}

      {released.map((m) => (
        <ModuleCard key={m._id} module={m} />
      ))}

      {!loading && released.length === 0 && (
        <div className="text-gray-500">No modules for today yet.</div>
      )}
    </div>
  );
}

/* ---------- UI bits ---------- */

function sortByTimeThenTitle(a, b) {
  const ta = a.releaseAt ? Date.parse(a.releaseAt) : 0;
  const tb = b.releaseAt ? Date.parse(b.releaseAt) : 0;
  if (ta !== tb) return ta - tb;
  const sa = (a.title || "").toLowerCase();
  const sb = (b.title || "").toLowerCase();
  return sa.localeCompare(sb);
}

function TimeBadge({ module: m }) {
  if (m.releaseAt) {
    const d = new Date(m.releaseAt);
    return <span className="inline-flex items-center gap-1 text-xs text-gray-500">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs text-gray-500">{(m.slotMin || 0).toString().padStart(2,"0")} min</span>;
}

function DayTiles({ current = 1, total = 30 }) {
  const days = Array.from({ length: total || 1 }, (_, i) => i + 1);
  return (
    <div className="mb-4">
      <div className="text-sm text-gray-500 mb-1">Calendar</div>
      <div className="flex flex-wrap gap-2">
        {days.map((d) => (
          <div
            key={d}
            className={`w-10 h-10 rounded-lg grid place-items-center border text-sm transition
              ${d === current ? "bg-amber-100 border-amber-300 ring-2 ring-amber-400 animate-pulse" : "bg-white border-gray-200"}`}
            title={`Day ${d}`}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ module: m }) {
  const [open, setOpen] = useState(true); // open by default; collapse to save space

  const files = m.files || [];
  const images = files.filter((f) => f.kind === "image");
  const pdf = files.find((f) => f.kind === "pdf");
  const audio = files.find((f) => f.kind === "audio");
  const video = files.find((f) => f.kind === "video");

  // Prefer manual text, else OCR text
  const text = (m.content && m.content.trim()) || (m.ocrText && m.ocrText.trim()) || "";

  const canShowOriginal = !!m.flags?.showOriginal; // admin toggle
  const hasMedia = (canShowOriginal && (images.length || pdf || video)) || audio;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="font-medium">{m.title || "Untitled"}</div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            <TimeBadge module={m} />
          </span>
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs text-gray-600 border rounded px-2 py-0.5 hover:bg-gray-100"
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-3">
          {/* IMAGES (horizontal gallery) */}
          {canShowOriginal && images.length > 0 && (
            <div className="overflow-x-auto whitespace-nowrap no-scrollbar -mx-1">
              {images.map((f, i) => (
                <img
                  key={i}
                  src={absUrl(f.url)}
                  className="inline-block m-1 h-44 rounded-lg shadow border"
                  alt={`image-${i + 1}`}
                  loading="lazy"
                />
              ))}
            </div>
          )}

          {/* PDF link (respect showOriginal) */}
          {canShowOriginal && pdf && (
            <div>
              <a
                href={absUrl(pdf.url)}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 text-sm underline"
              >
                Open PDF
              </a>
            </div>
          )}

          {/* VIDEO */}
          {canShowOriginal && video && (
            <video src={absUrl(video.url)} controls className="w-full rounded-lg border" />
          )}

          {/* TEXT (manual or OCR) */}
          {text && (
            <div className="bg-amber-50 rounded-lg border border-amber-100 p-3 max-h-64 overflow-y-auto leading-relaxed">
              <pre className="whitespace-pre-wrap font-[ui-monospace] text-[13px]">{text}</pre>
            </div>
          )}

          {/* AUDIO (independent of showOriginal – always safe to play) */}
          {audio && (
            <audio controls className="w-full">
              <source src={absUrl(audio.url)} type={audio.mime || "audio/mpeg"} />
              Your browser does not support the audio element.
            </audio>
          )}
        </div>
      )}
    </div>
  );
}
