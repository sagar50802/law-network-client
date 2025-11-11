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
let SWITCH_LOCK = false;

/* -------------------------------------------------------------------------- */
/* ✅ ClassroomLivePage — Final Production-Safe Version                       */
/* -------------------------------------------------------------------------- */
export default function ClassroomLivePage() {
  const [lectures, setLectures] = useState([]);
  const [slides, setSlides] = useState([]);
  const [selectedLectureId, setSelectedLectureId] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSentence, setCurrentSentence] = useState("");
  const [progress, setProgress] = useState(0);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const speechRef = useRef({ cancel: () => {}, isPlaying: false });
  const currentLecture = lectures.find((l) => l._id === selectedLectureId);
  const currentSlide = slides[currentIndex] || null;

  /* ---------------------------------------------------------------------- */
  /* Cancel any ongoing speech                                              */
  /* ---------------------------------------------------------------------- */
  const safeCancelSpeech = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
      stopClassroomSpeech(speechRef);
    } catch (e) {
      console.warn("Cancel speech failed", e);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Unlock Speech Autoplay                                                 */
  /* ---------------------------------------------------------------------- */
  useEffect(() => unlockSpeechOnUserClick(), []);

  /* ---------------------------------------------------------------------- */
  /* Load Lectures List                                                     */
  /* ---------------------------------------------------------------------- */
  const loadLectures = async () => {
    try {
      const res = await fetch(`${API_BASE}/lectures?status=released`);
      if (!res.ok) throw new Error("Failed to load lectures");
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      setLectures(list);
      if (!selectedLectureId && list[0]?._id) {
        setSelectedLectureId(list[0]._id);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load classroom lectures.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLectures();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Load Slides per Lecture — fully isolated, clears old state first       */
  /* ---------------------------------------------------------------------- */
  const loadSlidesForLecture = useCallback(async (lectureId) => {
    if (!lectureId) return;
    if (SWITCH_LOCK) return;
    SWITCH_LOCK = true;

    safeCancelSpeech();
    setSlides([]);
    setCurrentSentence("");
    setProgress(0);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/lectures/${lectureId}/slides`);
      if (!res.ok) throw new Error(`Failed to fetch slides (${res.status})`);
      const json = await res.json();
      const newSlides = json.data?.slides || [];
      setSlides(newSlides);
      setCurrentIndex(0);
      setError(null);
    } catch (e) {
      console.error("❌ Slide load error:", e);
      setError("Failed to load slides for this lecture.");
    } finally {
      setTimeout(() => {
        setLoading(false);
        SWITCH_LOCK = false;
      }, 400);
    }
  }, [safeCancelSpeech]);

  /* When lecture changes, fetch slides cleanly */
  useEffect(() => {
    if (selectedLectureId) loadSlidesForLecture(selectedLectureId);
  }, [selectedLectureId, loadSlidesForLecture]);

  /* ---------------------------------------------------------------------- */
  /* Preload Voices Once                                                    */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    waitForVoices(3000).then((v) =>
      console.log(`✅ Voices preloaded (${v.length})`)
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Speech Engine Guarded                                                  */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (loading || !slides.length || !isPlaying || isMuted) return;

    safeCancelSpeech();

    const slide = currentSlide;
    if (!slide) return;

    const timeout = setTimeout(() => {
      playClassroomSpeech({
        slide,
        isMuted,
        speechRef,
        setCurrentSentence,
        onProgress: setProgress,
        onStartSpeaking: () => setIsSpeaking(true),
        onStopSpeaking: () => setIsSpeaking(false),
        onComplete: () => handleNextSlide(),
      });
    }, 300);

    return () => {
      clearTimeout(timeout);
      safeCancelSpeech();
    };
  }, [currentSlide?._id, isPlaying, isMuted, slides.length, loading]);

  /* ---------------------------------------------------------------------- */
  /* Slide Progression                                                      */
  /* ---------------------------------------------------------------------- */
  const handleNextSlide = useCallback(() => {
    safeCancelSpeech();
    setProgress(0);
    setCurrentSentence("");
    setIsSpeaking(false);
    setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev + 1 < slides.length) return prev + 1;
        setIsPlaying(false);
        return prev;
      });
    }, 200);
  }, [slides.length, safeCancelSpeech]);

  /* ---------------------------------------------------------------------- */
  /* Controls                                                               */
  /* ---------------------------------------------------------------------- */
  const handlePlayPause = () => {
    const synth = window.speechSynthesis;
    if (isPlaying) {
      PAUSE_LOCK = true;
      synth.cancel();
      setIsPlaying(false);
      setIsSpeaking(false);
    } else {
      PAUSE_LOCK = false;
      safeCancelSpeech();
      setIsPlaying(true);
    }
  };

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

  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    safeCancelSpeech();
    setCurrentIndex(index);
    setCurrentSentence("");
    setProgress(0);
    setIsSpeaking(false);
    setIsPlaying(true);
  };

  /* ---------------------------------------------------------------------- */
  /* Loading & Error Screens                                                */
  /* ---------------------------------------------------------------------- */
  if (loading)
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/95 text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-lg font-semibold">Loading lecture…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <p>⚠️ {error}</p>
      </div>
    );

  /* ---------------------------------------------------------------------- */
  /* Layout — restored column balance (left=teacher, center=teleprompter, right=playlist) */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-4 md:px-8 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg md:text-2xl font-semibold">
            Classroom Live • {currentLecture?.subject || "Lecture"}
          </div>
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
        <div className="hidden md:flex items-center gap-2">
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
      <main className="flex-1 px-4 md:px-8 py-5 grid grid-cols-1 md:grid-cols-[0.9fr_2.4fr_1.1fr] gap-5 items-start">
        {/* Left: Teacher */}
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

        {/* Center: Teleprompter */}
        <section className="flex flex-col gap-3">
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
          <div className="mt-2 flex justify-end items-center gap-2 text-xs">
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

        {/* Right: Playlist */}
        <LecturePlaylistSidebar
          lectures={lectures}
          currentLectureId={selectedLectureId}
          onSelectLecture={async (lec) => {
            if (!lec?._id || lec._id === selectedLectureId) return;
            safeCancelSpeech();
            setIsPlaying(false);
            await loadSlidesForLecture(lec._id);
            setSelectedLectureId(lec._id);
            setIsPlaying(true);
          }}
        />
      </main>

      <StudentsRow
        onRaiseHand={() => alert("✋ Student raised hand")}
        onReaction={(emoji) => console.log("Reaction:", emoji)}
      />

      <footer className="text-xs text-slate-600 text-center py-3 border-t border-slate-800">
        ClassroomLivePage • connected to API ({API_BASE})
      </footer>
    </div>
  );
}
