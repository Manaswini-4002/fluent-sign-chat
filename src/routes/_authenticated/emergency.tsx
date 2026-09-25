import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { AlertTriangle, Copy, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignCapture } from "@/components/SignCapture";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getCurrentPosition } from "@/hooks/useDeviceStatus";
import { SIGN_BY_ID, type SignId } from "@/lib/signs";
import { getNotifierStatus, sendEmergencyAlert } from "@/lib/notifications.functions";
import type { StableRecognition } from "@/lib/handRecognition";

const EmergencyMap = lazy(() => import("@/components/EmergencyMap"));

export const Route = createFileRoute("/_authenticated/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency — SignBridge AI" },
      { name: "description", content: "Set up a gesture-triggered emergency alert with contacts and real GPS." },
      { property: "og:title", content: "Emergency — SignBridge AI" },
      { property: "og:description", content: "Gesture-triggered emergency alerts with live location sharing." },
    ],
  }),
  component: EmergencyPage,
});

const GESTURE_OPTIONS: SignId[] = ["HELP", "STOP", "HOSPITAL"];
const REQUIRED_DETECTIONS = 3;
const DETECTION_WINDOW_MS = 15000;
const COUNTDOWN_SECONDS = 5;

type Mode = "off" | "test" | "armed";

function EmergencyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("off");
  const [hits, setHits] = useState<number[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "", relation: "" });
  const countdownRef = useRef<number | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const contactsQuery = useQuery({
    queryKey: ["contacts", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const notifierQuery = useQuery({ queryKey: ["notifier"], queryFn: () => getNotifierStatus() });

  const gesture = (GESTURE_OPTIONS.includes(profileQuery.data?.emergency_gesture as SignId)
    ? profileQuery.data?.emergency_gesture
    : "HELP") as SignId;

  const setGesture = async (next: SignId) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ emergency_gesture: next }).eq("id", user.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Emergency gesture set to ${SIGN_BY_ID[next].label}`);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  const fireEmergency = useCallback(async () => {
    setTriggering(true);
    setNotifyResult(null);
    let location: Awaited<ReturnType<typeof getCurrentPosition>> | null = null;
    let locationError: string | null = null;
    try {
      location = await getCurrentPosition();
    } catch (e) {
      locationError = (e as Error).message;
    }

    const { data, error } = await supabase
      .from("emergency_events")
      .insert({
        user_id: user!.id,
        trigger_type: "gesture",
        gesture,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        accuracy_m: location?.accuracy ?? null,
        location_error: locationError,
        message: `Emergency alert raised with the ${SIGN_BY_ID[gesture].label} gesture.`,
      })
      .select()
      .single();

    if (error || !data) {
      setTriggering(false);
      toast.error(`Could not record the emergency event: ${error?.message}`);
      return;
    }
    setEvent(data);

    const shareUrl = `${window.location.origin}/emergency/${data.share_token}`;
    try {
      const result = await sendEmergencyAlert({
        data: {
          eventId: data.id,
          shareUrl,
          message: data.message ?? "Emergency alert from SignBridge AI",
        },
      });
      setNotifyResult(result.detail);
      await supabase.from("emergency_events").update({ notification_status: result.status }).eq("id", data.id);
    } catch (e) {
      setNotifyResult(`Notification request failed: ${(e as Error).message}`);
    }
    setTriggering(false);
    setMode("off");
    setHits([]);
  }, [gesture, user]);

  // Countdown ticker
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      void fireEmergency();
      return;
    }
    countdownRef.current = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current);
    };
  }, [countdown, fireEmergency]);

  const onSign = (r: StableRecognition) => {
    if (r.sign !== gesture) return;
    const now = Date.now();
    const next = [...hits.filter((t) => now - t < DETECTION_WINDOW_MS), now];
    setHits(next);
    if (mode === "test") {
      toast.success(`Gesture detected (${next.length}/${REQUIRED_DETECTIONS}) at ${Math.round(r.confidence * 100)}%`);
      if (next.length >= REQUIRED_DETECTIONS) {
        toast.success("Test passed — this would trigger an alert in armed mode.");
        setHits([]);
      }
      return;
    }
    if (mode === "armed" && next.length >= REQUIRED_DETECTIONS && countdown === null) {
      setCountdown(COUNTDOWN_SECONDS);
    }
  };

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!contactForm.phone && !contactForm.email) {
      toast.error("Add a phone number or an email so the contact can be reached.");
      return;
    }
    const { error } = await supabase.from("emergency_contacts").insert({
      user_id: user.id,
      name: contactForm.name,
      phone: contactForm.phone || null,
      email: contactForm.email || null,
      relation: contactForm.relation || null,
    });
    if (error) toast.error(error.message);
    else {
      setContactForm({ name: "", phone: "", email: "", relation: "" });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    }
  };

  const removeContact = async (id: string) => {
    const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: ["contacts"] });
  };

  const shareUrl = event ? `${window.location.origin}/emergency/${event.share_token}` : "";

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Emergency protection</h1>
        <p className="mt-1 text-muted-foreground">
          A held gesture, confirmed {REQUIRED_DETECTIONS} times, starts a {COUNTDOWN_SECONDS}-second countdown you can
          cancel before anything is sent.
        </p>
      </header>

      {countdown !== null && (
        <div className="surface pulse-alert border-destructive/60 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-3 text-5xl font-semibold text-destructive">{countdown}</p>
          <p className="mt-2 text-sm text-muted-foreground">Raising an emergency event and reading your GPS location…</p>
          <Button
            size="lg"
            variant="outline"
            className="mt-4 h-14 px-10"
            onClick={() => {
              setCountdown(null);
              setHits([]);
              toast.info("Emergency cancelled.");
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-4">
          <div className="surface p-5">
            <h2 className="text-lg font-semibold">Emergency gesture</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {GESTURE_OPTIONS.map((g) => (
                <Button
                  key={g}
                  variant={g === gesture ? "default" : "outline"}
                  onClick={() => setGesture(g)}
                  className="h-12"
                >
                  {SIGN_BY_ID[g].emoji} {SIGN_BY_ID[g].label}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{SIGN_BY_ID[gesture].howTo}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant={mode === "test" ? "secondary" : "outline"}
                className="h-12"
                onClick={() => {
                  setHits([]);
                  setMode(mode === "test" ? "off" : "test");
                }}
              >
                {mode === "test" ? "Stop test" : "Test gesture"}
              </Button>
              <Button
                variant={mode === "armed" ? "destructive" : "outline"}
                className="h-12"
                onClick={() => {
                  setHits([]);
                  setMode(mode === "armed" ? "off" : "armed");
                }}
              >
                {mode === "armed" ? "Disarm" : "Arm emergency detection"}
              </Button>
              <span className="self-center text-sm text-muted-foreground">
                {mode === "off" && "Detection off"}
                {mode === "test" && "Test mode — nothing will be sent"}
                {mode === "armed" && `Armed — ${hits.length}/${REQUIRED_DETECTIONS} confirmations`}
              </span>
            </div>
          </div>

          {mode !== "off" && <SignCapture onSign={onSign} />}

          {event && (
            <div className="surface border-destructive/50 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-destructive">
                <AlertTriangle className="h-5 w-5" /> Emergency event created
              </h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Timestamp</dt>
                  <dd>{new Date(event.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Gesture</dt>
                  <dd>{SIGN_BY_ID[event.gesture as SignId]?.label ?? event.gesture}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">GPS accuracy</dt>
                  <dd>{event.accuracy_m ? `±${Math.round(event.accuracy_m)} m` : "Unavailable"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Coordinates</dt>
                  <dd>
                    {event.latitude
                      ? `${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}`
                      : (event.location_error ?? "Not available")}
                  </dd>
                </div>
              </dl>

              {event.latitude && (
                <div className="mt-4">
                  <ClientOnly fallback={<div className="h-72 rounded-2xl border border-border" />}>
                    <Suspense fallback={<div className="h-72 rounded-2xl border border-border" />}>
                      <EmergencyMap lat={event.latitude} lng={event.longitude} accuracy={event.accuracy_m} />
                    </Suspense>
                  </ClientOnly>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Input readOnly value={shareUrl} className="max-w-md" aria-label="Shareable emergency link" />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="h-4 w-4" /> Copy link
                </Button>
              </div>
              <p className="mt-3 rounded-lg border border-border bg-secondary/60 p-3 text-sm">
                {triggering ? "Sending…" : (notifyResult ?? "Demo mode — notification not sent")}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" /> Delivery
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {notifierQuery.data?.sms || notifierQuery.data?.email
                ? `Configured providers: ${[notifierQuery.data?.sms && "SMS", notifierQuery.data?.email && "email"]
                    .filter(Boolean)
                    .join(" + ")}.`
                : "Demo mode — no SMS or email provider is configured, so alerts are recorded and shareable but not sent."}
            </p>
          </div>

          <div className="surface p-5">
            <h2 className="text-lg font-semibold">Emergency contacts</h2>
            <ul className="mt-3 grid gap-2">
              {contactsQuery.isLoading && <li className="text-sm text-muted-foreground">Loading…</li>}
              {contactsQuery.data?.length === 0 && (
                <li className="text-sm text-muted-foreground">No contacts yet.</li>
              )}
              {contactsQuery.data?.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2">
                  <div className="text-sm">
                    <p className="font-medium">
                      {c.name} {c.relation && <span className="text-muted-foreground">· {c.relation}</span>}
                    </p>
                    <p className="text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(" · ")}</p>
                  </div>
                  <Button size="icon" variant="ghost" aria-label={`Remove ${c.name}`} onClick={() => removeContact(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>

            <form onSubmit={addContact} className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="c-name">Name</Label>
                <Input
                  id="c-name"
                  required
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-phone">Phone</Label>
                  <Input
                    id="c-phone"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-email">Email</Label>
                  <Input
                    id="c-email"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-rel">Relationship</Label>
                <Input
                  id="c-rel"
                  value={contactForm.relation}
                  onChange={(e) => setContactForm({ ...contactForm, relation: e.target.value })}
                />
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4" /> Add contact
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
