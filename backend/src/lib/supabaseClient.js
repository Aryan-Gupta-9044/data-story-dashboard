import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn(
    "[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — " +
      "requests that touch the database will fail until backend/.env is filled in."
  );
}

// Service-role client: bypasses RLS, used only on the server.
export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
