import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock, FileText, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/portal/admissions")({
  beforeLoad: async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth" });
  },
  component: AdmissionsPage,
});

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
  decided_at: string | null;
  notes: string | null;
};

const statusStyles: Record<Applicant["status"], string> = {
  incomplete: "border-amber-200 bg-amber-50 text-amber-800",
  pending: "border-sky-200 bg-sky-50 text-sky-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-destructive/25 bg-destructive/10 text-destructive",
};

function formatDate(value: string | null) {
  if (!value) return "Not submitted";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Unknown error";
}

function AdmissionsPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const canReviewApplications = !!me?.isApplicationManager;

  const applicationsQuery = useQuery({
    queryKey: ["admissions-applications"],
    enabled: canReviewApplications,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(
          "user_id, status, full_name, email, school, grade_level, country, state_region, county, interests, custom_interests, research_experience, research_experience_details, cohort_preference, submitted_at, decided_at, notes",
        )
        .order("submitted_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Applicant[];
    },
  });

  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
  const pendingApplications = applications.filter(
    (application) => application.status === "pending",
  );
  const incompleteApplications = applications.filter(
    (application) => application.status === "incomplete",
  );
  const decidedApplications = applications.filter((application) =>
    ["approved", "rejected"].includes(application.status),
  );
  const selectedApplicant =
    applications.find((application) => application.user_id === selectedApplicantId) ??
    pendingApplications[0] ??
    incompleteApplications[0] ??
    null;

  async function reviewApplication(userId: string, status: "approved" | "rejected") {
    const cleanReason = reason.trim();
    if (!cleanReason) {
      toast.error("Add a reason before recording a decision.");
      return;
    }
    if (!me) return;
    setBusyId(userId);
    const { data, error } = await supabase
      .from("applications")
      .update({
        status,
        notes: cleanReason,
        decided_at: new Date().toISOString(),
        decided_by: me.user.id,
      })
      .eq("user_id", userId)
      .select("user_id, status")
      .single();
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data?.status !== status) {
      toast.error("The application did not update. Check the database policy state.");
      return;
    }
    toast.success(status === "approved" ? "Application approved" : "Application denied");
    setReason("");
    setSelectedApplicantId(null);
    qc.invalidateQueries({ queryKey: ["admissions-applications"] });
    qc.invalidateQueries({ queryKey: ["admin-applications-summary"] });
    qc.invalidateQueries({ queryKey: ["current-user", userId] });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Admissions portal
        </p>
        <h1 className="mt-2 font-display text-4xl text-ink">Application Decisions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review applicants, approve members, and deny applications with a recorded decision note.
        </p>
      </div>

      {!canReviewApplications ? (
        <Card className="p-8 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 font-display text-2xl text-ink">
            Admissions is for application managers
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Course assignments and student work now live under Courses.
          </p>
        </Card>
      ) : (
        <>
          {applicationsQuery.error && (
            <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Could not load applications: {getErrorMessage(applicationsQuery.error)}
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard icon={Clock} label="Pending" value={pendingApplications.length} />
            <MetricCard icon={FileText} label="Incomplete" value={incompleteApplications.length} />
            <MetricCard
              icon={CheckCircle2}
              label="Approved"
              value={applications.filter((item) => item.status === "approved").length}
            />
            <MetricCard
              icon={XCircle}
              label="Denied"
              value={applications.filter((item) => item.status === "rejected").length}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-ink">Pending applications</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select an applicant to see their full submission and record a decision.
                  </p>
                </div>
                <Badge variant="secondary">{pendingApplications.length}</Badge>
              </div>

              <div className="grid gap-3">
                {pendingApplications.map((application) => (
                  <ApplicantRow
                    key={application.user_id}
                    application={application}
                    selected={selectedApplicant?.user_id === application.user_id}
                    onSelect={() => {
                      setSelectedApplicantId(application.user_id);
                      setReason("");
                    }}
                  />
                ))}
                {pendingApplications.length === 0 && (
                  <EmptyState text="No pending applications are waiting for review." />
                )}
              </div>

              {incompleteApplications.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="font-display text-lg text-ink">Incomplete signups</h3>
                    <Badge variant="outline">{incompleteApplications.length}</Badge>
                  </div>
                  <div className="grid gap-3">
                    {incompleteApplications.map((application) => (
                      <ApplicantRow
                        key={application.user_id}
                        application={application}
                        selected={selectedApplicant?.user_id === application.user_id}
                        onSelect={() => {
                          setSelectedApplicantId(application.user_id);
                          setReason("");
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              {selectedApplicant ? (
                <div className="space-y-5">
                  <div className="border-b border-border pb-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                          Applicant review
                        </p>
                        <h2 className="mt-2 font-display text-2xl text-ink">
                          {selectedApplicant.full_name || selectedApplicant.email}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedApplicant.email}
                        </p>
                      </div>
                      <Badge variant="outline" className={statusStyles[selectedApplicant.status]}>
                        {selectedApplicant.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm">
                    <InfoLine label="School" value={selectedApplicant.school} />
                    <InfoLine label="Grade" value={selectedApplicant.grade_level} />
                    <InfoLine
                      label="Location"
                      value={[
                        selectedApplicant.county,
                        selectedApplicant.state_region,
                        selectedApplicant.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    />
                    <InfoLine label="Cohort" value={selectedApplicant.cohort_preference} />
                    <InfoLine
                      label="Submitted"
                      value={formatDate(selectedApplicant.submitted_at)}
                    />
                  </div>

                  <div>
                    <h3 className="mb-2 font-medium text-ink">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...(selectedApplicant.interests ?? []),
                        ...(selectedApplicant.custom_interests ?? []),
                      ].map((interest) => (
                        <Badge key={interest} variant="secondary">
                          {interest}
                        </Badge>
                      ))}
                      {selectedApplicant.interests.length +
                        selectedApplicant.custom_interests.length ===
                        0 && <p className="text-sm text-muted-foreground">No interests listed.</p>}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 font-medium text-ink">Research experience</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedApplicant.research_experience ? "Yes" : "No"}
                    </p>
                    {selectedApplicant.research_experience_details && (
                      <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border p-3 text-sm leading-relaxed">
                        {selectedApplicant.research_experience_details}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-ink" htmlFor="decision-reason">
                      Decision reason
                    </label>
                    <Textarea
                      id="decision-reason"
                      className="mt-2 min-h-28"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Record why this applicant is being approved or denied."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="gap-2"
                      disabled={busyId === selectedApplicant.user_id}
                      onClick={() => reviewApplication(selectedApplicant.user_id, "approved")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      className="gap-2"
                      disabled={busyId === selectedApplicant.user_id}
                      onClick={() => reviewApplication(selectedApplicant.user_id, "rejected")}
                    >
                      <XCircle className="h-4 w-4" />
                      Deny
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState text="Choose an applicant to review." />
              )}
            </Card>
          </div>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-ink">Recent decisions</h2>
              <Badge variant="secondary">{decidedApplications.length}</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {decidedApplications.slice(0, 8).map((application) => (
                <div key={application.user_id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">
                        {application.full_name || application.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(application.decided_at)}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusStyles[application.status]}>
                      {application.status}
                    </Badge>
                  </div>
                  {application.notes && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {application.notes}
                    </p>
                  )}
                </div>
              ))}
              {decidedApplications.length === 0 && <EmptyState text="No decisions recorded yet." />}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function ApplicantRow({
  application,
  selected,
  onSelect,
}: {
  application: Applicant;
  selected: boolean;
  onSelect: () => void;
}) {
  const interests = [...(application.interests ?? []), ...(application.custom_interests ?? [])];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "rounded-lg border p-4 text-left transition hover:border-primary/50 hover:bg-muted",
        selected ? "border-primary bg-muted" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">
            {application.full_name || application.email}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {application.email} - {application.school || "School not provided"}
          </p>
          <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">
            {interests.join(", ") || "No interests listed"}
          </p>
        </div>
        <Badge variant="outline" className={statusStyles[application.status]}>
          {application.status}
        </Badge>
      </div>
    </button>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
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

function InfoLine({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-ink">{value || "Not provided"}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <FileText className="mx-auto mb-2 h-7 w-7" />
      {text}
    </div>
  );
}
