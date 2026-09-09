import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  BookOpen,
  GraduationCap,
  Shield,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Users,
  Calendar,
  CalendarClock,
  Sparkles,
  ChevronDown,
  ClipboardList,
  Mail,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { POSITION_LABEL, PORTAL_TAB_ACCESS, type PortalTabAccess } from "@/lib/portal/labels";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AnnouncementOverlay } from "./announcement-overlay";
import { BemeDrawer } from "./beme-drawer";
import { RegistrationGate } from "./registration-gate";
const bmLogo = { url: "/images/bm-logo-transparent.png" };
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";
import { RolePreviewSelect } from "./role-preview-select";
import { isLocalAdminMode } from "@/lib/local-admin";
import { getRolePreview } from "@/lib/portal/role-preview";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  access: PortalTabAccess;
}

export function PortalShell({ children }: { children: ReactNode }) {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [bemeOpen, setBemeOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);
  const canManageAdmissionsWork = !!me && (me.isApplicationManager || me.isMentor);

  const { data: admissionsNotificationCount = 0 } = useQuery({
    queryKey: [
      "admissions-nav-notification-count",
      me?.user.id,
      me?.isApplicationManager,
      me?.isMentor,
    ],
    enabled: canManageAdmissionsWork,
    retry: false,
    queryFn: async () => {
      const [applicationsCount, submissionsCount] = await Promise.all([
        me?.isApplicationManager
          ? supabase
              .from("applications")
              .select("user_id", { count: "exact", head: true })
              .in("status", ["incomplete", "pending"])
          : Promise.resolve({ count: 0, error: null }),
        supabase
          .from("admissions_assignment_submissions")
          .select("id", { count: "exact", head: true })
          .in("status", ["submitted", "late"]),
      ]);
      const firstError = applicationsCount.error ?? submissionsCount.error;
      if (firstError) throw firstError;
      return (applicationsCount.count ?? 0) + (submissionsCount.count ?? 0);
    },
  });

  const nav: NavItem[] = [
    {
      to: "/portal",
      label: "Dashboard",
      icon: LayoutDashboard,
      access: PORTAL_TAB_ACCESS.dashboard,
    },
    {
      to: "/portal/announcements",
      label: "Announcements",
      icon: Megaphone,
      access: PORTAL_TAB_ACCESS.announcements,
    },
    {
      to: "/portal/directory",
      label: "Directory",
      icon: Users,
      access: PORTAL_TAB_ACCESS.directory,
    },
    {
      to: "/portal/messages",
      label: "Messages",
      icon: MessageSquare,
      access: PORTAL_TAB_ACCESS.messages,
    },
    {
      to: "/portal/calendar",
      label: "Calendar",
      icon: Calendar,
      access: PORTAL_TAB_ACCESS.calendar,
    },
    {
      to: "/portal/meetings",
      label: "Meetings",
      icon: CalendarClock,
      access: PORTAL_TAB_ACCESS.meetings,
    },
    { to: "/portal/courses", label: "Courses", icon: BookOpen, access: PORTAL_TAB_ACCESS.courses },
    {
      to: "/portal/admissions",
      label: "Admissions",
      icon: ClipboardList,
      access: PORTAL_TAB_ACCESS.admissions,
    },
    { to: "/portal/beme", label: "BeMe AI", icon: Sparkles, access: PORTAL_TAB_ACCESS.beme },
  ];
  const specialNav: NavItem[] = [
    {
      to: "/portal/mailing-list",
      label: "Mailing List",
      icon: Mail,
      access: PORTAL_TAB_ACCESS.mailingList,
    },
    {
      to: "/portal/mentor",
      label: "Mentor Dashboard",
      icon: GraduationCap,
      access: PORTAL_TAB_ACCESS.mentor,
    },
    { to: "/portal/admin", label: "Administration", icon: Shield, access: PORTAL_TAB_ACCESS.admin },
    {
      to: "/portal/site-management",
      label: "Site Management",
      icon: Settings,
      access: PORTAL_TAB_ACCESS.siteManagement,
    },
  ];

  const canAccessTab = (access: PortalTabAccess) =>
    access === "approved" ||
    (access === "mentor" && !!me?.isMentor) ||
    (access === "admin" && !!me?.isApplicationManager) ||
    (access === "superadmin" && !!me?.isSuperAdmin);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const positionLabel = me?.positions[0] ? POSITION_LABEL[me.positions[0]] : "Member";
  const displayName = me?.profile?.full_name || me?.user.email?.split("@")[0] || "Member";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isLocalAdminRoute = isLocalAdminMode() && pathname === "/portal/admin";
  const isAdmissionsRoute = pathname === "/portal/admissions";
  const gateActive = !!me && !me.hasFullAccess && !isLocalAdminRoute && !isAdmissionsRoute;
  const isApplicantPreview = isLocalAdminMode() && getRolePreview() === "applicant";
  const isRegistrationRoute =
    pathname === "/portal/complete-registration" &&
    (me?.application?.status === "incomplete" || isApplicantPreview);

  if (gateActive && !isRegistrationRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <RegistrationGate status={me!.application?.status ?? "incomplete"} onSignOut={signOut} />
        {me?.canPreviewRoles && (
          <div className="fixed right-4 top-4 z-50 rounded-lg border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
            <RolePreviewSelect compact />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 transform flex-col border-r border-border bg-background transition-transform lg:sticky lg:top-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-5">
          <Link to="/portal" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <img src={bmLogo.url} alt="Beyond Medicine" className="logo-art h-9 w-auto" />
            <Brand className="text-lg text-ink" />
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-1">
            {nav
              .filter((item) => canAccessTab(item.access))
              .map((item) => {
                const active =
                  item.to === "/portal" ? pathname === "/portal" : pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-ink"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.to === "/portal/admissions" && admissionsNotificationCount > 0 && (
                      <span
                        className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[0.65rem] font-semibold leading-none ${
                          active
                            ? "bg-primary-foreground text-primary"
                            : "bg-primary text-primary-foreground"
                        }`}
                        aria-label={`${admissionsNotificationCount} admissions items need review`}
                      >
                        {admissionsNotificationCount > 99 ? "99+" : admissionsNotificationCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            {specialNav.some((item) => canAccessTab(item.access)) && (
              <div className="mt-4 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setSpecialOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-3 py-2 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-muted-foreground"
                  aria-expanded={specialOpen}
                >
                  <span>Special access</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${specialOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {specialOpen &&
                  specialNav
                    .filter((item) => canAccessTab(item.access))
                    .map((item) => {
                      const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                            active
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-ink"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
              </div>
            )}
          </div>
        </nav>
        <div className="shrink-0 border-t border-border p-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/portal/settings" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
          >
            <Avatar className="h-9 w-9">
              {me?.profile?.avatar_url && <AvatarImage src={me.profile.avatar_url} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{positionLabel}</p>
            </div>
          </button>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
            <ThemeToggle />
          </div>
          <Link
            to="/"
            className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-ink"
          >
            <UserIcon className="h-3 w-3" /> Public site
          </Link>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
          <button onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={bmLogo.url} alt="" className="logo-art h-7 w-auto" />
            <Brand className="text-base text-ink" />
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {gateActive && !isRegistrationRoute ? (
            <RegistrationGate status={me!.application?.status ?? "incomplete"} />
          ) : (
            children
          )}
        </main>
      </div>

      <AnnouncementOverlay />
      {me?.canPreviewRoles && (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
          <RolePreviewSelect compact />
        </div>
      )}
      {!gateActive && (
        <>
          <button
            onClick={() => setBemeOpen(true)}
            aria-label="Open BeMe AI"
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
          >
            <Sparkles className="h-6 w-6" />
          </button>
          <BemeDrawer open={bemeOpen} onOpenChange={setBemeOpen} />
        </>
      )}
    </div>
  );
}
