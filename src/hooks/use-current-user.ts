import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole, PositionTitle } from "@/lib/portal/labels";

export interface CurrentUserData {
  user: User;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    status?: "active" | "suspended" | null;
    research_interests?: string[] | null;
    time_zone?: string | null;
    phone?: string | null;
    school?: string | null;
  } | null;
  application: {
    status: "incomplete" | "pending" | "approved" | "rejected";
  } | null;
  roles: AppRole[];
  positions: PositionTitle[];
  isSuperAdmin: boolean;
  isExecutive: boolean;
  isOfficer: boolean;
  isMentor: boolean;
  isBoard: boolean;
  hasFullAccess: boolean;
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

export function useCurrentUser() {
  const { user, loading } = useAuthUser();

  const query = useQuery({
    queryKey: ["current-user", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<CurrentUserData | null> => {
      if (!user) return null;
      const [profileRes, rolesRes, positionsRes, appRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("user_positions").select("position").eq("user_id", user.id),
        supabase.from("applications").select("status").eq("user_id", user.id).maybeSingle(),
      ]);
      const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
      const positions = (positionsRes.data ?? []).map((p) => p.position as PositionTitle);
      const isSuperAdmin = roles.includes("super_admin");
      const appStatus = (appRes.data?.status ?? "incomplete") as CurrentUserData["application"] extends null ? never : "incomplete" | "pending" | "approved" | "rejected";
      return {
        user,
        profile: profileRes.data as CurrentUserData["profile"],
        application: appRes.data ? { status: appStatus } : { status: "incomplete" },
        roles,
        positions,
        isSuperAdmin,
        isExecutive: roles.includes("executive") || roles.includes("super_admin"),
        isOfficer: roles.some((r) => ["super_admin", "executive", "officer"].includes(r)),
        isMentor: roles.includes("mentor") || roles.includes("super_admin"),
        isBoard: roles.includes("board") || roles.includes("super_admin"),
        hasFullAccess: isSuperAdmin || appStatus === "approved",
      };
    },
  });

  return { ...query, authLoading: loading };
}
