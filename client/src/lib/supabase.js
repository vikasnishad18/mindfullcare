import { createClient } from "@supabase/supabase-js";

// Support both CRA and Vite-style env vars.
// - CRA (react-scripts): process.env.REACT_APP_*
// - Vite: import.meta.env.VITE_*
const viteEnv = import.meta.env || {};
const DEFAULT_SUPABASE_URL = "https://fzxmrfkfzmbhxgmlroff.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_OiVg9bfY7B6A-SUMEaEQEQ_bpxz1Idd";

const supabaseUrl =
  viteEnv.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  viteEnv.VITE_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

let cachedClient = null;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}

// If you are using Vite, you can use this pattern:
// const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// )
export const supabase = getSupabaseClient();
