import { useEffect, useState } from "react";
import { getJSON } from "../../utils/api";

const SLIDES = [
  "/backgrounds/bg1.png",
  "/backgrounds/bg2.png",
  "/backgrounds/bg3.png",
];

const FALLBACK_IMG = "/backgrounds/bg1.png";

export default function PrepList() {
  const [exams, setExams] = useState([]);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    getJSON("/api/prep/exams")
      .then((r) => setExams(r.exams || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen">

      {/* BACKGROUND FADE */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {SLIDES.map((src, idx) => (
          <img
            key={idx}
            src={src}
            className={
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms]" +
              (idx === bgIndex ? " opacity-100" : " opacity-0")
            }
            alt="bg"
          />
        ))}
        <div className="absolute inset-0 bg-black/25"></div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-white drop-shadow text-center">
          Preparation
        </h1>

        {/* CARDS GRID */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">

          {exams.map((ex) => {
            const examImg = `/backgrounds/${ex.examId}.png`;

            return (
              <a
                key={ex.examId}
                href={`/prep/${encodeURIComponent(ex.examId)}`}
                className="
                  group
                  w-[260px]
                  mx-auto
                  rounded-2xl 
                  overflow-hidden 
                  bg-white/90 
                  backdrop-blur 
                  border border-white/20
                  shadow-xl 
                  hover:shadow-2xl 
                  transition 
                  block 
                  relative
                "
              >

                {/* GLOW */}
                <div className="
                  absolute inset-0 
                  rounded-2xl 
                  bg-white/10 
                  blur-xl 
                  opacity-0 
                  group-hover:opacity-100 
                  transition 
                "></div>

                {/* TOP IMAGE — SMALLER */}
                <div className="relative h-24 overflow-hidden rounded-t-2xl">
                  <img
                    src={examImg}
                    onError={(e) => (e.target.src = FALLBACK_IMG)}
                    alt="exam"
                    className="
                      w-full h-full object-cover
                      brightness-110 contrast-110 saturate-125
                      group-hover:brightness-125 
                      group-hover:scale-105
                      transition duration-500
                    "
                  />

                  <span
                    className="
                      absolute top-1.5 left-1.5
                      px-2 py-0.5
                      bg-black/70 
                      text-white text-[10px]
                      rounded-full 
                      shadow
                    "
                  >
                    {ex.examId}
                  </span>
                </div>

                {/* TEXT SECTION — COMPACT */}
                <div className="p-3">
                  <div className="text-[16px] font-semibold text-gray-900">
                    {ex.name}
                  </div>
                  <div className="text-[11px] text-gray-500">{ex.examId}</div>

                  <div className="mt-2 inline-block text-blue-700 font-medium text-sm">
                    Resume →
                  </div>
                </div>
              </a>
            );
          })}

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
