import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON, absUrl } from "../../utils/api";
import { Card } from "../../components/ui/Card";
import { ImageScroller } from "../../components/ui/ImageScroller";

/**
 * Route shape assumed: /prep/:examId
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
  if (kind === "audio" && m?.audio) out.push(typeof m.audio === "string" ? { url: m.audio, kind: "audio" } : { ...m.audio, kind: "audio" });
  if (kind === "video" && m?.video) out.push(typeof m.video === "string" ? { url: m.video, kind: "video" } : { ...m.video, kind: "video" });
  if (kind === "pdf"   && m?.pdf)   out.push(typeof m.pdf   === "string" ? { url: m.pdf,   kind: "pdf"   } : { ...m.pdf,   kind: "pdf"   });

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

const IMPORTANT = [
  /constitution/i, /fundamental rights?/i, /directive principles?/i, /preamble/i,
  /parliament/i, /judiciary/i, /executive/i, /federal/i, /governance/i, /independence/i,
  /reform/i, /democracy/i, /election/i, /econom(y|ic)/i, /industrial/i, /revolution/i,
  /agricultur(e|al)/i, /rights?/i, /dut(y|ies)/i, /education/i, /health/i
];

// deterministic 32-bit hash
function seedFrom(str = "") {
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
    t += 0x6D2B79F5;
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
      return <mark key={i} className="px-0.5 rounded bg-rose-200/70">{tok}</mark>;
    }

    // Years → yellow
    if (YEAR_RE.test(tok)) {
      return <mark key={i} className="px-0.5 rounded bg-yellow-200/70">{tok}</mark>;
    }

    // sprinkle a few green notes (very low probability)
    if (rand() < 0.06) {
      return <mark key={i} className="px-0.5 rounded bg-lime-200/70">{tok}</mark>;
    }

    return <span key={i}>{tok}</span>;
  });
}

// decide per-sentence style (mutually exclusive)
function chooseSentenceStyle(sentence, rand) {
  const words = sentence.trim().split(/\s+/).filter(Boolean).length;
  const isLong = words >= 18;

  if (isLong && rand() < 0.38) return "yellow"; // block highlight
  if (rand() < 0.18) return "underline";
  if (rand() < 0.14) return "bluebold";
  return null;
}

// main renderer: paragraphs → sentences → styled spans
export function highlightNotes(raw, seedKey = "") {
  if (!raw) return null;
  const paras = String(raw).trim().split(/\n{2,}/);
  const baseSeed = seedFrom(seedKey + "|" + raw.length);
  const rand = rng(baseSeed);

  return paras.map((para, pi) => {
    const sentences = splitSentences(para);
    const nodes = sentences.map((s, si) => {
      const style = chooseSentenceStyle(s, rand);

      if (style === "yellow") {
        return (
          <mark
            key={si}
            className="block bg-yellow-100/70 rounded-lg px-2 py-1 leading-relaxed"
          >
            {s}
          </mark>
        );
      }
      if (style === "underline") {
        return (
          <span
            key={si}
            className="underline decoration-amber-500/90 decoration-2 underline-offset-4"
          >
            {renderInline(s, rand)}
          </span>
        );
      }
      if (style === "bluebold") {
        return (
          <span key={si} className="font-semibold text-blue-700/90">
            {renderInline(s, rand)}
          </span>
        );
      }
      return <span key={si}>{renderInline(s, rand)}</span>;
    });

    return (
      <div key={pi} className="mb-2 last:mb-0">
        {nodes}
      </div>
    );
  });
}

// lined-page background (same as before)
export const linedPage = {
  backgroundImage:
    "linear-gradient(#EDF2FF 28px, transparent 0), linear-gradient(90deg, #EEF2F7 1px, transparent 1px)",
  backgroundSize: "100% 28px, 40px 100%",
  backgroundPosition: "0 14px, 0 0",
  border: "1px solid #E5EAF3",
  borderRadius: 12,
  padding: 12
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

/* ------------------------ module + later components ------------------------ */

