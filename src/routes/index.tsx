import { createFileRoute, Link } from "@tanstack/react-router";
import { Hand, MessageSquareText, ShieldAlert, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/PageHeading";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen aurora">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-5">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">SB</span>
          <span>SignBridge AI</span>
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

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-12">
        <div className="pb-10 sm:pb-12">
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Communication & safety
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">SignBridge AI</h1>
        <p className="mt-4 max-w-2xl text-xl leading-relaxed text-muted-foreground">Two-way communication between signing and speaking people.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to={user ? "/dashboard" : "/register"}>{user ? "Go to dashboard" : "Create free account"}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>

        </div>
        <section className="section-band" aria-label="Communication and safety">
        <SectionHeading title="Communication & safety" detail="Three connected tools" />
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Hand,
              title: "Sign → Speech",
              body: "Camera recognition for 12 supported signs, with spoken output.",
            },
            {
              icon: MessageSquareText,
              title: "Speech → Sign",
              body: "An animated avatar signs supported words and fingerspells others.",
            },
            {
              icon: ShieldAlert,
              title: "Emergency gesture",
              body: "A cancellable countdown, GPS location and alerts to saved contacts when delivery is configured.",
            },
          ].map((f) => (
            <div key={f.title} className="surface p-6">
              <f.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
        </section>

        <section className="section-band" aria-label="Supported vocabulary">
          <SectionHeading title="Supported vocabulary" detail="12 camera-recognized signs" />
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
        </section>
      </section>
    </div>
  );
}
