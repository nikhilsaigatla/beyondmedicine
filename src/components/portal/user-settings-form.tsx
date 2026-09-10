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

export function UserSettingsForm({
  userId,
  initialName,
  initialEmail,
  initialPhone,
  initialBio,
  initialAvatar,
  initialUsername,
}: {
  userId: string;
  initialName: string;
  initialEmail: string;
  initialPhone: string;
  initialBio: string;
  initialAvatar: string;
  initialUsername?: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [username, setUsername] = useState(initialUsername ?? "");
  const [phone, setPhone] = useState(initialPhone);
  const [bio, setBio] = useState(initialBio);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);
  
  // React state to control the modal visibility
  const [showWarning, setShowWarning] = useState(false);

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
    const { error } = await supabase.storage
      .from("leadership-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setAvatarUrl(supabase.storage.from("leadership-photos").getPublicUrl(path).data.publicUrl);
    toast.success("Profile picture uploaded");
  }

  async function save() {
    setBusy(true);
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(cleanUsername)) {
      toast.error(
        "Username must be 3-32 characters using lowercase letters, numbers, or underscores.",
      );
      setBusy(false);
      return;
    }
    // Upsert so a missing profile row after a DB reset self-heals instead of silently failing.
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: (email.trim() || initialEmail).toLowerCase(),
          username: cleanUsername,
          full_name: name.trim(),
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl || null,
        },
        { onConflict: "id" },
      )
      .select("id")
      .maybeSingle();
    if (profileError) {
      toast.error(profileError.message);
      setBusy(false);
      return;
    }
    if (!profileData) {
      toast.error("Could not save your profile. Please refresh and try again.");
      setBusy(false);
      return;
    }
    if (email.trim() !== initialEmail) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: email.trim().toLowerCase(),
      });
      if (emailError) {
        toast.error(emailError.message);
        setBusy(false);
        return;
      }
    }
    const { error: leadershipError } = await supabase
      .from("leadership_entries")
      .update({
        name: name.trim() || null,
        image_url: avatarUrl || null,
        description: bio.trim() || null,
      })
      .eq("name", initialName);
    if (leadershipError)
      toast.error(`Profile saved, but leadership page sync failed: ${leadershipError.message}`);
    qc.invalidateQueries({ queryKey: ["current-user"] });
    qc.invalidateQueries({ queryKey: ["leadership-entries"] });
    toast.success(
      email.trim() !== initialEmail
        ? "Profile saved. Check your email to confirm the new address."
        : "Profile settings saved",
    );
    
    setBusy(false);
    setShowWarning(false); // Close the modal upon successful save
  }

  return (
    <Card className="p-6">
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl text-ink">Profile settings</h2>
          <p className="mt-1 text-sm text-[var(--warning)]">
            NOTICE:
          </p>
          <p className="mt-1 text-sm text-[var(--warning)]">
            Changes you make to these profile settings will be reflected on the public Leadership page when you hold a leadership entry.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl text-muted-foreground">
                {name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </span>
            )}
          </div>
          <div>
            <Label
              htmlFor="profile-photo"
              className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              Upload profile picture
            </Label>
            <input
              id="profile-photo"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPhoto(file);
              }}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Image files only. Maximum size: 5 MB.
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="settings-name">Name</Label>
          <Input
            id="settings-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="settings-username">Username</Label>
          <Input
            id="settings-username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Members can find you in messages with @{username || "username"}.
          </p>
        </div>
        <div>
          <Label htmlFor="settings-email">Email</Label>
          <Input
            id="settings-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Changing email may require confirmation.
          </p>
        </div>
        <div>
          <Label htmlFor="settings-phone">Phone number</Label>
          <Input
            id="settings-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="settings-bio">Leadership description</Label>
          <Textarea
            id="settings-bio"
            rows={5}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </div>
        
        {/* Toggle the modal state instead of using getElementById */}
        <Button onClick={() => setShowWarning(true)}>
          Save settings
        </Button>
      </div>

    {/* Conditionally render the modal based on state */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-background border border-border relative flex w-full max-w-md flex-col justify-between gap-6 rounded-lg p-6 shadow-xl max-h-[95vh] overflow-y-auto">
            
            {/* Top: Text Area */}
            <div>
              <p className="flex justify-center text-lg font-bold leading-relaxed text-[var(--warning)]">
                ⚠️ Warning ⚠️
              </p>
              <p className="mt-1 flex justify-center text-center text-sm leading-relaxed text-[var(--warning)]">
                Changes here will be reflected on the public Leadership page. Here is how your profile will appear:
              </p>
            </div>

            {/* Middle: Live Leadership Page Preview */}
            <div className="flex justify-center">
              <article className="w-full max-w-[280px] overflow-hidden rounded-3xl border border-primary/35 bg-card shadow-md">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name || "Profile preview"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl text-muted-foreground">
                      {name
                        ? name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                        : "?"}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p
                    className={`font-display text-xl leading-tight ${name ? "text-ink" : "italic text-muted-foreground/70"}`}
                  >
                    {name || "To be announced"}
                  </p>
                  <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                    Your Title Here
                  </p>
                  {name && bio && (
                    <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                      {bio}
                    </p>
                  )}
                </div>
              </article>
            </div>

            {/* Bottom: Buttons Row */}
            <div className="flex w-full flex-row justify-center gap-3">
              <Button variant="outline" onClick={() => setShowWarning(false)}>
                Go back
              </Button>
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving..." : "Save settings"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}