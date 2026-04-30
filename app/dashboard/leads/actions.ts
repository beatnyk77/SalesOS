/**
 * app/dashboard/leads/actions.ts  (Server Actions)
 *
 * Task 10: Human-in-the-Loop server actions for approving/rejecting leads.
 * Uses service role client for writes, then logs user_adjustment to audit trail.
 */
'use server';

import { createClient } from '../../../lib/supabase/server';
import { logToAuditTrail } from '../../../lib/agents/utils';
import { revalidatePath } from 'next/cache';

export type ApprovalAction = 'approved' | 'rejected';

export async function approveLead(
  leadId: string,
  userId: string,
  action: ApprovalAction,
  note?: string
): Promise<void> {
  const supabase = createClient();
  const newStatus = action === 'approved' ? 'qualified' : 'rejected';

  // Update lead status — eq('user_id', userId) acts as application-level RLS guard
  const { error: updateError } = await supabase
    .from('leads')
    .update({ status: newStatus })
    .eq('id', leadId)
    .eq('user_id', userId);

  if (updateError) {
    throw new Error(`Failed to update lead status: ${updateError.message}`);
  }

  // Log the human adjustment to the audit trail for full traceability
  await logToAuditTrail({
    userId,
    agentName: 'Human-in-the-Loop Review',
    action: 'user_adjustment',
    details: {
      lead_id: leadId,
      new_status: newStatus,
      human_note: note ?? null,
      action_type: action,
    },
  });

  revalidatePath('/dashboard/leads');
}
