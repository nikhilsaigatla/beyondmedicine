import type { Database } from "@/integrations/supabase/types";

export type AppRole = "super_admin" | "executive" | "officer" | "board" | "mentor" | "member";
export type PositionTitle =
  | "founding_president"
  | "deputy_chair_president"
  | "vc_administration" | "vc_mentorship" | "vc_public_relations"
  | "communications_chair" | "outreach_chair" | "treasury_chair" | "secretary_chair"
  | "technology_chair" | "social_media_chair" | "website_chair" | "applications_chair" | "welcome_chair"
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
  founding_president: "Founder & President",
  deputy_chair_president: "Deputy Chair of the President",
  vc_administration: "Vice Chair of Administration",
  vc_mentorship: "Vice Chair of Mentorship",
  vc_public_relations: "Vice Chair of Public Relations",
  communications_chair: "Communications Chair",
  outreach_chair: "Outreach Co-Chair",
  treasury_chair: "Treasury Co-Chair",
  secretary_chair: "Secretary Chair",
  technology_chair: "Technology Chair",
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

export const ROLE_RANK: Record<AppRole, number> = {
  member: 10,
  mentor: 40,
  officer: 60,
  board: 70,
  executive: 80,
  super_admin: 100,
};

export const POSITION_RANK: Record<PositionTitle, number> = {
  founding_president: 100,
  deputy_chair_president: 90,
  vc_administration: 80,
  vc_mentorship: 80,
  vc_public_relations: 80,
  board_member: 70,
  communications_chair: 60,
  outreach_chair: 60,
  treasury_chair: 60,
  secretary_chair: 60,
  technology_chair: 60,
  social_media_chair: 60,
  website_chair: 60,
  applications_chair: 60,
  welcome_chair: 60,
  mentor_biological: 40,
  mentor_physical: 40,
  mentor_social: 40,
  mentor_quantitative: 40,
  mentor_computational: 40,
  mentor_general: 40,
  mentor_in_training: 30,
  shadow_mentor: 30,
  general_member: 10,
};

export type LeadershipDivision =
  | "Founding Leadership"
  | "Executive Division"
  | "Administrative Division"
  | "Public Relations Division"
  | "Mentorship Tracks"
  | "Mentorship Training"
  | "General Membership"
  | "Unverified";

export const POSITION_DIVISION: Record<PositionTitle, LeadershipDivision> = {
  founding_president: "Founding Leadership",
  deputy_chair_president: "Founding Leadership",
  vc_administration: "Executive Division",
  vc_mentorship: "Executive Division",
  vc_public_relations: "Executive Division",
  communications_chair: "Administrative Division",
  secretary_chair: "Administrative Division",
  technology_chair: "Administrative Division",
  applications_chair: "Administrative Division",
  welcome_chair: "Administrative Division",
  social_media_chair: "Public Relations Division",
  outreach_chair: "Public Relations Division",
  treasury_chair: "Public Relations Division",
  website_chair: "Public Relations Division",
  mentor_biological: "Mentorship Tracks",
  mentor_physical: "Mentorship Tracks",
  mentor_social: "Mentorship Tracks",
  mentor_quantitative: "Mentorship Tracks",
  mentor_computational: "Mentorship Tracks",
  mentor_general: "Mentorship Tracks",
  shadow_mentor: "Mentorship Training",
  mentor_in_training: "Mentorship Training",
  board_member: "Founding Leadership",
  general_member: "General Membership",
};

export const LEADERSHIP_POSITIONS: PositionTitle[] = [
  "founding_president",
  "deputy_chair_president",
  "vc_administration",
  "vc_mentorship",
  "vc_public_relations",
];

export const ADMINISTRATIVE_POSITIONS: PositionTitle[] = [
  "communications_chair",
  "secretary_chair",
  "technology_chair",
  "applications_chair",
  "welcome_chair",
];

export const PUBLIC_RELATIONS_POSITIONS: PositionTitle[] = [
  "social_media_chair",
  "outreach_chair",
  "treasury_chair",
];

export const MENTOR_POSITIONS: PositionTitle[] = [
  "mentor_biological",
  "mentor_physical",
  "mentor_social",
  "mentor_quantitative",
  "mentor_computational",
];

