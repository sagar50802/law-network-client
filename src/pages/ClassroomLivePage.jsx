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
/* ✅ ClassroomLivePage — Clean, Stable, Production-Safe                     */
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
  /* Unlock Speech Autoplay                                                 */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    unlockSpeechOnUserClick();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Load Lectures (with accessType and proper API parsing)                 */
  /* ---------------------------------------------------------------------- */
  const loadLectures = async () => {
    try {
      const res = await fetch(`${API_BASE}/lectures?status=released`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      if (!list.length) throw new Error("No released lectures found");

      setLectures(list);

      // Select first lecture automatically
      if (!selectedLectureId && list[0]?._id) {
        setSelectedLectureId(list[0]._id);
        await loadSlidesForLecture(list[0]._id);
      }
    } catch (err) {
      console.error("❌ Failed to load lectures:", err);
      setError("Failed to load classroom lectures. Please try again later.");
      setLoading(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Load Slides for Selected Lecture                                       */
  /* ---------------------------------------------------------------------- */
  const loadSlidesForLecture = async (lectureId) => {
    setLoading(true);
    stopClassroomSpeech(speechRef);
    window.speechSynthesis?.cancel();

    try {
      const res = await fetch(`${API_BASE}/lectures/${lectureId}/slides`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();

      const slidesData = json.data?.slides || json.slides || [];
      setSlides(Array.isArray(slidesData) ? slidesData : []);
      setCurrentIndex(0);
      setCurrentSentence("");
      setProgress(0);
    } catch (err) {
      console.error("❌ Failed to load slides:", err);
      setError("Failed to load slides for this lecture.");
      setSlides([]);
    } finally {
      setTimeout(() => setLoading(false), 400);
    }
  };

  useEffect(() => {
    loadLectures();
  }, []);

  useEffect(() => {
    if (selectedLectureId) {
      loadSlidesForLecture(selectedLectureId);
    }
  }, [selectedLectureId]);

  /* ---------------------------------------------------------------------- */
  /* Preload Voices                                                         */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    waitForVoices(3000).then((v) =>
      console.log(`✅ Voices preloaded (${v.length})`)
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Slide Progression (Stops properly at last)                             */
  /* ---------------------------------------------------------------------- */
  const handleNextSlide = useCallback(() => {
    stopClassroomSpeech(speechRef);
    window.speechSynthesis?.cancel();

    setProgress(0);
    setCurrentSentence("");
    setIsSpeaking(false);

    setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev + 1 < slides.length) return prev + 1;
        setIsPlaying(false);
        return prev;
      });
    }, 400);
  }, [slides.length]);

  /* ---------------------------------------------------------------------- */
  /* Voice Playback Logic (Guarded + Debounced)                             */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    let active = true;
    let timer;

    async function startSpeech() {
      if (!currentSlide || !isPlaying || isMuted || PAUSE_LOCK || !active)
        return;

      stopClassroomSpeech(speechRef);
      window.speechSynthesis?.cancel();

      setCurrentSentence("");
      setProgress(0);
      setIsSpeaking(false);

      await waitForVoices(3000);

      // 🧠 Prevent overlapping speech
      if (window.speechSynthesis.speaking) {
        console.warn("🛑 Prevented overlapping speech call");
        window.speechSynthesis.cancel();
        setTimeout(startSpeech, 300);
        return;
      }

      const voices = window.speechSynthesis?.getVoices() || [];
      if (!voices.length) {
        setCurrentSentence(currentSlide.content || "");
        return;
      }

      timer = setTimeout(() => {
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
      }, 250);
    }

    startSpeech();

    return () => {
      active = false;
      clearTimeout(timer);
      stopClassroomSpeech(speechRef);
      window.speechSynthesis?.cancel();
    };
  }, [currentSlide?._id, isPlaying, isMuted, slides.length, handleNextSlide]);

  /* ---------------------------------------------------------------------- */
  /* Play / Pause (Safe stop + resume)                                      */
  /* ---------------------------------------------------------------------- */
  const handlePlayPause = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isPlaying) {
      PAUSE_LOCK = true;
      synth.cancel();
      stopClassroomSpeech(speechRef);
      setIsPlaying(false);
      setIsSpeaking(false);
    } else {
      PAUSE_LOCK = false;
      synth.cancel();
      setIsPlaying(true);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Mute Toggle                                                            */
  /* ---------------------------------------------------------------------- */
  const handleMuteToggle = () => {
    const synth = window.speechSynthesis;
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        synth.cancel();
        stopClassroomSpeech(speechRef);
        setIsSpeaking(false);
      } else if (!PAUSE_LOCK) {
        setIsPlaying(true);
      }
      return next;
    });
  };

  /* ---------------------------------------------------------------------- */
  /* Go To Slide                                                            */
  /* ---------------------------------------------------------------------- */
  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    stopClassroomSpeech(speechRef);
    window.speechSynthesis?.cancel();
    setCurrentSentence("");
    setProgress(0);
    setIsSpeaking(false);
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  /* ---------------------------------------------------------------------- */
  /* Loader + Error States                                                  */
  /* ---------------------------------------------------------------------- */
  if (loading)
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/95 text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-lg font-semibold">Connecting to live session…</p>
        </div>
      </div>
    );

  if (error || !slides.length)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <p>⚠️ {error || "Unable to load classroom. Please try again later."}</p>
      </div>
    );

  /* ---------------------------------------------------------------------- */
  /* ✅ Layout                                                              */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-4 md:px-8 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg md:text-2xl font-semibold tracking-wide">
            Classroom Live • {currentLecture?.subject || "Lecture"}
          </div>

          {/* 🏷 Access Type Tag */}
          {currentLecture?.accessType && (
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                currentLecture.accessType === "public"
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-700"
                  : "bg-slate-700/40 text-slate-300 border border-slate-600"
              }`}
            >
              {currentLecture.accessType === "public" ? "Public" : "Private"}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="hidden md:flex items-center gap-2 text-xs md:text-sm">
          <button
            onClick={handlePlayPause}
            className={`px-3 py-1.5 rounded-full font-semibold text-xs transition-all ${
              isPlaying
                ? "bg-emerald-500 text-black hover:bg-emerald-400"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}
          >
            {isPlaying ? "Pause" : "Resume"}
          </button>

          <button
            onClick={handleMuteToggle}
            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
              isMuted
                ? "bg-red-600 text-white border-red-400"
                : "bg-slate-800 text-slate-100 border-slate-600 hover:bg-slate-700"
            }`}
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
        <div className="flex flex-col md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)_minmax(0,1.1fr)] gap-4">
          {/* Avatar */}
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

          {/* Teleprompter */}
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

          {/* Sidebar */}
          <div className="order-3">
            <LecturePlaylistSidebar
              lectures={lectures}
              currentLectureId={selectedLectureId}
              onSelectLecture={async (lec) => {
                if (!lec?._id || lec._id === selectedLectureId) return;
                stopClassroomSpeech(speechRef);
                window.speechSynthesis?.cancel();
                setLoading(true);
                setSlides([]);
                setSelectedLectureId(lec._id);
                setCurrentSentence("");
                setProgress(0);
                setIsPlaying(false);
                await loadSlidesForLecture(lec._id);
                setIsPlaying(true);
                setLoading(false);
              }}
            />
          </div>
        </div>

        <StudentsRow
          onRaiseHand={() =>
            alert("✋ Student raised hand — feature coming soon!")
          }
          onReaction={(emoji) => console.log("Student reaction:", emoji)}
        />
      </main>

      {/* 🎛 Floating Play Button */}
      <div className="md:hidden fixed bottom-5 right-5 z-50">
        <button
          onClick={handlePlayPause}
          className={`p-4 rounded-full shadow-lg font-bold transition-all duration-300 ${
            isPlaying
              ? "bg-green-500 hover:bg-green-400 animate-pulse"
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
