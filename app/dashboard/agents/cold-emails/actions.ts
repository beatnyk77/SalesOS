'use server';

/**
 * app/dashboard/agents/cold-emails/actions.ts
 *
 * Task 14: Server Actions for the Cold Email Approval carousel.
 *
 * Actions:
 *  - approveColdEmailAction  → sets status to 'approved', logs to audit trail
 *  - rejectColdEmailAction   → sets status to 'rejected', logs to audit trail
 *  - sendColdEmailAction     → sends email (stub), requires 'approved' status
 */

import { revalidatePath } from 'next/cache';
import { approveColdEmail, rejectColdEmail, sendColdEmail } from '../../../../lib/agents/tools/gmail-send';

export type EmailAction = 'approved' | 'rejected' | 'sent';

// ─── Approve ─────────────────────────────────────────────────────────────────

export async function approveColdEmailAction(
  coldEmailId: string,
  userId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await approveColdEmail(coldEmailId, userId, note);
    revalidatePath('/dashboard/agents/cold-emails');
    return { success: true };
  } catch (err) {
    console.error('[cold-emails/actions] approveColdEmailAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ─── Reject ──────────────────────────────────────────────────────────────────

export async function rejectColdEmailAction(
  coldEmailId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await rejectColdEmail(coldEmailId, userId, reason);
    revalidatePath('/dashboard/agents/cold-emails');
    return { success: true };
  } catch (err) {
    console.error('[cold-emails/actions] rejectColdEmailAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ─── Send (Stub) ─────────────────────────────────────────────────────────────

export async function sendColdEmailAction(
  coldEmailId: string,
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // dryRun=false → will attempt send, but approval gate still applies
    const result = await sendColdEmail({ coldEmailId, userId, dryRun: false });
    revalidatePath('/dashboard/agents/cold-emails');
    return { success: result.sent, message: result.message };
  } catch (err) {
    console.error('[cold-emails/actions] sendColdEmailAction error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
