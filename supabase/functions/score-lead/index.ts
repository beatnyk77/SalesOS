import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lead_data, icp_criteria, user_id } = await req.json()

    // Mock Scoring Logic (in Phase 1, we simulate the LLM's decision)
    // In production, this would call OpenAI/Gemini with the lead_data and icp_criteria
    
    const leadText = JSON.stringify(lead_data).toLowerCase()
    const icpText = JSON.stringify(icp_criteria).toLowerCase()
    
    let score = 50 // Base score
    let reasoning = "Lead has some alignment with ICP."
    
    // Simple heuristic for mock
    if (leadText.includes('software') || leadText.includes('ai')) score += 20
    if (leadText.includes('series a') || leadText.includes('funded')) score += 15
    if (lead_data.employee_count === '50-200') score += 10
    
    if (score > 80) {
      reasoning = "Excellent alignment. Target industry and company stage match perfectly."
    } else if (score < 40) {
      reasoning = "Low alignment. Industry or company size outside of core target."
    }

    return new Response(
      JSON.stringify({
        success: true,
        score: Math.min(100, score),
        reasoning,
        status: score > 70 ? 'qualified' : 'rejected'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
