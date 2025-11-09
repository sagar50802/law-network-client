import { motion } from "framer-motion";

/**
 * 🎥 BackgroundMotion
 * Auto-selects studio background based on program type
 */
export default function BackgroundMotion({ type }) {
  let src = "/backgrounds/lawdesk-loop.mp4"; // default fallback

  if (!type) type = "GENERAL";

  const normalized = type.toUpperCase();

  if (normalized.includes("DEBATE")) {
    src = "/backgrounds/debate-abstract.mp4";
  } else if (
    normalized.includes("LEGAL") ||
    normalized.includes("NEWS") ||
    normalized.includes("UPDATE")
  ) {
    src = "/backgrounds/newsroom.mp4";
  } else if (
    normalized.includes("INFO") ||
    normalized.includes("TECH") ||
    normalized.includes("IT")
  ) {
    src = "/backgrounds/lawdesk-loop.mp4";
  }

  return (
    <motion.video
      key={src}
      className="absolute inset-0 w-full h-full object-cover brightness-75"
      src={src}
      autoPlay
      muted
      loop
      playsInline
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
    />
  );
}
