/**
 * lib/agents/crews/collateral-rag.ts
 *
 * Task 32: Collateral RAG Crew
 *
 * A specialized agent that retrieves relevant marketing collateral
 * based on provided metadata filters.
 */

import { queryCollateral, CollateralFilter, Collateral } from '../../rag/collateral-rag';
import { logToAuditTrail } from '../utils';

export interface CollateralRAGInput {
  user_id: string;
  filter: CollateralFilter;
  limit?: number;
}

export interface CollateralRAGOutput {
  success: boolean;
  collateral: Collateral[];
  reasoning: string;
}

export class CollateralRAGCrew {
  /**
   * Retrieves relevant collateral for a given context.
   */
  async run(input: CollateralRAGInput): Promise<CollateralRAGOutput> {
    const { user_id, filter, limit = 3 } = input;

    try {
      console.log(`[CollateralRAGCrew] Retrieving collateral for filter:`, filter);

      // 1. Query the RAG utility
      const collateral = await queryCollateral(user_id, filter, limit);

      const successMessage = collateral.length > 0 
        ? `Found ${collateral.length} relevant collateral items matching industry: ${filter.industry || 'any'}, stage: ${filter.deal_stage || 'any'}.`
        : `No matching collateral found for industry: ${filter.industry || 'any'}, stage: ${filter.deal_stage || 'any'}. Using general brand assets.`;

      // 2. Audit Trail
      await logToAuditTrail({
        userId: user_id,
        agentName: 'collateral_rag_crew',
        action: 'retrieval_completed',
        details: { 
          filter, 
          count: collateral.length,
          found_items: collateral.map(c => c.file_name)
        },
      });

      return {
        success: true,
        collateral,
        reasoning: successMessage
      };

    } catch (err: any) {
      console.error('[CollateralRAGCrew] Retrieval error:', err);
      
      await logToAuditTrail({
        userId: user_id,
        agentName: 'collateral_rag_crew',
        action: 'retrieval_failed',
        details: { filter, error: err.message },
      });

      return {
        success: false,
        collateral: [],
        reasoning: `Failed to retrieve collateral: ${err.message}`
      };
    }
  }
}
