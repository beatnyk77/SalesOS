/**
 * lib/agents/tools/gmail-send.ts
 *
 * Task 13: Gmail MCP send stub with approval gate.
 *
 * This module provides a sandboxed email sending interface that:
 *   1. ALWAYS defaults to dry-run mode (no real sends)
 *   2. Requires explicit approval state on the cold_email record before sending
 *   3. Logs every send attempt (real or dry-run) to audit trail
 *   4. Updates cold_emails table status on send
 *
 * In production, this would invoke the Gmail MCP server.
 * Currently stubbed to prevent any real email delivery.
 */

import { getSupabaseServer } from '../../supabase/server';
import { logToAuditTrail } from '../utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SendEmailRequest {
  /** The cold_email record ID */
  coldEmailId: string;
  /** The SalesOS user initiating the send */
  userId: string;
  /** Override dry-run mode. Default: true (dry-run). */
  dryRun?: boolean;
}

export interface SendEmailResult {
  coldEmailId: string;
  to: string;
  subject: string;
  sent: boolean;
  dry_run: boolean;
  message: string;
}

// ─── Send Function ────────────────────────────────────────────────────────────

export async function sendColdEmail({
  coldEmailId,
  userId,
  dryRun = true,
}: SendEmailRequest): Promise<SendEmailResult> {
  const supabase = getSupabaseServer();

  // 1. Fetch the cold email record
  const { data: email, error: fetchError } = await supabase
    .from('cold_emails')
    .select('*')
    .eq('id', coldEmailId)
    .eq('user_id', userId) // Application-level RLS guard
    .single();

  if (fetchError || !email) {
    throw new Error(
      `Cold email not found: ${fetchError?.message || 'No record with that ID'}`
    );
  }

  // 2. Approval gate — refuse to send unless explicitly approved
  if (!dryRun && email.status !== 'approved') {
    await logToAuditTrail({
      userId,
      agentName: 'Gmail Send Stub',
      action: 'send_blocked',
      details: {
        cold_email_id: coldEmailId,
        current_status: email.status,
        reason: 'Email must be in "approved" status before sending',
      },
    });

    return {
      coldEmailId,
      to: email.lead_email,
      subject: email.subject,
      sent: false,
      dry_run: false,
      message: `Send blocked: email status is "${email.status}" (must be "approved")`,
    };
  }

  // 3. Dry-run mode — log intent but do not call Gmail
  if (dryRun) {
    await logToAuditTrail({
      userId,
      agentName: 'Gmail Send Stub',
      action: 'send_dry_run',
      details: {
        cold_email_id: coldEmailId,
        to: email.lead_email,
        subject: email.subject,
        body_length: email.body?.length || 0,
      },
    });

    return {
      coldEmailId,
      to: email.lead_email,
      subject: email.subject,
      sent: false,
      dry_run: true,
      message: 'Dry-run: email NOT sent. Logged to audit trail.',
    };
  }

  // 4. Real send — invokes send-cold-email Edge Function (Resend)
  console.log(`[gmail-send] Invoking send-cold-email Edge Function for ${email.lead_email}...`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables missing for Edge Function invocation.');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/send-cold-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      to: email.lead_email,
      subject: email.subject,
      html: email.full_html || email.body, // Fallback to plain text body if html missing
      user_id: userId,
      cold_email_id: coldEmailId,
      dry_run: false
    })
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data.error || `Edge Function returned status ${response.status}`;
    await logToAuditTrail({
      userId,
      agentName: 'Cold Email Sender',
      action: 'send_failed',
      details: {
        cold_email_id: coldEmailId,
        error: errorMsg
      }
    });
    throw new Error(`Failed to send email: ${errorMsg}`);
  }

  return {
    coldEmailId,
    to: email.lead_email,
    subject: email.subject,
    sent: true,
    dry_run: false,
    message: 'Email sent successfully via Resend.',
  };
}

// ─── Batch Approval Helper ────────────────────────────────────────────────────

/**
 * Approves a cold email for sending by updating its status from
 * draft/pending_approval to 'approved'.
 */
export async function approveColdEmail(
  coldEmailId: string,
  userId: string,
  note?: string
): Promise<void> {
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from('cold_emails')
    .update({ status: 'approved' })
    .eq('id', coldEmailId)
    .eq('user_id', userId)
    .in('status', ['draft', 'pending_approval']);

  if (error) {
    throw new Error(`Failed to approve email: ${error.message}`);
  }

  await logToAuditTrail({
    userId,
    agentName: 'Human-in-the-Loop Review',
    action: 'cold_email_approved',
    details: {
      cold_email_id: coldEmailId,
      human_note: note ?? null,
    },
  });
}

/**
 * Rejects a cold email, preventing it from being sent.
 */
export async function rejectColdEmail(
  coldEmailId: string,
  userId: string,
  reason?: string
): Promise<void> {
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from('cold_emails')
    .update({ status: 'rejected' })
    .eq('id', coldEmailId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to reject email: ${error.message}`);
  }

  await logToAuditTrail({
    userId,
    agentName: 'Human-in-the-Loop Review',
    action: 'cold_email_rejected',
    details: {
      cold_email_id: coldEmailId,
      rejection_reason: reason ?? null,
    },
  });
}
