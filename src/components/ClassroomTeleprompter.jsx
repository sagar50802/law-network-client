import React, { useEffect, useState, useRef } from "react";

/* -------------------------------------------------------------------------- */
/* ✅ Highlight Logic                                                         */
/* -------------------------------------------------------------------------- */
/**
 * Supports:
 *  - **term**           → yellow highlight (important)
 *  - [def]text[/def]    → green (definition)
 *  - [ex]text[/ex]      → blue (example)
 *  - [note]text[/note]  → yellow block (notes)
 *  - [blue]text[/blue]  → blue block
 *  - [red]text[/red]    → red block (warnings)
 *
 * You can write in slide content, for example:
 *   आज हम **इतिहास** [note]बहुत important topic[/note] पढ़ेंगे।
 */
function highlightSentence(sentence = "") {
  let html = sentence;

  // **bold** → yellow
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<span class="text-yellow-300 font-semibold">$1</span>'
  );

  // [def]definition[/def] → green
  html = html.replace(
    /\[def](.+?)\[\/def]/g,
    '<span class="text-green-300">$1</span>'
  );

  // [ex]example[/ex] → blue
  html = html.replace(
    /\[ex](.+?)\[\/ex]/g,
    '<span class="text-blue-300">$1</span>'
  );

  // [note]…[/note] → yellow block
  html = html.replace(
    /\[note](.+?)\[\/note]/g,
    '<span class="text-yellow-300 font-semibold">$1</span>'
  );

  // [blue]…[/blue] → blue block
  html = html.replace(
    /\[blue](.+?)\[\/blue]/g,
    '<span class="text-sky-300">$1</span>'
  );

  // [red]…[/red] → red block
  html = html.replace(
    /\[red](.+?)\[\/red]/g,
    '<span class="text-red-300 font-semibold">$1</span>'
  );

  return html;
}

/* -------------------------------------------------------------------------- */
/* ✅ Component                                                               */
/* -------------------------------------------------------------------------- */
export default function ClassroomTeleprompter({
  slide,
  currentSentence,
  duration = 4000, // ms – target time to finish typing the sentence
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
  /* ✅ Typing animation – paced to match voice                             */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!currentSentence) return;

    let frameId;
    let startTime;
    let currentLength = 0;
    const text = currentSentence;
    const totalChars = text.length;

    // Target duration (sec). If prop not sensible, default to ~4s
    const targetMs = typeof duration === "number" && duration > 1000
      ? duration
      : 4000;
    const targetSec = targetMs / 1000;

    // chars per second so full sentence ~ target duration
    let charsPerSec =
      totalChars > 0 ? totalChars / targetSec : 15; // fallback
    // keep speed in a readable range
    charsPerSec = Math.max(4, Math.min(25, charsPerSec));

    setTypedText("");

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000; // seconds
      const charsToShow = Math.min(
        totalChars,
        Math.floor(elapsed * charsPerSec)
      );

      if (charsToShow !== currentLength) {
        currentLength = charsToShow;
        setTypedText(text.slice(0, currentLength));
      }

      if (currentLength < totalChars) {
        frameId = requestAnimationFrame(step);
      } else {
        // finished typing this sentence → move it to history
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
  }, [currentSentence, duration]);

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
    ? `${Math.min(
        100,
        (typedText.length / (currentSentence.length || 1)) * 100
      )}%`
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
/* ✅ Extra CSS (make sure this exists once globally)                        */
/* -------------------------------------------------------------------------- */
/*
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
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
