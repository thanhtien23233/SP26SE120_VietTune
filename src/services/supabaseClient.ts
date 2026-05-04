import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export function assertSupabaseConfigured(): void {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials in env (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).');
  }
}
