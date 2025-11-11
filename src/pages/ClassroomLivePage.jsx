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
/* ✅ ClassroomLivePage — final version                                       */
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

  /* ------------------------------------------------------ */
  /* Safe cancel helper                                     */
  /* ------------------------------------------------------ */
  const safeCancelSpeech = useCallback(() => {
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending)
        window.speechSynthesis.cancel();
      stopClassroomSpeech(speechRef);
    } catch {}
  }, []);

  /* ------------------------------------------------------ */
  /* Unlock speech autoplay once user clicks anywhere        */
  /* ------------------------------------------------------ */
  useEffect(() => unlockSpeechOnUserClick(), []);

  /* ------------------------------------------------------ */
  /* Load lectures                                           */
  /* ------------------------------------------------------ */
  const loadLectures = async () => {
    try {
      const res = await fetch(`${API_BASE}/lectures?status=released`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      if (!list.length) throw new Error("No released lectures found");
      setLectures(list);

      if (!selectedLectureId && list[0]?._id) {
        setSelectedLectureId(list[0]._id);
      }
    } catch (e) {
      console.error("Failed to load lectures:", e);
      setError("Failed to load lectures");
      setLoading(false);
    }
  };

  /* ------------------------------------------------------ */
  /* Load slides (isolated)                                  */
  /* ------------------------------------------------------ */
  const loadSlidesForLecture = async (lectureId) => {
    safeCancelSpeech();
    // 🔥 Hard reset all visual and voice states before fetch
    setSlides([]);
    setCurrentSentence("");
    setProgress(0);
    setIsSpeaking(false);
    setIsPlaying(false);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/lectures/${lectureId}/slides`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      const slidesData = json.data?.slides || json.slides || [];
      setSlides(Array.isArray(slidesData) ? slidesData : []);
      setCurrentIndex(0);
      setCurrentSentence("");
      setProgress(0);
      // ✅ Ensure next render happens after data available
      setTimeout(() => {
        setIsPlaying(true);
        setLoading(false);
      }, 300);
    } catch (e) {
      console.error("Failed to load slides:", e);
      setSlides([]);
      setError("Failed to load slides");
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLectures();
  }, []);

  useEffect(() => {
    if (selectedLectureId) loadSlidesForLecture(selectedLectureId);
  }, [selectedLectureId]);

  /* ------------------------------------------------------ */
  /* Preload voices                                          */
  /* ------------------------------------------------------ */
  useEffect(() => {
    waitForVoices(3000).then((v) =>
      console.log(`✅ Voices ready (${v.length} voices)`)
    );
  }, []);

  /* ------------------------------------------------------ */
  /* Next slide                                              */
  /* ------------------------------------------------------ */
  const handleNextSlide = useCallback(() => {
    safeCancelSpeech();
    setProgress(0);
    setCurrentSentence("");
    setIsSpeaking(false);
    setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev + 1 < slides.length) return prev + 1;
        const idx = lectures.findIndex((l) => l._id === selectedLectureId);
        if (idx >= 0 && idx + 1 < lectures.length)
          setSelectedLectureId(lectures[idx + 1]._id);
        else setIsPlaying(false);
        return prev;
      });
    }, 200);
  }, [slides.length, lectures, selectedLectureId, safeCancelSpeech]);

  /* ------------------------------------------------------ */
  /* Voice engine                                            */
  /* ------------------------------------------------------ */
  useEffect(() => {
    let active = true;
    let timer;
    async function startSpeech() {
      if (loading || !slides.length || !currentSlide || !isPlaying || isMuted)
        return;
      // Prevent double-speech loops
      if (window.speechSynthesis.speaking) {
        console.warn("⏸ Already speaking, delaying...");
        setTimeout(startSpeech, 300);
        return;
      }
      safeCancelSpeech();
      setCurrentSentence("");
      setProgress(0);
      setIsSpeaking(false);
      await waitForVoices(2000);
      if (!active) return;
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
      }, 200);
    }
    startSpeech();
    return () => {
      active = false;
      clearTimeout(timer);
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

  /* ------------------------------------------------------ */
  /* Play / Pause                                            */
  /* ------------------------------------------------------ */
  const handlePlayPause = () => {
    if (!window.speechSynthesis) return;
    if (isPlaying) {
      PAUSE_LOCK = true;
      safeCancelSpeech();
      setIsPlaying(false);
      setIsSpeaking(false);
    } else {
      PAUSE_LOCK = false;
      setIsPlaying(true);
    }
  };

  /* ------------------------------------------------------ */
  /* Mute toggle                                             */
  /* ------------------------------------------------------ */
  const handleMuteToggle = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        safeCancelSpeech();
        setIsSpeaking(false);
      } else if (!PAUSE_LOCK) {
        setIsPlaying(true);
      }
      return next;
    });
  };

  /* ------------------------------------------------------ */
  /* Slide navigation                                        */
  /* ------------------------------------------------------ */
  const goToSlide = (i) => {
    if (i < 0 || i >= slides.length) return;
    safeCancelSpeech();
    setCurrentSentence("");
    setProgress(0);
    setIsSpeaking(false);
    setCurrentIndex(i);
    setIsPlaying(true);
  };

  /* ------------------------------------------------------ */
  /* Loader + Error                                          */
  /* ------------------------------------------------------ */
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
        <p>{error}</p>
      </div>
    );

  /* ------------------------------------------------------ */
  /* Layout                                                  */
  /* ------------------------------------------------------ */
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-4 md:px-8 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg md:text-2xl font-semibold tracking-wide">
            Classroom Live • {currentLecture?.subject || "Lecture"}
          </div>

          {/* 🏷 Badge always correct now */}
          {currentLecture && (
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-semibold border ${
                currentLecture.accessType === "public"
                  ? "bg-emerald-600/20 text-emerald-400 border-emerald-700"
                  : "bg-slate-700/40 text-slate-300 border-slate-600"
              }`}
            >
              {currentLecture.accessType === "public" ? "Public" : "Private"}
            </span>
          )}
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

      {/* Main */}
      <main className="flex-1 px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
        <div className="flex flex-col md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)_minmax(0,1.1fr)] gap-4">
          {/* Avatar */}
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
          <LecturePlaylistSidebar
            lectures={lectures}
            currentLectureId={selectedLectureId}
            onSelectLecture={async (lec) => {
              if (!lec?._id || lec._id === selectedLectureId) return;
              safeCancelSpeech();
              setSlides([]);
              setCurrentSentence("");
              setProgress(0);
              setIsSpeaking(false);
              await loadSlidesForLecture(lec._id);
            }}
          />
        </div>

        <StudentsRow
          onRaiseHand={() => alert("✋ Raise hand feature coming soon!")}
          onReaction={(emoji) => console.log("Reaction:", emoji)}
        />
      </main>

      {/* Floating button */}
      <div className="md:hidden fixed bottom-5 right-5 z-50">
        <button
          onClick={handlePlayPause}
          className={`p-4 rounded-full shadow-lg font-bold ${
            isPlaying ? "bg-green-500" : "bg-yellow-400"
          } text-black`}
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
