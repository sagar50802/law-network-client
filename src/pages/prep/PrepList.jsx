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
                  rounded-2xl 
                  overflow-hidden 
                  bg-white/90 
                  backdrop-blur 
                  border 
                  shadow-lg 
                  hover:shadow-2xl 
                  transition 
                  block
                "
              >

                {/* 🔥 IMAGE with clip-path top */}
                <div
                  className="
                    relative 
                    h-40 
                    overflow-hidden 
                    [clip-path:polygon(0_0,100%_0,100%_85%,0_100%)]
                  "
                >
                  <img
                    src={examImg}
                    onError={(e) => (e.target.src = FALLBACK_IMG)}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    alt=""
                  />

                  {/* 🔥 CATEGORY BADGE */}
                  <span className="
                    absolute top-2 left-2 
                    px-3 py-1 
                    bg-black/70 
                    text-white text-xs 
                    rounded-full 
                    backdrop-blur 
                    shadow
                  ">
                    {ex.examId}
                  </span>
                </div>

                {/* TEXT AREA */}
                <div className="p-4">
                  <div className="text-lg font-semibold">{ex.name}</div>
                  <div className="text-xs text-gray-500">{ex.examId}</div>

                  <div className="mt-3 inline-block text-blue-700 font-medium">
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
