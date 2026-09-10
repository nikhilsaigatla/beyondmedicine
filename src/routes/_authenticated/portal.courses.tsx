import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  FileText,
  GraduationCap,
  Layers,
  LibraryBig,
  MessagesSquare,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const courseSections = [
  "overview",
  "assignments",
  "quizzes",
  "discussions",
  "articles",
  "papers",
] as const;

type CourseSection = (typeof courseSections)[number];
type ContentKind = "assignment" | "quiz" | "discussion" | "article" | "paper";

const searchSchema = z.object({
  section: z.enum(courseSections).optional().catch("overview"),
});

export const Route = createFileRoute("/_authenticated/portal/courses")({
  validateSearch: (search) => searchSchema.parse(search),
  component: CoursesPage,
});

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
};

type ProfileSummary = {
  id: string;
  full_name: string | null;
  email: string | null;
};

const sectionMeta: Record<
  CourseSection,
  { label: string; eyebrow: string; title: string; description: string; icon: typeof BookOpen }
> = {
  overview: {
    label: "Assigned Courses",
    eyebrow: "Course hub",
    title: "Assigned Courses",
    description: "Open a course to see its assignments, learning materials, and research work.",
    icon: LibraryBig,
  },
  assignments: {
    label: "Assignments",
    eyebrow: "Coursework",
    title: "Assignments",
    description: "Create and manage due dates, instructions, student submissions, and feedback.",
    icon: ClipboardList,
  },
  quizzes: {
    label: "Quizzes",
    eyebrow: "Checks for understanding",
    title: "Quiz Builder",
    description: "Draft short knowledge checks that can live inside a course assignment.",
    icon: FileQuestion,
  },
  discussions: {
    label: "Discussions",
    eyebrow: "Seminar prompts",
    title: "Discussion Boards",
    description: "Frame prompts for mentor-led debates, reading responses, and peer critique.",
    icon: MessagesSquare,
  },
  articles: {
    label: "Articles",
    eyebrow: "Learning library",
    title: "Articles",
    description: "Organize readings, explainers, and member-facing research education.",
    icon: FileText,
  },
  papers: {
    label: "Research Papers",
    eyebrow: "Research management",
    title: "Research Papers",
    description: "Track paper drafts, literature reviews, citations, and publication milestones.",
    icon: GraduationCap,
  },
};

const builderCopy: Record<
  ContentKind,
  {
    title: string;
    noun: string;
    prompt: string;
    bodyLabel: string;
    placeholder: string;
    template: string;
  }
> = {
  assignment: {
    title: "Create assignment",
    noun: "Assignment",
    prompt: "A structured deliverable with instructions, deadline, and optional submission.",
    bodyLabel: "Instructions",
    placeholder: "Describe the task, deliverables, rubric, and submission expectations.",
    template: "",
  },
  quiz: {
    title: "Create quiz",
    noun: "Quiz",
    prompt: "A quick check for research methods, readings, or mentor lesson content.",
    bodyLabel: "Questions",
    placeholder: "Question 1: ...\nA. ...\nB. ...\nCorrect answer: ...",
    template: "Quiz focus:\nQuestions:\nAnswer key:\nRetake policy:",
  },
  discussion: {
    title: "Create discussion",
    noun: "Discussion",
    prompt: "A guided thread for students to respond to literature or research dilemmas.",
    bodyLabel: "Discussion prompt",
    placeholder: "Prompt, response expectations, and peer reply instructions.",
    template: "Opening prompt:\nRequired evidence:\nReply requirement:\nFacilitation notes:",
  },
  article: {
    title: "Create article",
    noun: "Article",
    prompt: "A reading or explainer that students can complete before a meeting.",
    bodyLabel: "Article notes",
    placeholder: "Summary, reading link, questions to answer, and key terms.",
    template: "Reading link:\nSummary:\nKey terms:\nReflection questions:",
  },
  paper: {
    title: "Create paper milestone",
    noun: "Research Paper",
    prompt: "A paper-management checkpoint for abstracts, drafts, revisions, or submission prep.",
    bodyLabel: "Paper milestone",
    placeholder: "Milestone requirements, target journal/conference, and review checklist.",
    template: "Paper stage:\nDeliverable:\nCitation requirements:\nReview checklist:",
  },
};

const emptyCourseForm = { title: "", description: "" };
const emptyBuilderForm = {
  course_id: "",
  title: "",
  description: "",
  due_date: "",
};

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

