/**
 * _shared/cost-guard.ts
 *
 * Task 24: Cost guardrails for Edge Functions.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

export async function checkBudget(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_budgets')
    .select('token_limit, token_used, is_over_limit')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[CostGuard] Error checking budget:', error);
    return true; // Fail open for safety, or false for strict cost control
  }

  if (!data) return true; // No budget record yet

  if (data.is_over_limit || data.token_used >= data.token_limit) {
    return false;
  }

  return true;
}

export async function reportUsage(supabase: ReturnType<typeof createClient>, userId: string, tokens: number) {
  const { error } = await supabase.rpc('increment_token_usage', { 
    p_user_id: userId, 
    p_tokens: tokens 
  });

  if (error) {
    console.error('[CostGuard] Error reporting usage:', error);
  }
}
