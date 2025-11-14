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

  useEffect(() => { load(); }, []);

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
    <section className="border-y bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">

        {/* ===== TICKER ROW ===== */}
        <div
          className="
            flex gap-6 overflow-x-auto items-center ticker-scroll
            py-1
          "
        >
          {items.length === 0 && (
            <div className="text-gray-400 italic">No news yet</div>
          )}

          {items.map((n) => (
            <div
              key={n.id || n._id}
              className="
                flex items-center gap-3 shrink-0 px-3 py-1
                bg-gray-50 border rounded-xl shadow-sm
                hover:shadow-md transition
              "
            >
              {n.image && (
                <img
                  src={absUrl(n.image)}
                  alt=""
                  className="h-10 w-10 object-cover rounded-lg shadow-sm"
                  loading="lazy"
                  onError={(ev) => { ev.currentTarget.style.display = "none"; }}
                />
              )}

              {n.link ? (
                <a
                  className="font-medium text-blue-600 hover:underline"
                  href={n.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {n.title}
                </a>
              ) : (
                <span className="font-medium text-gray-800">{n.title}</span>
              )}

              <IfOwnerOnly>
                <button
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => del(n.id || n._id)}
                >
                  Delete
                </button>
              </IfOwnerOnly>
            </div>
          ))}
        </div>

        {/* ===== ADMIN INPUT FORM ===== */}
        <IfOwnerOnly>
          <form
            onSubmit={add}
            className="flex flex-wrap gap-2 items-center mt-4"
          >
            <input
              className="border rounded p-2 focus:ring focus:ring-blue-200"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <input
              className="border rounded p-2 min-w-[260px] focus:ring focus:ring-blue-200"
              placeholder="Link https:// (optional)"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
            />

            <label
              className="
                border rounded p-2 cursor-pointer
                bg-gray-100 hover:bg-gray-200 transition
              "
            >
              Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  setForm({ ...form, image: e.target.files?.[0] || null })
                }
              />
            </label>

            <button
              className="
                bg-black text-white px-4 py-2 rounded 
                hover:bg-gray-800 transition
                disabled:opacity-50
              "
              disabled={saving}
            >
              {saving ? "Saving…" : "Add"}
            </button>
          </form>
        </IfOwnerOnly>
      </div>

      {/* ===== LOCAL TICKER CSS (SAFE — ONLY AFFECTS THIS COMPONENT) ===== */}
      <style>{`
        .ticker-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .ticker-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
        }
        .ticker-scroll {
          scroll-behavior: smooth;
        }
      `}</style>
    </section>
  );
}
