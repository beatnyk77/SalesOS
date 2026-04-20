-- Migration: leads_table
-- Task 7: Lead storage for qualified inbound leads

-- 1. leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text NOT NULL,
  first_name        text,
  last_name         text,
  company_name      text,
  job_title         text,
  linkedin_url      text,
  status            text NOT NULL DEFAULT 'pending', -- pending, qualified, rejected
  score             integer DEFAULT 0,
  summary           text,
  icp_matching_notes text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  research_payload  jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding         vector(1536), -- semantic profile of the lead for RAG
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- 2. Index for metadata filtering (GIN) and vector similarity search
CREATE INDEX IF NOT EXISTS leads_metadata_idx ON public.leads USING GIN (metadata);
CREATE INDEX IF NOT EXISTS leads_embedding_idx ON public.leads USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. updated_at auto-update trigger
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Enable Row Level Security
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: users can only see/modify their own leads
CREATE POLICY "leads_select_own" ON public.leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "leads_insert_own" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leads_update_own" ON public.leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "leads_delete_own" ON public.leads
  FOR DELETE USING (auth.uid() = user_id);
