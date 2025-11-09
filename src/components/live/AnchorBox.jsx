import { motion } from "framer-motion";

/**
 * 🎙 AnchorBox — Smart Responsive Version
 * ---------------------------------------
 * ✅ Auto-adjusts position (never overlaps teleprompter)
 * ✅ Fixed bottom bar on mobile, floating card on desktop
 * ✅ Smooth entry + exit transitions
 */
export default function AnchorBox({
  slide,
  currentSentence = "",
  activeSpeaker = 0,
}) {
  if (!slide) return null;

  const avatar =
    slide.debateAvatars?.[activeSpeaker]?.avatar ||
    slide.avatars?.[activeSpeaker]?.avatar ||
    "/avatars/default.png";

  const name =
    slide.debateAvatars?.[activeSpeaker]?.name ||
    slide.avatars?.[activeSpeaker]?.name ||
    slide.anchorName ||
    "Guest";

  const role =
    slide.debateAvatars?.[activeSpeaker]?.role ||
    slide.avatars?.[activeSpeaker]?.role ||
    slide.anchorRole ||
    "Anchor";

  const isVisible = !!currentSentence?.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 40,
      }}
      transition={{ duration: 0.6 }}
      className={`fixed z-40 w-[95%] sm:w-auto
        left-1/2 -translate-x-1/2 sm:left-8 sm:translate-x-0
        ${isVisible ? "pointer-events-auto" : "pointer-events-none"}
        ${window.innerWidth < 640 ? "bottom-20" : "bottom-10"}
        flex items-center gap-3
        bg-black/70 backdrop-blur-lg border border-yellow-400/40
        rounded-xl px-3 py-2 sm:px-5 sm:py-3 shadow-[0_0_20px_rgba(250,204,21,0.25)]`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <img
          src={avatar}
          alt={name}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-400 object-cover"
        />
        {isVisible && (
          <motion.div
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-red-500"
            animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          />
        )}
      </div>

      {/* Text Info */}
      <div className="flex flex-col leading-tight overflow-hidden text-xs sm:text-sm">
        <div className="text-yellow-400 font-semibold">{name}</div>
        <div className="text-gray-300 italic text-[11px]">{role}</div>
        {isVisible && (
          <motion.div
            key={currentSentence}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-gray-100 mt-1 bg-black/40 rounded-md px-2 py-1 text-[12px] sm:text-sm"
          >
            {currentSentence}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
