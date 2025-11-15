import { useEffect, useState } from "react";
import { loadBackgroundImages } from "../../utils/loadBackgrounds";

const API_BASE = import.meta.env.VITE_BACKEND_URL;
function api(path) {
  return `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
}

async function safeFetchJSON(path, options = {}) {
  const res = await fetch(api(path), {
    ...options,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });

  const text = await res.text();
  if (!text || text.startsWith("<")) throw new Error("Invalid JSON from server");

  return JSON.parse(text);
}

const EMPTY_SLIDE = {
  id: "",
  backgroundUrl: "",
  rawText: "",
  highlight: "",
};

export default function MagazineAdminEditor({ existingIssue, onSaved }) {
  const [title, setTitle] = useState(existingIssue?.title || "");
  const [subtitle, setSubtitle] = useState(existingIssue?.subtitle || "");
  const [slug, setSlug] = useState(existingIssue?.slug || "");
  const [slides, setSlides] = useState(
    existingIssue?.slides?.length
      ? existingIssue.slides
      : [{ ...EMPTY_SLIDE, id: "s1" }]
  );

  const [backgrounds, setBackgrounds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setBackgrounds(loadBackgroundImages());
  }, []);

  function updateSlide(idx, patch) {
    setSlides((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const payload = {
      title,
      subtitle,
      slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
      slides: slides.map((s, i) => ({
        ...s,
        id: s.id || `s${i + 1}`,
      })),
    };

    try {
      const method = existingIssue?._id ? "PUT" : "POST";
      const path = existingIssue?._id
        ? `/magazines/${existingIssue._id}`
        : `/magazines`;

      const data = await safeFetchJSON(path, {
        method,
        body: JSON.stringify(payload),
      });

      if (!data.ok) throw new Error(data.error);
      onSaved && onSaved(data.issue);
    } catch (err) {
      setError(err.message);
    }

    setSaving(false);
  }

  async function handleDelete() {
    if (!existingIssue?._id) return;
    if (!window.confirm("Delete magazine?")) return;

    try {
      const data = await safeFetchJSON(`/magazines/${existingIssue._id}`, {
        method: "DELETE",
      });

      if (!data.ok) throw new Error(data.error);
      onSaved(null);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-3">Magazine Editor</h1>

      {error && (
        <div className="text-red-600 bg-red-50 border p-2 rounded mb-3">
          {error}
        </div>
      )}

      {/* FORM */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border rounded w-full p-2"
          />
        </div>

        <div>
          <label className="text-xs">Subtitle</label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="border rounded w-full p-2"
          />
        </div>

        <div>
          <label className="text-xs">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="border rounded w-full p-2"
          />
        </div>
      </div>

      {/* SLIDES */}
      {slides.map((s, idx) => (
        <div key={idx} className="border p-4 rounded mb-4">
          <div className="font-semibold mb-2">Slide {idx + 1}</div>

          <label className="text-xs">Background</label>
          <select
            value={s.backgroundUrl}
            onChange={(e) => updateSlide(idx, { backgroundUrl: e.target.value })}
            className="border w-full p-2 mb-2"
          >
            <option value="">-- select background --</option>
            {backgrounds.map((b) => (
              <option key={b.name} value={b.url}>
                {b.name}
              </option>
            ))}
          </select>

          <label className="text-xs">Highlight</label>
          <textarea
            value={s.highlight}
            onChange={(e) => updateSlide(idx, { highlight: e.target.value })}
            className="border w-full p-2 mb-2"
          />

          <label className="text-xs">Text</label>
          <textarea
            value={s.rawText}
            onChange={(e) => updateSlide(idx, { rawText: e.target.value })}
            className="border w-full p-2 min-h-[120px]"
          />
        </div>
      ))}

      {/* BUTTONS */}
      <button
        onClick={() =>
          setSlides((prev) => [
            ...prev,
            { ...EMPTY_SLIDE, id: `s${prev.length + 1}` },
          ])
        }
        className="px-3 py-2 border rounded mr-2"
      >
        + Add Slide
      </button>

      <button
        disabled={saving}
        onClick={handleSave}
        className="px-4 py-2 bg-indigo-600 text-white rounded"
      >
        {saving ? "Saving…" : "Save Magazine"}
      </button>

      {existingIssue?._id && (
        <button
          onClick={handleDelete}
          className="ml-2 px-4 py-2 bg-red-600 text-white rounded"
        >
          Delete
        </button>
      )}
    </div>
  );
}
