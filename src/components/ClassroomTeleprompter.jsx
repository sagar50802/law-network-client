import React, { useEffect, useState, useRef } from "react";

/* ------------------------------------------------------- */
/* 🎨 Highlight Helper                                     */
/* ------------------------------------------------------- */
function highlightSentence(sentence = "") {
  let html = sentence;
  html = html.replace(/\*\*(.+?)\*\*/g, '<span class="text-yellow-300 font-semibold">$1</span>');
  html = html.replace(/\[def](.+?)\[\/def]/g, '<span class="text-green-300">$1</span>');
  html = html.replace(/\[ex](.+?)\[\/ex]/g, '<span class="text-blue-300">$1</span>');
  html = html.replace(/\[note](.+?)\[\/note]/g, '<span class="text-yellow-300 font-semibold">$1</span>');
  html = html.replace(/\[blue](.+?)\[\/blue]/g, '<span class="text-sky-300">$1</span>');
  html = html.replace(/\[red](.+?)\[\/red]/g, '<span class="text-red-300 font-semibold">$1</span>');
  return html;
}

/* ------------------------------------------------------- */
/* 🧠 Teleprompter Component                               */
/* ------------------------------------------------------- */
export default function ClassroomTeleprompter({
  slide,
  currentSentence,
  progress = 0,
  duration = 4000,
}) {
  const [typedText, setTypedText] = useState("");
  const [history, setHistory] = useState([]);
  const containerRef = useRef(null);
  const lastCompletedRef = useRef("");
  const smoothProgress = useRef(0);

  /* Reset when slide changes */
  useEffect(() => {
    setHistory([]);
    setTypedText("");
    lastCompletedRef.current = "";
    smoothProgress.current = 0;
  }, [slide?._id]);

  /* Smooth typing driven by progress */
  useEffect(() => {
    if (!currentSentence) return;
    const text = currentSentence;
    const totalChars = text.length || 1;

    // Eased interpolation
    const interval = setInterval(() => {
      smoothProgress.current += (progress - smoothProgress.current) * 0.25;
      const shown = Math.floor(totalChars * smoothProgress.current);
      setTypedText(text.slice(0, shown));

      if (progress >= 0.99 && lastCompletedRef.current !== text && text.trim()) {
        lastCompletedRef.current = text;
        setHistory((prev) => [...prev.slice(-24), text]);
      }
    }, 60); // ~16fps smooth

    return () => clearInterval(interval);
  }, [progress, currentSentence]);

  /* Auto-scroll */
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [typedText, history]);

  const progressWidth = `${Math.min(100, Math.floor(progress * 100))}%`;

  return (
    <div className="bg-slate-900/95 text-slate-50 rounded-2xl px-4 py-3 md:px-6 md:py-4 shadow-inner border border-slate-700 max-h-[50vh] md:max-h-[45vh] overflow-hidden flex flex-col">
      <div ref={containerRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {history.map((s, i) => (
          <p key={i} className="text-sm md:text-base leading-relaxed opacity-70 mb-1"
             dangerouslySetInnerHTML={{ __html: highlightSentence(s) }} />
        ))}

        {typedText && (
          <p className="text-base md:text-lg leading-relaxed mb-1 animate-fadeIn"
             dangerouslySetInnerHTML={{ __html: highlightSentence(typedText) }} />
        )}
      </div>

      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-400 transition-[width] duration-150 ease-linear"
             style={{ width: progressWidth }} />
      </div>

      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
        {slide?.topicTitle || "Untitled"}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- */
/* 🌈 CSS (add globally once)                              */
/* ------------------------------------------------------- */
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
