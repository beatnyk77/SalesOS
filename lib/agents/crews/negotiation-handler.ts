/**
 * lib/agents/crews/negotiation-handler.ts
 *
 * Task 44: Negotiation Crew
 *
 * Pipeline:
 *   1. Takes a prospect objection and lead context.
 *   2. Queries Collateral RAG for supporting ROI/case studies.
 *   3. Drafts a strategic justification (not a discount) for review.
 *
 * Security:
 *   - All actions logged to agent_audit_trail.
 */

import { getSupabaseServer } from '@/lib/supabase/server';
import { logToAuditTrail } from '../utils';
import { CollateralRAGCrew } from './collateral-rag';
import type { Lead } from '@/lib/supabase/realtime';
import type { Collateral } from '@/lib/rag/collateral-rag';

export interface NegotiationInput {
  lead_id: string;
  user_id: string;
  objection_text: string;
  context?: string;
}

export interface NegotiationDraft {
  objection: string;
  justification: string;
  supporting_collateral_ids: string[];
  suggested_reply: string;
}

export class NegotiationHandlerCrew {
  private collateralCrew: CollateralRAGCrew;

  constructor() {
    this.collateralCrew = new CollateralRAGCrew();
  }

  async run(input: NegotiationInput): Promise<{ success: boolean; draft?: NegotiationDraft; error?: string }> {
    try {
      console.log(`[NegotiationHandlerCrew] Handling objection for lead ${input.lead_id}: ${input.objection_text}`);

      const supabase = getSupabaseServer();

      // 1. Fetch Lead context
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', input.lead_id)
        .single();

      if (leadError || !lead) throw new Error(`Lead not found: ${leadError?.message}`);

      // 2. Query Collateral for ROI/Evidence
      const industry = lead.research_payload?.industry || lead.metadata?.industry || '';
      const collateralResult = await this.collateralCrew.run({
        user_id: input.user_id,
        filter: {
          industry: industry,
          deal_stage: 'Closing'
        }
      });

      // 3. Draft Justification (Simulated LLM)
      const draft = this.draftResponse(input.objection_text, lead, collateralResult.collateral);

      // 4. Audit Trail
      await logToAuditTrail({
        userId: input.user_id,
        agentName: 'negotiation_handler_crew',
        action: 'objection_handled',
        details: { 
          lead_id: input.lead_id, 
          objection: input.objection_text,
          collateral_used: collateralResult.collateral.length 
        },
      });

      return {
        success: true,
        draft
      };

    } catch (err) {
      console.error('[NegotiationHandlerCrew] Error:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  private draftResponse(objection: string, lead: Lead, collateral: Collateral[]): NegotiationDraft {
    const isPrice = objection.toLowerCase().includes('price') || objection.toLowerCase().includes('cost') || objection.toLowerCase().includes('expensive');
    
    let justification = '';
    let suggested_reply = '';

    if (isPrice) {
      justification = `Prospect expressed price concerns. We should emphasize the ${collateral.length > 0 ? 'attached case studies' : 'long-term value'} and ROI rather than discounting.`;
      suggested_reply = `I understand that budget is a key consideration. However, looking at how we've helped similar companies in ${lead.metadata?.industry || 'your industry'} achieve significant ROI within 6 months, the upfront cost is typically offset by the efficiency gains.`;
    } else {
      justification = `Prospect raised a general objection: "${objection}". Focus on our technical superiority and implementation support.`;
      suggested_reply = `Thank you for sharing that concern. We've actually designed SalesOS to handle exactly this scenario by...`;
    }

    return {
      objection,
      justification,
      supporting_collateral_ids: collateral.map(c => c.id),
      suggested_reply
    };
  }
}
