import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

import TeacherAvatarCard from "../components/TeacherAvatarCard";
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

/* -------------------------------------------------------------------------- */
/* ✅ ClassroomLivePage Component                                            */
/* -------------------------------------------------------------------------- */
export default function ClassroomLivePage() {
  /* ----------------------------- STATE ---------------------------------- */
  const [lectures, setLectures] = useState([]);
  const [slides, setSlides] = useState([]);
  const [selectedLectureId, setSelectedLectureId] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSentence, setCurrentSentence] = useState("");
  const [progress, setProgress] = useState(0);

  const [sentences, setSentences] = useState([]); // ✅ all sentences for teleprompter
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0); // ✅ highlight tracker

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState(null);          // global (lectures) error
  const [slidesError, setSlidesError] = useState(null); // ✅ slides-only error

  const [playSeed, setPlaySeed] = useState(0);

  const speechRef = useRef({ isPlaying: false, cancel: () => {} });
  const switchTimer = useRef(null);
  const speechPaused = useRef(false);
  const isPlayingRef = useRef(true);

  const currentSlide = slides[currentIndex] || null;
  const currentLecture =
    lectures.find((l) => l._id === selectedLectureId) || null;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  /* ---------------------------------------------------------------------- */
  /* 🔓 Unlock Speech Autoplay                                              */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    unlockSpeechOnUserClick();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 🧹 Hard Stop Helper                                                    */
  /* ---------------------------------------------------------------------- */
  const hardStopSpeech = useCallback(() => {
    try {
      window.speechSynthesis?.cancel();
    } catch (e) {
      console.warn("Speech cancel failed:", e);
    }
    stopClassroomSpeech(speechRef);
    setIsSpeaking(false);
    setCurrentSentence("");
    setProgress(0);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 📚 Load Lectures                                                      */
  /* ---------------------------------------------------------------------- */
  const fetchLectures = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/lectures?status=released`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : [];
      setLectures(list);

      if (!selectedLectureId && list[0]?._id) {
        setSelectedLectureId(list[0]._id);
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to load lectures:", err);
      setError("Failed to load lectures");
      setLoading(false);
    }
  }, [selectedLectureId]);

  useEffect(() => {
    fetchLectures();
  }, [fetchLectures]);

  /* ---------------------------------------------------------------------- */
  /* 📝 Load Slides for Selected Lecture                                   */
  /* ---------------------------------------------------------------------- */
  const fetchSlides = useCallback(
    async (lectureId) => {
      if (!lectureId) return;
      setLoading(true);
      hardStopSpeech();
      setSlidesError(null); // ✅ clear previous slides error

      try {
        const res = await fetch(`${API_BASE}/lectures/${lectureId}/slides`);
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const json = await res.json();

        // 🔍 Flexible parsing: support multiple possible backend shapes
        let slidesData = [];
        if (Array.isArray(json.data?.slides)) slidesData = json.data.slides;
        else if (Array.isArray(json.data)) slidesData = json.data;
        else if (Array.isArray(json.slides)) slidesData = json.slides;
        else if (Array.isArray(json.lectureSlides)) slidesData = json.lectureSlides;
        else if (Array.isArray(json.lecture?.slides)) slidesData = json.lecture.slides;
        else if (Array.isArray(json)) slidesData = json;
        else slidesData = [];

        if (!slidesData.length) {
          console.warn("⚠️ No slides found for lecture:", lectureId, json);
          setSlidesError("No slides available for this lecture yet.");
        } else {
          setSlidesError(null);
        }

        setSlides(slidesData);
        setCurrentIndex(0);
        setCurrentSentence("");
        setProgress(0);
      } catch (err) {
        console.error("Failed to load slides:", err);
        setSlides([]);
        setSlidesError("⚠️ Failed to fetch slides for this lecture.");
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
  /* 🎙 Preload Voices                                                     */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    waitForVoices(3000).then((voices) =>
      console.log(`✅ Voices preloaded (${voices.length})`)
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* 🧾 Split slide text into sentences for teleprompter                   */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    if (currentSlide?.content) {
      const all = currentSlide.content
        .split(/(?<=[।!?\.])\s+/)
        .filter((s) => s.trim().length > 0);
      setSentences(all);
      setActiveSentenceIndex(0);
    } else {
      setSentences([]);
    }
  }, [currentSlide?._id]);

  /* ---------------------------------------------------------------------- */
  /* ⏭ Slide Progression                                                   */
  /* ---------------------------------------------------------------------- */
  const handleNextSlide = useCallback(() => {
    hardStopSpeech();
    setCurrentIndex((prev) => {
      if (prev + 1 < slides.length) return prev + 1;
      setIsPlaying(false);
      return prev;
    });
  }, [slides.length, hardStopSpeech]);

  /* ---------------------------------------------------------------------- */
  /* 🧠 Main Speech Engine Binding                                         */
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
        setCurrentSentence(currentSlide.content || "");
        return;
      }

      playClassroomSpeech({
        slide: currentSlide,
        isMuted,
        speechRef,
        setCurrentSentence: (sentence) => {
          setCurrentSentence(sentence);
          const idx = sentences.findIndex(
            (s) => s.trim() === sentence.trim()
          );
          if (idx >= 0) setActiveSentenceIndex(idx);
        },
        onProgress: setProgress,
        onStartSpeaking: () => setIsSpeaking(true),
        onStopSpeaking: () => setIsSpeaking(false),
        onComplete: () => handleNextSlide(),
      });
    }

    startSpeech();
    return () => {
      cancelled = true;
    };
  }, [
    currentSlide?._id,
    slides.length,
    isMuted,
    loading,
    playSeed,
    sentences,
    handleNextSlide,
  ]);

  /* ---------------------------------------------------------------------- */
  /* 🧭 Auto-scroll teleprompter when active sentence changes              */
  /* ---------------------------------------------------------------------- */
  useEffect(() => {
    const container = document.getElementById("teleprompter");
    const active = container?.querySelector(
      `[data-line="${activeSentenceIndex}"]`
    );
    if (active && container) {
      active.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeSentenceIndex]);

  /* ---------------------------------------------------------------------- */
  /* 🎮 Controls                                                           */
  /* ---------------------------------------------------------------------- */
  const goToSlide = (index) => {
    if (index < 0 || index >= slides.length) return;
    hardStopSpeech();
    setCurrentIndex(index);
    setIsPlaying(true);
    setPlaySeed((s) => s + 1);
  };

  const handlePlayPause = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (isPlaying) {
      speechPaused.current = true;
      synth.cancel();
      hardStopSpeech();
      setIsPlaying(false);
      setIsSpeaking(false);
    } else {
      speechPaused.current = false;
      setIsPlaying(true);
      setPlaySeed((s) => s + 1);
    }
  };

  const handleMuteToggle = () => {
    const synth = window.speechSynthesis;
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        if (synth?.speaking && !synth.paused) synth.pause();
      } else if (isPlayingRef.current && synth?.paused) {
        synth.resume();
      }
      return next;
    });
  };

  /* ---------------------------------------------------------------------- */
  /* 🧾 Error Fallback (lectures only)                                     */
  /* ---------------------------------------------------------------------- */
  if (error && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-50">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* 🖥 Render Layout                                                      */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-50 flex flex-col overflow-hidden">
      {loading && !isSwitching && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/95 text-white">
          <div className="bg-black/70 px-8 py-6 rounded-2xl text-center shadow-lg backdrop-blur-sm">
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

      {/* Main */}
      <main className="flex-1 px-4 md:px-8 py-4 md:py-6 flex flex-col gap-4">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2.4fr)_minmax(0,1.1fr)] gap-4">
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

          {/* 🟩 Teleprompter + Media */}
          <section className="flex flex-col gap-3">
            {/* Teleprompter / Slides state */}
            {slidesError && !slides.length ? (
              <div className="flex items-center justify-center h-[220px] bg-slate-900 rounded-xl border border-amber-400/60 text-amber-300 text-sm px-4 text-center">
                {slidesError}
              </div>
            ) : (
              <div
                id="teleprompter"
                className="overflow-y-auto max-h-[250px] p-4 bg-slate-900 rounded-xl border border-slate-700 text-slate-200 leading-relaxed tracking-wide scroll-smooth"
              >
                {sentences.map((line, i) => (
                  <p
                    key={i}
                    data-line={i}
                    className={`transition-all duration-200 my-1 ${
                      i === activeSentenceIndex
                        ? "text-emerald-300 font-semibold bg-slate-800/60 px-2 py-1 rounded-md"
                        : "text-slate-400 opacity-70"
                    }`}
                  >
                    {line}
                  </p>
                ))}
                {!sentences.length && !slidesError && (
                  <p className="text-slate-500 text-sm italic">
                    No content for this slide yet.
                  </p>
                )}
              </div>
            )}

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

          <LecturePlaylistSidebar
            lectures={lectures}
            currentLectureId={selectedLectureId}
            onSelectLecture={setSelectedLectureId}
          />
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
