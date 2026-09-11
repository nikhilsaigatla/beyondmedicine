import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Globe2,
  Inbox,
  MapPin,
  MessageSquare,
  MessagesSquare,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { POSITION_LABEL, TASK_DIVISIONS, type TaskDivision } from "@/lib/portal/labels";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorldHeatMap, type WorldHeatMapPoint } from "@/components/world-heat-map";

export const Route = createFileRoute("/_authenticated/portal/")({
  component: Dashboard,
});

type TaskStatus = "todo" | "in_progress" | "completed";
type CourseworkKind = "assignment" | "quiz" | "discussion" | "article" | "paper";
type CourseSection = "assignments" | "quizzes" | "discussions" | "articles" | "papers";

type CourseworkItem = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  status?: "published" | "hidden";
  courses: { title: string; mentor_id: string } | null;
};

type CourseworkSubmission = {
  id: string;
  assignment_id: string;
  student_id: string;
  feedback: string | null;
  grade: string | null;
  submitted_at: string;
};

type CourseEnrollment = {
  id: string;
  course_id: string;
  student_id: string;
};

type SignupLocation = {
  user_id: string;
  status: string | null;
  country: string | null;
  state_region: string | null;
  county: string | null;
};

type CountryPoint = {
  label: string;
  x: number;
  y: number;
};

type MemberMapPoint = WorldHeatMapPoint & {
  key: string;
  count: number;
  locations: string[];
};

const countryPoints: Record<string, CountryPoint> = {
  australia: { label: "Australia", x: 81, y: 72 },
  bangladesh: { label: "Bangladesh", x: 72, y: 47 },
  brazil: { label: "Brazil", x: 36, y: 67 },
  canada: { label: "Canada", x: 22, y: 23 },
  china: { label: "China", x: 75, y: 39 },
  egypt: { label: "Egypt", x: 56, y: 47 },
  france: { label: "France", x: 49, y: 37 },
  germany: { label: "Germany", x: 51, y: 34 },
  hungary: { label: "Hungary", x: 53, y: 37 },
  india: { label: "India", x: 70, y: 50 },
  indonesia: { label: "Indonesia", x: 77, y: 61 },
  italy: { label: "Italy", x: 52, y: 40 },
  japan: { label: "Japan", x: 84, y: 40 },
  kenya: { label: "Kenya", x: 58, y: 58 },
  mexico: { label: "Mexico", x: 22, y: 49 },
  netherlands: { label: "Netherlands", x: 50, y: 33 },
  nigeria: { label: "Nigeria", x: 51, y: 55 },
  pakistan: { label: "Pakistan", x: 66, y: 46 },
  philippines: { label: "Philippines", x: 78, y: 52 },
  singapore: { label: "Singapore", x: 74, y: 59 },
  "south africa": { label: "South Africa", x: 54, y: 77 },
  "south korea": { label: "South Korea", x: 80, y: 41 },
  spain: { label: "Spain", x: 48, y: 41 },
  "united arab emirates": { label: "United Arab Emirates", x: 62, y: 49 },
  "united kingdom": { label: "United Kingdom", x: 48, y: 31 },
  "united states": { label: "United States", x: 23, y: 40 },
  vietnam: { label: "Vietnam", x: 75, y: 51 },
};

const countryAliases: Record<string, string> = {
  america: "united states",
  "u.s.": "united states",
  "u.s.a.": "united states",
  uk: "united kingdom",
  usa: "united states",
  us: "united states",
  "united states of america": "united states",
  "viet nam": "vietnam",
};

const courseworkSection: Record<CourseworkKind, CourseSection> = {
  assignment: "assignments",
  quiz: "quizzes",
  discussion: "discussions",
  article: "articles",
  paper: "papers",
};

const courseworkLabel: Record<CourseworkKind, string> = {
  assignment: "Assignment",
  quiz: "Quiz",
  discussion: "Discussion",
  article: "Article",
  paper: "Research Paper",
};

