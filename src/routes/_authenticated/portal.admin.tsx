import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isLocalAdminMode } from "@/lib/local-admin";
import { getRolePreview } from "@/lib/portal/role-preview";
import { ALL_POSITIONS, ALL_ROLES, hasApplicationManagementAccess, POSITION_LABEL, POSITION_RANK, ROLE_LABEL, ROLE_RANK, type AppRole, type PositionTitle } from "@/lib/portal/labels";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";

export const Route = createFileRoute("/_authenticated/portal/admin")({
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

function AdminPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<AppRole>("member");
  const [positionToAdd, setPositionToAdd] = useState<PositionTitle>("general_member");
  const [mentorId, setMentorId] = useState("");
  const [studentId, setStudentId] = useState("");
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


  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Administration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Founding President controls: roles, positions, mentor pairings.</p>
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
                    <p className="font-medium text-ink">{m.full_name || m.email}</p>
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

      {selectedUser && (
        <Card className="p-6">
          <h2 className="mb-4 font-display text-xl text-ink">Assign to selected member</h2>
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
              <li key={p.id} className="py-2 text-sm">
                <span className="font-medium text-ink">{mentor?.full_name || mentor?.email}</span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span>{student?.full_name || student?.email}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
