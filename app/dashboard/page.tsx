/**
 * app/dashboard/page.tsx  (Server Component)
 *
 * Task 21: Human-in-the-Loop Lead Approval Dashboard
 *
 * - Fetches initial actions (pending leads, pending emails) server-side.
 * - Uses useRealtimeUpdates to refresh when agent_audit_trail mutates.
 * - Passes initialActions to DashboardClient, which calls Server Actions
 *   (approve/reject) when the user clicks a button.
 */

import { Suspense } from 'react';
import { getSupabaseServer } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

// Revalidate paths when this server component re-renders due to realtime events
export const dynamic = 'force-dynamic';

async function getInitialActions(userId: string) {
  const supabase = getSupabaseServer();

  // Fetch pending leads
  const { data: leadActions } = await supabase
    .from('leads')
    .select('id, company_name, email, summary, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(3);

  // Fetch pending email drafts (cold emails awaiting approval)
  const { data: emailActions } = await supabase
    .from('cold_emails')
    .select('id, lead_email, subject, body, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(3);

  const carouselActions = [
    ...(leadActions || []).map((l) => ({
      id: l.id,
      type: 'lead' as const,
      title: l.company_name || 'New Lead',
      subtitle: `Qualification needed for ${l.email}`,
      description: l.summary || 'Lead waiting for scoring and ICP matching review.',
      timestamp: l.created_at,
      href: `/dashboard/leads`,
    })),
    ...(emailActions || []).map((e) => ({
      id: e.id,
      type: 'email' as const,
      title: 'Email Draft Ready',
      subtitle: `To: ${e.lead_email}`,
      description: e.subject,
      timestamp: e.created_at,
      href: `/dashboard/agents/cold-emails`,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return carouselActions;
}

export default async function DashboardPage() {
  const supabase = getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '';

  const initialActions = await getInitialActions(userId);

  return (
    <Suspense fallback={<div>Loading…</div>}>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Subscribe to realtime changes so the UI updates when audit trail mutates */}
        <DashboardClient
          initialActions={initialActions}
          stats={{
            totalLeads: 0, // replace with actual counts or fetch server-side
            activeCampaigns: 0,
            pendingApprovals: initialActions.length,
            weeklyActions: 0,
          }}
          velocity={[]}
        />
      </div>
    </Suspense>
  );
}
