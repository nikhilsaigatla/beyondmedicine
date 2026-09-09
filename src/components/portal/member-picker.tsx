import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { POSITION_LABEL, type PositionTitle } from "@/lib/portal/labels";

export interface MemberSearchResult {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_position: PositionTitle | null;
}

interface MemberPickerProps {
  selectedMembers: MemberSearchResult[];
  onSelectedMembersChange: (members: MemberSearchResult[]) => void;
  excludedIds?: string[];
  maxSelected?: number;
  placeholder?: string;
}

function initialsFor(member: MemberSearchResult) {
  const label = member.full_name || member.username;
  return label
    .split(/\s|_/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function memberName(member: MemberSearchResult) {
  return member.full_name || `@${member.username}`;
}

export function MemberPicker({
  selectedMembers,
  onSelectedMembersChange,
  excludedIds = [],
  maxSelected,
  placeholder = "Search username...",
}: MemberPickerProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  const blockedIds = useMemo(
    () => new Set([...excludedIds, ...selectedMembers.map((member) => member.id)]),
    [excludedIds, selectedMembers],
  );

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["member-search", debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_members", {
        _query: debouncedQuery,
        _limit: 8,
      });
      if (error) throw error;
      return (data ?? []) as MemberSearchResult[];
    },
  });

  const availableResults = results.filter((member) => !blockedIds.has(member.id));
  const canAddMore = maxSelected === undefined || selectedMembers.length < maxSelected;

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, availableResults.length]);

  function addMember(member: MemberSearchResult) {
    if (!canAddMore || blockedIds.has(member.id)) return;
    onSelectedMembersChange([...selectedMembers, member]);
    setQuery("");
    setDebouncedQuery("");
  }

  function removeMember(memberId: string) {
    onSelectedMembersChange(selectedMembers.filter((member) => member.id !== memberId));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(availableResults.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter" && availableResults[activeIndex]) {
      event.preventDefault();
      addMember(availableResults[activeIndex]);
    }
  }

  return (
    <div className="space-y-3">
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedMembers.map((member) => (
            <Badge
              key={member.id}
              variant="secondary"
              className="gap-1.5 rounded-full border border-cyan-200/40 bg-cyan-950/30 py-1 pl-2 pr-1 text-cyan-50"
            >
              @{member.username}
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                className="rounded-full p-0.5 text-cyan-100/70 hover:bg-cyan-100/10 hover:text-cyan-50"
                aria-label={`Remove ${memberName(member)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={canAddMore ? placeholder : "Selection limit reached"}
          disabled={!canAddMore}
          className="pl-9 pr-9"
        />
        {isFetching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {debouncedQuery.length >= 2 && canAddMore && (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-background/95 p-1 shadow-sm">
          {availableResults.map((member, index) => {
            const position = member.primary_position
              ? POSITION_LABEL[member.primary_position]
              : "Member";
            return (
              <Button
                key={member.id}
                type="button"
                variant="ghost"
                onClick={() => addMember(member)}
                className={cn(
                  "h-auto w-full justify-start gap-3 rounded-md px-2 py-2 text-left",
                  index === activeIndex && "bg-muted",
                )}
              >
                <Avatar className="h-9 w-9 border border-border">
                  {member.avatar_url && (
                    <AvatarImage src={member.avatar_url} alt={memberName(member)} />
                  )}
                  <AvatarFallback className="text-xs">{initialsFor(member)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {memberName(member)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{member.username} - {position}
                  </span>
                </span>
                <Check className="h-4 w-4 text-primary" />
              </Button>
            );
          })}
          {!isFetching && availableResults.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No members found.</p>
          )}
        </div>
      )}
    </div>
  );
}
