import React, { useEffect, useState, useRef } from "react";

/* -------------------------------------------------------------------------- */
/* 🎨 Highlight Logic – supports colored note marks & highlight effects       */
/* -------------------------------------------------------------------------- */
function highlightSentence(sentence = "") {
  let html = sentence;

  // Block color regions for note-like grouping
  html = html.replace(/\[red](.+?)\[\/red]/g,
    '<span class="block bg-red-50 border-l-4 border-red-400 text-red-800 font-medium rounded px-2 py-0.5 my-1">$1</span>'
  );
  html = html.replace(/\[green](.+?)\[\/green]/g,
    '<span class="block bg-green-50 border-l-4 border-green-400 text-green-800 font-medium rounded px-2 py-0.5 my-1">$1</span>'
  );
  html = html.replace(/\[blue](.+?)\[\/blue]/g,
    '<span class="block bg-blue-50 border-l-4 border-blue-400 text-blue-800 font-medium rounded px-2 py-0.5 my-1">$1</span>'
  );
  html = html.replace(/\[yellow](.+?)\[\/yellow]/g,
    '<span class="block bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 font-medium rounded px-2 py-0.5 my-1">$1</span>'
  );

  // Inline emphasis tags
  html = html.replace(/\[note](.+?)\[\/note]/g,
    '<span class="bg-amber-100 text-amber-800 italic rounded px-1">$1</span>'
  );
  html = html.replace(/\[def](.+?)\[\/def]/g,
    '<span class="font-semibold text-green-700">$1</span>'
  );
  html = html.replace(/\[ex](.+?)\[\/ex]/g,
    '<span class="text-blue-700">$1</span>'
  );
  html = html.replace(/\*\*(.+?)\*\*/g,
    '<span class="font-bold underline text-rose-700">$1</span>'
  );

  return html;
}

/* -------------------------------------------------------------------------- */
/* 📒 Notebook-Style Teleprompter                                            */
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

  /* ✍️ Show current sentence while speaking */
  useEffect(() => {
    if (!currentSentence) return;
    setTypedText(currentSentence);

    // Add to history when complete (progress === 1)
    if (progress >= 1 && currentSentence.trim()) {
      if (lastCompletedRef.current !== currentSentence) {
        lastCompletedRef.current = currentSentence;
        setHistory((prev) => [...prev.slice(-25), currentSentence]);
      }
    }
  }, [currentSentence, progress]);

  /* 🧭 Smooth scroll as new lines appear */
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [history, typedText]);

  /* 📊 Progress width */
  const progressWidth = `${Math.min(100, Math.floor(progress * 100))}%`;

  /* 🧩 Render */
  return (
    <div className="relative bg-white text-gray-900 rounded-2xl px-5 py-4 md:px-6 md:py-5 shadow-lg border border-gray-300 max-h-[55vh] overflow-hidden flex flex-col transition-all duration-300">

      {/* 📓 Notebook background */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-3 custom-scrollbar font-serif leading-relaxed relative z-10"
        style={{
          backgroundImage: `
            linear-gradient(to bottom, rgba(59,130,246,0.15) 1px, transparent 1px),
            linear-gradient(to right, rgba(239,68,68,0.6) 28px, transparent 28px)
          `,
          backgroundSize: "100% 1.8em, 100% 100%",
          backgroundRepeat: "repeat, no-repeat",
          backgroundPosition: "0 0, 0 0",
        }}
      >
        {/* 🟥 Thin margin line (fixed) */}
        <div className="absolute left-[27px] top-0 bottom-0 w-[1.5px] bg-red-400 opacity-60 z-0"></div>

        {/* 🕓 Past Sentences (soft highlight) */}
        <div className="pl-8">
          {history.map((s, idx) => (
            <p
              key={idx}
              className="text-sm md:text-base mb-1 bg-yellow-50/40 rounded px-1"
              dangerouslySetInnerHTML={{ __html: highlightSentence(s) }}
            />
          ))}

          {/* ✍️ Current Sentence (strong highlight while speaking) */}
          {typedText && (
            <p
              className="text-base md:text-lg font-medium mb-1 animate-fadeIn bg-emerald-50 border-l-4 border-emerald-400 pl-2 rounded shadow-sm"
              dangerouslySetInnerHTML={{ __html: highlightSentence(typedText) }}
            />
          )}
        </div>
      </div>

      {/* 📊 Progress bar */}
      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-[width] duration-200 ease-linear"
          style={{ width: progressWidth }}
        />
      </div>

      {/* 🏷 Topic Title */}
      <div className="mt-2 text-xs uppercase tracking-wide text-gray-500 font-medium text-center">
        {slide?.topicTitle || "Untitled"}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 🧾 Add to your global CSS once (e.g., index.css or tailwind.css)          */
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
