import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";

/**
 * 🎵 Background Ambience
 * Lets students pick and loop relaxing background sounds
 * (rain, café, birds, library, tanpura, etc.)
 */

export default function AmbiencePage() {
  const [selected, setSelected] = useState("None");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // 🔊 Predefined ambience sounds (can be expanded)
  const ambienceOptions = [
    { label: "🔘 None", value: "None", src: null },
    {
      label: "🌧️ Rainy Library",
      value: "rain",
      src: "https://cdn.pixabay.com/download/audio/2021/09/30/audio_bec06e9b3c.mp3?filename=rain-ambient-110997.mp3",
    },
    {
      label: "🐦 Morning Birds",
      value: "birds",
      src: "https://cdn.pixabay.com/download/audio/2021/10/01/audio_43d8453a9c.mp3?filename=morning-birds-116199.mp3",
    },
    {
      label: "☕ Café Study Mode",
      value: "cafe",
      src: "https://cdn.pixabay.com/download/audio/2021/10/05/audio_56b6a7985c.mp3?filename=coffee-shop-ambience-12546.mp3",
    },
    {
      label: "🏛️ Old Library",
      value: "library",
      src: "https://cdn.pixabay.com/download/audio/2021/10/05/audio_44f896da64.mp3?filename=library-room-ambient-12568.mp3",
    },
    {
      label: "🪔 Indian Tanpura",
      value: "tanpura",
      src: "https://cdn.pixabay.com/download/audio/2023/02/17/audio_759dd8df59.mp3?filename=tanpura-137072.mp3",
    },
    {
      label: "🌃 Midnight Focus",
      value: "midnight",
      src: "https://cdn.pixabay.com/download/audio/2023/02/28/audio_9043213d61.mp3?filename=calm-midnight-ambient-139012.mp3",
    },
  ];

  /** 🎛️ Handle ambience selection */
  useEffect(() => {
    if (!audioRef.current) return;
    if (selected === "None") {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (isPlaying) {
      playSelectedAudio();
    }
  }, [selected]);

  const playSelectedAudio = () => {
    const selectedAudio = ambienceOptions.find((a) => a.value === selected);
    if (!selectedAudio?.src) return;
    audioRef.current.src = selectedAudio.src;
    audioRef.current.loop = true;
    audioRef.current.volume = 0.6;
    audioRef.current.play().catch((err) =>
      console.warn("Audio autoplay blocked:", err)
    );
  };

  /** ▶️ Play / ⏸ Pause */
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      playSelectedAudio();
      setIsPlaying(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
      <motion.h1
        className="text-3xl font-bold mb-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        🎵 Background Ambience
      </motion.h1>

      <p className="text-slate-400 text-center max-w-md mb-8">
        Set your ideal study atmosphere with relaxing background sounds.
      </p>

      {/* Dropdown selector */}
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-slate-700 shadow focus:outline-none focus:ring focus:ring-cyan-400"
      >
        {ambienceOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Play / Pause button */}
      <motion.button
        onClick={togglePlay}
        className="mt-6 flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white font-medium px-6 py-3 rounded-full shadow-lg transition-all duration-300"
        whileTap={{ scale: 0.9 }}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        {isPlaying ? "Pause" : "Play"} Ambience
      </motion.button>

      {/* Hidden audio element */}
      <audio ref={audioRef} />

      {/* Tip */}
      <p className="text-xs text-slate-500 mt-4">
        (Tip: Ambience keeps playing in the background while you browse Classroom)
      </p>
    </div>
  );
}
