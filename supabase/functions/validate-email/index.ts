import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, user_id } = await req.json()

    if (!email || !user_id) {
      throw new Error("Email and user_id are required")
    }

    const HUNTER_API_KEY = Deno.env.get('HUNTER_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!HUNTER_API_KEY) {
      throw new Error("HUNTER_API_KEY not configured in Edge Function secrets")
    }

    // 1. Mock/Stub Hunter Email Verifier API logic (as requested for Task 6)
    // Realistic test scores: real email = 85, disposable = 25, invalid = 10
    let score = 85
    let isDisposable = false
    let status = 'deliverable'

    if (email.includes('disposable')) {
      score = 25
      isDisposable = true
      status = 'risky'
    } else if (email.includes('invalid')) {
      score = 10
      status = 'undeliverable'
    } else if (email.includes('ghost')) {
      score = 40
      status = 'risky'
    }

    const hunterData = {
      score,
      disposable: isDisposable,
      result: status,
      mock: true
    }

    // 2. Ghost-Lead Scoring Logic
    const isRejected = score < 70 || isDisposable || status === 'undeliverable'
    const outcome = isRejected ? 'REJECTED' : 'VALIDATED'

    // 3. Log to Audit Trail (Service Role for reliability)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
    
    await supabase.from('agent_audit_trail').insert({
      user_id: user_id,
      agent_name: 'Inbound Lead Qualifier',
      action: 'email_validation',
      details: {
        email,
        score,
        hunter_raw: hunterData,
        is_disposable: isDisposable,
        outcome: outcome,
        reasoning: isRejected 
          ? `Lead rejected due to low validation score (${score}/100) or suspicious domain.` 
          : `Lead email validated successfully with score ${score}/100.`
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        score, 
        outcome, 
        is_disposable: isDisposable,
        hunter_status: status 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
