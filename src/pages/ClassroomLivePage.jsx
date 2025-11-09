import React, { useEffect, useRef, useState } from "react";
import TeacherAvatarCard from "../components/TeacherAvatarCard";
import ClassroomTeleprompter from "../components/ClassroomTeleprompter";
import { MediaBoard, MediaControlPanel } from "../components/MediaBoard";
import LecturePlaylistSidebar from "../components/LecturePlaylistSidebar";
import StudentsRow from "../components/StudentsRow";

import {
  waitForVoices,
  playClassroomSpeech,
  stopClassroomSpeech,
} from "../voice/ClassroomVoiceEngine.js";

/* -------------------------------------------------------------------------- */
/* ✅ Main Component — ClassroomLivePage                                      */
/* -------------------------------------------------------------------------- */
export default function ClassroomLivePage() {
  /* ------------------------- State Management ---------------------------- */
  const [slides, setSlides] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [selectedLectureId, setSelectedLectureId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSentence, setCurrentSentence] = useState("");
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ------------------------- Refs ---------------------------------------- */
  const speechRef = useRef({ isPlaying: false, cancel: () => {} });
  const currentSlide = slides[currentIndex] || null;

  /* ---------------------------------------------------------------------- */
  /* ✅ Load Lectures List from API                                         */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const loadLectures = async () => {
      try {
        const res = await fetch(
          `${
            import.meta.env.VITE_API_URL ||
            "https://law-network.onrender.com/api"
          }/classroom/lectures?status=released`
        );
        const data = await res.json();

        if (Array.isArray(data.data || data)) {
          const arr = data.data || data;
          setLectures(arr);
          if (arr.length > 0 && !selectedLectureId) {
            setSelectedLectureId(arr[0]._id);
          }
        } else {
          console.warn("Unexpected lecture response shape:", data);
          setLectures([]);
        }
      } catch (err) {
        console.error("Failed to fetch lectures:", err);
        setError("Failed to load lectures");
      }
    };

    loadLectures();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* ✅ Load Slides for Selected Lecture                                    */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!selectedLectureId) return;

    const loadSlides = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${
            import.meta.env.VITE_API_URL ||
            "https://law-network.onrender.com/api"
          }/classroom/lectures/${selectedLectureId}/slides`
        );
        const data = await res.json();

        if (Array.isArray(data.slides || data)) {
          setSlides(data.slides || data);
        } else {
          console.warn("Unexpected slides shape:", data);
          setSlides([]);
        }
      } catch (err) {
        console.error("Failed to load slides:", err);
        setError("Failed to fetch slides");
        setSlides([]);
      } finally {
        setLoading(false);
      }
    };

    loadSlides();
  }, [selectedLectureId]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Preload Voices Once (prevents silent start on Chrome)               */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    waitForVoices(3000).then((voices) =>
      console.log(`✅ Voices preloaded (${voices.length})`)
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* ✅ Voice Engine — synchronized with Teleprompter                       */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;

    async function startSpeech() {
      if (!currentSlide || !mounted) return;

      // Stop previous speech before new one starts
      stopClassroomSpeech(speechRef);

      // Wait until voices are ready (important!)
      await waitForVoices(3000);
      const voices = window.speechSynthesis.getVoices();
      console.log("🎙️ Voices available:", voices.length);

      // No voices? Just show text.
      if (!voices.length) {
        setCurrentSentence(currentSlide.content || "");
        return;
      }

      // Skip if paused/muted
      if (!isPlaying || isMuted) return;

      playClassroomSpeech({
  slide: currentSlide,
  isMuted,
  speechRef,
  setCurrentSentence,
  onProgress: setProgress,
  onStartSpeaking: () => {
    speechRef.current.isPlaying = true;
  },
  onStopSpeaking: () => {
    speechRef.current.isPlaying = false;
  },
  onComplete: () => {
    setProgress(0);
    setTimeout(() => {
      setCurrentIndex((prev) =>
        prev + 1 < slides.length ? prev + 1 : prev
      );
    }, 1000);
  },
});

    }

    startSpeech();

    return () => {
      mounted = false;
      stopClassroomSpeech(speechRef);
    };
  }, [currentSlide?._id, isPlaying, isMuted, slides.length]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Navigation + Control Handlers                                       */
  /* ---------------------------------------------------------------------- */
  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    stopClassroomSpeech(speechRef);
    setCurrentSentence("");
    setProgress(0);
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      stopClassroomSpeech(speechRef);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) stopClassroomSpeech(speechRef);
      return next;
    });
  };

  const handleRaiseHand = () => {
    alert("✋ Student raised hand — queue feature coming soon!");
  };

  const handleReaction = (emoji) => {
    console.log("Student reaction:", emoji);
  };

  /* ---------------------------------------------------------------------- */
  /* ✅ Conditional UI States                                               */
  /* ---------------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="text-center text-slate-100 p-10 animate-pulse">
        Loading classroom…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 p-10">
        ⚠️ {error || "Something went wrong."}
      </div>
    );
  }

  if (!slides.length) {
    return (
      <div className="text-center text-slate-400 p-10">
        No slides available for this lecture.
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* ✅ Render Full Classroom Layout                                        */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* ---------- Header ---------- */}
      <header className="px-4 md:px-8 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="text-lg md:text-2xl font-semibold tracking-wide">
          Classroom Live • {currentSlide.subject || "Lecture"}
        </div>

        <div className="flex items-center gap-2 text-xs md:text-sm">
          <button
            onClick={handlePlayPause}
            className="px-3 py-1.5 rounded-full bg-emerald-500 text-black font-semibold text-xs"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={handleMuteToggle}
            className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-100 text-xs border border-slate-600"
          >
            {isMuted ? "Unmute" : "Mute"}
          </button>
        </div>
      </header>

      {/* ---------- Main Section ---------- */}
      <main className="flex-1 px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)_minmax(0,1.1fr)] gap-4">
          {/* ---------- Teacher Avatar ---------- */}
          <TeacherAvatarCard
            teacher={currentSlide.teacher}
            subject={currentSlide.subject}
            isSpeaking={isPlaying && !isMuted && speechRef.current.isPlaying}
          />

          {/* ---------- Teleprompter + Media Board ---------- */}
          <section className="flex flex-col gap-3">
            <ClassroomTeleprompter
              slide={currentSlide}
              currentSentence={currentSentence}
              progress={progress}
            />

            <MediaBoard media={currentSlide.media} />

            <MediaControlPanel
              active={{
                audio: !!currentSlide.media?.audioUrl,
                video: !!currentSlide.media?.videoUrl,
                image: !!currentSlide.media?.imageUrl,
              }}
            />

            {/* ---------- Slide Navigation ---------- */}
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

          {/* ---------- Playlist Sidebar ---------- */}
          <LecturePlaylistSidebar
            lectures={lectures}
            currentLectureId={selectedLectureId}
            onSelectLecture={(lec) => {
              if (lec?._id !== selectedLectureId) {
                setSelectedLectureId(lec._id);
                setCurrentIndex(0);
                setProgress(0);
              }
            }}
          />
        </div>

        {/* ---------- Students Row ---------- */}
        <StudentsRow
          onRaiseHand={handleRaiseHand}
          onReaction={handleReaction}
        />
      </main>

      {/* ---------- Footer ---------- */}
      <footer className="text-xs text-slate-600 text-center py-3 border-t border-slate-800">
        ClassroomLivePage • connected to API (
        {import.meta.env.VITE_API_URL ||
          "https://law-network.onrender.com/api"}
        )
      </footer>
    </div>
  );
}
