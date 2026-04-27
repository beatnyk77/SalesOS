-- Migration: Add consistent status enums and check constraints
-- Scope: Adds an enum type `workflow_status` to standardize status columns
--        and updates existing tables to use it (or check constraints where enums can't be altered automatically).
-- Tables affected: leads, cold_emails, proposal_templates, meeting_briefs (if exists), kb_articles (if exists)
-- Note: This tries to alter existing text columns to use the enum when possible. If a column cannot be altered
--       (e.g., in production with existing data/type conflicts), a check constraint is added as fallback.

-- 1. Create enum type
CREATE TYPE workflow_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'failed',
  'draft',
  'qualified',
  'rejected'
);

-- 2. Leads table: try to alter status to workflow_status, otherwise add check constraint
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.leads
      ALTER COLUMN status TYPE workflow_status
      USING status::workflow_status;
  EXCEPTION
    WHEN others THEN
      -- If cast fails, enforce via check constraint
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check'
      ) THEN
        ALTER TABLE public.leads
          ADD CONSTRAINT leads_status_check
          CHECK (status IN ('pending','in_progress','completed','failed','draft','qualified','rejected'));
      END IF;
  END;
END $$;

-- 3. cold_emails table
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.cold_emails
      ALTER COLUMN status TYPE workflow_status
      USING status::workflow_status;
  EXCEPTION
    WHEN others THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cold_emails_status_check'
      ) THEN
        ALTER TABLE public.cold_emails
          ADD CONSTRAINT cold_emails_status_check
          CHECK (status IN ('pending','in_progress','completed','failed','draft','qualified','rejected'));
      END IF;
  END;
END $$;

-- 4. proposal_templates table (if it has a status column — add if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposal_templates' AND column_name='status') THEN
    ALTER TABLE public.proposal_templates ADD COLUMN status workflow_status NOT NULL DEFAULT 'draft';
  ELSE
    BEGIN
      ALTER TABLE public.proposal_templates
        ALTER COLUMN status TYPE workflow_status
        USING status::workflow_status;
    EXCEPTION
      WHEN others THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'proposal_templates_status_check'
        ) THEN
          ALTER TABLE public.proposal_templates
            ADD CONSTRAINT proposal_templates_status_check
            CHECK (status IN ('pending','in_progress','completed','failed','draft','qualified','rejected'));
        END IF;
    END;
  END IF;
END $$;

-- 5. meeting_briefs table (create if missing) with status enum
CREATE TABLE IF NOT EXISTS public.meeting_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meeting_title text,
  meeting_date timestamptz,
  participants text[],
  agenda text,
  brief text,
  status workflow_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meeting_briefs_user_status_idx ON public.meeting_briefs (user_id, status);
CREATE TRIGGER meeting_briefs_set_updated_at
  BEFORE UPDATE ON public.meeting_briefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.meeting_briefs ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see/modify their own meeting briefs
CREATE POLICY "meeting_briefs_select_own" ON public.meeting_briefs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meeting_briefs_insert_own" ON public.meeting_briefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meeting_briefs_update_own" ON public.meeting_briefs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meeting_briefs_delete_own" ON public.meeting_briefs
  FOR DELETE USING (auth.uid() = user_id);

-- 6. kb_articles table (create if missing) with status enum
CREATE TABLE IF NOT EXISTS public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  status workflow_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kb_articles_user_status_idx ON public.kb_articles (user_id, status);
CREATE INDEX IF NOT EXISTS kb_articles_embedding_idx ON public.kb_articles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE TRIGGER kb_articles_set_updated_at
  BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see/modify their own kb articles
CREATE POLICY "kb_articles_select_own" ON public.kb_articles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "kb_articles_insert_own" ON public.kb_articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kb_articles_update_own" ON public.kb_articles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "kb_articles_delete_own" ON public.kb_articles
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Re-enable policies (in case they were disabled)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
