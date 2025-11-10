// src/pages/ClassroomLivePage.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import TeacherAvatarCard from "../components/TeacherAvatarCard";
import ClassroomTeleprompter from "../components/ClassroomTeleprompter";
import { MediaBoard, MediaControlPanel } from "../components/MediaBoard";
import LecturePlaylistSidebar from "../components/LecturePlaylistSidebar";
import StudentsRow from "../components/StudentsRow";

import {
  waitForVoices,
  playClassroomSpeech,
  stopClassroomSpeech,
  unlockSpeechOnUserClick,
} from "../voice/ClassroomVoiceEngine.js";

const API_BASE =
  (import.meta.env.VITE_API_URL || "https://law-network.onrender.com/api") +
  "/classroom";

let PAUSE_LOCK = false;

/* -------------------------------------------------------------------------- */
/* ✅ ClassroomLivePage — polished + responsive                              */
/* -------------------------------------------------------------------------- */
export default function ClassroomLivePage() {
  const [slides, setSlides] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [selectedLectureId, setSelectedLectureId] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSentence, setCurrentSentence] = useState("");
  const [progress, setProgress] = useState(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const speechRef = useRef({ isPlaying: false, cancel: () => {} });
  const currentSlide = slides[currentIndex] || null;
  const currentLecture =
    lectures.find((l) => l._id === selectedLectureId) || null;

  /* ---------------------------------------------------------------------- */
  /* Unlock Speech Autoplay (Chrome policy)                                 */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    unlockSpeechOnUserClick();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Load Lectures                                                         */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const loadLectures = async () => {
      try {
        const res = await fetch(`${API_BASE}/lectures?status=released`);
        const json = await res.json();
        const list = json.data || json;
        if (Array.isArray(list)) {
          setLectures(list);
          if (list.length > 0 && !selectedLectureId) {
            setSelectedLectureId(list[0]._id);
          }
        } else setLectures([]);
      } catch (err) {
        console.error("Failed to load lectures:", err);
        setError("Failed to load lectures");
      }
    };
    loadLectures();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Load Slides whenever Lecture changes                                  */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedLectureId) return;
    const loadSlides = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/lectures/${selectedLectureId}/slides`
        );
        const json = await res.json();
        const list = json.slides || json;
        if (Array.isArray(list)) {
          setSlides(list);
          setCurrentIndex(0);
          setCurrentSentence("");
        } else setSlides([]);
      } catch (err) {
        console.error("Failed to load slides:", err);
        setError("Failed to fetch slides");
        setSlides([]);
      } finally {
        setTimeout(() => {
          const loader = document.getElementById("classroom-loader");
          if (loader) loader.classList.add("fade-out");
          setTimeout(() => setLoading(false), 500);
        }, 500);
      }
    };
    loadSlides();
  }, [selectedLectureId]);

  /* ---------------------------------------------------------------------- */
  /* Preload Voices                                                        */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    waitForVoices(3000).then((v) =>
      console.log(`✅ Voices preloaded (${v.length})`)
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Move to Next Slide after speech completes                             */
  /* ---------------------------------------------------------------------- */
  const handleNextSlide = useCallback(() => {
    setProgress(0);
    setCurrentSentence("");
    setIsSpeaking(false);
    setTimeout(() => {
      setCurrentIndex((p) => (p + 1 < slides.length ? p + 1 : p));
    }, 700);
  }, [slides.length]);

  /* ---------------------------------------------------------------------- */
  /* Play current slide speech                                              */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;
    async function startSpeech() {
      if (!currentSlide || !mounted) return;
      stopClassroomSpeech(speechRef);
      setProgress(0);
      setCurrentSentence("");
      setIsSpeaking(false);

      await waitForVoices(3000);
      const voices = window.speechSynthesis?.getVoices() || [];
      if (!voices.length) {
        setCurrentSentence(currentSlide.content || "");
        return;
      }

      if (!isPlaying || isMuted || PAUSE_LOCK) return;

      playClassroomSpeech({
        slide: currentSlide,
        isMuted,
        speechRef,
        setCurrentSentence,
        onProgress: setProgress,
        onStartSpeaking: () => setIsSpeaking(true),
        onStopSpeaking: () => setIsSpeaking(false),
        onComplete: handleNextSlide,
      });
    }
    startSpeech();
    return () => {
      mounted = false;
      stopClassroomSpeech(speechRef);
    };
  }, [currentSlide?._id, isPlaying, isMuted, slides.length, handleNextSlide]);

  /* ---------------------------------------------------------------------- */
  /* User Controls                                                          */
  /* ---------------------------------------------------------------------- */
  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    stopClassroomSpeech(speechRef);
    setCurrentSentence("");
    setProgress(0);
    setIsSpeaking(false);
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (isPlaying) {
      PAUSE_LOCK = true;
      if (synth.speaking && !synth.paused) synth.pause();
      setIsPlaying(false);
      setIsSpeaking(false);
    } else {
      PAUSE_LOCK = false;
      if (synth.paused) synth.resume();
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    const synth = window.speechSynthesis;
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        if (synth.speaking) synth.pause();
      } else {
        if (synth.paused && !PAUSE_LOCK) synth.resume();
      }
      return next;
    });
  };

  /* ---------------------------------------------------------------------- */
  /* Loader & Error States                                                  */
  /* ---------------------------------------------------------------------- */
  if (loading)
    return (
      <div
        id="classroom-loader"
        className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/95 text-white transition-opacity duration-700 ease-in-out bg-center bg-cover"
        style={{
          backgroundImage: `url("/backgrounds/classroom-fallback.png")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="bg-black/70 px-8 py-6 rounded-2xl text-center max-w-lg shadow-lg backdrop-blur-sm animate-fade-in">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h1 className="text-2xl font-semibold mb-2">📡 Loading Classroom…</h1>
          <p className="opacity-90 text-sm">
            Please wait, connecting to the live session.
          </p>
        </div>
      </div>
    );

  if (error || !slides.length)
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-slate-900">
        <div className="bg-black/70 px-8 py-6 rounded-2xl text-center max-w-lg">
          <h1 className="text-2xl font-semibold mb-2">⚠️ Classroom Offline</h1>
          <p className="opacity-90 text-sm">
            Please check your connection or try again later.
          </p>
        </div>
      </div>
    );

  /* ---------------------------------------------------------------------- */
  /* ✅ Main Layout                                                        */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-4 md:px-8 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="text-lg md:text-2xl font-semibold tracking-wide">
          Classroom Live • {currentLecture?.subject || "Lecture"}
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs md:text-sm">
          <button
            onClick={handlePlayPause}
            className={`px-3 py-1.5 rounded-full font-semibold text-xs ${
              isPlaying
                ? "bg-emerald-500 text-black"
                : "bg-yellow-400 text-black"
            }`}
          >
            {isPlaying ? "Pause" : "Resume"}
          </button>

          <button
            onClick={handleMuteToggle}
            className={`px-3 py-1.5 rounded-full text-xs border ${
              isMuted
                ? "bg-red-600 text-white border-red-400"
                : "bg-slate-800 text-slate-100 border-slate-600"
            }`}
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
        {/* 🧩 Responsive Layout */}
        <div className="flex flex-col md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)_minmax(0,1.1fr)] gap-4">
          {/* 👩‍🏫 Avatar FIRST on mobile */}
          <div className="order-1 md:order-none">
            <TeacherAvatarCard
              teacher={{
                name:
                  currentLecture?.teacher?.name ||
                  currentLecture?.teacherName ||
                  "Teacher",
                role: currentLecture?.teacher?.role || "Faculty",
                avatarUrl:
                  currentLecture?.teacher?.avatarUrl ||
                  currentLecture?.teacher?.photoUrl ||
                  currentLecture?.teacher?.image ||
                  currentLecture?.photoUrl ||
                  currentLecture?.image ||
                  "/avatars/teacher1.png",
              }}
              subject={currentLecture?.subject || "Lecture"}
              isSpeaking={isSpeaking}
            />
          </div>

          {/* 🧾 Teleprompter + Media */}
          <section className="order-2 flex flex-col gap-3">
            <ClassroomTeleprompter
              slide={currentSlide}
              currentSentence={currentSentence}
              progress={progress}
            />
            <MediaBoard media={currentSlide?.media} />
            <MediaControlPanel
              active={{
                audio: !!currentSlide?.media?.audioUrl,
                video: !!currentSlide?.media?.videoUrl,
                image: !!currentSlide?.media?.imageUrl,
              }}
            />
            <div className="mt-2 flex items-center justify-end gap-2 text-xs">
              <button
                className="px-3 py-1 rounded-full bg-slate-800 border border-slate-600"
                onClick={() => goToSlide(currentIndex - 1)}
              >
                ◀ Prev
              </button>
              <span className="text-slate-300">
                Slide {currentIndex + 1} / {slides.length}
              </span>
              <button
                className="px-3 py-1 rounded-full bg-slate-800 border border-slate-600"
                onClick={() => goToSlide(currentIndex + 1)}
              >
                Next ▶
              </button>
            </div>
          </section>

          {/* 📚 Playlist Sidebar */}
          <div className="order-3">
            <LecturePlaylistSidebar
              lectures={lectures}
              currentLectureId={selectedLectureId}
              onSelectLecture={(lec) => {
                if (lec?._id !== selectedLectureId) {
                  stopClassroomSpeech(speechRef);
                  setSelectedLectureId(lec._id);
                  setCurrentIndex(0);
                  setCurrentSentence("");
                  setProgress(0);
                  setIsPlaying(true);
                }
              }}
            />
          </div>
        </div>

        {/* 👨‍🎓 Students Row */}
        <StudentsRow
          onRaiseHand={() =>
            alert("✋ Student raised hand — feature coming soon!")
          }
          onReaction={(emoji) => console.log("Student reaction:", emoji)}
        />
      </main>

      {/* 🎛 Floating Play Button on Mobile */}
      <div className="md:hidden fixed bottom-5 right-5 z-50">
        <button
          onClick={handlePlayPause}
          className={`p-4 rounded-full shadow-lg font-bold transition duration-200 ${
            isPlaying
              ? "bg-green-500 hover:bg-green-400"
              : "bg-yellow-400 hover:bg-yellow-300"
          } text-black`}
          title={isPlaying ? "Pause Voice" : "Play Voice"}
        >
          {isPlaying ? "⏸" : "▶️"}
        </button>
      </div>

      <footer className="text-xs text-slate-600 text-center py-3 border-t border-slate-800">
        ClassroomLivePage • connected to API ({API_BASE})
      </footer>
    </div>
  );
}
