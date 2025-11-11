import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

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
/* ✅ ClassroomLivePage                                                      */
/* -------------------------------------------------------------------------- */
export default function ClassroomLivePage() {
  /* ----------------------------- core state ------------------------------ */
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

  // used to force re-play on same lecture / same slide
  const [playSeed, setPlaySeed] = useState(0);

  const speechRef = useRef({ isPlaying: false, cancel: () => {} });
  const isPlayingRef = useRef(true);

  const currentSlide = slides[currentIndex] || null;
  const currentLecture =
    lectures.find((l) => l._id === selectedLectureId) || null;

  /* keep ref in sync with state for effects that shouldn't re-run on toggle */
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  /* ---------------------------------------------------------------------- */
  /* 🔓 Unlock speech after first user interaction                          */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    unlockSpeechOnUserClick();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 🧹 Hard stop for ANY active speech (used on switches)                  */
  /* ---------------------------------------------------------------------- */
  const hardStopSpeech = useCallback(() => {
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      console.warn("speech cancel failed:", e);
    }
    stopClassroomSpeech(speechRef);
    setIsSpeaking(false);
    setCurrentSentence("");
    setProgress(0);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 📚 Load lectures (released only)                                       */
  /* ---------------------------------------------------------------------- */
  const fetchLectures = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/lectures?status=released`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];

      if (!list.length) {
        setLectures([]);
        setError("No live lectures available right now.");
        setLoading(false);
        return;
      }

      setLectures(list);
      if (!selectedLectureId && list[0]?._id) {
        setSelectedLectureId(list[0]._id);
      }
    } catch (err) {
      console.error("❌ Failed to load lectures:", err);
      setError("Failed to load classroom lectures.");
      setLoading(false);
    }
  }, [selectedLectureId]);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  /* ---------------------------------------------------------------------- */
  /* 🧾 Load slides for selected lecture                                    */
  /* ---------------------------------------------------------------------- */
  const fetchSlides = useCallback(
    async (lectureId) => {
      if (!lectureId) return;
      setLoading(true);
      hardStopSpeech();

      try {
        const res = await fetch(`${API_BASE}/lectures/${lectureId}/slides`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const json = await res.json();
        const slidesData = json.data?.slides || json.slides || [];

        setSlides(Array.isArray(slidesData) ? slidesData : []);
        setCurrentIndex(0);
        setCurrentSentence("");
        setProgress(0);

        console.log("📚 Slides loaded:", slidesData.length);
      } catch (err) {
        console.error("❌ Failed to load slides:", err);
        setError("Failed to load slides for this lecture.");
        setSlides([]);
      } finally {
        setLoading(false);
      }
    },
    [hardStopSpeech]
  );

  useEffect(() => {
    if (!selectedLectureId) return;
    fetchSlides(selectedLectureId);
  }, [selectedLectureId, fetchSlides]);

  /* ---------------------------------------------------------------------- */
  /* 🎙 Preload browser voices once                                         */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    waitForVoices(3000).then((voices) =>
      console.log(`✅ Voices preloaded (${voices.length})`)
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* ⏭ Slide progression after speech completes                            */
  /* ---------------------------------------------------------------------- */
  const handleNextSlide = useCallback(() => {
    hardStopSpeech();
    setCurrentIndex((prev) => {
      if (prev + 1 < slides.length) return prev + 1;

      // reached last slide in lecture
      setIsPlaying(false);
      return prev;
    });
  }, [slides.length, hardStopSpeech]);

  /* ---------------------------------------------------------------------- */
  /* 🧠 Main speech engine binding to current slide                         */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function startSpeech() {
      if (!currentSlide || !slides.length || loading) return;
      if (!isPlayingRef.current || isMuted) return;

      await waitForVoices(3000);
      if (cancelled) return;

      const voices = window.speechSynthesis?.getVoices() || [];
      if (!voices.length) {
        // Fallback: at least show text, even if no voices
        setCurrentSentence(currentSlide.content || "");
        return;
      }

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
      cancelled = true;
    };
    // playSeed lets us "replay" the same slide / lecture
  }, [
    currentSlide?._id,
    slides.length,
    isMuted,
    loading,
    handleNextSlide,
    playSeed,
  ]);

  /* ---------------------------------------------------------------------- */
  /* 🎛 Controls                                                            */
  /* ---------------------------------------------------------------------- */

  // go to specific slide (Prev / Next buttons)
  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    hardStopSpeech();
    setCurrentIndex(index);
    setIsPlaying(true);
    setPlaySeed((s) => s + 1); // force re-start for this slide
  };

  // Play / Pause should genuinely pause/resume speech
  const handlePlayPause = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isPlaying) {
      PAUSE_LOCK = true;
      if (synth.speaking && !synth.paused) {
        synth.pause();
      }
      setIsPlaying(false);
      setIsSpeaking(false);
    } else {
      PAUSE_LOCK = false;
      if (synth.paused) {
        synth.resume();
      } else {
        // if nothing is currently queued, replay current slide
        setPlaySeed((s) => s + 1);
      }
      setIsPlaying(true);
    }
  };

  // Mute should pause speech and unmute should resume only if playing
  const handleMuteToggle = () => {
    const synth = window.speechSynthesis;
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        if (synth?.speaking && !synth.paused) synth.pause();
      } else if (!PAUSE_LOCK && isPlayingRef.current && synth?.paused) {
        synth.resume();
      }
      return next;
    });
  };

  // clicking lecture in sidebar
  const handleLectureSelect = (lec) => {
    if (!lec?._id) return;

    hardStopSpeech();
    setCurrentIndex(0);
    setCurrentSentence("");
    setProgress(0);
    setIsPlaying(true);

    if (lec._id === selectedLectureId) {
      // replay same lecture from the beginning
      setPlaySeed((s) => s + 1);
    } else {
      setSelectedLectureId(lec._id);
      setPlaySeed(0);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* ⚠️ Error state                                                         */
  /* ---------------------------------------------------------------------- */
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-50">
        <p className="text-sm md:text-base">⚠️ {error}</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* 🎨 Layout                                                              */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* Loader overlay (no missing background image) */}
      {loading && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/95 text-white transition-opacity duration-700 ease-in-out">
          <div className="bg-black/70 px-8 py-6 rounded-2xl text-center max-w-lg shadow-lg backdrop-blur-sm">
            <div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <h1 className="text-2xl font-semibold mb-2">
              📡 Loading classroom…
            </h1>
            <p className="opacity-90 text-sm">
              Please wait, connecting to the live session.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-4 md:px-8 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg md:text-2xl font-semibold tracking-wide">
            Classroom Live • {currentLecture?.subject || "Lecture"}
          </div>

          {/* access type badge */}
          {(currentLecture?.accessType || currentLecture?.access_type) && (
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                (currentLecture.accessType || currentLecture.access_type) ===
                "public"
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-700"
                  : "bg-slate-700/40 text-slate-300 border border-slate-600"
              }`}
            >
              {(currentLecture.accessType || currentLecture.access_type) ===
              "public"
                ? "Public"
                : "Private"}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 text-xs md:text-sm">
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

      {/* Main content */}
      <main className="flex-1 px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)_minmax(0,1.1fr)] gap-4">
          {/* Teacher avatar */}
          <div className="order-1 lg:order-none">
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

          {/* Teleprompter + media */}
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

            <div className="mt-2 flex items-center justify-end gap-2 text-xs">
              <button
                className="px-3 py-1 rounded-full bg-slate-800 border border-slate-600"
                onClick={() => goToSlide(currentIndex - 1)}
              >
                ◀ Prev
              </button>
              <span className="text-slate-300">
                Slide {slides.length ? currentIndex + 1 : 0} / {slides.length}
              </span>
              <button
                className="px-3 py-1 rounded-full bg-slate-800 border border-slate-600"
                onClick={() => goToSlide(currentIndex + 1)}
              >
                Next ▶
              </button>
            </div>
          </section>

          {/* Playlist sidebar */}
          <div className="order-2 lg:order-none">
            <LecturePlaylistSidebar
              lectures={lectures}
              currentLectureId={selectedLectureId}
              onSelectLecture={handleLectureSelect}
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

      <footer className="text-xs text-slate-600 text-center py-3 border-t border-slate-800">
        ClassroomLivePage • connected to API ({API_BASE})
      </footer>
    </div>
  );
}
