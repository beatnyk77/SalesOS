-- Migration: agent_audit_trail
-- Task 4: Create agent_audit_trail table for logging AI agent actions
-- Scope: table definition, indexes, and INSERT-only RLS

CREATE TABLE IF NOT EXISTS public.agent_audit_trail (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name    text NOT NULL,       -- e.g., 'Inbound Lead Qualifier', 'Ghost-Lead Validator'
  action        text NOT NULL,       -- e.g., 'lead_scored', 'email_drafted', 'web_search'
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- the specific payload or logs of the action
  timestamp     timestamptz NOT NULL DEFAULT now()
);

-- Index for querying by user, agent, and time
CREATE INDEX IF NOT EXISTS agent_audit_trail_user_agent_idx ON public.agent_audit_trail(user_id, agent_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS agent_audit_trail_action_idx ON public.agent_audit_trail(action, timestamp DESC);

-- Enable RLS
ALTER TABLE public.agent_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own audit trails
CREATE POLICY "agent_audit_trail_select_own" ON public.agent_audit_trail
  FOR SELECT USING (auth.uid() = user_id);

-- Insert only
CREATE POLICY "agent_audit_trail_insert_own" ON public.agent_audit_trail
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No update or delete policies (immutable ledger)
