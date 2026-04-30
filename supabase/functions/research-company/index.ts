import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const EXA_API_KEY = Deno.env.get('EXA_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const { query, company_name, user_id } = await req.json()

    let resultData;
    let isMock = false;

    if (!EXA_API_KEY) {
      console.warn('EXA_API_KEY not found. Returning mock research data.')
      resultData = {
        company: company_name || "Unknown Co",
        description: "Mock: A high-growth technology company specializing in AI-driven sales automation.",
        industry: "Software / AI",
        employee_count: "50-200",
        tech_stack: ["Next.js", "Supabase", "OpenAI"],
        recent_news: "Recently closed Series A funding.",
        website: "https://example.com"
      }
      isMock = true;
    } else {
      // Real Exa Search
      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': EXA_API_KEY,
        },
        body: JSON.stringify({
          query: query || `Research company: ${company_name}`,
          useAutoprompt: true,
          numResults: 3,
          contents: {
            text: true,
            highlights: true
          }
        }),
      })

      resultData = await response.json()
    }

    // Log to Audit Trail
    await supabase.from('agent_audit_trail').insert({
      user_id: user_id,
      agent_name: 'Market Researcher Agent',
      action: 'company_research',
      details: {
        company: company_name,
        query: query,
        is_mock: isMock,
        research_summary: isMock ? resultData.description : "Exa search completed."
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: resultData,
        is_mock: isMock
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})
