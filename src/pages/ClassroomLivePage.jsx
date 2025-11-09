import React, { useEffect, useRef, useState } from "react";
import TeacherAvatarCard from "../components/TeacherAvatarCard";
import ClassroomTeleprompter from "../components/ClassroomTeleprompter";
import { MediaBoard, MediaControlPanel } from "../components/MediaBoard";
import LecturePlaylistSidebar from "../components/LecturePlaylistSidebar";
import StudentsRow from "../components/StudentsRow";

// ✅ Voice Engine Import — make sure folder is exactly `src/voice/` (lowercase, no spaces)
import {
  waitForVoices,
  splitIntoChunks,
  pickVoice,
  playClassroomSpeech,
  stopClassroomSpeech,
} from "../voice/ClassroomVoiceEngine.js";

/* -------------------------------------------------------------------------- */
/* ✅ Mock Data (replace with API later)                                      */
/* -------------------------------------------------------------------------- */
const MOCK_LECTURES = [
  {
    _id: "lec1",
    title: "Definition",
    status: "released",
    releaseAt: new Date().toISOString(),
  },
  {
    _id: "lec2",
    title: "Examples",
    status: "scheduled",
    releaseAt: new Date().toISOString(),
  },
  {
    _id: "lec3",
    title: "Exercise",
    status: "draft",
    releaseAt: new Date().toISOString(),
  },
];

const MOCK_SLIDES = [
  {
    _id: "slide1",
    subject: "History",
    topicTitle: "Industrial Revolution – Definition",
    content:
      "The **Industrial Revolution** was a period of [def]transition to new manufacturing processes[/def] from about **1760** to sometime between **1820** and **1840**.",
    teacher: {
      name: "Mr. Smith",
      role: "Faculty – History",
      avatarType: "HISTORY",
    },
    media: {
      videoUrl: "/media/industrial-video.mp4",
      audioUrl: "/media/industrial-audio.mp3",
      imageUrl: "/media/factory.png",
    },
  },
  {
    _id: "slide2",
    subject: "History",
    topicTitle: "Impact – Example",
    content:
      "[ex]Factories allowed goods to be produced faster and cheaper[/ex], changing how people lived and worked in cities.",
    teacher: {
      name: "Mr. Smith",
      role: "Faculty – History",
      avatarType: "HISTORY",
    },
    media: {},
  },
];

/* -------------------------------------------------------------------------- */
/* ✅ Main Component                                                          */
/* -------------------------------------------------------------------------- */
export default function ClassroomLivePage() {
  // ------------------------- State Management ------------------------------
  const [slides, setSlides] = useState([]);
  const [lectures, setLectures] = useState(MOCK_LECTURES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSentence, setCurrentSentence] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  // ------------------------- Refs -----------------------------------------
  const speechRef = useRef({ isPlaying: false, cancel: () => {} });
  const currentSlide = slides[currentIndex] || null;

  /* ---------------------------------------------------------------------- */
  /* ✅ Simulated API Fetch (Replace with real backend later)               */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const loadSlides = async () => {
      try {
        // Future API example:
        // const res = await fetch(`/api/classroom/lectures/${lectureId}/slides`);
        // const data = await res.json();
        // setSlides(Array.isArray(data) ? data : []);
        setSlides(MOCK_SLIDES);
      } catch (err) {
        console.error("Failed to load slides:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSlides();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* ✅ Voice Engine — Speech playback per slide                            */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (!currentSlide) return;

    // Stop any running speech first
    stopClassroomSpeech(speechRef);

    if (!isPlaying || isMuted) return;

    playClassroomSpeech({
      slide: currentSlide,
      isMuted,
      speechRef,
      setCurrentSentence,
      onComplete: () => {
        // Auto-advance to next slide after a short delay
        setTimeout(() => {
          setCurrentIndex((prev) =>
            prev + 1 < slides.length ? prev + 1 : prev
          );
        }, 800);
      },
    });

    // Cleanup on unmount / slide change
    return () => stopClassroomSpeech(speechRef);
  }, [currentSlide?._id, isPlaying, isMuted, slides.length]);

  /* ---------------------------------------------------------------------- */
  /* ✅ Navigation + Control Handlers                                       */
  /* ---------------------------------------------------------------------- */
  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    stopClassroomSpeech(speechRef);
    setCurrentSentence("");
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
    alert("✋ Student raised hand — you can show a question queue here.");
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

  if (!currentSlide) {
    return (
      <div className="text-center text-slate-400 p-10">
        No slides available.
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* ✅ Render UI Layout                                                    */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* ---------- Header ---------- */}
      <header className="px-4 md:px-8 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="text-lg md:text-2xl font-semibold tracking-wide">
          Classroom Live • {currentSlide.subject}
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

      {/* ---------- Main Content ---------- */}
      <main className="flex-1 px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)_minmax(0,1.1fr)] gap-4">
          {/* Teacher Avatar */}
          <TeacherAvatarCard
            teacher={currentSlide.teacher}
            subject={currentSlide.subject}
            isSpeaking={isPlaying && !isMuted}
          />

          {/* Board: Teleprompter + Media */}
          <section className="flex flex-col gap-3">
            <ClassroomTeleprompter
              slide={currentSlide}
              currentSentence={currentSentence}
              duration={3000}
            />

            <MediaBoard media={currentSlide.media} />
            <MediaControlPanel
              active={{
                audio: !!currentSlide.media?.audioUrl,
                video: !!currentSlide.media?.videoUrl,
                image: !!currentSlide.media?.imageUrl,
              }}
            />

            {/* Manual Slide Controls */}
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

          {/* Lecture Playlist Sidebar */}
          <LecturePlaylistSidebar
            lectures={lectures}
            currentLectureId={lectures[0]?._id}
          />
        </div>

        {/* Students Row */}
        <StudentsRow
          onRaiseHand={handleRaiseHand}
          onReaction={handleReaction}
        />
      </main>
    </div>
  );
}
