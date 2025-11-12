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

  // 🎨 Feature list
  const features = [
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

  return (
    <>
      {/* 🟢 Floating hamburger (bottom-right) */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[9999] rounded-full p-3 shadow-xl bg-slate-900/85 border border-white/20 text-white hover:scale-110 transition-all duration-300 backdrop-blur-md"
        whileTap={{ scale: 0.9 }}
        aria-label="Open Classroom Menu"
      >
        <Menu size={22} />
      </motion.button>

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
              transition={{ type: 'spring', stiffness: 120, damping: 18 }}
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

              {/* Features List */}
              <div className="overflow-y-auto flex-1 p-4 space-y-2">
                {features.map((f, i) => (
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
