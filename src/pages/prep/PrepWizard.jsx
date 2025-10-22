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

// inline (word-level) highlighting
function renderInline(sentence, rand) {
  const parts = sentence.split(/(\b[\p{L}\p{N}']+\b)/u);
  return parts.map((tok, i) => {
    if (!/\b[\p{L}\p{N}']+\b/u.test(tok)) return <span key={i}>{tok}</span>;
    if (IMPORTANT.some((re) => re.test(tok)))
      return (
        <mark key={i} style={{ backgroundColor: "rgba(255,138,168,0.35)", borderRadius: 2 }}>
          {tok}
        </mark>
      );
    if (YEAR_RE.test(tok))
      return (
        <mark key={i} style={{ backgroundColor: "rgba(255,242,0,0.35)", borderRadius: 2 }}>
          {tok}
        </mark>
      );
    if (rand() < 0.045)
      return (
        <mark key={i} style={{ backgroundColor: "rgba(194,255,125,0.35)", borderRadius: 2 }}>
          {tok}
        </mark>
      );
    return <span key={i}>{tok}</span>;
  });
}

function chooseSentenceStyle(sentence, rand) {
  const words = sentence.trim().split(/\s+/).filter(Boolean).length;
  const isLong = words >= 18;
  const r = rand();
  if (isLong && r < 0.32) return "yellow";
  if (r < 0.18) return "underline";
  if (r < 0.28) return "bluebold";
  if (r < 0.4) return "green";
  if (r < 0.52) return "blue";
  return null;
}

export function highlightNotes(raw, seedKey = "") {
  if (!raw) return null;
  const paras = String(raw).trim().split(/\n{2,}/);
  const baseSeed = seed32(seedKey + "|" + raw.length);
  const rand = rng(baseSeed);

  return paras.map((para, pi) => {
    const sentences = splitSentences(para);
    const nodes = sentences.map((s, si) => {
      const style = chooseSentenceStyle(s, rand);
      const shared = { borderRadius: 6, display: "inline", padding: "0 2px", lineHeight: 1.6 };
      if (style === "yellow") return <mark key={si} style={{ ...shared, backgroundColor: "rgba(255,255,150,0.26)" }}>{s}</mark>;
      if (style === "green") return <mark key={si} style={{ ...shared, backgroundColor: "rgba(160,255,160,0.22)" }}>{s}</mark>;
      if (style === "blue") return <mark key={si} style={{ ...shared, backgroundColor: "rgba(173,216,255,0.22)" }}>{s}</mark>;
      if (style === "underline")
        return (
          <span key={si} style={{ textDecorationLine: "underline", textDecorationStyle: "wavy", textDecorationColor: "rgba(255,170,0,0.5)", textDecorationThickness: "2px" }}>
            {renderInline(s, rand)}
          </span>
        );
      if (style === "bluebold") return <span key={si} style={{ fontWeight: 600, color: "#1d4ed8" }}>{renderInline(s, rand)}</span>;
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
    linear-gradient(to bottom, rgba(0,92,255,0.14), rgba(0,92,255,0.10)),
    repeating-linear-gradient(transparent, transparent 26px, rgba(0,92,255,0.24) 27px, transparent 27px)
  `,
  backgroundBlendMode: "normal, lighten, normal, normal",
  backgroundSize: "100% 27px",
  backgroundColor: "#fff",
  border: "1px solid #dbe3f6",
  borderRadius: 12,
  padding: "14px 14px 14px 72px",
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  boxShadow: "inset 0 0 8px rgba(0,0,0,0.03)",
};

/* ---------------- helpers ---------------- */
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
        Unlocks in <span className="font-mono">{left}</span>. Admin may add content before unlock time.
      </div>
    </div>
  );
}

/* ---------------- Main Page ---------------- */
export default function PrepWizard() {
  const examSlug = readExamId();
  const [apiExamId, setApiExamId] = useState("");
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

  // --- API load ---
  async function load() {
    const candidates = Array.from(new Set([examSlug, toExamKey(examSlug)].filter(Boolean)));
    if (!candidates.length) return;
    setLoading(true);
    try {
      const templateResults = await Promise.all(
        candidates.map((id) => getJSON(`/api/prep/templates?examId=${encodeURIComponent(id)}`).catch(() => ({ items: [] })))
      );
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
      if (todayRes.status === "fulfilled" && Array.isArray(todayRes.value?.items)) fullToday = todayRes.value.items;
      else fullToday = all.filter((m) => Number(m.dayIndex) === Number(td));

      setTodayPool(fullToday);

      const now = Date.now();
      const releasedToday = fullToday
        .filter((m) => !m.releaseAt || Date.parse(m.releaseAt) <= now || m.status === "released")
        .sort((a, b) => (a.releaseAt && b.releaseAt ? Date.parse(a.releaseAt) - Date.parse(b.releaseAt) : 0));

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
  }, [examSlug]);

  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.set("tab", tab);
    history.replaceState(null, "", u.toString());
  }, [tab]);

  async function markComplete() {
    try {
      if (!email) {
        alert("Progress marking needs an email in localStorage as 'userEmail'.");
        return;
      }
      await postJSON("/api/prep/user/complete", { examId: apiExamId || examSlug, email, dayIndex: todayDay });
      alert("Marked complete!");
      await load();
    } catch {
      alert("Failed to mark complete");
    }
  }

  const releasedModules = useMemo(() => {
    return (modules || [])
      .filter((m) => !m.releaseAt || Date.parse(m.releaseAt) <= nowUtcMs() || m.status === "released")
      .sort((a, b) => (a.releaseAt && b.releaseAt ? Date.parse(a.releaseAt) - Date.parse(b.releaseAt) : 0))
      .map((m) => ({ ...m, content: textOf(m) }));
  }, [modules]);

  const todayTab = (
    <div className="max-w-3xl mx-auto">
      <div className="text-lg font-semibold mb-1">{examSlug}</div>
      <div className="text-sm text-gray-600 mb-3">Day {todayDay}</div>
      <DayNav planDays={planDays} currentDay={currentDay} activeDay={activeDay} onPick={(d) => setActiveDay(d)} />
      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : !releasedModules.length ? (
        <div className="text-gray-500">No modules for today yet.</div>
      ) : (
        releasedModules.map((m, i) => (
          <div key={m._id || i} className="mb-4 border p-3 rounded-lg bg-white">
            <div className="font-semibold mb-1">{m.title}</div>
            {m.content && <div style={linedPage}>{highlightNotes(m.content, m._id || m.title || "")}</div>}
          </div>
        ))
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
      <p>Progress view (lightweight). Use “Mark Complete” on Today’s Task to record completion.</p>
    </div>
  );

  return (
    <div className="prep-wrap">
      {/* ✅ LawNetwork Prep Access Overlay */}
      <PrepAccessOverlay examId={apiExamId || examSlug} email={email} />

      <div className="tabbar">
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

      {tab === "progress" ? progressTab : todayTab}
    </div>
  );
}
