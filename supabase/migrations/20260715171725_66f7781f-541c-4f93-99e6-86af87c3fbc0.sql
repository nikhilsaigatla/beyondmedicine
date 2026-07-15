
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_position(UUID, public.position_title) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_officer_or_above(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.in_research_group(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_enrolled(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_course(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mentor_of_assignment(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.in_conversation(UUID, UUID) FROM PUBLIC, anon;
