-- Migration: marketing_collateral
-- Task 30: Schema for Marketing Collateral Upload & Pre-Sales Push
-- Scope: marketing_collateral table + RLS + vector search

-- 1. marketing_collateral table
-- Stores uploaded PDFs, decks, case studies for RAG injection.
CREATE TABLE IF NOT EXISTS public.marketing_collateral (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  file_path     text NOT NULL, -- Path in Supabase Storage
  content       text,          -- Extracted text for RAG
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb, -- {industry, deal_stage, document_type, tags[]}
  embedding     vector(1536),                       -- OpenAI text-embedding-3-small
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for metadata filtering (GIN) and vector similarity search (IVFFlat)
CREATE INDEX IF NOT EXISTS marketing_collateral_metadata_idx ON public.marketing_collateral USING GIN (metadata);
CREATE INDEX IF NOT EXISTS marketing_collateral_embedding_idx ON public.marketing_collateral USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 2. Trigger for updated_at
CREATE TRIGGER marketing_collateral_set_updated_at
  BEFORE UPDATE ON public.marketing_collateral
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Enable RLS
ALTER TABLE public.marketing_collateral ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: users own their collateral
CREATE POLICY "marketing_collateral_select_own" ON public.marketing_collateral
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "marketing_collateral_insert_own" ON public.marketing_collateral
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "marketing_collateral_update_own" ON public.marketing_collateral
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "marketing_collateral_delete_own" ON public.marketing_collateral
  FOR DELETE USING (auth.uid() = user_id);
