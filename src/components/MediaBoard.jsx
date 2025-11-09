import React, { useEffect, useRef, useState } from "react";
import "./MediaBoard.css";

/* -------------------------------------------------------------------------- */
/* ✅ MediaBoard — Video, Audio, Image area                                   */
/* -------------------------------------------------------------------------- */
export function MediaBoard({ media = {}, autoPlay = true, isPlaying = true }) {
  const { videoUrl, audioUrl, imageUrl } = media;
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [audioActive, setAudioActive] = useState(false);

  // Handle auto-play / pause when `isPlaying` changes
  useEffect(() => {
    const vid = videoRef.current;
    const aud = audioRef.current;

    if (isPlaying && autoPlay) {
      if (vid && videoUrl) vid.play().catch(() => {});
      if (aud && audioUrl) {
        aud.play().catch(() => {});
        setAudioActive(true);
      }
    } else {
      if (vid) vid.pause();
      if (aud) aud.pause();
      setAudioActive(false);
    }
  }, [isPlaying, autoPlay, videoUrl, audioUrl]);

  return (
    <div className="bg-slate-950/95 rounded-2xl p-3 md:p-4 border border-slate-800 flex flex-col md:flex-row gap-3 media-fade-in">
      {/* ---------- Video Section ---------- */}
      <div className="flex-1 min-w-[200px]">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full rounded-xl shadow-md border border-slate-800"
            controls
            playsInline
            preload="metadata"
            controlsList="nodownload"         // 🚫 hides download button
            disablePictureInPicture            // 🚫 disables PiP mode
          />
        ) : (
          <div className="w-full aspect-video rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 text-sm">
            Video area
          </div>
        )}

        {/* ---------- Audio Section ---------- */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            className="w-full mt-2"            // ✅ show player with controls
            preload="metadata"
            controls                            // ✅ adds play/pause/volume
          />
        )}

        {/* Waveform (animated if active) */}
        <div className="mt-2 h-8 bg-slate-900 rounded-lg flex items-center px-2 gap-[2px] overflow-hidden">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className={`wave ${!audioActive ? "opacity-40" : ""}`}
              style={{
                animationPlayState: audioActive ? "running" : "paused",
              }}
            />
          ))}
        </div>
      </div>

      {/* ---------- Image / Thumbnail ---------- */}
      <div className="w-full md:w-40 flex-shrink-0 flex flex-col justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Slide illustration"
            className="w-full h-full object-cover rounded-xl border border-slate-700"
          />
        ) : (
          <div className="w-full min-h-[120px] rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 text-xs">
            Illustration
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ✅ MediaControlPanel                                                       */
/* -------------------------------------------------------------------------- */
export function MediaControlPanel({ active }) {
  return (
    <div className="flex items-center gap-3 text-xs mt-2">
      <MediaIcon label="Audio" emoji="🎧" active={active.audio} />
      <MediaIcon label="Video" emoji="🎥" active={active.video} />
      <MediaIcon label="Image" emoji="🖼️" active={active.image} />
    </div>
  );
}

function MediaIcon({ emoji, label, active }) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] ${
        active
          ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
          : "border-slate-600 text-slate-300 bg-slate-800/70"
      } transition-all duration-300`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
    </div>
  );
}
