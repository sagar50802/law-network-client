import React, { useEffect, useState } from "react";

const THEMES = [
  { id: "default", name: "Default Night", colors: "from-slate-900 to-slate-800" },
  { id: "forest", name: "Forest Calm", colors: "from-green-900 to-emerald-700" },
  { id: "sunrise", name: "Sunrise Glow", colors: "from-orange-500 to-pink-600" },
  { id: "ocean", name: "Ocean Blue", colors: "from-cyan-700 to-blue-800" },
  { id: "white", name: "Minimal White", colors: "from-gray-100 to-gray-300 text-slate-900" },
];

export default function ThemeFocusPage() {
  const [theme, setTheme] = useState(localStorage.getItem("lnx_theme") || "default");
  const [focus, setFocus] = useState(localStorage.getItem("lnx_focus") === "true");

  useEffect(() => {
    localStorage.setItem("lnx_theme", theme);
    localStorage.setItem("lnx_focus", focus);
    document.body.dataset.focus = focus ? "on" : "off";
    document.body.dataset.theme = theme;
  }, [theme, focus]);

  return (
    <div className={`min-h-screen text-white bg-gradient-to-br ${THEMES.find(t => t.id === theme)?.colors} transition-all`}>
      <div className="max-w-4xl mx-auto py-10 px-6">
        <h1 className="text-2xl font-bold mb-4">🎨 Visual Theme & Focus Mode</h1>
        <p className="text-slate-200 mb-8">Personalize your classroom look and reduce distractions while studying.</p>

        {/* Theme Picker */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-xl p-4 font-medium border transition ${
                theme === t.id
                  ? "border-yellow-400 bg-yellow-400/20 shadow-yellow-400/30 shadow-md"
                  : "border-slate-700 bg-slate-900/40 hover:bg-slate-900/60"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Focus Mode Toggle */}
        <div className="flex items-center justify-between bg-slate-800/60 rounded-xl p-4 border border-slate-700">
          <div>
            <h3 className="font-semibold text-lg">🧘 Focus Mode</h3>
            <p className="text-slate-400 text-sm">Hide distractions and keep only your classroom content visible.</p>
          </div>
          <button
            onClick={() => setFocus(!focus)}
            className={`relative px-5 py-2 rounded-full font-semibold text-sm transition ${
              focus
                ? "bg-emerald-400 text-black shadow-lg shadow-emerald-400/30"
                : "bg-slate-700 text-white border border-slate-500"
            }`}
          >
            {focus ? "On" : "Off"}
          </button>
        </div>

        {/* Tip */}
        <p className="text-xs text-slate-400 mt-4">
          Your selections are saved locally and applied across all classroom pages.
        </p>
      </div>
    </div>
  );
}
