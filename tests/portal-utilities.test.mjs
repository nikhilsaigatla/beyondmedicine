import { readFile } from "node:fs/promises";
import ts from "typescript";
import { test } from "node:test";
import assert from "node:assert/strict";

async function importTs(path, replace = (s) => s) {
  const source = replace(await readFile(path, "utf8"));
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
const calendar = await importTs("src/lib/portal/calendar.ts");
const notificationSource = await readFile("src/lib/portal/notifications.server.ts", "utf8");
const notification = await importTs("src/lib/portal/notifications.server.ts", (s) =>
  s
    .replace(
      /import \{ supabaseAdmin \} from [^;]+;/,
      "const supabaseAdmin=globalThis.portalTestAdmin;",
    )
    .replace(
      /import \{ getServerConfig \} from [^;]+;/,
      "const getServerConfig=()=>globalThis.portalTestConfig;",
    ),
);
test("calendar files use UTC, escape text, fold UTF-8 safely, and have stable UIDs", () => {
  const entry = {
    id: "test-123",
    title: "Paper; review, notes\nNew line",
    starts_at: "2026-10-20T14:00:00-04:00",
    description: "Research 🧬 ".repeat(20),
  };
  const output = calendar.calendarFile([entry], new Date("2026-10-19T00:00:00Z"));
  assert(output.includes("DTSTART:20261020T180000Z"));
  assert(output.includes("DTEND:20261020T190000Z"));
  assert(output.includes("UID:test-123@beyond-medicine.org"));
  assert(output.includes("SUMMARY:Paper\\; review\\, notes\\nNew line"));
  assert(output.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  assert(!output.includes("\nSUMMARY:New line"));
});
test("Google and Outlook exports encode member-visible details", () => {
  const entry = {
    id: "abc",
    title: "Research & methods",
    starts_at: "2026-10-20T18:00:00Z",
    location: "Room A & B",
  };
  const google = new URL(calendar.googleCalendarLink(entry)),
    outlook = new URL(calendar.outlookCalendarLink(entry));
  assert.equal(google.searchParams.get("text"), entry.title);
  assert.equal(google.searchParams.get("location"), entry.location);
  assert.equal(outlook.searchParams.get("subject"), entry.title);
  assert.equal(outlook.searchParams.get("enddt"), "2026-10-20T19:00:00.000Z");
});
test("unsubscribe tokens reject tampering and bind both member and channel", () => {
  const user = "10000000-0000-4000-8000-000000000001",
    secret = "test-only-secret";
  const token = notification.unsubscribeToken(user, "sms", secret);
  assert.deepEqual(notification.verifyUnsubscribeToken(token, secret), { user, channel: "sms" });
  assert.equal(
    notification.verifyUnsubscribeToken(token.replace(".sms.", ".email."), secret),
    null,
  );
  assert.equal(notification.verifyUnsubscribeToken(token, "wrong-secret"), null);
  assert.equal(notification.verifyUnsubscribeToken(token + ".extra", secret), null);
  assert(!notification.secretsEqual("different", "lengths"));
});
// Load a fresh module after injecting a fake database. No real provider or database is contacted.
test("delivery honors channel consent, sends official templates, and retries provider failures", async () => {
  const updates = [],
    sent = [];
  const notes = {
    allowed: {
      id: "allowed",
      user_id: "10000000-0000-4000-8000-000000000001",
      category: "messages",
      title: "New message",
      body: "Sign in to read it.",
      link: "/portal/messages?conversation=abc",
    },
    blocked: {
      id: "blocked",
      user_id: "10000000-0000-4000-8000-000000000002",
      category: "messages",
      title: "No text consent",
      body: "Private",
      link: "/portal",
    },
    retry: {
      id: "retry",
      user_id: "10000000-0000-4000-8000-000000000003",
      category: "events",
      title: "Provider failure",
      body: "Update",
      link: "/portal/events",
    },
  };
  globalThis.portalTestConfig = {
    portalUrl: "https://portal.example.org",
    notificationSecret: "test-secret",
    brevoApiKey: "test-api-key",
    brevoSenderEmail: "portal@beyond-medicine.org",
    brevoSenderName: "Beyond Medicine",
    brevoSmsSender: "BeyondMed",
  };
  globalThis.portalTestAdmin = {
    rpc: async (name) => ({
      data:
        name === "claim_notification_deliveries"
          ? [
              { id: "one", notification_id: "allowed", channel: "email", attempts: 1 },
              { id: "two", notification_id: "blocked", channel: "sms", attempts: 1 },
              { id: "three", notification_id: "retry", channel: "email", attempts: 2 },
              { id: "four", notification_id: "allowed", channel: "sms", attempts: 1 },
              { id: "five", notification_id: "blocked", channel: "email", attempts: 1 },
            ]
          : undefined,
      error: null,
    }),
    from: (table) => ({
      select: () => ({
        eq: (_column, value) => ({
          single: async () => ({
            data:
              table === "notifications"
                ? notes[value]
                : { email: "member@example.org", full_name: "Member Name", status: "active" },
            error: null,
          }),
          maybeSingle: async () => ({
            data: {
              email_enabled: value !== notes.blocked.user_id,
              sms_enabled: value === notes.allowed.user_id,
              phone: "+12025550123",
              sms_consent_at: value === notes.allowed.user_id ? "2026-10-19T00:00:00Z" : null,
              categories: ["messages", "events"],
            },
            error: null,
          }),
        }),
      }),
      update: (payload) => ({
        eq: async (_column, id) => {
          updates.push({ id, ...payload });
          return { error: null };
        },
      }),
    }),
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push({ url, body });
    return new Response(JSON.stringify({ messageId: "provider-id" }), {
      status: body.subject === "Provider failure" ? 503 : 201,
    });
  };
  try {
    const worker = await importTs(
      "src/lib/portal/notifications.server.ts",
      (s) =>
        s
          .replace(
            /import \{ supabaseAdmin \} from [^;]+;/,
            "const supabaseAdmin=globalThis.portalTestAdmin;",
          )
          .replace(
            /import \{ getServerConfig \} from [^;]+;/,
            "const getServerConfig=()=>globalThis.portalTestConfig;",
          ) + "\n// worker scenario",
    );
    const result = await worker.dispatchNotifications();
    assert.deepEqual(result, { sent: 2, skipped: 2, failed: 1 });
    assert.equal(sent.length, 3);
    assert.equal(sent[0].body.sender.email, "portal@beyond-medicine.org");
    assert(sent[0].body.textContent.includes("Hi Member Name"));
    assert(
      sent[0].body.textContent.includes(
        "https://portal.example.org/portal/messages?conversation=abc",
      ),
    );
    assert(updates.some((u) => u.id === "two" && u.status === "skipped"));
    assert(updates.some((u) => u.id === "five" && u.status === "skipped"));
    const sms = sent.find((s) => s.url.endsWith("/transactionalSMS/send"));
    assert.equal(sms.body.recipient, "12025550123");
    assert.equal(sms.body.organisationPrefix, "Beyond Medicine");
    assert(
      sms.body.content.includes(
        "unsubscribe: https://portal.example.org/api/notification-preferences?token=",
      ),
    );
    assert(
      updates.some(
        (u) => u.id === "three" && u.status === "pending" && u.last_error.includes("503"),
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.portalTestAdmin;
    delete globalThis.portalTestConfig;
  }
});
