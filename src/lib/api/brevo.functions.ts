import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerConfig } from "../config.server";

const sendBrevoEmailSchema = z.object({
  subject: z.string().min(1).max(200),
  textContent: z.string().min(1).max(10000),
  recipients: z.array(z.object({ email: z.string().email(), name: z.string().optional() })).min(1).max(500),
});

export const sendBrevoEmail = createServerFn({ method: "POST" })
  .validator(sendBrevoEmailSchema)
  .handler(async ({ data }) => {
    const config = getServerConfig();
    if (!config.brevoApiKey || !config.brevoSenderEmail) {
      throw new Error("Brevo is not configured. Set BREVO_API_KEY and BREVO_SENDER_EMAIL on the server.");
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": config.brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: config.brevoSenderEmail, name: config.brevoSenderName },
        to: data.recipients,
        subject: data.subject,
        textContent: data.textContent,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Brevo rejected the email (${response.status}): ${details}`);
    }

    return { sent: true };
  });
