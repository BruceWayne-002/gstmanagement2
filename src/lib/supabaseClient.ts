import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (typeof rawUrl !== "string" || !rawUrl) {
  throw new Error("VITE_SUPABASE_URL is missing. Add it to your .env.local");
}

if (typeof rawAnonKey !== "string" || !rawAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is missing. Add it to your .env.local");
}

const supabaseUrl = rawUrl;
const supabaseAnonKey = rawAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
