-- Migration: user_agent_settings
-- Task 25: Global dry-run toggle and agent-specific preferences.

CREATE TABLE IF NOT EXISTS public.user_agent_settings (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dry_run_mode      boolean NOT NULL DEFAULT true, -- Start in dry-run for safety
  auto_approve_leads boolean NOT NULL DEFAULT false,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_agent_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "user_agent_settings_select_own" ON public.user_agent_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_agent_settings_update_own" ON public.user_agent_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER user_agent_settings_set_updated_at
  BEFORE UPDATE ON public.user_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
