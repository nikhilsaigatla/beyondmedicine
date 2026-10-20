import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { inviteMember, editMember } from "@/lib/api/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function MemberAdministration({
  members,
}: {
  members: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    school: string | null;
  }[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    role: "member" as "member" | "mentor",
  });
  const [edit, setEdit] = useState({ targetUserId: "", fullName: "", phone: "", school: "" });
  const [busy, setBusy] = useState(false);
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      toast.success("Member account updated");
      void qc.invalidateQueries({ queryKey: ["admin-members"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Member update failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="space-y-6 p-6">
      <div>
        <h2 className="font-display text-2xl">Add or edit members</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite mentors and mentees by email. New invited members are approved for portal access.
        </p>
      </div>
      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          void act(() => inviteMember({ data: form }));
        }}
      >
        <label>
          Full name
          <Input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </label>
        <label>
          Email
          <Input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Role
          <select
            className="block w-full rounded border bg-background p-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as "member" | "mentor" })}
          >
            <option value="member">Mentee / member</option>
            <option value="mentor">Mentor</option>
          </select>
        </label>
        <Button disabled={busy}>Send account invitation</Button>
      </form>
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void act(() => editMember({ data: edit }));
        }}
      >
        <label>
          Member to edit
          <select
            className="block w-full rounded border bg-background p-2"
            required
            value={edit.targetUserId}
            onChange={(e) => {
              const m = members.find((m) => m.id === e.target.value);
              if (m)
                setEdit({
                  targetUserId: m.id,
                  fullName: m.full_name || "",
                  phone: m.phone || "",
                  school: m.school || "",
                });
            }}
          >
            <option value="">Choose member</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          Full name
          <Input
            required
            value={edit.fullName}
            onChange={(e) => setEdit({ ...edit, fullName: e.target.value })}
          />
        </label>
        <label>
          Phone
          <Input
            type="tel"
            value={edit.phone}
            onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
          />
        </label>
        <label>
          School
          <Input
            value={edit.school}
            onChange={(e) => setEdit({ ...edit, school: e.target.value })}
          />
        </label>
        <Button disabled={busy || !edit.targetUserId}>Save member information</Button>
      </form>
    </Card>
  );
}
