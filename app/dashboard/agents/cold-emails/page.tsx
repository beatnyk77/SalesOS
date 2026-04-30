/**
 * app/dashboard/agents/cold-emails/page.tsx
 *
 * Task 14: Cold Email Approval Dashboard — Server Component.
 *
 * Fetches all cold_emails for the authenticated user (service-role),
 * grouped by status. Passes to ColdEmailsClient carousel.
 */

import { createClient } from '../../../../lib/supabase/server';
import { ColdEmailsClient, type ColdEmail } from './ColdEmailsClient';
import { CsvUploadWidget } from './CsvUploadWidget';

// ─── Page Metadata ────────────────────────────────────────────────────────────

export const metadata = {
  title: 'Cold Emails | SalesOS',
  description: 'Review and approve AI-drafted outreach emails before sending.',
};

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function ColdEmailsPage() {
  const supabase = await createClient();

  // For demo purposes, we fetch for all users (or can scope by auth session)
  // In production, retrieve userId from the session cookie
  const { data: emails, error } = await supabase
    .from('cold_emails')
    .select(
      'id, user_id, lead_email, lead_name, company_name, subject, body, personalization_notes, status, created_at, sent_at'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[cold-emails/page] Failed to fetch emails:', error.message);
  }

  const safeEmails = (emails ?? []) as ColdEmail[];

  // Derive a userId for client-side actions
  // In production this comes from session; for now use the first email's user_id or a fallback
  const userId = safeEmails[0]?.user_id ?? 'demo-user';

  const pendingCount = safeEmails.filter(
    (e) => e.status === 'pending_approval' || e.status === 'draft'
  ).length;

  return (
    <main className="min-h-screen bg-[#0d0d14] text-white">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6">
        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-sm">
              ✉
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Cold Emails</h1>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-[#0d0d14] text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-sm text-white/40 leading-relaxed">
            Review AI-drafted outreach. Approve to queue for send; reject to remove from pipeline.
            All actions are logged to the audit trail.
          </p>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {[
              { color: 'bg-amber-400', label: 'Pending review' },
              { color: 'bg-emerald-400', label: 'Approved' },
              { color: 'bg-sky-400', label: 'Sent (stub)' },
              { color: 'bg-red-400', label: 'Rejected' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-[11px] text-white/40">{label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* HITL Notice */}
        <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-4 py-3 mb-6 flex items-start gap-3">
          <span className="text-amber-400 mt-0.5 shrink-0">⚡</span>
          <p className="text-xs text-amber-200/70 leading-relaxed">
            <strong className="text-amber-300">Human-in-the-loop required.</strong>{' '}
            No email is sent without your explicit approval. Gmail integration is currently stubbed —
            approving will log to the audit trail but not deliver real mail.
          </p>
        </div>

        {/* CSV Upload Section */}
        <details className="mb-8 group" id="csv-upload-section">
          <summary className="cursor-pointer flex items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-4 py-3 hover:bg-white/5 transition-all duration-200 list-none">
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-sm shrink-0">
              📄
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white/80">Upload CSV</p>
              <p className="text-[11px] text-white/35">Import leads to generate personalized drafts</p>
            </div>
            <svg
              className="w-4 h-4 text-white/30 group-open:rotate-180 transition-transform duration-200"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-4 pl-10">
            <CsvUploadWidget userId={userId} />
          </div>
        </details>

        {/* Error state */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-300 mb-6">
            Failed to load emails: {error.message}
          </div>
        )}

        {/* Approval Carousel */}
        <ColdEmailsClient initialEmails={safeEmails} userId={userId} />
      </div>
    </main>
  );
}
