import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Megaphone, MessageSquare, BookOpen,
  GraduationCap, Shield, LogOut, Menu, X, User as UserIcon,
  Users, Calendar, CalendarClock, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { POSITION_LABEL } from "@/lib/portal/labels";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AnnouncementOverlay } from "./announcement-overlay";
import { BemeDrawer } from "./beme-drawer";
import { RegistrationGate } from "./registration-gate";
const bmLogo = { url: "/images/bm-logo-transparent.png" };
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard; }

export function PortalShell({ children }: { children: ReactNode }) {
  const { data: me } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [bemeOpen, setBemeOpen] = useState(false);

  const nav: NavItem[] = [
    { to: "/portal", label: "Dashboard", icon: LayoutDashboard },
    { to: "/portal/announcements", label: "Announcements", icon: Megaphone },
    { to: "/portal/directory", label: "Directory", icon: Users },
    { to: "/portal/messages", label: "Messages", icon: MessageSquare },
    { to: "/portal/calendar", label: "Calendar", icon: Calendar },
    { to: "/portal/meetings", label: "Meetings", icon: CalendarClock },
    { to: "/portal/courses", label: "Courses", icon: BookOpen },
    { to: "/portal/beme", label: "BeMe AI", icon: Sparkles },
  ];
  if (me?.isMentor) nav.push({ to: "/portal/mentor", label: "Mentor Dashboard", icon: GraduationCap });
  if (me?.isSuperAdmin) nav.push({ to: "/portal/admin", label: "Administration", icon: Shield });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const positionLabel = me?.positions[0] ? POSITION_LABEL[me.positions[0]] : "Member";
  const displayName = me?.profile?.full_name || me?.user.email?.split("@")[0] || "Member";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const gateActive = !!me && !me.hasFullAccess;

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-background transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between border-b border-border px-5">
          <Link to="/portal" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <img src={bmLogo.url} alt="Beyond Medicine" className="logo-art h-9 w-auto" />
            <Brand className="text-lg text-ink" />
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((item) => {
            const active = item.to === "/portal" ? pathname === "/portal" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar className="h-9 w-9">
              {me?.profile?.avatar_url && <AvatarImage src={me.profile.avatar_url} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{positionLabel}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button variant="ghost" size="sm" className="flex-1 justify-start gap-2" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
            <ThemeToggle />
          </div>
          <Link to="/" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-ink">
            <UserIcon className="h-3 w-3" /> Public site
          </Link>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
          <button onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <img src={bmLogo.url} alt="" className="logo-art h-7 w-auto" />
            <Brand className="text-base text-ink" />
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {gateActive ? <RegistrationGate status={me!.application?.status ?? "incomplete"} /> : children}
        </main>
      </div>

      <AnnouncementOverlay />
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
