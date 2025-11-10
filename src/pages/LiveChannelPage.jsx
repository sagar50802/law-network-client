// src/pages/LiveChannelPage.jsx
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import React from "react";

import HeadlineBar from "../components/live/HeadlineBar.jsx";
import BackgroundMotion from "../components/live/BackgroundMotion.jsx";
import AnimatedStage from "../components/live/AnimatedStage.jsx";
import MainSlide from "../components/live/MainSlide.jsx";
import AnchorBox from "../components/live/AnchorBox.jsx";
import { playSpeech, stopSpeech } from "../components/live/VoiceEngine.js";
import TVOverlay from "../components/live/TVOverlay.jsx";

const API_URL =
  import.meta.env.VITE_API_URL || "https://law-network-server.onrender.com";

/**
 * 📺 LawNetwork LIVE — Broadcast Studio Layout
 */
export default function LiveChannelPage() {
  const [slides, setSlides] = useState([]);
  const [ticker, setTicker] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(0);
  const [currentSentence, setCurrentSentence] = useState("");
  const [slideDuration, setSlideDuration] = useState(30000);

  const speechRef = useRef(null);
  const rafRef = useRef(null);

  /* ============================================================
     📡 Load Slides + Ticker
  ============================================================ */
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [slidesRes, tickerRes] = await Promise.all([
          fetch(`${API_URL}/live/slides`),
          fetch(`${API_URL}/live/ticker`),
        ]);
        const [slidesData, tickerData] = await Promise.all([
          slidesRes.json(),
          tickerRes.json(),
        ]);

        if (mounted) {
          setSlides(slidesData);
          setTicker(tickerData);
          setCurrentIndex(0);
        }
      } catch (err) {
        console.error("❌ Error loading live data:", err);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  /* ============================================================
     🎙 Voice Playback (Optimized)
  ============================================================ */
  useEffect(() => {
    if (!isPlaying || slides.length === 0) return;
    const slide = slides[currentIndex];
    if (!slide) return;

    const len = slide.content?.length || 0;
    const base = slide.programType === "DEBATE" ? 45000 : 30000;
    const factor = Math.min(3, Math.max(1, len / 400));
    setSlideDuration(base * factor);

    playSpeech(
      slide,
      isMuted,
      speechRef,
      setActiveSpeaker,
      setCurrentSentence,
      () => {
        rafRef.current = requestAnimationFrame(() => {
          setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
          }, 600);
        });
      }
    );

    return () => {
      cancelAnimationFrame(rafRef.current);
      stopSpeech(speechRef);
    };
  }, [isPlaying, currentIndex, slides, isMuted]);

  /* ============================================================
     🔁 Auto Refresh (Every 5 Minutes)
  ============================================================ */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [slidesRes, tickerRes] = await Promise.all([
          fetch(`${API_URL}/live/slides`),
          fetch(`${API_URL}/live/ticker`),
        ]);
        const [newSlides, newTicker] = await Promise.all([
          slidesRes.json(),
          tickerRes.json(),
        ]);

        if (newSlides.length !== slides.length) setSlides(newSlides);
        if (newTicker.length !== ticker.length) setTicker(newTicker);
      } catch (err) {
        console.warn("Auto-refresh failed:", err);
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [slides.length, ticker.length]);

  /* ============================================================
     ▶️ Controls Handlers
  ============================================================ */
  const handleNext = useCallback(() => {
    stopSpeech(speechRef);
    setCurrentIndex((p) => (p + 1) % slides.length);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    stopSpeech(speechRef);
    setCurrentIndex((p) => (p === 0 ? slides.length - 1 : p - 1));
  }, [slides.length]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  /* ============================================================
     🔗 Share Handler
  ============================================================ */
  const handleShareLive = useCallback(async () => {
    if (typeof window === "undefined") return;
    const slide = slides[currentIndex];
    const url = window.location.href;
    const title = slide?.title || "LawNetwork Live";
    const text = `${title} — Watch now on LawNetwork Live`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        console.warn("Web Share cancelled.");
      }
    }

    const fullText = `${text} ${url}`;
    const whatsapp = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    const telegram = `https://t.me/share/url?url=${encodeURIComponent(
      url
    )}&text=${encodeURIComponent(text)}`;
    const choice = window.prompt(
      "Share this live:\n1 = WhatsApp\n2 = Telegram\n3 = Copy link",
      "1"
    );
    if (choice === "2") window.open(telegram, "_blank");
    else if (choice === "3") {
      try {
        await navigator.clipboard.writeText(fullText);
        alert("🔗 Link copied!");
      } catch {
        alert(fullText);
      }
    } else window.open(whatsapp, "_blank");
  }, [slides, currentIndex]);

  /* ============================================================
     🧩 Memoized Computations
  ============================================================ */
  const currentSlide = slides[currentIndex];
  const isSingleAnchor = useMemo(
    () => currentSlide?.avatars?.length === 1,
    [currentSlide]
  );

  /* ============================================================
     🧩 MAIN RENDER
  ============================================================ */
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* 🔙 Simple Back + mini nav */}
      <nav className="z-[10000] bg-slate-950/95 border-b border-slate-800 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2 text-xs md:text-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="px-2 py-1 rounded-full bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-600"
            >
              ← Back
            </button>
            <a
              href="/"
              className="font-semibold tracking-wide hover:text-emerald-300"
            >
              Law Network
            </a>
          </div>
          <div className="hidden md:flex items-center gap-4 text-slate-300">
            <a href="/articles" className="hover:text-white">
              Articles
            </a>
            <a href="/classroom" className="hover:text-white">
              Classroom
            </a>
            <a href="/live" className="text-red-400 font-semibold">
              LIVE
            </a>
          </div>
        </div>
      </nav>

      {/* 🟡 LawPrepX Channel Header Bar */}
      <header className="z-[9998] w-full flex items-center justify-between px-6 py-2 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 text-black font-semibold border-b-4 border-black shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        {/* Left: Channel Logo + Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-md bg-yellow-400 border-4 border-black text-black font-extrabold text-lg shadow-lg">
            X
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-md font-bold tracking-wide">
              LAWPREPX LIVE
            </span>
            <span className="text-xs font-medium">
              Official Classroom Broadcast
            </span>
          </div>
        </div>

        {/* Right: LIVE Time */}
        <div className="flex items-center gap-2 bg-black text-yellow-400 px-3 py-1 rounded-md text-sm font-bold border border-yellow-400">
          <span>LIVE TIME</span>
          <span className="text-white font-mono">
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </header>

      {/* 🔴 Main LIVE canvas */}
      <div className="relative flex-1 overflow-hidden text-white bg-black">
        {/* 📰 Overlay Header + Breaking News */}
        <TVOverlay breakingNews={ticker.map((t) => t.text)} />

        {/* 🎥 Animated Background */}
        <BackgroundMotion type={currentSlide?.programType} />

        {/* ⚡ Small floating indicator for play/pause */}
        <div className="absolute top-4 right-6 z-50 flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${
              isPlaying ? "bg-green-400 animate-pulse" : "bg-gray-500"
            }`}
          ></span>
          <span className="text-xs text-gray-300 select-none">
            {isPlaying ? "LIVE" : "Paused"}
          </span>
        </div>

        {/* 🧩 Content */}
        <div className="relative z-10 flex flex-col items-center justify-between min-h-full pt-16 pb-20">
          <HeadlineBar slide={currentSlide} />

          <main
            className={`flex w-full flex-grow items-center justify-center px-4 relative overflow-hidden transition-all duration-500 ${
              isSingleAnchor ? "flex-col" : "flex-col md:flex-row"
            }`}
          >
            {/* 👥 Avatars */}
            <div
              className={`flex-1 flex items-center justify-center ${
                isSingleAnchor ? "mt-6" : "mt-0"
              }`}
            >
              <AnimatedStage
                slide={currentSlide}
                activeSpeaker={activeSpeaker}
                layout={isSingleAnchor ? "center" : "grid"}
              />
            </div>

            {/* 🎤 Floating Anchor Box */}
            <div className="hidden sm:block absolute bottom-24 left-6 max-w-xs">
              <AnchorBox
                slide={currentSlide}
                activeSpeaker={activeSpeaker}
                currentSentence={currentSentence}
              />
            </div>

            {/* 🧾 Teleprompter */}
            <div className="flex-1 flex items-center justify-center p-4 mt-4">
              <MainSlide
                slide={currentSlide}
                currentSentence={currentSentence}
                duration={slideDuration}
              />
            </div>
          </main>

          {/* 📤 Share Button */}
          <div className="relative mt-6 mb-4">
            <button
              onClick={handleShareLive}
              className="font-bold px-5 py-2 rounded-lg transition bg-[#c7a537] hover:bg-yellow-400 text-black shadow-md"
            >
              📤 Share This Live
            </button>
          </div>

          {/* 🎚 Controls */}
          <footer className="w-full bg-black/80 backdrop-blur-md border-t border-gray-700 z-30 mt-2 mb-16 shadow-[0_-2px_10px_rgba(0,0,0,0.5)]">
            <Controls
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              isMuted={isMuted}
              onToggleMute={handleToggleMute}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          </footer>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   🎛 Controls Component (With Visual Feedback)
=========================================================== */
const Controls = React.memo(function Controls({
  isPlaying,
  onTogglePlay,
  isMuted,
  onToggleMute,
  onNext,
  onPrev,
}) {
  return (
    <div className="flex justify-center gap-3 py-2 text-sm flex-wrap">
      <Button onClick={onPrev}>⏮ Prev</Button>

      <Button
        onClick={onTogglePlay}
        className={`relative ${
          isPlaying
            ? "bg-green-600 hover:bg-green-500"
            : "bg-red-600 hover:bg-red-500"
        }`}
      >
        {isPlaying ? (
          <>
            ⏸ Pause
            <span className="absolute inset-0 rounded bg-green-400/20 animate-pulse"></span>
          </>
        ) : (
          "▶️ Play"
        )}
      </Button>

      <Button onClick={onToggleMute}>
        {isMuted ? "🔇 Unmute" : "🔊 Mute"}
      </Button>

      <Button onClick={onNext}>⏭ Next</Button>
    </div>
  );
});

/* ============================================================
   🎚 Button Subcomponent
=========================================================== */
const Button = React.memo(function Button({ onClick, children, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-1 rounded transition text-white font-semibold shadow-sm bg-gray-800 hover:bg-gray-700 ${className}`}
    >
      {children}
    </button>
  );
});
