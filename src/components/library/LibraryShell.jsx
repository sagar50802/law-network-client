import React from "react";
import AmbienceAudioToggle from "./AmbienceAudioToggle.jsx";

export default function LibraryShell({ children }) {
  return (
    <div className="relative min-h-screen bg-black text-slate-100 overflow-hidden">
      {/* Background image (virtual library) */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{
          backgroundImage: "url('/backgrounds/library-room.jpg')", // change to your path
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/90" />

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top bar with brand + ambience toggle */}
        <header className="w-full border-b border-slate-800 bg-black/60 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-yellow-400 bg-yellow-500/20 flex items-center justify-center text-xs font-semibold">
                LAW
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold tracking-wide">
                  Law Network Library
                </span>
                <span className="text-[11px] text-slate-300">
                  Quiet reading space · Free & Paid books
                </span>
              </div>
            </div>

            <AmbienceAudioToggle />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col pt-4">{children}</main>
      </div>
    </div>
  );
}
