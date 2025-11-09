// ✅ Classroom Voice Engine
// Reads teleprompter text slide-by-slide with multilingual (Hindi / English / Hinglish) support

/* -------------------------------------------------------------------------- */
/* ✅ Wait until browser voices are ready                                     */
/* -------------------------------------------------------------------------- */
export async function waitForVoices(maxWait = 2000) {
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

  return synth.getVoices();
}

/* -------------------------------------------------------------------------- */
/* ✅ Split text into small readable chunks                                   */
/* -------------------------------------------------------------------------- */
export function splitIntoChunks(content) {
  if (!content) return [];
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!।])\s+/) // supports Hindi “।” also
    .map((s) => s.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* ✅ Choose a good voice automatically                                       */
/* -------------------------------------------------------------------------- */
export function pickVoice(teacher = {}) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Try explicit teacher voice preference
  if (teacher.voiceName) {
    const v = voices.find((x) => x.name === teacher.voiceName);
    if (v) return v;
  }

  // Detect Hindi or Hinglish
  const sample = `${teacher.name || ""} ${teacher.role || ""}`;
  const looksHindi =
    /[अ-हक़-ॡफ़-य़]/.test(sample) ||
    /हिन्दी|Hindi|Hinglish/i.test(sample);

  if (looksHindi) {
    // Prefer Hindi or Indian English voices
    return (
      voices.find((v) => /hi-IN/i.test(v.lang)) ||
      voices.find((v) => /en-IN/i.test(v.lang)) ||
      voices.find((v) => /India/i.test(v.name)) ||
      voices[0]
    );
  }

  // Otherwise prefer English
  return (
    voices.find((v) => /en-IN/i.test(v.lang)) ||
    voices.find((v) => /en-US/i.test(v.lang)) ||
    voices.find((v) => /en-GB/i.test(v.lang)) ||
    voices[0]
  );
}

/* -------------------------------------------------------------------------- */
/* ✅ Speak slide text sentence-by-sentence                                   */
/* -------------------------------------------------------------------------- */
export async function playClassroomSpeech({
  slide,
  isMuted,
  speechRef,
  setCurrentSentence,
  onComplete,
}) {
  const synth = window.speechSynthesis;
  if (!synth) {
    console.warn("⚠️ speechSynthesis not supported");
    setCurrentSentence(slide.content || "");
    onComplete?.();
    return;
  }

  // Cancel anything currently playing
  synth.cancel();
  if (speechRef.current?.cancel) speechRef.current.cancel();

  await waitForVoices();

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
    },
  };

  const speakNext = async () => {
    if (cancelled) return;
    if (idx >= chunks.length) {
      speechRef.current.isPlaying = false;
      onComplete?.();
      return;
    }

    const sentence = chunks[idx++];
    setCurrentSentence(sentence);

    if (isMuted) {
      // skip actual speech, simulate delay for sync
      setTimeout(speakNext, 400);
      return;
    }

    try {
      const utter = new SpeechSynthesisUtterance(sentence);
      const voice = pickVoice(slide.teacher || {});
      if (voice) utter.voice = voice;

      // Smooth natural speech speed based on length
      const len = sentence.length;
      utter.rate = len > 180 ? 0.9 : len > 100 ? 1.0 : 1.1;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      utter.lang = voice?.lang || "en-IN";

      utter.onend = () => {
        if (!cancelled) speakNext();
      };
      utter.onerror = (err) => {
        console.error("Speech error:", err);
        if (!cancelled) speakNext();
      };

      synth.speak(utter);
    } catch (err) {
      console.error("Utterance error:", err);
      if (!cancelled) speakNext();
    }
  };

  speakNext();
}

/* -------------------------------------------------------------------------- */
/* ✅ Stop playback cleanly                                                  */
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
