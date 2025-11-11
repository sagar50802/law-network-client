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
/* ✅ ClassroomLivePage — FINAL, Production Safe                              */
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
  /* 🧩 Utility: Safe cancel (prevents interrupted errors)                  */
  /* ---------------------------------------------------------------------- */
  const safeCancelSpeech = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
      stopClassroomSpeech(speechRef);
    } catch (e) {
      console.warn("Speech cancel failed:", e);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 🔓 Unlock Speech Autoplay once                                         */
  /* ---------------------------------------------------------------------- */
  useEffect(() => unlockSpeechOnUserClick(), []);

  /* ---------------------------------------------------------------------- */
  /* 📦 Load Lectures (filter + default select)                             */
  /* ---------------------------------------------------------------------- */
  const loadLectures = async () => {
    try {
      const res = await fetch(`${API_BASE}/lectures?status=released`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      const all = Array.isArray(json.data) ? json.data : [];

      // ✅ Keep only visible access types
      const filtered = all.filter(
        (lec) => lec.accessType === "public" || lec.accessType === "protected"
      );

      if (!filtered.length) throw new Error("No released lectures found.");
      setLectures(filtered);

      if (!selectedLectureId && filtered[0]?._id) {
        setSelectedLectureId(filtered[0]._id);
        await loadSlidesForLecture(filtered[0]._id);
      }
    } catch (err) {
      console.error("❌ loadLectures:", err);
      setError("Failed to load classroom lectures. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLectures();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 🧠 Load Slides (with fetch-token protection)                           */
  /* ---------------------------------------------------------------------- */
  const loadSlidesForLecture = useCallback(
    async (lectureId) => {
      if (!lectureId) return;
      safeCancelSpeech();
      setSlides([]);
      setCurrentIndex(0);
      setCurrentSentence("");
      setProgress(0);
      setLoading(true);

      const token = Date.now();
      loadSlidesForLecture.lastToken = token;

      try {
        const res = await fetch(`${API_BASE}/lectures/${lectureId}/slides`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();

        if (loadSlidesForLecture.lastToken !== token) return; // ignore stale
        const slidesData = json.data?.slides || json.slides || [];

        setSlides(Array.isArray(slidesData) ? slidesData : []);
        setError(null);
      } catch (err) {
        console.error("❌ loadSlides:", err);
        if (loadSlidesForLecture.lastToken === token)
          setError("Failed to load slides for this lecture.");
        setSlides([]);
      } finally {
        setTimeout(() => {
          if (loadSlidesForLecture.lastToken === token) setLoading(false);
        }, 300);
      }
    },
    [safeCancelSpeech]
  );

  /* Reload slides when lecture changes */
  useEffect(() => {
    if (selectedLectureId) loadSlidesForLecture(selectedLectureId);
  }, [selectedLectureId, loadSlidesForLecture]);

  /* ---------------------------------------------------------------------- */
  /* 🎙️ Preload Voices once                                                */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    waitForVoices(3000).then((v) =>
      console.log(`✅ Voices preloaded (${v.length})`)
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 🎞️ Slide Auto Progression                                             */
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
    }, 250);
  }, [slides.length, safeCancelSpeech]);

  /* ---------------------------------------------------------------------- */
  /* 🔊 Speech Engine Guarded                                              */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (loading || !slides.length || !isPlaying || isMuted) return;
    safeCancelSpeech();

    const slide = currentSlide;
    if (!slide) return;

    const timeout = setTimeout(() => {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        // Wait for clear channel
        setTimeout(() => {
          playClassroomSpeech({
            slide,
            isMuted,
            speechRef,
            setCurrentSentence,
            onProgress: setProgress,
            onStartSpeaking: () => setIsSpeaking(true),
            onStopSpeaking: () => setIsSpeaking(false),
            onComplete: handleNextSlide,
          });
        }, 300);
      } else {
        playClassroomSpeech({
          slide,
          isMuted,
          speechRef,
          setCurrentSentence,
          onProgress: setProgress,
          onStartSpeaking: () => setIsSpeaking(true),
          onStopSpeaking: () => setIsSpeaking(false),
          onComplete: handleNextSlide,
        });
      }
    }, 400); // delay ensures correct lecture context

    return () => {
      clearTimeout(timeout);
      safeCancelSpeech();
    };
  }, [
    currentSlide?._id,
    isPlaying,
    isMuted,
    slides.length,
    handleNextSlide,
    loading,
    safeCancelSpeech,
  ]);

  /* ---------------------------------------------------------------------- */
  /* ▶️ Play / ⏸ Pause Controls                                            */
  /* ---------------------------------------------------------------------- */
  const handlePlayPause = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isPlaying) {
      PAUSE_LOCK = true;
      safeCancelSpeech();
      setIsPlaying(false);
      setIsSpeaking(false);
    } else {
      PAUSE_LOCK = false;
      safeCancelSpeech();
      setIsPlaying(true);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* 🔇 Mute Toggle                                                        */
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
  /* ⏩ Manual Slide Navigation                                             */
  /* ---------------------------------------------------------------------- */
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
  /* 🌀 Loader + Error States                                               */
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

  if (error || !slides.length)
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <p>⚠️ {error || "No slides available for this lecture."}</p>
      </div>
    );

  /* ---------------------------------------------------------------------- */
  /* 🧱 Layout                                                              */
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
