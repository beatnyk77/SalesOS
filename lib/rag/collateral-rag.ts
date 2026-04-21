/**
 * lib/rag/collateral-rag.ts
 *
 * Task 32: Marketing Collateral RAG
 *
 * Provides specialized RAG querying for uploaded collateral (PDFs, decks, etc.)
 * with strict metadata filtering (industry, deal_stage, document_type).
 */

import { getSupabaseServer } from '../supabase/server';

export interface Collateral {
  id: string;
  file_name: string;
  file_path: string;
  content: string;
  metadata: {
    industry?: string;
    deal_stage?: string;
    document_type?: string;
    tags?: string[];
  };
}

export interface CollateralFilter {
  industry?: string;
  deal_stage?: string;
  document_type?: string;
  tags?: string[];
}

/**
 * Retrieves marketing collateral matching exact metadata filters.
 */
export async function queryCollateral(
  userId: string,
  filter: CollateralFilter,
  limit = 5
): Promise<Collateral[]> {
  const supabase = getSupabaseServer();

  // Build the filter object based on provided criteria
  const metadataFilter: Record<string, any> = {};
  if (filter.industry) metadataFilter.industry = filter.industry;
  if (filter.deal_stage) metadataFilter.deal_stage = filter.deal_stage;
  if (filter.document_type) metadataFilter.document_type = filter.document_type;

  console.log(`[CollateralRAG] Querying collateral for user ${userId} with filter:`, metadataFilter);

  let query = supabase
    .from('marketing_collateral')
    .select('id, file_name, file_path, content, metadata')
    .eq('user_id', userId);

  // Apply JSONB containment filter
  if (Object.keys(metadataFilter).length > 0) {
    query = query.contains('metadata', metadataFilter);
  }

  // Handle tags separately if provided
  if (filter.tags && filter.tags.length > 0) {
    query = query.contains('metadata', { tags: filter.tags });
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error('[CollateralRAG] Error querying collateral:', error);
    throw new Error(`Failed to query collateral: ${error.message}`);
  }

  return (data || []) as Collateral[];
}
