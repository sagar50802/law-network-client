import React from "react";
import { useNavigate } from "react-router-dom";

export default function LibraryNav() {
  const navigate = useNavigate();

  return (
    <div className="w-full border-b border-slate-800 bg-black/50">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2 text-xs sm:text-sm">
        <div className="flex items-center gap-3 text-slate-300">
          <button
            onClick={() => navigate("/")}
            className="px-2 py-1 rounded-full bg-slate-900/70 border border-slate-700 hover:bg-slate-800 text-slate-100"
          >
            ← Exit Library
          </button>
          <span className="hidden sm:inline text-slate-400">
            You are in the virtual reading room
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-300">
          <span className="text-[11px] sm:text-xs">
            Silence mode · No distractions
          </span>
        </div>
      </div>
    </div>
  );
}
