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

// Patch (image replace)
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

  // Vertical auto-scroll
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

          if (next <= 0) { next = 0; dirRef.cur = 1; holdUntil = now + DWELL; }
          else if (next >= max) { next = max; dirRef.cur = -1; holdUntil = now + DWELL; }

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
      pause();
      clearTimeout(wheelTO);
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
    <section className="mt-0" id="consultancy">
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
            <button className="text-xs px-2 py-1 rounded border" onClick={() => getJSON("/api/consultancy").then(r=>setItems(r.items||[]))} disabled={busy}>
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
  const links = {
    whatsapp: item.whatsapp || "",
    telegram: item.telegram || "",
    instagram: item.instagram || "",
    email: item.email || "",
    website: item.website || "",
  };
  const hasAnyContact = Object.values(links).some(Boolean);

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

        {hasAnyContact && (
          <div className="mt-3 flex items-center gap-3">
            {links.whatsapp && (
              <IconButton label="Chat on WhatsApp" onClick={() => window.open(links.whatsapp, "_blank", "noopener")}>
                <WhatsAppSVG />
              </IconButton>
            )}
            {links.telegram && (
              <IconButton label="Open Telegram" onClick={() => window.open(links.telegram, "_blank", "noopener")}>
                <TelegramSVG />
              </IconButton>
            )}
            {links.instagram && (
              <IconButton label="Open Instagram" onClick={() => window.open(links.instagram, "_blank", "noopener")}>
                <InstagramSVG />
              </IconButton>
            )}
            {links.email && (
              <IconButton label="Send Email" onClick={() => window.open(links.email, "_blank", "noopener")}>
                <MailSVG />
              </IconButton>
            )}
            {links.website && (
              <IconButton label="Open Website" onClick={() => window.open(links.website, "_blank", "noopener")}>
                <LinkSVG />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center w-8 h-8 rounded-full border hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      {children}
    </button>
  );
}
function WhatsAppSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#25D366" d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 2 0.6 3.9 1.7 5.5L2 22l4.8-1.8c1.6 1 3.4 1.5 5.3 1.5 5.4 0 9.8-4.4 9.8-9.8S17.44 2 12.04 2z"/>
      <path fill="#fff" d="M16.79 14.64c-.2.56-1.14 1.06-1.6 1.1-.46.03-1.03.04-1.66-.1-.38-.08-.87-.28-1.5-.58a9.63 9.63 0 01-3.3-2.88 6.52 6.52 0 01-1.34-2.56c-.18-.7-.02-1.28.12-1.52.14-.24.3-.4.5-.44l.37-.06c.12 0 .27.02.42.33.15.31.5 1.2.55 1.29.04.1.07.2.02.32-.05.12-.08.2-.16.3-.08.1-.18.23-.26.31-.08.08-.17.18-.08.35.1.17.42.7.91 1.12.62.55 1.14.91 1.66 1.14.2.1.34.09.46-.05.12-.14.53-.62.68-.84.15-.22.29-.18.48-.1.2.1 1.24.58 1.45.68.21.1.35.16.4.25.05.09.05.5-.15 1.06z"/>
    </svg>
  );
}
function TelegramSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#27A7E7" d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
      <path fill="#fff" d="M17.6 8.1L15.9 16c-.13.58-.49.72-.99.45l-2.7-1.99-1.3 1.25c-.14.14-.26.26-.53.26l.19-2.73 4.97-4.49c.22-.19-.05-.3-.34-.1l-6.16 3.88-2.64-.83c-.57-.18-.58-.58.12-.86l10.3-3.98c.47-.17.88.12.73.86z"/>
    </svg>
  );
}
function InstagramSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" ry="5" fill="#E1306C"/>
      <circle cx="12" cy="12" r="4.2" fill="#fff"/>
      <circle cx="17.2" cy="6.8" r="1.4" fill="#fff"/>
    </svg>
  );
}
function MailSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M3 5h18v14H3z" fill="#111827" opacity=".08"/>
      <path d="M3 7l9 6 9-6" fill="none" stroke="#111827" strokeWidth="2"/>
      <rect x="3" y="5" width="18" height="14" rx="2" ry="2" fill="none" stroke="#111827" strokeWidth="2"/>
    </svg>
  );
}
function LinkSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M10 13a5 5 0 007.07 0l1.41-1.41a5 5 0 00-7.07-7.07L9 6" fill="none" stroke="#111827" strokeWidth="2"/>
      <path d="M14 11a5 5 0 01-7.07 0L5.5 9.57a5 5 0 017.07-7.07L15 4" fill="none" stroke="#111827" strokeWidth="2"/>
    </svg>
  );
}
