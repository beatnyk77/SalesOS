/**
 * lib/agents/crews/icp-generator.ts
 *
 * Task 22: Quick-Start ICP Generator Crew
 *
 * Pipeline:
 *   1. Researches a company website or LinkedIn profile via Exa
 *   2. Generates an Ideal Customer Profile (ICP) based on the research
 *   3. Persists the ICP to the `icp_criteria` table for use in lead scoring
 */

import { getSupabaseServer } from '../../supabase/server';
import { logToAuditTrail } from '../utils';

export interface ICPGeneratorInput {
  user_id: string;
  source_url: string;
  company_name?: string;
}

export interface ICPGeneratorOutput {
  success: boolean;
  icp_id?: string;
  error?: string;
}

export class ICPGeneratorCrew {
  async run(input: ICPGeneratorInput): Promise<ICPGeneratorOutput> {
    const { user_id, source_url, company_name } = input;

    try {
      console.log(`[ICPGeneratorCrew] Starting ICP generation for ${source_url}...`);

      // 1. Audit Start
      await logToAuditTrail({
        userId: user_id,
        agentName: 'icp_generator_crew',
        action: 'generation_started',
        details: { source_url, company_name },
      });

      const supabase = getSupabaseServer();

      // 2. Research Phase (Mocked/Simplified for MVP)
      // In production, this would call Exa to scrape the website and an LLM to distill the ICP.
      const { data: research, error: researchError } = await supabase.functions.invoke('research-company', {
        body: { query: `Research ${company_name || 'this company'} and its target audience: ${source_url}`, user_id },
      });

      if (researchError) throw new Error(`Research failed: ${researchError.message}`);

      const res = (research?.data || {}) as { company?: string; industry?: string; description?: string };

      // 3. ICP Distillation (Deterministic template for MVP)
      const icpData = {
        user_id,
        name: `ICP for ${company_name || res.company || 'New Project'}`,
        description: `Generated from ${source_url}. Target: ${res.industry || 'Tech SMBs'} looking for ${res.description || 'automation'}.`,
        metadata: {
          industry: res.industry || 'Technology',
          deal_size: 'mid-market',
          service_type: 'implementation',
          source: source_url
        }
      };

      // 4. Persist ICP
      const { data: icp, error: icpError } = await supabase
        .from('icp_criteria')
        .insert(icpData)
        .select()
        .single();

      if (icpError) throw icpError;

      // 5. Audit Success
      await logToAuditTrail({
        userId: user_id,
        agentName: 'icp_generator_crew',
        action: 'generation_completed',
        details: { icp_id: icp.id, name: icp.name },
      });

      return {
        success: true,
        icp_id: icp.id
      };

    } catch (err) {
      console.error('[ICPGeneratorCrew] Run error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      await logToAuditTrail({
        userId: user_id,
        agentName: 'icp_generator_crew',
        action: 'generation_failed',
        details: { source_url, error: errorMessage },
      });

      return { success: false, error: errorMessage };
    }
  }
}
