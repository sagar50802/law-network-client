import { useEffect, useState } from "react";
import { getJSON } from "../../utils/api";

const SLIDES = [
  "/backgrounds/bg1.png",
  "/backgrounds/bg2.png",
  "/backgrounds/bg3.png",
];

// fallback if exam image missing
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
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* 🔥 CONTENT ABOVE */}
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
                  rounded-2xl
                  overflow-hidden
                  shadow-xl
                  transition
                  hover:scale-[1.03]
                  hover:shadow-2xl
                  border border-white/20
                  backdrop-blur-sm
                "
              >

                {/* 🌈 FULL IMAGE BACKGROUND TILE */}
                <img
                  src={examImg}
                  onError={(e) => (e.target.src = FALLBACK_IMG)}
                  className="absolute inset-0 w-full h-full object-cover transition duration-500 group-hover:scale-105"
                  alt=""
                />

                {/* DARK OVERLAY FOR READABILITY */}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition"></div>

                {/* 🌟 CARD CONTENT ON TOP OF IMAGE */}
                <div className="relative z-10 p-5 text-white">
                  
                  {/* CATEGORY BADGE */}
                  <span className="
                    inline-block mb-3
                    px-3 py-1
                    bg-white/20
                    text-white text-xs
                    rounded-full
                    backdrop-blur-md
                    shadow
                  ">
                    {ex.examId}
                  </span>

                  {/* NAME */}
                  <div className="text-xl font-semibold drop-shadow">
                    {ex.name}
                  </div>

                  {/* RESUME BUTTON */}
                  <div className="
                    mt-3 inline-block
                    px-3 py-1
                    bg-white/25
                    text-white text-sm
                    rounded-lg
                    shadow
                    backdrop-blur
                    group-hover:bg-white/35
                    transition
                  ">
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
