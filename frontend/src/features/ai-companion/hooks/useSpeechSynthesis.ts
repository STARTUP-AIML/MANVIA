/**
 * MANVIA Speech Synthesis Hook with Viseme Timing
 * Healthcare-grade text-to-speech with:
 * - Browser-native SpeechSynthesis with zero external data transmission
 * - Markdown symbol stripping for clean, conversational voice output
 * - Real-time word boundary and viseme tracking (mouth openness, roundness, smile)
 * - Single-speaker enforcement (cancels overlapping speech immediately)
 * - User-controlled interruption, pause, and stop controls
 * - Global voice enable/disable toggle with localStorage persistence
 * - Automatic resource cancellation on component unmount and navigation
 * - Resilient error handling and unsupported environment fallbacks
 */

import { useState, useEffect, useCallback, useRef } from "react";

const VOICE_PREF_KEY = "manvia_companion_voice_enabled";

export type VisemeType = "sil" | "aa" | "oh" | "ee" | "oo" | "cons";

export interface SpeechVisemeState {
  viseme: VisemeType;
  openness: number; // 0.0 (closed) to 1.0 (wide open)
  roundness: number; // 0.0 to 1.0
  smile: number; // 0.0 to 1.0
  currentWord?: string;
}

export const DEFAULT_VISEME_RESTING: SpeechVisemeState = {
  viseme: "sil",
  openness: 0,
  roundness: 0,
  smile: 0.25, // Natural relaxed warm healthcare professional smile
};

/**
 * Strips markdown formatting from AI text responses to ensure clean, natural spoken audio.
 */
export function stripMarkdownForSpeech(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  // Remove inline code
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  // Remove images
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]*\)/g, "");
  // Replace links with link text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // Remove blockquotes marker
  cleaned = cleaned.replace(/^>\s+/gm, "");
  // Remove headings markers (#, ##, etc.)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  // Remove table lines and formatting
  cleaned = cleaned.replace(/\|[-:| ]+\|/g, "");
  cleaned = cleaned.replace(/\|/g, ", ");
  // Remove bold and italics
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, "$2");
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, "$2");
  // Remove bullet points / dashes
  cleaned = cleaned.replace(/^[-*+]\s+/gm, "");
  // Remove excess whitespace and newlines
  cleaned = cleaned.replace(/\n{2,}/g, ". ");
  cleaned = cleaned.replace(/\n/g, " ");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  return cleaned;
}

export interface UseSpeechSynthesisReturn {
  isSupported: boolean;
  isPlaying: boolean;
  currentMessageId: string | null;
  voiceEnabled: boolean;
  speak: (text: string, messageId: string) => void;
  stop: () => void;
  toggleVoiceEnabled: () => void;
  error: string | null;
  visemeState: SpeechVisemeState;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visemeState, setVisemeState] = useState<SpeechVisemeState>(DEFAULT_VISEME_RESTING);

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(VOICE_PREF_KEY);
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop active speech and reset state
  const stop = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignored in headless environments
    }
    activeUtteranceRef.current = null;
    setIsPlaying(false);
    setCurrentMessageId(null);
    setVisemeState(DEFAULT_VISEME_RESTING);
  }, [isSupported]);

  // Toggle voice output preference
  const toggleVoiceEnabled = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(VOICE_PREF_KEY, String(next));
      } catch {
        // Storage unavailable
      }
      if (!next) {
        stop();
      }
      return next;
    });
  }, [stop]);

  // Speak assistant response
  const speak = useCallback(
    (rawText: string, messageId: string) => {
      setError(null);

      if (!isSupported) {
        setError("Voice playback is not supported by your browser.");
        return;
      }

      if (!voiceEnabled) {
        return;
      }

      // If already playing this message, clicking again acts as toggle to stop
      if (isPlaying && currentMessageId === messageId) {
        stop();
        return;
      }

      // Cancel any ongoing speech to prevent overlapping voices
      stop();

      const spokenText = stripMarkdownForSpeech(rawText);
      if (!spokenText) {
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(spokenText);
        activeUtteranceRef.current = utterance;

        // Configure speech cadence for healthcare clarity
        utterance.rate = 0.98; // Slightly calm pace for clear medical advice
        utterance.pitch = 1.05; // Friendly and approachable tone

        // Select suitable voice if available
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferredVoice =
            voices.find(
              (v) =>
                v.lang.startsWith("en") &&
                (v.name.includes("Natural") ||
                  v.name.includes("Google") ||
                  v.name.includes("Samantha") ||
                  v.name.includes("Karen") ||
                  v.name.includes("Jenny")),
            ) ||
            voices.find((v) => v.lang.startsWith("en")) ||
            voices[0];

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
        }

        utterance.onstart = () => {
          setIsPlaying(true);
          setCurrentMessageId(messageId);
          setVisemeState({
            viseme: "aa",
            openness: 0.5,
            roundness: 0.1,
            smile: 0.3,
          });
        };

        // Real-time word boundary viseme timing
        utterance.onboundary = (event) => {
          if (event.name === "word") {
            const charIndex = event.charIndex ?? 0;
            const remaining = spokenText.slice(charIndex);
            const word =
              remaining.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") || "";

            let targetViseme: VisemeType = "aa";
            let openness = 0.55;
            let roundness = 0.05;
            let smile = 0.3;

            if (/[ou]/.test(word)) {
              targetViseme = "oo";
              openness = 0.4;
              roundness = 0.8;
              smile = 0.15;
            } else if (/[o]/.test(word)) {
              targetViseme = "oh";
              openness = 0.65;
              roundness = 0.6;
              smile = 0.2;
            } else if (/[eiy]/.test(word)) {
              targetViseme = "ee";
              openness = 0.38;
              roundness = 0.05;
              smile = 0.65;
            } else if (/[a]/.test(word)) {
              targetViseme = "aa";
              openness = 0.72;
              roundness = 0.1;
              smile = 0.35;
            } else {
              targetViseme = "cons";
              openness = 0.25;
              roundness = 0.1;
              smile = 0.25;
            }

            setVisemeState({
              viseme: targetViseme,
              openness,
              roundness,
              smile,
              currentWord: word,
            });
          }
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setCurrentMessageId(null);
          activeUtteranceRef.current = null;
          setVisemeState(DEFAULT_VISEME_RESTING);
        };

        utterance.onerror = (event) => {
          // 'canceled' or 'interrupted' errors occur on intentional stop/navigation
          if (event.error !== "canceled" && event.error !== "interrupted") {
            setError(`Audio playback issue: ${event.error}`);
          }
          setIsPlaying(false);
          setCurrentMessageId(null);
          activeUtteranceRef.current = null;
          setVisemeState(DEFAULT_VISEME_RESTING);
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        setError("Failed to initiate voice playback.");
        setIsPlaying(false);
        setCurrentMessageId(null);
        setVisemeState(DEFAULT_VISEME_RESTING);
      }
    },
    [isSupported, voiceEnabled, isPlaying, currentMessageId, stop],
  );

  // Guaranteed cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignored
        }
      }
    };
  }, [isSupported]);

  return {
    isSupported,
    isPlaying,
    currentMessageId,
    voiceEnabled,
    speak,
    stop,
    toggleVoiceEnabled,
    error,
    visemeState,
  };
}
