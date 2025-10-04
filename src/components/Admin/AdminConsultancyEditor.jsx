import { useEffect, useState } from "react";
import { API_BASE, getJSON, deleteJSON, authHeaders, absUrl } from "../../utils/api";

/* ---- headers for multipart ---- */
function safeAuthHeaders() {
  const h = (typeof authHeaders === "function" ? authHeaders() : {}) || {};
  const out = {};
  if (h.Authorization) out.Authorization = h.Authorization;
  if (h.authorization) out.authorization = h.authorization;
  if (h["X-Owner-Key"]) out["X-Owner-Key"] = h["X-Owner-Key"];
  if (h["x-owner-key"]) out["x-owner-key"] = h["x-owner-key"];
  return out;
}

/* ---- API ---- */
async function uploadSlide({ title, intro, file, links = {}, waqrFile }) {
  const fd = new FormData();
  fd.append("title", title || "Untitled");
  if (intro != null) fd.append("intro", intro);
  if (file) fd.append("image", file);

  // links
  Object.entries(links).forEach(([k, v]) => fd.append(k, v || ""));
  // optional QR (private)
  if (waqrFile) fd.append("waqr", waqrFile);

  const res = await fetch(`${API_BASE}/consultancy`, {
    method: "POST",
    headers: safeAuthHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(`POST /consultancy ${res.status}`);
  return res.json();
}

async function patchSlide(id, patch = {}) {
  const fd = new FormData();
  if (patch.title != null) fd.append("title", patch.title);
  if (patch.intro != null) fd.append("intro", patch.intro);
  if (patch.file) fd.append("image", patch.file);
  if (patch.waqrFile) fd.append("waqr", patch.waqrFile);
  if (patch.links) {
    Object.entries(patch.links).forEach(([k, v]) => fd.append(k, v ?? ""));
  }
  const res = await fetch(`${API_BASE}/consultancy/${id}`, {
    method: "PATCH",
    headers: safeAuthHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(`PATCH /consultancy/${id} ${res.status}`);
  return res.json();
}

export default function AdminConsultancyEditor() {
  const [slides, setSlides] = useState([]);
  const [busy, setBusy] = useState(false);

  // create form
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [file, setFile] = useState(null);
  const [waqrFile, setWaqrFile] = useState(null);
  const [links, setLinks] = useState({
    whatsapp: "",
    telegram: "",
    instagram: "",
    email: "",
    website: "",
  });

  async function load() {
    const r = await getJSON("/consultancy");
    setSlides(r?.items || r?.slides || []);
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    if (!title.trim()) return alert("Title is required.");
    if (!file) return alert("Choose an image first.");
    setBusy(true);
    try {
      await uploadSlide({
        title: title.trim(),
        intro: intro.trim(),
        file,
        links,
        waqrFile,
      });
      setTitle(""); setIntro(""); setFile(null); setWaqrFile(null);
      setLinks({ whatsapp:"", telegram:"", instagram:"", email:"", website:"" });
      await load();
    } catch (err) {
      console.error(err);
      alert("Failed to create slide");
    } finally {
      setBusy(false);
    }
  }

  async function saveLinks(s, nextLinks) {
    setBusy(true);
    try { await patchSlide(s.id || s._id, { links: nextLinks }); await load(); }
    catch (err) { console.error(err); alert("Failed to update links"); }
    finally { setBusy(false); }
  }
  async function saveTitle(s, newTitle) {
    setBusy(true);
    try { await patchSlide(s.id || s._id, { title: newTitle }); await load(); }
    catch (err) { console.error(err); alert("Failed to update title"); }
    finally { setBusy(false); }
  }
  async function saveIntro(s, newIntro) {
    setBusy(true);
    try { await patchSlide(s.id || s._id, { intro: newIntro }); await load(); }
    catch (err) { console.error(err); alert("Failed to update intro"); }
    finally { setBusy(false); }
  }
  async function replaceImage(s, newFile) {
    if (!newFile) return;
    setBusy(true);
    try { await patchSlide(s.id || s._id, { file: newFile }); await load(); }
    catch (err) { console.error(err); alert("Failed to replace image"); }
    finally { setBusy(false); }
  }
  async function replaceQr(s, newFile) {
    if (!newFile) return;
    setBusy(true);
    try { await patchSlide(s.id || s._id, { waqrFile: newFile }); await load(); }
    catch (err) { console.error(err); alert("Failed to replace WhatsApp QR"); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    if (!confirm("Delete this slide?")) return;
    setBusy(true);
    try { await deleteJSON(`/consultancy/${id}`); await load(); }
    catch (err) { console.error(err); alert("Failed to delete"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Consultancy Slides</h3>
        <span className="text-sm text-gray-500">{slides.length} total</span>
      </header>

      {/* Create new */}
      <form onSubmit={create} className="grid gap-3 border rounded-2xl p-4 bg-white max-w-xl">
        <div className="font-medium">Add new slide</div>

        <input className="border rounded p-2" placeholder="Title (required)"
          value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea value={intro} onChange={(e) => setIntro(e.target.value)}
          placeholder="Short intro to show over the image"
          className="border rounded p-2 min-h-[80px]" />

        <input type="file" accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)} />

        {/* Links */}
        <div className="grid grid-cols-1 gap-2">
          <input className="border rounded p-2" placeholder="WhatsApp deep link (https://wa.me/...)" value={links.whatsapp} onChange={(e) => setLinks(v => ({ ...v, whatsapp: e.target.value }))} />
          <input className="border rounded p-2" placeholder="Telegram link (https://t.me/username)" value={links.telegram} onChange={(e) => setLinks(v => ({ ...v, telegram: e.target.value }))} />
          <input className="border rounded p-2" placeholder="Instagram link (https://instagram.com/handle)" value={links.instagram} onChange={(e) => setLinks(v => ({ ...v, instagram: e.target.value }))} />
          <input className="border rounded p-2" placeholder="Email link (mailto:hello@example.com)" value={links.email} onChange={(e) => setLinks(v => ({ ...v, email: e.target.value }))} />
          <input className="border rounded p-2" placeholder="Website (https://example.com)" value={links.website} onChange={(e) => setLinks(v => ({ ...v, website: e.target.value }))} />
        </div>

        {/* Optional QR (private, not rendered to users) */}
        <label className="text-xs text-gray-600">WhatsApp QR (private, optional)</label>
        <input type="file" accept="image/*" onChange={(e) => setWaqrFile(e.target.files?.[0] || null)} />

        <button className="bg-black text-white px-4 py-2 rounded w-fit disabled:opacity-50"
          disabled={busy || !file || !title.trim()}>
          {busy ? "Saving…" : "Create Slide"}
        </button>
      </form>

      {/* Existing */}
      <div className="grid gap-4">
        {slides.map((s, idx) => (
          <div key={s.id || s._id} className="border rounded-2xl p-4 bg-white grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-gray-500">#{idx + 1}</div>
              <img
                src={s.image ? absUrl(s.image) : ""}
                alt=""
                className="w-full max-h-56 object-contain rounded-lg bg-gray-50"
                loading="lazy"
              />
              <label className="text-sm inline-flex items-center gap-2">
                <span className="px-2 py-1 border rounded">Replace image</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => replaceImage(s, e.target.files?.[0] || null)} />
              </label>

              {/* Private QR upload (not shown to users) */}
              <div className="text-xs text-gray-600 mt-2">WhatsApp QR (private)</div>
              <div className="flex items-center gap-2">
                <label className="text-sm inline-flex items-center gap-2">
                  <span className="px-2 py-1 border rounded">Replace QR</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => replaceQr(s, e.target.files?.[0] || null)} />
                </label>
                {s.whatsappQr ? (
                  <a className="text-xs underline text-gray-500" href={absUrl(s.whatsappQr)} target="_blank" rel="noreferrer">
                    View stored QR
                  </a>
                ) : <span className="text-xs text-gray-400">No QR stored</span>}
              </div>
            </div>

            <div className="grid content-start gap-2">
              <label className="text-sm text-gray-600">Title</label>
              <AutoGrowInput defaultValue={s.title || ""} onSave={(text) => saveTitle(s, text)} />

              <label className="text-sm text-gray-600 mt-2">Intro text</label>
              <AutoGrowTextarea defaultValue={s.intro || ""} onSave={(text) => saveIntro(s, text)} />

              {/* Links editor */}
              <div className="mt-3 grid gap-2">
                <label className="text-sm text-gray-600">Contact links</label>
                <LinksEditor
                  defaultLinks={{
                    whatsapp: s.whatsapp || "",
                    telegram: s.telegram || "",
                    instagram: s.instagram || "",
                    email: s.email || "",
                    website: s.website || "",
                  }}
                  onSave={(next) => saveLinks(s, next)}
                />
              </div>

              <div className="mt-2">
                <button className="px-3 py-1.5 rounded border text-red-600"
                  onClick={() => remove(s.id || s._id)} disabled={busy}>
                  Delete
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Created: {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}
              </div>
            </div>
          </div>
        ))}

        {slides.length === 0 && <div className="text-gray-500 text-sm">No slides yet</div>}
      </div>
    </div>
  );
}

function LinksEditor({ defaultLinks, onSave }) {
  const [val, setVal] = useState(defaultLinks || {});
  const [saving, setSaving] = useState(false);
  useEffect(() => setVal(defaultLinks || {}), [defaultLinks]);

  const set = (k) => (e) => setVal((v) => ({ ...v, [k]: e.target.value }));

  async function save() {
    if (saving) return;
    setSaving(true);
    try { await onSave(val); } finally { setSaving(false); }
  }

  return (
    <div className="grid gap-2">
      <input className="border rounded p-2" placeholder="WhatsApp deep link"
        value={val.whatsapp || ""} onChange={set("whatsapp")} />
      <input className="border rounded p-2" placeholder="Telegram link"
        value={val.telegram || ""} onChange={set("telegram")} />
      <input className="border rounded p-2" placeholder="Instagram link"
        value={val.instagram || ""} onChange={set("instagram")} />
      <input className="border rounded p-2" placeholder="Email (mailto:...)"
        value={val.email || ""} onChange={set("email")} />
      <input className="border rounded p-2" placeholder="Website"
        value={val.website || ""} onChange={set("website")} />
      <div className="flex gap-2">
        <button onClick={save}
          className="px-3 py-1.5 rounded border bg-green-50 text-green-700 disabled:opacity-50"
          disabled={saving}>
          {saving ? "Saving…" : "Save Links"}
        </button>
      </div>
    </div>
  );
}

function AutoGrowTextarea({ defaultValue, onSave }) {
  const [val, setVal] = useState(defaultValue || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => setVal(defaultValue || ""), [defaultValue]);
  async function save() {
    if (saving) return;
    setSaving(true);
    try { await onSave(val); } finally { setSaving(false); }
  }
  return (
    <div className="grid gap-2">
      <textarea value={val} onChange={(e) => setVal(e.target.value)}
        className="border rounded p-2 min-h-[120px]" placeholder="Write a short, friendly intro…" />
      <div className="flex gap-2">
        <button onClick={save} className="px-3 py-1.5 rounded border bg-green-50 text-green-700 disabled:opacity-50" disabled={saving}>
          {saving ? "Saving…" : "Save Intro"}
        </button>
        <button onClick={() => setVal(defaultValue || "")} className="px-3 py-1.5 rounded border" type="button">Reset</button>
      </div>
    </div>
  );
}

function AutoGrowInput({ defaultValue, onSave }) {
  const [val, setVal] = useState(defaultValue || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => setVal(defaultValue || ""), [defaultValue]);
  async function save() {
    if (saving) return;
    if (!val.trim()) return alert("Title cannot be empty.");
    setSaving(true);
    try { await onSave(val.trim()); } finally { setSaving(false); }
  }
  return (
    <div className="flex gap-2">
      <input value={val} onChange={(e) => setVal(e.target.value)}
        className="border rounded p-2 flex-1" placeholder="Title" />
      <button onClick={save} className="px-3 py-1.5 rounded border bg-green-50 text-green-700 disabled:opacity-50" disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
