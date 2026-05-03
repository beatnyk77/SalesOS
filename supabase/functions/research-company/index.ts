import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

const EXA_API_KEY = Deno.env.get('EXA_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ExaResult {
  url?: string
  title?: string
  text?: string
  highlights?: string[]
  publishedDate?: string
}

interface CompanyProfile {
  company: string
  description: string
  website: string
  recent_news: string
  industry_signals: string
  raw_results: ExaResult[]
}

function extractProfile(companyName: string, results: ExaResult[]): CompanyProfile {
  const top = results[0] ?? {}
  const allText = results.map((r) => r.text ?? '').join(' ')
  const allHighlights = results.flatMap((r) => r.highlights ?? [])

  // Extract industry signals by scanning all result text for common keywords
  const industryKeywords = [
    'saas', 'software', 'ai', 'machine learning', 'fintech', 'healthcare', 'ecommerce',
    'b2b', 'enterprise', 'marketplace', 'platform', 'agency', 'consulting',
    'series a', 'series b', 'seed', 'funded', 'raised', 'employees', 'team',
  ]
  const foundSignals = industryKeywords.filter((kw) =>
    allText.toLowerCase().includes(kw)
  )

  return {
    company: companyName,
    description: (top.text ?? '').substring(0, 600),
    website: top.url ?? '',
    recent_news: allHighlights.slice(0, 3).join(' | ') || (top.text ?? '').substring(0, 200),
    industry_signals: foundSignals.join(', '),
    raw_results: results.slice(0, 5),
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  try {
    const { query, company_name, user_id } = await req.json()

    if (!company_name && !query) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_name or query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let profile: CompanyProfile
    let isMock = false

    if (!EXA_API_KEY) {
      console.warn('[research-company] EXA_API_KEY not set — returning mock profile.')
      isMock = true
      profile = {
        company: company_name ?? 'Unknown Co',
        description: 'A high-growth technology company specialising in AI-driven sales automation.',
        website: 'https://example.com',
        recent_news: 'Recently closed Series A funding. Expanding into EMEA market.',
        industry_signals: 'saas, ai, series a, b2b, enterprise, funded',
        raw_results: [],
      }
    } else {
      const searchQuery = query ?? `"${company_name}" company overview funding team industry`

      const exaResponse = await fetch('https://api.exa.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': EXA_API_KEY,
        },
        body: JSON.stringify({
          query: searchQuery,
          useAutoprompt: true,
          numResults: 5,
          contents: { text: true, highlights: true },
        }),
      })

      if (!exaResponse.ok) {
        const errText = await exaResponse.text()
        throw new Error(`Exa API error ${exaResponse.status}: ${errText}`)
      }

      const exaData = await exaResponse.json()
      const results: ExaResult[] = exaData.results ?? []

      if (results.length === 0) {
        // No results — return minimal profile so pipeline can continue
        profile = {
          company: company_name ?? 'Unknown',
          description: 'No public information found via Exa search.',
          website: '',
          recent_news: '',
          industry_signals: '',
          raw_results: [],
        }
      } else {
        profile = extractProfile(company_name ?? results[0]?.title ?? 'Unknown', results)
      }
    }

    await supabase.from('agent_audit_trail').insert({
      user_id,
      agent_name: 'Market Researcher Agent',
      action: 'company_research',
      details: {
        company: company_name,
        query,
        is_mock: isMock,
        result_count: profile.raw_results.length,
        industry_signals: profile.industry_signals,
      },
    })

    return new Response(
      JSON.stringify({ success: true, data: profile, is_mock: isMock }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[research-company] Error:', errMsg)
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
