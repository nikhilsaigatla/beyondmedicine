import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { POSITION_LABEL, TASK_DIVISIONS, type TaskDivision } from "@/lib/portal/labels";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BookOpen, CheckCircle2, ClipboardList, GraduationCap, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [taskForm, setTaskForm] = useState({ title: "", description: "", division: TASK_DIVISIONS[0] as TaskDivision, assignee_id: "", priority: "normal", due_date: "" });

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
        .select("mentor_id, profiles:profiles!mentor_id(full_name, email, avatar_url)")
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

  const { data: tasks } = useQuery({
    queryKey: ["portal-tasks", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").order("due_date", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  const { data: taskMembers } = useQuery({
    queryKey: ["task-members"],
    enabled: !!me?.isApplicationManager,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email").order("full_name");
      return data ?? [];
    },
  });

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    if (!me || !taskForm.title.trim() || !taskForm.assignee_id) {
      toast.error("Add a title and choose a member.");
      return;
    }
    const { error } = await supabase.from("tasks").insert({
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      division: taskForm.division,
      assignee_id: taskForm.assignee_id,
      created_by: me.user.id,
      priority: taskForm.priority as "low" | "normal" | "high" | "urgent",
      due_date: taskForm.due_date || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Task assigned");
    setTaskForm({ title: "", description: "", division: TASK_DIVISIONS[0], assignee_id: "", priority: "normal", due_date: "" });
    qc.invalidateQueries({ queryKey: ["portal-tasks"] });
  }

  async function updateTaskStatus(taskId: string, status: "todo" | "in_progress" | "completed") {
    const { error } = await supabase.from("tasks").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", taskId);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["portal-tasks"] });
  }

  const displayName = me?.profile?.full_name || me?.user.email?.split("@")[0] || "";
  const positionLabel = me?.positions[0] ? POSITION_LABEL[me.positions[0]] : "General Member";
  const taskList = tasks ?? [];
  const taskCounts = {
    todo: taskList.filter((task) => task.status === "todo").length,
    in_progress: taskList.filter((task) => task.status === "in_progress").length,
    completed: taskList.filter((task) => task.status === "completed").length,
  };
  const maxDivisionCount = Math.max(1, ...TASK_DIVISIONS.map((division) => taskList.filter((task) => task.division === division).length));
  const memberTaskCounts = (taskMembers ?? []).map((member) => ({
    ...member,
    count: taskList.filter((task) => task.assignee_id === member.id && task.status !== "completed").length,
  })).filter((member) => member.count > 0).sort((a, b) => b.count - a.count);
  const maxMemberCount = Math.max(1, ...memberTaskCounts.map((member) => member.count));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Welcome back</p>
        <h1 className="mt-2 font-display text-4xl text-ink">{displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{positionLabel}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><h2 className="font-display text-xl text-ink">My task list</h2></div>
            <Badge variant="secondary">{taskCounts.todo + taskCounts.in_progress} open</Badge>
          </div>
          {taskList.length > 0 ? (
            <ul className="divide-y divide-border">
              {taskList.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className={`font-medium ${task.status === "completed" ? "text-muted-foreground line-through" : "text-ink"}`}>{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.division} · {task.due_date ? `Due ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}` : "No due date"}</p>
                  </div>
                  <Select value={task.status} onValueChange={(value) => updateTaskStatus(task.id, value as "todo" | "in_progress" | "completed")}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="todo">To do</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><h2 className="font-display text-xl text-ink">Task progress</h2></div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-2xl font-medium text-ink">{taskCounts.todo}</p><p className="text-xs text-muted-foreground">To do</p></div>
            <div><p className="text-2xl font-medium text-ink">{taskCounts.in_progress}</p><p className="text-xs text-muted-foreground">Active</p></div>
            <div><p className="text-2xl font-medium text-ink">{taskCounts.completed}</p><p className="text-xs text-muted-foreground">Done</p></div>
          </div>
          <div className="mt-6 space-y-3">
            {TASK_DIVISIONS.map((division) => {
              const count = taskList.filter((task) => task.division === division).length;
              return <div key={division}><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{division}</span><span className="text-ink">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxDivisionCount) * 100}%` }} /></div></div>;
            })}
          </div>
          {me?.isApplicationManager && memberTaskCounts.length > 0 && (
            <div className="mt-6 border-t border-border pt-5">
              <p className="mb-3 text-sm font-medium text-ink">Open tasks by member</p>
              <div className="space-y-3">
                {memberTaskCounts.map((member) => (
                  <div key={member.id}>
                    <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{member.full_name || member.email}</span><span className="text-ink">{member.count}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-pine" style={{ width: `${(member.count / maxMemberCount) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {me?.isApplicationManager && (
        <Card className="p-6">
          <div className="mb-4"><h2 className="font-display text-xl text-ink">Assign a task</h2><p className="mt-1 text-sm text-muted-foreground">Create work for a member, division, and due date.</p></div>
          <form onSubmit={createTask} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="task-title">Task title</Label><Input id="task-title" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="Prepare outreach report" /></div>
            <div className="space-y-2"><Label>Assign to member</Label><Select value={taskForm.assignee_id} onValueChange={(value) => setTaskForm({ ...taskForm, assignee_id: value })}><SelectTrigger><SelectValue placeholder="Choose a member" /></SelectTrigger><SelectContent>{(taskMembers ?? []).map((member) => <SelectItem key={member.id} value={member.id}>{member.full_name || member.email}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Division</Label><Select value={taskForm.division} onValueChange={(value) => setTaskForm({ ...taskForm, division: value as TaskDivision })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_DIVISIONS.map((division) => <SelectItem key={division} value={division}>{division}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Priority</Label><Select value={taskForm.priority} onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="task-due-date">Due date</Label><Input id="task-due-date" type="date" value={taskForm.due_date} onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="task-description">Description</Label><Textarea id="task-description" value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} placeholder="Add context or expected outcome" /></div>
            <div><Button type="submit">Assign task</Button></div>
          </form>
        </Card>
      )}

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
