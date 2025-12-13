import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireEnv, requireOneOfEnv } from "@/lib/env";

export function createSupabaseServerClient(): SupabaseClient {
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const { value: supabaseKey } = requireOneOfEnv([
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
