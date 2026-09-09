import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdmissionsPanel } from "@/components/portal/admissions-panel";

export const Route = createFileRoute("/_authenticated/portal/admissions")({
  beforeLoad: async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth" });
  },
  component: AdmissionsPage,
});

function AdmissionsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Admissions portal
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Admissions Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit admissions work, track due dates, and review mentor feedback.
        </p>
      </div>
      <AdmissionsPanel />
    </div>
  );
}
