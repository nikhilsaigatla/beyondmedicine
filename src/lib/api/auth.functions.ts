import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Checks whether an account already exists for the given email, straight from
// the Supabase profiles table (service role, bypasses RLS) — used to give
// signup users an authoritative answer instead of guessing from auth errors.
export const checkEmailRegistered = createServerFn({ method: "POST" })
  .inputValidator(z.object({ email: z.string().email() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return { exists: Boolean(profile) };
  });
