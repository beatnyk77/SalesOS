import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'
import { checkBudget, reportUsage } from '../_shared/cost-guard.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ICPCriterion {
  id: string
  name: string
  description?: string
  metadata?: Record<string, unknown>
}

interface ScoreResult {
  score: number
  status: 'qualified' | 'rejected'
  reasoning: string
}

async function scoreLLM(
  leadData: unknown,
  icpCriteria: ICPCriterion[]
): Promise<ScoreResult> {
  const icpText =
    icpCriteria.length > 0
      ? icpCriteria
          .map((c) => `- ${c.name}: ${c.description ?? ''} ${JSON.stringify(c.metadata ?? {})}`)
          .join('\n')
      : 'No specific ICP criteria defined — use general B2B SaaS signals: funded, 10-500 employees, tech-savvy.'

  const systemPrompt = `You are an expert B2B sales analyst scoring inbound leads against an Ideal Customer Profile (ICP).
Analyse the lead research data and score the lead from 0 to 100.
A score >= 70 means "qualified". Below 70 means "rejected".
Return ONLY valid JSON with no markdown, no extra text: {"score": <number>, "status": "qualified"|"rejected", "reasoning": "<2-3 sentences explaining why>"}`

  const userPrompt = `ICP Criteria:\n${icpText}\n\nLead Research Data:\n${JSON.stringify(leadData, null, 2).substring(0, 3000)}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 300,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${err}`)
  }

  const completion = await response.json()
  const tokensUsed: number = completion.usage?.total_tokens ?? 400
  const raw = completion.choices?.[0]?.message?.content ?? '{}'

  const parsed = JSON.parse(raw) as { score?: number; status?: string; reasoning?: string }

  return {
    score: Math.min(100, Math.max(0, parsed.score ?? 50)),
    status: parsed.status === 'qualified' ? 'qualified' : 'rejected',
    reasoning: parsed.reasoning ?? 'No reasoning provided.',
    // Return token count so caller can report usage
    ...(({ tokensUsed }) => ({ _tokensUsed: tokensUsed }))({ tokensUsed }),
  } as ScoreResult & { _tokensUsed: number }
}

function scoreHeuristic(leadData: unknown): ScoreResult {
  const leadText = JSON.stringify(leadData).toLowerCase()

  let score = 50
  if (leadText.includes('software') || leadText.includes('ai') || leadText.includes('saas')) score += 20
  if (leadText.includes('series a') || leadText.includes('series b') || leadText.includes('funded')) score += 15
  if (leadText.includes('b2b') || leadText.includes('enterprise')) score += 10
  if (leadText.includes('50') || leadText.includes('100') || leadText.includes('200')) score += 5

  score = Math.min(100, score)
  const status = score >= 70 ? 'qualified' : 'rejected'

  let reasoning: string
  if (score >= 80) reasoning = 'Strong alignment with typical ICP signals: tech/AI industry, funded, B2B focus.'
  else if (score >= 70) reasoning = 'Moderate alignment with ICP. Some positive signals present.'
  else reasoning = 'Limited ICP alignment based on available research data.'

  return { score, status, reasoning }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const { lead_data, icp_criteria, user_id } = await req.json() as {
      lead_data: unknown
      icp_criteria?: ICPCriterion[]
      user_id: string
    }

    if (!lead_data || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'lead_data and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: ScoreResult
    let usedLLM = false

    if (OPENAI_API_KEY) {
      // Check budget before incurring LLM cost
      const withinBudget = await checkBudget(supabase, user_id)
      if (!withinBudget) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token budget exceeded. Upgrade your plan.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      try {
        const llmResult = await scoreLLM(lead_data, icp_criteria ?? []) as ScoreResult & { _tokensUsed?: number }
        const tokensUsed = llmResult._tokensUsed ?? 400
        delete (llmResult as { _tokensUsed?: number })._tokensUsed

        result = llmResult
        usedLLM = true

        // Report token usage asynchronously (don't block response)
        reportUsage(supabase, user_id, tokensUsed).catch((e) =>
          console.error('[score-lead] Failed to report usage:', e)
        )
      } catch (llmErr) {
        console.warn('[score-lead] LLM call failed, falling back to heuristic:', llmErr)
        result = scoreHeuristic(lead_data)
      }
    } else {
      console.warn('[score-lead] OPENAI_API_KEY not set — using heuristic scorer.')
      result = scoreHeuristic(lead_data)
    }

    await supabase.from('agent_audit_trail').insert({
      user_id,
      agent_name: 'Lead Scoring Agent',
      action: 'icp_scoring',
      details: {
        score: result.score,
        status: result.status,
        reasoning: result.reasoning,
        used_llm: usedLLM,
        icp_criteria_count: (icp_criteria ?? []).length,
      },
    })

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[score-lead] Error:', errMsg)
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
