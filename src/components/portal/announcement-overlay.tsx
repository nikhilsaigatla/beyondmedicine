import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-current-user";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Bell } from "lucide-react";
import { toast } from "sonner";

export function AnnouncementOverlay() {
  const { user } = useAuthUser();
  const qc = useQueryClient();

  const { data: pending } = useQuery({
    queryKey: ["pending-announcements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: anns } = await supabase
        .from("announcements")
        .select("*")
        .eq("requires_ack", true)
        .order("created_at", { ascending: false });
      const { data: acks } = await supabase
        .from("announcement_acks")
        .select("announcement_id")
        .eq("user_id", user!.id);
      const ackedIds = new Set((acks ?? []).map((a) => a.announcement_id));
      return (anns ?? []).filter((a) => !ackedIds.has(a.id));
    },
    refetchInterval: 60_000,
  });

  const current = pending?.[0];
  if (!current) return null;

  async function acknowledge() {
    if (!current || !user) return;
    const { error } = await supabase
      .from("announcement_acks")
      .insert({ announcement_id: current.id, user_id: user.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["pending-announcements"] });
  }

  const priorityMeta = {
    urgent: { label: "Urgent", color: "destructive" as const, Icon: AlertTriangle },
    high: { label: "Important", color: "default" as const, Icon: Bell },
    normal: { label: "Announcement", color: "secondary" as const, Icon: Info },
  };
  const meta = priorityMeta[current.priority as keyof typeof priorityMeta];
  const Icon = meta.Icon;

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <Badge variant={meta.color}>{meta.label}</Badge>
          </div>
          <DialogTitle className="text-2xl">{current.title}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
            {current.body}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={acknowledge}>I acknowledge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
