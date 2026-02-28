// ─── Web Speech API Wrapper ─────────────────────────────────────────────────
// Thin wrapper over the browser's built-in SpeechSynthesis API.
// Used by NarratorPanel to read the narration aloud.

export class NarratorSpeaker {
  private utterance: SpeechSynthesisUtterance | null = null;

  static isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  speak(
    text: string,
    onWord: (charIndex: number) => void,
    onEnd: () => void
  ): void {
    this.stop();
    this.utterance = new SpeechSynthesisUtterance(text);
    this.utterance.rate = 0.92; // Slightly slower — clearer for technical content
    this.utterance.pitch = 1.0;
    this.utterance.volume = 1.0;

    // Pick a good English voice — prefer neural/Google voices if available
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Neural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha"))
      ) ?? voices.find((v) => v.lang.startsWith("en"));
    if (preferred) this.utterance.voice = preferred;

    this.utterance.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === "word") onWord(e.charIndex);
    };
    this.utterance.onend = onEnd;
    this.utterance.onerror = onEnd;

    window.speechSynthesis.speak(this.utterance);
  }

  pause(): void {
    window.speechSynthesis.pause();
  }

  resume(): void {
    window.speechSynthesis.resume();
  }

  stop(): void {
    window.speechSynthesis.cancel();
    this.utterance = null;
  }

  isPaused(): boolean {
    return window.speechSynthesis.paused;
  }

  isSpeaking(): boolean {
    return window.speechSynthesis.speaking;
  }
}
