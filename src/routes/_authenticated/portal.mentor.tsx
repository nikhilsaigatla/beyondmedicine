import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Inbox,
  Save,
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

type ProfileSummary = {
  id: string;
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
  status?: "published" | "hidden";
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
      return (data ?? []) as ProfileSummary[];
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

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const courseIds = useMemo(() => courses.map((course) => course.id), [courses]);

  const enrollmentsQuery = useQuery({
    queryKey: ["mentor-course-enrollments", courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*")
        .in("course_id", courseIds);
      if (error) throw error;
      return (data ?? []) as CourseEnrollment[];
    },
  });

  const assignmentsQuery = useQuery({
    queryKey: ["mentor-assignments", courseIds],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*")
        .in("course_id", courseIds)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });

  const submissionsQuery = useQuery({
    queryKey: ["mentor-submissions", courseIds],
    enabled: courseIds.length > 0,
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
  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data]);
  const assignments = useMemo(
    () => (assignmentsQuery.data ?? []).filter((assignment) => assignment.status !== "hidden"),
    [assignmentsQuery.data],
  );
  const courseIdSet = useMemo(() => new Set(courseIds), [courseIds]);
  const assignmentIdSet = useMemo(
    () => new Set(assignments.map((assignment) => assignment.id)),
    [assignments],
  );
  const submissions = useMemo(
    () =>
      (submissionsQuery.data ?? []).filter((submission) =>
        submission.assignments
          ? courseIdSet.has(submission.assignments.course_id) &&
            assignmentIdSet.has(submission.assignment_id)
          : false,
      ),
    [assignmentIdSet, courseIdSet, submissionsQuery.data],
  );
  const selectedSubmission = submissions.find(
    (submission) => submission.id === selectedSubmissionId,
  );
  const studentById = useMemo(
    () => new Map(studentProfiles.map((profile) => [profile.id, profile])),
    [studentProfiles],
  );
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const submissionsByAssignment = useMemo(() => {
    const map = new Map<string, Submission[]>();
    for (const submission of submissions) {
      map.set(submission.assignment_id, [...(map.get(submission.assignment_id) ?? []), submission]);
    }
    return map;
  }, [submissions]);
  const unreviewedSubmissions = submissions.filter(
    (submission) => !submission.feedback && !submission.grade,
  );
  const upcomingAssignments = assignments.filter(
    (assignment) => !assignment.due_date || new Date(assignment.due_date).getTime() >= Date.now(),
  );

  const courseSummaries = courses.map((course) => {
    const courseEnrollments = enrollments.filter((enrollment) => enrollment.course_id === course.id);
    const courseAssignments = assignments.filter((assignment) => assignment.course_id === course.id);
    const reviewCount = unreviewedSubmissions.filter(
      (submission) => submission.assignments?.course_id === course.id,
    ).length;
    return {
      ...course,
      enrollmentCount: courseEnrollments.length,
      assignmentCount: courseAssignments.length,
      reviewCount,
    };
  });

  const dashboardError =
    studentsQuery.error ??
    coursesQuery.error ??
    studentProfilesQuery.error ??
    enrollmentsQuery.error ??
    assignmentsQuery.error ??
    submissionsQuery.error;

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

  function pickSubmission(submission: Submission) {
    setSelectedSubmissionId(submission.id);
    setFeedback(submission.feedback ?? "");
    setGrade(submission.grade ?? "");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Mentor workspace
          </p>
          <h1 className="mt-2 font-display text-4xl text-ink">Mentor Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Track student progress, review submitted work, and jump into Courses when coursework
            needs to be created or updated.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/portal/courses" search={{ section: "assignments" }}>
              <ClipboardList className="h-4 w-4" />
              Coursework
            </Link>
          </Button>
          <Button asChild className="gap-2">
            <Link to="/portal/courses" search={{ section: "overview" }}>
              <BookOpen className="h-4 w-4" />
              Courses
            </Link>
          </Button>
        </div>
      </div>

      {dashboardError && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load mentor dashboard: {getErrorMessage(dashboardError)}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Users} label="Students" value={students.length} />
        <MetricCard icon={BookOpen} label="Courses" value={courses.length} />
        <MetricCard icon={CalendarClock} label="Open Items" value={upcomingAssignments.length} />
        <MetricCard icon={Inbox} label="Needs Review" value={unreviewedSubmissions.length} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-5">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-ink">Review priority</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    New student submissions waiting for feedback.
                  </p>
                </div>
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {student?.full_name || student?.email || "Student"}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {submission.assignments?.title ?? "Assignment"} -{" "}
                            {formatDate(submission.submitted_at)}
                          </p>
                        </div>
                        <Badge>New</Badge>
                      </div>
                    </button>
                  );
                })}
                {unreviewedSubmissions.length === 0 && (
                  <EmptyState icon={CheckCircle2} text="No submissions need review." />
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-ink">Course load</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Course health at a glance. Use Courses for authoring and content edits.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <Link to="/portal/courses" search={{ section: "overview" }}>
                    Manage
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-3">
                {courseSummaries.slice(0, 5).map((course) => (
                  <div key={course.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{course.title}</p>
                        {course.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {course.description}
                          </p>
                        )}
                      </div>
                      {course.reviewCount > 0 && <Badge>{course.reviewCount} to review</Badge>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{course.enrollmentCount} enrolled</Badge>
                      <Badge variant="outline">{course.assignmentCount} items</Badge>
                    </div>
                  </div>
                ))}
                {courseSummaries.length === 0 && (
                  <EmptyState icon={BookOpen} text="No courses created yet." />
                )}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">Upcoming coursework</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recently active course items and submission counts.
                </p>
              </div>
              <Badge variant="secondary">{upcomingAssignments.length}</Badge>
            </div>
            <div className="space-y-3">
              {upcomingAssignments.slice(0, 8).map((assignment) => {
                const course = courseById.get(assignment.course_id);
                const submitted = submissionsByAssignment.get(assignment.id)?.length ?? 0;
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
                  </div>
                );
              })}
              {upcomingAssignments.length === 0 && (
                <EmptyState icon={ClipboardList} text="No upcoming coursework yet." />
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">Student roster</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  See each student&apos;s course enrollment, open work, and review status.
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
                const studentCourseIds = new Set(
                  studentEnrollments.map((enrollment) => enrollment.course_id),
                );
                const studentSubmissions = submissions.filter(
                  (submission) => submission.student_id === student.student_id,
                );
                const openItems = assignments.filter((assignment) => {
                  if (!studentCourseIds.has(assignment.course_id)) return false;
                  return !studentSubmissions.some(
                    (submission) => submission.assignment_id === assignment.id,
                  );
                });
                const waitingReview = studentSubmissions.filter(
                  (submission) => !submission.feedback && !submission.grade,
                ).length;
                return (
                  <div key={student.student_id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {profile?.full_name || profile?.email || "Student"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                      </div>
                      {waitingReview > 0 ? (
                        <Badge>{waitingReview} to review</Badge>
                      ) : (
                        <Badge variant="outline">Current</Badge>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline">{studentEnrollments.length} courses</Badge>
                      <Badge variant={openItems.length > 0 ? "secondary" : "outline"}>
                        {openItems.length} open
                      </Badge>
                      <Badge variant="outline">{studentSubmissions.length} submitted</Badge>
                    </div>
                    {studentEnrollments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {studentEnrollments.slice(0, 3).map((enrollment) => (
                          <Badge key={enrollment.id} variant="outline">
                            {courseById.get(enrollment.course_id)?.title ?? "Course"}
                          </Badge>
                        ))}
                        {studentEnrollments.length > 3 && (
                          <Badge variant="outline">+{studentEnrollments.length - 3}</Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {students.length === 0 && (
                <EmptyState icon={Users} text="No students assigned yet." />
              )}
            </div>
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
