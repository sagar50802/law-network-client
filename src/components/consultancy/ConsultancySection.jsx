// client/src/components/ConsultancySection.jsx
import { useEffect, useRef, useState } from "react";
import {
  API_BASE,            // kept (even if unused sometimes)
  authHeaders,
  getJSON,
  upload as uploadApi,
  deleteJSON,
  buildUrl,            // ✅ prevents /api/api duplication
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
  // ✅ use central upload helper with a RELATIVE path
  return uploadApi("/api/consultancy", fd, { headers: safeAuthHeaders() });
}

// Patch (needs PATCH verb, so use fetch but build URL safely)
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
      // ✅ relative path via helper (avoids /api/api)
      const r = await getJSON("/api/consultancy");
      setItems(r?.items || r?.slides || []);
    } catch (e) {
      console.error("Consultancy load failed:", e);
    }
  }
  useEffect(() => { load(); }, []);

  // Vertical auto-scroll with smooth up<->down reversal + dwell at ends
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
            next = 0;
            dirRef.cur = 1;
            holdUntil = now + DWELL;
          } else if (next >= max) {
            next = max;
            dirRef.cur = -1;
            holdUntil = now + DWELL;
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
                className="px-3 py-1 rounded bg-black text-white disabled:opacity-50 text-xs"
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

/* ---------- Card (with contact icons) ---------- */
function Card({ item, onReplace, onDelete }) {
  const links = {
    whatsapp: item.whatsapp || "",
    telegram: item.telegram || "",
    instagram: item.instagram || "",
    email: item.email || "",
    website: item.website || "",
  };
  const hasAnyContact = Object.values(links).some(Boolean);

  const openLink = (url, kind) => {
    if (!url) return;
    // If admin typed a plain email address, convert to mailto:
    if (kind === "email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) {
      url = `mailto:${url}`;
    }
    window.open(url, "_blank", "noopener");
  };

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
          <div className="mt-3 flex items-center gap-2">
            {links.whatsapp && (
              <IconButton label="Chat on WhatsApp" onClick={() => openLink(links.whatsapp, "whatsapp")}>
                <WhatsAppSVG />
              </IconButton>
            )}
            {links.telegram && (
              <IconButton label="Open Telegram" onClick={() => openLink(links.telegram, "telegram")}>
                <TelegramSVG />
              </IconButton>
            )}
            {links.instagram && (
              <IconButton label="Open Instagram" onClick={() => openLink(links.instagram, "instagram")}>
                <InstagramSVG />
              </IconButton>
            )}
            {links.email && (
              <IconButton label="Send Email" onClick={() => openLink(links.email, "email")}>
                <MailSVG />
              </IconButton>
            )}
            {links.website && (
              <IconButton label="Open Website" onClick={() => openLink(links.website, "website")}>
                <LinkSVG />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- tiny UI helpers ---------- */
function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex items-center justify-center w-8 h-8 rounded-full border bg-white hover:bg-gray-50 active:scale-95 transition"
    >
      {children}
    </button>
  );
}

function WhatsAppSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M20.52 3.48A11.94 11.94 0 0012.05 0C5.44.03.07 5.4.1 12.02A11.9 11.9 0 001.8 17.7L0 24l6.47-1.68a11.95 11.95 0 0017.42-10.3c.02-3.19-1.22-6.2-3.37-8.54zM12.05 21.2a9.17 9.17 0 01-4.67-1.27l-.34-.2-3.83 1L3.3 16l-.22-.36a9.18 9.18 0 1116.86-4.2 9.15 9.15 0 01-7.9 9.76z"
        fill="#25D366"
      />
      <path
        d="M17.26 14.02c-.3-.15-1.78-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07a7.55 7.55 0 01-2.22-1.37 8.28 8.28 0 01-1.53-1.9c-.17-.3 0-.46.13-.61.14-.15.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37 0-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.48 1.06 2.9 1.22 3.1.15.2 2.1 3.22 5.1 4.51.71.31 1.26.5 1.7.64.72.23 1.37.2 1.88.12.57-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.14-.28-.22-.58-.37z"
        fill="#25D366"
      />
    </svg>
  );
}

function TelegramSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M9.036 15.082l-.375 5.285c.537 0 .769-.231 1.046-.507l2.51-2.41 5.205 3.818c.954.526 1.632.25 1.892-.884l3.432-16.06.001-.002c.304-1.414-.511-1.963-1.438-1.62L1.11 9.404c-1.37.53-1.35 1.292-.234 1.638l5.676 1.77L19.31 6.07c.613-.373 1.17-.167.712.206z" fill="#26A7E3"/>
    </svg>
  );
}

function InstagramSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 2.2c3.2 0 3.584.012 4.85.07 1.17.055 1.97.24 2.43.4a4.9 4.9 0 011.77 1.15 4.9 4.9 0 011.15 1.77c.16.46.346 1.26.4 2.43.058 1.266.07 1.65.07 4.85s-.012 3.584-.07 4.85c-.055 1.17-.24 1.97-.4 2.43a4.9 4.9 0 01-1.15 1.77 4.9 4.9 0 01-1.77 1.15c-.46.16-1.26.346-2.43.4-1.266.058-1.65.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.055-1.97-.24-2.43-.4a4.9 4.9 0 01-1.77-1.15 4.9 4.9 0 01-1.15-1.77c-.16-.46-.346-1.26-.4-2.43C2.212 15.584 2.2 15.2 2.2 12s.012-3.584.07-4.85c.055-1.17.24-1.97.4-2.43a4.9 4.9 0 011.15-1.77A4.9 4.9 0 015.59.97c.46-.16 1.26-.346 2.43-.4C9.284.512 9.668.5 12 .5z" fill="#262626"/>
      <circle cx="18.5" cy="5.5" r="1.5" fill="#262626"/>
      <circle cx="12" cy="12" r="3.5" fill="none" stroke="#262626" strokeWidth="2"/>
    </svg>
  );
}

function MailSVG() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v.01L12 13l8-6.99V6H4z" fill="#111827"/>
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
