import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { CohortApplication } from "@/lib/portal/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { downloadCalendar } from "@/lib/portal/calendar";
export const Route = createFileRoute("/_authenticated/portal/cohorts")({ component: CohortsPage });
const stages = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Interview Scheduling",
  "Under Review",
  "Decision Released",
];
function CohortsPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState({
    mentor_id: "",
    leader_id: "",
    cohort: "Both",
    starts_at: "",
    ends_at: "",
    meeting_link: "",
  });
  const apps = useQuery({
    queryKey: ["cohort-applications", me?.user.id],
    enabled: !!me,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cohort_applications")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const slots = useQuery({
    queryKey: ["cohort-slots"],
    enabled: !!me,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_interview_slots", {});
      if (error) throw error;
      return data;
    },
  });
  const bookings = useQuery({
    queryKey: ["cohort-bookings", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.from("interview_bookings").select("*");
      if (error) throw error;
      return data;
    },
  });
  const bookedSlots = useQuery({
    queryKey: ["booked-cohort-slots", bookings.data],
    enabled: !!bookings.data?.length,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_slots")
        .select("*")
        .in(
          "id",
          bookings.data!.map((b) => b.slot_id),
        );
      if (error) throw error;
      return data;
    },
  });
  const reviewers = useQuery({
    queryKey: ["cohort-reviewers"],
    enabled: !!me && (me.isMentor || me.isOfficer),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_reviewers", {});
      if (error) throw error;
      return data;
    },
  });
  const courses = useQuery({
    queryKey: ["cohort-placement-courses"],
    enabled: !!me?.isOfficer,
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id,title");
      if (error) throw error;
      return data;
    },
  });
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await Promise.all(
        [
          "cohort-applications",
          "cohort-slots",
          "cohort-bookings",
          "my-cohort",
          "portal-calendar",
        ].map((k) => qc.invalidateQueries({ queryKey: [k] })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cohort update failed");
    } finally {
      setBusy(false);
    }
  }
  const names = useQuery({
    queryKey: ["cohort-member-names"],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_directory", {});
      if (error) throw error;
      return data;
    },
  });
  const own = apps.data?.find((a) => a.user_id === me?.user.id);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="font-display text-4xl">Cohort applications</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Build your research portfolio, meet the reviewers, and follow your cohort placement.
        </p>
      </header>
      {(apps.error || slots.error || bookings.error || bookedSlots.error) && (
        <p role="alert" className="text-destructive">
          Could not load cohort information. Please retry.
        </p>
      )}
      {apps.isLoading && <p role="status">Loading applications…</p>}
      {own && (
        <>
          <ol className="flex flex-wrap gap-2" aria-label="Application stages">
            {stages.map((s, i) => (
              <li
                key={s}
                aria-current={own.status === s ? "step" : undefined}
                className={`rounded-full border px-3 py-2 text-xs ${stages.indexOf(own.status) >= i ? "border-primary bg-primary/10" : "text-muted-foreground"}`}
              >
                {i + 1}. {s}
              </li>
            ))}
          </ol>
          <Portfolio key={own.id + own.updated_at} application={own} busy={busy} act={act} />
          {own.status === "Interview Scheduling" && (
            <Card className="space-y-4 p-6">
              <h2 className="font-display text-2xl">Choose an available interview</h2>
              <p className="text-sm text-muted-foreground">
                Each slot includes a mentor and program leadership. Times are local.
              </p>
              {slots.data
                ?.filter((s) => s.cohort === "Both" || s.cohort === own.cohort)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                  >
                    <span>
                      {new Date(s.starts_at).toLocaleString()} –{" "}
                      {new Date(s.ends_at).toLocaleTimeString()}
                      <span className="block text-xs text-muted-foreground">
                        {names.data?.find((n) => n.id === s.mentor_id)?.full_name || "Mentor"} and{" "}
                        {names.data?.find((n) => n.id === s.leader_id)?.full_name ||
                          "Program leader"}
                      </span>
                    </span>
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          const { error } = await supabase.rpc("book_cohort_interview", {
                            _slot: s.id,
                          });
                          if (error) throw error;
                          toast.success("Interview booked");
                        })
                      }
                    >
                      Book interview
                    </Button>
                  </div>
                ))}
              {slots.data?.filter((s) => s.cohort === "Both" || s.cohort === own.cohort).length ===
                0 && (
                <p className="text-sm text-muted-foreground">
                  Reviewers have no open slots yet. Please check back or contact the Help Desk.
                </p>
              )}
            </Card>
          )}
          {bookings.data
            ?.filter((b) => b.application_id === own.id)
            .map((b) => {
              const s = bookedSlots.data?.find((s) => s.id === b.slot_id);
              return s ? (
                <Card key={b.id} className="space-y-3 p-6">
                  <h2 className="font-display text-xl">Your interview</h2>
                  <p>{new Date(s.starts_at).toLocaleString()}</p>
                  <div className="flex gap-4">
                    <a
                      className="text-primary underline"
                      target="_blank"
                      rel="noreferrer"
                      href={s.meeting_link}
                    >
                      Join interview
                    </a>
                    <button
                      className="text-primary underline"
                      onClick={() =>
                        downloadCalendar([{ ...s, title: "Beyond Medicine cohort interview" }])
                      }
                    >
                      Add to calendar
                    </button>
                  </div>
                </Card>
              ) : null;
            })}
        </>
      )}
      {!own && !apps.isLoading && (
        <Card className="p-6 text-sm text-muted-foreground">
          Intermediate and advanced cohort applications appear here after general membership
          approval when you selected that interest during registration. Contact the Help Desk to
          update your cohort interest.
        </Card>
      )}
      {(me?.isOfficer || me?.isMentor) && (
        <Card className="space-y-4 p-6">
          <h2 className="font-display text-2xl">Offer interview availability</h2>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void act(async () => {
                const { error } = await supabase.from("interview_slots").insert({
                  ...slot,
                  mentor_id: me?.isOfficer ? slot.mentor_id : me!.user.id,
                  starts_at: new Date(slot.starts_at).toISOString(),
                  ends_at: new Date(slot.ends_at).toISOString(),
                });
                if (error) throw error;
                setSlot({ ...slot, starts_at: "", ends_at: "" });
                toast.success("Interview availability added");
              });
            }}
          >
            {me?.isOfficer && (
              <label>
                Mentor
                <select
                  className="block w-full rounded border bg-background p-2"
                  required
                  value={slot.mentor_id}
                  onChange={(e) => setSlot({ ...slot, mentor_id: e.target.value })}
                >
                  <option value="">Choose mentor</option>
                  {reviewers.data
                    ?.filter((r) => r.is_mentor)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.full_name || r.id}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label>
              Program leader
              <select
                className="block w-full rounded border bg-background p-2"
                required
                value={slot.leader_id}
                onChange={(e) => setSlot({ ...slot, leader_id: e.target.value })}
              >
                <option value="">Choose leader</option>
                {reviewers.data
                  ?.filter((r) => r.is_officer)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.full_name || r.id}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Cohort
              <select
                className="block w-full rounded border bg-background p-2"
                value={slot.cohort}
                onChange={(e) => setSlot({ ...slot, cohort: e.target.value })}
              >
                {["Both", "Intermediate", "Advanced"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            {(["starts_at", "ends_at", "meeting_link"] as const).map((k) => (
              <label key={k}>
                {k === "starts_at" ? "Starts at" : k === "ends_at" ? "Ends at" : "Meeting link"}
                <Input
                  type={k === "meeting_link" ? "url" : "datetime-local"}
                  required
                  value={slot[k]}
                  onChange={(e) => setSlot({ ...slot, [k]: e.target.value })}
                />
              </label>
            ))}
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input type="checkbox" required />I have confirmed both reviewers are available at
              this time.
            </label>
            <Button disabled={busy}>Add available slot</Button>
          </form>
          <div className="space-y-2">
            {slots.data
              ?.filter((s) => me.isOfficer || s.mentor_id === me.user.id)
              .map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm"
                >
                  <span>
                    {new Date(s.starts_at).toLocaleString()} · {s.cohort}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        const { error } = await supabase
                          .from("interview_slots")
                          .delete()
                          .eq("id", s.id);
                        if (error) throw error;
                        toast.success("Availability removed");
                      })
                    }
                  >
                    Remove available slot
                  </Button>
                </div>
              ))}
          </div>
        </Card>
      )}
      {(me?.isOfficer || me?.isMentor) && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl">Application review</h2>
          {apps.data
            ?.filter((a) => a.user_id !== me?.user.id)
            .map((a) => (
              <ReviewApplication
                key={a.id + a.updated_at}
                application={a}
                applicantName={names.data?.find((n) => n.id === a.user_id)?.full_name || a.user_id}
                canDecide={!!me.isOfficer}
                courses={courses.data || []}
                busy={busy}
                act={act}
                interview={bookedSlots.data?.find((s) =>
                  bookings.data?.some((b) => b.application_id === a.id && b.slot_id === s.id),
                )}
              />
            ))}
        </section>
      )}
    </div>
  );
}
function Portfolio({
  application: a,
  busy,
  act,
}: {
  application: CohortApplication;
  busy: boolean;
  act: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    topic: a.topic,
    experience: a.experience,
    skills: a.skills,
    previous_work: a.previous_work,
  });
  const [file, setFile] = useState<File | null>(null);
  const editable = ["Not Started", "In Progress"].includes(a.status);
  async function save(submit: boolean) {
    let path = a.paper_path;
    if (file) {
      if (file.size > 20 * 1024 * 1024) throw new Error("Paper must be under 20 MB");
      path = `${a.user_id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("cohort-portfolios").upload(path, file);
      if (error) throw error;
    }
    const { error } = await supabase.rpc("save_cohort_portfolio", {
      _topic: form.topic,
      _experience: form.experience,
      _skills: form.skills,
      _previous_work: form.previous_work,
      _paper_path: path,
      _submit: submit,
    });
    if (error) throw error;
    toast.success(submit ? "Portfolio submitted" : "Draft saved");
  }
  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-display text-2xl">{a.cohort} research portfolio</h2>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void act(() => save(true));
        }}
      >
        {(["topic", "experience", "skills", "previous_work"] as const).map((k) => (
          <label key={k} className="block space-y-1">
            <span>
              {
                {
                  topic: "Research topic",
                  experience: "Research experience",
                  skills: "Skills and expertise",
                  previous_work: "Previous work and links",
                }[k]
              }
            </span>
            <Textarea
              required
              disabled={!editable || busy}
              value={form[k]}
              onChange={(e) => setForm({ ...form, [k]: e.target.value })}
            />
          </label>
        ))}
        {a.paper_path && (
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => void openPaper(a.paper_path!)}
          >
            View uploaded paper
          </button>
        )}
        {editable && (
          <>
            <label className="block">
              Research paper (PDF or DOCX, up to 20 MB)
              <Input
                type="file"
                accept=".pdf,.docx"
                required={!a.paper_path}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void act(() => save(false))}
              >
                Save draft
              </Button>
              <Button disabled={busy}>Submit portfolio</Button>
            </div>
          </>
        )}
      </form>
      {a.status === "Decision Released" && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h3 className="font-medium">Cohort decision</h3>
          <p className="mt-2 whitespace-pre-wrap">{a.decision}</p>
          {a.placement_course_id && (
            <Link to="/portal/courses" className="mt-2 inline-block text-primary underline">
              Open your assigned course
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
async function openPaper(path: string) {
  const { data, error } = await supabase.storage
    .from("cohort-portfolios")
    .createSignedUrl(path, 60);
  if (error) {
    toast.error(error.message);
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
function ReviewApplication({
  application: a,
  applicantName,
  canDecide,
  courses,
  busy,
  act,
  interview,
}: {
  application: CohortApplication;
  applicantName: string;
  canDecide: boolean;
  courses: { id: string; title: string }[];
  busy: boolean;
  act: (fn: () => Promise<void>) => Promise<void>;
  interview?: { starts_at: string; meeting_link: string };
}) {
  const [decision, setDecision] = useState(a.decision || "");
  const [course, setCourse] = useState(a.placement_course_id || "");
  async function review(status: string) {
    const { error } = await supabase.rpc("review_cohort_application", {
      _application: a.id,
      _status: status,
      _decision: decision,
      _course: course || null,
    });
    if (error) throw error;
    toast.success("Application updated");
  }
  return (
    <Card className="space-y-3 p-6">
      <h3 className="font-display text-xl">
        {a.cohort}: {a.topic || "Portfolio not started"}
      </h3>
      <p className="text-sm text-muted-foreground">
        Applicant: {applicantName} · {a.status}
      </p>
      {(["experience", "skills", "previous_work"] as const).map((k) => (
        <p key={k} className="whitespace-pre-wrap text-sm">
          <strong className="capitalize">{k.replace("_", " ")}: </strong>
          {a[k]}
        </p>
      ))}
      {a.paper_path && (
        <button className="text-primary underline" onClick={() => void openPaper(a.paper_path!)}>
          Open research paper
        </button>
      )}
      {interview && (
        <p className="text-sm">
          Interview: {new Date(interview.starts_at).toLocaleString()} ·{" "}
          <a
            href={interview.meeting_link}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            Join
          </a>
        </p>
      )}
      {canDecide && (
        <>
          {a.status === "Submitted" && (
            <Button disabled={busy} onClick={() => void act(() => review("Interview Scheduling"))}>
              Invite to schedule interview
            </Button>
          )}
          {["Submitted", "Interview Scheduling", "Under Review"].includes(a.status) && (
            <div className="space-y-3 border-t pt-4">
              <label className="block">
                Decision and interview notes
                <Textarea value={decision} onChange={(e) => setDecision(e.target.value)} />
              </label>
              <label className="block">
                Final course placement
                <select
                  className="ml-2 rounded border bg-background p-2"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                >
                  <option value="">No placement</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                disabled={busy || !decision.trim()}
                onClick={() => void act(() => review("Decision Released"))}
              >
                Release decision and placement
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
