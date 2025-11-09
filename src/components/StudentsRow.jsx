import React, { useState } from "react";
import "./StudentsRow.css";

/**
 * StudentsRow — displays 3–4 student avatars and reaction buttons (like ❤️ 👍)
 */
export default function StudentsRow({ onReaction }) {
  const students = ["A", "B", "C", "D"];
  const [lastReaction, setLastReaction] = useState(null);

  const handleReaction = (emoji) => {
    setLastReaction(emoji);
    onReaction?.(emoji);

    // reset animation state after it ends
    setTimeout(() => setLastReaction(null), 500);
  };

  return (
    <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* ---------- Student avatars ---------- */}
      <div className="flex items-center gap-3">
        {students.map((_, idx) => (
          <div
            key={idx}
            className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-300 text-xs font-semibold"
          >
            {idx + 1}
          </div>
        ))}
      </div>

      {/* ---------- Reaction buttons ---------- */}
      <div className="flex items-center gap-3">
        {["👍", "❤️"].map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className={`w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-lg reaction-btn ${
              lastReaction === emoji ? "reaction-animate" : ""
            }`}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
