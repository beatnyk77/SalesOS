-- Migration: prospect_lists
-- Task 34: Bulk upload
-- Scope: prospect_lists table and linking leads

CREATE TABLE IF NOT EXISTS public.prospect_lists (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  source_file   text,
  total_count   integer DEFAULT 0,
  processed_count integer DEFAULT 0,
  status        text DEFAULT 'pending', -- pending, processing, completed, failed
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Add prospect_list_id to leads table to link bulk uploads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prospect_list_id uuid REFERENCES public.prospect_lists(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.prospect_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "prospect_lists_select_own" ON public.prospect_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "prospect_lists_insert_own" ON public.prospect_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prospect_lists_update_own" ON public.prospect_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "prospect_lists_delete_own" ON public.prospect_lists
  FOR DELETE USING (auth.uid() = user_id);

-- trigger for updated_at
CREATE TRIGGER prospect_lists_set_updated_at
  BEFORE UPDATE ON public.prospect_lists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
