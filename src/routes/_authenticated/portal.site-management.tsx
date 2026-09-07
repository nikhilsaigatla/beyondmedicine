import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isLocalAdminMode } from "@/lib/local-admin";
import { getRolePreview } from "@/lib/portal/role-preview";
import { Card } from "@/components/ui/card";
import { RolePreviewSelect } from "@/components/portal/role-preview-select";
import { DatabaseManager } from "@/components/portal/database-manager";
import { LeadershipManager } from "@/components/portal/leadership-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/portal/site-management")({
  beforeLoad: async () => {
    if (isLocalAdminMode()) {
      if (getRolePreview() === "admin") return;
      throw redirect({ to: "/portal" });
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.user.id);
    if (!(roles ?? []).some((role) => role.role === "super_admin")) throw redirect({ to: "/portal" });
  },
  component: SiteManagementPage,
});

function SiteManagementPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Special access</p>
        <h1 className="mt-2 font-display text-4xl text-ink">Site Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">Administrator-only site controls and portal previews.</p>
      </div>
      <Tabs defaultValue="leadership" className="space-y-6">
        <TabsList>
          <TabsTrigger value="leadership">Leadership</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="preview">Role preview</TabsTrigger>
        </TabsList>
        <TabsContent value="leadership"><LeadershipManager /></TabsContent>
        <TabsContent value="database"><DatabaseManager /></TabsContent>
        <TabsContent value="preview"><Card className="p-6"><RolePreviewSelect /><p className="mt-4 text-sm text-muted-foreground">This changes the navigation and portal view for your current browser only. It does not change database roles or grant permissions.</p></Card></TabsContent>
      </Tabs>
    </div>
  );
}
