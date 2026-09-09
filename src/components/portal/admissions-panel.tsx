import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  FileText,
  Inbox,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Send,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendBrevoEmail } from "@/lib/api/brevo.functions";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

type AssignmentStatus = "draft" | "published" | "archived";
type SubmissionStatus = "draft" | "submitted" | "late" | "reviewed" | "returned";
type SubmissionType = "text" | "file";
type TargetStatus = "all" | "selected" | "incomplete" | "pending" | "approved" | "rejected";

type AdmissionsAssignment = {
  id: string;
  title: string;
  summary: string | null;
  instructions: string | null;
  due_at: string | null;
  points: number | null;
  submission_types: SubmissionType[];
  allowed_file_types: string[];
  max_file_size_mb: number;
  rubric: unknown;
  target_status: Exclude<TargetStatus, "all" | "selected"> | null;
  allow_resubmissions: boolean;
  status: AssignmentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type AdmissionsSubmission = {
  id: string;
  assignment_id: string;
  user_id: string;
  status: SubmissionStatus;
  text_response: string | null;
  file_paths: string[];
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  feedback: string | null;
  score: number | null;
  created_at: string;
  updated_at: string;
};

type AssignmentTarget = {
  assignment_id: string;
  user_id: string;
};

type Applicant = {
  user_id: string;
  status: "incomplete" | "pending" | "approved" | "rejected";
  full_name: string | null;
  email: string | null;
  school: string | null;
  grade_level: string | null;
  country: string | null;
  state_region: string | null;
  county: string | null;
  interests: string[];
  custom_interests: string[];
  research_experience: boolean | null;
  research_experience_details: string | null;
  cohort_preference: string | null;
  submitted_at: string | null;
  notes: string | null;
};

type ProfileSummary = {
  full_name: string | null;
  email: string | null;
  school: string | null;
};

type AssignmentForm = {
  title: string;
  summary: string;
  instructions: string;
  due_at: string;
  points: string;
  acceptsText: boolean;
  acceptsFiles: boolean;
  allowed_file_types: string;
  max_file_size_mb: string;
  rubric: string;
  target_status: TargetStatus;
  allow_resubmissions: boolean;
  status: AssignmentStatus;
  target_user_ids: string[];
};

const assignmentDefaults: AssignmentForm = {
  title: "",
  summary: "",
  instructions: "",
  due_at: "",
  points: "",
  acceptsText: true,
  acceptsFiles: false,
  allowed_file_types: "",
  max_file_size_mb: "10",
  rubric: "",
  target_status: "all",
  allow_resubmissions: true,
  status: "draft",
  target_user_ids: [],
};

const statusCopy: Record<SubmissionStatus | "not_started", string> = {
  not_started: "Not Started",
  draft: "In Progress",
  submitted: "Submitted",
  late: "Late",
  reviewed: "Reviewed",
  returned: "Returned",
};

const statusStyles: Record<SubmissionStatus | "not_started", string> = {
  not_started: "border-border bg-muted text-muted-foreground",
  draft: "border-sky-200 bg-sky-50 text-sky-800",
  submitted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  late: "border-amber-200 bg-amber-50 text-amber-800",
  reviewed: "border-primary/25 bg-primary/10 text-primary",
  returned: "border-destructive/25 bg-destructive/10 text-destructive",
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

function isPastDue(value: string | null) {
  return !!value && new Date(value).getTime() < Date.now();
}

function getSubmissionStatus(assignment: AdmissionsAssignment, submission?: AdmissionsSubmission) {
  if (submission?.status) return submission.status;
  return isPastDue(assignment.due_at) ? "late" : "not_started";
}

function fileNameFromPath(path: string) {
  return path.split("/").pop()?.replace(/^\d+-/, "") || path;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Unknown database error";
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function assignmentToForm(assignment: AdmissionsAssignment, targetIds: string[]): AssignmentForm {
  const rubric = Array.isArray(assignment.rubric)
    ? (assignment.rubric as Array<{ label?: string; points?: number }>)
        .map((item) =>
          [item.label, item.points].filter((part) => part !== undefined && part !== "").join(": "),
        )
        .join("\n")
    : "";
  return {
    title: assignment.title,
    summary: assignment.summary ?? "",
    instructions: assignment.instructions ?? "",
    due_at: assignment.due_at ? assignment.due_at.slice(0, 16) : "",
    points: assignment.points === null ? "" : String(assignment.points),
    acceptsText: assignment.submission_types.includes("text"),
    acceptsFiles: assignment.submission_types.includes("file"),
    allowed_file_types: assignment.allowed_file_types.join(", "),
    max_file_size_mb: String(assignment.max_file_size_mb ?? 10),
    rubric,
    target_status: targetIds.length > 0 ? "selected" : (assignment.target_status ?? "all"),
    allow_resubmissions: assignment.allow_resubmissions,
    status: assignment.status,
    target_user_ids: targetIds,
  };
}

function buildRubric(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, points] = line.split(":");
      return { label: label.trim(), points: points ? Number(points.trim()) || null : null };
    });
}

