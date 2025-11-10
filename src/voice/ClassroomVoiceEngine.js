// src/voice/ClassroomVoiceEngine.js
let voiceCache = [];

/* ------------------------------------------------------- */
/* ⏳ Load voices (waits until ready on all browsers)       */
/* ------------------------------------------------------- */
export function waitForVoices(timeout = 3000) {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis?.getVoices() || [];
    if (voices.length) {
      voiceCache = voices;
      return resolve(voices);
    }

    let attempts = 0;
    const id = setInterval(() => {
      const v = window.speechSynthesis.getVoices();
      if (v.length || attempts++ > 30) {
        clearInterval(id);
        voiceCache = v;
        resolve(v);
      }
    }, 100);

    setTimeout(() => clearInterval(id), timeout);
  });
}

/* ------------------------------------------------------- */
/* 🧠 Language detection (Hindi / Hinglish / Indian English)*/
/* ------------------------------------------------------- */
function detectLang(text = "") {
  if (/[ऀ-ॿ]/.test(text)) return "hi-IN"; // Hindi
  if (/[a-zA-Z]/.test(text) && /[ंँेो]/.test(text)) return "hi-IN"; // Hinglish
  return "en-IN"; // Indian English default
}

/* ------------------------------------------------------- */
/* 🔤 Light text normalization for smoother TTS             */
/*    (law words, acronyms, etc.)                          */
/* ------------------------------------------------------- */
function normalizeForTTS(text = "", lang = "en-IN") {
  let t = text;

  // Expand common law abbreviations
  t = t.replace(/\bIPC\b/g, " I P C ");
  t = t.replace(/\bCrPC\b/gi, " C R P C ");
  t = t.replace(/\bSC\b/g, " Supreme Court ");
  t = t.replace(/\bHC\b/g, " High Court ");

  // Expand a few short forms
  t = t.replace(/\bsec\.\b/gi, " section ");
  t = t.replace(/\bart\.\b/gi, " article ");

  if (lang.startsWith("en")) {
    // Soft “Indian English” tweaks without making it weird
    t = t.replace(/\bthe\b/gi, "the"); // keep it neutral
    t = t.replace(/\bstudy\b/gi, "study");
  }

  return t;
}

/* ------------------------------------------------------- */
/* 🗣 Voice Picker (try best Indian / natural voices)       */
/* ------------------------------------------------------- */
function pickVoice(lang, teacher = {}) {
  if (!voiceCache.length)
    voiceCache = window.speechSynthesis?.getVoices() || [];

  // 1️⃣ Teacher override
  if (teacher.voiceName) {
    const named = voiceCache.find((v) => v.name === teacher.voiceName);
    if (named) return named;
  }

  // 2️⃣ Prioritized Indian voices list
  const indianVoiceNames = [
    "Google English (India)",
    "Google हिन्दी",
    "Google हिंदी",
    "Microsoft Ravi - English (India)",
    "Microsoft Heera - English (India)",
    "Microsoft Neerja - Hindi (India)",
    "Sangeeta",
  ];

  for (const key of indianVoiceNames) {
    const match = voiceCache.find(
      (v) => v.name.includes(key) || v.lang === "en-IN" || v.lang === "hi-IN"
    );
    if (match) return match;
  }

  // 3️⃣ Fallbacks: any Indian-ish or English voice
  const byLang =
    voiceCache.find((v) => v.lang === "en-IN") ||
    voiceCache.find((v) => v.lang === "hi-IN") ||
    voiceCache.find((v) => v.lang === "en-GB") ||
    voiceCache.find((v) => v.lang === "en-US");

  return byLang || voiceCache[0];
}

/* ------------------------------------------------------- */
/* 🗣 Main Speech Player (smooth, Indian-style)             */
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

  const rawContent = slide.content || "";
  const sentences = rawContent
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

    const originalSentence = sentences[index];
    const lang = detectLang(originalSentence);

    // 🔊 Normalize + smoothen for TTS
    const processedSentence = normalizeForTTS(originalSentence, lang);

    setCurrentSentence(originalSentence); // teleprompter shows original text

    const utter = new SpeechSynthesisUtterance(processedSentence);
    const voice = pickVoice(lang, slide.teacher);
    utter.voice = voice;
    utter.lang = voice?.lang || lang;

    /* 🎚️ Browser-specific fine-tuning for natural Indian tone */
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isFirefox = /firefox/.test(ua);
    const isEdge = /edg/.test(ua);

    if (lang.startsWith("en")) {
      // Indian English: slower, warmer, less robotic
      if (isAndroid) {
        utter.rate = 0.88; // mobile engines are usually faster
      } else if (isFirefox) {
        utter.rate = 0.9;
      } else if (isEdge) {
        utter.rate = 0.93;
      } else {
        utter.rate = 0.9;
      }
      utter.pitch = 1.03; // young Indian tone
      utter.volume = 1;
    } else {
      // Hindi / Hinglish
      utter.rate = isAndroid ? 0.92 : 0.95;
      utter.pitch = 1.0;
      utter.volume = 1;
    }

    let lastUpdate = 0;

    utter.onstart = () => {
      onStartSpeaking?.();
      onProgress?.(0);
    };

    // Smooth progress for teleprompter
    utter.onboundary = (event) => {
      if (event.charIndex == null) return;
      const now = performance.now();
      // a bit more frequent => smoother typing
      if (now - lastUpdate > 70) {
        lastUpdate = now;
        const progress = Math.min(
          1,
          event.charIndex / (utter.text.length || 1)
        );
        onProgress?.((prev) => prev * 0.65 + progress * 0.35);
      }
    };

    utter.onend = () => {
      onProgress?.(1);
      onStopSpeaking?.();
      index++;
      // small pause between sentences
      setTimeout(speakNext, 280);
    };

    utter.onerror = (e) => {
      console.warn("Speech error:", e);
      onStopSpeaking?.();
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
      synth.cancel();
      onStopSpeaking?.();
    },
  };
}

/* ------------------------------------------------------- */
/* ⏹ Stop Helper                                           */
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
/* 🔓 Unlock Speech on User Interaction                    */
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
