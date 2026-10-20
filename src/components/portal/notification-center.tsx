import { usePortalNotifications } from "@/hooks/use-portal-notifications";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NotificationInbox() {
  const query = usePortalNotifications();
  const qc = useQueryClient();
  async function markRead(id?: string) {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    let update = supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    if (id) update = update.eq("id", id);
    const { error } = await update;
    if (error) toast.error(error.message);
    else void qc.invalidateQueries({ queryKey: ["portal-notifications"] });
  }
  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="font-display text-xl">Your notifications</h2>
        <Button variant="outline" onClick={() => void markRead()}>
          Mark all read
        </Button>
      </div>
      {query.isLoading && <p role="status">Loading notifications…</p>}
      {query.error && (
        <p role="alert" className="text-destructive">
          Could not load notifications: {query.error.message}
        </p>
      )}
      {query.data?.length === 0 && <p className="text-muted-foreground">You’re all caught up.</p>}
      {query.data?.map((n) => (
        <div
          key={n.id}
          className={`rounded-xl border p-4 ${n.read_at ? "" : "border-primary bg-primary/5"}`}
        >
          <a
            href={n.link}
            onClick={() => void markRead(n.id)}
            className="font-medium text-primary hover:underline"
          >
            {n.title}
          </a>
          <p className="mt-1 text-sm">{n.body}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(n.created_at).toLocaleString()}
          </p>
        </div>
      ))}
      <Link to="/portal/settings" className="text-sm text-primary hover:underline">
        Manage email and text preferences
      </Link>
    </Card>
  );
}
export function NotificationPreferencesForm() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email_enabled: true,
    sms_enabled: false,
    phone: "",
    categories: ["membership", "messages", "events", "assignments", "cohorts"],
  });
  const query = useQuery({
    queryKey: ["notification-preferences", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", me!.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  useEffect(() => {
    if (query.data) setForm({ ...query.data, phone: query.data.phone || "" });
  }, [query.data]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: me.user.id, ...form, phone: form.phone || null },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      toast.success("Notification preferences saved");
      void qc.invalidateQueries({ queryKey: ["notification-preferences"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save preferences");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="p-6">
      <h2 className="mb-2 font-display text-xl">Email and text notifications</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Choose how Beyond Medicine contacts you. In-app notifications remain available in your
        inbox.
      </p>
      {query.error && (
        <p role="alert" className="text-destructive">
          Could not load preferences. Please try again.
        </p>
      )}
      <form onSubmit={save} className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.email_enabled}
            onChange={(e) => setForm({ ...form, email_enabled: e.target.checked })}
          />
          Email notifications
        </label>
        <label className="block space-y-2">
          <span>Mobile number (international format)</span>
          <Input
            type="tel"
            placeholder="+12025550123"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            pattern="\+[1-9][0-9]{7,14}"
            required={form.sms_enabled}
          />
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={form.sms_enabled}
            onChange={(e) => setForm({ ...form, sms_enabled: e.target.checked })}
          />
          <span className="text-sm">
            I consent to automated Beyond Medicine portal text notifications at this number. Message
            frequency varies; message and data rates may apply. I can unsubscribe at any time using
            the link in a text or these settings. Consent is optional.
          </span>
        </label>
        <fieldset className="space-y-2">
          <legend className="mb-2 font-medium">Notify me about</legend>
          {["membership", "messages", "events", "assignments", "cohorts"].map((category) => (
            <label key={category} className="flex items-center gap-3 capitalize">
              <input
                type="checkbox"
                checked={form.categories.includes(category)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    categories: e.target.checked
                      ? [...form.categories, category]
                      : form.categories.filter((c) => c !== category),
                  })
                }
              />
              {category}
            </label>
          ))}
        </fieldset>
        <Button disabled={busy || query.isLoading || !!query.error}>
          {busy ? "Saving…" : "Save notification preferences"}
        </Button>
      </form>
    </Card>
  );
}
