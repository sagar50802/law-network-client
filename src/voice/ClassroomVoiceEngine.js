// src/voice/ClassroomVoiceEngine.js
let voiceCache = [];
let SPEECH_LOCK = false; // prevents overlapping playbacks

/* ------------------------------------------------------- */
/* ⏳ Load voices (waits until ready on all browsers)       */
/* ------------------------------------------------------- */
export function waitForVoices(timeout = 3000) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve([]);

    const existing = synth.getVoices();
    if (existing.length) {
      voiceCache = existing;
      return resolve(existing);
    }

    let attempts = 0;
    const id = setInterval(() => {
      const v = synth.getVoices();
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
/* 🧠 Language detection                                    */
/* ------------------------------------------------------- */
function detectLang(text = "") {
  if (/[ऀ-ॿ]/.test(text)) return "hi-IN"; // Hindi
  if (/[a-zA-Z]/.test(text) && /[ंँेो]/.test(text)) return "hi-IN"; // Hinglish
  return "en-IN"; // Indian English default
}

/* ------------------------------------------------------- */
/* 🗣 Voice Picker (cross-browser)                          */
/* ------------------------------------------------------- */
function pickVoice(lang, teacher = {}) {
  if (!voiceCache.length)
    voiceCache = window.speechSynthesis?.getVoices() || [];

  // 1️⃣ Teacher override
  if (teacher.voiceName) {
    const named = voiceCache.find((v) => v.name === teacher.voiceName);
    if (named) return named;
  }

  // 2️⃣ Prioritized Indian voices
  const priorities = [
    "hi-IN",
    "en-IN",
    "Google हिंदी",
    "Google हिन्दी",
    "Microsoft Neerja - Hindi (India)",
    "Microsoft Ravi - English (India)",
    "Microsoft Heera - English (India)",
    "Sangeeta",
  ];

  for (const key of priorities) {
    const found = voiceCache.find(
      (v) =>
        v.lang === key ||
        v.name?.includes(key) ||
        v.lang?.startsWith(key.split("-")[0])
    );
    if (found) return found;
  }

  // 3️⃣ Fallback: English voices
  return (
    voiceCache.find((v) => v.lang === "en-GB") ||
    voiceCache.find((v) => v.lang === "en-US") ||
    voiceCache[0]
  );
}

/* ------------------------------------------------------- */
/* 🗣 Main Speech Player                                   */
/* ------------------------------------------------------- */
export async function playClassroomSpeech({
  slide,
  isMuted = false,
  speechRef,
  setCurrentSentence,
  onProgress,
  onStartSpeaking,
  onStopSpeaking,
  onComplete,
}) {
  if (!slide || isMuted || SPEECH_LOCK) return;
  const synth = window.speechSynthesis;
  if (!synth) return console.error("Speech synthesis not supported");

  SPEECH_LOCK = true; // prevent reentry
  stopClassroomSpeech(speechRef);
  await waitForVoices(1500);

  const content = (slide.content || "").trim();
  if (!content) {
    SPEECH_LOCK = false;
    return;
  }

  const sentences = content
    .split(/(?<=[।!?\.])\s+/)
    .filter((s) => s.trim().length > 0);

  let index = 0;
  let cancelled = false;

  const speakNext = () => {
    if (cancelled || index >= sentences.length) {
      SPEECH_LOCK = false;
      onStopSpeaking?.();
      onComplete?.();
      return;
    }

    const sentence = sentences[index].trim();
    if (!sentence) {
      index++;
      speakNext();
      return;
    }

    setCurrentSentence(sentence);

    const lang = detectLang(sentence);
    const utter = new SpeechSynthesisUtterance(sentence);
    utter.voice = pickVoice(lang, slide.teacher);
    utter.lang = lang;

    // 🎚️ Voice tone & rate tuning
    const ua = navigator.userAgent.toLowerCase();
    if (lang.startsWith("en")) {
      utter.rate = /firefox/.test(ua) ? 0.9 : /edg/.test(ua) ? 0.94 : 0.92;
      utter.pitch = 1.05;
    } else {
      utter.rate = /firefox/.test(ua) ? 0.95 : 0.97;
      utter.pitch = 1.0;
    }
    utter.volume = 1;

    let lastUpdate = 0;

    utter.onstart = () => {
      onStartSpeaking?.();
      onProgress?.(0);
    };

    utter.onboundary = (event) => {
      if (!event.charIndex) return;
      const now = performance.now();
      if (now - lastUpdate > 100) {
        lastUpdate = now;
        const progress = Math.min(1, event.charIndex / utter.text.length);
        onProgress?.((prev) => prev * 0.7 + progress * 0.3);
      }
    };

    utter.onend = () => {
      onProgress?.(1);
      onStopSpeaking?.();
      index++;
      setTimeout(speakNext, 350); // small gap for clarity
    };

    utter.onerror = (e) => {
      console.warn("Speech error:", e.error);
      index++;
      setTimeout(speakNext, 200);
    };

    // Guard: wait until no speech is pending
    const waitAndSpeak = () => {
      if (synth.speaking || synth.pending) {
        setTimeout(waitAndSpeak, 150);
      } else {
        synth.speak(utter);
      }
    };
    waitAndSpeak();
  };

  speakNext();

  speechRef.current = {
    isPlaying: true,
    cancel: () => {
      cancelled = true;
      synth.cancel();
      SPEECH_LOCK = false;
      onStopSpeaking?.();
    },
  };
}

/* ------------------------------------------------------- */
/* ⏹ Stop Helper                                           */
/* ------------------------------------------------------- */
export function stopClassroomSpeech(speechRef) {
  try {
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();
  } catch (e) {
    console.warn("speech cancel failed:", e);
  }
  if (speechRef?.current) {
    speechRef.current.isPlaying = false;
    speechRef.current.cancel = () => {};
  }
  SPEECH_LOCK = false;
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
