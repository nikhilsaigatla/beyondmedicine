import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isLocalAdminMode } from "@/lib/local-admin";
import { getRolePreview } from "@/lib/portal/role-preview";
import { hasApplicationManagementAccess, type AppRole, type PositionTitle } from "@/lib/portal/labels";
import { AdmissionsPanel } from "@/components/portal/admissions-panel";

export const Route = createFileRoute("/_authenticated/portal/admissions")({
  beforeLoad: async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth" });
    if (isLocalAdminMode()) {
      if (["admin", "executive", "officer"].includes(getRolePreview())) return;
      throw redirect({ to: "/portal" });
    }
    const [{ data: roles }, { data: positions }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.user.id),
      supabase.from("user_positions").select("position").eq("user_id", user.user.id),
    ]);
    if (!hasApplicationManagementAccess(
      (roles ?? []).map((role) => role.role as AppRole),
      (positions ?? []).map((position) => position.position as PositionTitle),
    )) {
      throw redirect({ to: "/portal" });
    }
  },
  component: AdmissionsPage,
});

function AdmissionsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Special access</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Admissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review and decide member applications.</p>
      </div>
      <AdmissionsPanel />
    </div>
  );
}
