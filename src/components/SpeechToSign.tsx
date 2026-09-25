import { Mic, MicOff, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { mapTextToSigns, SIGN_BY_ID, type SignId } from "@/lib/signs";
import { hasClip } from "@/lib/avatarAnimations";

const SignAvatar = lazy(() => import("@/components/SignAvatar"));

export function SpeechToSign({ onTranscript }: { onTranscript?: (text: string, signs: SignId[]) => void }) {
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [queue, setQueue] = useState<SignId[]>([]);
  const [index, setIndex] = useState(0);
  const [playToken, setPlayToken] = useState(0);
  const playingRef = useRef(false);

  const tokens = useMemo(() => mapTextToSigns(text), [text]);
  const unsupported = tokens.filter((t) => !t.sign || !hasClip(t.sign)).map((t) => t.word);

  const handleText = useCallback(
    (value: string) => {
      setText(value);
      const signs = mapTextToSigns(value)
        .map((t) => t.sign)
        .filter((s): s is SignId => Boolean(s && hasClip(s)));
      setQueue(signs);
      setIndex(0);
      setPlayToken((n) => n + 1);
      playingRef.current = signs.length > 0;
      onTranscript?.(value, signs);
    },
    [onTranscript],
  );

  const { supported, listening, interim, error, start, stop } = useSpeechRecognition((final) => handleText(final));

  useEffect(() => {
    if (queue.length === 0) playingRef.current = false;
  }, [queue]);

  const onClipFinished = () => {
    if (index < queue.length - 1) {
      setIndex((i) => i + 1);
      setPlayToken((n) => n + 1);
    } else {
      playingRef.current = false;
    }
  };

  const current = queue[index] ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface overflow-hidden">
        <div className="h-[360px] w-full">
          <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Loading avatar…</div>}>
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Loading avatar…</div>}>
              <SignAvatar sign={playingRef.current ? current : null} playToken={playToken} onFinished={onClipFinished} />
            </Suspense>
          </ClientOnly>
        </div>
        <div className="border-t border-border p-4 text-sm">
          {current && playingRef.current ? (
            <p>
              Signing <strong>{SIGN_BY_ID[current].label}</strong> ({index + 1} of {queue.length})
            </p>
          ) : (
            <p className="text-muted-foreground">Avatar idle. Speak or type a sentence to play signs.</p>
          )}
        </div>
      </div>

      <div className="surface grid gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Speech → Sign</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {supported
              ? "Browser speech recognition converts your voice to text, then plays the matching avatar clips."
              : "Speech recognition isn't available in this browser — use the typed input below."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {listening ? (
            <Button size="lg" variant="destructive" className="h-14 flex-1" onClick={stop}>
              <MicOff className="h-5 w-5" /> Stop listening
            </Button>
          ) : (
            <Button size="lg" className="h-14 flex-1" onClick={start} disabled={!supported}>
              <Mic className="h-5 w-5" /> Start microphone
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {listening && <p className="text-sm text-muted-foreground">Listening… {interim}</p>}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) handleText(typed.trim());
            setTyped("");
          }}
        >
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type: where is the hospital" />
          <Button type="submit" aria-label="Play typed text as signs">
            <Play className="h-4 w-4" />
          </Button>
        </form>

        {text && (
          <div className="rounded-xl border border-border bg-secondary/60 p-4 text-sm">
            <p className="text-muted-foreground">Recognised text</p>
            <p className="mt-1 font-medium">{text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tokens.map((t, i) => (
                <span
                  key={`${t.word}-${i}`}
                  className={
                    t.sign && hasClip(t.sign)
                      ? "rounded-full bg-primary/15 px-3 py-1 text-primary"
                      : "rounded-full bg-muted px-3 py-1 text-muted-foreground line-through"
                  }
                >
                  {t.word}
                </span>
              ))}
            </div>
            {unsupported.length > 0 && (
              <p className="mt-3 text-xs text-warning">
                No animation exists for: {unsupported.join(", ")}. These words are skipped instead of being faked.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SpeechToSign;
