import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CurrentUserData } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme";
import { LoaderCircle, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACADEMIC_INTERESTS,
  DISCOVERY_SOURCES,
  GRADE_LEVELS,
  TIME_ZONES,
} from "@/lib/portal/labels";

const searchSchema = z.object({ redirect: z.string().optional() });
const SIGNUP_STEPS = ["Personal", "Discovery", "Interests", "Research", "Review"] as const;
const PENDING_SIGNUP_ATTEMPTS = 5;
type ApplicationSnapshot = NonNullable<CurrentUserData["application"]>;
type LocationOption = { name: string };
type CountryOption = { country: string; cities: string[] };

const LOCATION_API = "https://countriesnow.space/api/v0.1";

async function fetchLocationOptions(path: string, body?: Record<string, string>): Promise<LocationOption[]> {
  const response = await fetch(`${LOCATION_API}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error("Location suggestions are unavailable right now.");
  const payload = (await response.json()) as {
    error?: boolean;
    data?: LocationOption[] | { states?: LocationOption[]; cities?: string[] };
  };
  if (payload.error || !payload.data) throw new Error("Location suggestions are unavailable right now.");
  if (Array.isArray(payload.data)) return payload.data.filter((option) => option.name?.trim());
  if (payload.data.states) return payload.data.states.filter((option) => option.name?.trim());
  return (payload.data.cities ?? []).filter(Boolean).map((name) => ({ name }));
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({ meta: [{ title: "Member Portal Sign In — Beyond Medicine" }] }),
  component: AuthPage,
});

function AuthPage() {
  const interactiveGradientRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = useSearch({ from: "/auth" });
  const redirectTo = search.redirect ?? "/portal";

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [signupStep, setSignupStep] = useState(0);
  const [signup, setSignup] = useState({
    full_name: "",
    email: "",
    password: "",
    grade_level: "",
    country: "",
    state_region: "",
    county: "",
    school: "",
    phone: "",
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    discovery_source: "",
    interests: [] as string[],
    custom_interests: [] as string[],
    research_experience: null as boolean | null,
    research_experience_details: "",
    cohort_preference: "Beginner",
  });
  const [customInterest, setCustomInterest] = useState("");
  const [countries, setCountries] = useState<LocationOption[]>([]);
  const [states, setStates] = useState<LocationOption[]>([]);
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    fetch(`${LOCATION_API}/countries`)
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const payload = (await response.json()) as { error?: boolean; data?: CountryOption[] };
        if (payload.error || !payload.data) throw new Error();
        setCountries(payload.data.map(({ country }) => ({ name: country })));
      })
      .catch(() => setLocationMessage("Location suggestions are unavailable, but you can still type your location."));
  }, []);

  useEffect(() => {
    if (!signup.country.trim()) {
      setStates([]);
      setRegions([]);
      return;
    }
    fetchLocationOptions("/countries/states", { country: signup.country.trim() })
      .then(setStates)
      .catch(() => setStates([]));
  }, [signup.country]);

  useEffect(() => {
    if (!signup.country.trim() || !signup.state_region.trim()) {
      setRegions([]);
      return;
    }
    fetchLocationOptions("/countries/state/cities", {
      country: signup.country.trim(),
      state: signup.state_region.trim(),
    })
      .then(setRegions)
      .catch(() => setRegions([]));
  }, [signup.country, signup.state_region]);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Location is not supported by this browser.");
      return;
    }
    setLocationBusy(true);
    setLocationMessage("");
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000 }),
      );
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
        { headers: { Accept: "application/json" } },
      );
      if (!response.ok) throw new Error();
      const address = (await response.json()) as {
        address?: { country?: string; state?: string; province?: string; county?: string; region?: string };
      };
      const location = address.address;
      if (!location?.country) throw new Error();
      setSignup((current) => ({
        ...current,
        country: location.country ?? current.country,
        state_region: location.state ?? location.province ?? location.region ?? current.state_region,
        county: location.county ?? current.county,
      }));
      setLocationMessage("Location filled in. Please check it before continuing.");
    } catch {
      setLocationMessage("We could not determine your location. You can enter it manually.");
    } finally {
      setLocationBusy(false);
    }
  }


  async function waitForPendingApplication(userId: string): Promise<ApplicationSnapshot | null> {
    for (let attempt = 0; attempt < PENDING_SIGNUP_ATTEMPTS; attempt += 1) {
      const { data } = await supabase
        .from("applications")
        .select("user_id, status, submitted_at, decided_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (data?.status === "pending" || data?.status === "approved") return data;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  }

  async function ensureApplicationForUser(user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>) {
    const { data: existing } = await supabase
      .from("applications")
      .select("user_id, status, submitted_at, decided_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing && ["pending", "approved", "rejected"].includes(existing.status)) {
      return existing;
    }

    const metadata = user.user_metadata ?? {};
    const interests = Array.isArray(metadata.interests) ? metadata.interests.filter((value): value is string => typeof value === "string") : [];
    const customInterests = Array.isArray(metadata.custom_interests) ? metadata.custom_interests.filter((value): value is string => typeof value === "string") : [];
    const hasCompleteApplication = Boolean(
      metadata.full_name &&
      metadata.grade_level &&
      metadata.country &&
      metadata.school &&
      metadata.discovery_source &&
      interests.length + customInterests.length >= 3 &&
      typeof metadata.research_experience === "boolean",
    );
    const { data: application, error } = await supabase
      .from("applications")
      .upsert({
        user_id: user.id,
        status: hasCompleteApplication ? "pending" : "incomplete",
        full_name: typeof metadata.full_name === "string" ? metadata.full_name : null,
        grade_level: typeof metadata.grade_level === "string" ? metadata.grade_level : null,
        country: typeof metadata.country === "string" ? metadata.country : null,
        state_region: typeof metadata.state_region === "string" ? metadata.state_region : null,
        county: typeof metadata.county === "string" ? metadata.county : null,
        school: typeof metadata.school === "string" ? metadata.school : null,
        email: user.email ?? null,
        phone: typeof metadata.phone === "string" ? metadata.phone : null,
        time_zone: typeof metadata.time_zone === "string" ? metadata.time_zone : null,
        discovery_source: typeof metadata.discovery_source === "string" ? metadata.discovery_source : null,
        interests,
        custom_interests: customInterests,
        research_experience: typeof metadata.research_experience === "boolean" ? metadata.research_experience : null,
        research_experience_details: typeof metadata.research_experience_details === "string" ? metadata.research_experience_details : null,
        cohort_preference: typeof metadata.cohort_preference === "string" ? metadata.cohort_preference : "Beginner",
        submitted_at: hasCompleteApplication ? new Date().toISOString() : null,
      }, { onConflict: "user_id" })
      .select("user_id, status, submitted_at, decided_at")
      .single();
    if (error) throw error;
    return application;
  }

  async function continueWithGoogle() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      toast.error(error.message);
      setBusy(false);
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      try {
        await ensureApplicationForUser(data.user);
        navigate({ to: redirectTo, replace: true });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not initialize your application.");
      }
    });
  }, [navigate, redirectTo]);

  useEffect(() => {
    const interactiveGradient = interactiveGradientRef.current;
    if (!interactiveGradient) return;

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let frameId = 0;

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
    };

    const move = () => {
      currentX += (targetX - currentX) / 20;
      currentY += (targetY - currentY) / 20;
      interactiveGradient.style.transform = `translate(${Math.round(currentX)}px, ${Math.round(currentY)}px)`;
      frameId = requestAnimationFrame(move);
    };

    window.addEventListener("pointermove", handlePointerMove);
    frameId = requestAnimationFrame(move);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "signup" && signupStep < SIGNUP_STEPS.length - 1) {
      nextSignupStep();
      return;
    }
    setBusy(true);
    try {
      if (tab === "signup") {
        const interests = [...signup.interests, ...signup.custom_interests];
        if (
          !signup.full_name.trim() ||
          !signup.email.trim() ||
          signup.password.length < 8 ||
          !signup.grade_level.trim() ||
          !signup.country.trim() ||
          !signup.school.trim() ||
          !signup.discovery_source ||
          interests.length < 3 ||
          signup.research_experience === null ||
          (signup.research_experience && !signup.research_experience_details.trim())
        ) {
          throw new Error(
            "Please complete all required questions and select at least 3 interests.",
          );
        }
        const normalizedSignupEmail = signup.email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedSignupEmail,
          password: signup.password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: {
              full_name: signup.full_name,
              grade_level: signup.grade_level,
              country: signup.country,
              state_region: signup.state_region,
              county: signup.county,
              school: signup.school,
              phone: signup.phone,
              time_zone: signup.time_zone,
              discovery_source: signup.discovery_source,
              interests: signup.interests,
              custom_interests: signup.custom_interests,
              research_experience: signup.research_experience,
              research_experience_details: signup.research_experience_details,
              cohort_preference: signup.cohort_preference,
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          const submittedAt = new Date().toISOString();
          let application: ApplicationSnapshot | null = null;
          if (data.session) {
            const { data: applicationData, error: applicationError } = await supabase
              .from("applications")
              .upsert(
                {
                  user_id: data.user.id,
                  status: "pending",
                  full_name: signup.full_name.trim(),
                  grade_level: signup.grade_level,
                  country: signup.country.trim(),
                  state_region: signup.state_region.trim() || null,
                  county: signup.county.trim() || null,
                  school: signup.school.trim(),
                  email: normalizedSignupEmail,
                  phone: signup.phone.trim() || null,
                  time_zone: signup.time_zone,
                  discovery_source: signup.discovery_source,
                  interests: signup.interests,
                  custom_interests: signup.custom_interests,
                  research_experience: signup.research_experience,
                  research_experience_details: signup.research_experience_details.trim() || null,
                  cohort_preference: signup.cohort_preference,
                  submitted_at: submittedAt,
                },
                { onConflict: "user_id" },
              )
              .select("user_id, status, submitted_at, decided_at")
              .single();
            if (applicationError) throw applicationError;
            application = applicationData;
          } else {
            application = await waitForPendingApplication(data.user.id);
          }
          const resolvedApplication = application ?? {
            user_id: data.user.id,
            status: "incomplete" as const,
            submitted_at: null,
            decided_at: null,
          };
          qc.setQueryData<CurrentUserData | null>(["current-user", data.user.id], {
            user: data.user,
            profile: {
              id: data.user.id,
              email: normalizedSignupEmail,
              full_name: signup.full_name.trim(),
              avatar_url: null,
              bio: null,
              status: "active",
              research_interests: null,
              time_zone: signup.time_zone,
              phone: signup.phone.trim() || null,
              school: signup.school.trim(),
            },
            application: resolvedApplication,
            roles: ["member"],
            positions: ["general_member"],
            isSuperAdmin: false,
            isExecutive: false,
            isOfficer: false,
            isMentor: false,
            isBoard: false,
            isApplicationManager: false,
            hasFullAccess: resolvedApplication.status === "approved",
            rolePreview: "member",
          });
        }
        toast.success("Application submitted. Your account is awaiting review.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: redirectTo, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleInterest(interest: string) {
    setSignup((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest],
    }));
  }

  function validateSignupStep() {
    if (
      signupStep === 0 &&
      (!signup.full_name.trim() ||
        !signup.email.trim() ||
        signup.password.length < 8 ||
        !signup.grade_level ||
        !signup.country.trim() ||
        !signup.school.trim())
    ) {
      toast.error("Please complete your personal information before continuing.");
      return false;
    }
    if (signupStep === 1 && !signup.discovery_source) {
      toast.error("Please select how you heard about Beyond Medicine.");
      return false;
    }
    if (signupStep === 2 && signup.interests.length + signup.custom_interests.length < 3) {
      toast.error("Please select at least 3 research interests.");
      return false;
    }
    if (
      signupStep === 3 &&
      (signup.research_experience === null ||
        (signup.research_experience && !signup.research_experience_details.trim()))
    ) {
      toast.error("Please describe your research experience.");
      return false;
    }
    return true;
  }

  function nextSignupStep() {
    if (validateSignupStep())
      setSignupStep((current) => Math.min(current + 1, SIGNUP_STEPS.length - 1));
  }

  return (
    <div className="auth-page relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-cream px-4 py-12">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>
      <div className="auth-liquid-background" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="auth-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
                result="goo"
              />
              <feBlend in="SourceGraphic" in2="goo" />
            </filter>
          </defs>
        </svg>
        <div className="auth-gradients-container">
          <div className="auth-gradient auth-gradient-one" />
          <div className="auth-gradient auth-gradient-two" />
          <div className="auth-gradient auth-gradient-three" />
          <div className="auth-gradient auth-gradient-four" />
          <div className="auth-gradient auth-gradient-five" />
          <div ref={interactiveGradientRef} className="auth-gradient auth-gradient-interactive" />
        </div>
      </div>
      <div className="relative z-10 w-full max-w-2xl">
        <div className="mb-8 text-center">
          <Link to="/" className="font-display text-3xl text-ink">
            Beyond Medicine
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Member Portal</p>
        </div>
        <Card className="auth-card p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
              <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={continueWithGoogle}>
                Continue with Google
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Step {signupStep + 1} of {SIGNUP_STEPS.length}
                    </span>
                    <span>{SIGNUP_STEPS[signupStep]}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1" aria-label="Signup steps">
                    {SIGNUP_STEPS.map((step, index) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => index < signupStep && setSignupStep(index)}
                        className={`border-b-2 px-1 pb-2 text-[0.65rem] font-medium transition-colors sm:text-xs ${index === signupStep ? "border-primary text-primary" : index < signupStep ? "border-primary/50 text-muted-foreground" : "border-transparent text-muted-foreground/60"}`}
                        aria-label={`Go to ${step}`}
                      >
                        {step}
                      </button>
                    ))}
                  </div>
                </div>

                {signupStep === 0 && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="signup-name">Full name *</Label>
                        <Input
                          id="signup-name"
                          required
                          autoComplete="off"
                          value={signup.full_name}
                          onChange={(e) => setSignup({ ...signup, full_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-email">Email *</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          required
                          autoComplete="off"
                          value={signup.email}
                          onChange={(e) => setSignup({ ...signup, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="signup-password">Password *</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={signup.password}
                        onChange={(e) => setSignup({ ...signup, password: e.target.value })}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Minimum 8 characters.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="signup-grade">Grade level *</Label>
                        <Select
                          value={signup.grade_level}
                          onValueChange={(value) => setSignup({ ...signup, grade_level: value })}
                        >
                          <SelectTrigger id="signup-grade" className="mt-1">
                            <SelectValue placeholder="Select grade level" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADE_LEVELS.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="signup-school">School *</Label>
                        <Input
                          id="signup-school"
                          required
                          autoComplete="off"
                          value={signup.school}
                          onChange={(e) => setSignup({ ...signup, school: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="signup-country">Country *</Label>
                          <button
                            type="button"
                            onClick={useCurrentLocation}
                            disabled={locationBusy}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:cursor-wait disabled:opacity-60"
                          >
                            {locationBusy ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <MapPin className="h-3 w-3" />}
                            Use my location
                          </button>
                        </div>
                        <Input
                          id="signup-country"
                          required
                          list="signup-country-options"
                          autoComplete="country-name"
                          value={signup.country}
                          onChange={(e) => setSignup({ ...signup, country: e.target.value })}
                        />
                        <datalist id="signup-country-options">
                          {countries.map((country) => <option key={country.name} value={country.name} />)}
                        </datalist>
                      </div>
                      <div>
                        <Label htmlFor="signup-state">State/Province</Label>
                        <Input
                          id="signup-state"
                          list="signup-state-options"
                          autoComplete="address-level1"
                          value={signup.state_region}
                          onChange={(e) => setSignup({ ...signup, state_region: e.target.value })}
                        />
                        <datalist id="signup-state-options">
                          {states.map((state) => <option key={state.name} value={state.name} />)}
                        </datalist>
                      </div>
                      <div>
                        <Label htmlFor="signup-county">County/Region</Label>
                        <Input
                          id="signup-county"
                          list="signup-region-options"
                          autoComplete="address-level2"
                          value={signup.county}
                          onChange={(e) => setSignup({ ...signup, county: e.target.value })}
                        />
                        <datalist id="signup-region-options">
                          {regions.map((region) => <option key={region.name} value={region.name} />)}
                        </datalist>
                      </div>
                    </div>
                    {locationMessage && <p className="text-xs text-muted-foreground">{locationMessage}</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="signup-phone">Phone</Label>
                        <Input
                          id="signup-phone"
                          autoComplete="off"
                          value={signup.phone}
                          onChange={(e) => setSignup({ ...signup, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-timezone">Time zone</Label>
                        <Select
                          value={signup.time_zone}
                          onValueChange={(value) => setSignup({ ...signup, time_zone: value })}
                        >
                          <SelectTrigger id="signup-timezone" className="mt-1">
                            <SelectValue placeholder="Select time zone" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_ZONES.map((zone) => (
                              <SelectItem key={zone} value={zone}>
                                {zone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {signupStep === 1 && (
                  <>
                    <div>
                      <Label>Where did you hear about Beyond Medicine? *</Label>
                      <Select
                        value={signup.discovery_source}
                        onValueChange={(value) => setSignup({ ...signup, discovery_source: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select one" />
                        </SelectTrigger>
                        <SelectContent>
                          {DISCOVERY_SOURCES.map((source) => (
                            <SelectItem key={source} value={source}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {signupStep === 2 && (
                  <>
                    <div>
                      <Label>
                        Research interests *{" "}
                        <span className="font-normal text-muted-foreground">
                          (choose at least 3)
                        </span>
                      </Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ACADEMIC_INTERESTS.map((interest) => (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className={`border px-3 py-1.5 text-sm transition ${signup.interests.includes(interest) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
                          >
                            {interest}
                          </button>
                        ))}
                        {signup.custom_interests.map((interest) => (
                          <button
                            key={interest}
                            type="button"
                            onClick={() =>
                              setSignup({
                                ...signup,
                                custom_interests: signup.custom_interests.filter(
                                  (item) => item !== interest,
                                ),
                              })
                            }
                            className="border border-primary bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                          >
                            {interest} ×
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={customInterest}
                          onChange={(e) => setCustomInterest(e.target.value)}
                          placeholder="Add custom interest"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const interest = customInterest.trim();
                            if (interest && !signup.custom_interests.includes(interest)) {
                              setSignup({
                                ...signup,
                                custom_interests: [...signup.custom_interests, interest],
                              });
                              setCustomInterest("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {signup.interests.length + signup.custom_interests.length} selected.
                      </p>
                    </div>
                  </>
                )}

                {signupStep === 3 && (
                  <>
                    <div>
                      <Label>Previous research experience *</Label>
                      <Select
                        value={
                          signup.research_experience === null
                            ? ""
                            : signup.research_experience
                              ? "yes"
                              : "no"
                        }
                        onValueChange={(value) =>
                          setSignup({
                            ...signup,
                            research_experience: value === "yes",
                            research_experience_details:
                              value === "yes" ? signup.research_experience_details : "",
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select one" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {signup.research_experience && (
                      <div>
                        <Label htmlFor="signup-experience">
                          Briefly describe your experience *
                        </Label>
                        <Textarea
                          id="signup-experience"
                          required
                          value={signup.research_experience_details}
                          onChange={(e) =>
                            setSignup({ ...signup, research_experience_details: e.target.value })
                          }
                        />
                      </div>
                    )}
                    <div>
                      <Label>Cohort preference *</Label>
                      <Select
                        value={signup.cohort_preference}
                        onValueChange={(value) =>
                          setSignup({ ...signup, cohort_preference: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner Cohort</SelectItem>
                          <SelectItem value="Intermediate/Advanced">
                            Intermediate/Advanced
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {signupStep === 4 && (
                  <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                    <p className="font-medium text-ink">Review your application</p>
                    <p>
                      <span className="font-medium">Name:</span> {signup.full_name}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span> {signup.email}
                    </p>
                    <p>
                      <span className="font-medium">Grade:</span> {signup.grade_level}
                    </p>
                    <p>
                      <span className="font-medium">School:</span> {signup.school}
                    </p>
                    <p>
                      <span className="font-medium">Location:</span>{" "}
                      {[signup.county, signup.state_region, signup.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    <p>
                      <span className="font-medium">Time zone:</span> {signup.time_zone}
                    </p>
                    <p>
                      <span className="font-medium">Discovery source:</span>{" "}
                      {signup.discovery_source}
                    </p>
                    <p>
                      <span className="font-medium">Interests:</span>{" "}
                      {[...signup.interests, ...signup.custom_interests].join(", ")}
                    </p>
                    <p>
                      <span className="font-medium">Research experience:</span>{" "}
                      {signup.research_experience ? "Yes" : "No"}
                    </p>
                    {signup.research_experience && (
                      <p>
                        <span className="font-medium">Experience details:</span>{" "}
                        {signup.research_experience_details}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Cohort:</span> {signup.cohort_preference}
                    </p>
                    <p className="pt-2 text-muted-foreground">
                      Your account will be created and your application sent for review when you
                      submit.
                    </p>
                  </div>
                )}

                <div className="flex justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={signupStep === 0 || busy}
                    onClick={() => setSignupStep((current) => current - 1)}
                  >
                    Back
                  </Button>
                  {signupStep < SIGNUP_STEPS.length - 1 ? (
                    <Button type="button" onClick={nextSignupStep}>
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" disabled={busy}>
                      {busy ? "Creating account…" : "Create account"}
                    </Button>
                  )}
                </div>
              </form>
              <div className="mt-5 flex items-center gap-3 py-1 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="mt-3 w-full" disabled={busy} onClick={continueWithGoogle}>
                Continue with Google
              </Button>
            </TabsContent>
          </Tabs>
        </Card>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="underline underline-offset-4">
            Back to public site
          </Link>
        </p>
      </div>
    </div>
  );
}
