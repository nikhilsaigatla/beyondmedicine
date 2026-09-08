import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ROLE_RANK, POSITION_RANK, type AppRole, type PositionTitle } from "@/lib/portal/labels";

// Resolves a user's effective rank straight from the database (never trust a
// rank/role value supplied by the client) using the service-role admin client.
async function resolveActorRank(userId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: roles }, { data: positions }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    supabaseAdmin.from("user_positions").select("position").eq("user_id", userId),
  ]);
  return Math.max(
    0,
    ...(roles ?? []).map((r) => ROLE_RANK[r.role as AppRole] ?? 0),
    ...(positions ?? []).map((p) => POSITION_RANK[p.position as PositionTitle] ?? 0),
  );
}

async function assertCanActOn(actorId: string, targetId: string, minActorRank: number) {
  if (actorId === targetId) throw new Error("You cannot perform this action on your own account.");
  const [actorRank, targetRank] = await Promise.all([resolveActorRank(actorId), resolveActorRank(targetId)]);
  if (actorRank < minActorRank) throw new Error("You do not have permission to perform this action.");
  if (targetRank >= actorRank) throw new Error("You cannot act on a member with an equal or higher rank than your own.");
  return { actorRank, targetRank };
}

async function logAudit(entry: { actorUserId: string; targetUserId: string; action: string; entity: string; entityId: string; metadata?: Record<string, unknown> }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_user_id: entry.actorUserId,
    target_user_id: entry.targetUserId,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entityId,
    metadata: entry.metadata ?? {},
  });
}

const targetUserSchema = z.object({ targetUserId: z.string().uuid() });

export const suspendMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(targetUserSchema)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertCanActOn(context.userId, data.targetUserId, ROLE_RANK.officer);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: "suspended", suspended_at: new Date().toISOString() })
      .eq("id", data.targetUserId);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: context.userId, targetUserId: data.targetUserId, action: "USER_SUSPENDED", entity: "profiles", entityId: data.targetUserId });
    return { success: true };
  });

export const reactivateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(targetUserSchema)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertCanActOn(context.userId, data.targetUserId, ROLE_RANK.officer);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: "active", suspended_at: null })
      .eq("id", data.targetUserId);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: context.userId, targetUserId: data.targetUserId, action: "USER_REACTIVATED", entity: "profiles", entityId: data.targetUserId });
    return { success: true };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(targetUserSchema)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Deletion is the most destructive action, so it's restricted to super_admin regardless of the actor's own rank.
    const { targetRank } = await assertCanActOn(context.userId, data.targetUserId, ROLE_RANK.super_admin);
    if (targetRank >= ROLE_RANK.executive) {
      throw new Error("Executives, board members, and admins must be demoted before their account can be deleted.");
    }
    const { data: target } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", data.targetUserId).maybeSingle();
    // FK constraints cascade (profiles, user_roles, user_positions, mentor_students, applications, etc.)
    // or SET NULL (decided_by, created_by, leadership_entries.assignee_id) — see migration history.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.targetUserId);
    if (error) throw new Error(error.message);
    await logAudit({
      actorUserId: context.userId,
      targetUserId: data.targetUserId,
      action: "USER_DELETED",
      entity: "auth.users",
      entityId: data.targetUserId,
      metadata: { email: target?.email ?? null, full_name: target?.full_name ?? null },
    });
    return { success: true };
  });