function getContentKind(assignment: Assignment): ContentKind {
  const text = `${assignment.title}\n${assignment.description ?? ""}`.toLowerCase();
  if (text.includes("quiz")) return "quiz";
  if (text.includes("discussion")) return "discussion";
  if (text.includes("article") || text.includes("reading")) return "article";
  if (text.includes("paper") || text.includes("manuscript") || text.includes("draft"))
    return "paper";
  return "assignment";
}

function CoursesPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const activeSection = search.section ?? "overview";
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [builderKind, setBuilderKind] = useState<ContentKind>("assignment");
  const [builderForm, setBuilderForm] = useState(emptyBuilderForm);

  const coursesQuery = useQuery({
    queryKey: ["courses-workspace", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });

  const assignmentsQuery = useQuery({
    queryKey: ["course-workspace-assignments", me?.user.id],
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

  const enrollmentsQuery = useQuery({
    queryKey: ["course-workspace-enrollments", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.from("course_enrollments").select("*");
      if (error) throw error;
      return (data ?? []) as CourseEnrollment[];
    },
  });

  const submissionsQuery = useQuery({
    queryKey: ["course-workspace-submissions", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase.from("submissions").select("*");
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const assignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);
  const enrollments = useMemo(() => enrollmentsQuery.data ?? [], [enrollmentsQuery.data]);
  const submissions = useMemo(() => submissionsQuery.data ?? [], [submissionsQuery.data]);
  const mentorIds = useMemo(
    () => [...new Set(courses.map((course) => course.mentor_id))],
    [courses],
  );

  const mentorsQuery = useQuery({
    queryKey: ["course-workspace-mentors", mentorIds],
    enabled: mentorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", mentorIds);
      if (error) throw error;
      return (data ?? []) as ProfileSummary[];
    },
  });

  const mentorById = useMemo(
    () => new Map((mentorsQuery.data ?? []).map((mentor) => [mentor.id, mentor])),
    [mentorsQuery.data],
  );

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) => {
      const mentor = mentorById.get(course.mentor_id);
      return [course.title, course.description, mentor?.full_name, mentor?.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized));
    });
  }, [courses, mentorById, query]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? courses[0];
  const selectedCourseAssignments = selectedCourse
    ? assignments.filter((assignment) => assignment.course_id === selectedCourse.id)
    : [];
  const selectedCourseEnrollmentCount = selectedCourse
    ? enrollments.filter((enrollment) => enrollment.course_id === selectedCourse.id).length
    : 0;
  const myOpenItems = assignments.filter((assignment) => {
    const submitted = submissions.some(
      (submission) =>
        submission.assignment_id === assignment.id && submission.student_id === me?.user.id,
    );
    return !submitted;
  });
  const dashboardError =
    coursesQuery.error ??
    assignmentsQuery.error ??
    enrollmentsQuery.error ??
    submissionsQuery.error;
  const canAuthor = !!me?.isMentor;
  const activeMeta = sectionMeta[activeSection];
  const ActiveIcon = activeMeta.icon;

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Sign in before creating a course.");
      const title = courseForm.title.trim();
      if (!title) throw new Error("Add a course title.");
      const { error } = await supabase.from("courses").insert({
        mentor_id: me.user.id,
        title,
        description: courseForm.description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course created");
      setCourseForm(emptyCourseForm);
      qc.invalidateQueries({ queryKey: ["courses-workspace"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const createContentMutation = useMutation({
    mutationFn: async () => {
      const courseId = builderForm.course_id || selectedCourse?.id;
      if (!courseId) throw new Error("Choose a course first.");
      const title = builderForm.title.trim();
      if (!title) throw new Error(`Add a ${builderCopy[builderKind].noun.toLowerCase()} title.`);
      const description = builderForm.description.trim();
      const copy = builderCopy[builderKind];
      const body = [
        builderKind === "assignment" ? null : `${copy.noun} workspace item`,
        description || copy.template,
      ]
        .filter(Boolean)
        .join("\n\n");
      const { error } = await supabase.from("assignments").insert({
        course_id: courseId,
        title: builderKind === "assignment" ? title : `${copy.noun}: ${title}`,
        description: body || null,
        due_date: builderForm.due_date ? new Date(builderForm.due_date).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${builderCopy[builderKind].noun} created`);
      setBuilderForm((current) => ({ ...emptyBuilderForm, course_id: current.course_id }));
      qc.invalidateQueries({ queryKey: ["course-workspace-assignments"] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  function changeSection(section: CourseSection) {
    navigate({ to: "/portal/courses", search: { section } });
  }

  function chooseCourse(courseId: string) {
    setSelectedCourseId(courseId);
    setBuilderForm((current) => ({ ...current, course_id: courseId }));
  }

  function startBuilder(kind: ContentKind, courseId?: string) {
    setBuilderKind(kind);
    setBuilderForm((current) => ({
      ...current,
      course_id: courseId ?? selectedCourse?.id ?? current.course_id,
      description: current.description || builderCopy[kind].template,
    }));
    const targetSection: CourseSection =
      kind === "assignment"
        ? "assignments"
        : kind === "quiz"
          ? "quizzes"
          : kind === "discussion"
            ? "discussions"
            : kind === "article"
              ? "articles"
              : "papers";
    changeSection(targetSection);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            {activeMeta.eyebrow}
          </p>
          <h1 className="mt-2 flex items-center gap-3 font-display text-4xl text-ink">
            <ActiveIcon className="h-8 w-8 text-primary" />
            {activeMeta.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{activeMeta.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => startBuilder("assignment")}>
            <Plus className="h-4 w-4" />
            Assignment
          </Button>
          <Button className="gap-2" onClick={() => startBuilder("quiz")}>
            <Sparkles className="h-4 w-4" />
            New content
          </Button>
        </div>
      </div>

      {dashboardError && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load courses: {getErrorMessage(dashboardError)}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={LibraryBig} label="Courses" value={courses.length} />
        <MetricCard icon={ClipboardList} label="Coursework" value={assignments.length} />
        <MetricCard icon={CalendarClock} label="Open for me" value={myOpenItems.length} />
        <MetricCard icon={Send} label="Submissions" value={submissions.length} />
      </div>

      <Tabs value={activeSection} onValueChange={(value) => changeSection(value as CourseSection)}>
        <TabsList className="h-auto flex-wrap justify-start">
          {courseSections.map((section) => (
            <TabsTrigger key={section} value={section}>
              {sectionMeta[section].label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                  placeholder="Search courses, mentors, or research topics"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredCourses.map((course) => {
                  const mentor = mentorById.get(course.mentor_id);
                  const courseAssignments = assignments.filter(
                    (assignment) => assignment.course_id === course.id,
                  );
                  const courseEnrollmentCount = enrollments.filter(
                    (enrollment) => enrollment.course_id === course.id,
                  ).length;
                  const selected = selectedCourse?.id === course.id;
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => chooseCourse(course.id)}
                      className={cn(
                        "rounded-lg border bg-background p-5 text-left transition hover:border-primary/60 hover:shadow-sm",
                        selected ? "border-primary ring-2 ring-primary/15" : "border-border",
                      )}
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <Badge variant="outline">{courseAssignments.length} items</Badge>
                      </div>
                      <h2 className="font-display text-xl text-ink">{course.title}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mentor: {mentor?.full_name || mentor?.email || "Assigned mentor"}
                      </p>
                      {course.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {course.description}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="secondary">{courseEnrollmentCount} enrolled</Badge>
                        <Badge variant="outline">
                          {courseAssignments.filter((item) => item.due_date).length} due dates
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredCourses.length === 0 && (
                <EmptyState
                  icon={LibraryBig}
                  text={
                    courses.length === 0
                      ? "No courses available yet. Once a mentor creates or assigns a course, it appears here."
                      : "No courses match your search."
                  }
                />
              )}
            </div>

            <CourseInspector
              course={selectedCourse}
              mentor={selectedCourse ? mentorById.get(selectedCourse.mentor_id) : undefined}
              assignments={selectedCourseAssignments}
              enrollmentCount={selectedCourseEnrollmentCount}
              onSection={changeSection}
              onCreate={startBuilder}
            />
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <WorkspaceSection
            kind="assignment"
            canAuthor={canAuthor}
            courses={courses}
            selectedCourse={selectedCourse}
            assignments={assignments}
            submissions={submissions}
            builderKind={builderKind}
            setBuilderKind={setBuilderKind}
            builderForm={builderForm}
            setBuilderForm={setBuilderForm}
            onSubmit={() => createContentMutation.mutate()}
            isSaving={createContentMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="quizzes">
          <WorkspaceSection
            kind="quiz"
            canAuthor={canAuthor}
            courses={courses}
            selectedCourse={selectedCourse}
            assignments={assignments}
            submissions={submissions}
            builderKind={builderKind}
            setBuilderKind={setBuilderKind}
            builderForm={builderForm}
            setBuilderForm={setBuilderForm}
            onSubmit={() => createContentMutation.mutate()}
            isSaving={createContentMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="discussions">
          <WorkspaceSection
            kind="discussion"
            canAuthor={canAuthor}
            courses={courses}
            selectedCourse={selectedCourse}
            assignments={assignments}
            submissions={submissions}
            builderKind={builderKind}
            setBuilderKind={setBuilderKind}
            builderForm={builderForm}
            setBuilderForm={setBuilderForm}
            onSubmit={() => createContentMutation.mutate()}
            isSaving={createContentMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="articles">
          <WorkspaceSection
            kind="article"
            canAuthor={canAuthor}
            courses={courses}
            selectedCourse={selectedCourse}
            assignments={assignments}
            submissions={submissions}
            builderKind={builderKind}
            setBuilderKind={setBuilderKind}
            builderForm={builderForm}
            setBuilderForm={setBuilderForm}
            onSubmit={() => createContentMutation.mutate()}
            isSaving={createContentMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="papers">
          <WorkspaceSection
            kind="paper"
            canAuthor={canAuthor}
            courses={courses}
            selectedCourse={selectedCourse}
            assignments={assignments}
            submissions={submissions}
            builderKind={builderKind}
            setBuilderKind={setBuilderKind}
            builderForm={builderForm}
            setBuilderForm={setBuilderForm}
            onSubmit={() => createContentMutation.mutate()}
            isSaving={createContentMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      {canAuthor && (
        <Card className="p-6">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="font-display text-xl text-ink">Create a course</h2>
            <p className="text-sm text-muted-foreground">
              Mentors can create a course here, then add coursework from any course section.
            </p>
          </div>
          <form
            className="grid gap-4 md:grid-cols-[1fr_1.4fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              createCourseMutation.mutate();
            }}
          >
            <div>
              <Label htmlFor="course-title">Title</Label>
              <Input
                id="course-title"
                value={courseForm.title}
                onChange={(event) =>
                  setCourseForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Research Methods Studio"
              />
            </div>
            <div>
              <Label htmlFor="course-description">Description</Label>
              <Input
                id="course-description"
                value={courseForm.description}
                onChange={(event) =>
                  setCourseForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Evidence appraisal, study design, and manuscript prep"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={createCourseMutation.isPending}
              >
                <Save className="h-4 w-4" />
                Create
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

function WorkspaceSection({
  kind,
  canAuthor,
  courses,
  selectedCourse,
  assignments,
  submissions,
  builderKind,
  setBuilderKind,
  builderForm,
  setBuilderForm,
  onSubmit,
  isSaving,
}: {
  kind: ContentKind;
  canAuthor: boolean;
  courses: Course[];
  selectedCourse?: Course;
  assignments: Assignment[];
  submissions: Submission[];
  builderKind: ContentKind;
  setBuilderKind: (value: ContentKind) => void;
  builderForm: typeof emptyBuilderForm;
  setBuilderForm: React.Dispatch<React.SetStateAction<typeof emptyBuilderForm>>;
  onSubmit: () => void;
  isSaving: boolean;
}) {
  const visibleItems = assignments.filter((assignment) => {
    if (selectedCourse && assignment.course_id !== selectedCourse.id) return false;
    return kind === "assignment" ? true : getContentKind(assignment) === kind;
  });
  const copy = builderCopy[kind];
  const activeCopy = builderCopy[builderKind];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ink">
              {selectedCourse ? selectedCourse.title : copy.noun}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedCourse
                ? `${copy.noun} workspace for the selected course.`
                : "Choose or create a course to focus the workspace."}
            </p>
          </div>
          <Badge variant="secondary">{visibleItems.length} items</Badge>
        </div>

        <div className="space-y-3">
          {visibleItems.map((assignment) => {
            const itemKind = getContentKind(assignment);
            const submitted = submissions.filter(
              (submission) => submission.assignment_id === assignment.id,
            ).length;
            return (
              <div key={assignment.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{assignment.title}</p>
                      <Badge variant="outline">{builderCopy[itemKind].noun}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(assignment.due_date)}
                    </p>
                  </div>
                  <Badge variant={submitted > 0 ? "secondary" : "outline"}>
                    {submitted} submitted
                  </Badge>
                </div>
                {assignment.description && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {assignment.description}
                  </p>
                )}
              </div>
            );
          })}
          {visibleItems.length === 0 && (
            <EmptyState icon={Layers} text={`No ${copy.noun.toLowerCase()} items yet.`} />
          )}
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4">
          <h2 className="font-display text-xl text-ink">{activeCopy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{activeCopy.prompt}</p>
        </div>
        {!canAuthor && (
          <div className="mb-4 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
            Students can view coursework here. Mentor accounts can create and manage new items.
          </div>
        )}
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div>
            <Label>Item type</Label>
            <Select
              value={builderKind}
              onValueChange={(value) => {
                const next = value as ContentKind;
                setBuilderKind(next);
                setBuilderForm((current) => ({
                  ...current,
                  description: current.description || builderCopy[next].template,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(builderCopy) as ContentKind[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {builderCopy[item].noun}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Course</Label>
            <Select
              value={builderForm.course_id || selectedCourse?.id || ""}
              onValueChange={(value) =>
                setBuilderForm((current) => ({ ...current, course_id: value }))
              }
              disabled={!canAuthor}
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
            <Label htmlFor="builder-title">Title</Label>
            <Input
              id="builder-title"
              value={builderForm.title}
              disabled={!canAuthor}
              onChange={(event) =>
                setBuilderForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder={`${activeCopy.noun} title`}
            />
          </div>
          <div>
            <Label htmlFor="builder-due">Due date</Label>
            <Input
              id="builder-due"
              type="datetime-local"
              value={builderForm.due_date}
              disabled={!canAuthor}
              onChange={(event) =>
                setBuilderForm((current) => ({ ...current, due_date: event.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="builder-description">{activeCopy.bodyLabel}</Label>
            <Textarea
              id="builder-description"
              className="min-h-40"
              value={builderForm.description}
              disabled={!canAuthor}
              onChange={(event) =>
                setBuilderForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder={activeCopy.placeholder}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={!canAuthor || isSaving}>
            <Pencil className="h-4 w-4" />
            Create {activeCopy.noun.toLowerCase()}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function CourseInspector({
  course,
  mentor,
  assignments,
  enrollmentCount,
  onSection,
  onCreate,
}: {
  course?: Course;
  mentor?: ProfileSummary;
  assignments: Assignment[];
  enrollmentCount: number;
  onSection: (section: CourseSection) => void;
  onCreate: (kind: ContentKind, courseId?: string) => void;
}) {
  if (!course) {
    return (
      <Card className="p-6">
        <EmptyState icon={BookOpen} text="Select a course to open its workspace." />
      </Card>
    );
  }

  const nextItems = assignments
    .filter(
      (assignment) => !assignment.due_date || new Date(assignment.due_date).getTime() >= Date.now(),
    )
    .slice(0, 4);

  return (
    <Card className="p-6">
      <div className="border-b border-border pb-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Selected course
        </p>
        <h2 className="mt-2 font-display text-2xl text-ink">{course.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mentor?.full_name || mentor?.email || "Assigned mentor"}
        </p>
        {course.description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{course.description}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 py-5">
        <MiniStat label="Members" value={enrollmentCount} />
        <MiniStat label="Items" value={assignments.length} />
      </div>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => onSection("assignments")}
        >
          <ClipboardList className="h-4 w-4" />
          Open assignments
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => onCreate("quiz", course.id)}
        >
          <FileQuestion className="h-4 w-4" />
          Build quiz
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => onCreate("paper", course.id)}
        >
          <GraduationCap className="h-4 w-4" />
          Add paper milestone
        </Button>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 font-medium text-ink">Next up</h3>
        <div className="space-y-2">
          {nextItems.map((assignment) => (
            <div key={assignment.id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-ink">{assignment.title}</p>
              <p className="text-xs text-muted-foreground">{formatDate(assignment.due_date)}</p>
            </div>
          ))}
          {nextItems.length === 0 && (
            <p className="text-sm text-muted-foreground">No upcoming coursework yet.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="font-display text-2xl text-ink">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof BookOpen; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <Icon className="mx-auto mb-2 h-7 w-7" />
      {text}
    </div>
  );
}
