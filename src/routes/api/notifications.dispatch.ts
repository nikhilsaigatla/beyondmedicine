import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/notifications/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getServerConfig } = await import("@/lib/config.server");
        const { dispatchNotifications, secretsEqual } =
          await import("@/lib/portal/notifications.server");
        const config = getServerConfig();
        if (
          !config.notificationCronSecret ||
          !secretsEqual(
            request.headers.get("authorization") || "",
            `Bearer ${config.notificationCronSecret}`,
          )
        )
          return new Response("Unauthorized", { status: 401 });
        try {
          return Response.json(await dispatchNotifications());
        } catch {
          return Response.json(
            {
              error:
                "Notification dispatch failed. Check server configuration and database migrations.",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
