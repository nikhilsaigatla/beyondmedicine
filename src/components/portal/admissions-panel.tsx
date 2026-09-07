import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export function AdmissionsPanel() {
  const qc = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState("");

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

  const pendingApplications = (applications ?? []).filter((application) => application.status === "pending");

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
