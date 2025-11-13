import { useEffect, useState } from "react";
import { getJSON } from "../utils/api";
import { Link, useNavigate } from "react-router-dom";

// 🔁 Background slideshow images (EDIT NAMES TO MATCH YOUR FILES)
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
            `/api/exams/${ex.examId}/overview?email=${encodeURIComponent(
              email
            )}`
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

  // 🔁 Background crossfade slideshow (every 4 seconds)
  useEffect(() => {
    if (!BACKGROUND_IMAGES.length) return;
    const id = setInterval(() => {
      setBgIndex((i) => (i + 1) % BACKGROUND_IMAGES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden text-white">
      {/* 🔥 Backgrounds (crossfade) */}
      <div className="fixed inset-0 -z-10">
        {BACKGROUND_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ${
              i === bgIndex ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}
        {/* Gradient overlay to keep content readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
      </div>

      <section className="relative max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 drop-shadow-lg">
          Preparation
        </h1>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((ex) => {
            // 🖼 Exam-specific image – expects /public/backgrounds/<examId>.png
            const imgSrc = `/backgrounds/${ex.examId}.png`;

            // simple badge – you can customize later if you add ex.category
            const badgeLabel = "Cohort";

            return (
              <div
                key={ex.examId}
                className="group relative cursor-pointer rounded-3xl shadow-lg hover:shadow-2xl transition-shadow duration-300"
                onClick={() =>
                  navigate(`/prep/${encodeURIComponent(ex.examId)}`)
                }
              >
                {/* Card glow effect on hover */}
                <div className="absolute inset-0 rounded-3xl bg-blue-500/0 group-hover:bg-blue-500/20 blur-3xl transition duration-300 pointer-events-none" />

                {/* Actual card */}
                <div className="relative rounded-3xl bg-white/5 backdrop-blur-xl border border-white/15 overflow-hidden shadow-lg hover:shadow-2xl transition-transform duration-300 group-hover:-translate-y-1">
                  {/* Top: Image with overlay, clip-like shape */}
                  <div
                    className="relative h-40 w-full overflow-hidden"
                    style={{
                      clipPath: "polygon(0 0, 100% 0, 100% 88%, 0 100%)",
                    }}
                  >
                    <img
                      src={imgSrc}
                      alt={ex.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        // Hide img if not found
                        e.target.style.display = "none";
                      }}
                    />

                    {/* Dark overlay on image */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/60" />

                    {/* Category badge */}
                    <div className="absolute top-2 left-3 flex gap-1">
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/90 text-white shadow">
                        {badgeLabel}
                      </span>
                    </div>

                    {/* Title inside image */}
                    <div className="absolute bottom-2 left-3 right-3">
                      <div className="text-lg font-semibold leading-tight drop-shadow-md">
                        {ex.name}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {/* Progress with animated bar */}
                    <div className="mt-1">
                      <div className="text-xs text-gray-200/80 mb-1 flex justify-between">
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

                    {/* Slide-up description / extra info */}
                    <div className="mt-3 text-xs text-gray-200/80">
                      <div className="overflow-hidden">
                        <div className="transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <p className="text-[11px] leading-snug text-gray-200">
                            Continue your structured preparation journey for{" "}
                            <span className="font-semibold">{ex.name}</span>.
                            Track your completion and pick up where you left
                            off.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Resume button */}
                    <div className="mt-4">
                      <Link
                        to={`/prep/${encodeURIComponent(ex.examId)}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Resume
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {exams.length === 0 && (
            <div className="text-gray-200">No exams yet</div>
          )}
        </div>
      </section>
    </div>
  );
}
