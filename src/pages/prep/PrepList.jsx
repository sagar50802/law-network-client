import { useEffect, useState } from "react";
import { getJSON, absUrl } from "../../utils/api";

// 🎨 Background images (only for /prep page)
const BG_IMAGES = [
  "/backgrounds/bg1.png",
  "/backgrounds/bg2.png",
  "/backgrounds/bg3.png",
];

export default function PrepList() {
  const [exams, setExams] = useState([]);
  const [bgIndex, setBgIndex] = useState(0);

  // fetch exam list (your original logic)
  useEffect(() => {
    getJSON("/api/prep/exams")
      .then((r) => setExams(r.exams || []))
      .catch(() => {});
  }, []);

  // 🎞 Background slideshow — ONLY for this page
  useEffect(() => {
    if (BG_IMAGES.length <= 1) return;
    const id = setInterval(() => {
      setBgIndex((i) => (i + 1) % BG_IMAGES.length);
    }, 4000); // 4s crossfade
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative max-w-5xl mx-auto p-4">

      {/* 🔥 Local background slideshow (does NOT affect inner prep pages) */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        {BG_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ${
              i === bgIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}

        {/* subtle white overlay for readability */}
        <div className="absolute inset-0 bg-white/85" />
      </div>

      {/* ---- Main Content (unchanged) ---- */}
      <h1 className="text-2xl font-bold mb-4">Preparation</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map((ex) => (
          <a
            key={ex.examId}
            href={`/prep/${encodeURIComponent(ex.examId)}`}
            className="p-4 rounded-xl border bg-white hover:shadow transition"
          >
            <div className="text-lg font-semibold">{ex.name}</div>
            <div className="text-xs text-gray-500">{ex.examId}</div>
            <div className="mt-2 text-sm text-blue-600">Resume →</div>
          </a>
        ))}

        {exams.length === 0 && (
          <div className="text-gray-500">No exams yet.</div>
        )}
      </div>
    </div>
  );
}
