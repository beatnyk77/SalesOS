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
import { createClient } from '@/lib/supabase/server';
import DashboardClient from './DashboardClient';

// Revalidate paths when this server component re-renders due to realtime events
export const dynamic = 'force-dynamic';

async function getInitialActions(userId: string) {
  const supabase = await createClient();

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

async function getDashboardStats(userId: string) {
  const supabase = await createClient();

  // Fetch total leads count
  const { data: totalLeadsData, error: totalLeadsError } = await supabase
    .from('leads')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  const totalLeads = totalLeadsError ? 0 : (totalLeadsData?.length || 0);

  // Fetch active campaigns count (leads that are not rejected)
  const { data: activeCampaignsData, error: activeCampaignsError } = await supabase
    .from('leads')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .neq('status', 'rejected');

  const activeCampaigns = activeCampaignsError ? 0 : (activeCampaignsData?.length || 0);

  // Fetch pending approvals count (pending leads + pending email drafts)
  const { data: pendingLeadsData, error: pendingLeadsError } = await supabase
    .from('leads')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', 'pending');

  const { data: pendingEmailsData, error: pendingEmailsError } = await supabase
    .from('cold_emails')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('status', 'pending_approval');

  const pendingLeads = pendingLeadsError ? 0 : (pendingLeadsData?.length || 0);
  const pendingEmails = pendingEmailsError ? 0 : (pendingEmailsData?.length || 0);
  const pendingApprovals = pendingLeads + pendingEmails;

  // Fetch weekly actions count (from last 7 days)
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: weeklyActionsData, error: weeklyActionsError } = await supabase
    .from('agent_audit_trail')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .gte('timestamp', oneWeekAgo);

  const weeklyActions = weeklyActionsError ? 0 : (weeklyActionsData?.length || 0);

  return {
    totalLeads,
    activeCampaigns,
    pendingApprovals,
    weeklyActions
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '';

  const [initialActions, stats] = await Promise.all([
    getInitialActions(userId),
    getDashboardStats(userId)
  ]);

  return (
    <Suspense fallback={<div>Loading…</div>}>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        {/* Subscribe to realtime changes so the UI updates when audit trail mutates */}
        <DashboardClient
          initialActions={initialActions}
          stats={stats}
          velocity={[]}
        />
      </div>
    </Suspense>
  );
}
