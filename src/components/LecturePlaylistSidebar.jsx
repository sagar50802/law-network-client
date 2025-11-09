import React, { useEffect, useRef } from "react";
import "./LecturePlaylistSidebar.css";

/**
 * LecturePlaylistSidebar — displays lecture list with active state & click support
 */
export default function LecturePlaylistSidebar({
  lectures = [],
  currentLectureId,
  onSelectLecture,
}) {
  const activeRef = useRef(null);

  // 🔄 Auto-scroll the active lecture into view when selected
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentLectureId]);

  if (!lectures.length) {
    return (
      <aside className="bg-slate-900 text-slate-50 rounded-2xl p-4 md:p-5 border border-slate-700 min-w-[220px] flex items-center justify-center text-sm text-slate-400">
        No lectures scheduled today
      </aside>
    );
  }

  return (
    <aside className="bg-slate-900 text-slate-50 rounded-2xl p-4 md:p-5 border border-slate-700 flex flex-col gap-3 min-w-[220px] overflow-y-auto max-h-[80vh]">
      <div className="font-semibold text-lg mb-1">Today&apos;s Lectures</div>

      <div className="flex flex-col gap-2">
        {lectures.map((lec, idx) => {
          const active = lec._id === currentLectureId;
          const dotClass =
            lec.status === "released"
              ? "dot-live"
              : lec.status === "scheduled"
              ? "dot-scheduled"
              : lec.status === "completed"
              ? "dot-completed"
              : "dot-draft";

          return (
            <button
              key={lec._id}
              ref={active ? activeRef : null}
              onClick={() => onSelectLecture?.(lec)}
              className={`playlist-item w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between border transition-colors duration-150 ${
                active
                  ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/40 shadow-inner"
                  : "bg-slate-800/70 text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
              }`}
            >
              <div>
                <div className="font-medium truncate">
                  Lecture {idx + 1} • {lec.title}
                </div>
                <div className="text-[11px] text-slate-400">
                  {lec.status === "released"
                    ? "🔴 Live now"
                    : lec.status === "scheduled"
                    ? `⏰ Starts at ${new Date(
                        lec.releaseAt
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : lec.status === "completed"
                    ? "✅ Completed"
                    : "📝 Draft"}
                </div>
              </div>

              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
