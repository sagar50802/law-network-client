/**
 * 🎙 VoiceEngine.js — LawNetwork Live (Hinglish + Admin Voice Edition 🇮🇳)
 * -----------------------------------------------------------------------
 * ✅ 100% Offline, Browser-based
 * ✅ Perfect Teleprompter Sync (Sentence ↔ Voice)
 * ✅ Accurate Gender Detection via Avatar Name
 * ✅ Smart Hindi–English–Hinglish Detection
 * ✅ Indian Voices (Male/Female) for Each Mode
 * ✅ Admin Voice Preference Support + Graceful Fallback
 */

const FEMALE_NAMES = [
  "rekha", "richa", "swati", "sapna", "aditi", "sonakshi",
  "priya", "neha", "anita", "kavita", "sweta", "pooja", "kajal",
  "meenakshi", "divya", "shreya", "anjali", "pallavi", "seema"
];
const MALE_NAMES = [
  "sagar", "sameer", "ravi", "arjun", "rahul", "amit", "deepak",
  "pankaj", "manish", "akash", "raj", "rohit", "ankit", "vivek", "suresh"
];

/* 🧠 Detect gender by name */
function detectGender(name = "") {
  const n = name.toLowerCase();
  if (FEMALE_NAMES.some(f => n.includes(f))) return "female";
  if (MALE_NAMES.some(m => n.includes(m))) return "male";
  return "neutral";
}

/* 🇮🇳 Detect Hindi characters */
function hasHindi(text = "") {
  return /[\u0900-\u097F]/.test(text);
}

/* 🧮 Ratio of Hindi characters */
function getHindiRatio(text = "") {
  if (!text) return 0;
  const total = text.length;
  const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
  return hindiChars / total;
}

/**
 * 🧠 Determine language mode:
 * - "hindi"   → mostly Hindi
 * - "hinglish"→ mixed Hindi + English
 * - "english" → little/no Hindi
 */
function getLanguageMode(text = "") {
  const ratio = getHindiRatio(text);
  if (ratio > 0.75) return "hindi";
  if (ratio > 0.15) return "hinglish";
  return "english";
}

/* 🧠 Cache voices for avatars */
const avatarVoiceCache = {};

// ✅ Ensure voices are loaded on all browsers (esp. Chrome)
if (typeof window !== "undefined" && window.speechSynthesis) {
  if (!window.speechSynthesis.getVoices().length) {
    window.speechSynthesis.onvoiceschanged = () => {
      console.log(
        "🔊 Voices loaded:",
        window.speechSynthesis.getVoices().length
      );
    };
  }
}

/**
 * 🎤 Pick suitable voice for given avatar + mode
 * ✅ Respects admin-selected `voiceName` first with fallback by gender.
 */
function pickVoiceForAvatar(
  name,
  gender,
  voices,
  languageMode = "english",
  avatar = null
) {
  // ✅ Admin preselected voice preference
  if (avatar?.voiceName) {
    const adminVoice = voices.find(v => v.name === avatar.voiceName);

    // ✅ Graceful fallback if admin voice not found
    if (!adminVoice) {
      console.warn(`⚠️ Voice ${avatar.voiceName} not found — applying fallback`);
      const detectedGender = detectGender(avatar?.name || "");
      const fallback = voices.find(v =>
        detectedGender === "female"
          ? /(female|woman|aisha|aditi|priya|heera)/i.test(v.name)
          : /(male|man|ravi|amit|kumar|raj)/i.test(v.name)
      );
      return fallback || voices[0];
    }

    return adminVoice;
  }

  // 🔽 Fallback: auto-select based on gender + language as before
  const key = `${(name || "default").toLowerCase()}_${languageMode}`;
  if (avatarVoiceCache[key]) return avatarVoiceCache[key];

  const indianVoices = voices.filter(v =>
    /(india|en-IN|hi-IN|Hindi|हिंदी)/i.test(v.lang + v.name)
  );
  const hindiVoices = indianVoices.filter(v =>
    /hi-IN|Hindi|हिंदी/i.test(v.lang + v.name)
  );
  const indianEnglishVoices = indianVoices.filter(v =>
    /en-IN/i.test(v.lang)
  );

  const maleInEn =
    indianEnglishVoices.find(v =>
      /Ravi|Kumar|Deep|Amit|Raj|Man|Male/i.test(v.name)
    ) || indianEnglishVoices[0];
  const femaleInEn =
    indianEnglishVoices.find(v =>
      /Aditi|Heera|Priya|Trisha|Female|Rekha/i.test(v.name)
    ) || indianEnglishVoices[0];

  const maleInHi =
    hindiVoices.find(v =>
      /Amit|Ravi|Kumar|Man|Male/i.test(v.name)
    ) || hindiVoices[0];
  const femaleInHi =
    hindiVoices.find(v =>
      /Aditi|Heera|Priya|Trisha|Rekha|Female/i.test(v.name)
    ) || hindiVoices[0];

  const genericMale =
    voices.find(v => /Male|David|George|Ravi/i.test(v.name)) || voices[0];
  const genericFemale =
    voices.find(v => /Female|Zira|Aditi|Priya/i.test(v.name)) || voices[0];

  let chosen;
  if (languageMode === "hindi") {
    chosen =
      gender === "male"
        ? maleInHi || maleInEn || genericMale
        : gender === "female"
        ? femaleInHi || femaleInEn || genericFemale
        : hindiVoices[0] || indianEnglishVoices[0] || voices[0];
  } else {
    chosen =
      gender === "male"
        ? maleInEn || genericMale
        : gender === "female"
        ? femaleInEn || genericFemale
        : indianEnglishVoices[0] || voices[0];
  }

  avatarVoiceCache[key] = chosen;
  return chosen;
}

