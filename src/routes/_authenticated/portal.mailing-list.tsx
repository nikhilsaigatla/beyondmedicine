import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isLocalAdminMode } from "@/lib/local-admin";
import { getRolePreview } from "@/lib/portal/role-preview";
import { hasApplicationManagementAccess, POSITION_DIVISION, POSITION_LABEL, type AppRole, type PositionTitle } from "@/lib/portal/labels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/portal/mailing-list")({
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
    )) throw redirect({ to: "/portal" });
  },
  component: MailingListPage,
});

function MailingListPage() {
  const { data: subscribers, error: subscribersError } = useQuery({
    queryKey: ["mailing-list-subscribers"],
    queryFn: async () => {
      const [profilesRes, applicationsRes, positionsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, verification_status").eq("verification_status", "verified"),
        supabase.from("applications").select("user_id, country, state_region"),
        supabase.from("user_positions").select("user_id, position"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (applicationsRes.error) throw applicationsRes.error;
      if (positionsRes.error) throw positionsRes.error;
      const profiles = profilesRes.data;
      const applications = applicationsRes.data;
      const positions = positionsRes.data;
      return (profiles ?? []).map((profile) => {
        const position = (positions ?? []).find((item) => item.user_id === profile.id)?.position as PositionTitle | undefined;
        return {
          ...profile,
          division: position ? POSITION_DIVISION[position] : "General Membership",
          position: position ? POSITION_LABEL[position] : "General Member",
          location: (applications ?? []).find((item) => item.user_id === profile.id),
        };
      });
    },
  });

  const divisions = [...new Set((subscribers ?? []).map((subscriber) => subscriber.division))];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Special access</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Mailing list</h1>
        <p className="mt-1 text-sm text-muted-foreground">Verified member recipients grouped by organizational division.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><p className="text-3xl font-medium text-ink">{subscribers?.length ?? 0}</p><p className="text-sm text-muted-foreground">Verified recipients</p></Card>
        <Card className="p-5"><p className="text-3xl font-medium text-ink">{divisions.length}</p><p className="text-sm text-muted-foreground">Divisions</p></Card>
      </div>
      {subscribersError && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load verified recipients: {subscribersError instanceof Error ? subscribersError.message : "Unknown database error"}
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {divisions.map((division) => {
          const members = (subscribers ?? []).filter((subscriber) => subscriber.division === division);
          return <Card key={division} className="p-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl text-ink">{division}</h2><Badge variant="secondary">{members.length}</Badge></div><ul className="divide-y divide-border">{members.map((member) => <li key={member.id} className="py-3"><p className="font-medium text-ink">{member.full_name || member.email}</p><p className="text-xs text-muted-foreground">{member.email} · {member.position}</p></li>)}</ul></Card>;
        })}
      </div>
    </div>
  );
}
