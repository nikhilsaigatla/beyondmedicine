import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { data: meetings } = useQuery({
    queryKey: ["calendar-meetings"],
    queryFn: async () => {
      const { data } = await supabase.from("meetings").select("*").order("starts_at", { ascending: true });
      return data ?? [];
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upcoming meetings, workshops, and organizational events.</p>
      </div>
      <div className="grid gap-3">
        {meetings?.length === 0 && (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            <CalendarIcon className="mx-auto mb-2 h-8 w-8" />
            Nothing scheduled yet.
          </Card>
        )}
        {meetings?.map((m) => (
          <Card key={m.id} className="flex items-start gap-4 p-5">
            <div className="rounded-lg border border-border bg-muted px-3 py-2 text-center">
              <p className="text-xs uppercase text-muted-foreground">{format(new Date(m.starts_at), "MMM")}</p>
              <p className="font-display text-2xl text-ink">{format(new Date(m.starts_at), "d")}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-ink">{m.title}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(m.starts_at), "EEEE, p")}</p>
              {m.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.description}</p>}
              {m.meeting_link && (
                <a href={m.meeting_link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Join meeting <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}