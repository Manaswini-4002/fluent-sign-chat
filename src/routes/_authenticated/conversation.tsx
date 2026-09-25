import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SignCapture } from "@/components/SignCapture";
import { SpeechToSign } from "@/components/SpeechToSign";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SIGN_BY_ID, signsToSentence, type SignId } from "@/lib/signs";
import { speak } from "@/lib/speech";
import type { StableRecognition } from "@/lib/handRecognition";

export const Route = createFileRoute("/_authenticated/conversation")({
  head: () => ({
    meta: [
      { title: "Conversation — SignBridge AI" },
      { name: "description", content: "A live back-and-forth conversation between a signing and a speaking person." },
      { property: "og:title", content: "Conversation — SignBridge AI" },
      { property: "og:description", content: "Two-way sign and speech conversation with a saved transcript." },
    ],
  }),
  component: ConversationPage,
});

interface Entry {
  speaker: "signer" | "speaker";
  content: string;
  confidence?: number;
  at: string;
}

function makeId() {
  return crypto.randomUUID();
}

function ConversationPage() {
  const { user } = useAuth();
  const [sessionId] = useState(() => makeId());
  const [pending, setPending] = useState<StableRecognition[]>([]);
  const [transcript, setTranscript] = useState<Entry[]>([]);

  const pendingSentence = useMemo(() => signsToSentence(pending.map((p) => p.sign) as SignId[]), [pending]);

  const persist = useCallback(
    async (speaker: Entry["speaker"], content: string, confidence?: number) => {
      if (!user) return;
      const { error } = await supabase.from("conversation_messages").insert({
        user_id: user.id,
        session_id: sessionId,
        speaker,
        content,
        confidence: confidence ?? null,
      });
      if (error) toast.error(`Transcript not saved: ${error.message}`);
    },
    [sessionId, user],
  );

  const addEntry = useCallback(
    (speaker: Entry["speaker"], content: string, confidence?: number) => {
      setTranscript((t) => [...t, { speaker, content, confidence, at: new Date().toLocaleTimeString() }]);
      void persist(speaker, content, confidence);
    },
    [persist],
  );

  const sendSignerTurn = () => {
    if (!pendingSentence) return;
    const avg = pending.reduce((s, p) => s + p.confidence, 0) / pending.length;
    addEntry("signer", pendingSentence, avg);
    speak(pendingSentence);
    setPending([]);
  };

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Conversation</h1>
        <p className="mt-1 text-muted-foreground">
          The signing person uses the camera on the left. The speaking person uses the microphone on the right. Every
          turn is added to the shared transcript.
        </p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <section className="grid gap-3" aria-label="Signing participant">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Sign user</h2>
          <SignCapture
            onSign={(r) => setPending((p) => [...p, r])}
            footer={
              <Button size="lg" variant="secondary" className="h-14" onClick={sendSignerTurn} disabled={!pending.length}>
                Send turn
              </Button>
            }
          />
          <div className="surface p-4 text-sm">
            <p className="text-muted-foreground">Pending turn</p>
            <p className="mt-1 text-lg">{pendingSentence || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pending.map((p, i) => (
                <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {SIGN_BY_ID[p.sign].label} {Math.round(p.confidence * 100)}%
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-3" aria-label="Speaking participant">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">Speaking user</h2>
          <SpeechToSign
            onTranscript={(text) => {
              if (text.trim()) addEntry("speaker", text.trim());
            }}
          />
        </section>
      </div>

      <section className="surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transcript</h2>
          <span className="text-xs text-muted-foreground">Session {sessionId.slice(0, 8)}</span>
        </div>
        <ul className="mt-4 grid gap-3">
          {transcript.length === 0 && <li className="text-sm text-muted-foreground">No turns yet.</li>}
          {transcript.map((entry, i) => (
            <li
              key={i}
              className={
                entry.speaker === "signer"
                  ? "rounded-xl border border-primary/40 bg-primary/10 p-4"
                  : "rounded-xl border border-accent/40 bg-accent/10 p-4"
              }
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold uppercase tracking-wide">
                  {entry.speaker === "signer" ? "Sign user" : "Speaking user"}
                </span>
                <span>
                  {entry.at}
                  {entry.confidence ? ` · ${Math.round(entry.confidence * 100)}% confidence` : ""}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-base">{entry.content}</p>
                <Button size="sm" variant="ghost" aria-label="Speak this line" onClick={() => speak(entry.content)}>
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
