import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * 🎵 Background Ambience — Classroom addon (frontend-only)
 * - Plays a selected looping ambience
 * - Remembers selection + volume via localStorage
 * - Smooth volume ramp, safe cleanup
 *
 * Drop this at: src/pages/classroom/AmbiencePage.jsx
 * Make sure your audio files exist (see ambienceTracks below).
 */

const LS_KEY = "lnx_ambience_v1";

const ambienceTracks = [
  { id: "none",   emoji: "🔘", name: "None",                src: null },
  { id: "rain",   emoji: "🌧️", name: "Rainy Library",      src: "/ambience/rain.mp3" },
  { id: "birds",  emoji: "🐦", name: "Morning Birds",       src: "/ambience/birds.mp3" },
  { id: "cafe",   emoji: "☕", name: "Café Study Mode",     src: "/ambience/cafe.mp3" },
  { id: "library",emoji: "🏛️", name: "Old Library",        src: "/ambience/old-library.mp3" },
  { id: "tanpura",emoji: "🪔", name: "Indian Tanpura",      src: "/ambience/tanpura.mp3" },
  { id: "night",  emoji: "🌃", name: "Midnight Focus",      src: "/ambience/midnight.mp3" },
];

export default function AmbiencePage() {
  const initial = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      return {
        id: saved.id ?? "none",
        volume: typeof saved.volume === "number" ? saved.volume : 0.35,
        isOn: saved.id && saved.id !== "none" ? true : false,
      };
    } catch {
      return { id: "none", volume: 0.35, isOn: false };
    }
  }, []);

  const [currentId, setCurrentId] = useState(initial.id);
  const [volume, setVolume] = useState(initial.volume);
  const [isOn, setIsOn] = useState(initial.isOn);
  const [errorMsg, setErrorMsg] = useState("");

  const audioRef = useRef(null);
  const fadeRef = useRef(null);

  const current = ambienceTracks.find((t) => t.id === currentId) || ambienceTracks[0];

  /* Persist to localStorage */
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ id: currentId, volume, isOn }));
  }, [currentId, volume, isOn]);

  /* Create or update audio element when preset / power changes */
  useEffect(() => {
    // clear previous fade interval
    if (fadeRef.current) clearInterval(fadeRef.current);

    // Stop & cleanup if off or "None"
    if (!isOn || !current?.src) {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = "";
        } catch {}
      }
      return;
    }

    // (Re)create audio element
    const audio = new Audio(current.src);
    audio.loop = true;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous"; // safe if files are public
    audio.volume = 0; // fade-in from 0 → target
    audioRef.current = audio;

    setErrorMsg("");
    audio
      .play()
      .then(() => {
        // Fade in smoothly to target volume
        smoothSetVolume(volume, 350);
      })
      .catch((err) => {
        setErrorMsg("Tap anywhere to allow audio (browser autoplay policy).");
        console.warn("Ambience play blocked:", err);
      });

    // Cleanup on change/unmount
    return () => {
      if (fadeRef.current) clearInterval(fadeRef.current);
      try {
        audio.pause();
        audio.src = "";
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, isOn]);

  /* Apply volume changes with gentle ramp */
  useEffect(() => {
    if (!audioRef.current) return;
    smoothSetVolume(volume, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  /* Unlock on first user interaction (mobile autoplay) */
  useEffect(() => {
    const unlock = () => {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => setErrorMsg(""))
          .catch(() => {});
      }
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  function smoothSetVolume(target, ms = 250) {
    if (!audioRef.current) return;
    if (fadeRef.current) clearInterval(fadeRef.current);

    const a = audioRef.current;
    const start = a.volume;
    const diff = target - start;
    const steps = Math.max(6, Math.round(ms / 25));
    let i = 0;

    fadeRef.current = setInterval(() => {
      i++;
      const t = i / steps;
      // ease-out
      const eased = 1 - Math.pow(1 - t, 2);
      a.volume = clamp01(start + diff * eased);
      if (i >= steps) {
        a.volume = clamp01(target);
        clearInterval(fadeRef.current);
      }
    }, ms / steps);
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function togglePower() {
    // If selecting off
    if (isOn && currentId !== "none") {
      smoothSetVolume(0, 200);
      setTimeout(() => setIsOn(false), 180);
    } else {
      setIsOn(true);
      if (currentId === "none") {
        setCurrentId("rain"); // default to rain when turning on
      }
    }
  }

  function pick(id) {
    setCurrentId(id);
    if (id === "none") {
      setIsOn(false);
    } else {
      setIsOn(true);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col gap-6 md:gap-8 px-4 md:px-8 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">🎵 Background Ambience</h1>
          <p className="text-slate-300 text-sm md:text-base">
            Create your study vibe with subtle looping ambience. Runs quietly while you learn.
          </p>
        </div>

        {/* Power toggle with glow */}
        <button
          onClick={togglePower}
          className={`relative px-4 py-2 rounded-full font-semibold text-sm transition
            ${isOn ? "bg-emerald-400 text-black" : "bg-slate-800 text-slate-200 border border-slate-600"}
          `}
        >
          {isOn ? "On" : "Off"}
          {isOn && (
            <span className="absolute -inset-1 rounded-full blur-md bg-emerald-400/30 pointer-events-none" />
          )}
        </button>
      </div>

      {/* Error / hint */}
      {errorMsg && (
        <div className="text-amber-300 text-sm bg-amber-900/20 border border-amber-600/40 rounded-lg px-3 py-2">
          {errorMsg}
        </div>
      )}

      {/* Presets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {ambienceTracks.map((t) => {
          const active = isOn && t.id === currentId && t.id !== "none";
          return (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={`group relative rounded-2xl border p-3 md:p-4 text-left transition
                ${active ? "border-emerald-400/70 bg-emerald-400/10" : "border-slate-700 bg-slate-900/60 hover:bg-slate-900"}
              `}
            >
              <div className="text-2xl">{t.emoji}</div>
              <div className="mt-1 font-medium">{t.name}</div>
              {active && (
                <>
                  <div className="mt-1 text-emerald-300 text-xs">Playing…</div>
                  <span className="absolute -inset-px rounded-2xl ring-2 ring-emerald-400/40 animate-pulse pointer-events-none" />
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Volume */}
      <div className="mt-2 md:mt-4">
        <label className="text-sm text-slate-300 mb-1 block">Volume</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-emerald-400"
          />
          <div className="w-12 text-right text-slate-300 text-sm">{Math.round(volume * 100)}%</div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Tip: keep ambience between <span className="text-slate-300">20–40%</span> so it doesn’t overpower your lecture.
        </p>
      </div>

      {/* Info */}
      <div className="mt-2 text-xs text-slate-500">
        Uses your browser audio only. No external API. Files served from <code className="text-slate-300">/ambience/*</code>.
      </div>
    </div>
  );
}
