import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import {
  Check,
  GitBranch,
  Grip,
  Network,
  Plus,
  Rows3,
  Save,
  Search,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isLocalAdminMode } from "@/lib/local-admin";
import { getRolePreview } from "@/lib/portal/role-preview";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  POSITION_DIVISION,
  POSITION_LABEL,
  POSITION_RANK,
  ROLE_LABEL,
  ROLE_RANK,
  type AppRole,
  type PositionTitle,
} from "@/lib/portal/labels";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/portal/org-chart")({
  beforeLoad: async () => {
    if (isLocalAdminMode()) {
      if (["admin", "executive"].includes(getRolePreview())) return;
      throw redirect({ to: "/portal" });
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth" });
    const [{ data: roles }, { data: positions }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.user.id),
      supabase.from("user_positions").select("position").eq("user_id", user.user.id),
    ]);
    const executivePositions = [
      "founding_president",
      "deputy_chair_president",
      "vc_administration",
      "vc_mentorship",
      "vc_public_relations",
    ];
    const canView =
      (roles ?? []).some((item) => ["super_admin", "executive"].includes(item.role)) ||
      (positions ?? []).some((item) => executivePositions.includes(item.position));
    if (!canView) throw redirect({ to: "/portal" });
  },
  component: OrgChartPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  status: "active" | "suspended" | null;
};

type UserRole = { id: string; user_id: string; role: AppRole };
type UserPosition = { id: string; user_id: string; position: PositionTitle };
type MentorPairing = { id: string; mentor_id: string; student_id: string };
type LeadershipEntry = {
  id: string;
  title: string;
  division: string;
  position: string;
  assignee_id: string | null;
};
type OrgEdge = {
  id: string;
  parent_user_id: string;
  child_user_id: string;
  relationship: string;
  active: boolean;
};
type NodePosition = { node_id: string; x: number; y: number };
type ChangeRequest = {
  id: string;
  requested_by: string;
  parent_user_id: string;
  child_user_id: string;
  relationship: string;
  status: "pending" | "approved" | "rejected";
  note: string | null;
  created_at: string;
};
type GraphNode = {
  id: string;
  memberId?: string;
  kind: "member" | "division";
  tier: "leader" | "executive" | "division" | "mentor" | "student";
  name: string;
  subtitle: string;
  x: number;
  y: number;
  roles: AppRole[];
  positions: PositionTitle[];
  avatarUrl?: string | null;
};
type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  custom?: boolean;
};

const orgTable = (name: string) => supabase.from(name as never) as any;
const GRID = 32;
const NODE_WIDTH = 220;
const NODE_HEIGHT = 92;
const LEVEL_GAP = 150;
const SIBLING_GAP = 56;
const divisions = [
  "Executive Division",
  "Administrative Division",
  "Public Relations Division",
  "Mentorship Tracks",
  "Mentorship Training",
  "General Membership",
] as const;

function rankFor(roles: AppRole[], positions: PositionTitle[]) {
  return Math.max(
    0,
    ...roles.map((role) => ROLE_RANK[role] ?? 0),
    ...positions.map((position) => POSITION_RANK[position] ?? 0),
  );
}

function displayName(profile?: Profile) {
  return profile?.full_name || profile?.email || "Member";
}

function primaryLabel(roles: AppRole[], positions: PositionTitle[]) {
  const topPosition = positions.slice().sort((a, b) => POSITION_RANK[b] - POSITION_RANK[a])[0];
  if (topPosition) return POSITION_LABEL[topPosition];
  const topRole = roles.slice().sort((a, b) => ROLE_RANK[b] - ROLE_RANK[a])[0];
  return topRole ? ROLE_LABEL[topRole] : "Member";
}

function divisionFor(positions: PositionTitle[]) {
  const ranked = positions.slice().sort((a, b) => POSITION_RANK[b] - POSITION_RANK[a]);
  const position = ranked.find((item) => POSITION_DIVISION[item]);
  return position ? POSITION_DIVISION[position] : "General Membership";
}

