import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook that uses the browser's built-in SpeechSynthesis API
 * to read text aloud. Accumulates streamed chunks and speaks
 * them at sentence boundaries for natural pacing.
 */
export function useSpeechSynthesis() {
  const bufferRef = useRef('');
  const isSpeakingRef = useRef(false);

  // Memoizing the speak function to be completely stable
  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window) || !text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Selection of English voice
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith('en') && v.name.includes('Google')
    ) || voices.find((v) => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { isSpeakingRef.current = true; };
    utterance.onend = () => { isSpeakingRef.current = false; };
    utterance.onerror = () => { isSpeakingRef.current = false; };

    speechSynthesis.speak(utterance);
  }, []);

  /** Feed a streaming text chunk. Speaks at sentence boundaries. */
  const feedChunk = useCallback((chunk) => {
    if (!chunk) return;
    bufferRef.current += chunk;

    // Speak when we hit a sentence-ending punctuation or a newline
    const sentenceEnd = /[.!?\n]\s*$/;
    if (sentenceEnd.test(bufferRef.current)) {
      const toSpeak = bufferRef.current.trim();
      if (toSpeak) speak(toSpeak);
      bufferRef.current = '';
    }
  }, [speak]);

  /** Flush any remaining buffered text and speak it. */
  const flush = useCallback(() => {
    const toSpeak = bufferRef.current.trim();
    if (toSpeak) {
      speak(toSpeak);
    }
    bufferRef.current = '';
  }, [speak]);

  /** Stop all speech immediately. */
  const cancel = useCallback(() => {
    speechSynthesis.cancel();
    bufferRef.current = '';
    isSpeakingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  return { feedChunk, flush, cancel };
}
