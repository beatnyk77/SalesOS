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
    const { linkedin_url, user_id } = await req.json()

    if (!linkedin_url || !user_id) {
      throw new Error("LinkedIn URL and user_id are required")
    }

    const EXA_API_KEY = Deno.env.get('EXA_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!EXA_API_KEY) {
      // Mock validation when API key is missing – simple heuristic based on URL pattern
      const mockScore = linkedin_url.includes('inactive') ? 30 : 80;
      const mockOutcome = mockScore < 70 ? 'REJECTED' : 'VALIDATED';
      const mockIsActive = mockScore >= 50;
      const mockProfileQuality = mockScore;
      // Log mock result
      await supabase.from('agent_audit_trail').insert({
        user_id: user_id,
        agent_name: 'LinkedIn Validator',
        action: 'linkedin_validation',
        details: {
          linkedin_url,
          score: mockScore,
          outcome: mockOutcome,
          is_active: mockIsActive,
          profile_quality: mockProfileQuality,
          reasoning: mockOutcome === 'REJECTED' ? `Mock: LinkedIn profile appears inactive (score: ${mockScore}/100).` : `Mock: LinkedIn profile validated (score: ${mockScore}/100).`
        }
      });
      const validationData = {
        score: mockScore,
        outcome: mockOutcome,
        is_active: mockIsActive,
        profile_quality: mockProfileQuality,
        research_sources: [],
        exa_used: false
      };
      return new Response(
        JSON.stringify({ success: true, ...validationData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Validate LinkedIn URL format
    const linkedinPattern = /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9\-_]+\/?$/
    if (!linkedinPattern.test(linkedin_url)) {
      throw new Error("Invalid LinkedIn URL format")
    }

    // Research the LinkedIn profile using Exa
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': EXA_API_KEY,
      },
      body: JSON.stringify({
        query: `linkedin:${linkedin_url} profile activity professional background`,
        useAutoprompt: true,
        numResults: 5,
        contents: {
          text: true,
          highlights: true
        }
      }),
    })

    const searchData = await response.json()

    // Analyze results for profile activity and ICP matching
    let activityScore = 0
    let isActive = false
    const lastActivityDate = null
    let profileQuality = 0

    if (searchData.results && searchData.results.length > 0) {
      // Check for recent posts, activity indicators
      const recentActivityIndicators = searchData.results.some(result =>
        result.text && (
          result.text.includes('posted') ||
          result.text.includes('shared') ||
          result.text.includes('article') ||
          result.text.includes('recent') ||
          result.text.includes('week') ||
          result.text.includes('month')
        )
      )

      // Check for substantive profile content
      const hasSubstantiveContent = searchData.results.some(result =>
        result.text && result.text.length > 100
      )

      // Basic activity scoring
      if (recentActivityIndicators) activityScore += 40
      if (hasSubstantiveContent) activityScore += 30

      // Check for company/role indicators (simple heuristic)
      const hasProfessionalInfo = searchData.results.some(result =>
        result.text && (
          result.text.includes('at ') ||
          result.text.includes('works') ||
          result.text.includes('manager') ||
          result.text.includes('director') ||
          result.text.includes('engineer') ||
          result.text.includes('developer')
        )
      )

      if (hasProfessionalInfo) profileQuality += 30

      isActive = activityScore >= 50
    }

    // Ghost-Lead Scoring Logic for LinkedIn
    const isRejected = activityScore < 40 // Threshold for active profile
    const outcome = isRejected ? 'REJECTED' : 'VALIDATED'

    const validationData = {
      score: activityScore,
      outcome,
      is_active: isActive,
      last_activity_date: lastActivityDate,
      profile_quality: profileQuality,
      research_sources: searchData.results?.slice(0, 3) || [],
      exa_used: true
    }

    // Log to Audit Trail (Service Role for reliability)
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    await supabase.from('agent_audit_trail').insert({
      user_id: user_id,
      agent_name: 'LinkedIn Validator',
      action: 'linkedin_validation',
      details: {
        linkedin_url,
        score: activityScore,
        outcome,
        is_active: isActive,
        profile_quality: profileQuality,
        reasoning: isRejected
          ? `LinkedIn profile appears inactive or low quality (score: ${activityScore}/100).`
          : `LinkedIn profile validated successfully with score ${activityScore}/100.`
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        ...validationData
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