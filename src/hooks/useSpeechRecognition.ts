import { useCallback, useEffect, useRef, useState } from "react";

/** Wrapper around the browser SpeechRecognition API (Chrome/Edge/Safari). */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(onFinal?: (text: string) => void) {
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(Boolean(getCtor()));
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Speech recognition is not available in this browser. Use the typed input instead.");
      return;
    }
    try {
      // Explicit mic permission prompt so denial is reported clearly.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError("Microphone permission denied. Allow microphone access or use typed input.");
      return;
    }

    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          onFinalRef.current?.(String(res[0].transcript).trim());
        } else {
          partial += res[0].transcript;
        }
      }
      setInterim(partial);
    };
    rec.onerror = (event: any) => {
      if (event.error === "not-allowed") setError("Microphone permission denied.");
      else if (event.error !== "no-speech") setError(`Speech recognition error: ${event.error}`);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.start();
    setListening(true);
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, interim, error, start, stop };
}
