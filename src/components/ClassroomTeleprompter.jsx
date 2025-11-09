import React, { useEffect, useState, useRef } from "react";

/* -------------------------------------------------------------------------- */
/* ✅ Highlight Logic                                                         */
/* -------------------------------------------------------------------------- */
/**
 * Supports rich inline annotations:
 *  - **term**           → yellow highlight (important)
 *  - [def]text[/def]    → green (definition)
 *  - [ex]text[/ex]      → blue (example)
 *  - [note]text[/note]  → yellow block (note)
 *  - [blue]text[/blue]  → blue block
 *  - [red]text[/red]    → red block (warning)
 *
 * Example in slide content:
 *   आज हम **इतिहास** [note]बहुत important topic[/note] पढ़ेंगे।
 */
function highlightSentence(sentence = "") {
  let html = sentence;

  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<span class="text-yellow-300 font-semibold">$1</span>'
  );
  html = html.replace(
    /\[def](.+?)\[\/def]/g,
    '<span class="text-green-300">$1</span>'
  );
  html = html.replace(
    /\[ex](.+?)\[\/ex]/g,
    '<span class="text-blue-300">$1</span>'
  );
  html = html.replace(
    /\[note](.+?)\[\/note]/g,
    '<span class="text-yellow-300 font-semibold">$1</span>'
  );
  html = html.replace(
    /\[blue](.+?)\[\/blue]/g,
    '<span class="text-sky-300">$1</span>'
  );
  html = html.replace(
    /\[red](.+?)\[\/red]/g,
    '<span class="text-red-300 font-semibold">$1</span>'
  );

  return html;
}

/* -------------------------------------------------------------------------- */
/* ✅ ClassroomTeleprompter Component                                         */
/* -------------------------------------------------------------------------- */
export default function ClassroomTeleprompter({
  slide,
  currentSentence,
  duration = 4000, // fallback typing duration in ms
  progress = null, // 0–1 real-time from voice engine
}) {
  const [typedText, setTypedText] = useState("");
  const [history, setHistory] = useState([]);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const lastCompletedRef = useRef(null); // to avoid duplicate pushes

  /* ---------------------------------------------------------------------- */
  /* 🧹 Reset when slide changes                                            */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    setHistory([]);
    setTypedText("");
    lastCompletedRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, [slide?._id]);

  /* ---------------------------------------------------------------------- */
  /* ✍️ Typing / Progress Animation                                         */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!currentSentence) return;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const text = currentSentence;
    const totalChars = text.length;

    const hasProgress =
      typeof progress === "number" && progress >= 0 && progress <= 1;

    // ✅ Voice-driven progress typing
    if (hasProgress) {
      const shown = Math.floor(totalChars * progress);
      setTypedText(text.slice(0, shown));

      // push to history when complete
      if (progress >= 1 && text.trim()) {
        if (lastCompletedRef.current !== text) {
          lastCompletedRef.current = text;
          setHistory((prev) => {
            const updated = [...prev, text];
            return updated.slice(-25); // keep recent 25 lines
          });
        }
      }
      return;
    }

    // ✅ Fallback to self-driven typing (if no progress provided)
    let frameId;
    let startTime;
    let currentLength = 0;

    const targetMs =
      typeof duration === "number" && duration > 1000 ? duration : 4000;
    const targetSec = targetMs / 1000;
    let charsPerSec = totalChars > 0 ? totalChars / targetSec : 15;
    charsPerSec = Math.max(4, Math.min(25, charsPerSec)); // limit speed

    setTypedText("");

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
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
        rafRef.current = frameId;
      } else {
        if (text.trim()) {
          lastCompletedRef.current = text;
          setHistory((prev) => {
            const updated = [...prev, text];
            return updated.slice(-25);
          });
        }
      }
    };

    frameId = requestAnimationFrame(step);
    rafRef.current = frameId;

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [currentSentence, duration, progress]);

  /* ---------------------------------------------------------------------- */
  /* 🧭 Auto-scroll on update                                               */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [history, typedText]);

  /* ---------------------------------------------------------------------- */
  /* 📊 Progress Bar Calculation                                            */
  /* ---------------------------------------------------------------------- */
  const progressWidth = currentSentence
    ? (() => {
        if (
          typeof progress === "number" &&
          progress >= 0 &&
          progress <= 1
        ) {
          return `${Math.min(100, Math.floor(progress * 100))}%`;
        }
        return `${Math.min(
          100,
          (typedText.length / (currentSentence.length || 1)) * 100
        )}%`;
      })()
    : "0%";

  /* ---------------------------------------------------------------------- */
  /* 🧩 Render                                                              */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="bg-slate-900/95 text-slate-50 rounded-2xl px-4 py-3 md:px-6 md:py-4 shadow-inner border border-slate-700 max-h-[50vh] md:max-h-[45vh] overflow-hidden flex flex-col transition-all duration-500">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
      >
        {/* 🕓 Past Sentences */}
        {history.map((s, idx) => (
          <p
            key={idx}
            className="text-sm md:text-base leading-relaxed opacity-70 mb-1 transition-opacity duration-300"
            dangerouslySetInnerHTML={{ __html: highlightSentence(s) }}
          />
        ))}

        {/* ✍️ Current Typing Sentence */}
        {typedText && (
          <p
            className="text-base md:text-lg leading-relaxed mb-1 animate-fadeIn"
            dangerouslySetInnerHTML={{ __html: highlightSentence(typedText) }}
          />
        )}
      </div>

      {/* 📊 Progress Bar */}
      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 transition-[width] duration-150 ease-linear"
          style={{ width: progressWidth }}
        />
      </div>

      {/* 🏷 Topic Title */}
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
        {slide?.topicTitle || "Untitled"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ✅ Extra CSS (ensure globally in index.css or tailwind.css)                */
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
