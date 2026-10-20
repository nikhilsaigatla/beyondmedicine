import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { PortalEvent } from "@/lib/portal/schema";
import { downloadCalendar, googleCalendarLink, outlookCalendarLink } from "@/lib/portal/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
export const Route = createFileRoute("/_authenticated/portal/events")({ component: EventsPage });
const empty = {
  title: "",
  description: "",
  starts_at: "",
  ends_at: "",
  location: "",
  meeting_link: "",
  requirements: "",
  capacity: "",
  registration_deadline: "",
  reminder_hours: "",
  course_id: "",
  cancelled: false,
};
function localDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function EventsPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const events = useQuery({
    queryKey: ["portal-events", me?.user.id],
    enabled: !!me,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.from("portal_events").select("*").order("starts_at");
      if (error) throw error;
      return data;
    },
  });
  const regs = useQuery({
    queryKey: ["event-registrations", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("user_id", me!.user.id);
      if (error) throw error;
      return data;
    },
  });
  const counts = useQuery({
    queryKey: ["event-counts"],
    enabled: !!me,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_event_counts", {});
      if (error) throw error;
      return data;
    },
  });
  const courses = useQuery({
    queryKey: ["event-courses", me?.user.id],
    enabled: !!me && (me.isMentor || me.isOfficer),
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id,title,mentor_id");
      if (error) throw error;
      return data;
    },
  });
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["portal-events"] }),
        qc.invalidateQueries({ queryKey: ["event-registrations"] }),
        qc.invalidateQueries({ queryKey: ["event-counts"] }),
        qc.invalidateQueries({ queryKey: ["portal-calendar"] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Event update failed");
    } finally {
      setBusy(false);
    }
  }
  function edit(e: PortalEvent) {
    setEditing(e.id);
    setForm({
      ...e,
      meeting_link: e.meeting_link || "",
      course_id: e.course_id || "",
      starts_at: localDate(e.starts_at),
      ends_at: localDate(e.ends_at),
      registration_deadline: localDate(e.registration_deadline),
      capacity: e.capacity?.toString() || "",
      reminder_hours: e.reminder_hours?.toString() || "",
    });
    setShowForm(true);
  }
  async function save() {
    if (!me) return;
    const payload = {
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      registration_deadline: form.registration_deadline
        ? new Date(form.registration_deadline).toISOString()
        : null,
      capacity: form.capacity ? Number(form.capacity) : null,
      reminder_hours: form.reminder_hours ? Number(form.reminder_hours) : null,
      course_id: form.course_id || null,
      meeting_link: form.meeting_link || null,
      created_by: me.user.id,
    };
    const { error } = editing
      ? await supabase.from("portal_events").update(payload).eq("id", editing)
      : await supabase.from("portal_events").insert(payload);
    if (error) throw error;
    setShowForm(false);
    setEditing(null);
    setForm(empty);
    toast.success("Event saved");
  }
  const visible = events.data?.filter((e) =>
    `${e.title} ${e.description} ${e.location}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Events directory</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Workshops, program events, and mentorship meetings. Times are shown in your local
            timezone.
          </p>
        </div>
        {(me?.isOfficer || me?.isMentor) && (
          <Button
            onClick={() => {
              setEditing(null);
              setForm(empty);
              setShowForm(!showForm);
            }}
          >
            Create event or meeting
          </Button>
        )}
      </header>
      <Input
        aria-label="Search events"
        placeholder="Search events, topics, or locations"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {showForm && (
        <Card className="p-6">
          <h2 className="mb-4 font-display text-2xl">{editing ? "Edit event" : "Create event"}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(save);
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {(
              [
                "title",
                "starts_at",
                "ends_at",
                "location",
                "meeting_link",
                "registration_deadline",
                "capacity",
                "reminder_hours",
              ] as const
            ).map((k) => (
              <label key={k} className="space-y-1 text-sm">
                <span>
                  {
                    {
                      title: "Title",
                      starts_at: "Starts at",
                      ends_at: "Ends at",
                      location: "Location",
                      meeting_link: "Meeting link",
                      registration_deadline: "Registration deadline",
                      capacity: "Capacity (optional)",
                      reminder_hours: "Additional reminder (hours before)",
                    }[k]
                  }
                </span>
                <Input
                  type={
                    k.includes("_at") || k === "registration_deadline"
                      ? "datetime-local"
                      : k === "capacity" || k === "reminder_hours"
                        ? "number"
                        : k === "meeting_link"
                          ? "url"
                          : "text"
                  }
                  min={k === "capacity" || k === "reminder_hours" ? 1 : undefined}
                  value={form[k]}
                  required={["title", "starts_at", "ends_at"].includes(k)}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                />
              </label>
            ))}
            <label className="space-y-1 text-sm">
              Course audience
              <select
                required={!me?.isOfficer}
                className="block w-full rounded-md border bg-background p-2"
                value={form.course_id}
                onChange={(e) => setForm({ ...form, course_id: e.target.value })}
              >
                <option value="">
                  {me?.isOfficer ? "All approved members" : "Choose your course"}
                </option>
                {courses.data
                  ?.filter((c) => me?.isOfficer || c.mentor_id === me?.user.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              Registration requirements
              <Input
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              Description
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            {editing && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.cancelled}
                  onChange={(e) => setForm({ ...form, cancelled: e.target.checked })}
                />
                Cancel event and notify registrants
              </label>
            )}
            <div className="flex gap-2">
              <Button disabled={busy}>Save event</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Close
              </Button>
            </div>
          </form>
        </Card>
      )}
      {(events.error || regs.error || counts.error) && (
        <p role="alert" className="text-destructive">
          Could not load event information. Please retry.
        </p>
      )}
      {events.isLoading && <p role="status">Loading events…</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {visible?.map((e) => {
          const registered = regs.data?.some((r) => r.event_id === e.id);
          const count = counts.data?.find((c) => c.event_id === e.id)?.registration_count ?? 0;
          const full = e.capacity !== null && count >= e.capacity;
          const closed =
            e.cancelled ||
            new Date(e.starts_at) < new Date() ||
            !!(e.registration_deadline && new Date(e.registration_deadline) < new Date());
          return (
            <Card key={e.id} className="space-y-4 p-6">
              <div>
                <h2 className="font-display text-2xl">{e.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(e.starts_at).toLocaleString()} –{" "}
                  {new Date(e.ends_at).toLocaleTimeString()}
                </p>
              </div>
              <p className="whitespace-pre-wrap text-sm">{e.description}</p>
              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="inline font-medium">Location: </dt>
                  <dd className="inline">{e.location || "Online"}</dd>
                </div>
                {e.requirements && (
                  <div>
                    <dt className="inline font-medium">Requirements: </dt>
                    <dd className="inline">{e.requirements}</dd>
                  </div>
                )}
                {e.capacity && (
                  <div>
                    <dt className="inline font-medium">Availability: </dt>
                    <dd className="inline">
                      {Math.max(0, e.capacity - count)} of {e.capacity} places remaining
                    </dd>
                  </div>
                )}
                {e.registration_deadline && (
                  <div>
                    <dt className="inline font-medium">Register by: </dt>
                    <dd className="inline">{new Date(e.registration_deadline).toLocaleString()}</dd>
                  </div>
                )}
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={
                    busy ||
                    regs.isLoading ||
                    !!regs.error ||
                    (!registered && (closed || full || counts.isLoading || !!counts.error))
                  }
                  variant={registered ? "outline" : "default"}
                  onClick={() =>
                    void act(async () => {
                      const { error } = await supabase.rpc("register_portal_event", {
                        _event: e.id,
                        _cancel: registered,
                      });
                      if (error) throw error;
                      toast.success(
                        registered ? "Registration cancelled" : "Registration confirmed",
                      );
                    })
                  }
                >
                  {registered
                    ? "Cancel registration"
                    : e.cancelled
                      ? "Cancelled"
                      : closed
                        ? "Registration closed"
                        : full
                          ? "Event full"
                          : "Register"}
                </Button>
                {(me?.isOfficer ||
                  courses.data?.some(
                    (c) => c.id === e.course_id && c.mentor_id === me?.user.id,
                  )) && (
                  <Button variant="outline" onClick={() => edit(e)}>
                    Edit event
                  </Button>
                )}
                {registered && e.meeting_link && (
                  <a
                    className="p-2 text-sm text-primary underline"
                    href={e.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Join meeting
                  </a>
                )}
              </div>
              {registered && !e.cancelled && (
                <div className="flex flex-wrap gap-3 border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Add to calendar:</span>
                  <a
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                    href={googleCalendarLink(e)}
                  >
                    Google
                  </a>
                  <a
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                    href={outlookCalendarLink(e)}
                  >
                    Outlook
                  </a>
                  <button className="text-primary underline" onClick={() => downloadCalendar([e])}>
                    Apple / .ics file
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {visible?.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No matching events. Check back soon.
        </Card>
      )}
    </div>
  );
}
