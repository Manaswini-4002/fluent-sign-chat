import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — SignBridge AI" },
      { name: "description", content: "Create a SignBridge AI account to save emergency contacts and transcripts." },
      { property: "og:title", content: "Create account — SignBridge AI" },
      { property: "og:description", content: "Sign up for SignBridge AI two-way sign language communication." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/dashboard", data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setCheckEmail(true);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("Google sign-up failed. Try email and password.");
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
        <h1 className="mt-4 text-2xl font-semibold">Create your account</h1>
        {checkEmail ? (
          <p className="mt-6 rounded-xl border border-border bg-secondary p-4 text-sm">
            Check your inbox — we sent a confirmation link to <strong>{email}</strong>. You&apos;ll be signed in after
            confirming.
          </p>
        ) : (
          <>
            <form onSubmit={submit} className="mt-6 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
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
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </Button>
            </form>
            <div className="my-4 text-center text-xs text-muted-foreground">or</div>
            <Button variant="outline" className="w-full" onClick={google}>
              Continue with Google
            </Button>
          </>
        )}
        <p className="mt-6 text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
