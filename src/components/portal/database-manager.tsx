import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const DATABASE_TABLES = [
  { name: "profiles", key: "id" },
  { name: "applications", key: "user_id" },
  { name: "user_roles", key: "id" },
  { name: "user_positions", key: "id" },
  { name: "tasks", key: "id" },
  { name: "announcements", key: "id" },
  { name: "courses", key: "id" },
  { name: "course_enrollments", key: "id" },
  { name: "assignments", key: "id" },
  { name: "submissions", key: "id" },
  { name: "meetings", key: "id" },
  { name: "meeting_attendees", key: "user_id" },
  { name: "mentor_students", key: "id" },
  { name: "research_groups", key: "id" },
  { name: "research_group_members", key: "id" },
  { name: "conversations", key: "id" },
  { name: "conversation_members", key: "id" },
  { name: "messages", key: "id" },
] as const;

type DatabaseTableName = (typeof DATABASE_TABLES)[number]["name"];
type DatabaseRow = Record<string, unknown>;

export function DatabaseManager() {
  const qc = useQueryClient();
  const [tableName, setTableName] = useState<DatabaseTableName>("profiles");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editorValue, setEditorValue] = useState("");
  const table = DATABASE_TABLES.find((item) => item.name === tableName) ?? DATABASE_TABLES[0];

  const { data: rows, error: tableError, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["site-management-table", table.name],
    queryFn: async () => {
      const { data, error } = await (supabase.from(table.name as never) as any).select("*").limit(200);
      if (error) throw error;
      return (data ?? []) as DatabaseRow[];
    },
  });

  function startEditing(row: DatabaseRow) {
    setEditingKey(String(row[table.key]));
    setEditorValue(JSON.stringify(row, null, 2));
  }

  async function saveRow() {
    if (!editingKey) return;
    let parsed: DatabaseRow;
    try {
      parsed = JSON.parse(editorValue) as DatabaseRow;
    } catch {
      toast.error("The row must contain valid JSON.");
      return;
    }
    const keyValue = parsed[table.key];
    if (keyValue === undefined || keyValue === null) {
      toast.error(`The row must include its ${table.key} value.`);
      return;
    }
    const { [table.key]: _key, ...updates } = parsed;
    const { error } = await (supabase.from(table.name as never) as any).update(updates).eq(table.key, keyValue);
    if (error) { toast.error(error.message); return; }
    toast.success("Row updated");
    setEditingKey(null);
    await refetch();
    qc.invalidateQueries({ queryKey: ["site-management-table", table.name] });
  }

  async function deleteRow(row: DatabaseRow) {
    const keyValue = row[table.key];
    if (keyValue === undefined || !window.confirm(`Delete this row from ${table.name}? This cannot be undone.`)) return;
    const { data: deletedRows, error } = await (supabase.from(table.name as never) as any)
      .delete()
      .eq(table.key, keyValue)
      .select(table.key);
    if (error) { toast.error(error.message); return; }
    if (!deletedRows || deletedRows.length === 0) {
      toast.error("No row was deleted. Check the database RLS policy and administrator permissions.");
      return;
    }
    toast.success("Row deleted");
    if (editingKey === String(keyValue)) setEditingKey(null);
    await refetch();
    qc.invalidateQueries({ queryKey: ["site-management-table", table.name] });
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="font-display text-xl text-ink">Public database manager</h2><p className="mt-1 text-sm text-muted-foreground">Inspect, edit, and delete rows from approved public tables. Auth users and secrets are excluded.</p></div>
        <div className="w-64"><Select value={table.name} onValueChange={(value) => { setTableName(value as DatabaseTableName); setEditingKey(null); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DATABASE_TABLES.map((item) => <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">Changes are live and deletions may cascade through related data. Use this tool only for deliberate administrative maintenance.</div>
      {isFetching && !isLoading && <p className="mb-3 text-xs text-muted-foreground">Refreshing from database…</p>}
      {tableError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not read {table.name}: {tableError instanceof Error ? tableError.message : "Unknown database error"}
        </div>
      ) : isLoading ? <p className="text-sm text-muted-foreground">Loading rows…</p> : (
        <div className="space-y-3">
          {(rows ?? []).map((row) => {
            const rowKey = String(row[table.key]);
            const editing = editingKey === rowKey;
            return <div key={rowKey} className="rounded-lg border border-border p-3">
              {editing ? <div className="space-y-3"><Textarea value={editorValue} onChange={(event) => setEditorValue(event.target.value)} className="min-h-64 font-mono text-xs" /><div className="flex gap-2"><Button onClick={saveRow}>Save row</Button><Button variant="outline" onClick={() => setEditingKey(null)}>Cancel</Button></div></div> : <div className="flex items-start justify-between gap-3"><pre className="min-w-0 overflow-x-auto whitespace-pre-wrap break-words text-xs text-muted-foreground">{JSON.stringify(row, null, 2)}</pre><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={() => startEditing(row)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => deleteRow(row)}>Delete</Button></div></div>}
            </div>;
          })}
          {(rows ?? []).length === 0 && <p className="text-sm text-muted-foreground">No rows found in {table.name}.</p>}
        </div>
      )}
    </Card>
  );
}
