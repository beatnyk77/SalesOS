/**
 * parallel-research/index.ts
 *
 * Task 11: Batch research Edge Function with concurrency control.
 *
 * Accepts a batch of leads and runs Exa-powered company research
 * in parallel chunks of configurable batchSize (default 20).
 * Designed to process up to 50 leads in <2 min with rate-limit awareness.
 *
 * Security:
 *  - WEBHOOK_SECRET header required if configured.
 *  - Service role used only inside Edge Function scope.
 *  - All results cached to `leads.research_payload` to prevent duplicate calls.
 *  - Full audit trail logging per batch.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadInput {
  email: string
  company_name?: string
}

interface RequestBody {
  user_id: string
  leads: LeadInput[]
  /** Number of leads to process concurrently. Default 20, max 50. */
  batch_size?: number
  /** Delay in ms between batches to avoid rate limits. Default 200. */
  inter_batch_delay_ms?: number
}

interface ResearchResult {
  email: string
  company_name: string
  success: boolean
  cached: boolean
  data?: Record<string, any>
  error?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function logAudit(
  supabase: ReturnType<typeof createClient>,
  entry: {
    userId: string
    agentName: string
    action: string
    details?: Record<string, any>
  }
) {
  const { error } = await supabase.from('agent_audit_trail').insert({
    user_id: entry.userId,
    agent_name: entry.agentName,
    action: entry.action,
    details: entry.details ?? {},
  })
  if (error) {
    console.error('[parallel-research] Audit log failed:', error.message)
  }
}

/**
 * Researches a single lead by invoking the research-company Edge Function.
 * Returns cached data if the lead already has a research_payload.
 */
async function researchOne(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  lead: LeadInput
): Promise<ResearchResult> {
  const company = lead.company_name || lead.email.split('@')[1]

  try {
    // 1. Check cache — skip if research_payload is already populated
    const { data: existing } = await supabase
      .from('leads')
      .select('research_payload')
      .eq('user_id', userId)
      .eq('email', lead.email)
      .maybeSingle()

    if (
      existing?.research_payload &&
      typeof existing.research_payload === 'object' &&
      Object.keys(existing.research_payload).length > 0
    ) {
      return {
        email: lead.email,
        company_name: company,
        success: true,
        cached: true,
        data: existing.research_payload,
      }
    }

    // 2. Call research-company Edge Function (sandboxed Exa call)
    const { data: researchData, error: researchError } =
      await supabase.functions.invoke('research-company', {
        body: { company_name: company, user_id: userId },
      })

    if (researchError || !researchData?.success) {
      return {
        email: lead.email,
        company_name: company,
        success: false,
        cached: false,
        error: researchError?.message || 'Research function returned failure',
      }
    }

    // 3. Persist research data to lead record
    await supabase
      .from('leads')
      .upsert(
        {
          user_id: userId,
          email: lead.email,
          company_name: company,
          research_payload: researchData.data,
          status: 'pending', // Keep pending; scoring happens separately
        },
        { onConflict: 'user_id,email' }
      )

    return {
      email: lead.email,
      company_name: company,
      success: true,
      cached: false,
      data: researchData.data,
    }
  } catch (err: any) {
    return {
      email: lead.email,
      company_name: company,
      success: false,
      cached: false,
      error: err.message,
    }
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // ── 1. Authenticate ────────────────────────────────────────────────────
    if (WEBHOOK_SECRET) {
      const incoming = req.headers.get('x-webhook-secret')
      if (incoming !== WEBHOOK_SECRET) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // ── 2. Parse & Validate ────────────────────────────────────────────────
    const body: RequestBody = await req.json()

    if (!body.user_id || !Array.isArray(body.leads) || body.leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'user_id and non-empty leads[] are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Hard cap at 100 leads per invocation to prevent abuse
    const leads = body.leads.slice(0, 100)
    const batchSize = clamp(body.batch_size ?? 20, 1, 50)
    const interBatchDelay = clamp(body.inter_batch_delay_ms ?? 200, 0, 5000)

    const startTime = Date.now()

    await logAudit(supabase, {
      userId: body.user_id,
      agentName: 'parallel-research',
      action: 'batch_started',
      details: {
        total_leads: leads.length,
        batch_size: batchSize,
        inter_batch_delay_ms: interBatchDelay,
      },
    })

    // ── 3. Process in Batches ──────────────────────────────────────────────
    const allResults: ResearchResult[] = []

    for (let i = 0; i < leads.length; i += batchSize) {
      const chunk = leads.slice(i, i + batchSize)

      // Run chunk in parallel
      const chunkResults = await Promise.all(
        chunk.map((lead) => researchOne(supabase, body.user_id, lead))
      )
      allResults.push(...chunkResults)

      // Rate-limit delay between batches (skip after last batch)
      if (i + batchSize < leads.length && interBatchDelay > 0) {
        await delay(interBatchDelay)
      }
    }

    const elapsedMs = Date.now() - startTime
    const succeeded = allResults.filter((r) => r.success).length
    const cached = allResults.filter((r) => r.cached).length
    const failed = allResults.filter((r) => !r.success).length

    // ── 4. Log Completion ──────────────────────────────────────────────────
    await logAudit(supabase, {
      userId: body.user_id,
      agentName: 'parallel-research',
      action: 'batch_completed',
      details: {
        total: leads.length,
        succeeded,
        cached,
        failed,
        elapsed_ms: elapsedMs,
        batch_size: batchSize,
        failures: allResults
          .filter((r) => !r.success)
          .map((r) => ({ email: r.email, error: r.error })),
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        total: leads.length,
        succeeded,
        cached,
        failed,
        elapsed_ms: elapsedMs,
        results: allResults,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    console.error('[parallel-research] Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
