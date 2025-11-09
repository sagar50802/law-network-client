import React, { useEffect, useState, useRef } from "react";

/* -------------------------------------------------------------------------- */
/* 🎨 Highlight Logic – colorful note formatting                             */
/* -------------------------------------------------------------------------- */
function highlightSentence(sentence = "") {
  let html = sentence;

  // Block highlight sections
  html = html.replace(/\[red](.+?)\[\/red]/g,
    '<span class="block bg-red-100 text-red-700 font-medium rounded-lg px-2 py-1 my-1 shadow-sm">$1</span>'
  );
  html = html.replace(/\[green](.+?)\[\/green]/g,
    '<span class="block bg-green-100 text-green-700 font-medium rounded-lg px-2 py-1 my-1 shadow-sm">$1</span>'
  );
  html = html.replace(/\[blue](.+?)\[\/blue]/g,
    '<span class="block bg-blue-100 text-blue-700 font-medium rounded-lg px-2 py-1 my-1 shadow-sm">$1</span>'
  );
  html = html.replace(/\[yellow](.+?)\[\/yellow]/g,
    '<span class="block bg-yellow-100 text-yellow-800 font-medium rounded-lg px-2 py-1 my-1 shadow-sm">$1</span>'
  );

  // Inline tags
  html = html.replace(/\[note](.+?)\[\/note]/g,
    '<span class="bg-amber-100 text-amber-800 italic rounded px-1">$1</span>'
  );
  html = html.replace(/\[def](.+?)\[\/def]/g,
    '<span class="font-semibold text-green-600">$1</span>'
  );
  html = html.replace(/\[ex](.+?)\[\/ex]/g,
    '<span class="text-blue-600">$1</span>'
  );
  html = html.replace(/\*\*(.+?)\*\*/g,
    '<span class="font-bold underline text-rose-700">$1</span>'
  );

  return html;
}

/* -------------------------------------------------------------------------- */
/* 📘 Notebook Teleprompter Component                                        */
/* -------------------------------------------------------------------------- */
export default function ClassroomTeleprompter({
  slide,
  currentSentence,
  progress = 0,
}) {
  const [typedText, setTypedText] = useState("");
  const [history, setHistory] = useState([]);
  const containerRef = useRef(null);
  const lastCompletedRef = useRef(null);

  /* 🧹 Reset when slide changes */
  useEffect(() => {
    setHistory([]);
    setTypedText("");
    lastCompletedRef.current = null;
  }, [slide?._id]);

  /* ✍️ Display current sentence */
  useEffect(() => {
    if (!currentSentence) return;
    setTypedText(currentSentence);

    if (progress >= 1 && currentSentence.trim()) {
      if (lastCompletedRef.current !== currentSentence) {
        lastCompletedRef.current = currentSentence;
        setHistory((prev) => [...prev.slice(-25), currentSentence]);
      }
    }
  }, [currentSentence, progress]);

  /* 🧭 Auto-scroll */
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [history, typedText]);

  /* 📊 Progress width */
  const progressWidth = `${Math.min(100, Math.floor(progress * 100))}%`;

  /* 🧩 Render */
  return (
    <div className="relative bg-white text-gray-800 rounded-2xl px-6 py-5 shadow-md border border-gray-300 max-h-[55vh] overflow-hidden flex flex-col transition-all duration-300">

      {/* 📓 Notebook background */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-3 custom-scrollbar font-serif leading-relaxed relative z-10"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, rgba(59,130,246,0.25) 1px, transparent 1px),
            linear-gradient(to right, rgba(239,68,68,0.5) 40px, transparent 40px)
          `,
          backgroundSize: "100% 1.8em, 100% 100%",
          backgroundRepeat: "repeat, no-repeat",
          backgroundPosition: "0 0, 0 0",
        }}
      >
        {/* Left red margin line */}
        <div className="absolute left-[38px] top-0 bottom-0 w-[2px] bg-red-400 opacity-60"></div>

        {/* Past Sentences */}
        <div className="pl-6">
          {history.map((s, idx) => (
            <p
              key={idx}
              className="text-sm md:text-base opacity-70 mb-1"
              dangerouslySetInnerHTML={{ __html: highlightSentence(s) }}
            />
          ))}

          {/* Current Sentence */}
          {typedText && (
            <p
              className="text-base md:text-lg font-medium mb-1 animate-fadeIn border-l-4 border-emerald-500 pl-2 bg-emerald-50/60 rounded"
              dangerouslySetInnerHTML={{ __html: highlightSentence(typedText) }}
            />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden z-20">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-200 ease-linear"
          style={{ width: progressWidth }}
        />
      </div>

      {/* Topic Title */}
      <div className="mt-2 text-xs uppercase tracking-wide text-gray-500 font-medium text-center z-20">
        {slide?.topicTitle || "Untitled"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 🖋️ Optional global CSS                                                   */
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
  background-color: rgba(0,0,0,0.25);
  border-radius: 4px;
}
*/
