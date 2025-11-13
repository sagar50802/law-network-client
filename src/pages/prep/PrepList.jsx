import { useEffect, useState } from "react";
import { getJSON } from "../../utils/api";

const SLIDES = [
  "/backgrounds/bg1.png",
  "/backgrounds/bg2.png",
  "/backgrounds/bg3.png",
];

export default function PrepList() {
  const [exams, setExams] = useState([]);
  const [bgIndex, setBgIndex] = useState(0);

  // Load exam list
  useEffect(() => {
    getJSON("/api/prep/exams")
      .then((r) => setExams(r.exams || []))
      .catch(() => {});
  }, []);

  // Background slideshow (crossfade)
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4000); // 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen">

      {/* --- Crossfade background slideshow ONLY for this page --- */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {SLIDES.map((src, idx) => (
          <img
            key={idx}
            src={src}
            className={
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms]" +
              (idx === bgIndex ? " opacity-100" : " opacity-0")
            }
            alt=""
          />
        ))}

        {/* soft gradient to improve text readability */}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* --- CONTENT layer above slideshow --- */}
      <div className="relative z-10 max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-white drop-shadow">
          Preparation
        </h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((ex) => (
            <a
              key={ex.examId}
              href={`/prep/${encodeURIComponent(ex.examId)}`}
              className="
                p-4 
                rounded-xl 
                border 
                bg-white/90 
                backdrop-blur-md
                shadow-md 
                hover:shadow-xl 
                transition 
              "
            >
              <div className="text-lg font-semibold">{ex.name}</div>
              <div className="text-xs text-gray-500">{ex.examId}</div>
              <div className="mt-2 text-sm text-blue-600">Resume →</div>
            </a>
          ))}

          {exams.length === 0 && (
            <div className="text-gray-100 text-lg drop-shadow">
              No exams yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
