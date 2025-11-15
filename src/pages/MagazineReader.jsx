import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function MagazineReader() {
  const { slug } = useParams();
  const [issue, setIssue] = useState(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ----------------------------------------------------------
     SAFE GET — prevents "<!doctype>" = invalid JSON 
  ---------------------------------------------------------- */
  async function safeFetchJSON(url) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });

    const text = await res.text();

    // If HTML → bad response
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
      console.error("❌ Server returned HTML instead of JSON.");
      throw new Error("Server returned invalid JSON");
    }

    try {
      return JSON.parse(text);
    } catch {
      console.error("❌ JSON Parse Error. Raw:", text);
      throw new Error("Invalid JSON from server");
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const data = await safeFetchJSON(`/api/magazines/slug/${slug}`);

        if (!data.ok) throw new Error(data.error || "Magazine not found");

        setIssue(data.issue);
      } catch (err) {
        setError(err.message);
        console.error("Magazine load error:", err);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;
  if (!issue) return <div className="p-10 text-center">Magazine not found.</div>;

  const slide = issue.slides?.[idx] || {
    backgroundUrl: "",
    highlight: "",
    rawText: "Content missing for this slide.",
  };

  const bgUrl = slide.backgroundUrl ? `url(${slide.backgroundUrl})` : "none";

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col items-center py-6">
      <h1 className="text-2xl font-bold mb-3">{issue.title}</h1>
      <p className="text-gray-600 mb-6">{issue.subtitle}</p>

      {/* Magazine Page */}
      <div
        className="relative w-[90%] max-w-3xl h-[80vh] bg-white rounded-xl shadow-lg overflow-hidden border"
        style={{
          backgroundImage: bgUrl,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm p-6 overflow-y-auto">
          {slide.highlight && (
            <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-500 rounded shadow-sm italic text-sm">
              {slide.highlight}
            </div>
          )}
          <StyledSlideText text={slide.rawText || ""} />
        </div>
      </div>

      <div className="flex gap-4 mt-6">
        <button
          disabled={idx === 0}
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-40"
        >
          ◀ Previous
        </button>

        <button
          disabled={idx >= issue.slides.length - 1}
          onClick={() => setIdx((i) => i + 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-40"
        >
          Next ▶
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Page {idx + 1} / {issue.slides.length}
      </div>
    </div>
  );
}

function StyledSlideText({ text }) {
  if (!text) return null;

  const lines = text.trim().split("\n").filter((l) => l.trim() !== "");
  const title = lines[0] || "Untitled Slide";
  const paragraphs = lines.slice(1);

  return (
    <div className="text-gray-800 leading-relaxed">
      <h2 className="text-xl font-bold mb-3 underline decoration-indigo-400 decoration-4">
        {title}
      </h2>

      {paragraphs.length === 0 ? (
        <p className="text-sm text-gray-600">(No additional content.)</p>
      ) : (
        paragraphs.map((p, i) => (
          <p key={i} className="mb-3 text-sm">
            {p}
          </p>
        ))
      )}
    </div>
  );
}
