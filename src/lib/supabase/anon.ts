import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createAnonClient() {
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured.");
  }
  return createClient(url, anonKey);
}
