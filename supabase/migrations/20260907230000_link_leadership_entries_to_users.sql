ALTER TABLE public.leadership_entries
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.leadership_entries AS entries
SET assignee_id = profiles.id
FROM public.profiles AS profiles
WHERE entries.assignee_id IS NULL
  AND entries.name IS NOT NULL
  AND lower(trim(entries.name)) = lower(trim(profiles.full_name));
