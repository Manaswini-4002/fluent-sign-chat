import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { Download, Undo2, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SignCapture } from "@/components/SignCapture";
import { SpeechToSign } from "@/components/SpeechToSign";
import { PageHeading, SectionHeading } from "@/components/PageHeading";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
      setTranscript((t) => [
        ...t,
        {
          speaker,
          content,
          at: new Date().toLocaleTimeString(),
          ...(confidence === undefined ? {} : { confidence }),
        },
      ]);
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

  const downloadTranscript = () => {
    const lines = transcript.map((entry) => `[${entry.at}] ${entry.speaker === "signer" ? "Sign user" : "Speaking user"}: ${entry.content}`);
    const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `signbridge-conversation-${sessionId.slice(0, 8)}.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid gap-5">
      <PageHeading category="Communication" title="Conversation" description="A shared conversation between signing and speaking participants." />

      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.9fr)]">
        <section className="workspace-section grid content-start gap-3" aria-label="Signing participant">
          <SectionHeading title="Sign user" detail="Camera input" />
          <SignCapture
            compact
            onSign={(r) => setPending((p) => [...p, r])}
            footer={
              <Button size="sm" variant="secondary" className="min-h-10" onClick={sendSignerTurn} disabled={!pending.length}>
                Send turn
              </Button>
            }
          />
          <div className="surface p-4 text-sm">
            <p className="text-muted-foreground">Pending turn</p>
            <p className="mt-1 text-lg">{pendingSentence || "—"}</p>
            <div className="mt-2 flex max-h-20 flex-wrap gap-2 overflow-y-auto">
              {pending.map((p, i) => (
                <span key={i} className="rounded-full bg-secondary px-3 py-1 text-xs">
                  {SIGN_BY_ID[p.sign].label} {Math.round(p.confidence * 100)}%
                </span>
              ))}
            </div>
            <Button size="sm" variant="ghost" className="mt-3" onClick={() => setPending((p) => p.slice(0, -1))} disabled={!pending.length}>
              <Undo2 className="h-4 w-4" /> Undo last sign
            </Button>
          </div>
        </section>

        <section className="workspace-section grid min-w-0 content-start gap-3 md:border-l md:border-border md:pl-5" aria-label="Speaking participant">
          <SectionHeading title="Speaking user" detail="Speech & text input" />
          <SpeechToSign
            compact
            onTranscript={(text) => {
              if (text.trim()) addEntry("speaker", text.trim());
            }}
          />
        </section>
      </div>

      <section className="border-t border-border pt-5" aria-label="Conversation transcript">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:justify-between">
          <h2 className="min-w-0 truncate text-lg font-semibold">Transcript</h2>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">Session {sessionId.slice(0, 8)}</span>
            <Button size="sm" variant="outline" onClick={downloadTranscript} disabled={!transcript.length} aria-label="Download transcript">
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        </div>
        <ul className="mt-4 grid max-h-64 gap-3 overflow-y-auto" aria-live="polite">
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
                <p className="min-w-0 break-words text-base">{entry.content}</p>
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
