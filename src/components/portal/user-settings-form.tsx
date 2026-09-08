import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

export function UserSettingsForm({ userId, initialName, initialEmail, initialPhone, initialBio, initialAvatar }: {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialBio: string;
  initialAvatar: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);

  async function uploadPhoto(file: File) {
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("Profile pictures must be 5 MB or smaller.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `profiles/${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("leadership-photos").upload(path, file, { contentType: file.type, upsert: false });
    if (error) { toast.error(error.message); return; }
    setAvatarUrl(supabase.storage.from("leadership-photos").getPublicUrl(path).data.publicUrl);
    toast.success("Profile picture uploaded");
  }

  async function save() {
    setBusy(true);
    const { data: sessionUser } = await supabase.auth.getUser();
    if (sessionUser.user?.id !== userId) {
      console.warn("Profile save: session user id does not match the profile being edited", { sessionUserId: sessionUser.user?.id, userId });
    }
    const whoami = await (supabase.rpc as any)("debug_whoami");
    console.log("debug_whoami", whoami.data, whoami.error);
    const { data: profileData, error: profileError, status, statusText } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), phone: phone.trim() || null, bio: bio.trim() || null, avatar_url: avatarUrl || null })
      .eq("id", userId)
      .select("id")
      .maybeSingle();
    console.log("Profile save response", { profileData, profileError, status, statusText, userId });
    if (profileError) { toast.error(profileError.message); setBusy(false); return; }
    // update() returns no rows without error when RLS silently blocks the write — treat that as a failure too.
    if (!profileData) { toast.error("Could not save your profile. Please refresh and try again."); setBusy(false); return; }
    if (email.trim() !== initialEmail) {
      const { error: emailError } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() });
      if (emailError) { toast.error(emailError.message); setBusy(false); return; }
    }
    const { error: leadershipError } = await (supabase.from("leadership_entries" as never) as any).update({ name: name.trim() || null, image_url: avatarUrl || null, description: bio.trim() || null }).eq("name", initialName);
    if (leadershipError) toast.error(`Profile saved, but leadership page sync failed: ${leadershipError.message}`);
    qc.invalidateQueries({ queryKey: ["current-user"] });
    qc.invalidateQueries({ queryKey: ["leadership-entries"] });
    toast.success(email.trim() !== initialEmail ? "Profile saved. Check your email to confirm the new address." : "Profile settings saved");
    setBusy(false);
  }

  return (
    <Card className="p-6">
      <div className="space-y-5">
        <div><h2 className="font-display text-2xl text-ink">Profile settings</h2><p className="mt-1 text-sm text-muted-foreground">Changes to your profile are reflected on the public Leadership page when you hold a leadership entry.</p></div>
        <div className="flex items-center gap-4"><div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">{avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : <span className="text-xl text-muted-foreground">{name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>}</div><div><Label htmlFor="profile-photo" className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Upload profile picture</Label><input id="profile-photo" type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(file); }} /><p className="mt-2 text-xs text-muted-foreground">Image files only. Maximum size: 5 MB.</p></div></div>
        <div><Label htmlFor="settings-name">Name</Label><Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
        <div><Label htmlFor="settings-email">Email</Label><Input id="settings-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Changing email may require confirmation.</p></div>
        <div><Label htmlFor="settings-phone">Phone number</Label><Input id="settings-phone" value={phone} onChange={(event) => setPhone(event.target.value)} /></div>
        <div><Label htmlFor="settings-bio">Leadership description</Label><Textarea id="settings-bio" rows={5} value={bio} onChange={(event) => setBio(event.target.value)} /></div>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
      </div>
    </Card>
  );
}
