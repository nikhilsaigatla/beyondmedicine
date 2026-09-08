import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isLocalAdminMode } from "@/lib/local-admin";
import { getRolePreview } from "@/lib/portal/role-preview";
import { ALL_POSITIONS, ALL_ROLES, hasApplicationManagementAccess, POSITION_LABEL, POSITION_RANK, ROLE_LABEL, ROLE_RANK, type AppRole, type PositionTitle } from "@/lib/portal/labels";
import { suspendMember, reactivateMember, deleteMember } from "@/lib/api/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";

const searchSchema = z.object({ member: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/portal/admin")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: async () => {
    if (isLocalAdminMode()) {
      if (getRolePreview() === "admin") return;
      throw redirect({ to: "/portal" });
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.user.id);
    const { data: positions } = await supabase.from("user_positions").select("position").eq("user_id", user.user.id);
    if (!hasApplicationManagementAccess(
      (roles ?? []).map((role) => role.role as AppRole),
      (positions ?? []).map((position) => position.position as PositionTitle),
    )) {
      throw redirect({ to: "/portal" });
    }
  },
  component: AdminPage,
});

function rankOf(roles: AppRole[], positions: PositionTitle[]): number {
  return Math.max(0, ...roles.map((r) => ROLE_RANK[r]), ...positions.map((p) => POSITION_RANK[p]));
}

function AdminPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const selectedUser = search.member ?? null;
  const [roleToAdd, setRoleToAdd] = useState<AppRole>("member");
  const [positionToAdd, setPositionToAdd] = useState<PositionTitle>("general_member");
  const [mentorId, setMentorId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [accountActionBusy, setAccountActionBusy] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  function setSelectedUser(userId: string | null) {
    navigate({ to: "/portal/admin", search: userId ? { member: userId } : {} });
  }

  const actorRank = isLocalAdminMode() && getRolePreview() === "admin"
    ? 100
    : Math.max(
        ...(me?.roles ?? []).map((role) => ROLE_RANK[role]),
        ...(me?.positions ?? []).map((position) => POSITION_RANK[position]),
        0,
      );
  const assignableRoles = ALL_ROLES.filter((role) => actorRank === 100 || ROLE_RANK[role] < actorRank);
  const assignablePositions = ALL_POSITIONS.filter((position) => actorRank === 100 || POSITION_RANK[position] < actorRank);

  const { data: members } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("*")).data ?? [],
  });

  const { data: allPositions } = useQuery({
    queryKey: ["admin-all-positions"],
    queryFn: async () => (await supabase.from("user_positions").select("*")).data ?? [],
  });

  const { data: pairings } = useQuery({
    queryKey: ["admin-pairings"],
    queryFn: async () => (await supabase.from("mentor_students").select("*")).data ?? [],
  });

  const { data: applications } = useQuery({
    queryKey: ["admin-applications-summary"],
    queryFn: async () => (await supabase.from("applications").select("user_id, status, decided_at, decided_by, notes")).data ?? [],
  });

  const { data: leadershipEntries } = useQuery({
    queryKey: ["admin-leadership-entries"],
    queryFn: async () => (await (supabase.from("leadership_entries" as never) as any).select("id, position, title, name, assignee_id")).data ?? [],
  });

  const selectedMember = members?.find((m) => m.id === selectedUser) ?? null;
  const selectedApplication = applications?.find((a) => a.user_id === selectedUser) ?? null;
  const selectedMentorOf = (pairings ?? []).filter((p) => p.mentor_id === selectedUser);
  const selectedStudentOf = (pairings ?? []).filter((p) => p.student_id === selectedUser);
  const selectedLeadershipEntry = (leadershipEntries ?? []).find((entry: { assignee_id: string | null }) => entry.assignee_id === selectedUser) as
    { id: string; position: string; title: string } | undefined;
  const selectedTargetRank = selectedMember
    ? rankOf(
        (allRoles ?? []).filter((r) => r.user_id === selectedMember.id).map((r) => r.role as AppRole),
        (allPositions ?? []).filter((p) => p.user_id === selectedMember.id).map((p) => p.position as PositionTitle),
      )
    : 0;
  const canActOnSelected = !!selectedMember && selectedMember.id !== me?.user.id && actorRank > selectedTargetRank;
  const canDeleteSelected = canActOnSelected && actorRank >= ROLE_RANK.super_admin && selectedTargetRank < ROLE_RANK.executive;

  const totalMembers = members?.length ?? 0;
  const suspendedCount = (members ?? []).filter((m) => m.status === "suspended").length;
  const pendingApplications = (applications ?? []).filter((a) => a.status === "pending").length;
  const verifiedMembers = (applications ?? []).filter((a) => a.status === "approved").length;
  const uniqueMentors = new Set((pairings ?? []).map((p) => p.mentor_id)).size;
  const uniqueStudents = new Set((pairings ?? []).map((p) => p.student_id)).size;
  const filledLeadershipSlots = (leadershipEntries ?? []).filter((e: { assignee_id: string | null; name: string | null }) => e.assignee_id || e.name).length;
  const vacantLeadershipSlots = (leadershipEntries?.length ?? 0) - filledLeadershipSlots;

  async function assignRole() {
    if (!selectedUser) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: selectedUser, role: roleToAdd });
    if (error) { toast.error(error.message); return; }
    toast.success("Role assigned");
    qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
  }

  async function removeRole(id: string) {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
  }

  async function assignPosition() {
    if (!selectedUser) return;
    const { error } = await supabase.from("user_positions").insert({ user_id: selectedUser, position: positionToAdd });
    if (error) { toast.error(error.message); return; }
    toast.success("Position assigned");
    qc.invalidateQueries({ queryKey: ["admin-all-positions"] });
  }

  async function removePosition(id: string) {
    const { error } = await supabase.from("user_positions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-all-positions"] });
  }

  async function pair(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("mentor_students").insert({ mentor_id: mentorId, student_id: studentId });
    if (error) { toast.error(error.message); return; }
    toast.success("Pairing created");
    setMentorId(""); setStudentId("");
    qc.invalidateQueries({ queryKey: ["admin-pairings"] });
  }

  async function removePairing(id: string) {
    const { error } = await supabase.from("mentor_students").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-pairings"] });
  }

  async function handleSuspendToggle() {
    if (!selectedMember || accountActionBusy) return;
    setAccountActionBusy(true);
    try {
      if (selectedMember.status === "suspended") {
        await reactivateMember({ data: { targetUserId: selectedMember.id } });
        toast.success(`${selectedMember.full_name || selectedMember.email} reactivated`);
      } else {
        await suspendMember({ data: { targetUserId: selectedMember.id } });
        toast.success(`${selectedMember.full_name || selectedMember.email} suspended`);
      }
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      qc.invalidateQueries({ queryKey: ["current-user", selectedMember.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setAccountActionBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedMember || accountActionBusy) return;
    setAccountActionBusy(true);
    try {
      await deleteMember({ data: { targetUserId: selectedMember.id } });
      toast.success(`${selectedMember.full_name || selectedMember.email} deleted`);
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
      setSelectedUser(null);
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
      qc.invalidateQueries({ queryKey: ["admin-all-positions"] });
      qc.invalidateQueries({ queryKey: ["admin-pairings"] });
      qc.invalidateQueries({ queryKey: ["admin-applications-summary"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setAccountActionBusy(false);
    }
  }


  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Founding President controls: roles, positions, mentor pairings.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Members", value: totalMembers },
          { label: "Verified", value: verifiedMembers },
          { label: "Pending applications", value: pendingApplications },
          { label: "Suspended", value: suspendedCount },
          { label: "Mentors", value: uniqueMentors },
          { label: "Students", value: uniqueStudents },
          { label: "Filled leadership slots", value: filledLeadershipSlots },
          { label: "Vacant leadership slots", value: Math.max(0, vacantLeadershipSlots) },
        ].map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-2xl font-display text-ink">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-display text-xl text-ink">Members ({members?.length ?? 0})</h2>
        <div className="grid gap-2">
          {members?.map((m) => {
            const userRoles = (allRoles ?? []).filter((r) => r.user_id === m.id);
            const userPositions = (allPositions ?? []).filter((p) => p.user_id === m.id);
            const active = selectedUser === m.id;
            return (
              <div key={m.id} className={`rounded-lg border p-3 ${active ? "border-primary bg-muted" : "border-border"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">
                      {m.full_name || m.email}
                      {m.status === "suspended" && <Badge variant="destructive" className="ml-2 align-middle">Suspended</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Button variant={active ? "default" : "outline"} size="sm" onClick={() => setSelectedUser(active ? null : m.id)}>
                    {active ? "Selected" : "Select"}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {userRoles.map((r) => (
                    <Badge key={r.id} variant="secondary" className="gap-1">
                      {ROLE_LABEL[r.role as AppRole]}
                      <button onClick={() => removeRole(r.id)} className="ml-1 opacity-70 hover:opacity-100">×</button>
                    </Badge>
                  ))}
                  {userPositions.map((p) => (
                    <Badge key={p.id} variant="outline" className="gap-1">
                      {POSITION_LABEL[p.position as PositionTitle]}
                      <button onClick={() => removePosition(p.id)} className="ml-1 opacity-70 hover:opacity-100">×</button>
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {selectedMember && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-ink">{selectedMember.full_name || selectedMember.email}</h2>
              <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>Close</Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Role</p>
              <Select value={roleToAdd} onValueChange={(v) => setRoleToAdd(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={assignRole}>Assign role</Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Position</p>
              <Select value={positionToAdd} onValueChange={(v) => setPositionToAdd(v as PositionTitle)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignablePositions.map((p) => <SelectItem key={p} value={p}>{POSITION_LABEL[p]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={assignPosition}>Assign position</Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="font-medium text-ink">Admissions</p>
              {selectedApplication ? (
                <div className="mt-1 space-y-1 text-muted-foreground">
                  <p>Status: <Badge variant="outline">{selectedApplication.status}</Badge></p>
                  {selectedApplication.decided_at && <p>Decided {new Date(selectedApplication.decided_at).toLocaleDateString()}</p>}
                  {selectedApplication.notes && <p className="truncate">Reason: {selectedApplication.notes}</p>}
                </div>
              ) : <p className="mt-1 text-muted-foreground">No application on file.</p>}
              <Link to="/portal/admissions" className="mt-1 inline-block text-xs text-primary hover:underline">Open Admissions →</Link>
            </div>
            <div>
              <p className="font-medium text-ink">Mentorship</p>
              <div className="mt-1 space-y-1 text-muted-foreground">
                {selectedMentorOf.length > 0 && <p>Mentors {selectedMentorOf.length} student(s)</p>}
                {selectedStudentOf.length > 0 && <p>Has {selectedStudentOf.length} mentor(s)</p>}
                {selectedMentorOf.length === 0 && selectedStudentOf.length === 0 && <p>No pairings.</p>}
              </div>
            </div>
            <div>
              <p className="font-medium text-ink">Leadership</p>
              {selectedLeadershipEntry ? (
                <p className="mt-1 text-muted-foreground">{selectedLeadershipEntry.title}</p>
              ) : <p className="mt-1 text-muted-foreground">No leadership slot.</p>}
              <Link to="/portal/site-management" className="mt-1 inline-block text-xs text-primary hover:underline">Open Site Management →</Link>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-ink">Account actions</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canActOnSelected || accountActionBusy}
                onClick={handleSuspendToggle}
              >
                {selectedMember.status === "suspended" ? "Reactivate account" : "Suspend account"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={accountActionBusy}
                onClick={async () => {
                  const { error } = await supabase.auth.resetPasswordForEmail(selectedMember.email, {
                    redirectTo: `${window.location.origin}/auth`,
                  });
                  if (error) toast.error(error.message);
                  else toast.success("Password reset email sent");
                }}
              >
                Send password reset
              </Button>
              <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" disabled={!canDeleteSelected || accountActionBusy}>Delete account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedMember.full_name || selectedMember.email}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the Supabase Auth account for <strong>{selectedMember.email}</strong> and
                      cascades to their profile, roles, positions, mentor pairings, applications, courses, messages, and
                      other owned records. Records that reference them as an approver or creator (e.g. decided applications,
                      leadership assignments) are preserved and simply detached. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Type <strong>DELETE</strong> to confirm.</p>
                    <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={accountActionBusy}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={deleteConfirmText !== "DELETE" || accountActionBusy}
                      onClick={(e) => { e.preventDefault(); void handleDelete(); }}
                    >
                      {accountActionBusy ? "Deleting…" : "Delete account"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {!canActOnSelected && selectedMember.id !== me?.user.id && (
              <p className="mt-2 text-xs text-muted-foreground">You do not have a high enough rank to act on this member.</p>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-4 font-display text-xl text-ink">Mentor pairings ({pairings?.length ?? 0})</h2>
        <form onSubmit={pair} className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Select value={mentorId} onValueChange={setMentorId}>
            <SelectTrigger><SelectValue placeholder="Mentor" /></SelectTrigger>
            <SelectContent>
              {members?.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger><SelectValue placeholder="Student" /></SelectTrigger>
            <SelectContent>
              {members?.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={!mentorId || !studentId}>Pair</Button>
        </form>
        <ul className="divide-y divide-border">
          {pairings?.map((p) => {
            const mentor = members?.find((m) => m.id === p.mentor_id);
            const student = members?.find((m) => m.id === p.student_id);
            return (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <span className="font-medium text-ink">{mentor?.full_name || mentor?.email}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span>{student?.full_name || student?.email}</span>
                </span>
                <button onClick={() => removePairing(p.id)} className="text-xs text-muted-foreground hover:text-destructive">Remove</button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