function LockedPreviewCard({ m }) {
  const imgs = pick("image", m);
  const hasAudio = pick("audio", m).length > 0;
  const hasVideo = pick("video", m).length > 0;

  return (
    <div className="rounded-lg border p-3 bg-gray-50 relative overflow-hidden">
      <div className="absolute right-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
        Preview
      </div>
      <div className="font-medium mb-2">{m.title || "Untitled"}</div>
      {!!imgs.length && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {imgs.slice(0, 6).map((it, i) => {
            const u = absUrl(it.url || "");
            return (
              <div key={i} className="relative w-24 h-16 shrink-0 rounded overflow-hidden bg-gray-200" title="Locked until release">
                <img src={u} alt="" className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 grid place-items-center text-white/90 text-xs">🔒</div>
              </div>
            );
          })}
        </div>
      )}
      {textOf(m) && <p className="text-xs text-gray-600 italic line-clamp-3">Unlocks soon.</p>}
      {(hasAudio || hasVideo) && <div className="mt-2 text-xs text-gray-500">Media will unlock when available.</div>}
    </div>
  );
}

/* --- Accordion-style module panel --- */
function ModulePanel({ m, index }) {
  const [expanded, setExpanded] = useState(false);

  const imgUrls = pick("image", m).map((it) => absUrl(it.url || ""));
  const audioUrl = pick("audio", m)[0]?.url;
  const videoUrl = pick("video", m)[0]?.url;
  const pdfUrl = pick("pdf", m)[0]?.url;

  const audioAbs = audioUrl ? absUrl(audioUrl) : "";
  const videoAbs = videoUrl ? absUrl(videoUrl) : "";
  const pdfAbs = pdfUrl ? absUrl(pdfUrl) : "";

  const content = textOf(m);
  const doHighlight = m?.flags?.highlight !== false;

  return (
    <details className="prep-card module" open={index === 0} style={{ marginBottom: 12 }}>
      <summary>
        <span style={{ fontWeight: 600 }}>{m.title || "Untitled"}</span>
        <span className="chev">›</span>
      </summary>
      <div style={{ marginTop: 12 }}>
        {!!imgUrls.length && <ImageScroller images={imgUrls} />}
        {content && (
          <>
            <div className="mt-3 ocr-box" style={{ ...linedPage, maxHeight: expanded ? "none" : 320, overflow: "auto" }}>
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
        {audioAbs && <div style={{ marginTop: 12 }}><audio controls src={audioAbs} style={{ width: "100%" }} /></div>}
        {videoAbs && <div style={{ marginTop: 12 }}><video controls src={videoAbs} style={{ width: "100%", borderRadius: 12 }} /></div>}
        {pdfAbs && <div style={{ marginTop: 10 }}><a className="badge" href={pdfAbs} target="_blank" rel="noreferrer">Open PDF</a></div>}
      </div>
    </details>
  );
}

/* --------------------------- Coming Later --------------------------- */
function ComingLater({ modules }) {
  const later = useMemo(() => {
    const now = nowUtcMs();
    return (modules || []).filter((m) => m.releaseAt && Date.parse(m.releaseAt) > now)
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

/* --------------------------- Preview Panel --------------------------- */
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
  const examId = readExamId();
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

  async function load() {
    if (!examId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ examId });
      if (email) qs.set("email", email);
      const [metaRes, tmplRes, todayRes] = await Promise.allSettled([
        getJSON(`/api/prep/user/summary?${qs.toString()}`),
        getJSON(`/api/prep/templates?examId=${encodeURIComponent(examId)}`),
        getJSON(`/api/prep/user/today?examId=${encodeURIComponent(examId)}`),
      ]);

      const meta = metaRes.status === "fulfilled" ? metaRes.value : {};
      const td = meta.todayDay || 1;
      const pd = meta.planDays || 1;
      setTodayDay(td);
      setPlanDays(pd);

      const all = tmplRes.status === "fulfilled" && Array.isArray(tmplRes.value?.items)
        ? tmplRes.value.items
        : [];

      let fullToday = [];
      if (todayRes.status === "fulfilled" && Array.isArray(todayRes.value?.items)) {
        fullToday = todayRes.value.items;
      } else {
        fullToday = all.filter(m => Number(m.dayIndex) === Number(td));
      }

      setTodayPool(fullToday);
      const now = Date.now();
      const releasedToday = fullToday.filter(m => !m.releaseAt || Date.parse(m.releaseAt) <= now || m.status === "released")
        .sort((a, b) => (a.releaseAt ? Date.parse(a.releaseAt) : 0) - (b.releaseAt ? Date.parse(b.releaseAt) : 0));
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

  useEffect(() => { load(); }, [examId]);
  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.set("tab", tab);
    history.replaceState(null, "", u.toString());
  }, [tab]);
  useEffect(() => {
    const t = setInterval(() => load(), 60000);
    return () => clearInterval(t);
  }, [examId]);

  async function markComplete() {
    try {
      if (!email) {
        alert("Progress marking needs an email in localStorage as 'userEmail'. Skipping call.");
        return;
      }
      await postJSON("/api/prep/user/complete", { examId, email, dayIndex: todayDay });
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
      .sort((a, b) => Number(a.slotMin || 0) - Number(b.slotMin || 0));
  }, [allModules, activeDay]);

  const releasedModules = useMemo(() => {
    return (modules || [])
      .filter((m) => !m.releaseAt || Date.parse(m.releaseAt) <= nowUtcMs() || m.status === "released")
      .sort((a, b) => (a.releaseAt ? Date.parse(a.releaseAt) : 0) - (b.releaseAt ? Date.parse(b.releaseAt) : 0))
      .map((m) => ({ ...m, content: textOf(m) }));
  }, [modules]);

  const cohortDay = todayDay;

  const calendarTab = (
    <div style={{ marginTop: 16 }}>
      <div className="text-sm text-gray-500">Current Day (cohort): <b>Day {cohortDay}</b></div>
      {!!previewModulesForActiveDay.length && (
        <PreviewPanel day={activeDay} modules={previewModulesForActiveDay} />
      )}
    </div>
  );

  const todayTab = (
    <div className="max-w-3xl mx-auto">
      <div className="text-lg font-semibold mb-1">{examId}</div>
      <div className="text-sm text-gray-600 mb-3">Day {todayDay}</div>
      <DayNav planDays={planDays} currentDay={currentDay} activeDay={activeDay} onPick={(d) => {
        setActiveDay(d);
        if (d !== currentDay) setTab("calendar");
      }} />
      <ComingLater modules={todayPool} />
      {loading ? <div className="text-gray-500">Loading…</div> :
        !releasedModules.length ? <div className="text-gray-500">No modules for today yet.</div> :
          releasedModules.map((m, i) => <ModulePanel key={m._id || i} m={m} index={i} />)}
      <div className="mt-4">
        <button onClick={markComplete} className="px-4 py-2 rounded bg-amber-600 text-white">Mark Complete</button>
        <div className="text-xs text-gray-500 mt-2">Plan days: {planDays} • Day {todayDay}</div>
      </div>
      {currentDay < planDays && <NextDayTeaser day={currentDay + 1} />}
    </div>
  );

  const progressTab = (
    <div className="max-w-3xl mx-auto text-sm text-gray-600">
      <p>Progress view (lightweight). Use “Mark Complete” on Today’s Task to record completion for Day {todayDay}.</p>
      <p className="mt-2"><i>Tip:</i> If you want a detailed per-topic progress bar, we can add an endpoint that returns the user’s completed days/items and render it here.</p>
    </div>
  );

  return (
    <div className="prep-wrap">
      <div className="tabbar">
        <a className={`tab ${tab === "calendar" ? "active" : ""}`} href="?tab=calendar"
          onClick={(e) => { e.preventDefault(); setTab("calendar"); }}>Calendar</a>
        <a className={`tab ${tab === "today" ? "active" : ""}`} href="?tab=today"
          onClick={(e) => { e.preventDefault(); setTab("today"); }}>Today’s Task</a>
        <a className={`tab ${tab === "progress" ? "active" : ""}`} href="?tab=progress"
          onClick={(e) => { e.preventDefault(); setTab("progress"); }}>Progress</a>
      </div>
      {tab === "calendar" ? calendarTab : tab === "progress" ? progressTab : todayTab}
    </div>
  );
}
