import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/_authenticated/portal/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [newDmEmail, setNewDmEmail] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ["conversations", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", me!.user.id);
      const ids = (memberships ?? []).map((m) => m.conversation_id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, profiles:sender_id(full_name, email)")
        .eq("conversation_id", activeId!)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`msg-${activeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        () => qc.invalidateQueries({ queryKey: ["messages", activeId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeId, qc]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!me || !activeId || !text.trim()) return;
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId, sender_id: me.user.id, body: text.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setText("");
  }

  async function startDm(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const { data: target } = await supabase.from("profiles").select("id").eq("email", newDmEmail.trim().toLowerCase()).maybeSingle();
    if (!target) { toast.error("No member found with that email"); return; }
    const { data: convo, error: convoErr } = await supabase
      .from("conversations")
      .insert({ type: "dm", created_by: me.user.id })
      .select().single();
    if (convoErr || !convo) { toast.error(convoErr?.message || "Could not start conversation"); return; }
    // add self first (RLS then permits adding others)
    await supabase.from("conversation_members").insert({ conversation_id: convo.id, user_id: me.user.id });
    await supabase.from("conversation_members").insert({ conversation_id: convo.id, user_id: target.id });
    setNewDmEmail("");
    setActiveId(convo.id);
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }

  return (
    <div className="mx-auto grid h-[calc(100vh-8rem)] max-w-6xl gap-4 md:grid-cols-[280px_1fr]">
      <Card className="flex flex-col overflow-hidden p-0">
        <div className="border-b border-border p-3">
          <h2 className="font-display text-lg text-ink">Conversations</h2>
          <form onSubmit={startDm} className="mt-3 flex gap-2">
            <Input placeholder="Member email" value={newDmEmail} onChange={(e) => setNewDmEmail(e.target.value)} className="text-xs" />
            <Button size="sm" type="submit">DM</Button>
          </form>
        </div>
        <ScrollArea className="flex-1">
          {conversations?.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`block w-full border-b border-border/50 p-3 text-left text-sm hover:bg-muted ${activeId === c.id ? "bg-muted" : ""}`}
            >
              <p className="font-medium text-ink">{c.name || (c.type === "dm" ? "Direct message" : "Group")}</p>
              <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
            </button>
          ))}
          {(!conversations || conversations.length === 0) && (
            <p className="p-4 text-xs text-muted-foreground">No conversations yet. Start one above.</p>
          )}
        </ScrollArea>
      </Card>

      <Card className="flex flex-col overflow-hidden p-0">
        {activeId ? (
          <>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages?.map((m) => {
                const p = m.profiles as unknown as { full_name: string | null; email: string } | null;
                const mine = m.sender_id === me?.user.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-ink"}`}>
                      {!mine && <p className="mb-1 text-xs opacity-70">{p?.full_name || p?.email}</p>}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" />
              <Button type="submit">Send</Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Select or start a conversation.
          </div>
        )}
      </Card>
    </div>
  );
}
