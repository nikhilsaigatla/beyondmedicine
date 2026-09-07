export const ROLE_PREVIEW_OPTIONS = [
  { value: "applicant", label: "Applicant view" },
  { value: "member", label: "Member view" },
  { value: "mentor", label: "Mentor view" },
  { value: "officer", label: "Officer view" },
  { value: "executive", label: "Executive view" },
  { value: "admin", label: "Administrator view" },
] as const;

export type RolePreview = (typeof ROLE_PREVIEW_OPTIONS)[number]["value"];
const STORAGE_KEY = "beyond-medicine-role-preview";

export function getRolePreview(): RolePreview {
  if (typeof window === "undefined") return "admin";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return ROLE_PREVIEW_OPTIONS.some((option) => option.value === value) ? value as RolePreview : "admin";
}

export function setRolePreview(value: RolePreview) {
  window.localStorage.setItem(STORAGE_KEY, value);
  window.dispatchEvent(new CustomEvent("beyond-medicine-role-preview", { detail: value }));
}
