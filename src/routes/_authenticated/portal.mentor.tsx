import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/portal/mentor")({
  component: MentorDashboard,
});

function MentorDashboard() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const { data: students } = useQuery({
    queryKey: ["mentor-students", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_students")
        .select("student_id, profiles:student_id(full_name, email, avatar_url)")
        .eq("mentor_id", me!.user.id);
      return data ?? [];
    },
  });

  const { data: myCourses } = useQuery({
    queryKey: ["mentor-courses", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("mentor_id", me!.user.id);
      return data ?? [];
    },
  });

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    const { error } = await supabase.from("courses").insert({ mentor_id: me.user.id, title, description: desc });
    if (error) { toast.error(error.message); return; }
    toast.success("Course created");
    setTitle(""); setDesc("");
    qc.invalidateQueries({ queryKey: ["mentor-courses"] });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Mentor Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your students, courses, and assignments.</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-display text-xl text-ink">Your students</h2>
        {students && students.length > 0 ? (
          <ul className="divide-y divide-border">
            {students.map((s) => {
              const p = s.profiles as unknown as { full_name: string | null; email: string } | null;
              return (
                <li key={s.student_id} className="py-3">
                  <p className="font-medium text-ink">{p?.full_name || p?.email}</p>
                  <p className="text-xs text-muted-foreground">{p?.email}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No students assigned yet.</p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-display text-xl text-ink">Your courses</h2>
        <ul className="mb-6 space-y-2">
          {myCourses?.map((c) => (
            <li key={c.id} className="rounded-lg border border-border p-3">
              <p className="font-medium text-ink">{c.title}</p>
              {c.description && <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>}
            </li>
          ))}
          {(!myCourses || myCourses.length === 0) && (
            <p className="text-sm text-muted-foreground">You haven't created a course yet.</p>
          )}
        </ul>
        <form onSubmit={createCourse} className="space-y-3 border-t border-border pt-4">
          <h3 className="font-medium text-ink">Create a course</h3>
          <div>
            <Label htmlFor="c-title">Title</Label>
            <Input id="c-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="c-desc">Description</Label>
            <Textarea id="c-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <Button type="submit">Create course</Button>
        </form>
      </Card>
    </div>
  );
}
