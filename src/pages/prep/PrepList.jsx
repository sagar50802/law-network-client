import { useEffect, useState } from "react";
import { getJSON } from "../../utils/api";

const SLIDES = [
  "/backgrounds/bg1.png",
  "/backgrounds/bg2.png",
  "/backgrounds/bg3.png",
];

// fallback image if exam image missing
const FALLBACK_IMG = "/backgrounds/bg1.png";

export default function PrepList() {
  const [exams, setExams] = useState([]);
  const [bgIndex, setBgIndex] = useState(0);

  // Fetch exam list
  useEffect(() => {
    getJSON("/api/prep/exams")
      .then((r) => setExams(r.exams || []))
      .catch(() => {});
  }, []);

  // Background crossfade slideshow
  useEffect(() => {
    const interval = setInterval(
      () => setBgIndex((prev) => (prev + 1) % SLIDES.length),
      4000
    );
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen">

      {/* BACKGROUND CROSSFADE */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {SLIDES.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt=""
            className={
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms]" +
              (idx === bgIndex ? " opacity-100" : " opacity-0")
            }
          />
        ))}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-white drop-shadow">
          Preparation
        </h1>

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
                  shadow-xl
                  border border-white/20
                  backdrop-blur-sm
                  transition
                  hover:scale-[1.03]
                  hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]
                  h-[120px]
                  block
                "
              >

                {/* GLOW BEHIND */}
                <div
                  className="
                    absolute inset-0
                    rounded-xl
                    opacity-60
                    blur-xl
                    bg-gradient-to-br from-blue-400/40 to-purple-400/40
                    group-hover:opacity-90
                    transition
                  "
                ></div>

                {/* IMAGE */}
                <img
                  src={examImg}
                  onError={(e) => (e.target.src = FALLBACK_IMG)}
                  alt=""
                  className="
                    absolute inset-0 
                    w-full h-full object-cover 
                    opacity-70
                    group-hover:opacity-90 
                    group-hover:scale-105 
                    transition duration-500
                    rounded-xl
                  "
                />

                {/* DARK OVERLAY */}
                <div className="absolute inset-0 bg-black/35 rounded-xl"></div>

                {/* TEXT CONTENT */}
                <div className="relative z-10 p-3 text-white flex flex-col justify-end h-full">

                  {/* BADGE */}
                  <span
                    className="
                      absolute top-2 left-2 
                      px-2 py-0.5 bg-white/25 
                      text-xs rounded-full 
                      backdrop-blur-md
                      shadow
                    "
                  >
                    {ex.examId}
                  </span>

                  <div className="text-sm font-semibold leading-tight drop-shadow-lg">
                    {ex.name}
                  </div>

                  <div className="text-xs text-blue-200 mt-0.5 drop-shadow">
                    Resume →
                  </div>
                </div>
              </a>
            );
          })}

          {exams.length === 0 && (
            <div className="text-gray-100 text-lg drop-shadow">No exams yet.</div>
          )}

        </div>
      </div>
    </div>
  );
}
