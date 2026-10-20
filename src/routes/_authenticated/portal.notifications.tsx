import { createFileRoute } from "@tanstack/react-router";
import { NotificationInbox } from "@/components/portal/notification-center";
export const Route = createFileRoute("/_authenticated/portal/notifications")({
  component: () => (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-4xl">Notifications</h1>
      <NotificationInbox />
    </div>
  ),
});
