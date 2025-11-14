import { useEffect, useState } from "react";
import { loadBackgroundImages } from "../../utils/loadBackgrounds";

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

  /* -----------------------------------------------
     LOAD BACKGROUNDS
  ----------------------------------------------- */
  useEffect(() => {
    setBackgrounds(loadBackgroundImages());
  }, []);

  /* -----------------------------------------------
     SLIDE UPDATE
  ----------------------------------------------- */
  function updateSlide(idx, patch) {
    setSlides((prev) => {
      const next = [...prev];

      // sanitize patch
      const safePatch = {
        id: patch.id ?? next[idx].id,
        backgroundUrl: patch.backgroundUrl ?? next[idx].backgroundUrl ?? "",
        rawText: patch.rawText ?? next[idx].rawText ?? "",
        highlight: patch.highlight ?? next[idx].highlight ?? "",
      };

      next[idx] = { ...next[idx], ...safePatch };
      return next;
    });
  }

  function addSlide() {
    setSlides((prev) => [
      ...prev,
      { ...EMPTY_SLIDE, id: `s${prev.length + 1}` },
    ]);
  }

  function removeSlide(idx) {
    setSlides((prev) => prev.filter((_, i) => i !== idx));
  }

  /* -----------------------------------------------
     SAVE (POST or PUT)
  ----------------------------------------------- */
  async function handleSave() {
    setSaving(true);
    setError("");

    const payload = {
      title,
      subtitle,
      slug: slug || title.toLowerCase().replace(/\s+/g, "-"),
      slides: slides.map((s, i) => ({
        id: s.id || `s${i + 1}`,
        backgroundUrl: s.backgroundUrl || "",
        rawText: s.rawText || "",
        highlight: s.highlight || "",
      })),
    };

    try {
      const url = existingIssue
        ? `/api/magazines/${existingIssue._id}`
        : `/api/magazines`;

      const method = existingIssue ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error("❌ Server returned HTML instead of JSON:\n", text);
        throw new Error("Server returned invalid JSON (HTML error page)");
      }

      if (!data.ok) {
        throw new Error(data.error || "Save failed");
      }

      onSaved && onSaved(data.issue);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  /* -----------------------------------------------
     DELETE MAGAZINE
  ----------------------------------------------- */
  async function handleDelete() {
    if (!existingIssue) return;
    if (!confirm("Delete this magazine?")) return;

    try {
      const res = await fetch(`/api/magazines/${existingIssue._id}`, {
        method: "DELETE",
      });

      const txt = await res.text();

      let data;
      try {
        data = JSON.parse(txt);
      } catch {
        alert("Invalid JSON response from server");
        return;
      }

      if (!data.ok) {
        alert("Delete failed: " + data.error);
        return;
      }

      alert("Magazine deleted successfully");
      onSaved && onSaved(null);
    } catch {
      alert("Network/server error while deleting");
    }
  }

  /* -----------------------------------------------
     RENDER UI
  ----------------------------------------------- */
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Magazine Editor</h1>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
          {error}
        </div>
      )}

      {/* INPUTS */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs font-semibold">Title</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold">Subtitle</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-semibold">Slug</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          />
        </div>
      </div>

      {/* SLIDES */}
      <div className="space-y-4">
        {slides.map((slide, idx) => (
          <div key={slide.id} className="border rounded-xl p-4 bg-white shadow-sm">
            <div className="flex justify-between mb-2">
              <div className="font-semibold text-sm">Slide {idx + 1}</div>
              {slides.length > 1 && (
                <button
                  onClick={() => removeSlide(idx)}
                  className="text-xs text-red-500"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {/* BACKGROUND */}
              <div>
                <label className="text-xs font-semibold">Background Image</label>

                <select
                  className="mt-1 w-full border rounded px-2 py-2 text-xs"
                  value={slide.backgroundUrl}
                  onChange={(e) =>
                    updateSlide(idx, { backgroundUrl: e.target.value })
                  }
                >
                  <option value="">-- Select background --</option>
                  {backgrounds.map((bg) => (
                    <option key={bg.name} value={bg.url}>
                      {bg.name}
                    </option>
                  ))}
                </select>

                {/* PREVIEW */}
                {slide.backgroundUrl && (
                  <div
                    className="mt-2 h-24 bg-cover bg-center rounded border"
                    style={{ backgroundImage: `url(${slide.backgroundUrl})` }}
                  />
                )}
              </div>

              {/* HIGHLIGHT */}
              <div>
                <label className="text-xs font-semibold">
                  Highlight / Pull Quote
                </label>
                <textarea
                  className="mt-1 w-full border rounded px-3 py-2 text-xs"
                  value={slide.highlight}
                  onChange={(e) =>
                    updateSlide(idx, { highlight: e.target.value })
                  }
                />
              </div>
            </div>

            {/* TEXT */}
            <div className="mt-3">
              <label className="text-xs font-semibold">Slide Text</label>
              <textarea
                className="mt-1 w-full border rounded px-3 py-2 text-xs min-h-[150px]"
                value={slide.rawText}
                onChange={(e) =>
                  updateSlide(idx, { rawText: e.target.value })
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* CONTROLS */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={addSlide}
          className="px-3 py-2 text-xs border rounded bg-gray-50"
        >
          + Add Slide
        </button>

        <button
          disabled={saving}
          onClick={handleSave}
          className="px-4 py-2 text-xs rounded bg-indigo-600 text-white"
        >
          {saving ? "Saving..." : "Save Magazine"}
        </button>

        {existingIssue && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-xs rounded bg-red-600 text-white"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
