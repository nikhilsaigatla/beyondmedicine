import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Inbox,
  Pencil,
  Plus,
  Save,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isLocalAdminMode } from "@/lib/local-admin";
import { getRolePreview } from "@/lib/portal/role-preview";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProfileSummary = {
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
};

type MentorStudent = {
  student_id: string;
};

type Course = {
  id: string;
  mentor_id: string;
  title: string;
  description: string | null;
  created_at: string;
};

type CourseEnrollment = {
  id: string;
  course_id: string;
  student_id: string;
};

type Assignment = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
};

type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  feedback: string | null;
  grade: string | null;
  submitted_at: string;
  assignments: {
    id: string;
    title: string;
    due_date: string | null;
    course_id: string;
    courses: { title: string } | null;
  } | null;
};

const emptyCourseForm = { title: "", description: "" };
const emptyAssignmentForm = { course_id: "", title: "", description: "", due_date: "" };

export const Route = createFileRoute("/_authenticated/portal/mentor")({
  beforeLoad: async () => {
    if (isLocalAdminMode()) {
      if (["admin", "executive", "officer", "mentor"].includes(getRolePreview())) return;
      throw redirect({ to: "/portal" });
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.user.id);
    if (!(roles ?? []).some((role) => ["mentor", "super_admin"].includes(role.role))) {
      throw redirect({ to: "/portal" });
    }
  },
  component: MentorDashboard,
});

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Unknown error";
}

