import { createClient } from "@supabase/supabase-js";

export function createServerSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL と SUPABASE_ANON_KEY を環境変数に設定してください。",
    );
  }

  return createClient(url, key);
}
