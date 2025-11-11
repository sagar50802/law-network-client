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
  (import.meta.env.VITE_API_URL ||
    "https://law-network.onrender.com/api") + "/classroom";

let PAUSE_LOCK = false;

/* -------------------------------------------------------------------------- */
/* ✅ ClassroomLivePage Component                                            */
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

  const [lecturesLoading, setLecturesLoading] = useState(true);
  const [slidesLoading, setSlidesLoading] = useState(false);
  const [error, setError] = useState(null);

  const speechRef = useRef({ isPlaying: false, cancel: () => {} });

  const currentSlide = slides[currentIndex] || null;
  const currentLecture =
    lectures.find((l) => l._id === selectedLectureId) || null;

  const loading = lecturesLoading || slidesLoading;

  /* ---------------------------------------------------------------------- */
  /* 🧹 Safe cancel helper (no overlapping speech)                           */
  /* ---------------------------------------------------------------------- */
  const safeCancelSpeech = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch (e) {
      console.warn("Speech cancel failed:", e);
    }
    stopClassroomSpeech(speechRef);
    setIsSpeaking(false);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 🔓 Unlock speech autoplay after first user click                       */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    unlockSpeechOnUserClick();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 📚 Load lectures (released only)                                       */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    let active = true;

    async function loadLectures() {
      setLecturesLoading(true);
      try {
        const res = await fetch(`${API_BASE}/lectures?status=released`);
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();
        const list = Array.isArray(json.data) ? json.data : [];

        if (!active) return;

        setLectures(list);

        // Select first lecture by default
        if (!selectedLectureId && list[0]?._id) {
          setSelectedLectureId(list[0]._id);
        }
      } catch (err) {
        console.error("Failed to load lectures:", err);
        if (active) setError("Failed to load lectures");
      } finally {
        if (active) setLecturesLoading(false);
      }
    }

    loadLectures();
    return () => {
      active = false;
    };
  }, [selectedLectureId]);

  /* ---------------------------------------------------------------------- */
  /* 📝 Load slides for selected lecture                                    */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedLectureId) return;
    let active = true;

    async function loadSlides() {
      setSlidesLoading(true);
      safeCancelSpeech();
      setSlides([]);
      setCurrentIndex(0);
      setCurrentSentence("");
      setProgress(0);

      try {
        const res = await fetch(
          `${API_BASE}/lectures/${selectedLectureId}/slides`
        );
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const json = await res.json();

        // ✅ API returns { success, data: { slides: [...] } }
        const list =
          json?.data?.slides ||
          json.slides ||
          [];

        if (!active) return;

        setSlides(Array.isArray(list) ? list : []);
        setCurrentIndex(0);
        console.log("📚 Slides loaded:", Array.isArray(list) ? list.length : 0);
      } catch (err) {
        console.error("Failed to load slides:", err);
        if (active) {
          setError("Failed to fetch slides");
          setSlides([]);
        }
      } finally {
        if (active) setSlidesLoading(false);
      }
    }

    loadSlides();
    return () => {
      active = false;
    };
  }, [selectedLectureId, safeCancelSpeech]);

  /* ---------------------------------------------------------------------- */
  /* 🔊 Preload voices (once)                                               */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    waitForVoices(3000).then((voices) =>
      console.log(`✅ Voices preloaded (${voices.length})`)
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* ⏭ Slide progression                                                    */
  /* ---------------------------------------------------------------------- */
  const handleNextSlide = useCallback(() => {
    safeCancelSpeech();
    setCurrentSentence("");
    setProgress(0);

    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next < slides.length) {
        return next;
      }
      // Last slide reached → stop auto-play
      setIsPlaying(false);
      return prev;
    });
  }, [slides.length, safeCancelSpeech]);

  /* ---------------------------------------------------------------------- */
  /* 🗣 Voice synchronisation with slide + lecture                           */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    let active = true;

    async function startSpeech() {
      if (!currentSlide || !slides.length) return;

      // If user paused or muted, don't speak
      if (!isPlaying || isMuted || PAUSE_LOCK) return;

      safeCancelSpeech();

      await waitForVoices(3000);
      if (!active) return;

      const voices = window.speechSynthesis?.getVoices() || [];
      if (!voices.length) {
        // Fallback: just show text in teleprompter
        setCurrentSentence(currentSlide.content || "");
        return;
      }

      // Ensure no overlapping utterances
      if (
        window.speechSynthesis.speaking ||
        window.speechSynthesis.pending
      ) {
        window.speechSynthesis.cancel();
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
      active = false;
      safeCancelSpeech();
    };
  }, [
    currentSlide?._id,
    slides.length,
    isPlaying,
    isMuted,
    handleNextSlide,
    safeCancelSpeech,
  ]);

  /* ---------------------------------------------------------------------- */
  /* 🎮 Controls                                                            */
  /* ---------------------------------------------------------------------- */
  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    safeCancelSpeech();
    setCurrentSentence("");
    setProgress(0);
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause → really stop current reading
      PAUSE_LOCK = true;
      setIsPlaying(false);
      safeCancelSpeech();
    } else {
      // Resume → read current slide from start
      PAUSE_LOCK = false;
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        // becoming muted -> stop speech
        safeCancelSpeech();
      } else if (!PAUSE_LOCK && isPlaying) {
        // unmuted while playing -> effect will restart automatically
      }
      return next;
    });
  };

  /* ---------------------------------------------------------------------- */
  /* 🧾 Derived values                                                      */
  /* ---------------------------------------------------------------------- */
  const accessType =
    currentLecture?.accessType || currentLecture?.access_type;

  /* ---------------------------------------------------------------------- */
  /* 🖥 Render                                                              */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {/* 🔄 Loader overlay */}
      {loading && (
        <div
          id="classroom-loader"
          className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/95 text-white transition-opacity duration-500"
        >
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

      {/* HEADER */}
      <header className="px-4 md:px-8 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg md:text-2xl font-semibold tracking-wide">
            Classroom Live • {currentLecture?.subject || "Lecture"}
          </div>

          {accessType && (
            <span
              className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                accessType === "public"
                  ? "bg-emerald-600/20 text-emerald-400 border border-emerald-700"
                  : "bg-slate-700/40 text-slate-300 border border-slate-600"
              }`}
            >
              {accessType === "public" ? "Public" : "Private"}
            </span>
          )}
        </div>

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

      {/* MAIN */}
      <main className="flex-1 px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)_minmax(0,1.1fr)] gap-4">
          {/* LEFT: Teacher avatar */}
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

          {/* CENTER: Teleprompter + media */}
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
                disabled={currentIndex === 0}
              >
                ◀ Prev
              </button>
              <span className="text-slate-300">
                Slide {slides.length ? currentIndex + 1 : 0} / {slides.length}
              </span>
              <button
                className="px-3 py-1 rounded-full bg-slate-800 border border-slate-600"
                onClick={() => goToSlide(currentIndex + 1)}
                disabled={currentIndex + 1 >= slides.length}
              >
                Next ▶
              </button>
            </div>
          </section>

          {/* RIGHT: Today's lectures playlist */}
          <LecturePlaylistSidebar
            lectures={lectures}
            currentLectureId={selectedLectureId}
            onSelectLecture={(lec) => {
              if (!lec?._id || lec._id === selectedLectureId) return;
              safeCancelSpeech();
              setSlides([]);
              setCurrentIndex(0);
              setCurrentSentence("");
              setProgress(0);
              setIsSpeaking(false);
              setIsPlaying(true);
              setSelectedLectureId(lec._id);
            }}
          />
        </div>

        <StudentsRow
          onRaiseHand={() =>
            alert("✋ Student raised hand — feature coming soon!")
          }
          onReaction={(emoji) => console.log("Student reaction:", emoji)}
        />
      </main>

      {/* FOOTER */}
      <footer className="text-xs text-slate-600 text-center py-3 border-t border-slate-800">
        ClassroomLivePage • connected to API ({API_BASE})
      </footer>
    </div>
  );
}
