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
import { MAILING_LIST_DIVISIONS } from "@/lib/portal/labels";
import { POSITION_DIVISION, type PositionTitle } from "@/lib/portal/labels";
import { sendBrevoEmail } from "@/lib/api/brevo.functions";

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
  const [emailNotify, setEmailNotify] = useState(false);
  const [emailDivision, setEmailDivision] = useState<string>(MAILING_LIST_DIVISIONS[0]);
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
      email_notify: emailNotify,
      email_division: emailNotify ? emailDivision : null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (emailNotify) {
      const [{ data: profiles }, { data: positions }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, verification_status").eq("verification_status", "verified"),
        supabase.from("user_positions").select("user_id, position"),
      ]);
      const recipients = (profiles ?? []).flatMap((profile) => {
        const position = (positions ?? []).find((item) => item.user_id === profile.id)?.position as PositionTitle | undefined;
        const division = position ? POSITION_DIVISION[position] : "General Membership";
        return emailDivision === "All verified members" || division === emailDivision
          ? [{ email: profile.email, name: profile.full_name ?? undefined }]
          : [];
      });
      if (recipients.length === 0) {
        toast.error("Announcement published, but no verified recipients matched this audience.");
      }
      try {
        if (recipients.length > 0) {
          await sendBrevoEmail({
            data: { subject: title, textContent: body, recipients },
          });
          toast.success(`Announcement emailed to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`);
        }
      } catch (emailError) {
        toast.error(emailError instanceof Error ? emailError.message : "Announcement published, but email delivery failed.");
      }
    }
    toast.success("Announcement published");
    setTitle(""); setBody("");
    setEmailNotify(false); setEmailDivision(MAILING_LIST_DIVISIONS[0]);
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3">
                <Switch id="email-notify" checked={emailNotify} onCheckedChange={setEmailNotify} />
                <Label htmlFor="email-notify" className="cursor-pointer">Email this announcement to the mailing list</Label>
              </div>
              <Switch id="ack" checked={requiresAck} onCheckedChange={setRequiresAck} />
              <Label htmlFor="ack" className="cursor-pointer">Require members to acknowledge</Label>
            </div>
            {emailNotify && (
              <div>
                <Label>Email audience</Label>
                <Select value={emailDivision} onValueChange={setEmailDivision}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MAILING_LIST_DIVISIONS.map((division) => <SelectItem key={division} value={division}>{division}</SelectItem>)}</SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">Delivery requires a configured email provider.</p>
              </div>
            )}
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
