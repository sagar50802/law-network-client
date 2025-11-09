// ✅ Classroom Voice Engine
// Handles reading teleprompter text slide-by-slide using the browser's SpeechSynthesis API.

export async function waitForVoices(maxWait = 1000) {
  // Waits for speech voices to become available (important for Chrome)
  const synth = window.speechSynthesis;
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
/* ✅ Split content into readable chunks                                      */
/* -------------------------------------------------------------------------- */
export function splitIntoChunks(content) {
  if (!content) return [];
  return content
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* ✅ Voice Picker (auto-detects language / teacher preference)               */
/* -------------------------------------------------------------------------- */
export function pickVoice(teacher) {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // 1️⃣ Try explicit name match
  if (teacher.voiceName) {
    const found = voices.find((v) => v.name === teacher.voiceName);
    if (found) return found;
  }

  // 2️⃣ Simple language heuristic
  const text = `${teacher.role || ""} ${teacher.name || ""}`;
  const looksHindi = /[क़खगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह]/.test(text);

  let candidates = looksHindi
    ? voices.filter((v) => v.lang.startsWith("hi") || v.lang.startsWith("en-IN"))
    : voices.filter((v) => v.lang.startsWith("en"));

  return candidates[0] || voices[0];
}

/* -------------------------------------------------------------------------- */
/* ✅ Main Speech Engine                                                      */
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
    console.warn("⚠️ speechSynthesis not supported by this browser.");
    setCurrentSentence(slide.content || "");
    onComplete && onComplete();
    return;
  }

  // Cancel any running utterances
  synth.cancel();
  if (speechRef.current?.cancel) speechRef.current.cancel();

  // Wait for voices to be available
  await waitForVoices();

  const chunks = splitIntoChunks(slide.content);
  if (!chunks.length) {
    setCurrentSentence(slide.content || "");
    onComplete && onComplete();
    return;
  }

  let index = 0;
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
    if (index >= chunks.length) {
      speechRef.current.isPlaying = false;
      onComplete && onComplete();
      return;
    }

    const sentence = chunks[index++];
    setCurrentSentence(sentence);

    if (isMuted) {
      // If muted, skip speaking but simulate small delay between sentences
      setTimeout(speakNext, 200);
      return;
    }

    try {
      const utter = new SpeechSynthesisUtterance(sentence);
      const voice = pickVoice(slide.teacher || {});
      if (voice) utter.voice = voice;

      // Smooth rate control
      utter.rate =
        sentence.length > 200
          ? 1.0
          : sentence.length > 100
          ? 1.1
          : 1.2;

      utter.pitch = 1.0;
      utter.volume = 1.0;

      utter.onend = () => {
        if (!cancelled) speakNext();
      };

      utter.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        if (!cancelled) speakNext();
      };

      synth.speak(utter);
    } catch (err) {
      console.error("Error creating utterance:", err);
      if (!cancelled) speakNext();
    }
  };

  // Kick off sequence
  speakNext();
}

/* -------------------------------------------------------------------------- */
/* ✅ Stop Function                                                          */
/* -------------------------------------------------------------------------- */
export function stopClassroomSpeech(speechRef) {
  const synth = window.speechSynthesis;
  try {
    if (synth) synth.cancel();
    if (speechRef.current?.cancel) speechRef.current.cancel();
  } catch (err) {
    console.error("Error stopping speech:", err);
  } finally {
    if (speechRef.current) {
      speechRef.current.isPlaying = false;
    }
  }
}
