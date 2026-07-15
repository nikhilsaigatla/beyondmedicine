import { createFileRoute, Outlet } from "@tanstack/react-router";
import { PortalShell } from "@/components/portal/portal-shell";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "Member Portal — Beyond Medicine" }] }),
  component: () => (
    <PortalShell>
      <Outlet />
    </PortalShell>
  ),
});
