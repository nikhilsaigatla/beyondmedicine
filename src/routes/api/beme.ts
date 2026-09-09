import { createFileRoute } from "@tanstack/react-router";
import type { UIMessage } from "ai";

const MISTAI_URL = "https://api.mistai.org/api/v1/chat";

const SYSTEM_PROMPT = `You are MistAI inside the Beyond Medicine portal, serving as a research and learning assistant for a student-led interdisciplinary medical research organization.

Help members with:
- General research questions and scientific concepts
- Scientific writing and citation guidance
- Brainstorming research ideas and literature review strategies
- Experimental design and public health or biomedical topics
- Navigating the Beyond Medicine Member Portal, assignments, meetings, and courses

Tone: professional, encouraging, educational. Never sycophantic. Be concise unless depth is asked for.

You complement, not replace, human mentors. For organization-specific decisions such as approvals, mentor assignments, or personal feedback on submitted work, point members to their mentor or the Founding President.`;

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
            model: model || "cohere",
            message: `${SYSTEM_PROMPT}\n\nConversation:\n${extractText(messages)}`,
          }),
        });

        const payload = (await mistResponse.json().catch(() => null)) as {
          success?: boolean;
          response?: string;
          message?: string;
        } | null;

        if (!mistResponse.ok || !payload?.success) {
          return Response.json(
            { error: payload?.message || "MistAI request failed" },
            { status: mistResponse.status || 502 },
          );
        }

        return Response.json({ response: payload.response ?? "" });
      },
    },
  },
});
