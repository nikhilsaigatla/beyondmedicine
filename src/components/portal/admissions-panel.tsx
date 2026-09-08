import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendBrevoEmail } from "@/lib/api/brevo.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export function AdmissionsPanel() {
  const qc = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [selectedVerification, setSelectedVerification] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState<string | null>(null);

  const { data: applications, error: applicationsError } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("applications")
        .select("user_id, status, full_name, email, grade_level, country, state_region, county, school, interests, custom_interests, research_experience, research_experience_details, cohort_preference, submitted_at, notes")
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
  });

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
      toast.error("The application was not updated. Check the database policy and migration state.");
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
      if (error) { toast.error(error.message); return; }
      if (updatedApplication?.status !== "approved") {
        toast.error("The application was not updated. Check the database policy and migration state.");
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
      if (error) { toast.error(error.message); return; }
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
        toast.error(emailError instanceof Error ? `Note saved, but the email failed to send: ${emailError.message}` : "Note saved, but the email failed to send.");
      }
      setSelectedVerification(null);
      qc.invalidateQueries({ queryKey: ["admin-applications"] });
    } finally {
      setVerifyBusy(null);
    }
  }

  const pendingApplications = (applications ?? []).filter((application) => application.status === "pending");
  const verificationRequests = (applications ?? []).filter((application) => application.status === "incomplete");

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">Application submissions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Review submissions and record a reason for every decision.</p>
        </div>
        <Badge variant="secondary">{pendingApplications.length} pending</Badge>
      </div>
      {applicationsError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load applications: {applicationsError instanceof Error ? applicationsError.message : "Unknown database error"}
          <p className="mt-1 text-xs">Sign in with a real authorized account. Localhost UI admin mode does not bypass Supabase RLS.</p>
        </div>
      )}

      {verificationRequests.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="font-display text-lg text-ink">Verification requests</h3>
            <Badge variant="outline">{verificationRequests.length}</Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Accounts that were created (e.g. via Google sign-in) but never finished the membership application.</p>
          <div className="grid gap-3">
            {verificationRequests.map((application) => {
              const active = selectedVerification === application.user_id;
              const busy = verifyBusy === application.user_id;
              return (
                <div key={application.user_id} className={`rounded-lg border p-4 ${active ? "border-primary bg-muted" : "border-border"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{application.full_name || application.email}</p>
                      <p className="text-xs text-muted-foreground">{application.email}</p>
                      {application.notes && <p className="mt-1 text-xs text-muted-foreground">{application.notes}</p>}
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
                        onClick={() => verifyWithoutInformation(application.user_id, application.email ?? "")}
                      >
                        Verify without user information
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => requestRefill(application.user_id, application.email ?? "", application.full_name)}
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
          const interests = [...(application.interests ?? []), ...(application.custom_interests ?? [])];
          return (
            <div key={application.user_id} className={`rounded-lg border p-4 ${active ? "border-primary bg-muted" : "border-border"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{application.full_name || application.email}</p>
                  <p className="text-xs text-muted-foreground">{application.email} · {application.school || "School not provided"}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{interests.join(", ") || "No interests listed"}</p>
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
                    <p><span className="font-medium">Grade:</span> {application.grade_level || "Not provided"}</p>
                    <p><span className="font-medium">Location:</span> {[application.county, application.state_region, application.country].filter(Boolean).join(", ") || "Not provided"}</p>
                    <p><span className="font-medium">Research experience:</span> {application.research_experience ? "Yes" : "No"}</p>
                    <p><span className="font-medium">Cohort:</span> {application.cohort_preference || "Not provided"}</p>
                  </div>
                  {application.research_experience_details && <p className="text-sm text-muted-foreground">{application.research_experience_details}</p>}
                  <Textarea value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="Reason for this decision" />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => reviewApplication(application.user_id, "approved")}>Approve application</Button>
                    <Button variant="destructive" onClick={() => reviewApplication(application.user_id, "rejected")}>Deny application</Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {pendingApplications.length === 0 && <p className="text-sm text-muted-foreground">No pending applications.</p>}
      </div>
    </Card>
  );
}
