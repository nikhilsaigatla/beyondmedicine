import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ACADEMIC_INTERESTS, DISCOVERY_SOURCES } from "@/lib/portal/labels";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/complete-registration")({
  component: CompleteRegistration,
});

const STEPS = ["Personal", "Discovery", "Interests", "Research", "Review"] as const;

function suggestEmail(email: string): string | null {
  const typos: Record<string, string> = { "gmai.com": "gmail.com", "gmial.com": "gmail.com", "gmaiol.com": "gmail.com", "yhaoo.com": "yahoo.com", "hotnail.com": "hotmail.com" };
  const [, domain] = email.split("@");
  return domain && typos[domain] ? email.replace(domain, typos[domain]) : null;
}

function CompleteRegistration() {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    full_name: "", grade_level: "", country: "", state_region: "", county: "",
    school: "", email: "", phone: "", time_zone: "",
    discovery_source: "", interests: [] as string[], custom_interests: [] as string[],
    research_experience: false, research_experience_details: "",
    cohort_preference: "Beginner",
  });
  const [customInterest, setCustomInterest] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["my-application", me?.user.id],
    enabled: !!me,
    queryFn: async () => (await supabase.from("applications").select("*").eq("user_id", me!.user.id).maybeSingle()).data,
  });

  useEffect(() => {
    if (existing) {
      setForm((f) => ({
        ...f,
        full_name: existing.full_name ?? me?.profile?.full_name ?? "",
        grade_level: existing.grade_level ?? "",
        country: existing.country ?? "",
        state_region: existing.state_region ?? "",
        county: existing.county ?? "",
        school: existing.school ?? "",
        email: existing.email ?? me?.user.email ?? "",
        phone: existing.phone ?? "",
        time_zone: existing.time_zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
        discovery_source: existing.discovery_source ?? "",
        interests: existing.interests ?? [],
        custom_interests: existing.custom_interests ?? [],
        research_experience: existing.research_experience ?? false,
        research_experience_details: existing.research_experience_details ?? "",
        cohort_preference: existing.cohort_preference ?? "Beginner",
      }));
    }
  }, [existing, me]);

  // Debounced autosave
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => {
      supabase.from("applications").upsert({ user_id: me.user.id, ...form, status: "incomplete" });
    }, 800);
    return () => clearTimeout(t);
  }, [form, me]);

  const totalInterests = form.interests.length + form.custom_interests.length;
  const emailSuggestion = suggestEmail(form.email);

  function toggle(interest: string) {
    setForm((f) => ({ ...f, interests: f.interests.includes(interest) ? f.interests.filter((i) => i !== interest) : [...f.interests, interest] }));
  }

  async function submit() {
    if (!me) return;
    if (!form.full_name || !form.country || !form.school || !form.email || totalInterests < 3) {
      toast.error("Please complete required fields (name, country, school, email, at least 3 interests).");
      return;
    }
    const { error } = await supabase.from("applications").upsert({
      user_id: me.user.id, ...form, status: "pending", submitted_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted!");
    navigate({ to: "/portal" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Membership Application</h1>
        <p className="mt-1 text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step]}. Your progress saves automatically.</p>
        <Progress value={((step + 1) / STEPS.length) * 100} className="mt-3" />
      </div>

      <Card className="p-6 space-y-4">
        {step === 0 && (
          <>
            <div><Label>Full name *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Grade level</Label><Input value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} /></div>
              <div><Label>School *</Label><Input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div><Label>Country *</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
              <div><Label>State/Province</Label><Input value={form.state_region} onChange={(e) => setForm({ ...form, state_region: e.target.value })} /></div>
              <div><Label>County/Region</Label><Input value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                {emailSuggestion && (
                  <button type="button" onClick={() => setForm({ ...form, email: emailSuggestion })} className="mt-1 text-xs text-primary hover:underline">
                    Did you mean {emailSuggestion}?
                  </button>
                )}
              </div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div><Label>Time zone</Label><Input value={form.time_zone} onChange={(e) => setForm({ ...form, time_zone: e.target.value })} /></div>
          </>
        )}
        {step === 1 && (
          <div>
            <Label>Where did you hear about Beyond Medicine?</Label>
            <Select value={form.discovery_source} onValueChange={(v) => setForm({ ...form, discovery_source: v })}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{DISCOVERY_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        {step === 2 && (
          <>
            <p className="text-sm text-muted-foreground">Select at least 3 interdisciplinary fields. Add your own if it's not listed.</p>
            <div className="flex flex-wrap gap-2">
              {ACADEMIC_INTERESTS.map((i) => (
                <button key={i} type="button" onClick={() => toggle(i)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${form.interests.includes(i) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>
                  {i}
                </button>
              ))}
              {form.custom_interests.map((i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {i}
                  <button onClick={() => setForm({ ...form, custom_interests: form.custom_interests.filter((x) => x !== i) })}>×</button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={customInterest} onChange={(e) => setCustomInterest(e.target.value)} placeholder="Add custom interest" />
              <Button type="button" variant="outline" onClick={() => {
                if (customInterest.trim()) {
                  setForm({ ...form, custom_interests: [...form.custom_interests, customInterest.trim()] });
                  setCustomInterest("");
                }
              }}>Add</Button>
            </div>
            <p className="text-xs text-muted-foreground">{totalInterests} selected (minimum 3).</p>
          </>
        )}
        {step === 3 && (
          <>
            <div>
              <Label>Do you have previous research experience?</Label>
              <div className="mt-2 flex gap-3">
                <Button type="button" variant={form.research_experience ? "default" : "outline"} onClick={() => setForm({ ...form, research_experience: true })}>Yes</Button>
                <Button type="button" variant={!form.research_experience ? "default" : "outline"} onClick={() => setForm({ ...form, research_experience: false })}>No</Button>
              </div>
            </div>
            {form.research_experience && (
              <div><Label>Briefly describe</Label><Textarea value={form.research_experience_details} onChange={(e) => setForm({ ...form, research_experience_details: e.target.value })} /></div>
            )}
            <div>
              <Label>Cohort preference</Label>
              <Select value={form.cohort_preference} onValueChange={(v) => setForm({ ...form, cohort_preference: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner Cohort</SelectItem>
                  <SelectItem value="Intermediate/Advanced">Intermediate/Advanced (writing sample + interview later)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
        {step === 4 && (
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Name:</span> {form.full_name}</p>
            <p><span className="font-medium">School:</span> {form.school}</p>
            <p><span className="font-medium">Location:</span> {[form.county, form.state_region, form.country].filter(Boolean).join(", ")}</p>
            <p><span className="font-medium">Interests:</span> {[...form.interests, ...form.custom_interests].join(", ") || "—"}</p>
            <p><span className="font-medium">Cohort:</span> {form.cohort_preference}</p>
            <p className="text-muted-foreground">By submitting, your application moves to the Founding President for review.</p>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>Continue</Button>
        ) : (
          <Button onClick={submit}>Submit application</Button>
        )}
      </div>
    </div>
  );
}