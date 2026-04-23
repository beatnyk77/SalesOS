import { getSupabaseServer } from '@/lib/supabase/server';
import { InboundLeadQualifierCrew } from './inbound-qualifier';
import { logToAuditTrail } from '../utils';

/**
 * Bulk Prospect Evaluator Crew
 * 
 * Takes a prospect_list_id and performs parallelized enrichment and scoring
 * for all pending leads in that list by reusing the InboundLeadQualifierCrew logic.
 * 
 * Orchestration:
 * - Fetches pending leads from 'leads' table linked to the list.
 * - Runs InboundLeadQualifierCrew (Researcher -> Analyst -> Scorer) for each.
 * - Updates 'prospect_lists' status and progress.
 */
export class BulkProspectEvaluatorCrew {
  private userId: string;
  private qualifier: InboundLeadQualifierCrew;

  constructor(userId: string) {
    this.userId = userId;
    this.qualifier = new InboundLeadQualifierCrew(userId);
  }

  /**
   * Executes bulk evaluation for a specific prospect list.
   * @param prospectListId UUID of the prospect list
   */
  async run(prospectListId: string): Promise<{ total: number; success: number; failed: number }> {
    const supabase = getSupabaseServer();

    // 1. Mark list as processing
    await supabase.from('prospect_lists').update({ status: 'processing' }).eq('id', prospectListId);

    // 2. Fetch all pending leads for this list
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('email, company_name')
      .eq('prospect_list_id', prospectListId)
      .eq('status', 'pending');

    if (leadsError) throw new Error(`Failed to fetch leads: ${leadsError.message}`);
    
    if (!leads || leads.length === 0) {
       await supabase.from('prospect_lists').update({ status: 'completed' }).eq('id', prospectListId);
       return { total: 0, success: 0, failed: 0 };
    }

    // 3. Run evaluation in parallel with batching
    // We use a batch size of 5 to respect Edge Function concurrency and external API (Exa/LLM) rate limits
    const results = { total: leads.length, success: 0, failed: 0 };
    const BATCH_SIZE = 5;

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      const promises = batch.map(async (lead) => {
        try {
          // Reuses the institutional-grade qualifier logic
          await this.qualifier.run(lead.email, lead.company_name);
          results.success++;
        } catch (error: any) {
          console.error(`Evaluation failed for ${lead.email}:`, error.message);
          results.failed++;
        }
      });
      
      await Promise.all(promises);
      
      // Update progress in the database after each batch
      await supabase.from('prospect_lists').update({ 
        processed_count: results.success + results.failed 
      }).eq('id', prospectListId);
    }

    // 4. Mark list as completed and log to audit trail
    await supabase.from('prospect_lists').update({ 
      status: 'completed',
      metadata: { 
        evaluation_results: results,
        completed_at: new Date().toISOString()
      }
    }).eq('id', prospectListId);

    await logToAuditTrail({
      userId: this.userId,
      agentName: 'Bulk Prospect Evaluator Crew',
      action: 'list_evaluation_completed',
      details: {
        prospect_list_id: prospectListId,
        ...results
      }
    });

    return results;
  }
}
