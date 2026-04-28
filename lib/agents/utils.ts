import { getSupabaseServer } from '@/lib/supabase/server';

export interface AuditLogEntry {
  userId: string;
  agentName: string;
  action: string;
  details?: Record<string, unknown>;
}

/**
 * Securely logs an action to the agent_audit_trail.
 * Uses the server-side client to act as an immutable ledger.
 * Exposes ONLY an insert operation to enforce least-privilege at the application level.
 */
export async function logToAuditTrail({
  userId,
  agentName,
  action,
  details = {},
}: AuditLogEntry) {
  const supabase = getSupabaseServer();

  const { error } = await supabase.from('agent_audit_trail').insert({
    user_id: userId,
    agent_name: agentName,
    action: action,
    details: details,
  });

  if (error) {
    console.error('Failed to log to agent_audit_trail:', error);
    throw new Error(`Audit log failed: ${error.message}`);
  }
}
