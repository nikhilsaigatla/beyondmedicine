import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/portal/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [audience, setAudience] = useState<"all" | "executive" | "officers" | "board" | "mentors" | "members">("all");
  const [requiresAck, setRequiresAck] = useState(true);
  const [busy, setBusy] = useState(false);

  const { data: announcements } = useQuery({
    queryKey: ["announcements-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*, profiles:author_id(full_name, email)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setBusy(true);
    const { error } = await supabase.from("announcements").insert({
      author_id: me.user.id, title, body, priority, audience, requires_ack: requiresAck,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement published");
    setTitle(""); setBody("");
    qc.invalidateQueries({ queryKey: ["announcements-all"] });
    qc.invalidateQueries({ queryKey: ["announcements-recent"] });
    qc.invalidateQueries({ queryKey: ["pending-announcements"] });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Announcements</h1>
        <p className="mt-1 text-sm text-muted-foreground">Official updates from Beyond Medicine leadership.</p>
      </div>

      {me?.isOfficer && (
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl text-ink">New announcement</h2>
          <form onSubmit={publish} className="space-y-4">
            <div>
              <Label htmlFor="a-title">Title</Label>
              <Input id="a-title" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label htmlFor="a-body">Message</Label>
              <Textarea id="a-body" required rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Audience</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Everyone</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="officers">Officers</SelectItem>
                    <SelectItem value="board">Board</SelectItem>
                    <SelectItem value="mentors">Mentors</SelectItem>
                    <SelectItem value="members">Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="ack" checked={requiresAck} onCheckedChange={setRequiresAck} />
              <Label htmlFor="ack" className="cursor-pointer">Require members to acknowledge</Label>
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish announcement"}</Button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {announcements?.map((a) => {
          const p = a.profiles as unknown as { full_name: string | null; email: string } | null;
          return (
            <Card key={a.id} className="p-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {a.priority !== "normal" && (
                  <Badge variant={a.priority === "urgent" ? "destructive" : "default"}>{a.priority}</Badge>
                )}
                <Badge variant="outline">{a.audience}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()} · {p?.full_name || p?.email}
                </span>
              </div>
              <h3 className="font-display text-xl text-ink">{a.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{a.body}</p>
            </Card>
          );
        })}
        {(!announcements || announcements.length === 0) && (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        )}
      </div>
    </div>
  );
}
