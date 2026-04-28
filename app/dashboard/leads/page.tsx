/**
 * app/dashboard/leads/page.tsx  (Server Component)
 *
 * Task 10: Human-in-the-Loop Lead Approval Dashboard
 *
 * Fetches the initial leads list server-side (respecting RLS via service role
 * with user filter), then hands off to LeadsClient for realtime interactivity.
 */
import { getSupabaseServer } from '../../../lib/supabase/server';
import { LeadsClient } from './LeadsClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lead Review · SalesOS',
  description: 'Review and approve AI-qualified inbound leads',
};

// Revalidate every 60s as a safety net (realtime handles live updates)
export const revalidate = 60;

export default async function LeadsPage() {
  const supabase = getSupabaseServer();

  // Get the current user session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Graceful fallback — auth middleware should have caught this first
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/50 text-sm">Please sign in to view leads.</p>
      </div>
    );
  }

  // Fetch leads for this user — RLS enforces row-level isolation
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select(
      'id, user_id, email, first_name, last_name, company_name, job_title, linkedin_url, status, score, summary, icp_matching_notes, research_payload, metadata, created_at, updated_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (leadsError) {
    console.error('[LeadsPage] Failed to fetch leads:', leadsError.message);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Page Header */}
      <header className="border-b border-white/8 bg-white/2 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight">
              Lead Review
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              AI-qualified leads awaiting your approval
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            All decisions logged to audit trail
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {leadsError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-300">Failed to load leads. Please refresh.</p>
            <p className="text-xs text-red-400/60 mt-1">{leadsError.message}</p>
          </div>
        ) : (
          <LeadsClient
            initialLeads={leads ?? []}
            userId={user.id}
          />
        )}
      </main>
    </div>
  );
}
