import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/_authenticated/portal/help-desk")({ component: HelpDesk });
function HelpDesk() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [active, setActive] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const tickets = useQuery({
    queryKey: ["help-tickets", me?.user.id],
    enabled: !!me,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const replies = useQuery({
    queryKey: ["help-replies", active],
    enabled: !!active,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_replies")
        .select("*")
        .eq("ticket_id", active)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const officers = useQuery({
    queryKey: ["help-officers"],
    enabled: !!me?.isOfficer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id,role")
        .in("role", ["officer", "executive", "super_admin"]);
      if (error) throw error;
      const ids = [...new Set(data.map((r) => r.user_id))];
      if (!ids.length) return [];
      const result = await supabase.from("profiles").select("id,full_name").in("id", ids);
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const ticket = tickets.data?.find((t) => t.id === active);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      void qc.invalidateQueries({ queryKey: ["help-tickets"] });
      void qc.invalidateQueries({ queryKey: ["help-replies"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save Help Desk update");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">Beyond Medicine Help Desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask a private question and follow the conversation here. Only you and authorized officers
          can access your ticket.
        </p>
      </header>
      {(tickets.error || replies.error) && (
        <p role="alert" className="text-destructive">
          Could not load Help Desk conversations. Please retry.
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <Card className="space-y-4 p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const { data, error } = await supabase
                  .from("help_tickets")
                  .insert({ requester_id: me!.user.id, subject: subject.trim() })
                  .select()
                  .single();
                if (error) throw error;
                setSubject("");
                setActive(data.id);
              });
            }}
            className="space-y-3"
          >
            <label className="block">
              New question
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
                placeholder="Question subject"
              />
            </label>
            <Button disabled={busy || !me || !subject.trim()} className="w-full">
              Open private ticket
            </Button>
          </form>
          {tickets.isLoading && <p role="status">Loading tickets…</p>}
          {tickets.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">No questions yet.</p>
          )}
          {tickets.data?.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActive(t.id);
                setBody("");
              }}
              className={`w-full rounded-xl border p-3 text-left ${active === t.id ? "border-primary bg-primary/5" : ""}`}
            >
              <span className="block font-medium">{t.subject}</span>
              <span className="text-xs capitalize text-muted-foreground">
                {t.status} · {new Date(t.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </Card>
        <Card className="space-y-5 p-6">
          {ticket ? (
            <>
              <h2 className="font-display text-2xl">{ticket.subject}</h2>
              {me?.isOfficer && (
                <div className="flex flex-wrap gap-3">
                  <label>
                    Status
                    <select
                      className="ml-2 rounded border bg-background p-2"
                      value={ticket.status}
                      disabled={busy}
                      onChange={(e) =>
                        void act(async () => {
                          const { error } = await supabase
                            .from("help_tickets")
                            .update({ status: e.target.value })
                            .eq("id", active);
                          if (error) throw error;
                        })
                      }
                    >
                      {["open", "resolved", "escalated"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assigned officer
                    <select
                      className="ml-2 rounded border bg-background p-2"
                      value={ticket.assigned_to || ""}
                      disabled={busy}
                      onChange={(e) =>
                        void act(async () => {
                          const { error } = await supabase
                            .from("help_tickets")
                            .update({ assigned_to: e.target.value || null })
                            .eq("id", active);
                          if (error) throw error;
                        })
                      }
                    >
                      <option value="">Unassigned</option>
                      {officers.data?.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.full_name || o.id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <div className="max-h-[28rem] space-y-3 overflow-y-auto" aria-live="polite">
                {replies.data?.map((r) => (
                  <article key={r.id} className="rounded-xl border p-4">
                    <p className="text-xs text-muted-foreground">
                      {r.author_id === me?.user.id
                        ? "You"
                        : r.author_id === ticket.requester_id
                          ? "Member"
                          : "Officer"}{" "}
                      · {new Date(r.created_at).toLocaleString()}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
                  </article>
                ))}
              </div>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    const { error } = await supabase
                      .from("help_replies")
                      .insert({ ticket_id: active, author_id: me!.user.id, body: body.trim() });
                    if (error) throw error;
                    setBody("");
                  });
                }}
              >
                <label className="block">
                  Your reply
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    maxLength={10000}
                  />
                </label>
                <Button disabled={busy || !body.trim()}>Send private reply</Button>
              </form>
            </>
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              Choose a question or open a new private ticket.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
