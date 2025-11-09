// ✅ Classroom Voice Engine (Final Synced Version)
// Provides synced teleprompter + avatar control + voice in Hindi/English/Hinglish.

export async function waitForVoices(maxWait = 3000) {
  const synth = window.speechSynthesis;
  if (!synth) return [];

  let voices = synth.getVoices();
  if (voices.length) return voices;

  // Wait for voices to load
  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, maxWait);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      resolve();
    };
  });

  return synth.getVoices();
}

/* -------------------------------------------------------------------------- */
/* ✅ Split readable sentences                                                */
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
/* ✅ Smart voice selection (Hindi / English / Hinglish)                      */
/* -------------------------------------------------------------------------- */
export function pickVoice(teacher = {}) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // If teacher has a preferred voice
  if (teacher.voiceName) {
    const found = voices.find((x) => x.name === teacher.voiceName);
    if (found) return found;
  }

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

  return (
    voices.find((v) => /en-IN/i.test(v.lang)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    voices[0]
  );
}

/* -------------------------------------------------------------------------- */
/* ✅ Core speech engine — synced with teleprompter & avatar                  */
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

  // cancel old voice
  synth.cancel();
  if (speechRef.current?.cancel) speechRef.current.cancel();

  // wait for available voices
  await waitForVoices(3000);

  const chunks = splitIntoChunks(slide.content);
  if (!chunks.length) {
    setCurrentSentence(slide.content || "");
    onComplete?.();
    return;
  }

  let idx = 0;
  let cancelled = false;

  speechRef.current = {
    isPlaying: true,
    cancel: () => {
      cancelled = true;
      synth.cancel();
      onStopSpeaking?.();
    },
  };

  const speakNext = () => {
    if (cancelled) return;
    if (idx >= chunks.length) {
      speechRef.current.isPlaying = false;
      onStopSpeaking?.();
      onComplete?.();
      return;
    }

    const sentence = chunks[idx++];
    setCurrentSentence(sentence);
    onProgress?.(0);

    // 🧩 simulate short delay if muted
    if (isMuted) {
      setTimeout(() => {
        onProgress?.(1);
        speakNext();
      }, 1000);
      return;
    }

    const utter = new SpeechSynthesisUtterance(sentence);
    const voice = pickVoice(slide.teacher || {});
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang || "en-IN";

    // natural speed depending on sentence length
    const len = sentence.length;
    utter.rate = len > 180 ? 0.9 : len > 100 ? 1.0 : 1.1;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    const totalLen = len;
    let started = false;

    utter.onstart = () => {
      started = true;
      onStartSpeaking?.();
    };

    // progressive sync for teleprompter
    utter.onboundary = (event) => {
      if (event.name === "word" || event.charIndex !== undefined) {
        const progress = Math.min(1, event.charIndex / totalLen);
        onProgress?.(progress);
      }
    };

    utter.onend = () => {
      onProgress?.(1);
      onStopSpeaking?.();
      if (!cancelled) speakNext();
    };

    utter.onerror = (e) => {
      console.error("Speech error:", e);
      onStopSpeaking?.();
      if (!cancelled) speakNext();
    };

    try {
      synth.speak(utter);
    } catch (err) {
      console.error("Utterance error:", err);
      if (!cancelled) speakNext();
    }

    // Fallback timer: if voice never starts due to Chrome block
    setTimeout(() => {
      if (!started && !cancelled) {
        console.warn("⚠️ Speech blocked until user interaction. Please click Play.");
        onStopSpeaking?.();
        onComplete?.();
      }
    }, 2000);
  };

  speakNext();
}

/* -------------------------------------------------------------------------- */
/* ✅ Stop speech gracefully                                                 */
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
/* ✅ Unlock voices once user interacts (browser policy)                     */
/* -------------------------------------------------------------------------- */
export function unlockSpeechOnUserClick() {
  document.body.addEventListener(
    "click",
    () => {
      if (window.speechSynthesis) {
        try {
          window.speechSynthesis.resume();
        } catch (e) {
          console.warn("Voice unlock error:", e);
        }
      }
    },
    { once: true }
  );
}
