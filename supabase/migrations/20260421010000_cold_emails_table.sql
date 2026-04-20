-- Migration: cold_emails_table
-- Task 12: Storage for AI-generated cold emails (dry-run safe)

-- 1. cold_emails table
CREATE TABLE IF NOT EXISTS public.cold_emails (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_email            text NOT NULL,
  subject               text NOT NULL,
  opener                text NOT NULL,
  body                  text NOT NULL,
  full_html             text NOT NULL DEFAULT '',
  personalization_signals text[] NOT NULL DEFAULT '{}',
  -- draft = dry-run, pending_approval = awaiting HITL, approved = ready to send, sent = delivered, rejected = human rejected
  status                text NOT NULL DEFAULT 'draft',
  sent_at               timestamptz,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS cold_emails_user_status_idx
  ON public.cold_emails (user_id, status);
CREATE INDEX IF NOT EXISTS cold_emails_lead_email_idx
  ON public.cold_emails (user_id, lead_email);

-- 3. updated_at auto-update trigger
CREATE TRIGGER cold_emails_set_updated_at
  BEFORE UPDATE ON public.cold_emails
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.cold_emails ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: users can only see/modify their own cold emails
CREATE POLICY "cold_emails_select_own" ON public.cold_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cold_emails_insert_own" ON public.cold_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cold_emails_update_own" ON public.cold_emails
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "cold_emails_delete_own" ON public.cold_emails
  FOR DELETE USING (auth.uid() = user_id);
