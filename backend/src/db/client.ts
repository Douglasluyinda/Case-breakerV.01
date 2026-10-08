import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

// Service-role client — used server-side only, never exposed to the browser.
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Anon client — safe to use with user JWTs (RLS enforced).
export const supabaseAnon = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);
