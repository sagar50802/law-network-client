import { useState } from "react";

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
    existingIssue?.slides?.length ? existingIssue.slides : [{ ...EMPTY_SLIDE, id: "s1" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateSlide(idx, patch) {
    setSlides((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addSlide() {
    setSlides((prev) => [
      ...prev,
      {
        ...EMPTY_SLIDE,
        id: "s" + (prev.length + 1),
      },
    ]);
  }

  function removeSlide(idx) {
    setSlides((prev) => prev.filter((_, i) => i !== idx));
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
      const method = existingIssue ? "PUT" : "POST";
      const url = existingIssue
        ? `/api/magazines/${existingIssue._id}`
        : `/api/magazines`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save magazine");

      const data = await res.json();
      onSaved && onSaved(data.issue);
    } catch (e) {
      setError(e.message || "Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      "Are you sure you want to delete this magazine? This cannot be undone."
    );

    if (!ok) return;

    try {
      const res = await fetch(`/api/magazines/${existingIssue._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!data.ok) {
        alert("Delete failed: " + data.error);
        return;
      }

      alert("Magazine deleted successfully!");
      onSaved && onSaved(null);
    } catch (err) {
      alert("Server error while deleting");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Magazine Editor</h1>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs font-semibold text-gray-700">Title</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="eg. Indian Constitution: Foundations & Future"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Subtitle</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="A LawPrepX visual magazine for law students"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700">Slug (URL)</label>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="indian-constitution-basics"
          />
        </div>
      </div>

      <div className="space-y-4">
        {slides.map((slide, idx) => (
          <div
            key={slide.id || idx}
            className="border rounded-xl p-3 md:p-4 bg-white shadow-sm"
          >
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold text-sm">Slide {idx + 1}</div>
              {slides.length > 1 && (
                <button
                  onClick={() => removeSlide(idx)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Background Image URL
                </label>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-1.5 text-xs"
                  value={slide.backgroundUrl}
                  onChange={(e) => updateSlide(idx, { backgroundUrl: e.target.value })}
                  placeholder="/backgrounds/courtroom.jpg"
                />
                {slide.backgroundUrl && (
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-500 mb-1">Preview</div>
                    <div
                      className="w-full h-24 rounded-lg bg-cover bg-center border"
                      style={{ backgroundImage: `url(${slide.backgroundUrl})` }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">
                  Highlight / Pull Quote (optional)
                </label>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-1.5 text-xs min-h-[80px]"
                  value={slide.highlight || ""}
                  onChange={(e) => updateSlide(idx, { highlight: e.target.value })}
                  placeholder="The Constitution is a living document..."
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-700">
                Slide Text (plain text, system will style it)
              </label>
              <textarea
                className="mt-1 w-full border rounded-lg px-3 py-2 text-xs min-h-[160px]"
                value={slide.rawText}
                onChange={(e) => updateSlide(idx, { rawText: e.target.value })}
                placeholder="Paste long text here. First line will be treated as local title..."
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={addSlide}
          className="px-3 py-2 text-xs rounded-lg border bg-gray-50 hover:bg-gray-100"
        >
          + Add Slide
        </button>

        <button
          disabled={saving}
          onClick={handleSave}
          className="px-4 py-2 text-xs md:text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {saving ? "Saving..." : "Save Magazine"}
        </button>

        {existingIssue && (
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-xs md:text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Delete Magazine
          </button>
        )}
      </div>
    </div>
  );
}
