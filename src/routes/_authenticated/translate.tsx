import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eraser, Undo2, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignCapture } from "@/components/SignCapture";
import { SpeechToSign } from "@/components/SpeechToSign";
import { SIGNS, SIGN_BY_ID, signsToSentence, type SignId } from "@/lib/signs";
import { speak, ttsSupported } from "@/lib/speech";
import type { StableRecognition } from "@/lib/handRecognition";

export const Route = createFileRoute("/_authenticated/translate")({
  head: () => ({
    meta: [
      { title: "Translate — SignBridge AI" },
      { name: "description", content: "Translate signs to spoken sentences and speech to avatar signing." },
      { property: "og:title", content: "Translate — SignBridge AI" },
      { property: "og:description", content: "Live sign recognition and speech-to-sign avatar playback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TranslatePage,
});

function TranslatePage() {
  const [detections, setDetections] = useState<StableRecognition[]>([]);
  const sequence = detections.map((d) => d.sign) as SignId[];
  const sentence = signsToSentence(sequence);

  const handleSign = (r: StableRecognition) => {
    setDetections((prev) => [...prev, r]);
    toast.success(`${SIGN_BY_ID[r.sign].label} · ${Math.round(r.confidence * 100)}%`);
  };

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Translate</h1>
        <p className="mt-1 text-muted-foreground">
          Sign recognition uses MediaPipe hand landmarks with temporal confirmation. Only the 12 listed signs are
          supported.
        </p>
      </header>

      <Tabs defaultValue="sign">
        <TabsList>
          <TabsTrigger value="sign">Sign → Speech</TabsTrigger>
          <TabsTrigger value="speech">Speech → Sign</TabsTrigger>
        </TabsList>

        <TabsContent value="sign" className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <SignCapture onSign={handleSign} />

          <div className="grid gap-4">
            <div className="surface p-5">
              <h2 className="text-lg font-semibold">Recognised sentence</h2>
              <p className="mt-3 min-h-14 rounded-xl border border-border bg-secondary/60 p-4 text-lg">
                {sentence || <span className="text-muted-foreground">Nothing recognised yet.</span>}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="lg"
                  disabled={!sentence}
                  onClick={() => {
                    if (!ttsSupported()) {
                      toast.error("This browser has no speech synthesis.");
                      return;
                    }
                    speak(sentence);
                  }}
                >
                  <Volume2 className="h-5 w-5" /> Speak
                </Button>
                <Button variant="outline" size="lg" onClick={() => setDetections([])} disabled={!detections.length}>
                  <Eraser className="h-4 w-4" /> Clear
                </Button>
                <Button variant="outline" size="lg" onClick={() => setDetections((prev) => prev.slice(0, -1))} disabled={!detections.length}>
                  <Undo2 className="h-4 w-4" /> Undo last sign
                </Button>
              </div>
            </div>

            <div className="surface p-5">
              <h3 className="font-semibold">Detections</h3>
              <ul className="mt-3 grid gap-2 text-sm">
                {detections.length === 0 && <li className="text-muted-foreground">No confirmed signs yet.</li>}
                {detections.map((d, i) => (
                  <li key={i} className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2">
                    <span>
                      {SIGN_BY_ID[d.sign].emoji} {SIGN_BY_ID[d.sign].label}
                    </span>
                    <span className="text-muted-foreground">{Math.round(d.confidence * 100)}% confidence</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="surface p-5">
              <h3 className="font-semibold">Vocabulary &amp; how to sign it</h3>
              <ul className="mt-3 grid gap-3 text-sm">
                {SIGNS.map((s) => (
                  <li key={s.id}>
                    <p className="font-medium">
                      {s.emoji} {s.label} {s.hands === 2 && <span className="text-xs text-muted-foreground">(two hands)</span>}
                    </p>
                    <p className="text-muted-foreground">{s.howTo}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="speech" className="mt-4">
          <SpeechToSign />
        </TabsContent>
      </Tabs>
    </div>
  );
}
