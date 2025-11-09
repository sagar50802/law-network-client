import React, { useEffect, useState, useRef } from "react";

/* -------------------------------------------------------------------------- */
/* ✅ Highlight Logic                                                         */
/* -------------------------------------------------------------------------- */
/**
 * Supports rich inline annotations:
 *  - **term**           → yellow highlight (important)
 *  - [def]text[/def]    → green (definition)
 *  - [ex]text[/ex]      → blue (example)
 *  - [note]text[/note]  → yellow highlight (note)
 *  - [blue]text[/blue]  → blue highlight
 *  - [red]text[/red]    → red highlight (warning)
 *
 * Example inside slide content:
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
/* ✅ ClassroomTeleprompter                                                  */
/* -------------------------------------------------------------------------- */
/**
 * Core contract:
 *  - `currentSentence` is always the exact chunk currently spoken by voice.
 *  - `progress` is 0–1 from ClassroomVoiceEngine (speech onboundary).
 *  - This component NEVER changes slides — it only renders what it gets.
 */
export default function ClassroomTeleprompter({
  slide,
  currentSentence,
  duration = 4000, // fallback visual duration when no progress is provided
  progress = null, // 0–1 from voice engine (preferred path)
}) {
  const [typedText, setTypedText] = useState("");
  const [history, setHistory] = useState([]);

  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const lastCompletedRef = useRef(null); // remember last sentence pushed to history

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
    if (!currentSentence) {
      setTypedText("");
      return;
    }

    // Cancel any leftover animation frame from previous sentence
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const text = currentSentence;
    const totalChars = text.length || 1;

    const hasProgress =
      typeof progress === "number" && progress >= 0 && progress <= 1;

    /* ------------------------------------------------------------------ */
    /* 🎯 Primary path — driven by voice `progress` (0–1)                  */
    /* ------------------------------------------------------------------ */
    if (hasProgress) {
      const shown = Math.max(
        0,
        Math.min(totalChars, Math.floor(totalChars * progress))
      );

      // Only update when there are new characters to show
      setTypedText((prev) =>
        prev.length !== shown ? text.slice(0, shown) : prev
      );

      // When sentence is basically done, move it to history once
      if (progress >= 0.99 && text.trim()) {
        if (lastCompletedRef.current !== text) {
          lastCompletedRef.current = text;
          setHistory((prev) => {
            const updated = [...prev, text];
            return updated.slice(-25); // keep last 25 sentences
          });
        }
      }

      return; // 🔚 we are fully controlled by voice — no rAF typing needed
    }

    /* ------------------------------------------------------------------ */
    /* ⏱ Fallback path — self-paced typing if no `progress` is provided   */
    /* ------------------------------------------------------------------ */
    let frameId;
    let startTime;
    let currentLength = 0;

    const targetMs =
      typeof duration === "number" && duration > 1000 ? duration : 4000;
    const targetSec = targetMs / 1000;
    let charsPerSec = totalChars > 0 ? totalChars / targetSec : 15;
    charsPerSec = Math.max(4, Math.min(25, charsPerSec)); // readable range

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
      } else if (text.trim()) {
        if (lastCompletedRef.current !== text) {
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
  /* 🧭 Auto-scroll when new text / history arrives                         */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [history, typedText]);

  /* ---------------------------------------------------------------------- */
  /* 📊 Progress Bar (visual only)                                         */
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
        // fallback: based on typed characters
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
        {/* Past sentences (already spoken) */}
        {history.map((s, idx) => (
          <p
            key={idx}
            className="text-sm md:text-base leading-relaxed opacity-70 mb-1 transition-opacity duration-300"
            dangerouslySetInnerHTML={{ __html: highlightSentence(s) }}
          />
        ))}

        {/* Current sentence (actively being spoken) */}
        {typedText && (
          <p
            className="text-base md:text-lg leading-relaxed mb-1 animate-fadeIn"
            dangerouslySetInnerHTML={{ __html: highlightSentence(typedText) }}
          />
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 transition-[width] duration-150 ease-linear"
          style={{ width: progressWidth }}
        />
      </div>

      {/* Topic title */}
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
        {slide?.topicTitle || "Untitled"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 📌 Extra CSS (once in your global CSS / Tailwind)                          */
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
