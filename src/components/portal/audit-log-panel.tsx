import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function AuditLogPanel() {
  const { data: rows, error } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("admin_audit_log" as never) as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-audit-log-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, email")).data ?? [],
  });

  function nameFor(userId: string | null) {
    if (!userId) return "System";
    const profile = profiles?.find((p) => p.id === userId);
    return profile?.full_name || profile?.email || userId;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="font-display text-xl text-ink">Admin audit log</h2>
        <p className="mt-1 text-sm text-muted-foreground">Read-only history of role, position, mentor pairing, leadership, and account changes. Writes are server-only.</p>
      </div>
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load the audit log."}
        </div>
      ) : (
        <div className="space-y-2">
          {(rows ?? []).map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{row.action}</Badge>
                  <span className="text-muted-foreground">
                    {nameFor(row.actor_user_id)} → {nameFor(row.target_user_id)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
              </div>
              {row.metadata && Object.keys(row.metadata).length > 0 && (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">
                  {JSON.stringify(row.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {(rows ?? []).length === 0 && <p className="text-sm text-muted-foreground">No audit entries yet.</p>}
        </div>
      )}
    </Card>
  );
}