function MentorDashboard() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [grade, setGrade] = useState("");

  const studentsQuery = useQuery({
    queryKey: ["mentor-students", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_students")
        .select("student_id")
        .eq("mentor_id", me!.user.id)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MentorStudent[];
    },
  });

  const studentIds = useMemo(
    () => (studentsQuery.data ?? []).map((student) => student.student_id),
    [studentsQuery.data],
  );

  const studentProfilesQuery = useQuery({
    queryKey: ["mentor-student-profiles", studentIds],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", studentIds);
      if (error) throw error;
      return (data ?? []) as Array<ProfileSummary & { id: string }>;
    },
  });

  const coursesQuery = useQuery({
    queryKey: ["mentor-courses", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("mentor_id", me!.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });

  const enrollmentsQuery = useQuery({
    queryKey: ["mentor-course-enrollments", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.from("course_enrollments").select("*");
      if (error) throw error;
      return (data ?? []) as CourseEnrollment[];
    },
  });

  const assignmentsQuery = useQuery({
    queryKey: ["mentor-assignments", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });

  const submissionsQuery = useQuery({
    queryKey: ["mentor-submissions", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(
          "*, assignments:assignment_id(id, title, due_date, course_id, courses:course_id(title))",
        )
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const studentProfiles = useMemo(
    () => studentProfilesQuery.data ?? [],
    [studentProfilesQuery.data],
  );
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data]);
  const assignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);
  const submissions = useMemo(() => submissionsQuery.data ?? [], [submissionsQuery.data]);
  const activeCourseId = selectedCourseId ?? courses[0]?.id ?? null;
  const selectedSubmission = submissions.find(
    (submission) => submission.id === selectedSubmissionId,
  );
  const studentById = useMemo(
    () => new Map(studentProfiles.map((profile) => [profile.id, profile])),
    [studentProfiles],
  );
  const assignmentsByCourse = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const assignment of assignments) {
      map.set(assignment.course_id, [...(map.get(assignment.course_id) ?? []), assignment]);
    }
    return map;
  }, [assignments]);
  const unreviewedSubmissions = submissions.filter(
    (submission) => !submission.feedback && !submission.grade,
  );
  const upcomingAssignments = assignments.filter(
    (assignment) => !assignment.due_date || new Date(assignment.due_date).getTime() >= Date.now(),
  );

  const saveCourseMutation = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Sign in before saving a course.");
      const title = courseForm.title.trim();
      if (!title) throw new Error("Add a course title.");
      const payload = {
        mentor_id: me.user.id,
        title,
        description: courseForm.description.trim() || null,
      };
      const { error } = editingCourseId
        ? await supabase.from("courses").update(payload).eq("id", editingCourseId)
        : await supabase.from("courses").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingCourseId ? "Course updated" : "Course created");
      setCourseForm(emptyCourseForm);
      setEditingCourseId(null);
      qc.invalidateQueries({ queryKey: ["mentor-courses"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const saveAssignmentMutation = useMutation({
    mutationFn: async () => {
      const title = assignmentForm.title.trim();
      if (!title) throw new Error("Add an assignment title.");
      if (!assignmentForm.course_id) throw new Error("Choose a course first.");
      const { error } = await supabase.from("assignments").insert({
        course_id: assignmentForm.course_id,
        title,
        description: assignmentForm.description.trim() || null,
        due_date: assignmentForm.due_date ? new Date(assignmentForm.due_date).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assignment created");
      setAssignmentForm((current) => ({
        ...emptyAssignmentForm,
        course_id: current.course_id,
      }));
      qc.invalidateQueries({ queryKey: ["mentor-assignments"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const toggleEnrollmentMutation = useMutation({
    mutationFn: async ({
      courseId,
      studentId,
      enrolled,
    }: {
      courseId: string;
      studentId: string;
      enrolled: boolean;
    }) => {
      if (enrolled) {
        const { error } = await supabase
          .from("course_enrollments")
          .delete()
          .eq("course_id", courseId)
          .eq("student_id", studentId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("course_enrollments")
        .insert({ course_id: courseId, student_id: studentId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Enrollment updated");
      qc.invalidateQueries({ queryKey: ["mentor-course-enrollments"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const reviewSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSubmission) throw new Error("Choose a submission first.");
      const { error } = await supabase
        .from("submissions")
        .update({ feedback: feedback.trim() || null, grade: grade.trim() || null })
        .eq("id", selectedSubmission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submission feedback saved");
      qc.invalidateQueries({ queryKey: ["mentor-submissions"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function startEditCourse(course: Course) {
    setEditingCourseId(course.id);
    setCourseForm({ title: course.title, description: course.description ?? "" });
    setActiveTab("courses");
  }

  function pickSubmission(submission: Submission) {
    setSelectedSubmissionId(submission.id);
    setFeedback(submission.feedback ?? "");
    setGrade(submission.grade ?? "");
  }

  const dashboardError =
    studentsQuery.error ??
    coursesQuery.error ??
    studentProfilesQuery.error ??
    enrollmentsQuery.error ??
    assignmentsQuery.error ??
    submissionsQuery.error;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Mentor workspace
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Mentor Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage students, course enrollments, assignments, and submission feedback.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/portal/admissions">
            <ClipboardList className="h-4 w-4" />
            Admissions tools
          </Link>
        </Button>
      </div>

      {dashboardError && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load mentor controls: {getErrorMessage(dashboardError)}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Users} label="Students" value={students.length} />
        <MetricCard icon={BookOpen} label="Courses" value={courses.length} />
        <MetricCard icon={ClipboardList} label="Assignments" value={assignments.length} />
        <MetricCard icon={Inbox} label="Needs Review" value={unreviewedSubmissions.length} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-5 lg:grid-cols-[1.15fr,0.85fr]">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-ink">Upcoming assignments</h2>
              <Badge variant="secondary">{upcomingAssignments.length}</Badge>
            </div>
            <div className="space-y-3">
              {upcomingAssignments.slice(0, 6).map((assignment) => {
                const course = courses.find((item) => item.id === assignment.course_id);
                return (
                  <div key={assignment.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {course?.title ?? "Course"} - {formatDate(assignment.due_date)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {
                          submissions.filter(
                            (submission) => submission.assignment_id === assignment.id,
                          ).length
                        }{" "}
                        submitted
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {upcomingAssignments.length === 0 && (
                <EmptyState icon={ClipboardList} text="No upcoming assignments yet." />
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-ink">Review queue</h2>
              <Button size="sm" variant="outline" onClick={() => setActiveTab("reviews")}>
                Open
              </Button>
            </div>
            <div className="space-y-3">
              {unreviewedSubmissions.slice(0, 5).map((submission) => {
                const student = studentById.get(submission.student_id);
                return (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => {
                      pickSubmission(submission);
                      setActiveTab("reviews");
                    }}
                    className="w-full rounded-lg border border-border p-4 text-left transition hover:border-primary/50 hover:bg-muted"
                  >
                    <p className="font-medium text-ink">
                      {student?.full_name || student?.email || "Student"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {submission.assignments?.title ?? "Assignment"} -{" "}
                      {formatDate(submission.submitted_at)}
                    </p>
                  </button>
                );
              })}
              {unreviewedSubmissions.length === 0 && (
                <EmptyState icon={CheckCircle2} text="No submissions need review." />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">Your students</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assign students to your courses and keep their workload visible.
                </p>
              </div>
              <Badge variant="secondary">{students.length}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {students.map((student) => {
                const profile = studentById.get(student.student_id);
                const studentEnrollments = enrollments.filter(
                  (enrollment) => enrollment.student_id === student.student_id,
                );
                return (
                  <div key={student.student_id} className="rounded-lg border border-border p-4">
                    <p className="font-medium text-ink">{profile?.full_name || profile?.email}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {studentEnrollments.length > 0 ? (
                        studentEnrollments.map((enrollment) => (
                          <Badge key={enrollment.id} variant="outline">
                            {courses.find((course) => course.id === enrollment.course_id)?.title ??
                              "Course"}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">No course</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
              {students.length === 0 && (
                <EmptyState icon={Users} text="No students assigned yet." />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="courses" className="grid gap-5 lg:grid-cols-[1fr,380px]">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">Courses</h2>
              <Badge variant="secondary">{courses.length}</Badge>
            </div>
            <div className="space-y-3">
              {courses.map((course) => {
                const courseEnrollments = enrollments.filter(
                  (enrollment) => enrollment.course_id === course.id,
                );
                const courseAssignments = assignmentsByCourse.get(course.id) ?? [];
                return (
                  <div
                    key={course.id}
                    className={cn(
                      "rounded-lg border p-4",
                      activeCourseId === course.id ? "border-primary bg-muted" : "border-border",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setSelectedCourseId(course.id)}
                      >
                        <p className="font-medium text-ink">{course.title}</p>
                        {course.description && (
                          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            {course.description}
                          </p>
                        )}
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => startEditCourse(course)}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{courseEnrollments.length} enrolled</Badge>
                      <Badge variant="outline">{courseAssignments.length} assignments</Badge>
                    </div>
                    {activeCourseId === course.id && students.length > 0 && (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Enrollment controls
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {students.map((student) => {
                            const profile = studentById.get(student.student_id);
                            const enrolled = courseEnrollments.some(
                              (enrollment) => enrollment.student_id === student.student_id,
                            );
                            return (
                              <Button
                                key={student.student_id}
                                type="button"
                                variant={enrolled ? "default" : "outline"}
                                size="sm"
                                className="justify-start gap-2"
                                disabled={toggleEnrollmentMutation.isPending}
                                onClick={() =>
                                  toggleEnrollmentMutation.mutate({
                                    courseId: course.id,
                                    studentId: student.student_id,
                                    enrolled,
                                  })
                                }
                              >
                                <UserPlus className="h-4 w-4" />
                                <span className="truncate">
                                  {enrolled ? "Remove" : "Enroll"}{" "}
                                  {profile?.full_name || profile?.email}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {courses.length === 0 && (
                <EmptyState icon={BookOpen} text="Create your first course to begin." />
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-xl text-ink">
              {editingCourseId ? "Edit course" : "Create course"}
            </h2>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveCourseMutation.mutate();
              }}
            >
              <div>
                <Label htmlFor="course-title">Title</Label>
                <Input
                  id="course-title"
                  required
                  value={courseForm.title}
                  onChange={(event) =>
                    setCourseForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="course-description">Description</Label>
                <Textarea
                  id="course-description"
                  value={courseForm.description}
                  onChange={(event) =>
                    setCourseForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" className="gap-2" disabled={saveCourseMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {editingCourseId ? "Save course" : "Create course"}
                </Button>
                {editingCourseId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingCourseId(null);
                      setCourseForm(emptyCourseForm);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="grid gap-5 lg:grid-cols-[1fr,380px]">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">Assignments</h2>
              <Badge variant="secondary">{assignments.length}</Badge>
            </div>
            <div className="space-y-3">
              {assignments.map((assignment) => {
                const course = courses.find((item) => item.id === assignment.course_id);
                const submitted = submissions.filter(
                  (submission) => submission.assignment_id === assignment.id,
                ).length;
                return (
                  <div key={assignment.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {course?.title ?? "Course"} - {formatDate(assignment.due_date)}
                        </p>
                      </div>
                      <Badge variant="outline">{submitted} submitted</Badge>
                    </div>
                    {assignment.description && (
                      <p className="mt-3 text-sm text-muted-foreground">{assignment.description}</p>
                    )}
                  </div>
                );
              })}
              {assignments.length === 0 && (
                <EmptyState icon={ClipboardList} text="No course assignments created yet." />
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-xl text-ink">Create assignment</h2>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveAssignmentMutation.mutate();
              }}
            >
              <div>
                <Label>Course</Label>
                <Select
                  value={assignmentForm.course_id}
                  onValueChange={(value) =>
                    setAssignmentForm((current) => ({ ...current, course_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assignment-title">Title</Label>
                <Input
                  id="assignment-title"
                  required
                  value={assignmentForm.title}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({ ...current, title: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="assignment-due">Due date</Label>
                <Input
                  id="assignment-due"
                  type="datetime-local"
                  value={assignmentForm.due_date}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({ ...current, due_date: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="assignment-description">Instructions</Label>
                <Textarea
                  id="assignment-description"
                  className="min-h-28"
                  value={assignmentForm.description}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <Button type="submit" className="gap-2" disabled={saveAssignmentMutation.isPending}>
                <Plus className="h-4 w-4" />
                Create assignment
              </Button>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="grid gap-5 lg:grid-cols-[360px,1fr]">
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">Submissions</h2>
              <Badge variant="secondary">{submissions.length}</Badge>
            </div>
            <div className="space-y-2">
              {submissions.map((submission) => {
                const student = studentById.get(submission.student_id);
                const selected = selectedSubmissionId === submission.id;
                return (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => pickSubmission(submission)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-muted",
                      selected ? "border-primary bg-muted" : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {student?.full_name || student?.email || "Student"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {submission.assignments?.title ?? "Assignment"}
                        </p>
                      </div>
                      <Badge
                        variant={submission.feedback || submission.grade ? "outline" : "default"}
                      >
                        {submission.feedback || submission.grade ? "Reviewed" : "New"}
                      </Badge>
                    </div>
                  </button>
                );
              })}
              {submissions.length === 0 && <EmptyState icon={Inbox} text="No submissions yet." />}
            </div>
          </Card>

          <Card className="p-6">
            {selectedSubmission ? (
              <div className="space-y-5">
                <div className="border-b border-border pb-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Submission review
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-ink">
                    {selectedSubmission.assignments?.title ?? "Assignment"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {studentById.get(selectedSubmission.student_id)?.full_name ||
                      studentById.get(selectedSubmission.student_id)?.email ||
                      "Student"}{" "}
                    - {formatDate(selectedSubmission.submitted_at)}
                  </p>
                </div>
                <div>
                  <h3 className="mb-2 font-medium text-ink">Student response</h3>
                  <p className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm leading-relaxed">
                    {selectedSubmission.content || "No response content."}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-[180px,1fr]">
                  <div>
                    <Label htmlFor="submission-grade">Grade</Label>
                    <Input
                      id="submission-grade"
                      value={grade}
                      onChange={(event) => setGrade(event.target.value)}
                      placeholder="A, 95, complete..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="submission-feedback">Feedback</Label>
                    <Textarea
                      id="submission-feedback"
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="gap-2"
                  disabled={reviewSubmissionMutation.isPending}
                  onClick={() => reviewSubmissionMutation.mutate()}
                >
                  <Save className="h-4 w-4" />
                  Save feedback
                </Button>
              </div>
            ) : (
              <EmptyState icon={Inbox} text="Choose a submission to review." />
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl text-ink">{value}</p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <Icon className="mx-auto mb-2 h-7 w-7" />
      {text}
    </div>
  );
}
