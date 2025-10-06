// client/src/pages/prep/PrepExam.jsx  (or PrepWizard.jsx)
import { useEffect, useMemo, useState } from "react";
import { getJSON } from "../../utils/api";
import { absUrl } from "../../utils/api";

export default function PrepExam({ examId: propExamId }) {
  // if you already read examId from router, keep that – this prop is just for clarity
  const examId = propExamId || decodeURIComponent(location.pathname.split("/prep/")[1] || "");
  const [data, setData] = useState({ todayDay: 1, planDays: 1, modules: [] });

  async function load() {
    const r = await getJSON(`/api/prep/user/summary?examId=${encodeURIComponent(examId)}`);
    setData(r || { todayDay: 1, planDays: 1, modules: [] });
  }
  useEffect(() => { load(); }, [examId]);

  const now = Date.now();
  const modules = (data.modules || []).slice().sort((a,b) => (a.slotMin||0) - (b.slotMin||0));

  const unlocked = modules.filter(m => m.status === "released" && (!m.releaseAt || Date.parse(m.releaseAt) <= now));
  const later    = modules.filter(m => m.releaseAt && Date.parse(m.releaseAt) > now);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="text-lg font-semibold mb-1">{examId.replace(/_/g," ").toLowerCase()}</div>
      <div className="text-sm text-gray-500 mb-4">Day {data.todayDay}</div>

      {!!later.length && (
        <div className="text-sm text-gray-600 mb-4">
          <div className="font-medium mb-1">Coming later today:</div>
          <ul className="list-disc pl-5">
            {later.map(m => (
              <li key={m._id}>
                {m.title || "Untitled"} — {fmtTime(m)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!unlocked.length && <div className="text-gray-500">No modules for today yet.</div>}

      <div className="space-y-4">
        {unlocked.map(m => <ModuleCard key={m._id} m={m} />)}
      </div>
    </div>
  );
}

function fmtTime(m) {
  // Prefer server releaseAt if present; else interpret slotMin as minutes from 9:00 AM local
  if (m.releaseAt) {
    const d = new Date(m.releaseAt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const baseH = 9;
  const mins = Number(m.slotMin || 0);
  const h = baseH + Math.floor(mins/60);
  const mm = mins % 60;
  const d = new Date(); d.setHours(h, mm, 0, 0);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ModuleCard({ m }) {
  const [open, setOpen] = useState(true);

  const media = useMemo(() => {
    const files = m.files || [];
    const pick  = (k) => files.filter(f => f.kind === k);
    return {
      images: pick("image"),
      pdfs:   pick("pdf"),
      audio:  pick("audio")[0] || null,
      video:  pick("video")[0] || null,
    };
  }, [m.files]);

  // Manual text first, then OCR, then description fallback
  const text =
    m.textManual || m.manualText || m.text || m.description || m.ocrText || "";

  return (
    <div className="rounded-xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="font-semibold">{m.title || "Untitled"}</div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{fmtTime(m)}</span>
          <span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Images – horizontal scroll */}
          {!!media.images.length && (
            <div className="flex gap-3 overflow-x-auto snap-x">
              {media.images.map((img, i) => (
                <img
                  key={i}
                  src={absUrl(img.url || img)}
                  className="min-w-[240px] max-h-64 object-contain rounded shadow snap-start"
                  alt=""
                  loading="lazy"
                />
              ))}
            </div>
          )}

          {/* Manual/Extracted text – scrollable box */}
          {!!text && (
            <div
              className="rounded-lg border bg-amber-50 p-3"
              style={{ maxHeight: 320, overflowY: "auto", whiteSpace: "pre-wrap" }}
            >
              {text}
            </div>
          )}

          {/* PDF link(s) – respect showOriginal/allowDownload */}
          {!!media.pdfs.length && m.flags?.showOriginal && (
            <div className="flex flex-wrap gap-2">
              {media.pdfs.map((p, i) => (
                <a
                  key={i}
                  href={absUrl(p.url || p)}
                  target="_blank"
                  rel="noreferrer"
                  download={m.flags?.allowDownload || undefined}
                  className="px-3 py-1.5 rounded border hover:bg-gray-50 text-sm"
                >
                  Open PDF {media.pdfs.length > 1 ? `#${i+1}` : ""}
                </a>
              ))}
            </div>
          )}

          {/* Audio */}
          {media.audio && (
            <audio controls className="w-full">
              <source src={absUrl(media.audio.url)} type={media.audio.mime || "audio/mpeg"} />
            </audio>
          )}

          {/* Video */}
          {media.video && (
            <video
              controls
              className="w-full rounded-lg"
              src={absUrl(media.video.url)}
            />
          )}
        </div>
      )}
    </div>
  );
}
