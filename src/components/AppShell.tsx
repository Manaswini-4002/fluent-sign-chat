import { Link } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/translate", label: "Translate" },
  { to: "/conversation", label: "Conversation" },
  { to: "/emergency", label: "Emergency" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen aurora">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">SB</span>
            <span className="text-gradient">SignBridge AI</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ className: "bg-secondary text-foreground" }}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[16ch] truncate text-sm text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className={cn("border-t border-border/60 px-4 pb-3 md:hidden", open ? "block" : "hidden")}>
          <div className="grid gap-1 pt-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                activeProps={{ className: "bg-secondary text-foreground" }}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

export default AppShell;
