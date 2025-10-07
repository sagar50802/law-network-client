// client/src/pages/prep/PrepWizard.jsx
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
  const candidates = [
    m?.content,
    m?.ocrText,
    m?.text,
    m?.manualText,
    m?.description
  ];
  for (const s of candidates) {
    if (typeof s === "string" && s.trim()) return s.trim();
  }
  return "";
}

/* -------------------------- colorful-notes helpers -------------------------- */

// tiny stable PRNG so highlights don't “jump” on re-renders
function seedFrom(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function randBool(seed, i, mod) {
  // Lehmer-ish step
  const x = (Math.imul((seed ^ (i + 1)) + 0x9e3779b9, 0x85ebca6b) >>> 0) % mod;
  return x === 0;
}

// mildly opinionated “important terms” — safe fallbacks if content is generic
const IMPORTANT = new Set([
  "overview","key","keys","important","summary","highlights","highlight",
  "event","events","figure","figures","dates","fact","facts",
  "ancient","medieval","modern","empire","kingdom","dynasty","civilization","constitution",
  "right","rights","duty","duties","law","section","article","reform","economy","culture",
  "india","indian","world","global"
]);

/**
 * Returns React nodes with <mark> spans in three colors:
 *  - yellow: 4-digit years and “dates”
 *  - pink: important keywords
 *  - green: a light sprinkle for visual cadence (stable pseudo-random)
 */
function highlightNotes(rawText, seedKey = "") {
  if (!rawText) return rawText;

  const seed = seedFrom(seedKey + rawText.slice(0, 64));
  const tokens = rawText.split(/(\s+|(?=[,.;:!?()])|(?<=[,.;:!?()]))/g);

  return tokens.map((t, i) => {
    // non-words / whitespace
    if (!t || /^\s+$/.test(t) || /^[,.;:!?()]+$/.test(t)) return t;

    const w = t.replace(/[^\w'-]/g, ""); // strip punctuation ends
    const low = w.toLowerCase();

    // patterns
    const isYear = /\b(1[5-9]\d{2}|20\d{2})\b/.test(w);
    const isImportant = IMPORTANT.has(low);

    // gentle random sprinkle (about 1 in 28 tokens)
    const sprinkle = !isYear && !isImportant && randBool(seed, i, 28);

    let cls = "";
    if (isYear) cls = "bg-yellow-200/70";
    else if (isImportant) cls = "bg-rose-200/70";
    else if (sprinkle) cls = "bg-lime-200/70";

    return cls ? (
      <mark key={i} className={`px-0.5 rounded-sm ${cls}`}>{t}</mark>
    ) : (
      <span key={i}>{t}</span>
    );
  });
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
              <div
                key={i}
                className="relative w-24 h-16 shrink-0 rounded overflow-hidden bg-gray-200"
                title="Locked until release"
              >
                <img src={u} alt="" className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 grid place-items-center text-white/90 text-xs">
                  🔒
                </div>
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

  const imgUrls = pick("image", m).map((it) => absUrl(it.url || ""));
  const audioUrl = pick("audio", m)[0]?.url;
  const videoUrl = pick("video", m)[0]?.url;
  const pdfUrl   = pick("pdf",   m)[0]?.url;

  const audioAbs = audioUrl ? absUrl(audioUrl) : "";
  const videoAbs = videoUrl ? absUrl(videoUrl) : "";
  const pdfAbs   = pdfUrl   ? absUrl(pdfUrl)   : "";

  const content = textOf(m); // robust text selection

  // “lined page” styling
  const linedPage = {
    // subtle notebook lines
    backgroundImage:
      "repeating-linear-gradient(0deg, #ffffff, #ffffff 26px, #eaf1ff 27px)",
    backgroundSize: "100% 27px",
    border: "2px solid rgba(76, 29, 149, 0.12)",
    borderRadius: 14,
    padding: 12,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: expanded ? "none" : 280,   // <- taller by default
    overflowY: expanded ? "visible" : "auto",
  };

  return (
    <details className="prep-card module" open={index === 0} style={{ marginBottom: 12 }}>
      <summary>
        <span style={{ fontWeight: 600 }}>{m.title || "Untitled"}</span>
        <span className="chev">›</span>
      </summary>

      <div style={{ marginTop: 12 }}>
        {/* IMAGES FIRST */}
        {!!imgUrls.length && <ImageScroller images={imgUrls} />}

        {/* TEXT (scrollable, colorful “notes”) */}
        {content && (
          <>
            <div className="mt-3" style={linedPage}>
              {highlightNotes(content, m._id || m.title || "")}
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

        {/* AUDIO */}
        {audioAbs && (
          <div style={{ marginTop: 12 }}>
            <audio controls src={audioAbs} style={{ width: "100%" }} />
          </div>
        )}

        {/* VIDEO */}
        {videoAbs && (
          <div style={{ marginTop: 12 }}>
            <video controls src={videoAbs} style={{ width: "100%", borderRadius: 12 }} />
          </div>
        )}

        {/* PDF */}
        {pdfAbs && (
          <div style={{ marginTop: 10 }}>
            <a className="badge" href={pdfAbs} target="_blank" rel="noreferrer">
              Open PDF
            </a>
          </div>
        )}
      </div>
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

/* --------------------------- preview panel (no time) --------------------------- */

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

  // existing
  const [todayDay, setTodayDay] = useState(1);
  const [planDays, setPlanDays] = useState(1);
  const [modules, setModules] = useState([]);

  // for previewing any day
  const [allModules, setAllModules] = useState([]);

  // everything (released + scheduled) for "today" – used by ComingLater
  const [todayPool, setTodayPool] = useState([]);

  // tiny UI states
  const [currentDay, setCurrentDay] = useState(1);
  const [activeDay, setActiveDay] = useState(1);

  // optional email (if your site stores it for progress API)
  const email = localStorage.getItem("userEmail") || "";

  // ✅ ROBUST: meta + templates (and optional today endpoint if present)
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
      const releasedToday = fullToday
        .filter(m => !m.releaseAt || Date.parse(m.releaseAt) <= now || m.status === "released")
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

  // compute released modules and augment with robust `content`
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

  /* ========= CALENDAR TAB ========= */
  const calendarTab = (
    <div style={{ marginTop: 16 }}>
      <div className="text-sm text-gray-500">
        Current Day (cohort): <b>Day {cohortDay}</b>
      </div>

      {(() => {
        const sourceMods = (allModules && allModules.length) ? allModules : modules;

        const byDay = new Map();
        (sourceMods || []).forEach(m => {
          const d = Number(m.dayIndex) || 1;
          if (!byDay.has(d)) byDay.set(d, []);
          byDay.get(d).push(m);
        });

        const maxPlanned = Math.max(...Array.from(byDay.keys(), d => +d || 1), 1);
        const last = Math.max(maxPlanned, cohortDay + 6, 21);

        const isDone = (m, userStatesMap) => {
          const s = userStatesMap?.[m._id];
          return s === true || s?.done === true;
        };

        const cells = [];
        for (let d = 1; d <= last; d++) {
          const items = byDay.get(d) || [];
          const released = items.filter(x => x.status === 'released' || !x.releaseAt || Date.parse(x.releaseAt) <= Date.now());
          const anyReleased = released.length > 0;

          let cls = "daycell";
          let badge = "";
          if (d > cohortDay) {
            cls += " locked";
            badge = "🔒";
          } else if (d === cohortDay) {
            cls += " today";
            const allDone = released.length && released.every(m => isDone(m, userStates));
            if (allDone) badge = "✅";
            else if (released.length) badge = "●";
          } else {
            const allDone = released.length && released.every(m => isDone(m, userStates));
            if (allDone) { cls += " completed"; badge = "✅"; }
            else if (anyReleased) { cls += " available"; badge = "●"; }
            else { cls += " locked"; badge = "—"; }
          }

          const href = d <= cohortDay ? `?tab=today&d=${d}` : undefined;

          cells.push(
            href ? (
              <a
                key={d}
                className={cls}
                href={href}
                title={`Day ${d}`}
                onClick={(e) => { e.preventDefault(); setTab("today"); }}
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

      {!!previewModulesForActiveDay.length && (
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
          if (d !== currentDay) setTab("calendar");
        }}
      />

      {/* Use the complete pool (released + scheduled) for "Coming later" */}
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
    <div className="prep-wrap">
      {/* Modern tabbar */}
      <div className="tabbar">
        <a
          className={`tab ${tab === "calendar" ? "active" : ""}`}
          href="?tab=calendar"
          onClick={(e) => { e.preventDefault(); setTab("calendar"); }}
        >
          Calendar
        </a>
        <a
          className={`tab ${tab === "today" ? "active" : ""}`}
          href="?tab=today"
          onClick={(e) => { e.preventDefault(); setTab("today"); }}
        >
          Today’s Task
        </a>
        <a
          className={`tab ${tab === "progress" ? "active" : ""}`}
          href="?tab=progress"
          onClick={(e) => { e.preventDefault(); setTab("progress"); }}
        >
          Progress
        </a>
      </div>

      {tab === "calendar" ? calendarTab : tab === "progress" ? progressTab : todayTab}
    </div>
  );
}
