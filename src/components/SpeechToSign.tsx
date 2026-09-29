import { Mic, MicOff, Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { SIGN_BY_ID, type SignId } from "@/lib/signs";
import { SIGN_CLIPS, type SignClip } from "@/lib/avatarAnimations";
import { buildFingerspellClip } from "@/lib/fingerspelling";
import { textToGloss, type GlossItem } from "@/lib/aslGloss";

const SignAvatar = lazy(() => import("@/components/SignAvatar"));

const QUICK_PHRASES = ["Hello", "Thank you", "I need help", "Where is the hospital?", "I need water", "Please wait"];

interface QueueItem {
  item: GlossItem;
  clip: SignClip;
  letters?: { ch: string; t: number }[];
}

function toQueue(items: GlossItem[]): QueueItem[] {
  const out: QueueItem[] = [];
  for (const item of items) {
    if (item.kind === "sign") {
      const clip = SIGN_CLIPS[item.sign];
      if (clip) out.push({ item, clip });
      else {
        const fs = buildFingerspellClip(item.word);
        if (fs) out.push({ item: { kind: "spell", word: item.word, gloss: `fs-${item.word.toUpperCase()}` }, ...fs });
      }
    } else {
      const fs = buildFingerspellClip(item.word);
      if (fs) out.push({ item, ...fs });
    }
  }
  return out;
}

export function SpeechToSign({ onTranscript, compact = false }: { onTranscript?: (text: string, signs: SignId[]) => void; compact?: boolean }) {
  const [typed, setTyped] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [playToken, setPlayToken] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [history, setHistory] = useState<{ text: string; gloss: GlossItem[] }[]>([]);
  const [letter, setLetter] = useState<string | null>(null);
  const startedAt = useRef(0);
  const lastText = useRef("");
  const queueRef = useRef<QueueItem[]>([]);
  const indexRef = useRef(0);

  const playing = index < queue.length;
  const current = playing ? queue[index]! : null;

  const handleText = useCallback(
    (value: string, replay = false) => {
      const gloss = textToGloss(value);
      const items = toQueue(gloss);
      if (!replay) {
        lastText.current = value;
        setHistory((h) => [{ text: value, gloss }, ...h].slice(0, 6));
        onTranscript?.(
          value,
          gloss.flatMap((g) => (g.kind === "sign" ? [g.sign] : [])),
        );
      }
      // Real-time: new speech is appended so the avatar keeps signing continuously.
      if (replay || indexRef.current >= queueRef.current.length) {
        queueRef.current = items;
        indexRef.current = 0;
        startedAt.current = performance.now();
        setPlayToken((n) => n + 1);
      } else {
        queueRef.current = [...queueRef.current, ...items];
      }
      setQueue(queueRef.current);
      setIndex(indexRef.current);
    },
    [onTranscript],
  );

  const { supported, listening, interim, error, start, stop } = useSpeechRecognition((final) => handleText(final));

  const onClipFinished = () => {
    setLetter(null);
    indexRef.current += 1;
    setIndex(indexRef.current);
    startedAt.current = performance.now();
    setPlayToken((n) => n + 1);
  };

  // Caption the current fingerspelled letter.
  useEffect(() => {
    const ls = current?.letters;
    if (!ls) return;
    const id = window.setInterval(() => {
      const t = ((performance.now() - startedAt.current) / 1000) * speed;
      let ch: string | null = null;
      for (const l of ls) if (t >= l.t) ch = l.ch;
      setLetter(ch);
    }, 60);
    return () => window.clearInterval(id);
  }, [current, speed]);

  const stopSigning = () => {
    queueRef.current = [];
    indexRef.current = 0;
    setQueue([]);
    setIndex(0);
    setLetter(null);
  };

  const captionWord = current
    ? current.item.kind === "sign"
      ? SIGN_BY_ID[current.item.sign].label.toUpperCase()
      : current.item.word.toUpperCase()
    : null;

  return (
    <div className={compact ? "grid gap-4" : "grid gap-4 lg:grid-cols-2"}>
      <div className="surface overflow-hidden">
        <div className="relative h-[380px] w-full">
          <ClientOnly fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Loading avatar…</div>}>
            <Suspense fallback={<div className="grid h-full place-items-center text-sm text-muted-foreground">Loading avatar…</div>}>
              <SignAvatar
                clip={current?.clip ?? null}
                playToken={playToken}
                speed={speed}
                onFinished={onClipFinished}
              />
            </Suspense>
          </ClientOnly>
          {current && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center gap-1">
              <span className="rounded-full bg-background/80 px-4 py-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {current.item.kind === "sign" ? "ASL sign" : "Fingerspelling"}
              </span>
              <span className="rounded-xl bg-background/85 px-4 py-2 font-display text-2xl font-semibold">
                {current.item.kind === "spell" && current.letters
                  ? current.letters.map((l, i) => (
                      <span key={i} className={l.ch === letter ? "text-primary" : "text-muted-foreground"}>
                        {l.ch}
                      </span>
                    ))
                  : captionWord}
              </span>
            </div>
          )}
        </div>
        <div className="grid gap-3 border-t border-border p-4 text-sm">
          {current ? (
            <p>
              Signing {index + 1} of {queue.length}
            </p>
          ) : (
            <p className="text-muted-foreground">Avatar ready. Speak or type — it signs in ASL order as you talk.</p>
          )}
          <div className="flex items-center gap-3">
            <span className="w-16 text-xs text-muted-foreground">Speed {speed.toFixed(1)}×</span>
            <Slider aria-label="Signing speed" min={0.5} max={1.6} step={0.1} value={[speed]} onValueChange={(v) => setSpeed(v[0] ?? 1)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => lastText.current && handleText(lastText.current, true)} disabled={!lastText.current}>
              <RotateCcw className="h-4 w-4" /> Replay
            </Button>
            <Button size="sm" variant="ghost" onClick={stopSigning} disabled={!current}>
              <Square className="h-4 w-4" /> Stop
            </Button>
          </div>
        </div>
      </div>

      <div className="surface grid content-start gap-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Speech → ASL</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {supported
              ? "Talk continuously — each phrase is converted to ASL word order and signed by the avatar. Words without a sign are fingerspelled."
              : "Speech recognition isn't available in this browser — use the typed input below."}
          </p>
        </div>

        {listening ? (
          <Button size="lg" variant="destructive" className="h-14" onClick={stop}>
            <MicOff className="h-5 w-5" /> Stop listening
          </Button>
        ) : (
          <Button size="lg" className="h-14" onClick={start} disabled={!supported}>
            <Mic className="h-5 w-5" /> Start microphone
          </Button>
        )}
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
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type: where is the hospital, my name is Sam" />
          <Button type="submit" aria-label="Sign typed text">
            <Play className="h-4 w-4" />
          </Button>
        </form>

        <div>
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Quick phrases</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PHRASES.map((phrase) => (
              <Button key={phrase} type="button" size="sm" variant="outline" className="h-auto min-h-9 whitespace-normal text-left" onClick={() => handleText(phrase)}>
                {phrase}
              </Button>
            ))}
          </div>
        </div>

        {history.map((h, i) => (
          <div key={i} className="rounded-xl border border-border bg-secondary/60 p-4 text-sm">
            <p className="text-muted-foreground">“{h.text}”</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">ASL gloss</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {h.gloss.map((g, k) => (
                <span
                  key={k}
                  className={
                    g.kind === "sign"
                      ? "rounded-full bg-primary/15 px-3 py-1 font-medium text-primary"
                      : "rounded-full bg-accent/15 px-3 py-1 text-accent"
                  }
                >
                  {g.gloss}
                </span>
              ))}
            </div>
          </div>
        ))}
        {history.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Teal = full ASL sign (12-sign library). Amber “fs-” = fingerspelled with the ASL manual alphabet. Grammar is
            rule-based (drops articles/“be”, WH-words last) — not a complete ASL translator.
          </p>
        )}
      </div>
    </div>
  );
}

export default SpeechToSign;
