// src/voice/ClassroomVoiceEngine.js
let voiceCache = [];

/* ------------------------------------------------------- */
/* Wait for voices                                         */
/* ------------------------------------------------------- */
export function waitForVoices(timeout = 3000) {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis?.getVoices() || [];
    if (existing.length) {
      voiceCache = existing;
      return resolve(existing);
    }

    let tries = 0;
    const id = setInterval(() => {
      const v = window.speechSynthesis.getVoices();
      if (v.length || tries++ > 30) {
        clearInterval(id);
        voiceCache = v;
        resolve(v);
      }
    }, 100);
    setTimeout(() => clearInterval(id), timeout);
  });
}

/* ------------------------------------------------------- */
/* Detect language                                         */
/* ------------------------------------------------------- */
function detectLang(text = "") {
  if (/[ऀ-ॿ]/.test(text)) return "hi-IN"; // Hindi
  if (/[a-zA-Z]/.test(text) && /[ंँेो]/.test(text)) return "hi-IN"; // Hinglish
  return "en-IN";
}

/* ------------------------------------------------------- */
/* Pick most natural Indian voice                          */
/* ------------------------------------------------------- */
function pickVoice(lang, teacher = {}) {
  if (!voiceCache.length)
    voiceCache = window.speechSynthesis?.getVoices() || [];

  if (teacher.voiceName) {
    const named = voiceCache.find((v) => v.name === teacher.voiceName);
    if (named) return named;
  }

  // Priority for Indian voices
  const indianPriority = [
    "en-IN",
    "hi-IN",
    "Google हिन्दी",
    "Google English (India)",
    "Microsoft Ravi - English (India)",
    "Microsoft Heera - English (India)",
    "Sangeeta",
    "Neerja",
  ];

  for (const key of indianPriority) {
    const match = voiceCache.find(
      (v) => v.name.includes(key) || v.lang === key
    );
    if (match) return match;
  }

  // fallback to most human-sounding English
  return (
    voiceCache.find((v) => v.lang === "en-GB") ||
    voiceCache.find((v) => v.lang === "en-US") ||
    voiceCache[0]
  );
}

/* ------------------------------------------------------- */
/* ✨ Indian Accent Simulation                              */
/* ------------------------------------------------------- */
function indianizeText(text = "") {
  // lightweight phonetic tweaks (for mobile)
  return text
    .replace(/\bthe\b/gi, "thuh")
    .replace(/\bcan\b/gi, "kaan")
    .replace(/\bteacher\b/gi, "tee-cher")
    .replace(/\blecture\b/gi, "lek-chur")
    .replace(/\bpeople\b/gi, "pee-pul")
    .replace(/\bclass\b/gi, "klaas");
}

/* ------------------------------------------------------- */
/* Main Player                                             */
/* ------------------------------------------------------- */
export function playClassroomSpeech({
  slide,
  isMuted = false,
  speechRef,
  setCurrentSentence,
  onProgress,
  onStartSpeaking,
  onStopSpeaking,
  onComplete,
}) {
  if (!slide || isMuted) return;

  const synth = window.speechSynthesis;
  if (!synth) return console.error("Speech synthesis not supported");

  stopClassroomSpeech(speechRef);

  const content = slide.content || "";
  const sentences = content
    .split(/(?<=[।!?\.])\s+/)
    .filter((s) => s.trim().length > 0);

  let index = 0;
  let cancelled = false;

  const speakNext = () => {
    if (cancelled || index >= sentences.length) {
      onStopSpeaking?.();
      onComplete?.();
      return;
    }

    let sentence = sentences[index];
    const lang = detectLang(sentence);

    // Apply "Indianized" fallback when no en-IN voice available
    const voice = pickVoice(lang, slide.teacher);
    if (voice && !/en-IN|hi-IN/.test(voice.lang)) {
      sentence = indianizeText(sentence);
    }

    setCurrentSentence(sentence);

    const utter = new SpeechSynthesisUtterance(sentence);
    utter.voice = voice;
    utter.lang = voice?.lang || lang;

    // Cross-browser tuning
    const ua = navigator.userAgent.toLowerCase();
    if (lang.startsWith("en")) {
      utter.rate = /firefox/.test(ua) ? 0.88 : /android/.test(ua) ? 0.9 : 0.93;
      utter.pitch = 1.03;
    } else {
      utter.rate = 0.96;
      utter.pitch = 1.0;
    }
    utter.volume = 1;

    let lastUpdate = 0;

    utter.onstart = () => {
      onStartSpeaking?.();
      onProgress?.(0);
    };

    utter.onboundary = (event) => {
      if (event.charIndex == null) return;
      const now = performance.now();
      if (now - lastUpdate > 100) {
        lastUpdate = now;
        const progress = Math.min(
          1,
          event.charIndex / (utter.text.length || 1)
        );
        onProgress?.((prev) => prev * 0.7 + progress * 0.3);
      }
    };

    utter.onend = () => {
      onProgress?.(1);
      onStopSpeaking?.();
      index++;
      setTimeout(speakNext, 300);
    };

    utter.onerror = (e) => {
      console.warn("Speech error:", e);
      index++;
      speakNext();
    };

    synth.speak(utter);
  };

  speakNext();

  speechRef.current = {
    isPlaying: true,
    cancel: () => {
      cancelled = true;
      window.speechSynthesis.cancel();
      onStopSpeaking?.();
    },
  };
}

/* ------------------------------------------------------- */
/* Stop Helper                                             */
/* ------------------------------------------------------- */
export function stopClassroomSpeech(speechRef) {
  try {
    window.speechSynthesis.cancel();
  } catch (e) {
    console.warn("speech cancel failed:", e);
  }
  if (speechRef?.current) {
    speechRef.current.isPlaying = false;
    speechRef.current.cancel = () => {};
  }
}

/* ------------------------------------------------------- */
/* Unlock Chrome/Android Audio Policy                      */
/* ------------------------------------------------------- */
export function unlockSpeechOnUserClick() {
  const resume = () => {
    try {
      window.speechSynthesis.resume();
      console.log("🔓 Speech synthesis unlocked after user click");
    } catch (e) {
      console.warn("Unlock failed", e);
    }
    window.removeEventListener("click", resume);
  };
  window.addEventListener("click", resume);
}
