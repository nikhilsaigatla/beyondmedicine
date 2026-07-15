import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { POSITION_LABEL } from "@/lib/portal/labels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BookOpen, GraduationCap, MessageSquare, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useCurrentUser();

  const { data: recentAnnouncements } = useQuery({
    queryKey: ["announcements-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("id, title, priority, created_at, author_id")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: myMentors } = useQuery({
    queryKey: ["my-mentors", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("mentor_students")
        .select("mentor_id, profiles:mentor_id(full_name, email, avatar_url)")
        .eq("student_id", me!.user.id);
      return data ?? [];
    },
  });

  const { data: myCourses } = useQuery({
    queryKey: ["my-courses", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_enrollments")
        .select("course_id, courses:course_id(title, description)")
        .eq("student_id", me!.user.id);
      return data ?? [];
    },
  });

  const { data: upcomingAssignments } = useQuery({
    queryKey: ["upcoming-assignments", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("assignments")
        .select("id, title, due_date, course_id, courses:course_id(title)")
        .gte("due_date", nowIso)
        .order("due_date", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  const displayName = me?.profile?.full_name || me?.user.email?.split("@")[0] || "";
  const positionLabel = me?.positions[0] ? POSITION_LABEL[me.positions[0]] : "General Member";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Welcome back</p>
        <h1 className="mt-2 font-display text-4xl text-ink">{displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{positionLabel}</p>
      </div>

      {/* Recent announcements */}
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl text-ink">Recent announcements</h2>
        </div>
        {recentAnnouncements && recentAnnouncements.length > 0 ? (
          <ul className="divide-y divide-border">
            {recentAnnouncements.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                {a.priority !== "normal" && <Badge variant={a.priority === "urgent" ? "destructive" : "default"}>{a.priority}</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        )}
        <Link to="/portal/announcements" className="mt-4 inline-block text-sm text-primary hover:underline">View all →</Link>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl text-ink">Your mentor{myMentors && myMentors.length !== 1 ? "s" : ""}</h2>
          </div>
          {myMentors && myMentors.length > 0 ? (
            <ul className="space-y-3">
              {myMentors.map((m) => {
                const p = m.profiles as unknown as { full_name: string | null; email: string; avatar_url: string | null } | null;
                return (
                  <li key={m.mentor_id} className="rounded-lg border border-border p-3">
                    <p className="font-medium text-ink">{p?.full_name || p?.email}</p>
                    <p className="text-xs text-muted-foreground">{p?.email}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No mentor assigned yet. Your Founding President will assign one soon.</p>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl text-ink">Upcoming assignments</h2>
          </div>
          {upcomingAssignments && upcomingAssignments.length > 0 ? (
            <ul className="space-y-3">
              {upcomingAssignments.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-3">
                  <p className="font-medium text-ink">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {a.due_date ? new Date(a.due_date).toLocaleDateString() : "TBD"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing due right now.</p>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl text-ink">Your courses</h2>
        </div>
        {myCourses && myCourses.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {myCourses.map((c) => {
              const course = c.courses as unknown as { title: string; description: string | null } | null;
              return (
                <li key={c.course_id}>
                  <Link to="/portal/courses" className="block rounded-lg border border-border p-4 transition-colors hover:bg-muted">
                    <p className="font-medium text-ink">{course?.title}</p>
                    {course?.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{course.description}</p>}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">You're not enrolled in any courses yet.</p>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl text-ink">Messages</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Open <Link to="/portal/messages" className="text-primary hover:underline">Messages</Link> to talk with your mentor, research group, and leadership.
        </p>
      </Card>
    </div>
  );
}
