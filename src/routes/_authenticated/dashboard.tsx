import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, Mic, MapPin, MessagesSquare, ShieldAlert, Hand } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceStatus, type PermState } from "@/hooks/useDeviceStatus";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SignBridge AI" },
      { name: "description", content: "Start translation, conversation or check emergency protection status." },
      { property: "og:title", content: "Dashboard — SignBridge AI" },
      { property: "og:description", content: "Your SignBridge AI control centre." },
    ],
  }),
  component: Dashboard,
});

const LABEL: Record<PermState, string> = {
  granted: "Allowed",
  denied: "Blocked",
  prompt: "Will ask",
  unsupported: "Unsupported",
  unknown: "Asked on use",
};

function StatusRow({ icon: Icon, label, state }: { icon: typeof Camera; label: string; state: PermState }) {
  const tone =
    state === "granted"
      ? "text-success"
      : state === "denied"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <li className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <span className={tone}>{LABEL[state]}</span>
    </li>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const device = useDeviceStatus();

  const contacts = useQuery({
    queryKey: ["contacts", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("emergency_contacts").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const events = useQuery({
    queryKey: ["events", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_events")
        .select("id, created_at, gesture, notification_status, share_token")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const protectionReady = (contacts.data?.length ?? 0) > 0;

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-muted-foreground">{user?.email}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            to: "/translate" as const,
            icon: Hand,
            title: "Start sign translation",
            body: "Camera-based recognition of the 12-sign vocabulary, spoken out loud.",
          },
          {
            to: "/translate" as const,
            icon: Mic,
            title: "Start voice translation",
            body: "Speak or type, and watch the 3D avatar sign the supported words.",
          },
          {
            to: "/conversation" as const,
            icon: MessagesSquare,
            title: "Start conversation",
            body: "Both participants side by side with a saved transcript.",
          },
        ].map((card) => (
          <Link key={card.title} to={card.to} className="surface group p-6 transition-transform hover:-translate-y-1">
            <card.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldAlert className="h-5 w-5 text-destructive" /> Emergency protection
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {protectionReady
              ? `${contacts.data?.length} emergency contact(s) saved. Arm gesture detection on the emergency page when you need it.`
              : "No emergency contacts yet — add at least one so an alert has somewhere to go."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/emergency">Open emergency page</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/settings">Manage profile</Link>
            </Button>
          </div>

          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent alerts</h3>
          <ul className="mt-2 grid gap-2 text-sm">
            {events.data?.length === 0 && <li className="text-muted-foreground">No emergency events recorded.</li>}
            {events.data?.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2">
                <span>
                  {new Date(e.created_at).toLocaleString()} · {e.gesture}
                </span>
                <Link
                  to="/emergency/$token"
                  params={{ token: e.share_token }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {e.notification_status === "sent" ? "Sent" : "Demo mode"} — view
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface p-6">
          <h2 className="text-lg font-semibold">Device status</h2>
          <ul className="mt-3 grid gap-2">
            <StatusRow icon={Camera} label="Camera" state={device.camera} />
            <StatusRow icon={Mic} label="Microphone" state={device.microphone} />
            <StatusRow icon={MapPin} label="Location" state={device.location} />
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Speech recognition:{" "}
            {device.speechRecognition ? "available in this browser" : "not available — typed input is used instead"}.
          </p>
        </div>
      </div>
    </div>
  );
}