/* 🧩 Split content into readable chunks */
function splitIntoChunks(text = "") {
  return text
    .split(/(?:\r?\n)+|।\s+|(?<=[.?!])\s+/)
    .map(t => t.trim())
    .filter(Boolean);
}

/**
 * 🗣 Main Playback Engine (Fully Synced + Completion callback)
 *
 * onComplete = called when ALL chunks for this slide are done.
 */
export function playSpeech(
  slide,
  isMuted,
  speechRef,
  setActiveSpeaker,
  setCurrentSentence,
  onComplete // ✅ NEW
) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;

  // cancel any previous speech, but we’ll also track cancellation ourselves
  synth.cancel();
  if (!slide?.content) return;

  const avatars = slide.debateAvatars?.length
    ? slide.debateAvatars
    : slide.avatars?.length
    ? slide.avatars
    : [];

  const chunks = splitIntoChunks(slide.content);
  if (!chunks.length) {
    onComplete && onComplete();
    return;
  }

  const voices = synth.getVoices();
  if (!voices.length) {
    window.speechSynthesis.onvoiceschanged = () =>
      playSpeech(
        slide,
        isMuted,
        speechRef,
        setActiveSpeaker,
        setCurrentSentence,
        onComplete
      );
    return;
  }

  let i = 0;
  let isSpeaking = false;
  let cancelled = false;

  // ✅ Allow external stopSpeech() to mark this engine as cancelled
  if (speechRef) {
    speechRef.current = {
      cancel: () => {
        cancelled = true;
        synth.cancel();
      },
    };
  }

  const speakNext = () => {
    if (cancelled) return;
    if (isSpeaking) return;

    if (i >= chunks.length) {
      // All done for this slide
      setCurrentSentence("");
      setActiveSpeaker(0);
      if (onComplete && !cancelled) onComplete();
      return;
    }

    const text = chunks[i];
    const speakerIndex = avatars.length ? i % avatars.length : 0;
    const speaker = avatars[speakerIndex];
    const gender = detectGender(speaker?.name || "");
    const languageMode = getLanguageMode(text);

    const voice = pickVoiceForAvatar(
      speaker?.name,
      gender,
      voices,
      languageMode,
      speaker
    );

    // 🔸 Teleprompter gets this sentence immediately
    setActiveSpeaker?.(speakerIndex);
    setCurrentSentence?.(text);

    // 🔇 If muted → no actual speech, but keep timing reasonable
    if (isMuted) {
      i++;
      if (cancelled) return;
      setTimeout(speakNext, 2500);
      return;
    }

    const utter = new SpeechSynthesisUtterance(text);
    utter.voice = voice;
    utter.lang = languageMode === "hindi" ? "hi-IN" : "en-IN";

    // 💬 Adjust tone & pacing
    utter.pitch = gender === "female" ? 1.05 : gender === "male" ? 0.95 : 1.0;
    utter.rate =
      languageMode === "hindi"
        ? 0.96
        : languageMode === "hinglish"
        ? 0.98
        : 1.02;
    utter.volume = 1.0;

    isSpeaking = true;

    utter.onstart = () => {
      if (cancelled) return;
      setActiveSpeaker?.(speakerIndex);
      setCurrentSentence?.(text);
    };

    utter.onend = () => {
      if (cancelled) return;
      isSpeaking = false;
      i++;
      setTimeout(speakNext, 300);
    };

    utter.onerror = (err) => {
      console.warn("Speech error:", err);
      if (cancelled) return;
      isSpeaking = false;
      i++;
      setTimeout(speakNext, 500);
    };

    synth.speak(utter);
  };

  speakNext();
}

/**
 * 🛑 Stop any current speech
 */
export function stopSpeech(speechRef) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;

  if (speechRef?.current?.cancel) {
    // our custom cancel (sets cancelled = true)
    speechRef.current.cancel();
  } else {
    synth.cancel();
  }

  if (speechRef?.current?.silentTimer) {
    clearInterval(speechRef.current.silentTimer);
  }
  speechRef.current = null;
}