const courseworkIcon: Record<CourseworkKind, typeof ClipboardList> = {
  assignment: ClipboardList,
  quiz: FileQuestion,
  discussion: MessagesSquare,
  article: BookOpen,
  paper: GraduationCap,
};

function getCourseworkKind(item: Pick<CourseworkItem, "title" | "description">): CourseworkKind {
  const text = `${item.title}\n${item.description ?? ""}`.toLowerCase();
  if (text.includes("quiz")) return "quiz";
  if (text.includes("discussion")) return "discussion";
  if (text.includes("article") || text.includes("reading")) return "article";
  if (text.includes("paper") || text.includes("manuscript") || text.includes("draft")) {
    return "paper";
  }
  return "assignment";
}

function normalizeCountry(value: string | null) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  return countryAliases[normalized] ?? normalized;
}

function formatSignupLocation(location: SignupLocation) {
  return [location.county, location.state_region, location.country].filter(Boolean).join(", ");
}

function buildMemberMapPoints(locations: SignupLocation[]) {
  const grouped = new Map<string, MemberMapPoint>();
  for (const location of locations) {
    const country = normalizeCountry(location.country);
    const point = countryPoints[country];
    const existing = grouped.get(country);
    const label = formatSignupLocation(location);
    if (existing) {
      existing.count += 1;
      if (label && !existing.locations.includes(label)) existing.locations.push(label);
      continue;
    }
    grouped.set(country, {
      key: country,
      label: point?.label ?? location.country?.trim() ?? "Unknown",
      x: point?.x,
      y: point?.y,
      count: 1,
      locations: label ? [label] : [point?.label ?? location.country?.trim() ?? "Unknown"],
    });
  }
  return [...grouped.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function getMapHeatColor(count: number, largestCount: number) {
  const intensity = largestCount > 0 ? count / largestCount : 0;
  if (intensity >= 0.75) return "#2DD4BF";
  if (intensity >= 0.45) return "#38BDF8";
  if (intensity >= 0.2) return "#9EC5AB";
  return "#D7F9E9";
}

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function Dashboard() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const canSeeMemberMap = !!me?.isOfficer;
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    division: TASK_DIVISIONS[0] as TaskDivision,
    assignee_id: "",
    priority: "normal",
    due_date: "",
  });

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

  const { data: coursework } = useQuery({
    queryKey: ["dashboard-coursework", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select(
          "id, title, description, due_date, created_at, status, course_id, courses:course_id(title, mentor_id)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CourseworkItem[];
    },
  });

  const { data: courseworkSubmissions } = useQuery({
    queryKey: ["dashboard-coursework-submissions", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("id, assignment_id, student_id, feedback, grade, submitted_at")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CourseworkSubmission[];
    },
  });

  const { data: courseEnrollments } = useQuery({
    queryKey: ["dashboard-course-enrollments", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("id, course_id, student_id");
      if (error) throw error;
      return (data ?? []) as CourseEnrollment[];
    },
  });

  const { data: signupLocations } = useQuery({
    queryKey: ["dashboard-signup-locations", me?.user.id],
    enabled: canSeeMemberMap,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("user_id, status, country, state_region, county")
        .not("country", "is", null);
      if (error) throw error;
      return (data ?? []) as SignupLocation[];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["portal-tasks", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      return data ?? [];
    },
  });

  const { data: taskMembers } = useQuery({
    queryKey: ["task-members"],
    enabled: !!me?.isApplicationManager,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task assigned");
    setTaskForm({
      title: "",
      description: "",
      division: TASK_DIVISIONS[0],
      assignee_id: "",
      priority: "normal",
      due_date: "",
    });
    qc.invalidateQueries({ queryKey: ["portal-tasks"] });
  }

  async function updateTaskStatus(taskId: string, status: TaskStatus) {
    const { error } = await supabase
      .from("tasks")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", taskId);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["portal-tasks"] });
  }

  const displayName = me?.profile?.full_name || me?.user.email?.split("@")[0] || "";
  const positionLabel = me?.positions[0] ? POSITION_LABEL[me.positions[0]] : "General Member";
  const taskList = tasks ?? [];
  const courseworkItems = (coursework ?? []).filter((item) => item.status !== "hidden");
  const visibleCourseworkIds = useMemo(
    () => new Set(courseworkItems.map((item) => item.id)),
    [courseworkItems],
  );
  const submissions = (courseworkSubmissions ?? []).filter((submission) =>
    visibleCourseworkIds.has(submission.assignment_id),
  );
  const enrollments = courseEnrollments ?? [];
  const memberMapLocations = (signupLocations ?? []).filter((location) => location.country);
  const memberMapPoints = useMemo(
    () => buildMemberMapPoints(memberMapLocations),
    [memberMapLocations],
  );
  const mappedLocationCount = memberMapPoints.reduce((sum, point) => sum + point.count, 0);
  const unmappedLocationCount = memberMapLocations.length - mappedLocationCount;
  const mySubmissionByAssignment = useMemo(
    () =>
      new Map(
        submissions
          .filter((submission) => submission.student_id === me?.user.id)
          .map((submission) => [submission.assignment_id, submission]),
      ),
    [me?.user.id, submissions],
  );

  const taskCounts = {
    todo: taskList.filter((task) => task.status === "todo").length,
    in_progress: taskList.filter((task) => task.status === "in_progress").length,
    completed: taskList.filter((task) => task.status === "completed").length,
  };
  const maxDivisionCount = Math.max(
    1,
    ...TASK_DIVISIONS.map(
      (division) => taskList.filter((task) => task.division === division).length,
    ),
  );
  const memberTaskCounts = (taskMembers ?? [])
    .map((member) => ({
      ...member,
      count: taskList.filter(
        (task) => task.assignee_id === member.id && task.status !== "completed",
      ).length,
    }))
    .filter((member) => member.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxMemberCount = Math.max(1, ...memberTaskCounts.map((member) => member.count));

  const studentTodo = courseworkItems
    .filter((item) => !mySubmissionByAssignment.has(item.id))
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return a.title.localeCompare(b.title);
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  const mentorCoursework = courseworkItems.filter(
    (item) => item.courses?.mentor_id === me?.user.id,
  );
  const mentorNeedsReview = submissions.filter(
    (submission) => !submission.feedback && !submission.grade,
  );
  const mentorRecentCoursework = mentorCoursework
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentCourseNotifications = courseworkItems.slice(0, 5);
  const dashboardNotifications = me?.isMentor
    ? mentorNeedsReview.length > 0
      ? mentorNeedsReview.slice(0, 5)
      : mentorRecentCoursework
    : studentTodo.length > 0
      ? studentTodo.slice(0, 5)
      : recentCourseNotifications;
  const canSeeDivisionProgress = !!me?.isOfficer;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Welcome back
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">{displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{positionLabel}</p>
      </div>

      <CourseworkNotificationsCard
        isMentor={!!me?.isMentor}
        items={courseworkItems}
        submissions={submissions}
        notifications={dashboardNotifications}
      />

      {canSeeMemberMap && (
        <MemberMapCard
          points={memberMapPoints}
          totalLocations={memberMapLocations.length}
          unmappedCount={unmappedLocationCount}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl text-ink">My task list</h2>
            </div>
            <Badge variant="secondary">{taskCounts.todo + taskCounts.in_progress} open</Badge>
          </div>
          {taskList.length > 0 ? (
            <ul className="divide-y divide-border">
              {taskList.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p
                      className={`font-medium ${
                        task.status === "completed"
                          ? "text-muted-foreground line-through"
                          : "text-ink"
                      }`}
                    >
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.division} -{" "}
                      {task.due_date
                        ? `Due ${new Date(`${task.due_date}T00:00:00`).toLocaleDateString()}`
                        : "No due date"}
                    </p>
                  </div>
                  <Select
                    value={task.status}
                    onValueChange={(value) => updateTaskStatus(task.id, value as TaskStatus)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To do</SelectItem>
                      <SelectItem value="in_progress">In progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No organization tasks assigned yet.</p>
          )}
        </Card>

        <RoleProgressCard
          canSeeDivisionProgress={canSeeDivisionProgress}
          isMentor={!!me?.isMentor}
          taskCounts={taskCounts}
          taskList={taskList}
          maxDivisionCount={maxDivisionCount}
          memberTaskCounts={memberTaskCounts}
          maxMemberCount={maxMemberCount}
          mentorItems={mentorRecentCoursework}
          mentorSubmissions={submissions}
          enrollments={enrollments}
          studentTodo={studentTodo}
        />
      </div>

      {me?.isApplicationManager && (
        <Card className="p-6">
          <div className="mb-4">
            <h2 className="font-display text-xl text-ink">Assign a task</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create organization work for a member, division, and due date.
            </p>
          </div>
          <form onSubmit={createTask} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task title</Label>
              <Input
                id="task-title"
                value={taskForm.title}
                onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })}
                placeholder="Prepare outreach report"
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to member</Label>
              <Select
                value={taskForm.assignee_id}
                onValueChange={(value) => setTaskForm({ ...taskForm, assignee_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member" />
                </SelectTrigger>
                <SelectContent>
                  {(taskMembers ?? []).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Division</Label>
              <Select
                value={taskForm.division}
                onValueChange={(value) =>
                  setTaskForm({ ...taskForm, division: value as TaskDivision })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_DIVISIONS.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={taskForm.priority}
                onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={taskForm.due_date}
                onChange={(event) => setTaskForm({ ...taskForm, due_date: event.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                value={taskForm.description}
                onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })}
                placeholder="Add context or expected outcome"
              />
            </div>
            <div>
              <Button type="submit">Assign task</Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl text-ink">Recent announcements</h2>
        </div>
        {recentAnnouncements && recentAnnouncements.length > 0 ? (
          <ul className="divide-y divide-border">
            {recentAnnouncements.map((announcement) => (
              <li key={announcement.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
                {announcement.priority !== "normal" && (
                  <Badge variant={announcement.priority === "urgent" ? "destructive" : "default"}>
                    {announcement.priority}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        )}
        <Link
          to="/portal/announcements"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          View all
        </Link>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl text-ink">
              Your mentor{myMentors && myMentors.length !== 1 ? "s" : ""}
            </h2>
          </div>
          {myMentors && myMentors.length > 0 ? (
            <ul className="space-y-3">
              {myMentors.map((mentor) => {
                const profile = mentor.profiles as unknown as {
                  full_name: string | null;
                  email: string;
                  avatar_url: string | null;
                } | null;
                return (
                  <li key={mentor.mentor_id} className="rounded-lg border border-border p-3">
                    <p className="font-medium text-ink">{profile?.full_name || profile?.email}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No mentor assigned yet. Your Founding President will assign one soon.
            </p>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl text-ink">Upcoming coursework</h2>
          </div>
          {studentTodo.length > 0 ? (
            <ul className="space-y-3">
              {studentTodo.slice(0, 5).map((item) => (
                <CourseworkListItem key={item.id} item={item} />
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
            {myCourses.map((courseEnrollment) => {
              const course = courseEnrollment.courses as unknown as {
                title: string;
                description: string | null;
              } | null;
              return (
                <li key={courseEnrollment.course_id}>
                  <Link
                    to="/portal/courses"
                    className="block rounded-lg border border-border p-4 transition-colors hover:bg-muted"
                  >
                    <p className="font-medium text-ink">{course?.title}</p>
                    {course?.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {course.description}
                      </p>
                    )}
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
          Open{" "}
          <Link to="/portal/messages" className="text-primary hover:underline">
            Messages
          </Link>{" "}
          to talk with your mentor, research group, and leadership.
        </p>
      </Card>
    </div>
  );
}

function MemberMapCard({
  points,
  totalLocations,
  unmappedCount,
}: {
  points: MemberMapPoint[];
  totalLocations: number;
  unmappedCount: number;
}) {
  const largestCount = Math.max(1, ...points.map((point) => point.count));
  const topPoints = points.slice(0, 5);

  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex min-w-0 items-start gap-2">
                <Globe2 className="h-4 w-4 text-primary" />
                <h2 className="min-w-0 break-words font-display text-xl text-ink">
                  Where members are joining from
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Aggregated from signup locations. Highlighted countries show member counts.
              </p>
            </div>
            <Badge variant="secondary">{totalLocations} located</Badge>
          </div>

          <WorldHeatMap
            points={points.map((point) => ({
              ...point,
              detail: point.locations.slice(0, 3).join(" | "),
            }))}
            countLabel="member"
            countLabelPlural="members"
            className="w-full rounded-lg border border-border bg-muted"
          />
        </div>

        <div className="border-t border-border bg-muted/35 p-6 lg:border-l lg:border-t-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg text-ink">Top locations</h3>
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-3">
            {topPoints.map((point) => (
              <div key={point.key} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2 font-medium text-ink">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: getMapHeatColor(point.count, largestCount) }}
                    />
                    <span className="truncate">{point.label}</span>
                  </p>
                  <Badge variant="secondary">{point.count}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {point.locations.slice(0, 3).join(" | ")}
                </p>
              </div>
            ))}
            {topPoints.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Signup locations will appear here once members add a country.
              </div>
            )}
          </div>
          {unmappedCount > 0 && (
            <p className="mt-4 text-xs text-muted-foreground">
              {unmappedCount} location{unmappedCount === 1 ? "" : "s"} need a map coordinate.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function CourseworkNotificationsCard({
  isMentor,
  items,
  submissions,
  notifications,
}: {
  isMentor: boolean;
  items: CourseworkItem[];
  submissions: CourseworkSubmission[];
  notifications: Array<CourseworkItem | CourseworkSubmission>;
}) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const needsReview = submissions.filter((submission) => !submission.feedback && !submission.grade);
  const heading = isMentor ? "Course notifications" : "For you";
  const subheading = isMentor
    ? `${needsReview.length} submission${needsReview.length === 1 ? "" : "s"} waiting for feedback.`
    : "Assignments, discussions, quizzes, articles, and paper milestones tied to your courses.";

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-primary" />
            <h2 className="font-display text-xl text-ink">{heading}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subheading}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/portal/courses">Open Courses</Link>
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {notifications.length > 0 ? (
          notifications.map((notification) => {
            if ("assignment_id" in notification) {
              const item = itemById.get(notification.assignment_id);
              return (
                <div key={notification.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {item?.title ?? "Submitted coursework"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDate(notification.submitted_at)}
                      </p>
                    </div>
                    <Badge variant="secondary">Review</Badge>
                  </div>
                </div>
              );
            }
            return <CourseworkListItem key={notification.id} item={notification} />;
          })
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground md:col-span-2">
            No coursework notifications right now.
          </div>
        )}
      </div>
    </Card>
  );
}

function RoleProgressCard({
  canSeeDivisionProgress,
  isMentor,
  taskCounts,
  taskList,
  maxDivisionCount,
  memberTaskCounts,
  maxMemberCount,
  mentorItems,
  mentorSubmissions,
  enrollments,
  studentTodo,
}: {
  canSeeDivisionProgress: boolean;
  isMentor: boolean;
  taskCounts: Record<TaskStatus, number>;
  taskList: Array<{
    assignee_id: string;
    division: string;
    status: TaskStatus;
  }>;
  maxDivisionCount: number;
  memberTaskCounts: Array<{ id: string; full_name: string | null; email: string; count: number }>;
  maxMemberCount: number;
  mentorItems: CourseworkItem[];
  mentorSubmissions: CourseworkSubmission[];
  enrollments: CourseEnrollment[];
  studentTodo: CourseworkItem[];
}) {
  if (canSeeDivisionProgress) {
    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl text-ink">Task progress</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="To do" value={taskCounts.todo} />
          <MiniMetric label="Active" value={taskCounts.in_progress} />
          <MiniMetric label="Done" value={taskCounts.completed} />
        </div>
        <div className="mt-6 space-y-3">
          {TASK_DIVISIONS.map((division) => {
            const count = taskList.filter((task) => task.division === division).length;
            return (
              <ProgressLine
                key={division}
                label={division}
                value={count}
                width={(count / maxDivisionCount) * 100}
              />
            );
          })}
        </div>
        {memberTaskCounts.length > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-sm font-medium text-ink">Open tasks by member</p>
            <div className="space-y-3">
              {memberTaskCounts.map((member) => (
                <ProgressLine
                  key={member.id}
                  label={member.full_name || member.email}
                  value={member.count}
                  width={(member.count / maxMemberCount) * 100}
                  accent="bg-pine"
                />
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  }

  if (isMentor) {
    const needsReview = mentorSubmissions.filter(
      (submission) => !submission.feedback && !submission.grade,
    );
    const recentItems = mentorItems.slice(0, 4);
    const totalExpected = recentItems.reduce(
      (sum, item) =>
        sum + enrollments.filter((enrollment) => enrollment.course_id === item.course_id).length,
      0,
    );
    const totalSubmitted = recentItems.reduce(
      (sum, item) =>
        sum + mentorSubmissions.filter((submission) => submission.assignment_id === item.id).length,
      0,
    );

    return (
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl text-ink">Course progress</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <MiniMetric label="Posted" value={mentorItems.length} />
          <MiniMetric label="Submitted" value={totalSubmitted} />
          <MiniMetric label="Grade" value={needsReview.length} />
        </div>
        <div className="mt-6 space-y-3">
          {recentItems.map((item) => {
            const expected = enrollments.filter(
              (enrollment) => enrollment.course_id === item.course_id,
            ).length;
            const submitted = mentorSubmissions.filter(
              (submission) => submission.assignment_id === item.id,
            ).length;
            return (
              <ProgressLine
                key={item.id}
                label={item.title}
                value={`${submitted}/${expected}`}
                width={expected > 0 ? (submitted / expected) * 100 : 0}
              />
            );
          })}
          {recentItems.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent coursework posted yet.</p>
          )}
        </div>
        {totalExpected > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            {Math.round((totalSubmitted / totalExpected) * 100)}% participation across recent items.
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h2 className="font-display text-xl text-ink">Learning todo</h2>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniMetric label="Open" value={studentTodo.length} />
        <MiniMetric
          label="Due soon"
          value={
            studentTodo.filter(
              (item) =>
                item.due_date &&
                new Date(item.due_date).getTime() <= Date.now() + 1000 * 60 * 60 * 24 * 7,
            ).length
          }
        />
        <MiniMetric
          label="Overdue"
          value={
            studentTodo.filter(
              (item) => item.due_date && new Date(item.due_date).getTime() < Date.now(),
            ).length
          }
        />
      </div>
      <div className="mt-6 space-y-3">
        {studentTodo.slice(0, 5).map((item) => (
          <CourseworkListItem key={item.id} item={item} compact />
        ))}
        {studentTodo.length === 0 && (
          <p className="text-sm text-muted-foreground">You are caught up on coursework.</p>
        )}
      </div>
    </Card>
  );
}

function CourseworkListItem({
  item,
  compact = false,
}: {
  item: CourseworkItem;
  compact?: boolean;
}) {
  const kind = getCourseworkKind(item);
  const Icon = courseworkIcon[kind];
  return (
    <Link
      to="/portal/courses"
      search={{ section: courseworkSection[kind] }}
      className={cn(
        "block rounded-lg border border-border transition hover:border-primary/50 hover:bg-muted",
        compact ? "p-3" : "p-4",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-ink">{item.title}</p>
            <Badge variant="outline">{courseworkLabel[kind]}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.courses?.title ?? "Course"} - {formatDate(item.due_date)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-medium text-ink">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ProgressLine({
  label,
  value,
  width,
  accent = "bg-primary",
}: {
  label: string;
  value: number | string;
  width: number;
  accent?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 text-ink">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", accent)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
