import { useEffect, useState, useRef } from "react";

/**
 * 🟨 TVOverlay — LawNetwork Studio Header (Final Mobile Optimized)
 * --------------------------------------------------------
 * ✅ Smooth readable ticker (desktop + mobile)
 * ✅ Starts instantly (no lag)
 * ✅ Auto-adjusts duration by text length + screen size
 * ✅ Live clock + header intact
 */

export default function TVOverlay({ breakingNews = [] }) {
  const [time, setTime] = useState(new Date());
  const tickerRef = useRef(null);

  /* 🕒 Update clock every second */
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const newsTicker =
    breakingNews.length > 0
      ? breakingNews.join("  •  ")
      : "LAW KI BAAT — न्याय बनाम कानून: असली विजेता कौन?";

  /* ⚙️ Dynamic scroll duration: slower for long text + mobile */
  useEffect(() => {
    const el = tickerRef.current;
    if (!el) return;

    const len = newsTicker.length;
    const isMobile = window.innerWidth < 768;

    // Base duration: longer text = slower, mobile = even slower
    let duration = Math.min(100, Math.max(55, len / 1.7));
    if (isMobile) duration *= 1.8; // slow down mobile by ~80%

    el.style.animationDuration = `${duration}s`;

    // 🧠 Force restart immediately to apply new speed
    el.style.animation = "none";
    void el.offsetWidth; // trigger reflow
    el.style.animation = `marquee ${duration}s linear infinite`;
  }, [newsTicker]);

  return (
    <>
      {/* 🔝 Header */}
      <div className="fixed top-0 left-0 w-full bg-black border-b border-yellow-400/40 z-50 flex justify-between items-center px-4 sm:px-8 py-2 shadow-[0_2px_20px_rgba(250,204,21,0.15)]">
        <div className="flex items-center gap-3">
          <span className="text-yellow-400 font-semibold text-lg sm:text-xl tracking-wide drop-shadow-[0_0_6px_#facc15]">
            LAWNETWORK LIVE
          </span>
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.8)]">
            LIVE
          </span>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          <span className="font-extrabold text-blue-900 bg-yellow-400 px-4 py-1 rounded-md text-sm sm:text-base uppercase shadow-[0_0_15px_rgba(250,204,21,0.8)] tracking-wide">
            LAWPREPX
          </span>
          <div className="flex flex-col items-center">
            <span className="text-yellow-400 text-[10px] sm:text-xs uppercase tracking-wider">
              Live Time
            </span>
            <div className="px-3 py-1 border border-yellow-400 bg-black/70 rounded-md text-yellow-300 font-mono text-xs sm:text-sm shadow-[0_0_10px_rgba(250,204,21,0.3)]">
              {formattedTime}
            </div>
          </div>
        </div>
      </div>

      {/* 🔻 Breaking News Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-r from-red-800 via-red-700 to-red-800 text-white py-2 text-sm sm:text-base font-semibold overflow-hidden z-40 border-t border-red-500/60 shadow-[0_-2px_10px_rgba(255,0,0,0.4)]">
        <div ref={tickerRef} className="whitespace-nowrap animate-marquee px-6">
          🛑 BREAKING NEWS: {newsTicker}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 70s linear infinite;
          will-change: transform;
          animation-delay: -10s;
        }
      `}</style>
    </>
  );
}
