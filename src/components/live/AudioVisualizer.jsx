// src/components/live/AudioVisualizer.jsx
import { motion } from "framer-motion";

export default function AudioVisualizer({ isActive }) {
  if (!isActive) return null;

  return (
    <div className="flex justify-center gap-[2px] mt-2">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-yellow-400 rounded"
          animate={{
            height: isActive
              ? [6, 18, 8, 16, 10][i % 5]
              : 6,
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            repeat: Infinity,
            repeatType: "mirror",
            duration: 0.4 + i * 0.05,
            ease: "easeInOut",
          }}
          style={{ height: "10px" }}
        />
      ))}
    </div>
  );
}
