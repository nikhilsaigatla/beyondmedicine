
# Phase 2 build plan — Foundation + BeMe + Calendar/Meetings

Building on the existing portal. No redesign; extending the current sidebar shell, tables, and RLS.

## 1. Branding parity in the portal
- Replace the text-only sidebar header in `portal-shell.tsx` with the official logo asset (`bm-logo.png`) + the `Brand` wordmark component used on the public site.
- Add a small `Brand`-style header to the mobile top bar. Reuse existing tokens; no new colors.

## 2. Application-as-registration
New migration:
- `applications` table (user_id PK → auth.users, status enum: `incomplete | pending | approved | rejected`, plus fields: full_name, grade_level, country, state_region, county, school, phone, time_zone, discovery_source, research_experience_bool, cohort_preference, notes, submitted_at, decided_at, decided_by). `interests` array + `custom_interests` array.
- Trigger extension: `handle_new_user` also inserts a row into `applications` with `status='incomplete'` for every new signup (including founding president auto-approved).
- Existing users: backfill `applications` rows for anyone missing one, status `incomplete`.
- RLS: owner can read/update own row while `incomplete`; officers-or-above can read all; super_admin + applications_chair can approve/reject.
- Add a `gate_status` computed via a small helper `has_full_access(uid)` = approved OR super_admin.

Frontend:
- `/portal/complete-registration` route: multi-step form (Personal → Discovery → Interests → Research/Cohort → Review). Autosaves on every field change (debounced upsert). Modern cards, progress bar, inline validation, email-typo suggestions (`gmai.com` → `gmail.com`).
- Portal shell: if `me.application.status !== 'approved' && !isSuperAdmin`, render a full-screen banner/dialog "Complete your registration" with CTA and read-only sidebar. Keep messaging + BeMe optionally locked behind approval.
- After submit → status becomes `pending`, applicant lands on a "Pending review" screen.

## 3. Member Management (folded into existing `/portal/admin`)
Rebuild the admin page as tabs: **Applications**, **Members**, **Mentor pairings**.
- Applications tab: list pending applications with full submitted details, Approve / Reject buttons.
- Members tab: searchable list with position badge, status (invited/pending/incomplete/active/suspended), quick actions: edit position, assign mentor, suspend/reactivate, delete.
- Add `status` column on `profiles` (`active | suspended`) + `suspended_at`. Suspended users blocked at the `_authenticated` gate.
- Rename UI language everywhere: "Role" → "Leadership Position".

## 4. Member Directory  `/portal/directory`
- New route accessible to any approved member.
- Grid of member cards (avatar, name, position, department, interests, timezone, email, bio).
- Live search filtering by name, position label, department, interests.
- Add a `department` derivation in `src/lib/portal/labels.ts` mapping each position → department name; search matches on it.
- Only shows approved members. Does NOT expose phone/address/school.

## 5. Messaging upgrade
- Replace email-input "new conversation" with a searchable member picker (Command palette style using existing `cmdk`).
- Multi-select → creates group conversation (uses existing `conversations` + `conversation_members`).
- Filter matches by name/email/position/department.
- Keep existing message list/thread UI.

## 6. Calendar & Meetings
New migration:
- `meetings` table (id, title, description, starts_at, ends_at, location, meeting_link, created_by, visibility enum `all_members | leadership | mentors | custom`, agenda text, notes text, notes_updated_at).
- `meeting_attendees` (meeting_id, user_id, rsvp enum `yes|no|maybe|pending`).
- RLS: everyone approved can read meetings whose visibility includes them; officers can create; super_admin can edit anything; attendees can set their own RSVP.

Frontend:
- `/portal/calendar` — month view (custom lightweight; no new heavy dep — use `date-fns` if not already; fall back to a simple grid). Click event → detail dialog with description, link, agenda, notes, RSVP button, attendees list.
- `/portal/meetings` — list view of upcoming + past meetings; officers see "New meeting" button. Meeting detail page allows officers/super_admin to attach/edit notes after the meeting.
- Assignments due dates from existing `assignments` table also render as calendar events.

## 7. BeMe AI assistant
- Server: `src/routes/api/beme.ts` streaming chat route via Lovable AI Gateway (`google/gemini-2.5-flash`), system prompt establishing BeMe identity + Beyond Medicine guidance boundaries. Requires auth.
- Client: `/portal/beme` full-page chat using AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`). Also floating chat button (bottom-right of portal shell) opening a docked drawer using the same components.
- Adds nav item "BeMe" in sidebar.
- Conversation history in-memory per session (no persistence Phase 2). Small "Ask your mentor for organization-specific questions" note in empty state.

## 8. Announcements (small extensions)
- Add `email_notify boolean` and `distribute_public boolean` columns for future; no email pipeline yet, but UI toggle is present. Documented as "email delivery coming".

## Not in this pass (called out explicitly)
- Dynamic departments/positions editable via UI (still enum-driven; UI copy updated to "Leadership Position" and department labels derived in code).
- Full analytics dashboard, invite-with-email flow, per-user notification preferences, mentor workspace rebuild, course creation UI, per-user email notifications, activity timelines, online presence, profile page rebuild.
- These are large enough to warrant their own phase; the current mentor/courses/announcements pages remain functional.

## Technical notes
- All new tables include GRANTs to `authenticated` + `service_role`, RLS on, policies scoped via `has_role` / new `has_full_access` helper.
- Reuse existing tokens (`bg-cream`, `text-ink`, `font-display`) — no new palette.
- All new routes under `src/routes/_authenticated/portal.*.tsx` so they inherit the gate.
- Uses existing Supabase client only (no admin client needed on the frontend).
- BeMe route uses `createLovableAiGatewayProvider` + `streamText`; `LOVABLE_API_KEY` already set.

Two DB migrations total (applications + status; meetings + attendees). Announcement column addition merged into the first.
