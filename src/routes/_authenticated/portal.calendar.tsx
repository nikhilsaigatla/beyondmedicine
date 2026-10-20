import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  format,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { downloadCalendar, type CalendarEntry } from "@/lib/portal/calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export const Route = createFileRoute("/_authenticated/portal/calendar")({
  component: CalendarPage,
});
function CalendarPage() {
  const { data: me } = useCurrentUser();
  const [view, setView] = useState<"month" | "week" | "agenda">("month");
  const [date, setDate] = useState(new Date());
  const query = useQuery({
    queryKey: ["portal-calendar", me?.user.id],
    enabled: !!me,
    refetchInterval: 30000,
    queryFn: async () => {
      const results = await Promise.all([
        supabase.from("meetings").select("*"),
        supabase.from("portal_events").select("*").eq("cancelled", false),
        supabase
          .from("assignments")
          .select("id,title,due_date,status")
          .eq("status", "published")
          .not("due_date", "is", null),
        supabase.from("interview_bookings").select("*"),
        supabase.from("interview_slots").select("*"),
        supabase
          .from("tasks")
          .select("id,title,due_date")
          .eq("assignee_id", me!.user.id)
          .neq("status", "completed"),
        supabase
          .from("admissions_assignments")
          .select("id,title,due_at")
          .eq("status", "published")
          .not("due_at", "is", null),
      ]);
      for (const r of results) if (r.error) throw r.error;
      const [meetings, events, assignments, bookings, slots, tasks, admissions] = results;
      const entries: CalendarEntry[] = [
        ...(meetings.data ?? []).map((m) => ({
          ...m,
          id: `meeting-${m.id}`,
          kind: "Meeting",
          link: "/portal/meetings",
        })),
        ...(events.data ?? []).map((e) => ({
          ...e,
          id: `event-${e.id}`,
          kind: "Event",
          link: "/portal/events",
        })),
        ...(assignments.data ?? []).map((a) => ({
          id: `assignment-${a.id}`,
          title: a.title,
          starts_at: a.due_date!,
          kind: "Assignment deadline",
          link: "/portal/courses?section=assignments",
        })),
        ...(admissions.data ?? []).map((a) => ({
          id: `admissions-${a.id}`,
          title: a.title,
          starts_at: a.due_at!,
          kind: "Admissions deadline",
          link: "/portal/admissions",
        })),
        ...(slots.data ?? [])
          .filter((s) => bookings.data?.some((b) => b.slot_id === s.id))
          .map((s) => ({
            id: `interview-${s.id}`,
            title: "Cohort interview",
            starts_at: s.starts_at,
            ends_at: s.ends_at,
            kind: "Interview",
            link: "/portal/cohorts",
          })),
        ...(tasks.data ?? [])
          .filter((t) => t.due_date)
          .map((t) => ({
            id: `task-${t.id}`,
            title: t.title,
            starts_at: new Date(`${t.due_date}T23:59:00`).toISOString(),
            kind: "Task deadline",
            link: "/portal",
          })),
      ];
      for (const e of events.data ?? [])
        if (e.registration_deadline)
          entries.push({
            id: `registration-${e.id}`,
            title: `Register: ${e.title}`,
            starts_at: e.registration_deadline,
            kind: "Registration deadline",
            link: "/portal/events",
          });
      return entries.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    },
  });
  const start = view === "week" ? startOfWeek(date) : startOfWeek(startOfMonth(date));
  const end = view === "week" ? endOfWeek(date) : endOfWeek(endOfMonth(date));
  const days = eachDayOfInterval({ start, end });
  function move(n: number) {
    setDate(
      view === "month"
        ? addMonths(date, n)
        : view === "week"
          ? addWeeks(date, n)
          : addDays(date, n * 30),
    );
  }
  function entry(e: CalendarEntry) {
    return (
      <a
        key={e.id}
        href={e.link || "/portal"}
        className="block rounded-lg border border-primary/15 bg-primary/5 p-2 text-xs hover:bg-primary/10"
      >
        <span className="block font-medium">{e.title}</span>
        <span className="text-muted-foreground">
          {format(new Date(e.starts_at), "p")} | {e.kind}
        </span>
      </a>
    );
  }
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">Calendar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your events, meetings, interviews, assignments, and registration deadlines. All times are
          local.
        </p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" aria-label="Previous period" onClick={() => move(-1)}>
            Previous
          </Button>
          <Button variant="outline" onClick={() => setDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" aria-label="Next period" onClick={() => move(1)}>
            Next
          </Button>
          <h2 className="ml-2 font-medium">{format(date, "MMMM yyyy")}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["month", "week", "agenda"] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "outline"}
              onClick={() => setView(v)}
              className="capitalize"
            >
              {v}
            </Button>
          ))}
          <Button
            variant="outline"
            disabled={!query.data?.length}
            onClick={() => downloadCalendar(query.data || [])}
          >
            Download calendar
          </Button>
        </div>
      </div>
      {query.isLoading && <p role="status">Loading your calendar...</p>}
      {query.error && (
        <p role="alert" className="text-destructive">
          Could not load calendar: {query.error.message}
        </p>
      )}
      {view === "agenda" ? (
        <div className="space-y-3">
          {query.data
            ?.filter(
              (e) =>
                new Date(e.starts_at) >=
                new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            )
            .map((e) => (
              <Card key={e.id} className="p-4">
                <p className="mb-2 text-sm text-muted-foreground">
                  {format(new Date(e.starts_at), "EEEE, MMMM d, yyyy")}
                </p>
                {entry(e)}
              </Card>
            ))}
          {query.data &&
            !query.data.some(
              (e) =>
                new Date(e.starts_at) >=
                new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            ) && (
              <Card className="p-8 text-center text-muted-foreground">
                Nothing scheduled after this date.
              </Card>
            )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 bg-muted">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-3 text-center text-xs font-medium">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`min-h-32 space-y-2 border-t border-r p-2 ${isSameMonth(day, date) ? "" : "bg-muted/40"} ${isSameDay(day, new Date()) ? "ring-1 ring-inset ring-primary" : ""}`}
                >
                  <p className="text-sm font-medium">{format(day, "d")}</p>
                  {query.data?.filter((e) => isSameDay(new Date(e.starts_at), day)).map(entry)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
