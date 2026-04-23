import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * createClient
 * 
 * Factory function for creating a Supabase client in Browser/Client Components.
 * Uses auth-helpers for automatic cookie handling and session management.
 */
export function createClient() {
  return createClientComponentClient();
}

// Legacy singleton export for backward compatibility
// Note: Prefer using createClient() inside components to ensure correct session state.
export const supabase = createClient();