export const TRAINING_POSITIONS: PositionTitle[] = ["shadow_mentor", "mentor_in_training"];
export const APPLICATION_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "general_member", label: "General Member" },
  ...ALL_POSITIONS.filter((position) => !["general_member", "mentor_general"].includes(position)).map((position) => ({
    value: position,
    label: POSITION_LABEL[position],
  })),
];

export const TASK_DIVISIONS = [
  "Executive Division",
  "Administrative Division",
  "Public Relations Division",
  "Mentorship Tracks",
  "Mentorship Training",
  "General Membership",
] as const;
export type TaskDivision = (typeof TASK_DIVISIONS)[number];
export const MAILING_LIST_DIVISIONS = ["All verified members", ...TASK_DIVISIONS] as const;

export const APPLICATION_MANAGER_POSITIONS: PositionTitle[] = ["applications_chair"];
export const APPLICATION_MANAGER_ROLES: AppRole[] = ["super_admin", "executive", "officer"];

export function hasApplicationManagementAccess(roles: AppRole[], positions: PositionTitle[]): boolean {
  return roles.some((role) => APPLICATION_MANAGER_ROLES.includes(role)) ||
    positions.some((position) => APPLICATION_MANAGER_POSITIONS.includes(position));
}

export type PortalTabAccess = "approved" | "mentor" | "admin" | "superadmin";
export const PORTAL_TAB_ACCESS: Record<string, PortalTabAccess> = {
  dashboard: "approved",
  announcements: "approved",
  directory: "approved",
  messages: "approved",
  calendar: "approved",
  meetings: "approved",
  courses: "approved",
  beme: "approved",
  admissions: "admin",
  mailingList: "admin",
  siteManagement: "superadmin",
  mentor: "mentor",
  admin: "admin",
};

// Suppress unused import warning if types file has none of these yet
export type _Db = Database;

export type Department =
  | "Executive Department"
  | "Administration Department"
  | "Public Relations Department"
  | "Mentorship Department"
  | "Board"
  | "General Membership";

export const POSITION_DEPARTMENT: Record<PositionTitle, Department> = {
  founding_president: "Executive Department",
  deputy_chair_president: "Executive Department",
  vc_administration: "Executive Department",
  vc_mentorship: "Executive Department",
  vc_public_relations: "Executive Department",
  communications_chair: "Administration Department",
  outreach_chair: "Administration Department",
  treasury_chair: "Administration Department",
  secretary_chair: "Administration Department",
  technology_chair: "Administration Department",
  social_media_chair: "Public Relations Department",
  website_chair: "Public Relations Department",
  applications_chair: "Public Relations Department",
  welcome_chair: "Public Relations Department",
  board_member: "Board",
  mentor_biological: "Mentorship Department",
  mentor_physical: "Mentorship Department",
  mentor_social: "Mentorship Department",
  mentor_quantitative: "Mentorship Department",
  mentor_computational: "Mentorship Department",
  mentor_general: "Mentorship Department",
  mentor_in_training: "Mentorship Department",
  shadow_mentor: "Mentorship Department",
  general_member: "General Membership",
};

export const ALL_DEPARTMENTS: Department[] = [
  "Executive Department",
  "Administration Department",
  "Public Relations Department",
  "Mentorship Department",
  "Board",
  "General Membership",
];

export const ACADEMIC_INTERESTS = [
  "Medicine",
  "Public Health",
  "Biology",
  "Genetics",
  "Neuroscience",
  "Psychology",
  "Environmental Health",
  "Epidemiology",
  "Sociology",
  "Healthcare Policy",
  "Data Science / AI",
  "Computer Science",
  "Biomedical Engineering",
] as const;

export const DISCOVERY_SOURCES = [
  "Google Search",
  "Friend or Family",
  "Instagram",
  "TikTok",
  "ChatGPT",
  "News",
  "Partner Organization",
  "Other",
] as const;

export const GRADE_LEVELS = [
  "Middle school",
  "9th grade",
  "10th grade",
  "11th grade",
  "12th grade",
  "College freshman",
  "College sophomore",
  "College junior",
  "College senior",
  "Graduate student",
  "Other",
] as const;

export const TIME_ZONES = typeof Intl.supportedValuesOf === "function"
  ? Intl.supportedValuesOf("timeZone")
  : [];
