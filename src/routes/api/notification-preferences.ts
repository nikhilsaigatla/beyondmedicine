import { createFileRoute } from "@tanstack/react-router";

async function handler(request: Request) {
  const { getServerConfig } = await import("@/lib/config.server");
  const { verifyUnsubscribeToken } = await import("@/lib/portal/notifications.server");
  const secret = getServerConfig().notificationSecret;
  const token = new URL(request.url).searchParams.get("token") || "";
  const identity = secret ? verifyUnsubscribeToken(token, secret) : null;
  if (!identity) return new Response("Invalid unsubscribe link", { status: 400 });
  if (request.method === "POST") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("notification_preferences").upsert(
      {
        user_id: identity.user,
        ...(identity.channel === "email"
          ? { email_enabled: false }
          : { sms_enabled: false, sms_consent_at: null }),
      },
      { onConflict: "user_id" },
    );
    return new Response(
      error
        ? "Could not update preferences. Please try again."
        : `You have unsubscribed from Beyond Medicine portal ${identity.channel === "email" ? "emails" : "text messages"}. You can change this in portal settings.`,
      {
        status: error ? 500 : 200,
        headers: { "content-type": "text/plain;charset=utf-8", "cache-control": "no-store" },
      },
    );
  }
  // GET is a confirmation page so link scanners cannot change a member's preferences.
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Beyond Medicine notification preferences</title><body style="font:18px system-ui;max-width:40rem;margin:4rem auto;padding:1rem"><h1>Beyond Medicine</h1><p>Unsubscribe from portal ${identity.channel === "email" ? "emails" : "text messages"}?</p><form method="post"><button style="padding:1rem">Confirm unsubscribe</button></form></body></html>`,
    {
      headers: {
        "content-type": "text/html;charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy":
          "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
        "referrer-policy": "no-referrer",
      },
    },
  );
}
export const Route = createFileRoute("/api/notification-preferences")({
  server: {
    handlers: { GET: ({ request }) => handler(request), POST: ({ request }) => handler(request) },
  },
});