function snap(value: number) {
  return Math.round(value / GRID) * GRID;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildTreeLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenByNode = new Map<string, string[]>();
  const parentByNode = new Map<string, string>();

  for (const edge of edges) {
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) continue;
    if (parentByNode.has(edge.to)) continue;
    parentByNode.set(edge.to, edge.from);
    childrenByNode.set(edge.from, [...(childrenByNode.get(edge.from) ?? []), edge.to]);
  }

  const tierOrder: Record<GraphNode["tier"], number> = {
    leader: 0,
    executive: 1,
    division: 2,
    mentor: 3,
    student: 4,
  };
  const compareNodes = (a: string, b: string) => {
    const nodeA = nodeById.get(a);
    const nodeB = nodeById.get(b);
    if (!nodeA || !nodeB) return a.localeCompare(b);
    return tierOrder[nodeA.tier] - tierOrder[nodeB.tier] || nodeA.name.localeCompare(nodeB.name);
  };

  for (const [parent, children] of childrenByNode) {
    childrenByNode.set(parent, children.slice().sort(compareNodes));
  }

  const roots = nodes
    .filter((node) => !parentByNode.has(node.id))
    .sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || a.name.localeCompare(b.name));
  const positions: Record<string, { x: number; y: number }> = {};
  const subtreeWidth = new Map<string, number>();
  const visiting = new Set<string>();

  function measure(nodeId: string): number {
    if (subtreeWidth.has(nodeId)) return subtreeWidth.get(nodeId)!;
    if (visiting.has(nodeId)) return NODE_WIDTH + SIBLING_GAP;
    visiting.add(nodeId);
    const children = childrenByNode.get(nodeId) ?? [];
    const width =
      children.length === 0
        ? NODE_WIDTH + SIBLING_GAP
        : children.reduce((sum, child) => sum + measure(child), 0);
    visiting.delete(nodeId);
    subtreeWidth.set(nodeId, Math.max(NODE_WIDTH + SIBLING_GAP, width));
    return subtreeWidth.get(nodeId)!;
  }

  function place(nodeId: string, left: number, depth: number, seen = new Set<string>()) {
    if (seen.has(nodeId)) return;
    seen.add(nodeId);
    const width = measure(nodeId);
    positions[nodeId] = {
      x: snap(left + width / 2 - NODE_WIDTH / 2),
      y: snap(56 + depth * LEVEL_GAP),
    };
    let childLeft = left;
    for (const child of childrenByNode.get(nodeId) ?? []) {
      const childWidth = measure(child);
      place(child, childLeft, depth + 1, new Set(seen));
      childLeft += childWidth;
    }
  }

  let cursor = 56;
  for (const root of roots) {
    place(root.id, cursor, 0);
    cursor += measure(root.id) + NODE_WIDTH;
  }

  return positions;
}

