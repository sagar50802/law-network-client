import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * 📰 MainSlide.jsx — Responsive Teleprompter (Synced + Fixed, No Flicker)
 * -----------------------------------------------------------------------
 * ✅ Word-by-word typing synced with speech length
 * ✅ Sentences are appended (no sudden clear between sentences)
 * ✅ Mobile + Desktop layout preserved (uses .standard-teleprompter)
 * ✅ Smooth progress bar + blinking cursor
 * ✅ No yellow flicker (no per-word fade animation)
 */

export default function MainSlide({
  slide,
  duration = 30000,
  currentSentence = "",
}) {
  const [progress, setProgress] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const contentRef = useRef(null);

  // 🧱 Holds all fully-typed sentences so far (baseline)
  const baseTextRef = useRef("");

  // 🔁 Reset text & baseline when slide changes
  useEffect(() => {
    setTypedText("");
    baseTextRef.current = "";
  }, [slide]);

  /* ============================================================
     ✍️ Word-by-word typing (adaptive + cumulative)
     - We APPEND each new sentence to previous text
     - No more full clear between sentences
  ============================================================ */
  useEffect(() => {
    if (!currentSentence || !currentSentence.trim()) {
      return;
    }

    const text = currentSentence.trim();
    const words = text.split(/\s+/);
    let i = 0;

    // Take snapshot of text that was already typed (previous sentences)
    const base = baseTextRef.current;

    // 🧠 Adaptive typing speed:
    //  - base per-word delay is slower (closer to real speech)
    //  - longer sentences → slightly slower typing
    const BASE_MS = 230; // base ms per word
    const lenFactor = Math.min(2.2, Math.max(1, text.length / 80));
    const intervalMs = BASE_MS * lenFactor;

    const intervalId = setInterval(() => {
      const partial = words.slice(0, i + 1).join(" ");

      // Append this sentence to existing baseline
      const combined = base.length > 0 ? `${base} ${partial}` : partial;

      setTypedText(combined);

      // Keep text in view
      if (contentRef.current) {
        contentRef.current.scrollTo({
          top: contentRef.current.scrollHeight,
          behavior: "smooth",
        });
      }

      i++;
      if (i >= words.length) {
        clearInterval(intervalId);
        // When sentence fully typed, update baseline to full text
        baseTextRef.current =
          base.length > 0 ? `${base} ${text}` : text;
      }
    }, intervalMs);

    return () => clearInterval(intervalId);
    // 👉 important: we only depend on currentSentence
  }, [currentSentence]);

  /* ============================================================
     💫 Cursor Blink
  ============================================================ */
  useEffect(() => {
    const blink = setInterval(() => setShowCursor((p) => !p), 500);
    return () => clearInterval(blink);
  }, []);

  /* ============================================================
     📊 Progress Bar (per slide)
  ============================================================ */
  useEffect(() => {
    if (!slide) return;
    setProgress(0);

    const start = Date.now();
    const timer = setInterval(() => {
      const pct = ((Date.now() - start) / duration) * 100;
      setProgress(pct > 100 ? 100 : pct);
    }, 200);

    return () => clearInterval(timer);
  }, [slide, duration]);

  if (!slide) return null;

  /* ============================================================
     🧱 Render
  ============================================================ */
  return (
    <motion.div
      key={slide._id || slide.title}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`
        relative z-20 standard-teleprompter
        w-[95%] sm:w-[50%] lg:w-[40%]
        mx-auto my-3 sm:my-0
        bg-black/80 backdrop-blur-md
        rounded-xl p-4 sm:p-6
        border-l-4 border-yellow-400
        shadow-[0_0_25px_rgba(250,204,21,0.3)]
        text-gray-100 leading-relaxed
        flex flex-col justify-between
        max-h-[60vh] sm:max-h-[65vh]
        overflow-hidden
      `}
      style={{
        minHeight: "fit-content",
      }}
    >
      {/* 🖼 Optional image */}
      {slide.image && (
        <img
          src={slide.image}
          alt="Slide banner"
          className="w-full h-28 sm:h-36 object-cover rounded-md mb-3 border border-yellow-400/20"
        />
      )}

      {/* 📜 Typing text area */}
      <div
        ref={contentRef}
        className="
          overflow-y-auto
          max-h-[38vh] sm:max-h-[55vh]
          pr-2
          text-[15px] sm:text-[19px]
          font-semibold tracking-wide
        "
      >
        {/* 🔸 Plain <p>, no motion + no key => no flicker */}
        <p
          className="
            text-yellow-300
            drop-shadow-[0_0_6px_#facc15]
            whitespace-pre-wrap
            leading-snug sm:leading-relaxed
          "
        >
          {typedText || "…"}
          {showCursor && (
            <motion.span
              className="inline-block w-[4px] h-[1.1em] bg-yellow-400 ml-1 align-middle"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </p>
      </div>

      {/* 🧾 Headline + Progress Bar */}
      <div className="mt-3 sm:mt-4 border-t border-yellow-400/20 pt-2 sm:pt-3">
        <div className="text-yellow-400 text-[13px] sm:text-lg font-bold truncate">
          {slide.title}
        </div>
        <div className="mt-1 h-1 w-full bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-1 bg-yellow-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 📍 Teleprompter guide line (desktop only) */}
      <div className="hidden sm:block absolute top-1/2 left-0 w-full h-[2px] bg-yellow-400/25" />
    </motion.div>
  );
}
