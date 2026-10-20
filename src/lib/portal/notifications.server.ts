import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getServerConfig } from "@/lib/config.server";

export function secretsEqual(actual: string, expected: string) {
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function unsubscribeToken(user: string, channel: string, secret: string) {
  const value = `${user}.${channel}`;
  return `${value}.${createHmac("sha256", secret).update(value).digest("hex")}`;
}
export function verifyUnsubscribeToken(token: string, secret: string) {
  const [user, channel, signature, ...extra] = token.split(".");
  if (
    !/^[0-9a-f-]{36}$/i.test(user || "") ||
    !["email", "sms"].includes(channel) ||
    extra.length ||
    !signature
  )
    return null;
  return secretsEqual(token, unsubscribeToken(user, channel, secret)) ? { user, channel } : null;
}

/** A leased outbox; channel preferences are rechecked at dispatch, including for retries. */
export async function dispatchNotifications() {
  const config = getServerConfig();
  if (!config.portalUrl || !config.notificationSecret)
    throw new Error("Set PORTAL_BASE_URL and NOTIFICATION_SECRET");
  const signingSecret = config.notificationSecret;
  const base = new URL(config.portalUrl);
  if (base.protocol !== "https:" && base.hostname !== "localhost")
    throw new Error("PORTAL_BASE_URL must use HTTPS");
  const reminderResult = await supabaseAdmin.rpc("queue_portal_reminders", {});
  if (reminderResult.error) throw new Error(reminderResult.error.message);
  const { data: jobs, error } = await supabaseAdmin.rpc("claim_notification_deliveries", {
    _limit: 40,
  });
  if (error) throw new Error(error.message);
  let sent = 0,
    skipped = 0,
    failed = 0;
  const deliveries = jobs ?? [];
  for (let offset = 0; offset < deliveries.length; offset += 5) {
    await Promise.all(
      deliveries.slice(offset, offset + 5).map(async (job) => {
        try {
          const { data: note, error: noteError } = await supabaseAdmin
            .from("notifications")
            .select("*")
            .eq("id", job.notification_id)
            .single();
          if (noteError) throw new Error(noteError.message);
          const [prefResult, profileResult] = await Promise.all([
            supabaseAdmin
              .from("notification_preferences")
              .select("*")
              .eq("user_id", note.user_id)
              .maybeSingle(),
            supabaseAdmin
              .from("profiles")
              .select("email,full_name,status")
              .eq("id", note.user_id)
              .single(),
          ]);
          if (prefResult.error || profileResult.error) throw new Error("Recipient lookup failed");
          const pref = prefResult.data,
            profile = profileResult.data!;
          const permitted =
            profile.status === "active" &&
            (
              pref?.categories ?? ["membership", "messages", "events", "assignments", "cohorts"]
            ).includes(note.category) &&
            (job.channel === "email"
              ? (pref?.email_enabled ?? true)
              : !!(
                  pref?.sms_enabled &&
                  pref.sms_consent_at &&
                  /^\+[1-9]\d{7,14}$/.test(pref.phone || "")
                ));
          if (!permitted) {
            const result = await supabaseAdmin
              .from("notification_deliveries")
              .update({ status: "skipped", locked_at: null })
              .eq("id", job.id);
            if (result.error) throw new Error(result.error.message);
            skipped++;
            return;
          }
          if (!config.brevoApiKey) throw new Error("BREVO_API_KEY is not configured");
          const link = new URL(note.link, base.origin).toString();
          const optout = new URL("/api/notification-preferences", base.origin);
          optout.searchParams.set(
            "token",
            unsubscribeToken(note.user_id, job.channel, signingSecret),
          );
          const name = profile.full_name?.trim() || "Member";
          let endpoint: string, body: Record<string, unknown>;
          if (job.channel === "email") {
            if (!config.brevoSenderEmail) throw new Error("BREVO_SENDER_EMAIL is not configured");
            endpoint = "https://api.brevo.com/v3/smtp/email";
            body = {
              sender: { email: config.brevoSenderEmail, name: config.brevoSenderName },
              to: [{ email: profile.email, name }],
              subject: note.title,
              textContent: `Hi ${name},\n\n${note.body}\n\n${link}\n\nNotification preferences: ${new URL("/portal/settings", base.origin)}\nUnsubscribe from portal emails: ${optout}`,
              headers: {
                "List-Unsubscribe": `<${optout}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                "X-Mailin-custom": `portal_delivery:${job.id}`,
              },
            };
          } else {
            if (!config.brevoSmsSender) throw new Error("BREVO_SMS_SENDER is not configured");
            endpoint = "https://api.brevo.com/v3/transactionalSMS/send";
            body = {
              sender: config.brevoSmsSender,
              recipient: pref!.phone!.replace(/^\+/, ""),
              content: `Hi ${name}, ${note.title}. ${link} Text preferences / unsubscribe: ${optout}`,
              type: "transactional",
              unicodeEnabled: true,
              organisationPrefix: "Beyond Medicine",
              tag: job.id,
            };
          }
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "api-key": config.brevoApiKey,
              "content-type": "application/json",
              accept: "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok)
            throw new Error(`Notification provider returned HTTP ${response.status}`);
          const result = (await response.json()) as { messageId?: string; reference?: string };
          const saved = await supabaseAdmin
            .from("notification_deliveries")
            .update({
              status: "sent",
              locked_at: null,
              provider_id: String(result.messageId ?? result.reference ?? ""),
              last_error: null,
            })
            .eq("id", job.id);
          if (saved.error) throw new Error("Could not record delivery result");
          sent++;
        } catch (error) {
          failed++;
          const result = await supabaseAdmin
            .from("notification_deliveries")
            .update({
              status: job.attempts >= 6 ? "failed" : "pending",
              locked_at: null,
              available_at: new Date(
                Date.now() + Math.min(3600000, 60000 * 2 ** job.attempts),
              ).toISOString(),
              last_error: error instanceof Error ? error.message : "Delivery failed",
            })
            .eq("id", job.id);
          if (result.error) throw new Error("Could not record delivery failure");
        }
      }),
    );
  }
  return { sent, skipped, failed };
}
