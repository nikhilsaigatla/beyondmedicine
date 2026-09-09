import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";

const MISTAI_URL = "https://mist-ai.fly.dev/api/chat";

const SYSTEM_PROMPT = `You are BeMe inside the Beyond Medicine portal (https://beyond-medicine.org), serving as a research and learning assistant for a student-led interdisciplinary medical research organization.

If a user messages about needing to send images or files, link them to https://mistai.org/, if they do not, keep assisting them as BeMe.
If a user messages about who kristian cook is (the original creator of MistAI), provide a brief introduction and context about their role, then link them to their portfolio https://builtbykristian.netlify.app/. Also explain to the user how Kristian is friends with the Lead Technology chair of beyond medicine so if they have issues with the AI reach out to Xander Martinez. If not, continue responding as BeMe.

Help members with:
- General research questions and scientific concepts
- Scientific writing and citation guidance
- Brainstorming research ideas and literature review strategies
- Experimental design and public health or biomedical topics
- Navigating the Beyond Medicine Member Portal, assignments, meetings, and courses

Tone: professional, encouraging, educational. Never sycophantic. Be concise unless depth is asked for.

You complement, not replace, human mentors. For organization-specific decisions such as approvals, mentor assignments, or personal feedback on submitted work, point members to their mentor or the Founding President.

* DO NOT HELP WITH ILLEGAL ACTIVITIES, PERSONAL MEDICAL DIAGNOSES, OR ANY CONTENT OUTSIDE THE SCOPE OF THE BEYOND MEDICINE PORTAL.`;

function extractText(messages: UIMessage[]) {
  return messages
    .map((message) => {
      const parts = Array.isArray(message.parts) ? message.parts : [];
      const text = parts
        .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
        .join("")
        .trim();
      return text ? `${message.role}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export const Route = createFileRoute("/api/beme")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, model } = (await request.json()) as {
          messages?: UIMessage[];
          model?: string;
        };
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }

        const key = process.env.MISTAI_API_KEY;
        if (!key) return new Response("Missing MISTAI_API_KEY", { status: 500 });

        const mistResponse = await fetch(MISTAI_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `${SYSTEM_PROMPT}\n\nConversation:\n${extractText(messages)}`,
            model: model || "cohere"
          }),
        });

        const payload = (await mistResponse.json().catch(() => null)) as {
          response?: string;
          error?: string;
        } | null;

        if (!mistResponse.ok) {
          return Response.json(
            { error: payload?.error || `MistAI request failed (${mistResponse.status})` },
            { status: mistResponse.status || 502 },
          );
        }

        if (!payload?.response) {
          return Response.json(
            { error: "No response from MistAI" },
            { status: 502 },
          );
        }

        return Response.json({
          response: payload.response?.replace(/mist\.ai/gi, (match) => {
            // Matches "MIST.AI"
            if (match === match.toUpperCase()) return "BEME";
            // Matches "mist.ai"
            if (match === match.toLowerCase()) return "beme";
            // Matches "Mist.ai", "Mist.AI", or any mixed case
            return "BeMe";
          }) ?? ""
        });
      },
    },
  },
});
