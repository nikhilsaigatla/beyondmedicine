import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserSettingsForm } from "@/components/portal/user-settings-form";

export const Route = createFileRoute("/_authenticated/portal/settings")({
  component: UserSettingsPage,
});

function UserSettingsPage() {
  const { data: me } = useCurrentUser();
  if (!me) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div><p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Account</p><h1 className="mt-2 font-display text-4xl text-ink">User settings</h1></div>
      <UserSettingsForm userId={me.user.id} initialName={me.profile?.full_name ?? ""} initialEmail={me.user.email ?? me.profile?.email ?? ""} initialPhone={me.profile?.phone ?? ""} initialBio={me.profile?.bio ?? ""} initialAvatar={me.profile?.avatar_url ?? ""} />
    </div>
  );
}
