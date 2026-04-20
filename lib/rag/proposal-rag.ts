/**
 * lib/rag/proposal-rag.ts
 *
 * Task 17: Proposal Metadata RAG
 *
 * Provides specialized RAG querying for proposal templates with strict
 * metadata filtering to prevent cross-client or cross-industry contamination.
 */

import { getSupabaseServer } from '../supabase/server';

export interface ProposalTemplate {
  id: string;
  name: string;
  content: string;
  metadata: {
    industry?: string;
    deal_size?: string;
    service_type?: string;
    client_tier?: string;
  };
}

export interface ProposalFilter {
  industry?: string;
  deal_size?: string;
  service_type?: string;
}

/**
 * Retrieves proposal templates matching exact metadata filters.
 * Uses the Supabase JSONB contains operator (@>) for precision.
 */
export async function queryProposalTemplates(
  userId: string,
  filter: ProposalFilter,
  limit = 5
): Promise<ProposalTemplate[]> {
  const supabase = getSupabaseServer();

  // Build the filter object based on provided criteria
  const metadataFilter: Record<string, string | number | boolean> = {};
  if (filter.industry) metadataFilter.industry = filter.industry;
  if (filter.deal_size) metadataFilter.deal_size = filter.deal_size;
  if (filter.service_type) metadataFilter.service_type = filter.service_type;

  console.log(`[ProposalRAG] Querying templates for user ${userId} with filter:`, metadataFilter);

  // In production, this would be combined with a vector similarity search:
  // const { data, error } = await supabase.rpc('match_proposal_templates', {
  //   query_embedding: embedding,
  //   match_threshold: 0.5,
  //   match_count: limit,
  //   filter: metadataFilter // filter passed to the RPC function
  // });

  // For MVP, we use strict metadata matching on the base table.
  let query = supabase
    .from('proposal_templates')
    .select('id, name, content, metadata')
    .eq('user_id', userId);

  // Apply JSONB containment filter
  if (Object.keys(metadataFilter).length > 0) {
    query = query.contains('metadata', metadataFilter);
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error('[ProposalRAG] Error querying templates:', error);
    throw new Error(`Failed to query proposal templates: ${error.message}`);
  }

  return (data || []) as ProposalTemplate[];
}
