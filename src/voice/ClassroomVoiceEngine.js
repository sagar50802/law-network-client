// ✅ Classroom Voice Engine (Final Synced Version)
// Syncs teleprompter and avatar with real speech timing.

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

/* Split readable sentences */
export function splitIntoChunks(content) {
  if (!content) return [];
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* Auto voice picker: Hindi + English + Hinglish */
export function pickVoice(teacher = {}) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  if (teacher.voiceName) {
    const v = voices.find((x) => x.name === teacher.voiceName);
    if (v) return v;
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
    voices[0]
  );
}

/* -------------------------------------------------------------------------- */
/* ✅ Speech Engine — precise sync between voice & teleprompter               */
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
    console.warn("Speech not supported");
    setCurrentSentence(slide.content || "");
    onComplete?.();
    return;
  }

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

  speechRef.current = {
    isPlaying: true,
    cancel: () => {
      cancelled = true;
      synth.cancel();
      onStopSpeaking?.();
    },
  };

  const speakNext = async () => {
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

    if (isMuted) {
      setTimeout(() => {
        onProgress?.(1);
        speakNext();
      }, 800);
      return;
    }

    const utter = new SpeechSynthesisUtterance(sentence);
    const voice = pickVoice(slide.teacher || {});
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang || "en-IN";

    // slower rate for long sentences
    const len = sentence.length;
    utter.rate = len > 180 ? 0.9 : len > 100 ? 1.0 : 1.1;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    let totalLen = sentence.length;
    let spokenChars = 0;

    utter.onstart = () => {
      onStartSpeaking?.();
    };

    utter.onboundary = (e) => {
      if (e.name === "word" || e.charIndex !== undefined) {
        spokenChars = e.charIndex;
        const progress = Math.min(1, spokenChars / totalLen);
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
  };

  speakNext();
}

/* Stop speech gracefully */
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
