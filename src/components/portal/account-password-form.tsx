import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function AccountPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="p-6">
      <h2 className="font-display text-2xl">Set your password</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Newly invited members can choose a password here for future sign-ins.
      </p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            toast.error("Passwords must match");
            return;
          }
          setBusy(true);
          try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setPassword("");
            setConfirm("");
            toast.success("Password updated");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not update password");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          New password
          <Input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="block">
          Confirm password
          <Input
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <Button disabled={busy}>Save password</Button>
      </form>
    </Card>
  );
}
