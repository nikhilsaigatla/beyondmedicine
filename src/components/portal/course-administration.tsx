import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
export function CourseDetailsEditor({
  course,
}: {
  course: { id: string; title: string; description: string | null };
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || "");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-6">
      <details>
        <summary className="cursor-pointer font-medium">Edit course title and description</summary>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const { error } = await supabase
                .from("courses")
                .update({ title: title.trim(), description: description.trim() || null })
                .eq("id", course.id);
              if (error) throw error;
              toast.success("Course updated");
              void qc.invalidateQueries({ queryKey: ["courses-workspace"] });
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not update course");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm">
            Title
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block text-sm">
            Description
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <Button disabled={busy || !title.trim()}>Save course details</Button>
        </form>
      </details>
    </Card>
  );
}
export function CourseAdministration() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [course, setCourse] = useState("");
  const [student, setStudent] = useState("");
  const [moveFrom, setMoveFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["course-administration"],
    enabled: !!me?.isOfficer,
    queryFn: async () => {
      const [c, e, p, r, a] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("course_enrollments").select("*"),
        supabase.from("profiles").select("id,full_name,email").eq("status", "active"),
        supabase.from("user_roles").select("user_id,role").eq("role", "mentor"),
        supabase.from("applications").select("user_id").eq("status", "approved"),
      ]);
      for (const result of [c, e, p, r, a]) if (result.error) throw result.error;
      return {
        courses: c.data!,
        enrollments: e.data!,
        profiles: p.data!.filter((p) => a.data!.some((a) => a.user_id === p.id)),
        mentors: r.data!,
      };
    },
  });
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      await Promise.all(
        [
          "course-administration",
          "courses-workspace",
          "course-workspace-enrollments",
          "mentor-courses",
          "mentor-students",
        ].map((k) => qc.invalidateQueries({ queryKey: [k] })),
      );
      toast.success("Course membership updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Course update failed");
    } finally {
      setBusy(false);
    }
  }
  if (!me?.isOfficer) return null;
  return (
    <Card className="space-y-4 p-6">
      <h2 className="font-display text-2xl">Officer course and cohort management</h2>
      {query.error && (
        <p role="alert" className="text-destructive">
          Could not load course administration.
        </p>
      )}
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            const { error } = await supabase.rpc("move_course_enrollment", {
              _student: student,
              _course: course,
              _from: moveFrom || null,
            });
            if (error) throw error;
          });
        }}
      >
        <label>
          Member
          <select
            required
            className="block w-full rounded border bg-background p-2"
            value={student}
            onChange={(e) => setStudent(e.target.value)}
          >
            <option value="">Choose member</option>
            {query.data?.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          Destination course
          <select
            required
            className="block w-full rounded border bg-background p-2"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          >
            <option value="">Choose course</option>
            {query.data?.courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Move from (optional)
          <select
            className="block w-full rounded border bg-background p-2"
            value={moveFrom}
            onChange={(e) => setMoveFrom(e.target.value)}
          >
            <option value="">Keep current enrollments</option>
            {query.data?.courses
              .filter((c) =>
                query.data.enrollments.some(
                  (e) => e.course_id === c.id && e.student_id === student,
                ),
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>
        </label>
        <Button disabled={busy || query.isLoading}>Enroll or move member</Button>
      </form>
      {query.data?.courses.map((c) => (
        <CourseRow
          key={c.id}
          course={c}
          profiles={query.data!.profiles}
          mentorIds={query.data!.mentors.map((r) => r.user_id)}
          enrollments={query.data!.enrollments.filter((e) => e.course_id === c.id)}
          busy={busy}
          act={act}
        />
      ))}
    </Card>
  );
}
function CourseRow({
  course: c,
  profiles,
  mentorIds,
  enrollments,
  busy,
  act,
}: {
  course: {
    id: string;
    title: string;
    description: string | null;
    mentor_id: string;
    cohort: string;
  };
  profiles: { id: string; full_name: string | null; email: string }[];
  mentorIds: string[];
  enrollments: { id: string; student_id: string }[];
  busy: boolean;
  act: (fn: () => Promise<void>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    title: c.title,
    description: c.description || "",
    mentor_id: c.mentor_id,
    cohort: c.cohort,
  });
  return (
    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer font-medium">
        {c.title} · {c.cohort} · {enrollments.length} enrolled
      </summary>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            const { error } = await supabase.from("courses").update(form).eq("id", c.id);
            if (error) throw error;
          });
        }}
      >
        <label>
          Title
          <Input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label>
          Cohort
          <Input
            required
            value={form.cohort}
            onChange={(e) => setForm({ ...form, cohort: e.target.value })}
          />
        </label>
        <label>
          Mentor
          <select
            required
            className="block w-full rounded border bg-background p-2"
            value={form.mentor_id}
            onChange={(e) => setForm({ ...form, mentor_id: e.target.value })}
          >
            <option value="">Choose mentor</option>
            {profiles
              .filter((p) => mentorIds.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </option>
              ))}
          </select>
        </label>
        <label>
          Description
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <Button disabled={busy}>Save course</Button>
      </form>
      <ul className="mt-4 divide-y">
        {enrollments.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>{profiles.find((p) => p.id === e.student_id)?.full_name || e.student_id}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  const { error } = await supabase
                    .from("course_enrollments")
                    .delete()
                    .eq("id", e.id);
                  if (error) throw error;
                })
              }
            >
              Remove enrollment
            </Button>
          </li>
        ))}
      </ul>
    </details>
  );
}
