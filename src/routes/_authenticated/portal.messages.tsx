import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  Info,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MemberPicker, type MemberSearchResult } from "@/components/portal/member-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/portal/messages")({
  component: MessagesPage,
});

type ConversationType = "dm" | "group" | "channel";
type MemberRole = "owner" | "admin" | "member";

interface ConversationRow {
  id: string;
  type: ConversationType;
  name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ConversationMemberRow {
  conversation_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  last_read_at: string | null;
}

interface ProfilePreview {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface ConversationSummary {
  conversation: ConversationRow;
  myMembership: ConversationMemberRow;
  members: Array<ConversationMemberRow & { profile: ProfilePreview | null }>;
  latestMessage: MessageRow | null;
  unread: boolean;
}

function initialsFor(name: string) {
  return name
    .split(/\s|_/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function profileName(profile: ProfilePreview | null) {
  if (!profile) return "Member";
  return profile.full_name || `@${profile.username}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function conversationTitle(summary: ConversationSummary, currentUserId: string) {
  if (summary.conversation.type === "dm") {
    const other = summary.members.find((member) => member.user_id !== currentUserId);
    return profileName(other?.profile ?? null);
  }

  if (summary.conversation.name) return summary.conversation.name;

  const names = summary.members
    .filter((member) => member.user_id !== currentUserId)
    .map((member) => profileName(member.profile))
    .slice(0, 3);
  return names.length > 0 ? names.join(", ") : "Group chat";
}

function latestPreview(summary: ConversationSummary, currentUserId: string) {
  if (!summary.latestMessage) return "No messages yet";
  const sender =
    summary.members.find((member) => member.user_id === summary.latestMessage?.sender_id)
      ?.profile ?? null;
  const body = summary.latestMessage.body.replace(/\s+/g, " ").trim();
  if (summary.conversation.type === "group" && summary.latestMessage.sender_id !== currentUserId) {
    return `${profileName(sender).split(" ")[0]}: ${body}`;
  }
  return summary.latestMessage.sender_id === currentUserId ? `You: ${body}` : body;
}

function AvatarStack({
  summary,
  currentUserId,
}: {
  summary: ConversationSummary;
  currentUserId: string;
}) {
  const members = summary.members
    .filter((member) => summary.conversation.type === "group" || member.user_id !== currentUserId)
    .slice(0, 3);

  if (summary.conversation.type === "group") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-950/40">
        <Users className="h-5 w-5 text-cyan-100" />
      </div>
    );
  }

  const profile = members[0]?.profile ?? null;
  const label = profileName(profile);
  return (
    <Avatar className="h-10 w-10 border border-border">
      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={label} />}
      <AvatarFallback className="text-xs">{initialsFor(label)}</AvatarFallback>
    </Avatar>
  );
}

function MessagesPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDmMembers, setSelectedDmMembers] = useState<MemberSearchResult[]>([]);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<MemberSearchResult[]>([]);
  const [selectedAddMembers, setSelectedAddMembers] = useState<MemberSearchResult[]>([]);
  const [groupName, setGroupName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["conversations", me?.user.id],
    enabled: !!me,
    queryFn: async (): Promise<ConversationSummary[]> => {
      const { data: myMemberships, error: membershipError } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id, role, joined_at, last_read_at")
        .eq("user_id", me!.user.id);
      if (membershipError) throw membershipError;

      const conversationIds = (myMemberships ?? []).map((membership) => membership.conversation_id);
      if (conversationIds.length === 0) return [];

      const [conversationRes, membersRes, latestRes] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, type, name, created_by, created_at, updated_at")
          .in("id", conversationIds),
        supabase
          .from("conversation_members")
          .select("conversation_id, user_id, role, joined_at, last_read_at")
          .in("conversation_id", conversationIds),
        supabase
          .from("messages")
          .select("id, conversation_id, sender_id, body, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (conversationRes.error) throw conversationRes.error;
      if (membersRes.error) throw membersRes.error;
      if (latestRes.error) throw latestRes.error;

      const allMembers = (membersRes.data ?? []) as ConversationMemberRow[];
      const profileIds = Array.from(new Set(allMembers.map((member) => member.user_id)));
      const { data: profiles, error: profilesError } = profileIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", profileIds)
        : { data: [], error: null };
      if (profilesError) throw profilesError;

      const profilesById = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile as ProfilePreview]),
      );
      const latestByConversation = new Map<string, MessageRow>();
      for (const message of (latestRes.data ?? []) as MessageRow[]) {
        if (!latestByConversation.has(message.conversation_id)) {
          latestByConversation.set(message.conversation_id, message);
        }
      }

      return ((conversationRes.data ?? []) as ConversationRow[])
        .map((conversation) => {
          const myMembership = (myMemberships ?? []).find(
            (membership) => membership.conversation_id === conversation.id,
          ) as ConversationMemberRow | undefined;
          const members = allMembers
            .filter((member) => member.conversation_id === conversation.id)
            .map((member) => ({ ...member, profile: profilesById.get(member.user_id) ?? null }));
          const latestMessage = latestByConversation.get(conversation.id) ?? null;
          const unread =
            !!latestMessage &&
            latestMessage.sender_id !== me!.user.id &&
            (!myMembership?.last_read_at ||
              new Date(latestMessage.created_at) > new Date(myMembership.last_read_at));
          return myMembership
            ? { conversation, myMembership, members, latestMessage, unread }
            : null;
        })
        .filter((summary): summary is ConversationSummary => summary !== null)
        .sort((a, b) => {
          const aTime =
            a.latestMessage?.created_at ?? a.conversation.updated_at ?? a.conversation.created_at;
          const bTime =
            b.latestMessage?.created_at ?? b.conversation.updated_at ?? b.conversation.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
    },
  });

  const activeConversation = useMemo(
    () => conversations.find((summary) => summary.conversation.id === activeId) ?? null,
    [activeId, conversations],
  );

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", activeId!)
        .order("created_at", { ascending: true })
        .limit(150);
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  const activeProfileMap = useMemo(() => {
    return new Map(
      activeConversation?.members.map((member) => [member.user_id, member.profile]) ?? [],
    );
  }, [activeConversation]);

  const activeTitle =
    me && activeConversation ? conversationTitle(activeConversation, me.user.id) : "";
  const activeIsGroup = activeConversation?.conversation.type === "group";
  const canManageActiveGroup =
    !!activeConversation &&
    activeIsGroup &&
    (me?.isSuperAdmin ||
      activeConversation.myMembership.role === "owner" ||
      activeConversation.myMembership.role === "admin");
  const excludedFromAdd = activeConversation?.members.map((member) => member.user_id) ?? [];

  useEffect(() => {
    if (!activeId) return;
    const channel = supabase
      .channel(`messages-${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["messages", activeId] });
          void qc.invalidateQueries({ queryKey: ["conversations", me?.user.id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId, me?.user.id, qc]);

  useEffect(() => {
    if (!me?.user.id) return;
    const channel = supabase
      .channel(`conversation-members-${me.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_members",
          filter: `user_id=eq.${me.user.id}`,
        },
        () => void qc.invalidateQueries({ queryKey: ["conversations", me.user.id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me?.user.id, qc]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!activeId || messages.length === 0) return;
    void supabase
      .rpc("mark_conversation_read", { _conversation_id: activeId })
      .then(({ error }) => {
        if (!error) void qc.invalidateQueries({ queryKey: ["conversations", me?.user.id] });
      });
  }, [activeId, messages.length, me?.user.id, qc]);

  useEffect(() => {
    setRenameValue(activeConversation?.conversation.name ?? "");
  }, [activeConversation?.conversation.name]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    if (!me || !activeId || !text.trim() || busyAction) return;
    setBusyAction("send");
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: me.user.id,
      body: text.trim(),
    });
    if (error) {
      toast.error(error.message);
      setBusyAction(null);
      return;
    }
    setText("");
    setBusyAction(null);
  }

  async function startDm() {
    if (!selectedDmMembers[0]) return;
    setBusyAction("dm");
    const { data, error } = await supabase.rpc("start_direct_conversation", {
      _target_user_id: selectedDmMembers[0].id,
    });
    if (error) {
      toast.error(error.message);
      setBusyAction(null);
      return;
    }
    setActiveId(data);
    setShowMobileList(false);
    setSelectedDmMembers([]);
    setNewDialogOpen(false);
    setBusyAction(null);
    void qc.invalidateQueries({ queryKey: ["conversations", me?.user.id] });
  }

  async function createGroup() {
    if (selectedGroupMembers.length < 2) return;
    setBusyAction("group");
    const { data, error } = await supabase.rpc("create_group_conversation", {
      _name: groupName.trim() || null,
      _member_ids: selectedGroupMembers.map((member) => member.id),
    });
    if (error) {
      toast.error(error.message);
      setBusyAction(null);
      return;
    }
    setActiveId(data);
    setShowMobileList(false);
    setSelectedGroupMembers([]);
    setGroupName("");
    setNewDialogOpen(false);
    setBusyAction(null);
    void qc.invalidateQueries({ queryKey: ["conversations", me?.user.id] });
  }

  async function renameGroup() {
    if (!activeId || !canManageActiveGroup) return;
    setBusyAction("rename");
    const { error } = await supabase.rpc("rename_group_conversation", {
      _conversation_id: activeId,
      _name: renameValue.trim() || null,
    });
    if (error) toast.error(error.message);
    else toast.success("Group renamed");
    setBusyAction(null);
    void qc.invalidateQueries({ queryKey: ["conversations", me?.user.id] });
  }

  async function addMembers() {
    if (!activeId || selectedAddMembers.length === 0 || !canManageActiveGroup) return;
    setBusyAction("add");
    const { error } = await supabase.rpc("add_group_members", {
      _conversation_id: activeId,
      _member_ids: selectedAddMembers.map((member) => member.id),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Members added");
      setSelectedAddMembers([]);
    }
    setBusyAction(null);
    void qc.invalidateQueries({ queryKey: ["conversations", me?.user.id] });
  }

  async function removeMember(memberId: string) {
    if (!activeId || !canManageActiveGroup) return;
    setBusyAction(`remove-${memberId}`);
    const { error } = await supabase.rpc("remove_group_member", {
      _conversation_id: activeId,
      _member_id: memberId,
    });
    if (error) toast.error(error.message);
    else toast.success("Member removed");
    setBusyAction(null);
    void qc.invalidateQueries({ queryKey: ["conversations", me?.user.id] });
  }

  async function leaveGroup() {
    if (!activeId || !activeIsGroup) return;
    setBusyAction("leave");
    const { error } = await supabase.rpc("leave_group_conversation", {
      _conversation_id: activeId,
    });
    if (error) {
      toast.error(error.message);
      setBusyAction(null);
      return;
    }
    toast.success("You left the group");
    setActiveId(null);
    setDetailsOpen(false);
    setShowMobileList(true);
    setBusyAction(null);
    void qc.invalidateQueries({ queryKey: ["conversations", me?.user.id] });
  }

  return (
    <div className="mx-auto grid h-[calc(100vh-8rem)] max-w-6xl gap-4 md:grid-cols-[320px_1fr]">
      <Card
        className={cn("flex flex-col overflow-hidden p-0", !showMobileList && "hidden md:flex")}
      >
        <div className="border-b border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg text-ink">Conversations</h2>
            <Button
              size="icon"
              className="h-8 w-8"
              onClick={() => setNewDialogOpen(true)}
              aria-label="New conversation"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loadingConversations && (
            <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading conversations
            </div>
          )}
          {conversations.map((summary) => {
            const title = conversationTitle(summary, me!.user.id);
            const preview = latestPreview(summary, me!.user.id);
            const timestamp =
              summary.latestMessage?.created_at ??
              summary.conversation.updated_at ??
              summary.conversation.created_at;
            return (
              <button
                key={summary.conversation.id}
                onClick={() => {
                  setActiveId(summary.conversation.id);
                  setShowMobileList(false);
                }}
                className={cn(
                  "block w-full border-b border-border/50 p-3 text-left text-sm transition hover:bg-muted",
                  activeId === summary.conversation.id && "bg-muted",
                )}
              >
                <span className="flex gap-3">
                  <AvatarStack summary={summary} currentUserId={me!.user.id} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-ink">{title}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatTime(timestamp)}
                      </span>
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="truncate text-xs text-muted-foreground">{preview}</span>
                      {summary.unread && (
                        <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
          {!loadingConversations && conversations.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">
              No conversations yet. Start one with the plus button.
            </p>
          )}
        </ScrollArea>
      </Card>

      <Card className={cn("flex flex-col overflow-hidden p-0", showMobileList && "hidden md:flex")}>
        {activeConversation ? (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-border p-3">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:hidden"
                  onClick={() => setShowMobileList(true)}
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <AvatarStack summary={activeConversation} currentUserId={me!.user.id} />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg text-ink">{activeTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeIsGroup
                      ? `${activeConversation.members.length} members`
                      : "Direct message"}
                  </p>
                </div>
              </div>
              {activeIsGroup && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setDetailsOpen(true)}
                  aria-label="Group details"
                >
                  <Info className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {loadingMessages && (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading messages
                </div>
              )}
              {messages.map((message) => {
                const sender = activeProfileMap.get(message.sender_id) ?? null;
                const mine = message.sender_id === me?.user.id;
                return (
                  <div
                    key={message.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-4 py-2 text-sm",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted text-ink",
                      )}
                    >
                      {!mine && <p className="mb-1 text-xs opacity-70">{profileName(sender)}</p>}
                      <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    </div>
                  </div>
                );
              })}
              {!loadingMessages && messages.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">No messages yet.</p>
              )}
            </div>
            <form
              onSubmit={sendMessage}
              className="flex items-end gap-2 border-t border-border p-3"
            >
              <Textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Write a message..."
                rows={1}
                className="max-h-32 min-h-10 resize-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!text.trim() || busyAction === "send"}
                aria-label="Send message"
              >
                {busyAction === "send" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
            <MessageCircle className="h-10 w-10 text-primary/70" />
            Select or start a conversation.
            <Button className="md:hidden" onClick={() => setShowMobileList(true)}>
              View conversations
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-cyan-200/20 bg-[rgba(11,34,38,0.96)] text-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-ink">New conversation</DialogTitle>
            <DialogDescription>Search members by username or name.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="dm">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="dm">Direct Message</TabsTrigger>
              <TabsTrigger value="group">Group Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="dm" className="space-y-4 pt-3">
              <MemberPicker
                selectedMembers={selectedDmMembers}
                onSelectedMembersChange={setSelectedDmMembers}
                excludedIds={me ? [me.user.id] : []}
                maxSelected={1}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={startDm}
                  disabled={!selectedDmMembers[0] || busyAction === "dm"}
                >
                  {busyAction === "dm" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Start DM
                </Button>
              </DialogFooter>
            </TabsContent>
            <TabsContent value="group" className="space-y-4 pt-3">
              <Input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name optional"
              />
              <MemberPicker
                selectedMembers={selectedGroupMembers}
                onSelectedMembersChange={setSelectedGroupMembers}
                excludedIds={me ? [me.user.id] : []}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNewDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={createGroup}
                  disabled={selectedGroupMembers.length < 2 || busyAction === "group"}
                >
                  {busyAction === "group" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create Group
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-cyan-200/20 bg-[rgba(11,34,38,0.96)] text-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-ink">{activeTitle}</DialogTitle>
            <DialogDescription>
              {activeConversation?.members.length ?? 0} group members
            </DialogDescription>
          </DialogHeader>
          {activeConversation && (
            <div className="space-y-5">
              {canManageActiveGroup && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      placeholder="Group name"
                    />
                    <Button type="button" onClick={renameGroup} disabled={busyAction === "rename"}>
                      Rename
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {activeConversation.members.map((member) => {
                  const name = profileName(member.profile);
                  const canRemove =
                    canManageActiveGroup &&
                    member.user_id !== me?.user.id &&
                    member.role !== "owner";
                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 rounded-lg border border-border/70 p-2"
                    >
                      <Avatar className="h-9 w-9 border border-border">
                        {member.profile?.avatar_url && (
                          <AvatarImage src={member.profile.avatar_url} alt={name} />
                        )}
                        <AvatarFallback className="text-xs">{initialsFor(name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {member.profile?.username ? `@${member.profile.username}` : "Member"}
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {member.role}
                      </Badge>
                      {canRemove && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              aria-label={`Manage ${name}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => void removeMember(member.user_id)}>
                              Remove member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
              {canManageActiveGroup && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-ink">
                      <UserPlus className="h-4 w-4" /> Add members
                    </div>
                    <MemberPicker
                      selectedMembers={selectedAddMembers}
                      onSelectedMembersChange={setSelectedAddMembers}
                      excludedIds={excludedFromAdd}
                    />
                    <Button
                      type="button"
                      onClick={addMembers}
                      disabled={selectedAddMembers.length === 0 || busyAction === "add"}
                    >
                      Add selected
                    </Button>
                  </div>
                </>
              )}
              <Separator />
              <Button
                type="button"
                variant="outline"
                onClick={leaveGroup}
                disabled={busyAction === "leave"}
              >
                Leave group
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
