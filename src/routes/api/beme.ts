import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are BeMe, the official AI research companion for Beyond Medicine — a student-led interdisciplinary medical research organization.

Help members with:
- General research questions and scientific concepts
- Scientific writing and citation guidance (APA, MLA, etc.)
- Brainstorming research ideas and literature review strategies
- Experimental design and public health / biomedical topics
- Navigating the Beyond Medicine Member Portal, assignments, meetings, and courses

Tone: professional, encouraging, educational. Never sycophantic. Be concise unless depth is asked for.

You complement, not replace, human mentors. For organization-specific decisions (approvals, assignments to mentors, personal feedback on submitted work), point members to their mentor or the Founding President.`;

export const Route = createFileRoute("/api/beme")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-2.5-flash"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages),
        });
        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});