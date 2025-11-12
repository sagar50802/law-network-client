import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * 🎨 ClassroomHamburgerMenu
 * Floating colorful menu with navigation links
 * Works standalone — no modification to ClassroomLivePage.jsx
 */

export default function ClassroomHamburgerMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const features = [
    { emoji: "🎵", label: "Background Ambience", path: "/ambience", color: "from-cyan-500 to-blue-500" },
    { emoji: "🎨", label: "Visual Theme & Focus Mode", path: "/theme", color: "from-pink-400 to-rose-500" },
    { emoji: "💬", label: "Motivational Flip Book", path: "/flipbook", color: "from-yellow-400 to-orange-500" },
    { emoji: "🧠", label: "Study Focus & Timer Tools", path: "/focus", color: "from-green-400 to-emerald-500" },
    { emoji: "📚", label: "Quick Revision Notebook", path: "/notebook", color: "from-indigo-400 to-blue-500" },
    { emoji: "⚖️", label: "Interactive Case Laws Timeline", path: "/timeline", color: "from-purple-400 to-fuchsia-500" },
    { emoji: "🎧", label: "Voice Personalization", path: "/voice", color: "from-amber-400 to-yellow-500" },
    { emoji: "💪", label: "Motivation & Rewards", path: "/rewards", color: "from-pink-500 to-rose-500" },
    { emoji: "🧭", label: "Learning Analytics", path: "/analytics", color: "from-emerald-400 to-green-500" },
    { emoji: "☀️", label: "Mind Refresh Zone", path: "/refresh", color: "from-yellow-400 to-lime-500" },
    { emoji: "🧘", label: "Mind-Reset Mode", path: "/calm", color: "from-teal-400 to-cyan-500" },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed top-4 right-4 z-[9999] flex flex-col items-end"
    >
      {/* 🔘 Hamburger Toggle Button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full p-3 shadow-lg border border-white/20 
          ${open ? "bg-rose-600" : "bg-slate-900/80"} 
          text-white backdrop-blur-md hover:scale-110 transition-all duration-200`}
        whileTap={{ scale: 0.9 }}
        aria-label="Classroom Menu"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </motion.button>

      {/* 🪄 Expanding Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="mt-3 w-72 bg-slate-900/90 border border-slate-700 backdrop-blur-xl rounded-2xl shadow-2xl p-3"
          >
            <div className="text-xs text-slate-400 font-semibold mb-2 px-2 uppercase tracking-wider">
              Classroom Features
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {features.map((f, i) => (
                <Link
                  key={i}
                  to={f.path}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 text-[13px] font-medium rounded-xl px-3 py-2 
                    bg-gradient-to-r ${f.color} text-transparent bg-clip-text 
                    hover:text-white hover:bg-slate-800/80 transition duration-200`}
                >
                  <span className="text-base">{f.emoji}</span>
                  <span className="truncate">{f.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
