// client/src/components/NewsTicker.jsx
import { useEffect, useState } from "react";
import IfOwnerOnly from "./common/IfOwnerOnly";
import { getJSON, upload, delJSON, absUrl } from "../utils/api";

export default function NewsTicker() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", link: "", image: null });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const r = await getJSON("/api/news");            // ✅ uses helper
      setItems(r.news || r.items || []);
    } catch (e) {
      console.error("Load news failed:", e);
      setItems([]);
    }
  }
  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    if (!form.title.trim()) return alert("Title is required");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.link)  fd.append("link", form.link.trim());
      if (form.image) fd.append("image", form.image);
      await upload("/api/news", fd);                   // ✅ adds X-Owner-Key + credentials
      setForm({ title: "", link: "", image: null });
      await load();
    } catch (e) {
      alert(`POST /api/news failed\n${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function del(id) {
    try {
      await delJSON(`/api/news/${id}`);                // ✅ helper
      await load();
    } catch (e) {
      alert(`DELETE /api/news/${id} failed\n${e.message}`);
    }
  }

  return (
    <section className="border-y bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Ticker row */}
        <div className="flex gap-6 overflow-x-auto items-center">
          {items.length === 0 && <div className="text-gray-400">No news yet</div>}
          {items.map((n) => (
            <div key={n.id} className="flex items-center gap-3 shrink-0">
              {n.image ? (
                <img
                  src={absUrl(n.image)}                 // ✅ absolute via helper
                  alt=""
                  className="w-12 h-12 object-cover rounded-lg"
                  loading="lazy"
                />
              ) : null}
              {n.link ? (
                <a className="text-blue-600 hover:underline" href={n.link} target="_blank" rel="noreferrer">
                  {n.title}
                </a>
              ) : (
                <span className="text-gray-800">{n.title}</span>
              )}
              <IfOwnerOnly>
                <button className="text-xs text-red-600" onClick={() => del(n.id)}>
                  Delete
                </button>
              </IfOwnerOnly>
            </div>
          ))}
        </div>

        {/* Admin mini form */}
        <IfOwnerOnly>
          <form onSubmit={add} className="flex flex-wrap gap-2 items-center mt-3">
            <input
              className="border rounded p-2"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className="border rounded p-2 min-w-[260px]"
              placeholder="Link https:// (optional)"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />
            <label className="border rounded p-2 cursor-pointer">
              Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null })}
              />
            </label>
            <button className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" disabled={saving}>
              {saving ? "Saving…" : "Add"}
            </button>
          </form>
        </IfOwnerOnly>
      </div>
    </section>
  );
}
