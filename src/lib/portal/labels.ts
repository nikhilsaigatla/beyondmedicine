import type { Database } from "@/integrations/supabase/types";

export type AppRole = "super_admin" | "executive" | "officer" | "board" | "mentor" | "member";
export type PositionTitle =
  | "founding_president"
  | "deputy_chair_president"
  | "vc_administration" | "vc_mentorship" | "vc_public_relations"
  | "communications_chair" | "outreach_chair" | "treasury_chair" | "secretary_chair"
  | "social_media_chair" | "website_chair" | "applications_chair" | "welcome_chair"
  | "board_member"
  | "mentor_biological" | "mentor_physical" | "mentor_social"
  | "mentor_quantitative" | "mentor_computational" | "mentor_general"
  | "mentor_in_training" | "shadow_mentor"
  | "general_member";

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Founding President",
  executive: "Executive",
  officer: "Officer",
  board: "Board Member",
  mentor: "Mentor",
  member: "General Member",
};

export const POSITION_LABEL: Record<PositionTitle, string> = {
  founding_president: "Founding President",
  deputy_chair_president: "Deputy Chair of the President",
  vc_administration: "Vice Chair of Administration",
  vc_mentorship: "Vice Chair of Mentorship",
  vc_public_relations: "Vice Chair of Public Relations",
  communications_chair: "Communications Chair",
  outreach_chair: "Outreach Chair",
  treasury_chair: "Treasury Chair",
  secretary_chair: "Secretary Chair",
  social_media_chair: "Social Media Chair",
  website_chair: "Website Chair",
  applications_chair: "Applications Chair",
  welcome_chair: "Welcome Chair",
  board_member: "Board Member",
  mentor_biological: "Mentor of Biological Sciences",
  mentor_physical: "Mentor of Physical Sciences",
  mentor_social: "Mentor of Social Sciences",
  mentor_quantitative: "Mentor of Quantitative Sciences",
  mentor_computational: "Mentor of Computational Sciences",
  mentor_general: "General Mentor",
  mentor_in_training: "Mentor in Training",
  shadow_mentor: "Shadow Mentor",
  general_member: "General Member",
};

export const ALL_POSITIONS = Object.keys(POSITION_LABEL) as PositionTitle[];
export const ALL_ROLES: AppRole[] = ["super_admin", "executive", "officer", "board", "mentor", "member"];

// Suppress unused import warning if types file has none of these yet
export type _Db = Database;
