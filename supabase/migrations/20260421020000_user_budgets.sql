-- Migration: user_budgets
-- Task 24: Track token usage and enforce cost guardrails.

CREATE TABLE IF NOT EXISTS public.user_budgets (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token_limit   bigint NOT NULL DEFAULT 1000000, -- 1M tokens by default
  token_used    bigint NOT NULL DEFAULT 0,
  is_over_limit boolean NOT NULL DEFAULT false,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_budgets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "user_budgets_select_own" ON public.user_budgets
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER user_budgets_set_updated_at
  BEFORE UPDATE ON public.user_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
