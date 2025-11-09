import { motion, AnimatePresence } from "framer-motion";
import AudioVisualizer from "./AudioVisualizer";

/**
 * 🎬 AnimatedStage.jsx — Smart TV Studio Layout
 * ---------------------------------------------------------
 * ✅ Automatically switches between:
 *    - 🎙 Anchor Mode → single centered large avatar
 *    - 🗣 Debate Mode → 2–6 avatars in responsive grid
 * ✅ Smooth animated transitions & glow for active speaker
 * ✅ Responsive scaling on mobile and widescreen
 * ✅ Works cleanly with your teleprompter + overlay layout
 */

export default function AnimatedStage({ slide, activeSpeaker = 0, layout }) {
  if (!slide) return null;

  // Get avatars from backend or fallback to anchor
  let avatars =
    (Array.isArray(slide.debateAvatars) &&
      slide.debateAvatars.length &&
      slide.debateAvatars) ||
    (Array.isArray(slide.avatars) && slide.avatars.length && slide.avatars) ||
    [];

  if (!avatars.length) {
    avatars = [
      {
        name: slide.anchorName || "Guest Speaker",
        role: slide.anchorRole || "Anchor",
        avatarType: "LAWYER",
      },
    ];
  }

  // Auto mode detection (override via prop if passed)
  const isDebate =
    layout === "grid" || slide.programType === "DEBATE" || avatars.length > 1;

  /* ----------------------------------------------------------
     🧭 Layout Styles
  ---------------------------------------------------------- */
  const layoutClass = isDebate
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-center items-center px-4 py-6"
    : "flex flex-col justify-center items-center min-h-[45vh] md:min-h-[55vh]";

  return (
    <div className={`relative w-full ${layoutClass}`}>
      <AnimatePresence mode="popLayout">
        {avatars.map((a, i) => {
          const isActive = isDebate ? i === activeSpeaker : i === 0;
          const avatarSrc =
            a.avatarType
              ? `/avatars/${a.avatarType.toLowerCase()}.png`
              : a.avatar?.startsWith("http")
              ? a.avatar
              : "/avatars/lawyer.png";

          // Dynamic scaling based on mode + activeness
          const baseScale = isDebate
            ? isActive
              ? 1.15
              : 1
            : isActive
            ? 1.5
            : 1.2;

          const borderColor = isActive ? "#facc15" : "#555";

          return (
            <motion.div
              key={`${a.name}-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: 1,
                scale: baseScale,
                zIndex: isActive ? 20 : 10,
                filter: isActive
                  ? "brightness(1.1)"
                  : "grayscale(40%) brightness(0.8)",
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className={`relative flex flex-col items-center justify-center text-center ${
                isDebate ? "mx-auto" : ""
              }`}
            >
              {/* 🧑‍⚖️ Avatar Image */}
              <div className="relative inline-block">
                <motion.img
                  src={avatarSrc}
                  alt={a.name}
                  className={`rounded-2xl border-4 object-cover bg-black/40 shadow-lg transition-all duration-700
                    ${
                      isDebate
                        ? "w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32"
                        : "w-36 h-36 md:w-48 md:h-48"
                    }`}
                  style={{
                    borderColor,
                    boxShadow: isActive
                      ? "0 0 25px rgba(250,204,21,0.8)"
                      : "0 0 10px rgba(0,0,0,0.4)",
                  }}
                  animate={{
                    scale: isActive ? [1, 1.03, 1] : 1,
                  }}
                  transition={{
                    repeat: isActive ? Infinity : 0,
                    duration: 3.2,
                    ease: "easeInOut",
                  }}
                />

                {/* 🔊 AudioVisualizer (microphone bars) */}
                <AudioVisualizer isActive={isActive} />

                {/* ✨ Animated glow ring for active speaker */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border border-yellow-300/40"
                    animate={{ opacity: [0.2, 0.7, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </div>

              {/* 🪪 Speaker Info */}
              <div className="mt-3 text-center select-none">
                <div
                  className={`font-semibold text-sm sm:text-base md:text-lg ${
                    isActive ? "text-yellow-400" : "text-gray-300"
                  }`}
                >
                  {a.name || `Speaker ${i + 1}`}
                </div>
                <div className="text-xs sm:text-sm text-gray-400 italic">
                  {a.role || "Guest"}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* 🎥 Subtle fade overlay for depth */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/10 via-transparent to-black/10" />
    </div>
  );
}
