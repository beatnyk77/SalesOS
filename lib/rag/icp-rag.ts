import { getSupabaseServer } from '../supabase/server';

export interface ICPCriteria {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, any>;
}

/**
 * RAG helper for Ideal Customer Profile (ICP) matching.
 */
export async function getMatchingICPCriteria(
  userId: string,
  leadProfileText: string,
  limit = 3
): Promise<ICPCriteria[]> {
  const supabase = getSupabaseServer();

  // In a production app, we would:
  // 1. Generate an embedding for leadProfileText
  // 2. Query icp_criteria using vector similarity
  
  // For now, since we don't have an embedding key, we'll fetch all criteria for the user
  // and let the LLM do the matching. This is a robust fallback for MVP.
  
  const { data, error } = await supabase
    .from('icp_criteria')
    .select('id, name, description, metadata')
    .eq('user_id', userId)
    .limit(limit);

  if (error) {
    console.error('Error fetching ICP criteria:', error);
    return [];
  }

  return data || [];
}

/**
 * Placeholder for embedding generation.
 * In Phase 2, this will call OpenAI text-embedding-3-small.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  // TODO: Implement real embedding call
  console.warn('generateEmbedding: Stub called with text:', text.substring(0, 50) + '...');
  return null;
}
