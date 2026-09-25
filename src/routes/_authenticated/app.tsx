import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRuntimeConfig } from "@/lib/assessments.functions";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

function AppShell() {
  const navigate = useNavigate();
  const getCfg = useServerFn(getRuntimeConfig);
  const cfg = useQuery({ queryKey: ["runtime-config"], queryFn: () => getCfg() });
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/app" className="text-lg font-semibold tracking-tight">
            Mastery
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/app">Dashboard</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to="/app/scenarios">My scenarios</Link>
            </Button>
            {cfg.data?.isAdmin && (
              <Button asChild size="sm" variant="ghost">
                <Link to="/app/admin">Admin</Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
