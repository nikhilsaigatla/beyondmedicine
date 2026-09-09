import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  hasApplicationManagementAccess,
  type AppRole,
  type PositionTitle,
} from "@/lib/portal/labels";
import { isLocalAdminMode } from "@/lib/local-admin";
import { getRolePreview, type RolePreview } from "@/lib/portal/role-preview";

export interface CurrentUserData {
  user: User;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    username?: string | null;
    verification_status?: string | null;
    status?: "active" | "suspended" | null;
    research_interests?: string[] | null;
    time_zone?: string | null;
    phone?: string | null;
    school?: string | null;
  } | null;
  application: {
    user_id?: string;
    status: "incomplete" | "pending" | "approved" | "rejected";
    submitted_at?: string | null;
    decided_at?: string | null;
  } | null;
  roles: AppRole[];
  positions: PositionTitle[];
  isSuperAdmin: boolean;
  isExecutive: boolean;
  isOfficer: boolean;
  isMentor: boolean;
  isBoard: boolean;
  isApplicationManager: boolean;
  hasFullAccess: boolean;
  rolePreview: RolePreview;
  canPreviewRoles: boolean;
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
        supabase
          .from("applications")
          .select("user_id, status, submitted_at, decided_at")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
      const positions = (positionsRes.data ?? []).map((p) => p.position as PositionTitle);
      const localAdmin = isLocalAdminMode();
      const realSuperAdmin = roles.includes("super_admin");
      const canPreview = localAdmin || realSuperAdmin;
      const rolePreview = canPreview ? getRolePreview() : "member";
      const isPreviewing = canPreview;
      const isApplicantPreview = isPreviewing && rolePreview === "applicant";
      const isSuperAdmin = isPreviewing ? rolePreview === "admin" : realSuperAdmin;
      const isExecutive =
        isPreviewing && !isApplicantPreview
          ? rolePreview === "admin" || rolePreview === "executive"
          : roles.includes("executive") || realSuperAdmin;
      const isOfficer =
        isPreviewing && !isApplicantPreview
          ? isExecutive || rolePreview === "officer"
          : roles.some((role) => ["super_admin", "executive", "officer"].includes(role));
      const isMentor =
        isPreviewing && !isApplicantPreview
          ? isOfficer || rolePreview === "mentor"
          : roles.includes("mentor") || realSuperAdmin;
      const isBoard = isPreviewing ? isOfficer : roles.includes("board") || realSuperAdmin;
      const isApplicationManager = isPreviewing
        ? isSuperAdmin || isExecutive || isOfficer
        : hasApplicationManagementAccess(roles, positions);
      const appStatus = (appRes.data?.status ??
        "incomplete") as CurrentUserData["application"] extends null
        ? never
        : "incomplete" | "pending" | "approved" | "rejected";
      return {
        user,
        profile: profileRes.data as CurrentUserData["profile"],
        application: appRes.data
          ? {
              user_id: appRes.data.user_id,
              status: appStatus,
              submitted_at: appRes.data.submitted_at,
              decided_at: appRes.data.decided_at,
            }
          : null,
        roles:
          rolePreview === "admin" && localAdmin && !roles.includes("super_admin")
            ? [...roles, "super_admin"]
            : roles,
        positions,
        isSuperAdmin,
        isExecutive,
        isOfficer,
        isMentor,
        isBoard,
        isApplicationManager,
        hasFullAccess: isApplicantPreview
          ? false
          : realSuperAdmin || localAdmin || appStatus === "approved",
        rolePreview,
        canPreviewRoles: canPreview,
      };
    },
  });

  return { ...query, authLoading: loading };
}
