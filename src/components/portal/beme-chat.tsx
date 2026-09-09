import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

type Msg = { id: string; role: "user" | "assistant"; text: string };

export function BemeChat({ variant = "page" }: { variant?: "page" | "drawer" }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text };
    const asstId = crypto.randomUUID();
    const nextMessages: Msg[] = [...messages, userMsg];
    setMessages([...nextMessages, { id: asstId, role: "assistant", text: "" }]);
    setInput("");
    setStreaming(true);
    try {
      const uiMessages = nextMessages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text", text: m.text }],
      }));
      const res = await fetch("/api/beme", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: uiMessages, model: "cohere" }),
      });
      const data = (await res.json().catch(() => null)) as {
        response?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.response) {
        throw new Error(data?.error || `MistAI error (${res.status})`);
      }
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, text: data.response! } : m)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
      setMessages((prev) => prev.filter((m) => m.id !== asstId));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1" ref={scrollRef as never}>
        <div className="mx-auto max-w-2xl space-y-4 p-4">
          {messages.length === 0 && (
            <div className="mt-8 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-3 font-display text-2xl text-ink">Hi, I'm BeMe</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Your Beyond Medicine AI research companion. Ask about research methods, writing,
                citations, or how to navigate the portal. For organization-specific questions, your
                mentor is the best next step.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground">
                  {m.text}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none whitespace-pre-wrap text-ink">
                  {m.text ? (
                    <ReactMarkdown
                      components={{
                        h1: ({children}) => <h1 className="text-2xl font-bold">{children}</h1>,
                        h2: ({children}) => <h2 className="text-xl font-bold">{children}</h2>,
                        p: ({children}) => <p className="my-2">{children}</p>,
    // Add more custom components as needed
                    }}
                  >{m.text}</ReactMarkdown>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <form
        className="border-t border-border bg-background p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={
              variant === "drawer"
                ? "Ask BeMe anything..."
                : "Ask BeMe about research, writing, or the portal..."
            }
            className="min-h-[44px] max-h-40 resize-none"
            disabled={streaming}
          />
          <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
