// client/src/pages/prep/PrepWizard.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON, absUrl } from "../../utils/api";
import { ImageScroller } from "../../components/ui/ImageScroller";
import PrepAccessOverlay from "../../components/Prep/PrepAccessOverlay.jsx";

/**
 * Route shape assumed: /prep/:examId
 */
function readExamId() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const i = parts.findIndex((p) => p === "prep");
  const slug = i >= 0 && parts[i + 1] ? decodeURIComponent(parts[i + 1]) : "";
  return slug;
}

/** canonical form some admins use: spaces → "_", uppercase */
function toExamKey(slug = "") {
  return String(slug).replace(/\s+/g, "_").toUpperCase();
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

/* ---------------- attachment normalization (new + legacy shapes) ---------------- */

function pick(kind, m) {
  const out = [];

  // modern files[] (robust + ID fallback)
  if (Array.isArray(m?.files)) {
    for (const f of m.files) {
      if (!f) continue;

      const mime = (f.mime || f.mimetype || f.contentType || "").toLowerCase();
      const byMime = mime.split("/")[0];
      const k = (f.kind || byMime || "").toLowerCase();

      const isImg = kind === "image" && (k === "image" || mime.startsWith("image/"));
      const isAud = kind === "audio" && (k === "audio" || mime.startsWith("audio/"));
      const isVid = kind === "video" && (k === "video" || mime.startsWith("video/"));
      const isPdf = kind === "pdf" && (k === "pdf" || mime === "application/pdf");

      if (isImg || isAud || isVid || isPdf) {
        const raw = f.url || f.path || (f._id ? `/api/files/prep/${f._id}` : "");
        if (raw) out.push({ url: raw, kind: k || kind, mime, name: f.name });
      }
    }
  }

  // legacy arrays/singles
  if (kind === "image" && Array.isArray(m?.images)) m.images.forEach((u) => out.push({ url: u, kind: "image" }));
  if (kind === "audio" && m?.audio)
    out.push(typeof m.audio === "string" ? { url: m.audio, kind: "audio" } : { ...m.audio, kind: "audio" });
  if (kind === "video" && m?.video)
    out.push(typeof m.video === "string" ? { url: m.video, kind: "video" } : { ...m.video, kind: "video" });
  if (kind === "pdf" && m?.pdf)
    out.push(typeof m.pdf === "string" ? { url: m.pdf, kind: "pdf" } : { ...m.pdf, kind: "pdf" });

  // de-dupe
  const seen = new Set();
  return out.filter((x) => {
    const key = x.url || "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* --------------- prefer a non-empty text field across all shapes --------------- */
function textOf(m) {
  const candidates = [m?.content, m?.ocrText, m?.text, m?.manualText, m?.description];
  for (const s of candidates) {
    if (typeof s === "string" && s.trim()) return s.trim();
  }
  return "";
}

/* ====================== Colorful Notes (sentences + words) ====================== */
/* Balanced opacity so notebook lines & paper stay visible */

const IMPORTANT = [
  /constitution/i,
  /fundamental rights?/i,
  /directive principles?/i,
  /preamble/i,
  /parliament/i,
  /judiciary/i,
  /executive/i,
  /federal/i,
  /governance/i,
  /independence/i,
  /reform/i,
  /democracy/i,
  /election/i,
  /econom(y|ic)/i,
  /industrial/i,
  /revolution/i,
  /agricultur(e|al)/i,
  /rights?/i,
  /dut(y|ies)/i,
  /education/i,
  /health/i,
];

// deterministic 32-bit hash
function seed32(str = "") {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG
function rng(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// naive sentence split that keeps end punctuation
function splitSentences(text) {
  const m = text.match(/[^.!?]+[.!?]*/g);
  return m || [text];
}

const YEAR_RE = /\b(1[5-9]\d{2}|20\d{2}|2100)\b/;

// inline (word-level) highlighting — used when sentence isn't block styled
function renderInline(sentence, rand) {
  const parts = sentence.split(/(\b[\p{L}\p{N}']+\b)/u); // keep punctuation and spaces
  return parts.map((tok, i) => {
    if (!/\b[\p{L}\p{N}']+\b/u.test(tok)) return <span key={i}>{tok}</span>;

    // IMPORTANT → pink
    if (IMPORTANT.some((re) => re.test(tok))) {
      return (
        <mark key={i} style={{ backgroundColor: "rgba(255, 138, 168, 0.35)", borderRadius: 2 }}>
          {tok}
        </mark>
      );
    }

    // Years → yellow
    if (YEAR_RE.test(tok)) {
      return (
        <mark key={i} style={{ backgroundColor: "rgba(255, 242, 0, 0.35)", borderRadius: 2 }}>
          {tok}
        </mark>
      );
    }

    // sprinkle a few green notes (very low probability)
    if (rand() < 0.045) {
      return (
        <mark key={i} style={{ backgroundColor: "rgba(194, 255, 125, 0.35)", borderRadius: 2 }}>
          {tok}
        </mark>
      );
    }

    return <span key={i}>{tok}</span>;
  });
}

// decide per-sentence style (mutually exclusive) — tuned to be subtle but present
function chooseSentenceStyle(sentence, rand) {
  const words = sentence.trim().split(/\s+/).filter(Boolean).length;
  const isLong = words >= 18;

  // Balanced distribution: more long-sentence yellow; also blue/green blocks sprinkled
  const r = rand();
  if (isLong && r < 0.32) return "yellow"; // block highlight (frequent on long sentences)
  if (r < 0.18) return "underline"; // wavy underline
  if (r < 0.28) return "bluebold"; // bold blue
  if (r < 0.4) return "green"; // soft green block
  if (r < 0.52) return "blue"; // soft light-blue block
  return null;
}

// main renderer: paragraphs → sentences → styled spans
export function highlightNotes(raw, seedKey = "") {
  if (!raw) return null;
  const paras = String(raw).trim().split(/\n{2,}/);
  const baseSeed = seed32(seedKey + "|" + raw.length);
  const rand = rng(baseSeed);

  return paras.map((para, pi) => {
    const sentences = splitSentences(para);
    const nodes = sentences.map((s, si) => {
      const style = chooseSentenceStyle(s, rand);

      if (style === "yellow") {
        return (
          <mark
            key={si}
            style={{
              backgroundColor: "rgba(255, 255, 150, 0.26)",
              borderRadius: 6,
              display: "inline",
              padding: "0 2px",
              lineHeight: 1.6,
            }}
          >
            {s}
          </mark>
        );
      }
      if (style === "green") {
        return (
          <mark
            key={si}
            style={{
              backgroundColor: "rgba(160, 255, 160, 0.22)",
              borderRadius: 6,
              display: "inline",
              padding: "0 2px",
              lineHeight: 1.6,
            }}
          >
            {s}
          </mark>
        );
      }
      if (style === "blue") {
        return (
          <mark
            key={si}
            style={{
              backgroundColor: "rgba(173, 216, 255, 0.22)",
              borderRadius: 6,
              display: "inline",
              padding: "0 2px",
              lineHeight: 1.6,
            }}
          >
            {s}
          </mark>
        );
      }
      if (style === "underline") {
        return (
          <span
            key={si}
            style={{
              textDecorationLine: "underline",
              textDecorationStyle: "wavy",
              textDecorationColor: "rgba(255,170,0,0.5)",
              textDecorationThickness: "2px",
            }}
          >
            {renderInline(s, rand)}
          </span>
        );
      }
      if (style === "bluebold") {
        return (
          <span key={si} style={{ fontWeight: 600, color: "#1d4ed8" }}>
            {renderInline(s, rand)}
          </span>
        );
      }
      return <span key={si}>{renderInline(s, rand)}</span>;
    });

    return (
      <div key={pi} style={{ marginBottom: 6 }} className="last:mb-0">
        {nodes}
      </div>
    );
  });
}

/* ----------- Realistic notebook page ----------- */
export const linedPage = {
  backgroundImage: `
    linear-gradient(90deg, transparent 0, transparent 56px, rgba(214,28,28,0.95) 56px, rgba(214,28,28,0.95) 58px, transparent 58px),
    linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,0.96)),
    linear-gradient(to bottom, rgba(0, 92, 255, 0.14), rgba(0, 92, 255, 0.10)),
    repeating-linear-gradient(transparent, transparent 26px, rgba(0, 92, 255, 0.24) 27px, transparent 27px)
  `,
  backgroundBlendMode: "normal, lighten, normal, normal",
  backgroundSize: "100% 100%, 100% 100%, 100% 100%, 100% 27px",
  backgroundPosition: "0 0, 0 0, 0 0, 0 14px",
  backgroundColor: "#ffffff",
  border: "1px solid #dbe3f6",
  borderRadius: 12,
  padding: "14px 14px 14px 72px",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  boxShadow: "inset 0 0 8px rgba(0,0,0,0.03)",
};

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
        Unlocks in <span className="font-mono">{left}</span>. Admin may add content before the unlock time.
      </div>
    </div>
  );
}

/* ------------------------ fullscreen image viewer ------------------------ */

function FullscreenViewer({ urls, index, onClose }) {
  if (!urls?.length) return null;
  const src = urls[index] || urls[0];

  return (
    <div
      className="fixed inset-0 z-[9999] backdrop-blur-md bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      onContextMenu={(e) => e.preventDefault()}
    >
      <img
        src={src}
        alt=""
        className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain select-none"
        draggable={false}
      />
      <button
        className="absolute top-4 right-6 text-white text-2xl font-bold bg-black/50 rounded-full px-3 py-1"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

/* ------------------------ module + later components ------------------------ */

function LockedPreviewCard({ m }) {
  const imgs = pick("image", m);
  const hasAudio = pick("audio", m).length > 0;
  const hasVideo = pick("video", m).length > 0;

  return (
    <div className="rounded-lg border p-3 bg-gray-50 relative overflow-hidden">
      <div className="absolute right-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">Preview</div>

      <div className="font-medium mb-2">{m.title || "Untitled"}</div>

      {!!imgs.length && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {imgs.slice(0, 6).map((it, i) => {
            const u = absUrl(it.url || "");
            return (
              <div
                key={i}
                className="relative w-24 h-16 shrink-0 rounded overflow-hidden bg-gray-200"
                title="Locked until release"
              >
                <img src={u} alt="" className="w-full h-full object-cover opacity-60 select-none" draggable={false} />
                <div className="absolute inset-0 grid place-items-center text-white/90 text-xs">🔒</div>
              </div>
            );
          })}
        </div>
      )}

      {textOf(m) && <p className="text-xs text-gray-600 italic line-clamp-3">Unlocks soon.</p>}

      {(hasAudio || hasVideo) && (
        <div className="mt-2 text-xs text-gray-500">Media will unlock when available.</div>
      )}
    </div>
  );
}

/* --- Accordion-style module panel: IMAGES → TEXT → AUDIO → VIDEO → PDF --- */
function ModulePanel({ m, index }) {
  const [expanded, setExpanded] = useState(false);
  const [viewer, setViewer] = useState({ open: false, idx: 0 });

  const imgUrls = pick("image", m).map((it) => absUrl(it.url || ""));
  const audioUrl = pick("audio", m)[0]?.url;
  const videoUrl = pick("video", m)[0]?.url;
  const pdfUrl = pick("pdf", m)[0]?.url;

  const audioAbs = audioUrl ? absUrl(audioUrl) : "";
  the
  const videoAbs = videoUrl ? absUrl(videoUrl) : "";
  const pdfAbs = pdfUrl ? absUrl(pdfUrl) : "";

  const content = textOf(m);
  const isOCR = !!m?.ocrText && content === String(m.ocrText).trim();
  const doHighlight = m?.flags?.highlight !== false;
  const allowDownload = !!m?.flags?.allowDownload;

  function onImagesClick(e) {
    const target = e.target;
    if (!(target && target.tagName === "IMG")) return;
    const src = target.getAttribute("src");
    const idx = imgUrls.findIndex((u) => u === src);
    setViewer({ open: true, idx: Math.max(0, idx) });
  }

  const notebookPage = {
    ...linedPage,
    maxHeight: expanded ? "none" : 320,
    overflow: "auto",
    fontFamily:
      `"Patrick Hand", "KG Primary Penmanship", "Segoe Print", "Bradley Hand", system-ui, -apple-system, sans-serif`,
    fontSize: 16,
    color: "#111",
  };

  return (
    <details className="prep-card module" open={index === 0} style={{ marginBottom: 12 }}>
      <summary>
        <span style={{ fontWeight: 600 }}>{m.title || "Untitled"}</span>
        {isOCR && (
          <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 align-middle">
            OCR
          </span>
        )}
        <span className="chev">›</span>
      </summary>

      <div style={{ marginTop: 12 }}>
        {!!imgUrls.length && (
          <div
            className="mb-2"
            onClick={onImagesClick}
            onContextMenu={(e) => {
              if (!allowDownload) e.preventDefault();
            }}
          >
            <ImageScroller images={imgUrls} />
          </div>
        )}

        {content && (
          <>
            <div className="mt-3 ocr-box" style={notebookPage}>
              {doHighlight ? highlightNotes(content, m._id || m.title || "") : content}
            </div>
            <div className="mt-1">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50"
              >
                {expanded ? "Collapse text" : "Expand text"}
              </button>
            </div>
          </>
        )}

        {audioAbs && (
          <div style={{ marginTop: 12 }}>
            <audio
              controls
              src={audioAbs}
              style={{ width: "100%" }}
              controlsList={allowDownload ? undefined : "nodownload noplaybackrate"}
              onContextMenu={(e) => {
                if (!allowDownload) e.preventDefault();
              }}
            />
          </div>
        )}

        {videoAbs && (
          <div style={{ marginTop: 12 }}>
            <video
              controls
              src={videoAbs}
              style={{ width: "100%", borderRadius: 12 }}
              controlsList={allowDownload ? undefined : "nodownload noplaybackrate"}
              disablePictureInPicture={!allowDownload}
              onContextMenu={(e) => {
                if (!allowDownload) e.preventDefault();
              }}
            />
          </div>
        )}

        {pdfAbs && allowDownload && (
          <div style={{ marginTop: 10 }}>
            <a className="badge" href={pdfAbs} target="_blank" rel="noreferrer">
              Open PDF
            </a>
          </div>
        )}
      </div>

      {viewer.open && (
        <FullscreenViewer urls={imgUrls} index={viewer.idx} onClose={() => setViewer({ open: false, idx: 0 })} />
      )}
    </details>
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

function PreviewPanel({ day, modules }) {
  if (!modules?.length) return null;

  const previews = useMemo(
    () =>
      modules.map((m) => {
        const images = pick("image", m).map((it) => it.url || "");
        const hasAudio = pick("audio", m).length > 0;
        const hasVideo = pick("video", m).length > 0;
        const content = textOf(m);
        return { ...m, images, audio: hasAudio, video: hasVideo, content };
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
  const examSlug = readExamId(); // e.g. "up apo" or "UP_APO"
  const [apiExamId, setApiExamId] = useState(""); // chosen id actually used in API calls

  const [tab, setTab] = useState(() => new URLSearchParams(location.search).get("tab") || "today");
  const [loading, setLoading] = useState(false);

  const [todayDay, setTodayDay] = useState(1);
  const [planDays, setPlanDays] = useState(1);
  const [modules, setModules] = useState([]);

  const [allModules, setAllModules] = useState([]);
  const [todayPool, setTodayPool] = useState([]);

  const [currentDay, setCurrentDay] = useState(1);
  const [activeDay, setActiveDay] = useState(1);

  const email = localStorage.getItem("userEmail") || "";

  // Try BOTH ids and pick the one that actually has templates
  async function load() {
    const candidates = Array.from(new Set([examSlug, toExamKey(examSlug)].filter(Boolean)));
    if (!candidates.length) return;

    setLoading(true);
    try {
      // fetch templates for all candidates to decide
      const templateResults = await Promise.all(
        candidates.map((id) =>
          getJSON(`/api/prep/templates?examId=${encodeURIComponent(id)}`).catch(() => ({ items: [] }))
        )
      );

      // choose the id that returned the most items (fallback to first)
      let choiceIndex = 0;
      let maxItems = -1;
      templateResults.forEach((res, idx) => {
        const count = Array.isArray(res?.items) ? res.items.length : 0;
        if (count > maxItems) {
          maxItems = count;
          choiceIndex = idx;
        }
      });

      const chosenId = candidates[choiceIndex];
      setApiExamId(chosenId);

      const all = Array.isArray(templateResults[choiceIndex]?.items) ? templateResults[choiceIndex].items : [];

      // fetch meta + "today" for chosen id
      const qs = new URLSearchParams({ examId: chosenId });
      if (email) qs.set("email", email);

      const [metaRes, todayRes] = await Promise.allSettled([
        getJSON(`/api/prep/user/summary?${qs.toString()}`),
        getJSON(
          `/api/prep/user/today?examId=${encodeURIComponent(chosenId)}${email ? `&email=${encodeURIComponent(email)}` : ""}`
        ),
      ]);

      const meta = metaRes.status === "fulfilled" ? metaRes.value : {};
      const td = meta.todayDay || 1;
      const pd = meta.planDays || 1;
      setTodayDay(td);
      setPlanDays(pd);

      let fullToday = [];
      if (todayRes.status === "fulfilled" && Array.isArray(todayRes.value?.items)) {
        fullToday = todayRes.value.items;
      } else {
        fullToday = all.filter((m) => Number(m.dayIndex) === Number(td));
      }

      setTodayPool(fullToday);

      const now = Date.now();
      const releasedToday = fullToday
        .filter((m) => !m.releaseAt || Date.parse(m.releaseAt) <= now || m.status === "released")
        .sort((a, b) => {
          const ta = a.releaseAt ? Date.parse(a.releaseAt) : 0;
          const tb = b.releaseAt ? Date.parse(b.releaseAt) : 0;
          return ta - tb;
        });

      setModules(releasedToday);
      setAllModules(all);
      setCurrentDay(td);
      setActiveDay(td);
    } catch (e) {
      console.error(e);
      setModules([]);
      setAllModules([]);
      setTodayPool([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examSlug]);

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
        examId: apiExamId || examSlug,
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

  const releasedModules = useMemo(() => {
    const list = (modules || [])
      .filter((m) => !m.releaseAt || Date.parse(m.releaseAt) <= nowUtcMs() || m.status === "released")
      .sort((a, b) => {
        const ta = a.releaseAt ? Date.parse(a.releaseAt) : 0;
        const tb = b.releaseAt ? Date.parse(b.releaseAt) : 0;
        return ta - tb;
      })
      .map((m) => ({
        ...m,
        content: textOf(m),
      }));
    return list;
  }, [modules]);

  /* ---------- Tabs ---------- */

  const cohortDay = todayDay;
  const userStates = undefined;

  const calendarTab = (
    <div style={{ marginTop: 16 }}>
      <div className="text-sm text-gray-500">
        Current Day (cohort): <b>Day {cohortDay}</b>
      </div>

      {(() => {
        const sourceMods = (allModules && allModules.length) ? allModules : modules;

        const byDay = new Map();
        (sourceMods || []).forEach((m) => {
          const d = Number(m.dayIndex) || 1;
          if (!byDay.has(d)) byDay.set(d, []);
          byDay.get(d).push(m);
        });

        const maxPlanned = Math.max(...Array.from(byDay.keys(), (d) => +d || 1), 1);
        const last = Math.max(maxPlanned, cohortDay + 6, 21);

        const isDone = (m, userStatesMap) => {
          const s = userStatesMap?.[m._id];
          return s === true || s?.done === true;
        };

        const cells = [];
        for (let d = 1; d <= last; d++) {
          const items = byDay.get(d) || [];
          const released = items.filter(
            (x) => x.status === "released" || !x.releaseAt || Date.parse(x.releaseAt) <= Date.now()
          );
          const anyReleased = released.length > 0;

          let cls = "daycell";
          let badge = "";
          if (d > cohortDay) {
            cls += " locked";
            badge = "🔒";
          } else if (d === cohortDay) {
            cls += " today";
            const allDone = released.length && released.every((m) => isDone(m, userStates));
            if (allDone) badge = "✅";
            else if (released.length) badge = "●";
          } else {
            const allDone = released.length && released.every((m) => isDone(m, userStates));
            if (allDone) {
              cls += " completed";
              badge = "✅";
            } else if (anyReleased) {
              cls += " available";
              badge = "●";
            } else {
              cls += " locked";
              badge = "—";
            }
          }

          const href = d <= cohortDay ? `?tab=today&d=${d}` : undefined;

          cells.push(
            href ? (
              <a
                key={d}
                className={cls}
                href={href}
                title={`Day ${d}`}
                onClick={(e) => {
                  e.preventDefault();
                  setTab("today");
                }}
              >
                <span>{d}</span>
                {badge && <span className="badge">{badge}</span>}
              </a>
            ) : (
              <div key={d} className={cls} title={`Day ${d}`}>
                <span>{d}</span>
                {badge && <span className="badge">{badge}</span>}
              </div>
            )
          );
        }

        return <div className="daygrid">{cells}</div>;
      })()}

      {!!previewModulesForActiveDay.length && <PreviewPanel day={activeDay} modules={previewModulesForActiveDay} />}
    </div>
  );

  const todayTab = (
    <div className="max-w-3xl mx-auto">
      <div className="text-lg font-semibold mb-1">{examSlug}</div>
      <div className="text-sm text-gray-600 mb-3">Day {todayDay}</div>

      <DayNav
        planDays={planDays}
        currentDay={currentDay}
        activeDay={activeDay}
        onPick={(d) => {
          setActiveDay(d);
          if (d !== currentDay) setTab("calendar");
        }}
      />

      <ComingLater modules={todayPool} />

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : !releasedModules.length ? (
        <div className="text-gray-500">No modules for today yet.</div>
      ) : (
        releasedModules.map((m, i) => <ModulePanel key={m._id || i} m={m} index={i} />)
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
        Progress view (lightweight). Use “Mark Complete” on Today’s Task to record completion for Day {todayDay}.
      </p>
      <p className="mt-2">
        <i>Tip:</i> If you want a detailed per-topic progress bar, we can add an endpoint that returns the user’s
        completed days/items and render it here.
      </p>
    </div>
  );

  return (
    <div className="prep-wrap">
      {/* 🔒 Full-screen gate (payment + WA + submit + waiting + countdown) */}
      <PrepAccessOverlay examId={apiExamId || examSlug} email={localStorage.getItem("userEmail") || ""} />

      <div className="tabbar">
        <a
          className={`tab ${tab === "calendar" ? "active" : ""}`}
          href="?tab=calendar"
          onClick={(e) => {
            e.preventDefault();
            setTab("calendar");
          }}
        >
          Calendar
        </a>
        <a
          className={`tab ${tab === "today" ? "active" : ""}`}
          href="?tab=today"
          onClick={(e) => {
            e.preventDefault();
            setTab("today");
          }}
        >
          Today’s Task
        </a>
        <a
          className={`tab ${tab === "progress" ? "active" : ""}`}
          href="?tab=progress"
          onClick={(e) => {
            e.preventDefault();
            setTab("progress");
          }}
        >
          Progress
        </a>
      </div>

      {tab === "calendar" ? calendarTab : tab === "progress" ? progressTab : todayTab}
    </div>
  );
}
