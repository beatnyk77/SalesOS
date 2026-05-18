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
      icp_criteria = [],
      user_id,
    } = (await req.json()) as { lead_data: LeadData; icp_criteria?: any[]; user_id: string };

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    let score = 50;
    let reasoning = "Lead has some alignment with ICP.";
    let finalStatus = 'pending';

    if (OPENAI_API_KEY) {
      // Real OpenAI Scoring
      const systemPrompt = `You are an expert sales development representative. Your job is to score inbound leads against the company's Ideal Customer Profile (ICP).
Provide a score from 0 to 100, and a status of either 'qualified' (score > 70) or 'rejected'. Provide a concise 2-3 sentence reasoning.
Output JSON only with keys: { "score": number, "status": "qualified" | "rejected", "reasoning": string }`;
      
      const userPrompt = `Lead Data:\n${JSON.stringify(lead_data, null, 2)}\n\nICP Criteria:\n${JSON.stringify(icp_criteria, null, 2)}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);
        score = content.score;
        finalStatus = content.status;
        reasoning = content.reasoning;
      } else {
        console.error("OpenAI error:", await response.text());
        throw new Error("Failed to score lead via LLM");
      }
    } else {
      // Mock Scoring Fallback
      console.warn('OPENAI_API_KEY not found. Using mock scoring.');
      const leadText = JSON.stringify(lead_data).toLowerCase();

      // Simple heuristic for mock scoring
      if (leadText.includes('software') || leadText.includes('ai')) score += 20;
      if (leadText.includes('series a') || leadText.includes('funded')) score += 15;
      if ((lead_data as unknown as { employee_count?: string }).employee_count === '50-200') score += 10; // employee_count is optional

      if (score > 80) {
        reasoning = "Excellent alignment. Target industry and company stage match perfectly.";
      } else if (score < 40) {
        reasoning = "Low alignment. Industry or company size outside of core target.";
      }
      finalStatus = score > 70 ? 'qualified' : 'rejected';
    }

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