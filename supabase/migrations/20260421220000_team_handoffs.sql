-- Migration: team_handoffs
-- Task 42: Track internal team handoffs

CREATE TABLE IF NOT EXISTS public.team_handoffs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id       uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to   uuid REFERENCES auth.users(id), -- For multi-user setups (optional)
  brief         jsonb NOT NULL DEFAULT '{}'::jsonb,
  tasks         jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'open', -- open, in_progress, completed
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_handoffs_select_own" ON public.team_handoffs
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "team_handoffs_insert_own" ON public.team_handoffs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "team_handoffs_update_own" ON public.team_handoffs
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "team_handoffs_delete_own" ON public.team_handoffs
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER team_handoffs_set_updated_at
  BEFORE UPDATE ON public.team_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
