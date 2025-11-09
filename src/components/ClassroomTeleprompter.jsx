import React, { useEffect, useState, useRef } from "react";

/* -------------------------------------------------------------------------- */
/* 🎨 Highlight Parser                                                        */
/* -------------------------------------------------------------------------- */
function highlightSentence(sentence = "") {
  let html = sentence;
  html = html.replace(/\*\*(.+?)\*\*/g, '<span class="text-yellow-300 font-semibold">$1</span>');
  html = html.replace(/\[def](.+?)\[\/def]/g, '<span class="text-green-300">$1</span>');
  html = html.replace(/\[ex](.+?)\[\/ex]/g, '<span class="text-sky-300">$1</span>');
  html = html.replace(/\[note](.+?)\[\/note]/g, '<span class="bg-yellow-400/20 text-yellow-200 px-1 rounded">$1</span>');
  html = html.replace(/\[red](.+?)\[\/red]/g, '<span class="text-red-300 font-semibold">$1</span>');
  html = html.replace(/\[blue](.+?)\[\/blue]/g, '<span class="text-blue-300">$1</span>');
  return html;
}

/* -------------------------------------------------------------------------- */
/* 🧠 ClassroomTeleprompter                                                   */
/* -------------------------------------------------------------------------- */
export default function ClassroomTeleprompter({
  slide,
  currentSentence,
  progress = 0,
}) {
  const [typedText, setTypedText] = useState("");
  const [history, setHistory] = useState([]);
  const smoothProgress = useRef(0);
  const lastCompletedRef = useRef("");
  const containerRef = useRef(null);

  /* ---------------------- Reset on slide change ---------------------- */
  useEffect(() => {
    setHistory([]);
    setTypedText("");
    smoothProgress.current = 0;
    lastCompletedRef.current = "";
  }, [slide?._id]);

  /* ---------------------- Smooth typing effect ---------------------- */
  useEffect(() => {
    if (!currentSentence) return;
    const text = currentSentence;
    const totalChars = text.length || 1;

    const interval = setInterval(() => {
      smoothProgress.current += (progress - smoothProgress.current) * 0.3;
      const shown = Math.floor(totalChars * smoothProgress.current);
      setTypedText(text.slice(0, shown));

      if (progress >= 0.99 && lastCompletedRef.current !== text && text.trim()) {
        lastCompletedRef.current = text;
        setHistory((prev) => [...prev.slice(-20), text]);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [progress, currentSentence]);

  /* ---------------------- Auto-scroll smoothly ---------------------- */
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [typedText, history]);

  const progressWidth = `${Math.min(100, Math.floor(progress * 100))}%`;

  /* ------------------------------------------------------------------ */
  /* 🧩 Render UI                                                       */
  /* ------------------------------------------------------------------ */
  return (
    <div className="bg-slate-900/95 text-slate-50 rounded-2xl px-5 py-4 md:px-7 md:py-5 shadow-inner border border-slate-700 max-h-[50vh] md:max-h-[45vh] overflow-hidden flex flex-col transition-all duration-300">
      <div ref={containerRef} className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {/* 📝 History as dimmed notes */}
        {history.map((s, idx) => (
          <p
            key={idx}
            className="text-sm md:text-base leading-relaxed mb-1 text-slate-400"
            dangerouslySetInnerHTML={{ __html: highlightSentence(s) }}
          />
        ))}

        {/* ✍️ Current active sentence */}
        {typedText && (
          <p
            className="text-base md:text-lg leading-relaxed mb-1 animate-fadeIn bg-gradient-to-r from-emerald-400/10 via-transparent to-transparent border-l-4 border-emerald-400 pl-2 rounded transition-all duration-300"
            dangerouslySetInnerHTML={{ __html: highlightSentence(typedText) }}
          />
        )}
      </div>

      {/* 📊 Progress Bar */}
      <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 transition-[width] duration-200 ease-linear"
          style={{ width: progressWidth }}
        />
      </div>

      {/* 🏷 Topic Title */}
      <div className="mt-2 text-xs uppercase tracking-wide text-slate-400">
        {slide?.topicTitle || "Untitled Topic"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 🌈 Extra CSS (add once globally in index.css or tailwind.css)              */
/* -------------------------------------------------------------------------- */
/*
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(255,255,255,0.15);
  border-radius: 4px;
}
*/
