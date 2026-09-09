import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { POSITION_LABEL, type PositionTitle } from "@/lib/portal/labels";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LeadershipEntry = Tables<"leadership_entries">;

export function LeadershipManager() {
  const qc = useQueryClient();
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [description, setDescription] = useState("");
  const [maxSlots, setMaxSlots] = useState("");
  const [newRole, setNewRole] = useState({
    position: "",
    title: "",
    division: "",
    description: "",
    max_slots: "",
  });
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [entryName, setEntryName] = useState("");
  const [entryImage, setEntryImage] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [addingMemberTo, setAddingMemberTo] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState({ title: "", name: "", image_url: "", description: "" });

  const { data: settings } = useQuery({
    queryKey: ["leadership-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leadership_role_settings")
        .select("*")
        .order("division")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: profiles } = useQuery({
    queryKey: ["leadership-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, bio")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: positions } = useQuery({
    queryKey: ["leadership-positions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_positions").select("id, user_id, position");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: entries } = useQuery({
    queryKey: ["leadership-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leadership_entries")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selectedSetting = (settings ?? []).find((setting) => setting.position === selectedPosition);
  const assignees = (positions ?? []).filter((position) => position.position === selectedPosition);
  const availableProfiles = profiles ?? [];

  async function uploadPhoto(file: File, folder: string) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("leadership-photos")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      toast.error(error.message);
      return null;
    }
    return supabase.storage.from("leadership-photos").getPublicUrl(path).data.publicUrl;
  }

  function selectPosition(position: string) {
    const setting = (settings ?? []).find((item) => item.position === position);
    setSelectedPosition(position);
    setDescription(setting?.description ?? "");
    setMaxSlots(setting?.max_slots == null ? "" : String(setting.max_slots));
    setSelectedUser(assignees[0]?.user_id ?? "");
  }

  async function saveRole() {
    if (!selectedSetting) return;
    const { error } = await supabase
      .from("leadership_role_settings")
      .update({
        description,
        max_slots: maxSlots ? Number(maxSlots) : null,
      })
      .eq("position", selectedPosition);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Leadership role updated");
    qc.invalidateQueries({ queryKey: ["leadership-settings"] });
  }

  async function assignRole() {
    if (!selectedPosition || !selectedUser) return;
    const setting = selectedSetting;
    const currentCount = (entries ?? []).filter(
      (entry) => entry.position === selectedPosition && entry.assignee_id,
    ).length;
    if (
      setting?.max_slots != null &&
      currentCount >= setting.max_slots &&
      !assignees.some((item) => item.user_id === selectedUser)
    ) {
      toast.error("This role has no available slots.");
      return;
    }
    const { error: assignmentError } = await supabase
      .from("user_positions")
      .upsert(
        { user_id: selectedUser, position: selectedPosition as PositionTitle },
        { onConflict: "user_id,position" },
      );
    if (assignmentError) {
      toast.error(assignmentError.message);
      return;
    }
    toast.success("Role assignment saved");
    qc.invalidateQueries({ queryKey: ["leadership-positions"] });
  }

  async function saveProfile() {
    if (!selectedUser) return;
    const { error } = await supabase
      .from("profiles")
      .update({ bio: description })
      .eq("id", selectedUser);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile description updated");
    qc.invalidateQueries({ queryKey: ["leadership-profiles"] });
  }

  async function addRole() {
    if (!newRole.position.trim() || !newRole.title.trim() || !newRole.division.trim()) {
      toast.error("Position key, title, and division are required.");
      return;
    }
    const { error } = await supabase.from("leadership_role_settings").insert({
      position: newRole.position.trim(),
      title: newRole.title.trim(),
      division: newRole.division.trim(),
      description: newRole.description.trim() || null,
      max_slots: newRole.max_slots ? Number(newRole.max_slots) : null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Leadership role added");
    setNewRole({ position: "", title: "", division: "", description: "", max_slots: "" });
    qc.invalidateQueries({ queryKey: ["leadership-settings"] });
  }

  async function deleteRole() {
    if (!selectedSetting || !window.confirm(`Delete the ${selectedSetting.title} role definition?`))
      return;
    const { error } = await supabase
      .from("leadership_role_settings")
      .delete()
      .eq("position", selectedPosition);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Leadership role deleted");
    setSelectedPosition("");
    qc.invalidateQueries({ queryKey: ["leadership-settings"] });
  }

  function selectEntry(id: string) {
    const entry = (entries ?? []).find((item) => item.id === id);
    setSelectedEntryId(id);
    setEntryName(entry?.name ?? "");
    setEntryImage(entry?.image_url ?? "");
    setEntryDescription(entry?.description ?? "");
    setSelectedUser(entry?.assignee_id ?? "");
  }

  async function switchEntryMember(entry: LeadershipEntry, nextUserId: string) {
    const setting = (settings ?? []).find((item) => item.position === entry.position);
    const currentAssigneeId = entry.assignee_id as string | null;
    const currentCount = (entries ?? []).filter(
      (item) => item.position === entry.position && item.assignee_id && item.id !== entry.id,
    ).length;
    if (nextUserId && setting?.max_slots != null && currentCount >= setting.max_slots) {
      toast.error("This role has no available slots.");
      return;
    }
    if (currentAssigneeId && currentAssigneeId !== nextUserId) {
      const { error } = await supabase
        .from("user_positions")
        .delete()
        .eq("user_id", currentAssigneeId)
        .eq("position", entry.position as PositionTitle);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    const profile = (profiles ?? []).find((item) => item.id === nextUserId);
    if (profile && profile.id !== currentAssigneeId) {
      const { error } = await supabase
        .from("user_positions")
        .upsert(
          { user_id: profile.id, position: entry.position as PositionTitle },
          { onConflict: "user_id,position" },
        );
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    const { error } = await supabase
      .from("leadership_entries")
      .update({
        assignee_id: profile?.id ?? null,
        name: profile?.full_name ?? null,
        image_url: profile?.avatar_url ?? null,
        description: profile?.bio ?? null,
      })
      .eq("id", entry.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelectedUser(profile?.id ?? "");
    setEntryName(profile?.full_name ?? "");
    setEntryImage(profile?.avatar_url ?? "");
    setEntryDescription(profile?.bio ?? "");
    toast.success(profile ? "Leadership member switched" : "Leadership slot marked vacant");
    qc.invalidateQueries({ queryKey: ["leadership-entries"] });
    qc.invalidateQueries({ queryKey: ["leadership-positions"] });
  }

  async function saveEntry() {
    if (!selectedEntryId) return;
    const nextName = entryName.trim() || null;
    const { error } = await supabase
      .from("leadership_entries")
      .update({
        name: nextName,
        image_url: nextName ? entryImage.trim() || null : null,
        description: nextName ? entryDescription.trim() || null : null,
      })
      .eq("id", selectedEntryId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Leadership entry updated");
    qc.invalidateQueries({ queryKey: ["leadership-entries"] });
  }

  function prepareRoleForDivision(division: string) {
    setNewRole({ ...newRole, division });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addMemberEntry(division: string) {
    if (!newEntry.title.trim()) {
      toast.error("Add a role title first.");
      return;
    }
    const { error } = await supabase.from("leadership_entries").insert({
      position:
        newEntry.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "") || "custom_role",
      title: newEntry.title.trim(),
      division,
      name: newEntry.name.trim() || null,
      image_url: newEntry.image_url.trim() || null,
      description: newEntry.description.trim() || null,
      sort_order: 999,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Leadership member entry added");
    setNewEntry({ title: "", name: "", image_url: "", description: "" });
    setAddingMemberTo(null);
    qc.invalidateQueries({ queryKey: ["leadership-entries"] });
  }

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="font-display text-xl text-ink">Leadership management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage roles, openings, assignments, descriptions, and member profile photos.
        </p>
      </div>
      <div className="mb-6 grid gap-4 rounded-lg border border-border p-4 lg:grid-cols-[18rem_1fr]">
        <div>
          <Label>Leadership page entry</Label>
          <Select value={selectedEntryId} onValueChange={selectEntry}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose entry" />
            </SelectTrigger>
            <SelectContent>
              {(entries ?? []).map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.name || "Vacant"} · {entry.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedEntryId && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              value={selectedUser || "vacant"}
              onValueChange={(value) => {
                const entry = (entries ?? []).find((item) => item.id === selectedEntryId);
                if (entry) void switchEntryMember(entry, value === "vacant" ? "" : value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Switch assigned member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacant">Vacant</SelectItem>
                {availableProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name || profile.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Name (blank = vacant)"
              value={entryName}
              onChange={(event) => setEntryName(event.target.value)}
            />
            <label className="flex cursor-pointer items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const url = await uploadPhoto(file, selectedEntryId);
                  if (url) setEntryImage(url);
                }}
              />
              {entryImage ? "Replace profile photo" : "Upload profile photo"}
            </label>
            <Textarea
              className="sm:col-span-2"
              placeholder="Public description"
              value={entryDescription}
              onChange={(event) => setEntryDescription(event.target.value)}
            />
            <Button onClick={saveEntry}>Save leadership entry</Button>
          </div>
        )}
      </div>
      <div className="mb-6 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          placeholder="Role key, e.g. research_chair"
          value={newRole.position}
          onChange={(event) => setNewRole({ ...newRole, position: event.target.value })}
        />
        <Input
          placeholder="Role title"
          value={newRole.title}
          onChange={(event) => setNewRole({ ...newRole, title: event.target.value })}
        />
        <Input
          placeholder="Division"
          value={newRole.division}
          onChange={(event) => setNewRole({ ...newRole, division: event.target.value })}
        />
        <Input
          placeholder="Max slots (blank = unlimited)"
          type="number"
          min="1"
          value={newRole.max_slots}
          onChange={(event) => setNewRole({ ...newRole, max_slots: event.target.value })}
        />
        <Input
          placeholder="Description"
          value={newRole.description}
          onChange={(event) => setNewRole({ ...newRole, description: event.target.value })}
        />
        <Button onClick={addRole}>Add role</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-2">
          <Label>Leadership role</Label>
          <Select value={selectedPosition} onValueChange={selectPosition}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a role" />
            </SelectTrigger>
            <SelectContent>
              {(settings ?? []).map((setting) => (
                <SelectItem key={setting.position} value={setting.position}>
                  {setting.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSetting && (
            <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
              <p>{selectedSetting.division}</p>
              <p>
                {assignees.length} assigned ·{" "}
                {selectedSetting.max_slots == null
                  ? "Unlimited slots"
                  : `${selectedSetting.max_slots} slots`}
              </p>
            </div>
          )}
        </div>
        {selectedSetting && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Maximum slots</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxSlots}
                  onChange={(event) => setMaxSlots(event.target.value)}
                  placeholder="Unlimited"
                />
              </div>
              <div>
                <Label>Assign member</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose member" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Role/public description</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={saveRole}>Save role</Button>
              <Button variant="outline" onClick={assignRole}>
                Assign member
              </Button>
              <Button variant="outline" onClick={saveProfile} disabled={!selectedUser}>
                Save member description
              </Button>
              <Button variant="destructive" onClick={deleteRole}>
                Delete role
              </Button>
            </div>
            {selectedUser && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <img
                  src={
                    availableProfiles.find((profile) => profile.id === selectedUser)?.avatar_url ??
                    ""
                  }
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
                Profile photo comes from the member profile.
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-8 border-t border-border pt-8">
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Published preview
          </p>
          <h3 className="mt-2 font-display text-2xl text-ink">How the leadership page will look</h3>
        </div>
        <div className="space-y-8">
          {[...new Set((entries ?? []).map((entry) => entry.division))].map((division) => (
            <section key={division}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="font-display text-xl text-ink">{division}</h4>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => prepareRoleForDivision(division)}
                  >
                    + Add role
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setAddingMemberTo(addingMemberTo === division ? null : division)}
                  >
                    + Add member
                  </Button>
                </div>
              </div>
              {addingMemberTo === division && (
                <div className="mt-4 grid gap-3 rounded-lg border border-primary/30 bg-background p-4 sm:grid-cols-2">
                  <Input
                    placeholder="Role title"
                    value={newEntry.title}
                    onChange={(event) => setNewEntry({ ...newEntry, title: event.target.value })}
                  />
                  <Input
                    placeholder="Member name (blank = vacant)"
                    value={newEntry.name}
                    onChange={(event) => setNewEntry({ ...newEntry, name: event.target.value })}
                  />
                  <label className="flex cursor-pointer items-center justify-center rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const url = await uploadPhoto(file, "new");
                        if (url) setNewEntry({ ...newEntry, image_url: url });
                      }}
                    />
                    Upload profile photo
                  </label>
                  <Input
                    placeholder="Description"
                    value={newEntry.description}
                    onChange={(event) =>
                      setNewEntry({ ...newEntry, description: event.target.value })
                    }
                  />
                  <Button onClick={() => addMemberEntry(division)}>Add to division</Button>
                </div>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {(entries ?? [])
                  .filter((entry) => entry.division === division)
                  .map((entry) => (
                    <article
                      key={entry.id}
                      onClick={() => selectEntry(entry.id)}
                      className={`cursor-pointer overflow-hidden rounded-3xl border bg-card transition hover:-translate-y-1 hover:shadow-lg ${selectedEntryId === entry.id ? "border-primary ring-2 ring-primary/30" : entry.name ? "border-primary/35" : "border-dashed border-border"}`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {entry.image_url ? (
                          <img
                            src={entry.image_url}
                            alt={entry.name ?? entry.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">
                            {entry.name
                              ? entry.name
                                  .split(" ")
                                  .map((part) => part[0])
                                  .slice(0, 2)
                                  .join("")
                              : "?"}
                          </div>
                        )}
                        {!entry.name && (
                          <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            Vacant
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <p
                          className={`font-display text-xl leading-tight ${entry.name ? "text-ink" : "italic text-muted-foreground/70"}`}
                        >
                          {entry.name || "To be announced"}
                        </p>
                        <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                          {entry.title}
                        </p>
                        {entry.name && entry.description && (
                          <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                            {entry.description}
                          </p>
                        )}
                      </div>
                      {selectedEntryId === entry.id && (
                        <div
                          className="border-t border-primary/20 bg-background p-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            Switch assignment
                          </p>
                          <Select
                            value={entry.assignee_id || "vacant"}
                            onValueChange={(value) =>
                              void switchEntryMember(entry, value === "vacant" ? "" : value)
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="vacant">Vacant</SelectItem>
                              {availableProfiles.map((profile) => (
                                <SelectItem key={profile.id} value={profile.id}>
                                  {profile.full_name || profile.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Card>
  );
}
