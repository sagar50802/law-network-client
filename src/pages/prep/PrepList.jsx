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

  // Load exam list
  useEffect(() => {
    getJSON("/api/prep/exams")
      .then((r) => setExams(r.exams || []))
      .catch(() => {});
  }, []);

  // Background slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen">

      {/* 🔥 BACKGROUND CROSSFADE */}
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
        <div className="absolute inset-0 bg-black/25"></div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-white drop-shadow">
          Preparation
        </h1>

        {/* ===== Exam Cards ===== */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {exams.map((ex) => {
            const examImg = `/backgrounds/${ex.examId}.png`;

            return (
              <a
                key={ex.examId}
                href={`/prep/${encodeURIComponent(ex.examId)}`}
                className="
                  group
                  relative
                  rounded-xl
                  overflow-hidden
                  shadow-lg
                  border border-white/20
                  backdrop-blur-sm
                  transition
                  hover:scale-[1.03]
                "
                style={{ height: "180px" }}   // 🔥 FIXED SMALL CARD SIZE
              >

                {/* IMAGE */}
                <img
                  src={examImg}
                  onError={(e) => (e.target.src = FALLBACK_IMG)}
                  className="
                    absolute inset-0 w-full h-full object-cover 
                    group-hover:scale-105 transition duration-500
                  "
                  alt=""
                />

                {/* OVERLAY */}
                <div className="absolute inset-0 bg-black/40"></div>

                {/* TEXT ON IMAGE */}
                <div className="relative z-10 p-4 text-white flex flex-col justify-end h-full">

                  {/* BADGE */}
                  <span
                    className="
                      absolute top-2 left-2 
                      px-2 py-1 bg-white/20 
                      text-xs rounded-full 
                      backdrop-blur-md
                    "
                  >
                    {ex.examId}
                  </span>

                  <div className="text-lg font-semibold drop-shadow">
                    {ex.name}
                  </div>

                  <div
                    className="
                      text-sm text-blue-200 
                      font-medium mt-1
                    "
                  >
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
