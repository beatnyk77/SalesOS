/**
 * pipeline-monitor/index.ts
 *
 * Task 20: Pipeline Health Monitor cron Edge Function (starter).
 *
 * Scans the database for stalled leads and pending approvals.
 * Flags risks and logs them to the agent_audit_trail.
 * Designed to be triggered by pg_cron or an external scheduler.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    console.log('[PipelineMonitor] Starting daily health scan...')

    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString()

    // 1. Scan for stalled leads (pending for > 3 days)
    const { data: stalledLeads, error: leadError } = await supabase
      .from('leads')
      .select('id, user_id, email, company_name, updated_at')
      .eq('status', 'pending')
      .lt('updated_at', threeDaysAgo)

    if (leadError) throw leadError

    // 2. Scan for stalled cold emails (pending_approval for > 3 days)
    const { data: stalledEmails, error: emailError } = await supabase
      .from('cold_emails')
      .select('id, user_id, lead_email, updated_at')
      .eq('status', 'pending_approval')
      .lt('updated_at', threeDaysAgo)

    if (emailError) throw emailError

    // 3. Log findings to audit trail
    const findings = [
      ...(stalledLeads || []).map(l => ({ type: 'stalled_lead', id: l.id, user_id: l.user_id, identifier: l.email })),
      ...(stalledEmails || []).map(e => ({ type: 'stalled_email', id: e.id, user_id: e.user_id, identifier: e.lead_email }))
    ]

    for (const finding of findings) {
      await supabase.from('agent_audit_trail').insert({
        user_id: finding.user_id,
        agent_name: 'pipeline_monitor',
        action: 'risk_detected',
        details: {
          risk_type: finding.type,
          resource_id: finding.id,
          identifier: finding.identifier,
          reason: 'Stalled in pending state for > 3 days'
        }
      })
    }

    console.log(`[PipelineMonitor] Scan complete. Flagged ${findings.length} risks.`)

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          stalled_leads: stalledLeads?.length || 0,
          stalled_emails: stalledEmails?.length || 0,
          total_risks: findings.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[PipelineMonitor] Fatal error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
