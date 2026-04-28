import { createBrowserClient } from '@supabase/ssr';

/**
 * createClient
 *
 * Factory function for creating a Supabase client in Browser/Client Components.
 * Uses @supabase/ssr for automatic cookie handling and session management.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Legacy singleton export for backward compatibility
// Note: Prefer using createClient() inside components to ensure correct session state.
export const supabase = createClient();
