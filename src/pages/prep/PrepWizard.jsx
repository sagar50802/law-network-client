// client/src/pages/prep/PrepWizard.jsx
import { useEffect, useMemo, useState } from "react";
import { getJSON, postJSON, absUrl } from "../../utils/api";
import { ImageScroller } from "../../components/ui/ImageScroller";
import PrepAccessOverlay from "../../components/Prep/PrepAccessOverlay.jsx";

/* ===========================================================================
   ACCESS CONTROL OVERLAY
   =========================================================================== */
function AccessOverlay({ examId, email, onGranted }) {
  const [state, setState] = useState("checking"); // checking | form | waiting | granted

  // 1️⃣  Check existing access
  useEffect(() => {
    async function check() {
      if (!examId || !email) return setState("form");
      try {
        const res = await getJSON(
          `/api/prep/access/status?examId=${encodeURIComponent(examId)}&email=${encodeURIComponent(email)}`
        );
        if (res?.status === "granted") setState("granted");
        else if (res?.status === "waiting") setState("waiting");
        else setState("form");
      } catch {
        setState("form");
      }
    }
    check();
  }, [examId, email]);

  // 2️⃣  Poll server while waiting
  useEffect(() => {
    if (state !== "waiting") return;
    const t = setInterval(async () => {
      try {
        const res = await getJSON(
          `/api/prep/access/status?examId=${encodeURIComponent(examId)}&email=${encodeURIComponent(email)}`
        );
        if (res?.status === "granted") {
          clearInterval(t);
          setState("granted");
          onGranted?.();
        }
      } catch {
        /* ignore network errors silently */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [state, examId, email]);

  async function submitRequest() {
    if (!examId || !email) {
      alert("Missing examId or email.");
      return;
    }
    try {
      await postJSON("/api/prep/access/request", { examId, email });
      setState("waiting");
    } catch {
      alert("Failed to send access request.");
    }
  }

  // 3️⃣  Nothing to render when granted
  if (state === "granted") return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 text-white flex flex-col items-center justify-center p-6"
      style={{ backdropFilter: "blur(6px)" }}
    >
      {state === "checking" && <div className="text-lg">Checking access…</div>}

      {state === "form" && (
        <>
          <div className="text-xl font-semibold mb-4">Access Required</div>
          <button
            onClick={submitRequest}
            className="px-5 py-2 bg-amber-500 text-black rounded font-medium hover:bg-amber-400"
          >
            Request Access
          </button>
        </>
      )}

      {state === "waiting" && (
        <>
          <div className="text-lg font-semibold mb-3">Waiting for approval…</div>
          <div className="text-sm text-gray-300 animate-pulse">
            Once approved by admin, this page will unlock automatically.
          </div>
        </>
      )}
    </div>
  );
}

/* ===========================================================================
   ORIGINAL PREPWIZARD (UNCHANGED CORE)
   =========================================================================== */

function readExamId() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const i = parts.findIndex((p) => p === "prep");
  return i >= 0 && parts[i + 1] ? decodeURIComponent(parts[i + 1]) : "";
}
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
function pick(kind, m) {
  const out = [];
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
  if (kind === "image" && Array.isArray(m?.images)) m.images.forEach((u) => out.push({ url: u, kind: "image" }));
  if (kind === "audio" && m?.audio)
    out.push(typeof m.audio === "string" ? { url: m.audio, kind: "audio" } : { ...m.audio, kind: "audio" });
  if (kind === "video" && m?.video)
    out.push(typeof m.video === "string" ? { url: m.video, kind: "video" } : { ...m.video, kind: "video" });
  if (kind === "pdf" && m?.pdf)
    out.push(typeof m.pdf === "string" ? { url: m.pdf, kind: "pdf" } : { ...m.pdf, kind: "pdf" });
  const seen = new Set();
  return out.filter((x) => {
    const key = x.url || "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function textOf(m) {
  const candidates = [m?.content, m?.ocrText, m?.text, m?.manualText, m?.description];
  for (const s of candidates) if (typeof s === "string" && s.trim()) return s.trim();
  return "";
}
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
        Unlocks in <span className="font-mono">{left}</span>.
      </div>
    </div>
  );
}

/* ===========================================================================
   MAIN COMPONENT
   =========================================================================== */
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
      const releasedToday = fullToday.filter((m) => !m.releaseAt || Date.parse(m.releaseAt) <= now || m.status === "released");
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

  const releasedModules = useMemo(() => {
    return (modules || [])
      .filter((m) => !m.releaseAt || Date.parse(m.releaseAt) <= nowUtcMs() || m.status === "released")
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
            {m.content && <div>{m.content}</div>}
          </div>
        ))
      )}
      {currentDay < planDays && <NextDayTeaser day={currentDay + 1} />}
    </div>
  );

  return (
    <div className="prep-wrap">
      {/* 🔒 Access gate overlay */}
      <AccessOverlay examId={apiExamId || examSlug} email={email} onGranted={() => console.log("Access granted")} />

      {/* existing internal overlay */}
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
      </div>
      {todayTab}
    </div>
  );
}
