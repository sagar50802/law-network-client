// ✅ Classroom Voice Engine — Final Stable Version (2025)
// Provides smooth real-time teleprompter sync, avatar glow, and multilingual speech (Hindi / English / Hinglish).

/* -------------------------------------------------------------------------- */
/* 🕗 Load available voices (with timeout + event fallback)                   */
/* -------------------------------------------------------------------------- */
export async function waitForVoices(maxWait = 3000) {
  const synth = window.speechSynthesis;
  if (!synth) return [];

  let voices = synth.getVoices();
  if (voices.length) return voices;

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, maxWait);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      resolve();
    };
  });

  voices = synth.getVoices();
  console.log("🎤 Voices loaded:", voices.length);
  return voices;
}

/* -------------------------------------------------------------------------- */
/* ✂️ Split readable sentences for pacing                                    */
/* -------------------------------------------------------------------------- */
export function splitIntoChunks(content) {
  if (!content) return [];
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* 🧠 Smart voice selection (Hindi / English / Hinglish)                      */
/* -------------------------------------------------------------------------- */
export function pickVoice(teacher = {}) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // 🧩 Manual override if teacher has a specific voice
  if (teacher.voiceName) {
    const found = voices.find((v) => v.name === teacher.voiceName);
    if (found) return found;
  }

  // 🧠 Detect Hindi / Hinglish preference
  const looksHindi =
    /[अ-हक़-य़]/.test(teacher.name || "") ||
    /हिन्दी|Hindi|Hinglish/i.test(teacher.role || "");

  if (looksHindi) {
    return (
      voices.find((v) => /hi-IN/i.test(v.lang)) ||
      voices.find((v) => /en-IN/i.test(v.lang)) ||
      voices.find((v) => /India/i.test(v.name)) ||
      voices[0]
    );
  }

  // 🗣 Default English fallback
  return (
    voices.find((v) => /en-IN/i.test(v.lang)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    voices[0]
  );
}

/* -------------------------------------------------------------------------- */
/* 🎙 Core Speech Engine — synced with teleprompter & avatar                 */
/* -------------------------------------------------------------------------- */
export async function playClassroomSpeech({
  slide,
  isMuted,
  speechRef,
  setCurrentSentence,
  onProgress,
  onStartSpeaking,
  onStopSpeaking,
  onComplete,
}) {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.warn("⚠️ SpeechSynthesis not supported in this browser.");
    setCurrentSentence(slide.content || "");
    onComplete?.();
    return;
  }

  // 🧹 Stop previous speech
  synth.cancel();
  if (speechRef.current?.cancel) speechRef.current.cancel();

  await waitForVoices(3000);

  const chunks = splitIntoChunks(slide.content);
  if (!chunks.length) {
    setCurrentSentence(slide.content || "");
    onComplete?.();
    return;
  }

  let idx = 0;
  let cancelled = false;

  // 📦 Reference object for external control
  speechRef.current = {
    isPlaying: true,
    cancel: () => {
      cancelled = true;
      synth.cancel();
      onStopSpeaking?.();
    },
  };

  // 🔁 Recursive speech function
  const speakNext = () => {
    if (cancelled) return;

    if (idx >= chunks.length) {
      // ✅ Finished all chunks
      speechRef.current.isPlaying = false;
      onStopSpeaking?.();
      onComplete?.();
      return;
    }

    const sentence = chunks[idx++];
    setCurrentSentence(sentence);
    onProgress?.(0);

    // 🔇 Simulated delay when muted
    if (isMuted) {
      setTimeout(() => {
        onProgress?.(1);
        speakNext();
      }, 1200);
      return;
    }

    const utter = new SpeechSynthesisUtterance(sentence);
    const voice = pickVoice(slide.teacher || {});
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang || "en-IN";

    // 🕰️ Natural pacing
    const len = sentence.length;
    utter.rate = len > 180 ? 0.8 : len > 100 ? 0.9 : 1.0;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    const totalLen = len;
    let started = false;

    /* ---------------------------- Voice lifecycle ---------------------------- */
    utter.onstart = () => {
      started = true;
      console.log("🎧 Started:", sentence);
      onStartSpeaking?.();
    };

    utter.onboundary = (event) => {
      if (event.charIndex !== undefined) {
        const progress = Math.min(1, event.charIndex / totalLen);
        onProgress?.(progress);
      }
    };

    utter.onend = () => {
      console.log("✅ Done:", sentence);
      onProgress?.(1);
      onStopSpeaking?.();
      if (!cancelled) speakNext();
    };

    utter.onerror = (err) => {
      console.error("❌ Speech error:", err);
      onStopSpeaking?.();
      if (!cancelled) speakNext();
    };

    try {
      // 🚀 Speak asynchronously (avoids Chrome blocking)
      setTimeout(() => synth.speak(utter), 0);
    } catch (err) {
      console.error("Utterance error:", err);
      if (!cancelled) speakNext();
    }

    // 🧩 Chrome/Edge fallback: detect blocked autoplay
    setTimeout(() => {
      if (!started && !cancelled) {
        console.warn(
          "⚠️ Speech blocked until user interacts (Chrome autoplay policy)."
        );
        onStopSpeaking?.();
        onComplete?.();
      }
    }, 2500);
  };

  console.log("🗣️ Starting classroom speech for:", slide.topicTitle);
  speakNext();
}

/* -------------------------------------------------------------------------- */
/* 🛑 Stop any current speech gracefully                                     */
/* -------------------------------------------------------------------------- */
export function stopClassroomSpeech(speechRef) {
  const synth = window.speechSynthesis;
  try {
    if (synth) synth.cancel();
    if (speechRef.current?.cancel) speechRef.current.cancel();
  } catch (e) {
    console.error("Stop speech error:", e);
  } finally {
    if (speechRef.current) speechRef.current.isPlaying = false;
  }
}

/* -------------------------------------------------------------------------- */
/* 🖱 Unlock speech after first user interaction (Chrome/Edge policy fix)    */
/* -------------------------------------------------------------------------- */
export function unlockSpeechOnUserClick() {
  document.body.addEventListener(
    "click",
    () => {
      const synth = window.speechSynthesis;
      if (!synth) return;

      try {
        // 🧩 Force unlock Chrome/Edge audio by speaking silent dummy utterance
        synth.resume();
        const dummy = new SpeechSynthesisUtterance("ok");
        dummy.volume = 0; // silent
        synth.speak(dummy);

        console.log("🔓 Speech synthesis fully unlocked after first user click");
      } catch (e) {
        console.warn("Voice unlock error:", e);
      }
    },
    { once: true }
  );
}
