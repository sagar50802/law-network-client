// src/voice/ClassroomVoiceEngine.js
let voiceCache = [];

/* ------------------------------------------------------- */
/* ⏳ Load available voices safely                         */
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
/* 🧩 Detect language                                      */
/* ------------------------------------------------------- */
function detectLang(text = "") {
  if (/[ऀ-ॿ]/.test(text)) return "hi-IN"; // Hindi
  if (/[a-zA-Z]/.test(text) && /[ंँेो]/.test(text)) return "hi-IN"; // Hinglish
  return "en-IN"; // default to Indian English, not US
}

/* ------------------------------------------------------- */
/* 🧠 Smart voice picker: prefer natural Indian voices      */
/* ------------------------------------------------------- */
function pickVoice(lang, teacher = {}) {
  if (!voiceCache.length)
    voiceCache = window.speechSynthesis?.getVoices() || [];

  // teacher-specific name override
  if (teacher.voiceName) {
    const named = voiceCache.find((v) => v.name === teacher.voiceName);
    if (named) return named;
  }

  const priorities = [
    "en-IN",
    "hi-IN",
    "en-GB",
    "en-US",
    "en-AU",
    "Google UK English Male",
    "Google UK English Female",
    "Microsoft Ravi - English (India)",
    "Microsoft Heera - English (India)",
    "Microsoft Neerja - Hindi (India)",
  ];

  // exact match first
  const exact = voiceCache.find((v) => v.lang === lang);
  if (exact) return exact;

  // try priorities list
  for (const key of priorities) {
    const match = voiceCache.find(
      (v) =>
        v.lang === key ||
        v.lang.startsWith(key.split("-")[0]) ||
        v.name.includes(key)
    );
    if (match) return match;
  }

  // fallback to same language family
  const fallback = voiceCache.find((v) =>
    v.lang.startsWith(lang.split("-")[0])
  );

  return fallback || voiceCache[0];
}

/* ------------------------------------------------------- */
/* 🗣 Main Speech Player                                   */
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

    const sentence = sentences[index];
    setCurrentSentence(sentence);

    const lang = detectLang(sentence);
    const utter = new SpeechSynthesisUtterance(sentence);
    utter.voice = pickVoice(lang, slide.teacher);
    utter.lang = lang;

    // 🧡 Natural Indian tone adjustments
    if (lang.startsWith("en")) {
      utter.rate = 0.93; // slightly slower
      utter.pitch = 1.02; // softer and youthful
    } else {
      utter.rate = 0.95;
      utter.pitch = 1.0;
    }
    utter.volume = 1;

    let lastUpdate = 0;

    utter.onstart = () => {
      onStartSpeaking?.();
      onProgress?.(0);
    };

    utter.onboundary = (event) => {
      if (event.name || event.charIndex == null) return;
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
      console.error("Speech error:", e);
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
/* 🔓 Unlock Speech on User Interaction (Chrome policy)     */
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
