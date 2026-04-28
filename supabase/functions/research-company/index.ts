import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const EXA_API_KEY = Deno.env.get('EXA_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, company_name, user_id } = await req.json()

    if (!EXA_API_KEY) {
      console.warn('EXA_API_KEY not found. Returning mock research data.')
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            company: company_name || "Unknown Co",
            description: "Mock: A high-growth technology company specializing in AI-driven sales automation.",
            industry: "Software / AI",
            employee_count: "50-200",
            tech_stack: ["Next.js", "Supabase", "OpenAI"],
            recent_news: "Recently closed Series A funding.",
            website: "https://example.com"
          },
          is_mock: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    const searchData = await response.json()

    return new Response(
      JSON.stringify({
        success: true,
        data: searchData,
        is_mock: false
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
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
