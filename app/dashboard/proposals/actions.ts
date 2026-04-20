/**
 * app/dashboard/proposals/actions.ts
 */
'use server';

import { revalidatePath } from 'next/cache';
import { ProposalDrafterCrew, ProposalInput } from '../../../lib/agents/crews/proposal-drafter';
import { logToAuditTrail } from '../../../lib/agents/utils';

export async function draftProposalAction(input: ProposalInput) {
  try {
    const crew = new ProposalDrafterCrew();
    const result = await crew.run(input);

    if (result.success) {
      revalidatePath('/dashboard/proposals');
      return { success: true, draft: result.draft };
    } else {
      return { success: false, error: result.error };
    }
  } catch (err) {
    console.error('[proposals/actions] draftProposalAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function saveProposalAction(userId: string, proposalId: string, content: string) {
  try {
    // Save the edited proposal to the audit trail as the source of truth for now
    await logToAuditTrail({
      userId,
      agentName: 'proposal_drafter_crew',
      action: 'proposal_saved',
      details: {
        proposal_id: proposalId,
        final_content: content,
        saved_at: new Date().toISOString()
      }
    });

    revalidatePath('/dashboard/proposals');
    return { success: true };
  } catch (err) {
    console.error('[proposals/actions] saveProposalAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
