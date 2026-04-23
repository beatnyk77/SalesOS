/**
 * app/dashboard/page.tsx
 *
 * Task 21: Dashboard home – Actions Pending Approval carousel.
 */

import { getSupabaseServer } from '../../lib/supabase/server';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = getSupabaseServer();
  
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '00000000-0000-0000-0000-000000000000';

  // 1. Fetch Stats
  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  const { count: pendingEmails } = await supabase
    .from('cold_emails')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending_approval');

  const { count: pendingLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending');

  const { count: activeCampaigns } = await supabase
    .from('prospect_lists')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['pending', 'processing']);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentLogs } = await supabase
    .from('agent_audit_trail')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo);

  // Calculate velocity per day for the last 7 days
  const weeklyVelocity = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
    const dateString = date.toISOString().split('T')[0];
    const count = (recentLogs || []).filter(log => 
      log.created_at.startsWith(dateString)
    ).length;
    return count;
  });

  const totalWeeklyActions = (recentLogs || []).length;

  // 2. Fetch Actions for Carousel
  // Get up to 3 pending leads and 3 pending emails
  const { data: leadActions } = await supabase
    .from('leads')
    .select('id, company_name, email, summary, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(3);

  const { data: emailActions } = await supabase
    .from('cold_emails')
    .select('id, lead_email, subject, body, created_at')
    .eq('user_id', userId)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
    .limit(3);

  // 3. Normalize Actions
  const carouselActions = [
    ...(leadActions || []).map(l => ({
      id: l.id,
      type: 'lead' as const,
      title: l.company_name || 'New Lead',
      subtitle: `Qualification needed for ${l.email}`,
      description: l.summary || 'Lead waiting for scoring and ICP matching review.',
      timestamp: l.created_at,
      href: '/dashboard/leads'
    })),
    ...(emailActions || []).map(e => ({
      id: e.id,
      type: 'email' as const,
      title: 'Email Draft Ready',
      subtitle: `To: ${e.lead_email}`,
      description: e.subject,
      timestamp: e.created_at,
      href: '/dashboard/agents/cold-emails'
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="p-8">
      <DashboardClient 
        initialActions={carouselActions}
        stats={{
          totalLeads: totalLeads || 0,
          activeCampaigns: activeCampaigns || 0,
          pendingApprovals: (pendingEmails || 0) + (pendingLeads || 0),
          weeklyActions: totalWeeklyActions
        }}
        velocity={weeklyVelocity}
      />
    </div>
  );
}
