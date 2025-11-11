// src/voice/ClassroomVoiceEngine.js

let voiceCache = [];
let activeSessionId = 0;

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
  if (/[ऀ-ॿ]/.test(text)) return "hi-IN";
  if (/[a-zA-Z]/.test(text) && /[ंँेो]/.test(text)) return "hi-IN";
  return "en-IN";
}

/* ------------------------------------------------------- */
/* 🗣 Voice Picker                                          */
/* ------------------------------------------------------- */
function pickVoice(lang, teacher = {}) {
  if (!voiceCache.length)
    voiceCache = window.speechSynthesis?.getVoices() || [];

  if (teacher.voiceName) {
    const named = voiceCache.find((v) => v.name === teacher.voiceName);
    if (named) return named;
  }

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

  return (
    voiceCache.find((v) => v.lang === "en-GB") ||
    voiceCache.find((v) => v.lang === "en-US") ||
    voiceCache[0]
  );
}

/* ------------------------------------------------------- */
/* 🗣 Main Speech Player – session-safe + teleprompter sync */
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
  onTeleprompterScroll, // 👈 new optional callback
}) {
  const synth = window.speechSynthesis;
  if (!slide || isMuted || !synth) return;

  // Stop previous speech cleanly
  stopClassroomSpeech(speechRef);

  const mySessionId = ++activeSessionId;
  await waitForVoices(1500);

  // 🖼️ Ensure media is visible instantly
  if (typeof slide.preloadMedia === "function") {
    try {
      slide.preloadMedia(); // React side handles video/audio/image preload
    } catch {}
  }

  const content = (slide.content || "").trim();
  if (!content) return;

  // ✂ Split by punctuation and preserve full text for teleprompter
  const sentences = content
    .split(/(?<=[।!?\.])\s+/)
    .filter((s) => s.trim().length > 0);

  let index = 0;
  let cancelled = false;

  const speakNext = () => {
    if (cancelled || mySessionId !== activeSessionId) return;

    if (index >= sentences.length) {
      onProgress?.(1);
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
    onTeleprompterScroll?.(sentence, index, sentences); // 👈 scroll entire teleprompter

    const lang = detectLang(sentence);
    const utter = new SpeechSynthesisUtterance(sentence);
    utter.voice = pickVoice(lang, slide.teacher);
    utter.lang = lang;

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
      if (cancelled || mySessionId !== activeSessionId) return;
      onStartSpeaking?.();
      onProgress?.(0);
    };

    utter.onboundary = (event) => {
      if (cancelled || mySessionId !== activeSessionId) return;
      if (event.charIndex == null) return;

      const now = performance.now();
      if (now - lastUpdate > 100) {
        lastUpdate = now;
        const progress = Math.min(1, event.charIndex / utter.text.length);
        onProgress?.((prev) => prev * 0.7 + progress * 0.3);
      }

      // 🔁 Smooth teleprompter scroll during speech
      onTeleprompterScroll?.(sentence, index, sentences, event.charIndex);
    };

    utter.onend = () => {
      if (cancelled || mySessionId !== activeSessionId) return;
      index++;
      setTimeout(speakNext, 250);
    };

    utter.onerror = (e) => {
      if (e.error !== "interrupted") console.warn("Speech error:", e.error);
      if (cancelled || mySessionId !== activeSessionId) return;
      index++;
      setTimeout(speakNext, 200);
    };

    synth.speak(utter);
  };

  speechRef.current = {
    isPlaying: true,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      if (activeSessionId === mySessionId) activeSessionId++;
      try {
        synth.cancel();
      } catch (e) {
        console.warn("speech cancel failed:", e);
      }
      onStopSpeaking?.();
    },
  };

  speakNext();
}

/* ------------------------------------------------------- */
/* ⏹ Stop Helper                                           */
/* ------------------------------------------------------- */
export function stopClassroomSpeech(speechRef) {
  if (speechRef?.current && typeof speechRef.current.cancel === "function") {
    try {
      speechRef.current.cancel();
    } catch (e) {
      console.warn("speechRef cancel failed:", e);
    }
  } else {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("speech cancel failed:", e);
    }
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
