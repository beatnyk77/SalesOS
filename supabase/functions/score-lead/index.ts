import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ---- Type definitions ----------------------------------------------------
interface LeadData {
  employee_count?: string;
  [key: string]: unknown; // allow additional fields
}
// -------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  try {
    // Parse and type‑guard request payload
    const {
      lead_data,
      user_id,
    } = (await req.json()) as { lead_data: LeadData; user_id: string };

    // Mock Scoring Logic (Phase 1 – simulate LLM decision)
    const leadText = JSON.stringify(lead_data).toLowerCase();

    let score = 50; // Base score
    let reasoning = "Lead has some alignment with ICP.";

    // Simple heuristic for mock scoring
    if (leadText.includes('software') || leadText.includes('ai')) score += 20;
    if (leadText.includes('series a') || leadText.includes('funded')) score += 15;
    if ((lead_data as unknown as { employee_count?: string }).employee_count === '50-200') score += 10; // employee_count is optional

    if (score > 80) {
      reasoning = "Excellent alignment. Target industry and company stage match perfectly.";
    } else if (score < 40) {
      reasoning = "Low alignment. Industry or company size outside of core target.";
    }

    const finalStatus = score > 70 ? 'qualified' : 'rejected';

    // Log to Audit Trail
    await supabase.from('agent_audit_trail').insert({
      user_id: user_id,
      agent_name: 'Lead Scoring Agent',
      action: 'icp_scoring',
      details: {
        score,
        status: finalStatus,
        reasoning,
        lead_summary: leadText.substring(0, 200) + "..."
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        score: Math.min(100, score),
        reasoning,
        status: finalStatus,
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