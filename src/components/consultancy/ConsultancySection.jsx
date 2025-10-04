import { useEffect, useRef, useState } from "react";
import {
  API_BASE,
  authHeaders,
  getJSON,
  upload as uploadApi,
  deleteJSON,
  buildUrl,
} from "../../utils/api";
import IfOwnerOnly from "../common/IfOwnerOnly";
import { SmartImg } from "../common/SmartMedia";

/* ---------- contact links (env driven, no server change) ---------- */
function buildContacts() {
  const num = (import.meta.env.VITE_WHATSAPP_NUMBER || "").replace(/\D+/g, "");
  const waFromNum = num ? `https://wa.me/${num}` : "";
  const wa = import.meta.env.VITE_WHATSAPP_LINK || waFromNum;

  return {
    whatsapp: wa || "",
    telegram: import.meta.env.VITE_TELEGRAM_LINK || "",
    instagram: import.meta.env.VITE_INSTAGRAM_LINK || "",
    email: import.meta.env.VITE_EMAIL_LINK || "", // e.g. "mailto:hi@example.com"
  };
}
const CONTACTS = buildContacts();

/* ---------- helpers ---------- */
function safeAuthHeaders() {
  const h = (typeof authHeaders === "function" ? authHeaders() : {}) || {};
  const out = {};
  if (h.Authorization) out.Authorization = h.Authorization;
  if (h.authorization) out.authorization = h.authorization;
  if (h["X-Owner-Key"]) out["X-Owner-Key"] = h["X-Owner-Key"];
  if (h["x-owner-key"]) out["x-owner-key"] = h["x-owner-key"];
  return out;
}

// Create
async function uploadSlide({ title, intro, file }) {
  const fd = new FormData();
  fd.append("title", title || "Untitled");
  if (intro != null) fd.append("intro", intro);
  if (file) fd.append("image", file);
  return uploadApi("/api/consultancy", fd, { headers: safeAuthHeaders() });
}

