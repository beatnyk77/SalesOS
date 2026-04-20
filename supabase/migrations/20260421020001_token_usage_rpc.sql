-- Migration: token_usage_rpc
-- Task 24: RPC to increment token usage atomically.

CREATE OR REPLACE FUNCTION public.increment_token_usage(p_user_id uuid, p_tokens bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_budgets (user_id, token_used)
  VALUES (p_user_id, p_tokens)
  ON CONFLICT (user_id)
  DO UPDATE SET
    token_used = public.user_budgets.token_used + p_tokens,
    is_over_limit = (public.user_budgets.token_used + p_tokens >= public.user_budgets.token_limit),
    updated_at = now();
END;
$$;
