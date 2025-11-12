import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * 🎵 Background Ambience — Classroom addon (frontend-only)
 * - Plays a selected looping ambience persistently (even after leaving page)
 * - Remembers selection + volume via localStorage
 * - Smooth fade transitions
 * - Includes floating Back button to return to Classroom
 */

const LS_KEY = "lnx_ambience_v1";

const ambienceTracks = [
  { id: "none", emoji: "🔘", name: "None", src: null },
  { id: "rain", emoji: "🌧️", name: "Rainy Library", src: "/ambience/rain.mp3" },
  { id: "birds", emoji: "🐦", name: "Morning Birds", src: "/ambience/birds.mp3" },
  { id: "cafe", emoji: "☕", name: "Café Study Mode", src: "/ambience/cafe.mp3" },
  { id: "library", emoji: "🏛️", name: "Old Library", src: "/ambience/old-library.mp3" },
  { id: "tanpura", emoji: "🪔", name: "Indian Tanpura", src: "/ambience/tanpura.mp3" },
  { id: "night", emoji: "🌃", name: "Midnight Focus", src: "/ambience/midnight.mp3" },
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

  const fadeRef = useRef(null);
  const current = ambienceTracks.find((t) => t.id === currentId) || ambienceTracks[0];

  /* Persist settings */
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ id: currentId, volume, isOn }));
  }, [currentId, volume, isOn]);

  /* Persistent global audio across routes */
  useEffect(() => {
    if (!window.globalAmbienceAudio) {
      const a = new Audio();
      a.loop = true;
      a.preload = "auto";
      a.crossOrigin = "anonymous";
      window.globalAmbienceAudio = a;
    }
    const audio = window.globalAmbienceAudio;

    if (!isOn || !current?.src) {
      smoothSetVolume(0, 300);
      return;
    }

    if (audio.src !== window.location.origin + current.src) {
      audio.src = current.src;
      audio.play().catch((err) => {
        setErrorMsg("Tap anywhere to allow audio playback (browser policy).");
        console.warn("Audio blocked:", err);
      });
    }
    audio.volume = 0;
    smoothSetVolume(volume, 350);
    setErrorMsg("");

    // don’t cleanup here — keep persistent
  }, [currentId, isOn]);

  /* Apply volume change */
  useEffect(() => {
    if (window.globalAmbienceAudio) smoothSetVolume(volume, 200);
  }, [volume]);

  /* Unlock audio (mobile) */
  useEffect(() => {
    const unlock = () => {
      const a = window.globalAmbienceAudio;
      if (a) a.play().catch(() => {});
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

  /* Smooth volume fade */
  function smoothSetVolume(target, ms = 250) {
    const a = window.globalAmbienceAudio;
    if (!a) return;
    if (fadeRef.current) clearInterval(fadeRef.current);

    const start = a.volume;
    const diff = target - start;
    const steps = Math.max(6, Math.round(ms / 25));
    let i = 0;

    fadeRef.current = setInterval(() => {
      i++;
      const t = i / steps;
      const eased = 1 - Math.pow(1 - t, 2);
      a.volume = clamp01(start + diff * eased);
      if (i >= steps) clearInterval(fadeRef.current);
    }, ms / steps);
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function togglePower() {
    if (isOn && currentId !== "none") {
      smoothSetVolume(0, 250);
      setTimeout(() => setIsOn(false), 200);
    } else {
      setIsOn(true);
      if (currentId === "none") setCurrentId("rain");
    }
  }

  function pick(id) {
    setCurrentId(id);
    setIsOn(id !== "none");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col gap-6 md:gap-8 px-4 md:px-8 py-6 md:py-10 relative">
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
          className={`relative px-4 py-2 rounded-full font-semibold text-sm transition ${
            isOn
              ? "bg-emerald-400 text-black shadow-lg shadow-emerald-400/20"
              : "bg-slate-800 text-slate-200 border border-slate-600"
          }`}
        >
          {isOn ? "On" : "Off"}
          {isOn && (
            <span className="absolute -inset-1 rounded-full blur-md bg-emerald-400/40 pointer-events-none animate-pulse" />
          )}
        </button>
      </div>

      {/* Error */}
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
              className={`group relative rounded-2xl border p-3 md:p-4 text-left transition ${
                active
                  ? "border-emerald-400/70 bg-emerald-400/10"
                  : "border-slate-700 bg-slate-900/60 hover:bg-slate-900"
              }`}
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

      {/* Floating Back Button */}
      <Link
        to="/classroom"
        className="fixed bottom-4 left-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all animate-pulse hover:scale-105"
      >
        <ArrowLeft size={16} /> Back to Classroom
      </Link>

      {/* Info */}
      <div className="mt-4 text-xs text-slate-500 pb-8">
        Plays persistently in background. Files served from <code className="text-slate-300">/ambience/*</code>.
      </div>
    </div>
  );
}