// Patch
async function patchSlide(id, { title, intro, file }) {
  const fd = new FormData();
  if (title != null) fd.append("title", title);
  if (intro != null) fd.append("intro", intro);
  if (file) fd.append("image", file);
  const res = await fetch(buildUrl(`/api/consultancy/${id}`), {
    method: "PATCH",
    headers: safeAuthHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(`PATCH /api/consultancy/${id} ${res.status}`);
  return res.json();
}

// Delete
async function delSlide(id) {
  await deleteJSON(`/api/consultancy/${id}`, { headers: safeAuthHeaders() });
}

/* ---------- component ---------- */
export default function ConsultancySection({ autoScroll = true }) {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const railRef = useRef(null);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);

  async function load() {
    try {
      const r = await getJSON("/api/consultancy");
      setItems(r?.items || r?.slides || []);
    } catch (e) {
      console.error("Consultancy load failed:", e);
    }
  }
  useEffect(() => { load(); }, []);

  // Vertical auto-scroll (unchanged)
  useEffect(() => {
    if (!autoScroll) return;
    const el = railRef.current;
    if (!el) return;

    let raf = 0;
    let last = performance.now();

    const SPEED = 108;
    const DWELL = 650;
    const dirRef = { cur: 1 };
    let holdUntil = 0;

    const io = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry?.isIntersecting ?? true;
    }, { threshold: 0.05 });
    io.observe(el);

    const tick = (now) => {
      const dt = now - last;
      last = now;
      if (visibleRef.current && !pausedRef.current && el.scrollHeight > el.clientHeight) {
        if (now >= holdUntil) {
          const max = el.scrollHeight - el.clientHeight;
          const delta = (SPEED * dt) / 1000 * dirRef.cur;
          let next = el.scrollTop + delta;

          if (next <= 0) {
            next = 0; dirRef.cur = 1; holdUntil = now + DWELL;
          } else if (next >= max) {
            next = max; dirRef.cur = -1; holdUntil = now + DWELL;
          }
          el.scrollTop = next;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const pause = () => (pausedRef.current = true);
    const resume = () => (pausedRef.current = false);
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);

    let wheelTO = 0;
    const onWheel = () => {
      pause(); clearTimeout(wheelTO);
      wheelTO = window.setTimeout(resume, 900);
    };
    el.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("wheel", onWheel);
      clearTimeout(wheelTO);
    };
  }, [autoScroll, items.length]);

  // quick owner add controls
  const [openAdd, setOpenAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [file, setFile] = useState(null);

  async function onCreate(e) {
    e?.preventDefault?.();
    if (!title.trim()) return alert("Please enter a title.");
    if (!file) return alert("Choose an image first.");
    setBusy(true);
    try {
      const saved = await uploadSlide({ title: title.trim(), intro: intro.trim(), file });
      const slide = saved?.item || saved?.slide || saved?.data || saved;
      setItems((prev) => [slide, ...prev]);
      setTitle(""); setIntro(""); setFile(null); setOpenAdd(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create slide");
    } finally { setBusy(false); }
  }

  async function onReplace(s, newFile) {
    if (!newFile) return;
    setBusy(true);
    try { await patchSlide(s.id || s._id, { file: newFile }); await load(); }
    catch (err) { console.error(err); alert("Failed to replace image"); }
    finally { setBusy(false); }
  }
  async function onDelete(s) {
    if (!confirm("Delete this slide?")) return;
    setBusy(true);
    try { await delSlide(s.id || s._id); setItems((p) => p.filter((x) => (x.id || x._id) !== (s.id || s._id))); }
    catch (err) { console.error(err); alert("Failed to delete"); }
    finally { setBusy(false); }
  }

  return (
    /* keeps the #consultancy anchor so navbar jump works */
    <section id="consultancy" className="mt-0">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-semibold">Consultancy</h2>
        <IfOwnerOnly>
          <div className="flex items-center gap-2">
            <button
              className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50"
              onClick={() => setOpenAdd((v) => !v)}
            >
              {openAdd ? "Close" : "Add card"}
            </button>
            <button className="text-xs px-2 py-1 rounded border" onClick={() => load()} disabled={busy}>
              Refresh
            </button>
          </div>
        </IfOwnerOnly>
      </div>

      <IfOwnerOnly>
        {openAdd && (
          <form
            onSubmit={onCreate}
            className="mb-2 grid gap-2 border rounded-xl p-3 bg-white text-sm max-w-md"
          >
            <input
              className="border rounded px-2 py-1.5"
              placeholder="Title (required)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="border rounded p-2 min-h-[70px]"
              placeholder="Short intro (optional)"
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button
                className="px-3 py-1 rounded bg-black text-white disabled:opacity-50"
                disabled={busy || !file || !title.trim()}
              >
                {busy ? "Saving…" : "Create"}
              </button>
            </div>
          </form>
        )}
      </IfOwnerOnly>

      {/* vertical rail */}
      <div className="relative overflow-hidden rounded-2xl border bg-white">
        <div
          ref={railRef}
          className="flex flex-col gap-3 overflow-y-auto overflow-x-hidden scroll-smooth p-3"
          style={{ maxHeight: 520 }}
        >
          {items.map((it) => (
            <Card
              key={it._id || it.id}
              item={it}
              onReplace={(f) => onReplace(it, f)}
              onDelete={() => onDelete(it)}
            />
          ))}
          {items.length === 0 && (
            <div className="text-gray-500 p-6">No consultancy cards yet</div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- Card ---------- */
function Card({ item, onReplace, onDelete }) {
  const hasAnyContact = !!(CONTACTS.whatsapp || CONTACTS.telegram || CONTACTS.instagram || CONTACTS.email);

  return (
    <div className="w-full rounded-2xl border bg-white shadow-sm ring-1 ring-black/5">
      <div className="relative p-2">
        <div
          className="h-[260px] md:h-[280px] rounded-xl bg-gradient-to-br from-gray-50 to-gray-100
                      flex items-center justify-center overflow-hidden ring-1 ring-gray-200"
        >
          {item.image ? (
            <SmartImg
              src={item.image}
              alt={item.title || "Consultancy"}
              className="max-h-[96%] max-w-[96%] object-contain transition-transform duration-500"
            />
          ) : (
            <div className="text-gray-400 text-sm">No image</div>
          )}
        </div>

        {/* admin tools (unchanged) */}
        <IfOwnerOnly>
          <div className="absolute top-3 right-3 flex items-center gap-1">
            <label className="text-[11px] px-2 py-0.5 rounded bg-white/95 border cursor-pointer hover:bg-white">
              Replace
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onReplace(e.target.files?.[0] || null)}
              />
            </label>
            <button
              className="text-[11px] px-2 py-0.5 rounded bg-white/95 border text-red-600 hover:bg-white"
              onClick={(ev) => { ev.preventDefault(); onDelete(); }}
            >
              Delete
            </button>
          </div>
        </IfOwnerOnly>
      </div>

      <div className="px-3 pb-3">
        <div className="font-semibold text-gray-900 text-sm truncate">
          {item.title || "—"}
        </div>
        <div className="text-xs text-gray-600 line-clamp-2">
          {item.intro || ""}
        </div>

        {/* Professional action row (only shows when a link exists) */}
        {hasAnyContact && (
          <div className="mt-3 flex items-center gap-2">
            {CONTACTS.whatsapp && (
              <IconButton
                label="Chat on WhatsApp"
                onClick={() => window.open(CONTACTS.whatsapp, "_blank", "noopener")}
              >
                <WhatsAppSVG />
              </IconButton>
            )}
            {CONTACTS.telegram && (
              <IconButton
                label="Open Telegram"
                onClick={() => window.open(CONTACTS.telegram, "_blank", "noopener")}
              >
                <TelegramSVG />
              </IconButton>
            )}
            {CONTACTS.instagram && (
              <IconButton
                label="Open Instagram"
                onClick={() => window.open(CONTACTS.instagram, "_blank", "noopener")}
              >
                <InstagramSVG />
              </IconButton>
            )}
            {CONTACTS.email && (
              <IconButton
                label="Send Email"
                onClick={() => window.open(CONTACTS.email, "_blank", "noopener")}
              >
                <MailSVG />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- tiny UI primitives ---------- */
function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center h-9 w-9 rounded-full border bg-white hover:bg-gray-50
                 shadow-sm ring-1 ring-black/5 transition focus:outline-none focus:ring-2 focus:ring-blue-400"
    >
      {children}
    </button>
  );
}

/* Inline SVGs (no extra deps) */
function WhatsAppSVG() {
  return (
    <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#25D366"></circle>
      <path
        fill="#fff"
        d="M24.6 18.7c-.2-.1-2-1-2.3-1.2-.3-.1-.5-.2-.7.1-.2.2-.8 1-1 1.2-.2.2-.4.2-.7.1-2-.8-3.7-2.1-4.9-3.9-.2-.3 0-.5.1-.7.1-.2.3-.4.5-.6.1-.2.2-.3.3-.5.1-.2.1-.4 0-.6 0-.1-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7 0 1.6 1.2 3.1 1.4 3.3.2.2 2.4 3.7 5.8 5.1 3.4 1.4 3.4.9 4 .8.6-.1 2-1 2.3-1.8.3-.8.3-1.6.2-1.8 0-.2-.2-.2-.4-.3z"
      />
    </svg>
  );
}
function TelegramSVG() {
  return (
    <svg viewBox="0 0 240 240" width="18" height="18" aria-hidden="true">
      <circle cx="120" cy="120" r="120" fill="#27A7E7"></circle>
      <path fill="#fff" d="M190 70L170 176c-2 9-7 11-14 7l-40-30-19 18c-2 2-4 3-8 3l3-43 79-70c3-3-1-4-5-1L82 129l-41-13c-9-3-9-9 2-13l140-54c7-3 13 2 10 11z"/>
    </svg>
  );
}
function InstagramSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <linearGradient id="ig" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f58529"/><stop offset="50%" stopColor="#dd2a7b"/><stop offset="100%" stopColor="#8134af"/>
      </linearGradient>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig)"></rect>
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" strokeWidth="2"></circle>
      <circle cx="17.5" cy="6.5" r="1.2" fill="#fff"></circle>
    </svg>
  );
}
function MailSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" fill="#0ea5e9"></rect>
      <path d="M3 6l9 6 9-6" stroke="#fff" strokeWidth="2" fill="none"></path>
    </svg>
  );
}