function OrgChartPage() {
  const { data: me } = useCurrentUser();
  const qc = useQueryClient();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState({ x: 24, y: 24, scale: 0.78 });
  const [dragging, setDragging] = useState<{
    id: string;
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [panning, setPanning] = useState<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [draftPositions, setDraftPositions] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const [edgeForm, setEdgeForm] = useState({
    parent_user_id: "",
    child_user_id: "",
    relationship: "reports_to",
    note: "",
  });

  const isLeader = !!me?.isSuperAdmin || me?.positions.includes("founding_president");
  const isExecutive = !!me?.isExecutive || isLeader;

  const profilesQuery = useQuery({
    queryKey: ["org-chart-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, status")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const rolesQuery = useQuery({
    queryKey: ["org-chart-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id, user_id, role");
      if (error) throw error;
      return (data ?? []) as UserRole[];
    },
  });

  const positionsQuery = useQuery({
    queryKey: ["org-chart-positions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_positions").select("id, user_id, position");
      if (error) throw error;
      return (data ?? []) as UserPosition[];
    },
  });

  const pairingsQuery = useQuery({
    queryKey: ["org-chart-pairings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_students")
        .select("id, mentor_id, student_id");
      if (error) throw error;
      return (data ?? []) as MentorPairing[];
    },
  });

  const leadershipQuery = useQuery({
    queryKey: ["org-chart-leadership"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leadership_entries")
        .select("id, title, division, position, assignee_id");
      if (error) throw error;
      return (data ?? []) as LeadershipEntry[];
    },
  });

  const edgesQuery = useQuery({
    queryKey: ["org-chart-edges"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await orgTable("org_chart_edges")
        .select("id, parent_user_id, child_user_id, relationship, active")
        .eq("active", true);
      if (error) throw error;
      return (data ?? []) as OrgEdge[];
    },
  });

  const nodePositionsQuery = useQuery({
    queryKey: ["org-chart-node-positions"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await orgTable("org_chart_node_positions").select("node_id, x, y");
      if (error) throw error;
      return (data ?? []) as NodePosition[];
    },
  });

  const requestsQuery = useQuery({
    queryKey: ["org-chart-change-requests"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await orgTable("org_chart_change_requests")
        .select(
          "id, requested_by, parent_user_id, child_user_id, relationship, status, note, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChangeRequest[];
    },
  });

  const profileById = useMemo(
    () => new Map((profilesQuery.data ?? []).map((profile) => [profile.id, profile])),
    [profilesQuery.data],
  );
  const rolesByUser = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    for (const role of rolesQuery.data ?? []) {
      map.set(role.user_id, [...(map.get(role.user_id) ?? []), role.role]);
    }
    return map;
  }, [rolesQuery.data]);
  const positionsByUser = useMemo(() => {
    const map = new Map<string, PositionTitle[]>();
    for (const position of positionsQuery.data ?? []) {
      map.set(position.user_id, [...(map.get(position.user_id) ?? []), position.position]);
    }
    return map;
  }, [positionsQuery.data]);
  const savedPositions = useMemo(
    () =>
      new Map(
        (nodePositionsQuery.data ?? []).map((position) => [
          position.node_id,
          { x: Number(position.x), y: Number(position.y) },
        ]),
      ),
    [nodePositionsQuery.data],
  );

  const { nodes, edges } = useMemo(() => {
    const profiles = (profilesQuery.data ?? []).filter((profile) => profile.status !== "suspended");
    const leadershipAssignees = new Set(
      (leadershipQuery.data ?? []).map((entry) => entry.assignee_id).filter(Boolean),
    );
    const memberNodes: GraphNode[] = profiles.map((profile) => {
      const roles = rolesByUser.get(profile.id) ?? [];
      const positions = positionsByUser.get(profile.id) ?? [];
      const rank = rankFor(roles, positions);
      const isLeaderNode =
        roles.includes("super_admin") || positions.includes("founding_president");
      const isExecutiveNode =
        isLeaderNode ||
        roles.includes("executive") ||
        positions.some((position) =>
          [
            "deputy_chair_president",
            "vc_administration",
            "vc_mentorship",
            "vc_public_relations",
          ].includes(position),
        );
      const isMentorNode =
        roles.includes("mentor") ||
        positions.some(
          (position) => position.startsWith("mentor_") || position === "shadow_mentor",
        );
      const tier: GraphNode["tier"] = isLeaderNode
        ? "leader"
        : isExecutiveNode
          ? "executive"
          : isMentorNode
            ? "mentor"
            : rank >= 60 || leadershipAssignees.has(profile.id)
              ? "division"
              : "student";
      return {
        id: `member:${profile.id}`,
        memberId: profile.id,
        kind: "member",
        tier,
        name: displayName(profile),
        subtitle: primaryLabel(roles, positions),
        roles,
        positions,
        avatarUrl: profile.avatar_url,
        x: 0,
        y: 0,
      };
    });

    const divisionNodes: GraphNode[] = divisions.map((division) => ({
      id: `division:${division}`,
      kind: "division",
      tier: "division",
      name: division,
      subtitle: "Division lane",
      roles: [],
      positions: [],
      x: 0,
      y: 0,
    }));

    const allNodes = [...memberNodes, ...divisionNodes];
    const leaders = memberNodes.filter((node) => node.tier === "leader");
    const executives = memberNodes.filter((node) => node.tier === "executive");
    const divisionMembers = memberNodes.filter((node) => node.tier === "division");
    const mentors = memberNodes.filter((node) => node.tier === "mentor");
    const students = memberNodes.filter((node) => node.tier === "student");
    const nextEdges: GraphEdge[] = [];

    for (const leader of leaders) {
      const targets = executives.length > 0 ? executives : divisionNodes;
      for (const target of targets) {
        if (target.id !== leader.id)
          nextEdges.push({
            id: `leader:${leader.id}:${target.id}`,
            from: leader.id,
            to: target.id,
          });
      }
    }

    for (const executive of executives) {
      const positions = executive.positions;
      const targetDivisions = positions.includes("vc_administration")
        ? ["Administrative Division"]
        : positions.includes("vc_public_relations")
          ? ["Public Relations Division"]
          : positions.includes("vc_mentorship")
            ? ["Mentorship Tracks", "Mentorship Training"]
            : [...divisions];
      for (const division of targetDivisions) {
        nextEdges.push({
          id: `executive:${executive.id}:${division}`,
          from: executive.id,
          to: `division:${division}`,
        });
      }
    }

    for (const member of [...divisionMembers, ...mentors]) {
      const division = divisionFor(member.positions);
      nextEdges.push({
        id: `division:${division}:${member.id}`,
        from: `division:${division}`,
        to: member.id,
      });
    }

    const pairedStudents = new Set<string>();
    for (const pairing of pairingsQuery.data ?? []) {
      const mentorNode = memberNodes.find((node) => node.memberId === pairing.mentor_id);
      const studentNode = memberNodes.find((node) => node.memberId === pairing.student_id);
      if (mentorNode && studentNode) {
        pairedStudents.add(studentNode.memberId!);
        nextEdges.push({
          id: `pairing:${pairing.id}`,
          from: mentorNode.id,
          to: studentNode.id,
          label: "mentor",
        });
      }
    }

    for (const student of students) {
      if (!student.memberId || pairedStudents.has(student.memberId)) continue;
      nextEdges.push({
        id: `unassigned:${student.id}`,
        from: "division:General Membership",
        to: student.id,
      });
    }

    for (const edge of edgesQuery.data ?? []) {
      const from = `member:${edge.parent_user_id}`;
      const to = `member:${edge.child_user_id}`;
      if (allNodes.some((node) => node.id === from) && allNodes.some((node) => node.id === to)) {
        nextEdges.push({
          id: `custom:${edge.id}`,
          from,
          to,
          label: edge.relationship.replace(/_/g, " "),
          custom: true,
        });
      }
    }

    const tierY = {
      leader: 64,
      executive: 224,
      division: 392,
      mentor: 560,
      student: 728,
    };
    const tierBuckets = {
      leader: leaders,
      executive: executives,
      division: [...divisionNodes, ...divisionMembers],
      mentor: mentors,
      student: students,
    };
    for (const tier of Object.keys(tierBuckets) as Array<keyof typeof tierBuckets>) {
      const bucket = tierBuckets[tier];
      bucket.forEach((node, index) => {
        const row = Math.floor(index / 5);
        const col = index % 5;
        const defaultPosition = {
          x: 48 + col * 280,
          y: tierY[tier] + row * 144,
        };
        const saved = draftPositions[node.id] ?? savedPositions.get(node.id) ?? defaultPosition;
        node.x = saved.x;
        node.y = saved.y;
      });
    }

    return { nodes: allNodes, edges: nextEdges };
  }, [
    draftPositions,
    edgesQuery.data,
    leadershipQuery.data,
    pairingsQuery.data,
    positionsByUser,
    profilesQuery.data,
    rolesByUser,
    savedPositions,
  ]);

  const filteredNodes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return nodes;
    return nodes.filter((node) =>
      [node.name, node.subtitle, node.roles.join(" "), node.positions.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [nodes, query]);
  const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));
  const visibleEdges = edges.filter(
    (edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to),
  );
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const memberOptions = nodes.filter((node) => node.memberId);
  const pendingRequests = (requestsQuery.data ?? []).filter(
    (request) => request.status === "pending",
  );
  const graphError =
    profilesQuery.error ??
    rolesQuery.error ??
    positionsQuery.error ??
    pairingsQuery.error ??
    leadershipQuery.error ??
    edgesQuery.error ??
    nodePositionsQuery.error ??
    requestsQuery.error;
  const canvasWidth = Math.max(1120, ...nodes.map((node) => node.x + NODE_WIDTH + 80));
  const canvasHeight = Math.max(760, ...nodes.map((node) => node.y + NODE_HEIGHT + 100));

  function screenToGraph(clientX: number, clientY: number) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return {
      x: (clientX - rect.left - viewport.x) / viewport.scale,
      y: (clientY - rect.top - viewport.y) / viewport.scale,
    };
  }

  const savePositionMutation = useMutation({
    mutationFn: async (node: GraphNode) => {
      if (!me) throw new Error("Sign in before saving graph layout.");
      const { error } = await orgTable("org_chart_node_positions").upsert(
        {
          node_id: node.id,
          x: node.x,
          y: node.y,
          updated_by: me.user.id,
        },
        { onConflict: "node_id" },
      );
      if (error) throw error;
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save node."),
  });

  const createEdgeMutation = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error("Sign in before changing reporting lines.");
      if (!edgeForm.parent_user_id || !edgeForm.child_user_id) {
        throw new Error("Choose both a supervisor and a member.");
      }
      if (edgeForm.parent_user_id === edgeForm.child_user_id) {
        throw new Error("A member cannot report to themselves.");
      }
      if (isLeader) {
        const { error } = await orgTable("org_chart_edges").upsert(
          {
            parent_user_id: edgeForm.parent_user_id,
            child_user_id: edgeForm.child_user_id,
            relationship: edgeForm.relationship,
            active: true,
            created_by: me.user.id,
            approved_by: me.user.id,
            approved_at: new Date().toISOString(),
          },
          { onConflict: "parent_user_id,child_user_id,relationship" },
        );
        if (error) throw error;
        return "approved" as const;
      }
      const { error } = await orgTable("org_chart_change_requests").insert({
        requested_by: me.user.id,
        parent_user_id: edgeForm.parent_user_id,
        child_user_id: edgeForm.child_user_id,
        relationship: edgeForm.relationship,
        note: edgeForm.note.trim() || null,
      });
      if (error) throw error;
      return "pending" as const;
    },
    onSuccess: (status) => {
      toast.success(status === "approved" ? "Reporting line added" : "Approval request sent");
      setEdgeForm({ parent_user_id: "", child_user_id: "", relationship: "reports_to", note: "" });
      qc.invalidateQueries({ queryKey: ["org-chart-edges"] });
      qc.invalidateQueries({ queryKey: ["org-chart-change-requests"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save request."),
  });

  const decideRequestMutation = useMutation({
    mutationFn: async ({
      request,
      status,
    }: {
      request: ChangeRequest;
      status: "approved" | "rejected";
    }) => {
      if (!me) throw new Error("Sign in before deciding requests.");
      if (status === "approved") {
        const { error: edgeError } = await orgTable("org_chart_edges").upsert(
          {
            parent_user_id: request.parent_user_id,
            child_user_id: request.child_user_id,
            relationship: request.relationship,
            active: true,
            created_by: request.requested_by,
            approved_by: me.user.id,
            approved_at: new Date().toISOString(),
          },
          { onConflict: "parent_user_id,child_user_id,relationship" },
        );
        if (edgeError) throw edgeError;
      }
      const { error } = await orgTable("org_chart_change_requests")
        .update({
          status,
          decided_by: me.user.id,
          decided_at: new Date().toISOString(),
        })
        .eq("id", request.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["org-chart-edges"] });
      qc.invalidateQueries({ queryKey: ["org-chart-change-requests"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update request."),
  });

  function onNodePointerDown(event: PointerEvent<HTMLButtonElement>, node: GraphNode) {
    event.stopPropagation();
    const point = screenToGraph(event.clientX, event.clientY);
    setDragging({
      id: node.id,
      pointerId: event.pointerId,
      offsetX: point.x - node.x,
      offsetY: point.y - node.y,
    });
    setSelectedNodeId(node.id);
  }

  function onCanvasPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragging) {
      const point = screenToGraph(event.clientX, event.clientY);
      const next = {
        x: snap(point.x - dragging.offsetX),
        y: snap(point.y - dragging.offsetY),
      };
      setDraftPositions((current) => ({ ...current, [dragging.id]: next }));
      return;
    }
    if (panning) {
      setViewport((current) => ({
        ...current,
        x: panning.originX + event.clientX - panning.startX,
        y: panning.originY + event.clientY - panning.startY,
      }));
    }
  }

  function onCanvasPointerUp() {
    if (dragging) {
      const node = nodes.find((item) => item.id === dragging.id);
      const position = draftPositions[dragging.id];
      setDragging(null);
      if (node) savePositionMutation.mutate(position ? { ...node, ...position } : node);
    }
    if (panning) setPanning(null);
  }

  function onViewportPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-org-node]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setPanning({
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    });
  }

  function onWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextScale = clamp(viewport.scale * (event.deltaY > 0 ? 0.9 : 1.1), 0.25, 1.8);
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const graphX = (cursorX - viewport.x) / viewport.scale;
    const graphY = (cursorY - viewport.y) / viewport.scale;
    setViewport({
      scale: nextScale,
      x: cursorX - graphX * nextScale,
      y: cursorY - graphY * nextScale,
    });
  }

  function resetLayout() {
    setDraftPositions({});
    toast.success("Layout reset locally. Drag nodes to save new positions.");
  }

  function autoArrangeTree() {
    const arranged = buildTreeLayout(nodes, edges);
    setDraftPositions(arranged);
    setViewport({ x: 32, y: 32, scale: 0.72 });
    toast.success("Tree arranged. Drag any node for manual tweaks.");
    for (const node of nodes) {
      const next = arranged[node.id];
      if (next) savePositionMutation.mutate({ ...node, ...next });
    }
  }

  if (!isExecutive) {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="p-8 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-3 font-display text-3xl text-ink">Executive access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The member reporting graph is visible to the leader, super admins, and executive team.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Reporting graph
          </p>
          <h1 className="mt-2 flex items-center gap-3 font-display text-4xl text-ink">
            <Network className="h-8 w-8 text-primary" />
            Member Node Tree
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Use Auto arrange for a clean tree, scroll to zoom, drag the canvas to pan, or drag
            individual nodes to snap them into place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="gap-2" onClick={autoArrangeTree}>
            <Rows3 className="h-4 w-4" />
            Auto arrange
          </Button>
          <Button variant="outline" className="gap-2" onClick={resetLayout}>
            <GitBranch className="h-4 w-4" />
            Reset layout
          </Button>
          <Button
            className="gap-2"
            onClick={() => {
              const member = selectedNode?.memberId ?? "";
              setEdgeForm((current) => ({ ...current, parent_user_id: member }));
            }}
          >
            <UserPlus className="h-4 w-4" />
            Start from selected
          </Button>
        </div>
      </div>

      {graphError && (
        <Card className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Org chart persistence is not fully available yet:{" "}
          {graphError instanceof Error ? graphError.message : "check the org chart migration."}
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
                placeholder="Search members, roles, or divisions"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">
                {nodes.filter((node) => node.kind === "member").length} members
              </Badge>
              <Badge variant="outline">{visibleEdges.length} visible lines</Badge>
              <Badge variant="outline">{pendingRequests.length} pending</Badge>
              <Badge variant="outline">{Math.round(viewport.scale * 100)}% zoom</Badge>
            </div>
          </div>

          <div
            ref={viewportRef}
            className={cn(
              "h-[70vh] overflow-hidden bg-muted/30",
              panning ? "cursor-grabbing" : "cursor-grab",
            )}
            onPointerDown={onViewportPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={onCanvasPointerUp}
            onPointerCancel={onCanvasPointerUp}
            onWheel={onWheel}
          >
            <div
              ref={canvasRef}
              className="relative touch-none"
              style={{
                width: canvasWidth,
                height: canvasHeight,
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
                transformOrigin: "0 0",
              }}
            >
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {visibleEdges.map((edge) => {
                  const from = nodes.find((node) => node.id === edge.from);
                  const to = nodes.find((node) => node.id === edge.to);
                  if (!from || !to) return null;
                  const x1 = from.x + NODE_WIDTH / 2;
                  const y1 = from.y + NODE_HEIGHT;
                  const x2 = to.x + NODE_WIDTH / 2;
                  const y2 = to.y;
                  const labelX = (x1 + x2) / 2;
                  const labelY = (y1 + y2) / 2 - 6;
                  return (
                    <g key={edge.id}>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={edge.custom ? "hsl(var(--primary))" : "hsl(var(--border))"}
                        strokeWidth={edge.custom ? 2.75 : 1.75}
                        strokeDasharray={edge.custom ? "0" : "6 6"}
                      />
                      {edge.label && (
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor="middle"
                          className="fill-muted-foreground text-[10px]"
                        >
                          {edge.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {filteredNodes.map((node) => (
                <button
                  key={node.id}
                  data-org-node
                  type="button"
                  onPointerDown={(event) => onNodePointerDown(event, node)}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={cn(
                    "absolute flex h-[92px] w-[220px] cursor-grab select-none items-center gap-3 rounded-lg border bg-background p-3 text-left shadow-sm transition active:cursor-grabbing",
                    selectedNodeId === node.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50",
                    node.kind === "division" && "bg-primary/5",
                  )}
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
                    {node.avatarUrl ? (
                      <img src={node.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : node.kind === "division" ? (
                      <Network className="h-5 w-5 text-primary" />
                    ) : (
                      <span className="text-sm font-medium text-ink">
                        {node.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{node.name}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {node.subtitle}
                    </span>
                    <span className="mt-2 inline-flex rounded-md border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {node.tier}
                    </span>
                  </span>
                  <Grip className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl text-ink">Add reporting line</h2>
            </div>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                createEdgeMutation.mutate();
              }}
            >
              <div>
                <Label>Supervisor</Label>
                <Select
                  value={edgeForm.parent_user_id}
                  onValueChange={(value) =>
                    setEdgeForm((current) => ({ ...current, parent_user_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions.map((node) => (
                      <SelectItem key={node.id} value={node.memberId!}>
                        {node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Member underneath</Label>
                <Select
                  value={edgeForm.child_user_id}
                  onValueChange={(value) =>
                    setEdgeForm((current) => ({ ...current, child_user_id: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose member" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions.map((node) => (
                      <SelectItem key={node.id} value={node.memberId!}>
                        {node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Relationship</Label>
                <Select
                  value={edgeForm.relationship}
                  onValueChange={(value) =>
                    setEdgeForm((current) => ({ ...current, relationship: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reports_to">Reports to</SelectItem>
                    <SelectItem value="mentored_by">Mentored by</SelectItem>
                    <SelectItem value="division_lead">Division lead</SelectItem>
                    <SelectItem value="collaborates_with">Collaborates with</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!isLeader && (
                <div>
                  <Label htmlFor="request-note">Approval note</Label>
                  <Textarea
                    id="request-note"
                    value={edgeForm.note}
                    onChange={(event) =>
                      setEdgeForm((current) => ({ ...current, note: event.target.value }))
                    }
                    placeholder="Why should this reporting line be added?"
                  />
                </div>
              )}
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={createEdgeMutation.isPending}
              >
                <Save className="h-4 w-4" />
                {isLeader ? "Add line" : "Request approval"}
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-xl text-ink">Selected node</h2>
            {selectedNode ? (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="font-medium text-ink">{selectedNode.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedNode.subtitle}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {ROLE_LABEL[role]}
                    </Badge>
                  ))}
                  {selectedNode.positions.map((position) => (
                    <Badge key={position} variant="outline">
                      {POSITION_LABEL[position]}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Position: {Math.round(selectedNode.x)}, {Math.round(selectedNode.y)}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Select a node to inspect it.</p>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-ink">Approval queue</h2>
              <Badge variant="secondary">{pendingRequests.length}</Badge>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((request) => {
                const parent = profileById.get(request.parent_user_id);
                const child = profileById.get(request.child_user_id);
                return (
                  <div key={request.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium text-ink">
                      {displayName(parent)} {"->"} {displayName(child)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {request.relationship.replace(/_/g, " ")}
                    </p>
                    {request.note && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {request.note}
                      </p>
                    )}
                    {isLeader && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1"
                          disabled={decideRequestMutation.isPending}
                          onClick={() =>
                            decideRequestMutation.mutate({ request, status: "approved" })
                          }
                        >
                          <Check className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={decideRequestMutation.isPending}
                          onClick={() =>
                            decideRequestMutation.mutate({ request, status: "rejected" })
                          }
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {pendingRequests.length === 0 && (
                <p className="text-sm text-muted-foreground">No pending graph changes.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
