import { useEffect, useState } from "react";
import IfOwnerOnly from "./common/IfOwnerOnly";
import { getJSON, upload, delJSON, absUrl } from "../utils/api";

export default function NewsTicker() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", link: "", image: null });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const r = await getJSON("/api/news");
      setItems(r.news || r.items || []);
    } catch (e) {
      console.error("Load news failed:", e);
      setItems([]);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e) {
    e.preventDefault();
    if (!form.title.trim()) return alert("Title is required");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      if (form.link?.trim()) fd.append("link", form.link.trim());
      if (form.image) fd.append("image", form.image);
      await upload("/api/news", fd);
      setForm({ title: "", link: "", image: null });
      await load();
    } catch (e) {
      alert(`POST /api/news failed\n${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  async function del(id) {
    try {
      await delJSON(`/api/news/${id}`);
      await load();
    } catch (e) {
      alert(`DELETE /api/news/${id} failed\n${e.message || e}`);
    }
  }

  return (
    <section className="relative border-y bg-white shadow-sm">
      {/* ★ Stylish animated bar on top */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500 animate-pulse" />

      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Ticker Row */}
        <div className="flex gap-6 overflow-x-auto items-center py-1 ticker-scroll">
          {items.length === 0 && (
            <div className="text-gray-400">No news yet</div>
          )}

          {items.map((n) => (
            <div
              key={n.id || n._id}
              className="flex items-center gap-3 shrink-0 bg-white px-3 py-2 rounded-xl shadow hover:shadow-md transition"
            >
              {n.image && (
                <img
                  src={absUrl(n.image)}
                  alt=""
                  className="h-10 w-10 object-cover rounded-lg shadow-sm"
                  loading="lazy"
                  onError={(ev) => (ev.currentTarget.style.display = "none")}
                />
              )}

              {n.link ? (
                <a
                  href={n.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-medium whitespace-nowrap hover:underline"
                >
                  {n.title}
                </a>
              ) : (
                <span className="text-gray-800 font-medium whitespace-nowrap">
                  {n.title}
                </span>
              )}

              <IfOwnerOnly>
                <button
                  className="text-xs text-red-600 hover:underline ml-2"
                  onClick={() => del(n.id || n._id)}
                >
                  Delete
                </button>
              </IfOwnerOnly>
            </div>
          ))}
        </div>

        {/* Admin Form */}
        <IfOwnerOnly>
          <form
            onSubmit={add}
            className="flex flex-wrap gap-2 items-center mt-3"
          >
            <input
              className="border rounded p-2"
              placeholder="Title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
            />
            <input
              className="border rounded p-2 min-w-[260px]"
              placeholder="Link https:// (optional)"
              value={form.link}
              onChange={(e) =>
                setForm({ ...form, link: e.target.value })
              }
            />

            <label className="border rounded p-2 cursor-pointer">
              Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setForm({
                    ...form,
                    image: e.target.files?.[0] || null,
                  })
                }
              />
            </label>

            <button
              className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Saving…" : "Add"}
            </button>
          </form>
        </IfOwnerOnly>
      </div>

      {/* Extra bottom glow */}
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-60" />
    </section>
  );
}
