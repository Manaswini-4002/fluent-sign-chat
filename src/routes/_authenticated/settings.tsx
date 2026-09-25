import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SignBridge AI" },
      { name: "description", content: "Update your SignBridge AI profile and location sharing preference." },
      { property: "og:title", content: "Settings — SignBridge AI" },
      { property: "og:description", content: "Profile and privacy settings for SignBridge AI." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [shareLocation, setShareLocation] = useState(true);
  const [saving, setSaving] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.full_name ?? "");
      setShareLocation(profile.data.share_location);
    }
  }, [profile.data]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: fullName, share_location: shareLocation });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    }
  };

  return (
    <div className="grid max-w-2xl gap-6">
      <header>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Profile and privacy preferences.</p>
      </header>

      <section className="surface grid gap-4 p-6">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ""} readOnly />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border p-4">
          <div>
            <p className="font-medium">Include GPS location in emergency alerts</p>
            <p className="text-sm text-muted-foreground">
              When off, an alert still records the time and gesture but no coordinates.
            </p>
          </div>
          <Switch checked={shareLocation} onCheckedChange={setShareLocation} aria-label="Share location" />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </section>

      <section className="surface p-6 text-sm text-muted-foreground">
        <h2 className="text-base font-semibold text-foreground">What this app really does</h2>
        <ul className="mt-2 grid list-disc gap-1 pl-5">
          <li>Sign recognition is a geometric rule engine over MediaPipe hand landmarks — not a trained ASL model.</li>
          <li>Avatar clips are hand-authored keyframes; words without a clip are never animated.</li>
          <li>Speech recognition and speech output use your browser&apos;s built-in Web Speech APIs.</li>
          <li>GPS comes from your browser. If it fails, the alert records the failure instead of a fake position.</li>
          <li>SMS/email alerts are only sent when real provider credentials are configured; otherwise demo mode.</li>
        </ul>
      </section>
    </div>
  );
}
