import React, { useEffect, useRef, useState } from "react";

const LS_KEY = "lnx_focus_timer_v1";

const MODES = [
  { id: "pomodoro", label: "🍅 Pomodoro (25 + 5)", study: 25, break: 5 },
  { id: "deep", label: "🧘 Deep Focus (50 + 10)", study: 50, break: 10 },
  { id: "custom", label: "⚙️ Custom Session", study: 30, break: 5 },
];

export default function FocusTimerPage() {
  const [mode, setMode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY));
      return saved?.mode || "pomodoro";
    } catch {
      return "pomodoro";
    }
  });

  const [phase, setPhase] = useState("study"); // "study" | "break"
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [customStudy, setCustomStudy] = useState(30);
  const [customBreak, setCustomBreak] = useState(5);

  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Load saved data
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY));
      if (saved) {
        setMode(saved.mode);
        setPhase(saved.phase || "study");
        setMinutes(saved.minutes ?? 25);
        setSeconds(saved.seconds ?? 0);
        setRunning(false);
      }
    } catch {}
  }, []);

  // Save on change
  useEffect(() => {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ mode, phase, minutes, seconds })
    );
  }, [mode, phase, minutes, seconds]);

  // Load mode presets
  useEffect(() => {
    const m = MODES.find((m) => m.id === mode);
    if (!m) return;
    if (mode === "custom") {
      setMinutes(customStudy);
    } else {
      setMinutes(m.study);
    }
    setSeconds(0);
    setPhase("study");
    setRunning(false);
  }, [mode]);

  // Countdown logic
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s > 0) return s - 1;
        setMinutes((m) => {
          if (m > 0) return m - 1;
          handlePhaseEnd();
          return 0;
        });
        return 59;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const handlePhaseEnd = () => {
    playSound();
    if (phase === "study") {
      const br =
        mode === "custom"
          ? customBreak
          : MODES.find((m) => m.id === mode).break;
      setPhase("break");
      setMinutes(br);
      setSeconds(0);
    } else {
      const st =
        mode === "custom"
          ? customStudy
          : MODES.find((m) => m.id === mode).study;
      setPhase("study");
      setMinutes(st);
      setSeconds(0);
    }
  };

  const playSound = () => {
    try {
      const audio = new Audio("/ambience/notify.mp3");
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch {}
  };

  const totalTime =
    (phase === "study"
      ? mode === "custom"
        ? customStudy * 60
        : MODES.find((m) => m.id === mode).study * 60
      : mode === "custom"
      ? customBreak * 60
      : MODES.find((m) => m.id === mode).break * 60) || 1;

  const remainingTime = minutes * 60 + seconds;
  const progress = ((totalTime - remainingTime) / totalTime) * 100;

  const themeColor = getComputedStyle(document.body).getPropertyValue(
    "--theme-accent"
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 text-white bg-slate-950 transition-all">
      <div className="max-w-md w-full flex flex-col items-center gap-6">
        <h1 className="text-2xl font-bold mb-2 text-center">
          🧠 Study Focus & Timer Tools
        </h1>

        {/* Mode Selector */}
        <div className="flex flex-wrap justify-center gap-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
                mode === m.id
                  ? "bg-yellow-400 text-black shadow-md"
                  : "border-slate-700 bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Timer Circle */}
        <div className="relative w-48 h-48 mt-6">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="12"
              fill="none"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke={themeColor || "#22d3ee"}
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${
                2 * Math.PI * 88 * (1 - progress / 100)
              }`}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.6s linear" }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold tabular-nums">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </div>
            <div className="text-sm mt-1 text-slate-400 uppercase">
              {phase === "study" ? "Study Time" : "Break"}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setRunning(!running)}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              running
                ? "bg-red-500 hover:bg-red-600"
                : "bg-emerald-400 text-black hover:bg-emerald-300"
            }`}
          >
            {running ? "Pause" : "Start"}
          </button>
          <button
            onClick={() => {
              setRunning(false);
              const m = MODES.find((m) => m.id === mode);
              setMinutes(
                mode === "custom" ? customStudy : m.study
              );
              setSeconds(0);
              setPhase("study");
            }}
            className="px-6 py-2 rounded-full font-semibold bg-slate-700 hover:bg-slate-600"
          >
            Reset
          </button>
        </div>

        {/* Custom Inputs */}
        {mode === "custom" && (
          <div className="w-full mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-slate-300">Study (min)</label>
              <input
                type="number"
                min="5"
                value={customStudy}
                onChange={(e) => setCustomStudy(parseInt(e.target.value))}
                className="w-full mt-1 rounded-lg p-2 bg-slate-800 border border-slate-600 text-center"
              />
            </div>
            <div>
              <label className="text-slate-300">Break (min)</label>
              <input
                type="number"
                min="1"
                value={customBreak}
                onChange={(e) => setCustomBreak(parseInt(e.target.value))}
                className="w-full mt-1 rounded-lg p-2 bg-slate-800 border border-slate-600 text-center"
              />
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 text-center mt-6">
          Timer persists locally. Sound plays when each session ends.
        </p>
      </div>
    </div>
  );
}
