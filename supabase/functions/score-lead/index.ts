import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---- Type definitions ----------------------------------------------------
interface LeadData {
  employee_count?: string;
  [key: string]: unknown; // allow additional fields
}
interface IcpCriteria {
  // Define expected ICP fields as needed
  [key: string]: unknown;
}
// -------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse and type‑guard request payload
    const {
      lead_data,
      icp_criteria,
      user_id: _user_id,
    } = (await req.json()) as { lead_data: LeadData; icp_criteria: IcpCriteria; user_id: string };

    // Mock Scoring Logic (Phase 1 – simulate LLM decision)
    const leadText = JSON.stringify(lead_data).toLowerCase();
    const icpText = JSON.stringify(icp_criteria).toLowerCase();

    let score = 50; // Base score
    let reasoning = "Lead has some alignment with ICP.";

    // Simple heuristic for mock scoring
    if (leadText.includes('software') || leadText.includes('ai')) score += 20;
    if (leadText.includes('series a') || leadText.includes('funded')) score += 15;
    if ((lead_data as any).employee_count === '50-200') score += 10; // employee_count is optional

    if (score > 80) {
      reasoning = "Excellent alignment. Target industry and company stage match perfectly.";
    } else if (score < 40) {
      reasoning = "Low alignment. Industry or company size outside of core target.";
    }

    return new Response(
      JSON.stringify({
        success: true,
        score: Math.min(100, score),
        reasoning,
        status: score > 70 ? 'qualified' : 'rejected',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});