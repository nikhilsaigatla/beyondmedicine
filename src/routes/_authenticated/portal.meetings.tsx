import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/meetings")({
  component: MeetingsPage,
});

function MeetingsPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", starts_at: "", meeting_link: "", agenda: "" });

  const { data: meetings } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => (await supabase.from("meetings").select("*").order("starts_at", { ascending: false })).data ?? [],
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const { error } = await supabase.from("meetings").insert({
      title: form.title,
      description: form.description || null,
      starts_at: new Date(form.starts_at).toISOString(),
      meeting_link: form.meeting_link || null,
      agenda: form.agenda || null,
      created_by: me.user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Meeting created");
    setOpen(false);
    setForm({ title: "", description: "", starts_at: "", meeting_link: "", agenda: "" });
    qc.invalidateQueries({ queryKey: ["meetings"] });
    qc.invalidateQueries({ queryKey: ["calendar-meetings"] });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl text-ink">Meetings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Schedule, join, and archive notes for Beyond Medicine meetings.</p>
        </div>
        {me?.isOfficer && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-1 h-4 w-4" /> New meeting</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New meeting</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
                <div><Label>Starts at</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Meeting link (Zoom, etc.)</Label><Input type="url" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} /></div>
                <div><Label>Agenda</Label><Textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></div>
                <Button type="submit" className="w-full">Create meeting</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="grid gap-3">
        {meetings?.map((m) => (
          <Card key={m.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{m.title}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(m.starts_at), "PPpp")}</p>
                {m.description && <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>}
                {m.agenda && <p className="mt-2 whitespace-pre-wrap text-sm"><span className="font-medium">Agenda: </span>{m.agenda}</p>}
                {m.notes && <p className="mt-2 whitespace-pre-wrap text-sm"><span className="font-medium">Notes: </span>{m.notes}</p>}
              </div>
              {m.meeting_link && (
                <Button asChild variant="outline" size="sm">
                  <a href={m.meeting_link} target="_blank" rel="noreferrer">Join <ExternalLink className="ml-1 h-3 w-3" /></a>
                </Button>
              )}
            </div>
          </Card>
        ))}
        {meetings?.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No meetings yet.</p>}
      </div>
    </div>
  );
}