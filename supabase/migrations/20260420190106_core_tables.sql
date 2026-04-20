-- Migration: core_tables
-- Task 3: Core schema for AI Co-Founder OS
-- Scope: icp_criteria, proposal_templates + vector extension + basic RLS

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. icp_criteria table
-- Stores ICP profiles used for lead scoring. Embedding enables semantic RAG.
CREATE TABLE IF NOT EXISTS public.icp_criteria (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {industry, deal_size, service_type, client_tier}
  embedding     vector(1536),                        -- for pgvector RAG (OpenAI text-embedding-3-small)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for metadata filtering (GIN) and vector similarity search (IVFFlat)
CREATE INDEX IF NOT EXISTS icp_criteria_metadata_idx ON public.icp_criteria USING GIN (metadata);
CREATE INDEX IF NOT EXISTS icp_criteria_embedding_idx ON public.icp_criteria USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 3. proposal_templates table
-- Stores reusable proposal templates with metadata tagging for RAG retrieval.
CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  body          text NOT NULL,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- {industry, deal_size, service_type, client_tier}
  embedding     vector(1536),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposal_templates_metadata_idx ON public.proposal_templates USING GIN (metadata);
CREATE INDEX IF NOT EXISTS proposal_templates_embedding_idx ON public.proposal_templates USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. updated_at auto-update trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER icp_criteria_set_updated_at
  BEFORE UPDATE ON public.icp_criteria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER proposal_templates_set_updated_at
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable Row Level Security
ALTER TABLE public.icp_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: users can only see/modify their own rows
-- icp_criteria
CREATE POLICY "icp_criteria_select_own" ON public.icp_criteria
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "icp_criteria_insert_own" ON public.icp_criteria
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "icp_criteria_update_own" ON public.icp_criteria
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "icp_criteria_delete_own" ON public.icp_criteria
  FOR DELETE USING (auth.uid() = user_id);

-- proposal_templates
CREATE POLICY "proposal_templates_select_own" ON public.proposal_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "proposal_templates_insert_own" ON public.proposal_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "proposal_templates_update_own" ON public.proposal_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "proposal_templates_delete_own" ON public.proposal_templates
  FOR DELETE USING (auth.uid() = user_id);
