import { createFileRoute, Link } from "@tanstack/react-router";
import { Hand, MessageSquareText, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SIGNS } from "@/lib/signs";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SignBridge AI — sign language, spoken both ways" },
      {
        name: "description",
        content:
          "Camera-based sign recognition, speech-to-sign avatar playback and a gesture-triggered emergency alert with real GPS location.",
      },
      { property: "og:title", content: "SignBridge AI — sign language, spoken both ways" },
      {
        property: "og:description",
        content: "Two-way communication between signing and speaking people, running entirely in your browser.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen aurora">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">SB</span>
          <span className="text-gradient">SignBridge AI</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild>
              <Link to="/dashboard">Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Runs in the browser — camera, microphone and GPS never leave your device unless you send an alert
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
          Two-way conversation between <span className="text-gradient">signing</span> and{" "}
          <span className="text-gradient">speaking</span> people.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          SignBridge recognises a 12-sign vocabulary from your webcam, speaks it out loud, and plays real avatar
          animations for spoken words. A held emergency gesture raises an alert with your real GPS location.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to={user ? "/dashboard" : "/register"}>{user ? "Go to dashboard" : "Create free account"}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Hand,
              title: "Sign → Speech",
              body: "MediaPipe hand landmarks + a temporal buffer confirm each sign before it is spoken aloud.",
            },
            {
              icon: MessageSquareText,
              title: "Speech → Sign",
              body: "Your words are mapped to authored 3D avatar clips. Unsupported words are labelled, never faked.",
            },
            {
              icon: ShieldAlert,
              title: "Emergency gesture",
              body: "Repeated detection plus a countdown, then a real location, a live map and a shareable link.",
            },
          ].map((f) => (
            <div key={f.title} className="surface p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="surface mt-10 p-6">
          <h2 className="text-lg font-semibold">Supported vocabulary</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Recognition is a geometric rule engine over hand landmarks, not a trained neural sign model. Only these 12
            signs are supported.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {SIGNS.map((s) => (
              <span key={s.id} className="rounded-full border border-border bg-secondary px-3 py-1 text-sm">
                {s.emoji} {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
