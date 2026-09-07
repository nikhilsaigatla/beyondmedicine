import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Clock } from "lucide-react";
import {
  POSITION_LABEL,
  POSITION_DEPARTMENT,
  type PositionTitle,
} from "@/lib/portal/labels";

export const Route = createFileRoute("/_authenticated/portal/directory")({
  component: DirectoryPage,
});

function DirectoryPage() {
  const [query, setQuery] = useState("");

  const { data: rows } = useQuery({
    queryKey: ["directory"],
    queryFn: async () => {
      const [profilesRes, positionsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("status", "active"),
        supabase.from("user_positions").select("user_id, position"),
      ]);
      const positions = positionsRes.data ?? [];
      return (profilesRes.data ?? [])
        .map((p) => {
          const verified = p.verification_status === "verified";
          const userPositions = positions
            .filter((pos) => pos.user_id === p.id)
            .map((pos) => pos.position as PositionTitle);
          const primary = userPositions[0] ?? ("general_member" as PositionTitle);
          return {
            id: p.id,
            name: p.full_name || p.email.split("@")[0],
            email: p.email,
            avatar: p.avatar_url,
            bio: p.bio,
            interests: (p.research_interests as string[] | null) ?? [],
            timeZone: p.time_zone as string | null,
            positions: verified ? userPositions : [],
            primaryLabel: verified ? POSITION_LABEL[primary] : "Unverified member",
            department: verified ? POSITION_DEPARTMENT[primary] : "Unverified",
            verificationStatus: p.verification_status,
          };
        });
    },
  });

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const haystack = [
        r.name,
        r.email,
        r.primaryLabel,
        r.department,
        ...(r.interests ?? []),
        ...r.positions.map((p) => POSITION_LABEL[p]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-4xl text-ink">Member Directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by name, Leadership Position, department, or research interest.
        </p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the organization…"
          className="pl-9"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((m) => {
          const initials = m.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
          return (
            <Card key={m.id} className="p-5">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  {m.avatar && <AvatarImage src={m.avatar} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.primaryLabel}</p>
                  <Badge variant="outline" className="mt-1 text-xs">{m.department}</Badge>
                </div>
              </div>
              {m.bio && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.bio}</p>}
              {m.interests.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {m.interests.slice(0, 6).map((i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {m.email}</p>
                {m.timeZone && <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {m.timeZone}</p>}
              </div>
            </Card>
          );
        })}
        {filtered?.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">No members match "{query}".</p>
        )}
      </div>
    </div>
  );
}