import { useEffect, useState } from "react";
import { getJSON } from "../utils/api";
import { Link, useNavigate } from "react-router-dom";

// Background slideshow images
const BACKGROUND_IMAGES = [
  "/backgrounds/bg1.png",
  "/backgrounds/bg2.png",
  "/backgrounds/bg3.png",
  "/backgrounds/bg4.png",
];

export default function PreparationPage() {
  const [exams, setExams] = useState([]);
  const [bgIndex, setBgIndex] = useState(0);

  const email = localStorage.getItem("userEmail") || "";
  const navigate = useNavigate();

  // Fetch exams + progress
  useEffect(() => {
    (async () => {
      const r = await getJSON("/api/exams");
      const items = r?.items || [];

      const withProg = await Promise.all(
        items.map(async (ex) => {
          const ov = await getJSON(
            `/api/exams/${ex.examId}/overview?email=${encodeURIComponent(email)}`
          ).catch(() => ({}));

          const total = ov?.total || 0;
          const completed = ov?.completed || 0;

          const pct = total ? Math.round((completed / total) * 100) : 0;

          return { ...ex, progressPct: pct };
        })
      );

      setExams(withProg);
    })();
  }, [email]);

  // Background slideshow (crossfade)
  useEffect(() => {
    const id = setInterval(() => {
      setBgIndex((i) => (i + 1) % BACKGROUND_IMAGES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative z-0 min-h-screen text-white">

      {/* --- Background Crossfade Layer (SAFE / NON-BLOCKING) --- */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {BACKGROUND_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1200ms] ${
              i === bgIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}

        {/* Gradient overlay so content stays readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90" />
      </div>

      {/* --- Page content --- */}
      <section className="relative max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 drop-shadow-lg">
          Preparation
        </h1>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((ex) => {
            const imgSrc = `/backgrounds/${ex.examId}.png`;

            return (
              <div
                key={ex.examId}
                onClick={() => navigate(`/prep/${encodeURIComponent(ex.examId)}`)}
                className="group cursor-pointer relative rounded-3xl overflow-hidden backdrop-blur-xl bg-white/10
                  border border-white/10 hover:border-white/20 transition-all duration-300
                  shadow-lg hover:shadow-2xl hover:-translate-y-1"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-blue-400/0 group-hover:bg-blue-500/10 blur-2xl transition duration-300 pointer-events-none" />

                {/* Image section */}
                <div
                  className="relative h-44 w-full overflow-hidden"
                  style={{
                    clipPath: "polygon(0 0, 100% 0, 100% 88%, 0 100%)",
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={ex.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => (e.target.style.display = "none")}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/50" />

                  <div className="absolute bottom-3 left-4 right-4">
                    <div className="text-lg font-semibold drop-shadow-md">
                      {ex.name}
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="absolute top-3 left-4">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500 text-white uppercase tracking-wider shadow">
                      Cohort
                    </span>
                  </div>
                </div>

                {/* Content area */}
                <div className="p-4 text-gray-200">
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-gray-300">
                      <span>Progress</span>
                      <span>{ex.progressPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-blue-400 rounded-full transition-all duration-700 group-hover:bg-blue-300"
                        style={{ width: `${ex.progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Description slide-up */}
                  <div className="mt-3 text-xs overflow-hidden">
                    <div className="transform translate-y-3 opacity-0 
                      group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      Prepare, practice & continue your journey for{" "}
                      <strong>{ex.name}</strong>.  
                      Track completion and resume anytime.
                    </div>
                  </div>

                  {/* Resume button */}
                  <div className="mt-4">
                    <Link
                      to={`/prep/${encodeURIComponent(ex.examId)}`}
                      className="inline-block px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 transition text-xs font-semibold text-white shadow-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Resume →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {exams.length === 0 && (
            <div className="text-gray-300">No exams yet</div>
          )}
        </div>
      </section>
    </div>
  );
}
