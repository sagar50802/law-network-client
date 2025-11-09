import React, { useEffect, useState, useRef } from "react";

/* -------------------------------------------------------------------------- */
/* ✅ Highlight Logic                                                         */
/* -------------------------------------------------------------------------- */
// Supports:
// **term** → yellow highlight
// [def]definition[/def] → green
// [ex]example[/ex] → blue
function highlightSentence(sentence = "") {
  let html = sentence;
  html = html.replace(/\*\*(.+?)\*\*/g, '<span class="text-yellow-300 font-semibold">$1</span>');
  html = html.replace(/\[def](.+?)\[\/def]/g, '<span class="text-green-300">$1</span>');
  html = html.replace(/\[ex](.+?)\[\/ex]/g, '<span class="text-blue-300">$1</span>');
  return html;
}

/* -------------------------------------------------------------------------- */
/* ✅ Component                                                               */
/* -------------------------------------------------------------------------- */
export default function ClassroomTeleprompter({
  slide,
  currentSentence,
  duration = 3000,
}) {
  const [typedText, setTypedText] = useState("");
  const [history, setHistory] = useState([]);
  const containerRef = useRef(null);
  const rafRef = useRef(null);

  /* ---------------------------------------------------------------------- */
  /* ✅ Reset when slide changes                                            */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    setHistory([]);
    setTypedText("");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [slide?._id]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Typing animation (frame-driven for smoothness)                      */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!currentSentence) return;

    let frameId;
    let startTime;
    let currentLength = 0;
    const text = currentSentence;
    const totalChars = text.length;
    const charsPerSec = Math.max(10, Math.min(60, 1800 / totalChars)); // adaptive speed

    setTypedText("");

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000; // seconds
      const charsToShow = Math.min(totalChars, Math.floor(elapsed * charsPerSec));

      if (charsToShow !== currentLength) {
        currentLength = charsToShow;
        setTypedText(text.slice(0, currentLength));
      }

      if (currentLength < totalChars) {
        frameId = requestAnimationFrame(step);
      } else {
        // finished typing this sentence
        setHistory((prev) => {
          const updated = [...prev, text];
          // keep last 25 for performance
          return updated.slice(-25);
        });
      }
    };

    frameId = requestAnimationFrame(step);
    rafRef.current = frameId;

    return () => cancelAnimationFrame(frameId);
  }, [currentSentence]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Auto-scroll to bottom when content updates                          */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [history, typedText]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Derived visual progress (typing bar)                                */
  /* ---------------------------------------------------------------------- */
  const progressWidth = currentSentence
    ? `${Math.min(100, (typedText.length / currentSentence.length) * 100)}%`
    : "0%";

  /* ---------------------------------------------------------------------- */
  /* ✅ Render                                                              */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="bg-slate-900/95 text-slate-50 rounded-2xl px-4 py-3 md:px-6 md:py-4 shadow-inner border border-slate-700 max-h-[50vh] md:max-h-[45vh] overflow-hidden flex flex-col transition-all duration-500">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
      >
        {/* Past Sentences */}
        {history.map((s, idx) => (
          <p
            key={idx}
            className="text-sm md:text-base leading-relaxed opacity-70 mb-1 transition-opacity duration-300"
            dangerouslySetInnerHTML={{ __html: highlightSentence(s) }}
          />
        ))}

        {/* Current Typing Sentence */}
        {typedText && (
          <p
            className="text-base md:text-lg leading-relaxed mb-1 animate-fadeIn"
            dangerouslySetInnerHTML={{ __html: highlightSentence(typedText) }}
          />
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 transition-[width] duration-150 ease-linear"
          style={{ width: progressWidth }}
        />
      </div>

      {/* Topic Title */}
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
        {slide?.topicTitle || "Untitled"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ✅ Extra (optional CSS helper for animation)                              */
/* -------------------------------------------------------------------------- */
/* Add to your global CSS (Tailwind users can add in globals.css):

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255,255,255,0.15);
  border-radius: 4px;
}
*/
