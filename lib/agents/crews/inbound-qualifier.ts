import { getSupabaseServer } from '@/lib/supabase/server';
import { logToAuditTrail } from '../utils';
import { getMatchingICPCriteria } from '@/lib/rag/icp-rag';

interface ResearchData {
  [key: string]: unknown;
}

export interface QualificationOutput {
  status: 'qualified' | 'rejected' | 'pending';
  score: number;
  reasoning: string;
  researchData: ResearchData;
}

/**
 * Inbound Lead Qualifier Crew
 * 
 * This crew takes a validated lead and performs deep research using Exa,
 * then scores it against the user's Ideal Customer Profile (ICP) criteria
 * using a RAG-enhanced matching process.
 * 
 * Orchestration:
 * - Agent: Researcher (Exa API)
 * - Agent: Analyst (ICP RAG retrieval)
 * - Agent: Scorer (LLM-based scoring)
 * 
 * Output: Writes to 'leads' table and 'agent_audit_trail'.
 */
export class InboundLeadQualifierCrew {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Executes the qualification pipeline for a lead.
   * @param email Lead email
   * @param companyName Optional company name
   */
  async run(email: string, companyName?: string): Promise<QualificationOutput> {
    const supabase = getSupabaseServer();

    try {
      // 1. Research Lead (Agent: Researcher)
      // Calls the research-company Edge Function which uses Exa
      const { data: researchRes, error: researchError } = await supabase.functions.invoke('research-company', {
        body: {
          company_name: companyName || email.split('@')[1],
          user_id: this.userId
        }
      });

      if (researchError) {
        throw new Error(`Research failed: ${researchError.message}`);
      }

      const researchData = researchRes.success ? (researchRes.data as ResearchData) : null;
      if (!researchData) {
        throw new Error("Research data could not be retrieved.");
      }

      // 2. Fetch Matching ICP Criteria (Agent: Analyst)
      // Uses the RAG helper to find relevant ICPs for this lead
      const matchingICP = await getMatchingICPCriteria(
        this.userId, 
        JSON.stringify(researchData)
      );

      // 3. Score Lead vs ICP (Agent: Scorer)
      // Calls the score-lead Edge Function (LLM-based)
      const { data: scoreRes, error: scoreError } = await supabase.functions.invoke('score-lead', {
        body: {
          lead_data: researchData,
          icp_criteria: matchingICP,
          user_id: this.userId
        }
      });

      if (scoreError) {
        throw new Error(`Scoring failed: ${scoreError.message}`);
      }

      const output: QualificationOutput = {
        status: scoreRes.status,
        score: scoreRes.score,
        reasoning: scoreRes.reasoning,
        researchData
      };

      // 4. Update/Create Lead record in Supabase
      const { error: dbError } = await supabase.from('leads').upsert({
        user_id: this.userId,
        email: email,
        company_name: companyName || researchData.company,
        status: output.status,
        score: output.score,
        summary: output.reasoning,
        research_payload: researchData,
        icp_matching_notes: matchingICP.length > 0 
          ? `Matched against ICP: ${matchingICP.map(i => i.name).join(', ')}`
          : "No specific ICP criteria matched; used general heuristics."
      }, { onConflict: 'user_id, email' });

      if (dbError) {
        throw new Error(`Failed to save lead record: ${dbError.message}`);
      }

      // 5. Log full execution to Audit Trail
      await logToAuditTrail({
        userId: this.userId,
        agentName: 'Inbound Lead Qualifier Crew',
        action: 'lead_qualified',
        details: {
          email,
          score: output.score,
          status: output.status,
          reasoning: output.reasoning,
          icp_matched_count: matchingICP.length
        }
      });

      return output;

    } catch (error) {
      // Log failure for transparency
      await logToAuditTrail({
        userId: this.userId,
        agentName: 'Inbound Lead Qualifier Crew',
        action: 'qualification_failed',
        details: {
          email,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }
}
