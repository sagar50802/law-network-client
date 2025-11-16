import React, { useEffect, useRef, useState } from "react";

export default function AmbienceAudioToggle() {
  const audioRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!audioRef.current) return;
    if (enabled) {
      audioRef.current.volume = 0.3;
      audioRef.current
        .play()
        .catch(() => console.warn("Autoplay prevented by browser"));
    } else {
      audioRef.current.pause();
    }
  }, [enabled]);

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-300 hidden sm:inline">
        Library ambience
      </span>
      <button
        onClick={() => setEnabled((v) => !v)}
        className={`px-2 py-1 rounded-full border text-[11px] ${
          enabled
            ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
            : "border-slate-600 text-slate-300 bg-black/40"
        }`}
      >
        {enabled ? "On" : "Off"}
      </button>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        loop
        src="/audio/library-ambience.mp3" // put your file in /public/audio
      />
    </div>
  );
}
