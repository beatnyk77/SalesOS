/**
 * trigger-lead-qualifier/index.ts
 *
 * Task 8: Webhook Entrypoint for the Lead Qualification Pipeline
 *
 * Accepts a Typeform-style inbound payload and chains:
 *   1. validate-email      → ghost-lead scoring
 *   2. research-company    → Exa-powered company research
 *   3. score-lead          → ICP matching & final score
 *
 * Security:
 *  - Validates a shared WEBHOOK_SECRET to prevent unauthorized invocations.
 *  - All external calls (Exa, Hunter) are sandboxed inside sub-functions.
 *  - Uses service role only inside Edge Functions (never exposed to frontend).
 *  - Every pipeline step is logged to agent_audit_trail.
 *  - Idempotent: duplicate submissions with the same request_id are no-ops.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookPayload {
  /** Unique ID for this submission — used for idempotency */
  request_id?: string
  /** The lead's email address (required) */
  email: string
  /** Optional enrichment fields from the form */
  first_name?: string
  last_name?: string
  company_name?: string
  job_title?: string
  linkedin_url?: string
  /** The SalesOS user who owns this lead pipeline */
  user_id: string
}

interface PipelineResult {
  request_id: string
  email: string
  validation: {
    score: number
    outcome: 'VALIDATED' | 'REJECTED'
    is_disposable: boolean
    hunter_status: string
  }
  linkedin_validation?: {
    score: number
    outcome: 'VALIDATED' | 'REJECTED'
    is_active: boolean
    profile_quality: number
  }
  qualification?: {
    status: 'qualified' | 'rejected' | 'pending'
    score: number
    reasoning: string
  }
  overall_status: 'qualified' | 'rejected' | 'skipped' | 'error'
  message: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateRequestId(): string {
  return crypto.randomUUID()
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // ── 1. Authenticate Webhook ────────────────────────────────────────────
    // If a WEBHOOK_SECRET is configured, enforce it via header
    if (WEBHOOK_SECRET) {
      const incomingSecret = req.headers.get('x-webhook-secret')
      if (incomingSecret !== WEBHOOK_SECRET) {
        await logAudit(supabase, {
          userId: 'system',
          agentName: 'trigger-lead-qualifier',
          action: 'webhook_rejected',
          details: { reason: 'Invalid or missing webhook secret', ip: req.headers.get('x-forwarded-for') }
        })
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── 2. Parse & Validate Payload ────────────────────────────────────────
    const body: WebhookPayload = await req.json()

    if (!body.email || !body.user_id) {
      return new Response(
        JSON.stringify({ error: 'email and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Basic email format guard
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestId = body.request_id || generateRequestId()

    // ── 3. Idempotency Check ───────────────────────────────────────────────
    // Prevent duplicate processing if webhook is replayed
    if (body.request_id) {
      const { data: existing } = await supabase
        .from('agent_audit_trail')
        .select('id')
        .eq('user_id', body.user_id)
        .eq('action', 'pipeline_started')
        .eq('details->>request_id', body.request_id)
        .maybeSingle()

      if (existing) {
        return new Response(
          JSON.stringify({
            request_id: requestId,
            overall_status: 'skipped',
            message: 'Duplicate request_id — already processed.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── 4. Log Pipeline Start ──────────────────────────────────────────────
    await logAudit(supabase, {
      userId: body.user_id,
      agentName: 'trigger-lead-qualifier',
      action: 'pipeline_started',
      details: {
        request_id: requestId,
        email: body.email,
        company_name: body.company_name,
      }
    })

    // ── 5. Stage 1 — Email Validation ──────────────────────────────────────
    const { data: validationData, error: validationError } = await supabase.functions.invoke(
      'validate-email',
      { body: { email: body.email, user_id: body.user_id } }
    )

    if (validationError || !validationData?.success) {
      const errMsg = validationError?.message || validationData?.error || 'Validation stage failed'
      await logAudit(supabase, {
        userId: body.user_id,
        agentName: 'trigger-lead-qualifier',
        action: 'pipeline_error',
        details: { request_id: requestId, stage: 'validate-email', error: errMsg }
      })
      return errorResponse(corsHeaders, requestId, body.email, errMsg)
    }

    const validation = {
      score: validationData.score,
      outcome: validationData.outcome as 'VALIDATED' | 'REJECTED',
      is_disposable: validationData.is_disposable,
      hunter_status: validationData.hunter_status,
    }

    // ── 6. Ghost-Lead Gate (Email) ─────────────────────────────────────────
    // Do NOT proceed to expensive Exa research if lead is rejected
    if (validation.outcome === 'REJECTED') {
      await logAudit(supabase, {
        userId: body.user_id,
        agentName: 'trigger-lead-qualifier',
        action: 'pipeline_completed',
        details: {
          request_id: requestId,
          email: body.email,
          overall_status: 'rejected',
          reason: 'Ghost-lead gate: email validation failed',
          validation_score: validation.score
        }
      })

      const result: PipelineResult = {
        request_id: requestId,
        email: body.email,
        validation,
        overall_status: 'rejected',
        message: `Lead rejected at validation stage. Score: ${validation.score}/100.`
      }
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── 7. Stage 2 — LinkedIn Validation Gate (New) ───────────────────────
    // Check LinkedIn profile before doing expensive Exa company research
    if (body.linkedin_url) {
      const { data: linkedinData, error: linkedinError } = await supabase.functions.invoke(
        'validate-linkedin',
        { body: { linkedin_url: body.linkedin_url, user_id: body.user_id } }
      )

      if (linkedinError || !linkedinData?.success) {
        const errMsg = linkedinError?.message || 'LinkedIn validation stage failed'
        await logAudit(supabase, {
          userId: body.user_id,
          agentName: 'trigger-lead-qualifier',
          action: 'pipeline_error',
          details: { request_id: requestId, stage: 'validate-linkedin', error: errMsg }
        })
        // Continue with pipeline but note the LinkedIn validation issue
        // We don't reject based on LinkedIn alone as it might be optional
      } else {
        const linkedinValidation = {
          score: linkedinData.score,
          outcome: linkedinData.outcome,
          is_active: linkedinData.is_active,
          profile_quality: linkedinData.profile_quality
        }

        // LinkedIn Ghost-Lead Gate: Don't do expensive research if LinkedIn is inactive/poor quality
        if (linkedinData.outcome === 'REJECTED') {
          await logAudit(supabase, {
            userId: body.user_id,
            agentName: 'trigger-lead-qualifier',
            action: 'pipeline_completed',
            details: {
              request_id: requestId,
              email: body.email,
              linkedin_url: body.linkedin_url,
              overall_status: 'rejected',
              reason: 'Ghost-lead gate: LinkedIn validation failed (inactive/low quality profile)',
              validation_score: validation.score,
              linkedin_score: linkedinData.score
            }
          })

          const result: PipelineResult = {
            request_id: requestId,
            email: body.email,
            validation,
            linkedin_validation: linkedinValidation,
            overall_status: 'rejected',
            message: `Lead rejected at LinkedIn validation stage. Profile score: ${linkedinData.score}/100.`
          }
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
    }
    // If no LinkedIn URL provided, we continue with the pipeline (optional field)

    // ── 7. Stage 2 — Company Research (Exa) ───────────────────────────────
    const { data: researchData, error: researchError } = await supabase.functions.invoke(
      'research-company',
      {
        body: {
          company_name: body.company_name || body.email.split('@')[1],
          user_id: body.user_id
        }
      }
    )

    if (researchError || !researchData?.success) {
      const errMsg = researchError?.message || 'Research stage failed'
      await logAudit(supabase, {
        userId: body.user_id,
        agentName: 'trigger-lead-qualifier',
        action: 'pipeline_error',
        details: { request_id: requestId, stage: 'research-company', error: errMsg }
      })
      return errorResponse(corsHeaders, requestId, body.email, errMsg)
    }

    // ── 8. Stage 3 — ICP Scoring ───────────────────────────────────────────
    // Fetch ICP criteria for this user from Supabase
    const { data: icpCriteria } = await supabase
      .from('icp_criteria')
      .select('id, name, description, metadata')
      .eq('user_id', body.user_id)
      .limit(3)

    const { data: scoreData, error: scoreError } = await supabase.functions.invoke(
      'score-lead',
      {
        body: {
          lead_data: researchData.data,
          icp_criteria: icpCriteria || [],
          user_id: body.user_id
        }
      }
    )

    if (scoreError || !scoreData?.success) {
      const errMsg = scoreError?.message || 'Scoring stage failed'
      await logAudit(supabase, {
        userId: body.user_id,
        agentName: 'trigger-lead-qualifier',
        action: 'pipeline_error',
        details: { request_id: requestId, stage: 'score-lead', error: errMsg }
      })
      return errorResponse(corsHeaders, requestId, body.email, errMsg)
    }

    // ── 9. Persist Lead to Database ────────────────────────────────────────
    await supabase.from('leads').upsert({
      user_id: body.user_id,
      email: body.email,
      first_name: body.first_name,
      last_name: body.last_name,
      company_name: body.company_name || researchData.data?.company,
      job_title: body.job_title,
      linkedin_url: body.linkedin_url,
      status: scoreData.status,
      score: scoreData.score,
      summary: scoreData.reasoning,
      research_payload: researchData.data,
      icp_matching_notes: icpCriteria?.length
        ? `Matched against ${icpCriteria.length} ICP criteria.`
        : 'No ICP criteria on file; used heuristic scoring.',
      metadata: { request_id: requestId, validation_score: validation.score }
    }, { onConflict: 'user_id,email' })

    // ── 10. Log Pipeline Completion ────────────────────────────────────────
    await logAudit(supabase, {
      userId: body.user_id,
      agentName: 'trigger-lead-qualifier',
      action: 'pipeline_completed',
      details: {
        request_id: requestId,
        email: body.email,
        overall_status: scoreData.status,
        validation_score: validation.score,
        qualification_score: scoreData.score,
        reasoning: scoreData.reasoning
      }
    })

    // ── 11. Return Structured Result ───────────────────────────────────────
    const result: PipelineResult = {
      request_id: requestId,
      email: body.email,
      validation,
      qualification: {
        status: scoreData.status,
        score: scoreData.score,
        reasoning: scoreData.reasoning,
      },
      overall_status: scoreData.status,
      message: `Pipeline complete. Lead ${scoreData.status} with score ${scoreData.score}/100.`
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[trigger-lead-qualifier] Unhandled error:', errorMessage)
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Utility Functions ────────────────────────────────────────────────────────

async function logAudit(
  supabase: ReturnType<typeof createClient>,
  entry: { userId: string; agentName: string; action: string; details?: Record<string, unknown> }
) {
  const { error } = await supabase.from('agent_audit_trail').insert({
    user_id: entry.userId,
    agent_name: entry.agentName,
    action: entry.action,
    details: entry.details ?? {},
  })
  if (error) {
    console.error('[trigger-lead-qualifier] Audit log failed:', error.message)
  }
}

function errorResponse(
  cors: Record<string, string>,
  requestId: string,
  email: string,
  detail: string
): Response {
  const result: Partial<PipelineResult> = {
    request_id: requestId,
    email,
    overall_status: 'error',
    message: detail,
  }
  return new Response(JSON.stringify(result), {
    status: 500,
    headers: { ...cors, 'Content-Type': 'application/json' }
  })
}
