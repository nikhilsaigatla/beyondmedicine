-- Capture the complete application submitted with account creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  IF LOWER(NEW.email) = 'nikhil.sai.gatla.nsg@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_positions (user_id, position) VALUES (NEW.id, 'founding_president') ON CONFLICT DO NOTHING;
    INSERT INTO public.applications (user_id, status, full_name, email, submitted_at, decided_at)
      VALUES (NEW.id, 'approved',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email, now(), now())
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_positions (user_id, position) VALUES (NEW.id, 'general_member') ON CONFLICT DO NOTHING;
    INSERT INTO public.applications (
      user_id, status, full_name, grade_level, country, state_region, county,
      school, email, phone, time_zone, discovery_source, interests,
      custom_interests, research_experience, research_experience_details,
      cohort_preference, submitted_at
    )
    VALUES (
      NEW.id, 'pending',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'grade_level',
      NEW.raw_user_meta_data->>'country',
      NEW.raw_user_meta_data->>'state_region',
      NEW.raw_user_meta_data->>'county',
      NEW.raw_user_meta_data->>'school',
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'time_zone',
      NEW.raw_user_meta_data->>'discovery_source',
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'interests', '[]'::jsonb))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.raw_user_meta_data->'custom_interests', '[]'::jsonb))),
      COALESCE((NEW.raw_user_meta_data->>'research_experience')::boolean, false),
      NEW.raw_user_meta_data->>'research_experience_details',
      NEW.raw_user_meta_data->>'cohort_preference',
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;