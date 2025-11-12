import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function ClassroomDrawerMenu() {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);

  // ✅ Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // 🎓 Classroom-only tools
  const classroomTools = [
    { emoji: "🎵", label: "Background Ambience", path: "/classroom/ambience", color: "from-cyan-400 to-blue-500" },
    { emoji: "🎨", label: "Visual Theme & Focus Mode", path: "/classroom/theme", color: "from-pink-400 to-rose-500" },
    { emoji: "💬", label: "Motivational Flip Book", path: "/classroom/flipbook", color: "from-yellow-400 to-orange-500" },
    { emoji: "🧠", label: "Study Focus & Timer Tools", path: "/classroom/focus", color: "from-green-400 to-emerald-500" },
    { emoji: "📚", label: "Quick Revision Notebook", path: "/classroom/notebook", color: "from-indigo-400 to-blue-500" },
    { emoji: "⚖️", label: "Interactive Case Laws Timeline", path: "/classroom/timeline", color: "from-purple-400 to-fuchsia-500" },
    { emoji: "🎧", label: "Voice Personalization", path: "/classroom/voice", color: "from-amber-400 to-yellow-500" },
    { emoji: "💪", label: "Motivation & Rewards", path: "/classroom/rewards", color: "from-pink-500 to-rose-500" },
    { emoji: "🧭", label: "Learning Analytics", path: "/classroom/analytics", color: "from-emerald-400 to-green-500" },
    { emoji: "☀️", label: "Mind Refresh Zone", path: "/classroom/refresh", color: "from-yellow-400 to-lime-500" },
    { emoji: "🧘", label: "Mind-Reset Mode", path: "/classroom/calm", color: "from-teal-400 to-cyan-500" },
  ];

  // 🌐 Global site navigation (like Navbar)
  const siteSections = [
    { emoji: "📰", label: "Articles", path: "/articles", color: "from-sky-400 to-blue-500" },
    { emoji: "💼", label: "Consultancy", path: "/consultancy", color: "from-purple-400 to-indigo-500" },
    { emoji: "📘", label: "Preparation", path: "/prep", color: "from-green-400 to-teal-500" },
    { emoji: "🧾", label: "Test Series", path: "/tests", color: "from-amber-400 to-orange-500" },
    { emoji: "🎙️", label: "Podcasts", path: "/podcasts", color: "from-rose-400 to-pink-500" },
    { emoji: "🎞️", label: "Video Gallery", path: "/videos", color: "from-indigo-400 to-purple-500" },
    { emoji: "📖", label: "PDF Notebook", path: "/notebook", color: "from-teal-400 to-cyan-500" },
    { emoji: "🧪", label: "Plagiarism", path: "/plagiarism", color: "from-red-400 to-pink-500" },
    { emoji: "📑", label: "Research Drafting", path: "/research-drafting", color: "from-green-400 to-emerald-500" },
    { emoji: "📺", label: "Live Channel", path: "/live", color: "from-orange-400 to-amber-500" },
  ];

  return (
    <>
      {/* 🟢 Floating glowing hamburger (bottom-right) */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[9999] rounded-full p-4 shadow-2xl bg-slate-900/90 border border-white/20 text-white hover:scale-110 transition-all duration-300 backdrop-blur-md 
        animate-pulse-glow"
        whileTap={{ scale: 0.9 }}
        aria-label="Open Classroom Menu"
      >
        <Menu size={24} />
      </motion.button>

      {/* 🔆 Glow Animation */}
      <style>
        {`
          @keyframes pulseGlow {
            0% { box-shadow: 0 0 8px 2px rgba(100, 200, 255, 0.4); }
            50% { box-shadow: 0 0 18px 6px rgba(0, 150, 255, 0.6); }
            100% { box-shadow: 0 0 8px 2px rgba(100, 200, 255, 0.4); }
          }
          .animate-pulse-glow {
            animation: pulseGlow 2.2s infinite ease-in-out;
          }
        `}
      </style>

      {/* 🧠 Drawer Backdrop */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(false)}
            />

            {/* 🪄 Drawer Panel */}
            <motion.div
              ref={drawerRef}
              className="fixed top-0 right-0 h-full w-[75%] sm:w-[28%] bg-slate-900/95 backdrop-blur-2xl text-white z-[9999] shadow-2xl border-l border-slate-700 flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
                <h3 className="text-lg font-semibold">🎓 Classroom Tools</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-800/60 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 🔹 Scrollable Menu Section */}
              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* 🧭 Global Navigation */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    Main Features
                  </h4>
                  <div className="space-y-2">
                    {siteSections.map((f, i) => (
                      <Link
                        key={i}
                        to={f.path}
                        onClick={() => setOpen(false)}
                        className={`block rounded-xl px-3 py-2 font-medium bg-gradient-to-r ${f.color} text-transparent bg-clip-text hover:text-white hover:bg-slate-800/70 transition duration-200`}
                      >
                        <span className="mr-2">{f.emoji}</span>
                        {f.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 📘 Classroom Tools */}
                <div className="pt-4 border-t border-slate-700/40">
                  <h4 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    Classroom Experience
                  </h4>
                  <div className="space-y-2">
                    {classroomTools.map((f, i) => (
                      <Link
                        key={i}
                        to={f.path}
                        onClick={() => setOpen(false)}
                        className={`block rounded-xl px-3 py-2 font-medium bg-gradient-to-r ${f.color} text-transparent bg-clip-text hover:text-white hover:bg-slate-800/70 transition duration-200`}
                      >
                        <span className="mr-2">{f.emoji}</span>
                        {f.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-700/50">
                © Law Network Classroom
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
