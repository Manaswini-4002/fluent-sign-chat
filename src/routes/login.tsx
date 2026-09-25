import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — SignBridge AI" },
      { name: "description", content: "Log in to SignBridge AI to translate signs, speech and emergency alerts." },
      { property: "og:title", content: "Log in — SignBridge AI" },
      { property: "og:description", content: "Access your SignBridge AI dashboard and emergency contacts." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-in failed. Try email and password.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen place-items-center aurora px-4 py-10">
      <div className="surface w-full max-w-md p-8">
        <Link to="/" className="font-display text-sm text-muted-foreground">
          ← SignBridge AI
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Log in</h1>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Signing in…" : "Log in"}
          </Button>
        </form>
        <div className="my-4 text-center text-xs text-muted-foreground">or</div>
        <Button variant="outline" className="w-full" onClick={google}>
          Continue with Google
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">
          No account yet?{" "}
          <Link to="/register" className="text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
