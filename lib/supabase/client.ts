import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for use in Browser/Client Components
export const createClient = () => createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Legacy singleton export
export const supabase = createClient();