export function AdmissionsPanel() {
  const qc = useQueryClient();
  const { data: me } = useCurrentUser();
  const canManageAssignments = !!me && (me.isApplicationManager || me.isMentor);
  const canReviewApplications = !!me?.isApplicationManager;
  const [activeTab, setActiveTab] = useState("assignments");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionFiles, setSubmissionFiles] = useState<FileList | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(assignmentDefaults);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState("");
  const [reviewStatus, setReviewStatus] = useState<SubmissionStatus>("reviewed");
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState<string | null>(null);

  const assignmentsQuery = useQuery({
    queryKey: ["admissions-assignments", me?.user.id, canManageAssignments],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admissions_assignments")
        .select("*")
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdmissionsAssignment[];
    },
  });

  const submissionsQuery = useQuery({
    queryKey: ["admissions-submissions", me?.user.id, canManageAssignments],
    enabled: !!me,
    queryFn: async () => {
      let query = supabase.from("admissions_assignment_submissions").select("*");
      if (!canManageAssignments) query = query.eq("user_id", me!.user.id);
      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AdmissionsSubmission[];
    },
  });

  const targetsQuery = useQuery({
    queryKey: ["admissions-assignment-targets", canManageAssignments],
    enabled: canManageAssignments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admissions_assignment_targets")
        .select("assignment_id, user_id");
      if (error) throw error;
      return (data ?? []) as AssignmentTarget[];
    },
  });

  const applicantsQuery = useQuery({
    queryKey: ["admissions-applicants-for-assignments", canReviewApplications],
    enabled: canReviewApplications,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "user_id, status, full_name, email, school, grade_level, country, state_region, county, interests, custom_interests, research_experience, research_experience_details, cohort_preference, submitted_at, notes",
        )
        .order("submitted_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Applicant[];
    },
  });

  const applicationsQuery = useQuery({
    queryKey: ["admin-applications"],
    enabled: canReviewApplications,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "user_id, status, full_name, email, grade_level, country, state_region, county, school, interests, custom_interests, research_experience, research_experience_details, cohort_preference, submitted_at, notes",
        )
        .order("submitted_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Applicant[];
    },
  });

  const assignments = useMemo(() => assignmentsQuery.data ?? [], [assignmentsQuery.data]);
  const submissions = useMemo(() => submissionsQuery.data ?? [], [submissionsQuery.data]);
  const assignmentTargets = useMemo(() => targetsQuery.data ?? [], [targetsQuery.data]);
  const applicants = useMemo(() => applicantsQuery.data ?? [], [applicantsQuery.data]);
  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
  const selectedAssignment =
    assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? assignments[0];
  const selectedSubmission = selectedAssignment
    ? submissions.find(
        (submission) =>
          submission.assignment_id === selectedAssignment.id && submission.user_id === me?.user.id,
      )
    : undefined;
  const submissionByAssignment = useMemo(
    () =>
      new Map(
        submissions
          .filter((submission) => submission.user_id === me?.user.id)
          .map((submission) => [submission.assignment_id, submission]),
      ),
    [me?.user.id, submissions],
  );
  const profilesById = useMemo(() => {
    const entries: Array<[string, ProfileSummary]> = applications.map((applicant) => [
      applicant.user_id,
      {
        full_name: applicant.full_name,
        email: applicant.email,
        school: applicant.school,
      },
    ]);
    if (me?.user.id) {
      entries.push([
        me.user.id,
        {
          full_name: me.profile?.full_name ?? null,
          email: me.profile?.email ?? me.user.email ?? null,
          school: me.profile?.school ?? null,
        },
      ]);
    }
    return new Map(entries);
  }, [
    applications,
    me?.profile?.email,
    me?.profile?.full_name,
    me?.profile?.school,
    me?.user.email,
    me?.user.id,
  ]);
  const selectedReviewSubmission = submissions.find(
    (submission) => submission.id === selectedSubmissionId,
  );
  const selectedReviewAssignment = assignments.find(
    (assignment) => assignment.id === selectedReviewSubmission?.assignment_id,
  );
  const reviewQueue = submissions.filter((submission) =>
    ["submitted", "late", "returned", "reviewed"].includes(submission.status),
  );
  const pendingApplications = applications.filter(
    (application) => application.status === "pending",
  );
  const verificationRequests = applications.filter(
    (application) => application.status === "incomplete",
  );
  const visibleTabs = useMemo(
    () => [
      "overview",
      "assignments",
      ...(canManageAssignments ? ["mentor-tools", "submissions"] : []),
      ...(canReviewApplications ? ["applications"] : []),
    ],
    [canManageAssignments, canReviewApplications],
  );

  useEffect(() => {
    if (!selectedAssignmentId && assignments.length > 0) setSelectedAssignmentId(assignments[0].id);
  }, [assignments, selectedAssignmentId]);

  useEffect(() => {
    setSubmissionText(selectedSubmission?.text_response ?? "");
  }, [selectedSubmission?.id, selectedSubmission?.text_response]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab("assignments");
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (!selectedSubmissionId && reviewQueue.length > 0) setSelectedSubmissionId(reviewQueue[0].id);
  }, [reviewQueue, selectedSubmissionId]);

  useEffect(() => {
    setFeedback(selectedReviewSubmission?.feedback ?? "");
    setScore(
      selectedReviewSubmission?.score === null || selectedReviewSubmission?.score === undefined
        ? ""
        : String(selectedReviewSubmission.score),
    );
    setReviewStatus(selectedReviewSubmission?.status === "returned" ? "returned" : "reviewed");
  }, [
    selectedReviewSubmission?.feedback,
    selectedReviewSubmission?.id,
    selectedReviewSubmission?.score,
    selectedReviewSubmission?.status,
  ]);

  function resetAssignmentForm() {
    setEditingAssignmentId(null);
    setAssignmentForm(assignmentDefaults);
  }

  function startEditingAssignment(assignment: AdmissionsAssignment) {
    const targets = assignmentTargets
      .filter((target) => target.assignment_id === assignment.id)
      .map((target) => target.user_id);
    setEditingAssignmentId(assignment.id);
    setAssignmentForm(assignmentToForm(assignment, targets));
    setActiveTab("mentor-tools");
  }

  const saveAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Sign in before saving assignments.");
      const title = assignmentForm.title.trim();
      if (!title) throw new Error("Add an assignment title.");
      const submissionTypes = [
        assignmentForm.acceptsText ? "text" : null,
        assignmentForm.acceptsFiles ? "file" : null,
      ].filter(Boolean) as SubmissionType[];
      if (submissionTypes.length === 0) throw new Error("Choose at least one submission type.");
      const maxFileSize = Number(assignmentForm.max_file_size_mb || 10);
      const targetStatus: AdmissionsAssignment["target_status"] = [
        "incomplete",
        "pending",
        "approved",
        "rejected",
      ].includes(assignmentForm.target_status)
        ? (assignmentForm.target_status as AdmissionsAssignment["target_status"])
        : null;
      const payload = {
        title,
        summary: assignmentForm.summary.trim() || null,
        instructions: assignmentForm.instructions.trim() || null,
        due_at: assignmentForm.due_at ? new Date(assignmentForm.due_at).toISOString() : null,
        points: assignmentForm.points ? Number(assignmentForm.points) : null,
        submission_types: submissionTypes,
        allowed_file_types: parseList(assignmentForm.allowed_file_types),
        max_file_size_mb: Number.isFinite(maxFileSize)
          ? Math.max(1, Math.min(50, maxFileSize))
          : 10,
        rubric: buildRubric(assignmentForm.rubric),
        target_status: targetStatus,
        allow_resubmissions: assignmentForm.allow_resubmissions,
        status: assignmentForm.status,
        updated_by: me.user.id,
      };
      const table = supabase.from("admissions_assignments");
      const { data, error } = editingAssignmentId
        ? await table.update(payload).eq("id", editingAssignmentId).select("id").single()
        : await table
            .insert({ ...payload, created_by: me.user.id })
            .select("id")
            .single();
      if (error) throw error;
      const assignmentId = data.id as string;
      await supabase
        .from("admissions_assignment_targets")
        .delete()
        .eq("assignment_id", assignmentId);
      if (
        assignmentForm.target_status === "selected" &&
        assignmentForm.target_user_ids.length > 0
      ) {
        const { error: targetError } = await supabase.from("admissions_assignment_targets").insert(
          assignmentForm.target_user_ids.map((userId) => ({
            assignment_id: assignmentId,
            user_id: userId,
            assigned_by: me.user.id,
          })),
        );
        if (targetError) throw targetError;
      }
      return assignmentId;
    },
    onSuccess: (assignmentId) => {
      toast.success(editingAssignmentId ? "Assignment updated" : "Assignment created");
      setSelectedAssignmentId(assignmentId);
      resetAssignmentForm();
      qc.invalidateQueries({ queryKey: ["admissions-assignments"] });
      qc.invalidateQueries({ queryKey: ["admissions-assignment-targets"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save assignment.");
    },
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: async (mode: "draft" | "submit") => {
      if (!me || !selectedAssignment) throw new Error("Choose an assignment first.");
      const text = submissionText.trim();
      const existingPaths = selectedSubmission?.file_paths ?? [];
      const uploadedPaths: string[] = [];
      if (submissionFiles && submissionFiles.length > 0) {
        for (const file of Array.from(submissionFiles)) {
          if (file.size > selectedAssignment.max_file_size_mb * 1024 * 1024) {
            throw new Error(
              `${file.name} is larger than ${selectedAssignment.max_file_size_mb} MB.`,
            );
          }
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const path = `${me.user.id}/${selectedAssignment.id}/${Date.now()}-${safeName}`;
          const { error } = await supabase.storage
            .from("admissions-submissions")
            .upload(path, file, {
              cacheControl: "3600",
              upsert: true,
            });
          if (error) throw error;
          uploadedPaths.push(path);
        }
      }
      if (
        mode === "submit" &&
        selectedAssignment.submission_types.includes("text") &&
        !text &&
        existingPaths.length + uploadedPaths.length === 0
      ) {
        throw new Error("Add a response or upload a file before submitting.");
      }
      const submittedStatus: SubmissionStatus = isPastDue(selectedAssignment.due_at)
        ? "late"
        : "submitted";
      const status: SubmissionStatus = mode === "draft" ? "draft" : submittedStatus;
      const payload = {
        assignment_id: selectedAssignment.id,
        user_id: me.user.id,
        status,
        text_response: text || null,
        file_paths: [...existingPaths, ...uploadedPaths],
        submitted_at:
          mode === "draft" ? (selectedSubmission?.submitted_at ?? null) : new Date().toISOString(),
      };
      const { error } = await supabase.from("admissions_assignment_submissions").upsert(payload, {
        onConflict: "assignment_id,user_id",
      });
      if (error) throw error;
    },
    onSuccess: (_data, mode) => {
      toast.success(mode === "draft" ? "Draft saved" : "Assignment submitted");
      setSubmissionFiles(null);
      qc.invalidateQueries({ queryKey: ["admissions-submissions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save submission.");
    },
  });

  const reviewSubmissionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReviewSubmission) throw new Error("Choose a submission to review.");
      const { error } = await supabase
        .from("admissions_assignment_submissions")
        .update({
          feedback: feedback.trim() || null,
          score: score.trim() ? Number(score) : null,
          status: reviewStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: me?.user.id,
        })
        .eq("id", selectedReviewSubmission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(reviewStatus === "returned" ? "Submission returned" : "Submission reviewed");
      qc.invalidateQueries({ queryKey: ["admissions-submissions"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update review.");
    },
  });

  async function openSubmissionFile(path: string) {
    const { data, error } = await supabase.storage
      .from("admissions-submissions")
      .createSignedUrl(path, 300);
    if (error) {
      toast.error(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function reviewApplication(userId: string, status: "approved" | "rejected") {
    const reason = reviewReason.trim();
    if (!reason) {
      toast.error("Add a reason before approving or denying an application.");
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data: updatedApplication, error } = await supabase
      .from("applications")
      .update({
        status,
        notes: reason,
        decided_at: new Date().toISOString(),
        decided_by: user.user.id,
      })
      .eq("user_id", userId)
      .select("user_id, status")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    if (updatedApplication?.status !== status) {
      toast.error(
        "The application was not updated. Check the database policy and migration state.",
      );
      return;
    }
    toast.success(status === "approved" ? "Application approved" : "Application denied");
    setSelectedApplication(null);
    setReviewReason("");
    qc.invalidateQueries({ queryKey: ["admin-applications"] });
    qc.invalidateQueries({ queryKey: ["current-user", userId] });
    qc.invalidateQueries({ queryKey: ["mailing-list-subscribers"] });
  }

  async function verifyWithoutInformation(userId: string, email: string) {
    if (verifyBusy) return;
    setVerifyBusy(userId);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data: updatedApplication, error } = await supabase
        .from("applications")
        .update({
          status: "approved",
          notes: "Verified without a completed application.",
          decided_at: new Date().toISOString(),
          decided_by: user.user.id,
        })
        .eq("user_id", userId)
        .select("user_id, status")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      if (updatedApplication?.status !== "approved") {
        toast.error(
          "The application was not updated. Check the database policy and migration state.",
        );
        return;
      }
      toast.success(`${email} verified without a completed application`);
      setSelectedVerification(null);
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
      qc.invalidateQueries({ queryKey: ["current-user", userId] });
      qc.invalidateQueries({ queryKey: ["mailing-list-subscribers"] });
    } finally {
      setVerifyBusy(null);
    }
  }

  async function requestRefill(userId: string, email: string, fullName: string | null) {
    if (verifyBusy) return;
    setVerifyBusy(userId);
    try {
      const { error } = await supabase
        .from("applications")
        .update({ notes: `Refill requested ${new Date().toLocaleDateString()}` })
        .eq("user_id", userId);
      if (error) {
        toast.error(error.message);
        return;
      }
      try {
        await sendBrevoEmail({
          data: {
            subject: "Please finish your Beyond Medicine application",
            textContent: `Hi ${fullName || "there"},\n\nYour Beyond Medicine account was created, but your membership application is incomplete. Please sign back in and finish your application so we can review it: ${window.location.origin}/portal/complete-registration\n\nThanks,\nBeyond Medicine`,
            recipients: [{ email, name: fullName || undefined }],
          },
        });
        toast.success(`Refill request sent to ${email}`);
      } catch (emailError) {
        toast.error(
          emailError instanceof Error
            ? `Note saved, but the email failed to send: ${emailError.message}`
            : "Note saved, but the email failed to send.",
        );
      }
      setSelectedVerification(null);
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
    } finally {
      setVerifyBusy(null);
    }
  }

  const assignmentStats = useMemo(() => {
    const counts = { done: 0, open: 0, reviewed: 0 };
    for (const assignment of assignments) {
      const status = getSubmissionStatus(assignment, submissionByAssignment.get(assignment.id));
      if (status === "reviewed") counts.reviewed += 1;
      if (["submitted", "late", "reviewed"].includes(status)) counts.done += 1;
      if (["not_started", "draft", "returned"].includes(status)) counts.open += 1;
    }
    return counts;
  }, [assignments, submissionByAssignment]);

  if (assignmentsQuery.error || submissionsQuery.error) {
    const error = assignmentsQuery.error ?? submissionsQuery.error;
    return (
      <Card className="p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load admissions assignments: {getErrorMessage(error)}
          <p className="mt-1 text-xs">
            Apply the admissions assignment migration, then reload the Supabase REST schema.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          {canManageAssignments && <TabsTrigger value="mentor-tools">Mentor Tools</TabsTrigger>}
          {canManageAssignments && <TabsTrigger value="submissions">Submissions</TabsTrigger>}
          {canReviewApplications && <TabsTrigger value="applications">Applications</TabsTrigger>}
        </TabsList>
        {canManageAssignments && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              resetAssignmentForm();
              setActiveTab("mentor-tools");
            }}
          >
            <Plus className="h-4 w-4" />
            New assignment
          </Button>
        )}
      </div>

      <TabsContent value="overview" className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Assigned
            </p>
            <p className="mt-2 font-display text-3xl text-ink">{assignments.length}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Open work
            </p>
            <p className="mt-2 font-display text-3xl text-ink">{assignmentStats.open}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Reviewed
            </p>
            <p className="mt-2 font-display text-3xl text-ink">{assignmentStats.reviewed}</p>
          </Card>
        </div>
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl text-ink">Admissions workspace</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                Track admissions tasks, submit responses, upload required files, and read mentor
                feedback from one organized workspace.
              </p>
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent
        value="assignments"
        className="grid gap-5 lg:grid-cols-[minmax(280px,380px),1fr]"
      >
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl text-ink">Assignments</h2>
            <Badge variant="secondary">{assignments.length}</Badge>
          </div>
          {assignmentsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading assignments...</p>
          ) : assignments.length > 0 ? (
            <div className="space-y-2">
              {assignments.map((assignment) => {
                const status = getSubmissionStatus(
                  assignment,
                  submissionByAssignment.get(assignment.id),
                );
                const selected = selectedAssignment?.id === assignment.id;
                return (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => setSelectedAssignmentId(assignment.id)}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition hover:border-primary/50 hover:bg-muted",
                      selected ? "border-primary bg-muted" : "border-border bg-background",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{assignment.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(assignment.due_at)}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0", statusStyles[status])}>
                        {statusCopy[status]}
                      </Badge>
                    </div>
                    {assignment.summary && (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {assignment.summary}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <Inbox className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No admissions assignments are available yet.
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          {selectedAssignment ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl text-ink">{selectedAssignment.title}</h2>
                    <Badge
                      variant="outline"
                      className={cn(
                        statusStyles[getSubmissionStatus(selectedAssignment, selectedSubmission)],
                      )}
                    >
                      {statusCopy[getSubmissionStatus(selectedAssignment, selectedSubmission)]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedAssignment.summary || "No summary provided."}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground md:text-right">
                  <p>{formatDate(selectedAssignment.due_at)}</p>
                  <p>
                    {selectedAssignment.points === null
                      ? "Ungraded"
                      : `${selectedAssignment.points} points`}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr,320px]">
                <div className="space-y-5">
                  <section>
                    <h3 className="mb-2 font-medium text-ink">Instructions</h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {selectedAssignment.instructions ||
                        "Your mentor has not added detailed instructions yet."}
                    </p>
                  </section>

                  <section className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-medium text-ink">Your submission</h3>
                      {selectedSubmission?.submitted_at && (
                        <p className="text-xs text-muted-foreground">
                          Submitted {formatDate(selectedSubmission.submitted_at)}
                        </p>
                      )}
                    </div>
                    {selectedAssignment.submission_types.includes("text") && (
                      <div>
                        <Label htmlFor="admissions-response">Response</Label>
                        <Textarea
                          id="admissions-response"
                          value={submissionText}
                          onChange={(event) => setSubmissionText(event.target.value)}
                          placeholder="Write your response..."
                          className="mt-1 min-h-36"
                        />
                      </div>
                    )}
                    {selectedAssignment.submission_types.includes("file") && (
                      <div>
                        <Label htmlFor="admissions-files">Files</Label>
                        <Input
                          id="admissions-files"
                          type="file"
                          multiple
                          className="mt-1"
                          accept={selectedAssignment.allowed_file_types.join(",")}
                          onChange={(event) => setSubmissionFiles(event.target.files)}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Max {selectedAssignment.max_file_size_mb} MB each
                          {selectedAssignment.allowed_file_types.length > 0
                            ? ` · ${selectedAssignment.allowed_file_types.join(", ")}`
                            : ""}
                        </p>
                      </div>
                    )}
                    {(selectedSubmission?.file_paths ?? []).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Uploaded files
                        </p>
                        {selectedSubmission!.file_paths.map((path) => (
                          <button
                            key={path}
                            type="button"
                            onClick={() => openSubmissionFile(path)}
                            className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {fileNameFromPath(path)}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={submitAssignmentMutation.isPending}
                        onClick={() => submitAssignmentMutation.mutate("draft")}
                      >
                        <Save className="h-4 w-4" />
                        Save draft
                      </Button>
                      <Button
                        className="gap-2"
                        disabled={submitAssignmentMutation.isPending}
                        onClick={() => submitAssignmentMutation.mutate("submit")}
                      >
                        <Send className="h-4 w-4" />
                        Submit
                      </Button>
                    </div>
                  </section>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Requirements
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-foreground">
                      <p>
                        {selectedAssignment.submission_types.includes("text")
                          ? "Text response accepted"
                          : "No text response required"}
                      </p>
                      <p>
                        {selectedAssignment.submission_types.includes("file")
                          ? "File uploads accepted"
                          : "No file upload required"}
                      </p>
                      <p>
                        {selectedAssignment.allow_resubmissions
                          ? "Resubmissions allowed"
                          : "One submission only"}
                      </p>
                    </div>
                  </div>
                  {Array.isArray(selectedAssignment.rubric) &&
                    selectedAssignment.rubric.length > 0 && (
                      <div className="rounded-lg border border-border p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                          Rubric
                        </p>
                        <div className="mt-3 space-y-2">
                          {(
                            selectedAssignment.rubric as Array<{
                              label?: string;
                              points?: number | null;
                            }>
                          ).map((item, index) => (
                            <div
                              key={`${item.label}-${index}`}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span>{item.label}</span>
                              {item.points !== null && item.points !== undefined && (
                                <span className="text-muted-foreground">{item.points} pts</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  {(selectedSubmission?.feedback || selectedSubmission?.score !== null) && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                        Mentor feedback
                      </p>
                      {selectedSubmission?.score !== null &&
                        selectedSubmission?.score !== undefined && (
                          <p className="mt-2 text-sm font-medium text-ink">
                            Score: {selectedSubmission.score}
                            {selectedAssignment.points !== null
                              ? ` / ${selectedAssignment.points}`
                              : ""}
                          </p>
                        )}
                      {selectedSubmission?.feedback && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                          {selectedSubmission.feedback}
                        </p>
                      )}
                    </div>
                  )}
                </aside>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Select an assignment to view details.
              </p>
            </div>
          )}
        </Card>
      </TabsContent>

      {canManageAssignments && (
        <TabsContent value="mentor-tools" className="grid gap-5 xl:grid-cols-[1fr,360px]">
          <Card className="p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">
                  {editingAssignmentId ? "Edit assignment" : "Create assignment"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Build admissions tasks with text, files, due dates, and review settings.
                </p>
              </div>
              {editingAssignmentId && (
                <Button variant="outline" size="sm" className="gap-2" onClick={resetAssignmentForm}>
                  <RotateCcw className="h-4 w-4" />
                  New
                </Button>
              )}
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveAssignmentMutation.mutate();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="assignment-title">Title</Label>
                  <Input
                    id="assignment-title"
                    value={assignmentForm.title}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({ ...current, title: event.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="assignment-due">Due date</Label>
                  <Input
                    id="assignment-due"
                    type="datetime-local"
                    value={assignmentForm.due_at}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({ ...current, due_at: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="assignment-summary">Summary</Label>
                <Input
                  id="assignment-summary"
                  value={assignmentForm.summary}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({ ...current, summary: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="assignment-instructions">Instructions</Label>
                <Textarea
                  id="assignment-instructions"
                  className="min-h-32"
                  value={assignmentForm.instructions}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      instructions: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="assignment-points">Points</Label>
                  <Input
                    id="assignment-points"
                    type="number"
                    min="0"
                    step="0.5"
                    value={assignmentForm.points}
                    onChange={(event) =>
                      setAssignmentForm((current) => ({ ...current, points: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Visibility</Label>
                  <Select
                    value={assignmentForm.status}
                    onValueChange={(value) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        status: value as AssignmentStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Audience</Label>
                  <Select
                    value={assignmentForm.target_status}
                    onValueChange={(value) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        target_status: value as TargetStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All applicants and members</SelectItem>
                      {canReviewApplications && (
                        <SelectItem value="selected">Selected people</SelectItem>
                      )}
                      <SelectItem value="incomplete">Incomplete applicants</SelectItem>
                      <SelectItem value="pending">Pending applicants</SelectItem>
                      <SelectItem value="approved">Approved members</SelectItem>
                      <SelectItem value="rejected">Rejected applicants</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium text-ink">Text response</span>
                  <Checkbox
                    checked={assignmentForm.acceptsText}
                    onCheckedChange={(checked) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        acceptsText: checked === true,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium text-ink">File upload</span>
                  <Checkbox
                    checked={assignmentForm.acceptsFiles}
                    onCheckedChange={(checked) =>
                      setAssignmentForm((current) => ({
                        ...current,
                        acceptsFiles: checked === true,
                      }))
                    }
                  />
                </label>
              </div>

              {assignmentForm.acceptsFiles && (
                <div className="grid gap-4 md:grid-cols-[1fr,180px]">
                  <div>
                    <Label htmlFor="file-types">Allowed file types</Label>
                    <Input
                      id="file-types"
                      placeholder=".pdf, .docx, image/*"
                      value={assignmentForm.allowed_file_types}
                      onChange={(event) =>
                        setAssignmentForm((current) => ({
                          ...current,
                          allowed_file_types: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="file-size">Max MB</Label>
                    <Input
                      id="file-size"
                      type="number"
                      min="1"
                      max="50"
                      value={assignmentForm.max_file_size_mb}
                      onChange={(event) =>
                        setAssignmentForm((current) => ({
                          ...current,
                          max_file_size_mb: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="assignment-rubric">Rubric</Label>
                <Textarea
                  id="assignment-rubric"
                  placeholder="Clarity: 5&#10;Completeness: 5"
                  value={assignmentForm.rubric}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({ ...current, rubric: event.target.value }))
                  }
                />
              </div>

              {assignmentForm.target_status === "selected" && canReviewApplications && (
                <div className="rounded-lg border border-border p-4">
                  <p className="mb-3 text-sm font-medium text-ink">Selected people</p>
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {applicants.map((applicant) => {
                      const checked = assignmentForm.target_user_ids.includes(applicant.user_id);
                      return (
                        <label
                          key={applicant.user_id}
                          className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              setAssignmentForm((current) => ({
                                ...current,
                                target_user_ids:
                                  value === true
                                    ? [...current.target_user_ids, applicant.user_id]
                                    : current.target_user_ids.filter(
                                        (id) => id !== applicant.user_id,
                                      ),
                              }));
                            }}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {applicant.full_name || applicant.email}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {applicant.email}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <label className="flex items-center justify-between rounded-lg border border-border p-3">
                <span>
                  <span className="block text-sm font-medium text-ink">Allow resubmissions</span>
                  <span className="text-xs text-muted-foreground">
                    Students can replace or add work before review.
                  </span>
                </span>
                <Switch
                  checked={assignmentForm.allow_resubmissions}
                  onCheckedChange={(checked) =>
                    setAssignmentForm((current) => ({ ...current, allow_resubmissions: checked }))
                  }
                />
              </label>

              <Button type="submit" className="gap-2" disabled={saveAssignmentMutation.isPending}>
                <Save className="h-4 w-4" />
                {editingAssignmentId ? "Save changes" : "Create assignment"}
              </Button>
            </form>
          </Card>

          <Card className="p-4">
            <h2 className="mb-4 font-display text-xl text-ink">Published work</h2>
            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(assignment.due_at)}
                      </p>
                    </div>
                    <Badge variant={assignment.status === "published" ? "default" : "outline"}>
                      {assignment.status}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full gap-2"
                    onClick={() => startEditingAssignment(assignment)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              ))}
              {assignments.length === 0 && (
                <p className="text-sm text-muted-foreground">No assignments created yet.</p>
              )}
            </div>
          </Card>
        </TabsContent>
      )}

      {canManageAssignments && (
        <TabsContent value="submissions" className="grid gap-5 lg:grid-cols-[360px,1fr]">
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">Review queue</h2>
              <Badge variant="secondary">{reviewQueue.length}</Badge>
            </div>
            <div className="space-y-2">
              {reviewQueue.map((submission) => {
                const assignment = assignments.find((item) => item.id === submission.assignment_id);
                const profile = profilesById.get(submission.user_id);
                const selected = selectedSubmissionId === submission.id;
                return (
                  <button
                    key={submission.id}
                    type="button"
                    onClick={() => setSelectedSubmissionId(submission.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition hover:border-primary/50 hover:bg-muted",
                      selected ? "border-primary bg-muted" : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {profile?.full_name || profile?.email || "Student"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {assignment?.title || "Assignment"}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusStyles[submission.status]}>
                        {statusCopy[submission.status]}
                      </Badge>
                    </div>
                  </button>
                );
              })}
              {reviewQueue.length === 0 && (
                <p className="text-sm text-muted-foreground">No submitted admissions work yet.</p>
              )}
            </div>
          </Card>
          <Card className="p-6">
            {selectedReviewSubmission && selectedReviewAssignment ? (
              <div className="space-y-5">
                <div className="border-b border-border pb-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Submission review
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-ink">
                    {selectedReviewAssignment.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profilesById.get(selectedReviewSubmission.user_id)?.full_name ||
                      profilesById.get(selectedReviewSubmission.user_id)?.email ||
                      "Student"}{" "}
                    · {formatDate(selectedReviewSubmission.submitted_at)}
                  </p>
                </div>
                {selectedReviewSubmission.text_response && (
                  <div>
                    <h3 className="mb-2 font-medium text-ink">Response</h3>
                    <p className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm leading-relaxed">
                      {selectedReviewSubmission.text_response}
                    </p>
                  </div>
                )}
                {selectedReviewSubmission.file_paths.length > 0 && (
                  <div>
                    <h3 className="mb-2 font-medium text-ink">Files</h3>
                    <div className="space-y-2">
                      {selectedReviewSubmission.file_paths.map((path) => (
                        <button
                          key={path}
                          type="button"
                          onClick={() => openSubmissionFile(path)}
                          className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted"
                        >
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          {fileNameFromPath(path)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-[180px,1fr]">
                  <div>
                    <Label htmlFor="review-score">Score</Label>
                    <Input
                      id="review-score"
                      type="number"
                      value={score}
                      onChange={(event) => setScore(event.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={reviewStatus}
                      onValueChange={(value) => setReviewStatus(value as SubmissionStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="mentor-feedback">Feedback</Label>
                  <Textarea
                    id="mentor-feedback"
                    className="min-h-28"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                  />
                </div>
                <Button
                  className="gap-2"
                  disabled={reviewSubmissionMutation.isPending}
                  onClick={() => reviewSubmissionMutation.mutate()}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Save review
                </Button>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Inbox className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">Choose a submission to review.</p>
              </div>
            )}
          </Card>
        </TabsContent>
      )}

      {canReviewApplications && (
        <TabsContent value="applications">
          <ApplicationReviewPanel
            applications={applications}
            pendingApplications={pendingApplications}
            verificationRequests={verificationRequests}
            applicationsError={applicationsQuery.error}
            selectedApplication={selectedApplication}
            setSelectedApplication={setSelectedApplication}
            reviewReason={reviewReason}
            setReviewReason={setReviewReason}
            selectedVerification={selectedVerification}
            setSelectedVerification={setSelectedVerification}
            verifyBusy={verifyBusy}
            reviewApplication={reviewApplication}
            verifyWithoutInformation={verifyWithoutInformation}
            requestRefill={requestRefill}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}

function ApplicationReviewPanel({
  applications,
  pendingApplications,
  verificationRequests,
  applicationsError,
  selectedApplication,
  setSelectedApplication,
  reviewReason,
  setReviewReason,
  selectedVerification,
  setSelectedVerification,
  verifyBusy,
  reviewApplication,
  verifyWithoutInformation,
  requestRefill,
}: {
  applications: Applicant[];
  pendingApplications: Applicant[];
  verificationRequests: Applicant[];
  applicationsError: unknown;
  selectedApplication: string | null;
  setSelectedApplication: (value: string | null) => void;
  reviewReason: string;
  setReviewReason: (value: string) => void;
  selectedVerification: string | null;
  setSelectedVerification: (value: string | null) => void;
  verifyBusy: string | null;
  reviewApplication: (userId: string, status: "approved" | "rejected") => void;
  verifyWithoutInformation: (userId: string, email: string) => void;
  requestRefill: (userId: string, email: string, fullName: string | null) => void;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">Application submissions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review submissions and record a reason for every decision.
          </p>
        </div>
        <Badge variant="secondary">{pendingApplications.length} pending</Badge>
      </div>
      {!!applicationsError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load applications: {getErrorMessage(applicationsError)}
          <p className="mt-1 text-xs">
            Sign in with a real authorized account. Localhost UI admin mode does not bypass Supabase
            RLS.
          </p>
        </div>
      )}

      {verificationRequests.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-display text-lg text-ink">Verification requests</h3>
            <Badge variant="outline">{verificationRequests.length}</Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Accounts that were created but never finished the membership application.
          </p>
          <div className="grid gap-3">
            {verificationRequests.map((application) => {
              const active = selectedVerification === application.user_id;
              const busy = verifyBusy === application.user_id;
              return (
                <div
                  key={application.user_id}
                  className={cn(
                    "rounded-lg border p-4",
                    active ? "border-primary bg-muted" : "border-border",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">
                        {application.full_name || application.email}
                      </p>
                      <p className="text-xs text-muted-foreground">{application.email}</p>
                      {application.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{application.notes}</p>
                      )}
                    </div>
                    <Button
                      variant={active ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedVerification(active ? null : application.user_id)}
                    >
                      {active ? "Close" : "Review"}
                    </Button>
                  </div>
                  {active && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          verifyWithoutInformation(application.user_id, application.email ?? "")
                        }
                      >
                        Verify without user information
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          requestRefill(
                            application.user_id,
                            application.email ?? "",
                            application.full_name,
                          )
                        }
                      >
                        Request they refill the form
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {pendingApplications.map((application) => {
          const active = selectedApplication === application.user_id;
          const interests = [
            ...(application.interests ?? []),
            ...(application.custom_interests ?? []),
          ];
          return (
            <div
              key={application.user_id}
              className={cn(
                "rounded-lg border p-4",
                active ? "border-primary bg-muted" : "border-border",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">
                    {application.full_name || application.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {application.email} · {application.school || "School not provided"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {interests.join(", ") || "No interests listed"}
                  </p>
                </div>
                <Button
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedApplication(active ? null : application.user_id);
                    setReviewReason("");
                  }}
                >
                  {active ? "Close review" : "Review"}
                </Button>
              </div>
              {active && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p>
                      <span className="font-medium">Grade:</span>{" "}
                      {application.grade_level || "Not provided"}
                    </p>
                    <p>
                      <span className="font-medium">Location:</span>{" "}
                      {[application.county, application.state_region, application.country]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </p>
                    <p>
                      <span className="font-medium">Research experience:</span>{" "}
                      {application.research_experience ? "Yes" : "No"}
                    </p>
                    <p>
                      <span className="font-medium">Cohort:</span>{" "}
                      {application.cohort_preference || "Not provided"}
                    </p>
                  </div>
                  {application.research_experience_details && (
                    <p className="text-sm text-muted-foreground">
                      {application.research_experience_details}
                    </p>
                  )}
                  <Textarea
                    value={reviewReason}
                    onChange={(event) => setReviewReason(event.target.value)}
                    placeholder="Reason for this decision"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => reviewApplication(application.user_id, "approved")}>
                      Approve application
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => reviewApplication(application.user_id, "rejected")}
                    >
                      Deny application
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {pendingApplications.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <CheckCircle2 className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {applications.length === 0 ? "No applications loaded." : "No pending applications."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
