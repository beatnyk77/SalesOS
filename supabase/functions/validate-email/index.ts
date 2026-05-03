import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidationResult {
  score: number
  isDisposable: boolean
  status: string
}

async function validateWithHunter(email: string, apiKey: string): Promise<ValidationResult> {
  const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Hunter API error ${response.status}: ${await response.text()}`)
  }

  const json = await response.json()
  const data = json?.data ?? {}

  // Hunter score is 0–100 directly (higher = more deliverable)
  const score: number = typeof data.score === 'number' ? data.score : 50
  const isDisposable: boolean = data.disposable === true
  const status: string = data.result ?? 'unknown'

  return { score, isDisposable, status }
}

function validateMock(email: string): ValidationResult {
  // Pattern-based mock for dev/staging when no Hunter key is present
  if (email.includes('disposable') || email.includes('guerrilla') || email.includes('mailinator')) {
    return { score: 20, isDisposable: true, status: 'risky' }
  }
  if (email.includes('invalid') || email.endsWith('.invalid')) {
    return { score: 5, isDisposable: false, status: 'undeliverable' }
  }
  if (email.includes('ghost') || email.includes('noreply')) {
    return { score: 40, isDisposable: false, status: 'risky' }
  }
  return { score: 85, isDisposable: false, status: 'deliverable' }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, user_id } = await req.json()

    if (!email || !user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'email and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const HUNTER_API_KEY = Deno.env.get('HUNTER_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    let validation: ValidationResult
    let usedHunter = false

    if (HUNTER_API_KEY) {
      try {
        validation = await validateWithHunter(email, HUNTER_API_KEY)
        usedHunter = true
      } catch (hunterErr) {
        console.warn('[validate-email] Hunter API call failed, using mock:', hunterErr)
        validation = validateMock(email)
      }
    } else {
      console.warn('[validate-email] HUNTER_API_KEY not set — using mock validator.')
      validation = validateMock(email)
    }

    const { score, isDisposable, status } = validation
    const isRejected = score < 70 || isDisposable || status === 'undeliverable'
    const outcome = isRejected ? 'REJECTED' : 'VALIDATED'

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    await supabase.from('agent_audit_trail').insert({
      user_id,
      agent_name: 'Inbound Lead Qualifier',
      action: 'email_validation',
      details: {
        email,
        score,
        is_disposable: isDisposable,
        hunter_status: status,
        outcome,
        used_hunter: usedHunter,
        reasoning: isRejected
          ? `Lead rejected: validation score ${score}/100, disposable=${isDisposable}, status=${status}.`
          : `Email validated: score ${score}/100, status=${status}.`,
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        score,
        outcome,
        is_disposable: isDisposable,
        hunter_status: status,
        used_hunter: usedHunter,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[validate-email] Error:', errMsg)
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
